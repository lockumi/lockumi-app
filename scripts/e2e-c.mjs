// Escenario C (PR #22) · E2E de dos cuentas: invitar → unirse → firmar → pagar → aprobar → devolución; reclamo → mediación con las dos
// aceptaciones → «repartir»; silencio del dueño (100 % al inquilino); silencio del inquilino (pasa a la mediación).
// Las dos cuentas son sesiones anónimas propias (como cada aparato) y llaman a las MISMAS funciones lk_* que la app y al MISMO
// /api/tw (api/_lib/tw.ts cargado en el proceso). Las firmas de la billetera (depósito y aprobación) las hacen cuentas Stellar
// desechables de testnet, porque el build local no tiene Cavos.
//
//   node scripts/e2e-c.mjs --simulado            Sin red ni llaves: Postgres en memoria (PGlite, todas las migraciones) y Trustless Work falso.
//   node scripts/e2e-c.mjs --real [--salida DIR] Testnet de verdad. Lee SUPABASE_URL (por defecto el proyecto de la app), SUPABASE_ANON_KEY,
//                                                SUPABASE_SERVICE_ROLE_KEY, TRUSTLESS_WORK_API_KEY, LOCKUMI_TW_PLATAFORMA_SECRET y
//                                                LOCKUMI_TW_MEDIADOR_* del entorno. No imprime ningún secreto.
//   node scripts/e2e-c.mjs --real --correos      Además, el correo de invitación de cada caso sale de verdad (Resend, RESEND_API_KEY) por el
//                                                mismo atenderCorreo de /api/correo, SOLO al buzón de prueba lockumi+e2ec-<caso>-<papel>@mail.grokbot.com
//                                                (scripts/correos-e2e.mjs corta cualquier otro destinatario). En --simulado siempre, con Resend falso.
//   node scripts/e2e-c.mjs --real --correos --app https://app.lockumi.com
//                                                Contra la app publicada: cada paso de Trustless Work va por POST <app>/api/tw (el servidor de
//                                                producción, con sus llaves y CORREOS_C), no por api/_lib/tw.ts en el proceso. Los correos que ya
//                                                mandó el servidor (cierres COR-C-07) se cuentan desde lk_correos_enviados.
//   node scripts/e2e-c.mjs --limpiar --real      Borra los datos de prueba marcados («E2E-C …») del destino.
// Salida: <DIR>/estado.json (ids, hashes, enlaces) e informe.md. Los datos de prueba llevan la marca «E2E-C <corrida>» en la dirección
// y correos @lockumi.test. Cada corrida crea alquileres nuevos: nunca reintenta un pago ya hecho (y «repartir» es idempotente).
import { createServer } from 'vite'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, chmodSync } from 'node:fs'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { BUZON, correoPrueba, fetchSoloBuzon } from './correos-e2e.mjs'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, Asset, Horizon, nativeToScVal, BASE_FEE } from '@stellar/stellar-sdk'

const A = process.argv.slice(2), REAL = A.includes('--real'), LIMPIAR = A.includes('--limpiar'), CORREOS = !REAL || A.includes('--correos')
const APP = A.includes('--app') ? String(A[A.indexOf('--app') + 1] || '').replace(/\/$/, '') : ''
const SALIDA = (A[A.indexOf('--salida') + 1] && A.includes('--salida') ? A[A.indexOf('--salida') + 1] : 'e2e-c-salida').replace(/\/$/, '')
const CORRIDA = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13) + '-' + randomBytes(2).toString('hex'), MARCA = 'E2E-C ' + CORRIDA
const VENTANA = 60, MONTO = Number(process.env.E2E_C_MONTO || 2), RECLAMO = MONTO / 2, ACORDADO = MONTO / 4
const enlace = h => 'https://stellar.expert/explorer/testnet/tx/' + h
const env = { ...process.env }
const SECRETOS = ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TRUSTLESS_WORK_API_KEY', 'LOCKUMI_TW_PLATAFORMA_SECRET', 'LOCKUMI_TW_MEDIADOR_SECRET', 'RESEND_API_KEY'].map(k => env[k]).filter(Boolean)
const limpio = t => SECRETOS.reduce((s, x) => s.split(x).join('[secreto]'), String(t))
const log = (...x) => console.log(limpio(x.join(' ')))
const espera = ms => new Promise(r => setTimeout(r, ms))
// Todo lo que firma una cuenta Stellar compartida (plataforma, inquilino) va en fila: los números de secuencia no se cruzan.
let fila = Promise.resolve(); const enFila = fn => { const p = fila.then(fn, fn); fila = p.catch(() => {}); return p }

// ── Destino: Postgres en memoria (simulado) o Supabase (real) ──
async function destinoSimulado() {
  const { PGlite } = await import('@electric-sql/pglite'); const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`)
  for (const m of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync('supabase/migrations/' + m, 'utf8'))
  let cola = Promise.resolve()   // PGlite: una consulta a la vez, cada una con su auth.uid()
  const q = (uid, sql, p = []) => { const r = cola.then(async () => { await db.query(`select set_config('test.uid', $1, false)`, [uid ?? '']); return (await db.query(sql, p)).rows }); cola = r.catch(() => {}); return r }
  const tokens = new Map()
  const cuenta = async () => { const uid = randomUUID(), token = 'sim-' + uid; tokens.set(token, uid)
    return { uid, token, sesion: null,
      rpc: async (fn, args) => { const ks = Object.keys(args); const [r] = await q(uid, `select public.${fn}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`, ks.map(k => Array.isArray(args[k]) ? `{${args[k].join(',')}}` : args[k])); return r?.r },
      subirFoto: async () => {}, filas: (t, id) => q(uid, `select * from public.${t} where contrato_id = $1`, [id]) } }
  // /api/tw habla con Supabase por REST con la clave de servicio: aquí se traduce a SQL (solo las rutas que usa api/_lib/tw.ts).
  const rest = async (url, init = {}) => {
    const u = new URL(url), t = u.pathname.split('/').pop(), p = Object.fromEntries(u.searchParams), m = init.method ?? 'GET', b = init.body ? JSON.parse(init.body) : null
    const ok = j => new Response(JSON.stringify(j), { status: 200 }), id = p.id?.slice(3) ?? p.contrato_id?.slice(3)
    if (t === 'lk_contratos' && m === 'GET') { const [k] = await q(null, `select id, estado, monto::float8 monto, direccion, escrow_contract_id, resultado, liquidacion_tx from public.lk_contratos where id = $1`, [id])
      return ok(k ? [{ ...k, lk_participantes: await q(null, `select rol, usuario::text usuario, direccion_stellar from public.lk_participantes where contrato_id = $1`, [id]) }] : []) }
    if (t === 'lk_contratos' && m === 'PATCH') { const cond = p.liquidacion_tx === 'is.null' ? ' and liquidacion_tx is null' : p.liquidacion_tx?.startsWith('eq.') ? ` and liquidacion_tx = '${p.liquidacion_tx.slice(3).replace(/'/g, '')}'` : ''
      const ks = Object.keys(b); const rows = await q(null, `update public.lk_contratos set ${ks.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1${cond} returning id`, [id, ...ks.map(k => b[k])]); return ok(rows) }
    if (t === 'lk_eventos' && m === 'POST') { await q(null, `insert into public.lk_eventos(contrato_id, texto, tx_hash) values ($1, $2, $3)`, [b.contrato_id, b.texto, b.tx_hash]); return new Response(null, { status: 201 }) }
    if (t === 'lk_eventos' && m === 'GET' && p.tx_hash) return ok(await q(null, `select texto from public.lk_eventos where contrato_id = $1 and tx_hash = $2`, [id, p.tx_hash.slice(3)]))
    if (t === 'lk_eventos' && m === 'GET') return ok(await q(null, `select texto from public.lk_eventos where contrato_id = $1 and texto = $2`, [id, p.texto.slice(3)]))
    if (t === 'lk_registrar_correo_invitacion' && m === 'POST') { const [r] = await q(null, `select public.lk_registrar_correo_invitacion($1, $2) r`, [b.p_contrato, b.p_para]); return ok(r.r) }
    // 20261025060000: «Todo bien, devolver» cierra al instante (solo la clave de servicio puede llamarla)
    if (t === 'lk_cerrar_aprobado' && m === 'POST') { const [r] = await q(null, `select public.lk_cerrar_aprobado($1) r`, [b.p_contrato]); return ok(r.r) }
    // Paso 17 · correos de C (api/_lib/correos-c.ts): cualquier rpc/lk_* con la clave de servicio, tal cual (argumentos con nombre).
    if (u.pathname.includes('/rpc/') && /^lk_[a-z0-9_]+$/.test(t) && m === 'POST') {
      const ks = Object.keys(b ?? {}); const rows = await q(null, `select * from public.${t}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, ks.map(k => b[k]))
      const v = rows.length === 1 && Object.keys(rows[0]).length === 1 && t in rows[0] ? rows[0][t] : rows
      return v === '' ? new Response(null, { status: 204 }) : ok(v) }   // «returns void»: PostgREST responde 204 sin cuerpo
    return new Response('ruta no simulada: ' + t, { status: 500 })
  }
  return { nombre: 'simulado (PGlite, todas las migraciones)', cuenta, rest, tokens, q,
    hacerMediador: async uid => { await q(null, `insert into public.lk_mediadores values ($1, $2)`, [uid, MARCA]) },
    leer: (t, id) => q(null, `select * from public.${t} where ${t === 'lk_contratos' ? 'id' : 'contrato_id'} = $1`, [id]),
    migraciones: async () => ({ m030: true, m040: true, m050: true, m060: true }), limpiar: async () => 0 }
}
async function destinoReal() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = (env.SUPABASE_URL || 'https://sddgjnuvxzkrhhuczuly.supabase.co').replace(/\/$/, ''); env.SUPABASE_URL = url
  const svc = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }
  const rest = (ruta, init = {}) => fetch(`${url}/rest/v1/${ruta}`, { ...init, headers: { ...svc, ...init.headers } })
  const cuenta = async () => {
    const sb = createClient(url, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: true } })
    const r = await sb.auth.signInAnonymously(); if (r.error) throw new Error('Inicio de sesión anónimo: ' + r.error.message + ' (¿está activado en Supabase → Authentication?)')
    const s = r.data.session
    return { uid: r.data.user.id, token: s.access_token, sesion: { access_token: s.access_token, refresh_token: s.refresh_token, token_type: 'bearer', expires_in: s.expires_in, expires_at: s.expires_at, user: s.user },
      rpc: async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(`${fn}: ${error.message}`); return data },
      subirFoto: async (ruta, bytes) => { const { error } = await sb.storage.from('lk-fotos').upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false }); if (error) throw new Error('foto: ' + error.message) },
      filas: async (t, id) => { const { data, error } = await sb.from(t).select('*').eq('contrato_id', id); if (error) throw new Error(t + ': ' + error.message); return data } }
  }
  const existe = async ruta => (await rest(ruta)).ok
  return { nombre: url.includes('sddgjnuvxzkrhhuczuly') ? 'Supabase de PRODUCCIÓN (datos de prueba marcados)' : 'Supabase ' + new URL(url).host, cuenta, rest: fetch,
    hacerMediador: async uid => { const r = await rest('lk_mediadores', { method: 'POST', body: JSON.stringify({ usuario: uid, nombre: MARCA }) }); if (!r.ok) throw new Error('mediador: ' + r.status) },
    leer: async (t, id) => { const r = await rest(`${t}?${t === 'lk_contratos' ? 'id' : 'contrato_id'}=eq.${id}&select=*`); if (!r.ok) throw new Error(t + ' ' + r.status); return r.json() },
    migraciones: async () => ({ m030: await existe('lk_reglas_651?select=contrato_id&limit=0'), m040: await existe('lk_reclamos?select=entregado_en&limit=0'), m050: await existe('lk_aceptaciones_terminos?select=contrato_id&limit=0'), m060: await existe('lk_contratos?select=entregado_en&limit=0') }),
    limpiar: async () => {
      const r = await rest(`lk_contratos?direccion=like.${encodeURIComponent('E2E-C %')}&select=id`); const ids = r.ok ? (await r.json()).map(x => x.id) : []
      for (const id of ids) await rest(`lk_contratos?id=eq.${id}`, { method: 'DELETE' })
      await rest(`lk_mediadores?nombre=like.${encodeURIComponent('E2E-C %')}`, { method: 'DELETE' })
      await rest(`lk_correos_enviados?para=like.${encodeURIComponent('lockumi+e2ec-%')}`, { method: 'DELETE' })   // correos de cuenta de prueba (sin alquiler)
      return ids.length } }
}

// ── Trustless Work falso (solo --simulado): devuelve XDR válidos de la cuenta que tiene que firmar ──
function twFalso(c) {
  const CID = 'C' + 'A'.repeat(55)
  const xdrDe = origen => new TransactionBuilder(new Account(origen, String(1e6 + Math.floor(Math.random() * 1e9))), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.invokeContractFunction({ contract: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] })).setTimeout(60).build().toXDR()
  return async (url, init) => {
    const b = init?.body ? JSON.parse(init.body) : {}, ok = j => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) { const uid = c.tokens.get(String(init.headers.authorization).replace('Bearer ', '')); return uid ? ok({ id: uid }) : new Response('{}', { status: 401 }) }
    if (url.includes('/rest/v1/')) return c.rest(url, init)
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS', contractId: CID })
    const quien = { 'single-release': b.signer, 'fund-escrow': b.signer, 'change-milestone-status': b.serviceProvider, 'approve-milestone': b.approver, 'release-funds': b.releaseSigner, 'dispute-escrow': b.signer, 'resolve-dispute': b.disputeResolver }[url.split('/').pop()]
    return quien ? ok({ unsignedTransaction: xdrDe(quien) }) : new Response('{"message":"no simulado"}', { status: 404 })
  }
}

// ── Cuentas Stellar desechables (solo --real): Friendbot, trustline de USDC y USDC comprado en el DEX de testnet ──
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'), HZ = new Horizon.Server('https://horizon-testnet.stellar.org')
async function cuentaStellar(usdc) {
  const kp = Keypair.random(); if (!REAL) return kp
  const fb = await fetch('https://friendbot.stellar.org/?addr=' + kp.publicKey()); if (!fb.ok) throw new Error('Friendbot ' + fb.status)
  const yo = await HZ.loadAccount(kp.publicKey())
  const t = new TransactionBuilder(yo, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: Networks.TESTNET }).addOperation(Operation.changeTrust({ asset: USDC }))
  if (usdc) t.addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: '9000', destination: kp.publicKey(), destAsset: USDC, destAmount: String(usdc), path: [] }))
  const tx = t.setTimeout(120).build(); tx.sign(kp); await HZ.submitTransaction(tx); return kp
}
const firmar = (kp, xdr) => { const t = TransactionBuilder.fromXDR(xdr, Networks.TESTNET); t.sign(kp); return t.toXDR() }

// ── Corrida ──
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { atender } = await vite.ssrLoadModule('/api/_lib/tw.ts'), { atenderCorreo } = await vite.ssrLoadModule('/api/_lib/correo.ts')
const { procesarCorreos, enviarCorreoCuenta, abrirCorreo, paginaAbrir } = await vite.ssrLoadModule('/api/_lib/correos-c.ts')
const D = REAL ? await destinoReal() : await destinoSimulado()
if (LIMPIAR) { log('Borrados', await D.limpiar(), 'alquileres marcados E2E-C en', D.nombre); await vite.close(); process.exit(0) }
if (REAL) { const falta = ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TRUSTLESS_WORK_API_KEY', 'LOCKUMI_TW_PLATAFORMA_SECRET', 'LOCKUMI_TW_MEDIADOR_PUBLICA', 'LOCKUMI_TW_MEDIADOR_SECRET'].filter(k => !env[k]); if (CORREOS && !env.RESEND_API_KEY) falta.push('RESEND_API_KEY'); if (falta.length) { log('Faltan variables:', falta.join(', ')); process.exit(2) } }
else { const P = Keypair.random(), M = Keypair.random(); Object.assign(env, { TRUSTLESS_WORK_API_KEY: 'sim', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(), LOCKUMI_TW_MEDIADOR_SECRET: M.secret(), SUPABASE_URL: 'https://simulado.supabase.co', SUPABASE_ANON_KEY: 'sim', SUPABASE_SERVICE_ROLE_KEY: 'sim', RESEND_API_KEY: 'sim' }) }
const fTw = REAL ? fetch : twFalso(D)
// Correos: Resend de verdad solo en --real --correos; en --simulado un Resend falso. Siempre detrás del corte al buzón de prueba.
const resendFalso = async (url, init) => /^https:\/\/api\.resend\.com\//.test(String(url)) ? new Response(JSON.stringify({ id: 'sim-' + randomUUID() }), { status: 200 }) : fTw(url, init)
const fCorreo = fetchSoloBuzon(REAL ? fetch : resendFalso), ORIGEN_CORREO = 'https://app.lockumi.com', enviados = []
const t0 = Date.now(), pasos = [], fallas = [], omitidos = []
// ── Paso 17 · correos de C desde el servidor (docs/correos-c.md): el MISMO procesarCorreos de /api/correo, /api/tw y la corrida
// diaria, con el borrador de textos permitido SOLO aquí (fuera de Vercel) y SOLO al buzón de prueba (doble corte: CORREOS_SOLO_BUZON
// en el servidor y fetchSoloBuzon en el script). Cada correo enviado deja su HTML en <salida>/correos/ para las capturas.
const CORREO_MEDIADOR = 'lockumi+e2ec-mediador@mail.grokbot.com'
const envC = { ...env, CORREOS_C: '1', LOCKUMI_CORREOS_BORRADOR: '1', CORREOS_SOLO_BUZON: '1', CORREO_MEDIACION: CORREO_MEDIADOR, CORREOS_ORIGEN: ORIGEN_CORREO }
delete envC.VERCEL; delete envC.VERCEL_ENV
const htmls = [], enviadosC = [], vistos = new Set()
const fC = async (url, init) => { if (/^https:\/\/api\.resend\.com\//.test(String(url))) { const b = JSON.parse(init.body); htmls.push({ to: b.to, subject: b.subject, html: b.html, text: b.text }) } return fCorreo(url, init) }
let filaCorreos = Promise.resolve(); const enFilaCorreos = fn => { const p = filaCorreos.then(fn, fn); filaCorreos = p.catch(() => {}); return p }
/** Corre el envío del servidor para ESE alquiler (con el reloj de prueba `ahora` para los recordatorios) y exige exactamente `esperado`. */
async function correosC(k, id, esperado, ahora) {
  const r = await enFilaCorreos(() => procesarCorreos(envC, { contrato: id, ahora, origen: ORIGEN_CORREO }, fC))
  for (const e of r.enviados) { enviadosC.push({ caso: k, ...e, resend_id: REAL ? e.id : 'simulado', enviado_en: new Date().toISOString(), reloj: ahora ?? null }); paso(k, `${e.plantilla} → ${e.para}${ahora ? ` (reloj de prueba ${ahora})` : ''}`) }
  const malos = r.omitidos.filter(o => o.motivo !== 'ya-enviado'); exigir(!malos.length, 'correos omitidos: ' + JSON.stringify(malos))
  const hechos = r.enviados.map(e => e.plantilla).sort(), quiero = [...esperado].sort()
  if (APP) {   // la app publicada ya pudo mandar algunos (p. ej. COR-C-07 al pagar): se cuentan los registros nuevos del alquiler
    const filas = (await D.leer('lk_correos_enviados', id)).filter(f => f.estado === 'enviado' && !vistos.has(f.clave))
    for (const f of filas) vistos.add(f.clave)
    const delServidor = filas.length - r.enviados.length
    for (const f of filas.filter(f => !r.enviados.some(e => e.clave === f.clave))) paso(k, `${f.correo} (${f.clave.replace(id, '…')}) → ${f.para}, enviado por ${APP}`)
    exigir(hechos.every(h => quiero.includes(h)) && hechos.length + delServidor === quiero.length, `correos: se esperaba ${quiero.join(', ') || 'ninguno'}; el script mandó ${hechos.join(', ') || 'ninguno'} y la app ${delServidor}`)
    return r
  }
  exigir(JSON.stringify(hechos) === JSON.stringify(quiero), `correos: se esperaba ${quiero.join(', ') || 'ninguno'} y salió ${hechos.join(', ') || 'ninguno'}`)
  return r
}
const CASILLA = 'Acepto que Lockumi me envíe avisos por correo'
const masDias = (t, d) => new Date(+new Date(t) + d * 864e5).toISOString()
/** El cron diario de las 3:00 a. m. (Costa Rica, UTC−6) del día calendario que está n días antes del día de t (Legal 25/10, 6:10 p. m.). */
const cronDiaAntes = (t, n) => `${new Date(Date.parse(new Date(+new Date(t) - 6 * 36e5).toISOString().slice(0, 10)) - n * 864e5).toISOString().slice(0, 10)}T09:00:00.000Z`
/** Vencimiento real del plazo (con domingos y feriados), igual que lk_fin_plazo. Los recordatorios se cuentan HACIA ATRÁS desde aquí (Legal 25/10, 5:09 p. m.). */
const { vencimiento } = await vite.ssrLoadModule('/api/_lib/plazos.ts')
const finPlazo = (t, seg) => new Date(vencimiento(+new Date(t), seg * 1000).fin).toISOString()
// En --simulado los hashes salen de XDR falsos: no existen en la red y no se muestran como enlaces.
const paso = (alq, nombre, tx) => { pasos.push({ alquiler: alq, paso: nombre, tx: tx ?? null, enlace: tx && REAL ? enlace(tx) : null }); log(`✔ [${alq}] ${nombre}${tx ? '  ' + (REAL ? enlace(tx) : 'tx simulada ' + tx.slice(0, 12) + '…') : ''}`) }
const twDirecto = APP ? async (cta, pedido) => {
  const r = await fetch(APP + '/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cta.token, origin: APP }, body: JSON.stringify(pedido) })
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${APP}/api/tw ${pedido.accion}: ${r.status} ${j.error ?? ''}`); return j
} : (cta, pedido) => atender(env, pedido, 'Bearer ' + cta.token, fTw)
const tw = (cta, pedido) => enFila(() => twDirecto(cta, pedido))
const mig = await D.migraciones()
log(`Destino: ${D.nombre} · corrida ${MARCA} · migración 030000 ${mig.m030 ? 'aplicada' : 'FALTA'} · 040000 ${mig.m040 ? 'aplicada' : 'FALTA'} · 050000 ${mig.m050 ? 'aplicada' : 'FALTA'} · 060000 ${mig.m060 ? 'aplicada' : 'FALTA'}`)
if (!mig.m060) log('  (sin 20261025060000, «Todo bien, devolver» no libera al aprobar: el flujo «aprobada» falla)')
if (!mig.m050) { log('✘ falta la migración 20261025050000 (Términos por alquiler) en el destino: sin ella no se puede crear ni unirse'); process.exit(1) }

const [dueno, inquilino, mediador] = [await D.cuenta(), await D.cuenta(), await D.cuenta()]
await D.hacerMediador(mediador.uid)
const correo = (r, k) => CORREOS ? correoPrueba(k, r) : `e2e-c+${CORRIDA.toLowerCase()}-${k}-${r}@lockumi.test`
log('Preparando cuentas de testnet (dueño e inquilino desechables)…')
const [kpD, kpI] = await Promise.all([cuentaStellar(0), cuentaStellar(MONTO * 4 + 1)])   // 4 alquileres con depósito (aprobada, silencio-dueno, mediacion, recordatorios)
const FOTO = readFileSync('public/icon-192.png')   // cualquier imagen: es una foto de prueba
const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 92 * 864e5).toISOString().slice(0, 10)
// Igual que declaracionInvitacion() de la app: con VITE_CORREOS=1 la declaración incluye el correo de invitación.
const DECL = CORREOS ? 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.' : 'Declaro que esta persona sabe que la invito.'
const { ASUNTO_INVITACION, NOMBRE_INVITACION } = await vite.ssrLoadModule('/api/_lib/textos-correos.ts')   // el mismo nombre por defecto que la app («el dueño»)
/** Lo que hace la app al crear con «Invitar» (enviarInvitacionUnaVez → /api/correo): el mismo atenderCorreo, origen de la app. */
async function invitarPorCorreo(k, id) {
  const para = correo('inquilino', k); exigir(BUZON.test(para), 'dirección de prueba fuera del buzón: ' + para)
  const pedido = { tipo: 'invitacion', para, alquiler: id, consentimiento: true, rol: 'inquilino', nombre: NOMBRE_INVITACION }
  const r = await atenderCorreo(env, pedido, ORIGEN_CORREO, '127.0.0.1', fCorreo)
  exigir(r.enviado && r.id, 'Resend no devolvió el id del correo de invitación')
  enviados.push({ caso: k, tipo: 'invitacion', para, asunto: ASUNTO_INVITACION, resend_id: REAL ? r.id : 'simulado', enviado_en: new Date().toISOString() })
  paso(k, `correo de invitación enviado a ${para} (Resend${REAL ? '' : ' simulado'})`)
  if (k === 'aprobada') {   // un solo correo por alquiler (lk_correos_invitacion): el segundo se rechaza antes de llamar a Resend
    const e = await atenderCorreo(env, pedido, ORIGEN_CORREO, '127.0.0.1', fCorreo).then(() => null, x => x)
    exigir(e?.estado === 409, 'un segundo correo de invitación no se rechazó'); paso(k, 'un segundo correo de invitación se rechaza (un solo correo por alquiler)')
  }
}

async function fotos(cta, id, etapa) {
  const actas = await cta.filas('lk_actas', id), acta = actas.find(a => a.etapa === etapa)
  for (const [i, c] of acta.cuartos.entries()) {
    const ruta = `${id}/${etapa}/${randomUUID()}.jpg`; await cta.subirFoto(ruta, FOTO)
    await cta.rpc('lk_registrar_foto', { p_contrato: id, p_etapa: etapa, p_cuarto: i, p_ruta: ruta, p_sha256: createHash('sha256').update(FOTO).digest('hex'), p_tomada_en: new Date().toISOString(), p_fecha_archivo: null, p_origen: 'camara', p_posible_galeria: false, p_sha256_original: null })
    for (const [j] of c.items.entries()) await cta.rpc('lk_editar_item', { p_contrato: id, p_etapa: etapa, p_cuarto: i, p_item: j, p_estado: 'bien', p_nota: null })
  }
}
/** Invitar → unirse → firmar → (pagar en la red) → fotos de entrada → salida → plazo del dueño. */
async function hastaPlazo(k, conPago, ventana = VENTANA) {
  const r = await dueno.rpc('lk_crear_contrato_con_terminos', { p_direccion: `${MARCA} · ${k}`, p_monto: MONTO, p_inicio: hoy, p_fin: fin, p_reglas: ['No fumar dentro de la casa'], p_email_inquilino: correo('inquilino', k),
    p_email_cavos: correo('dueno', k), p_declaracion: DECL, p_terminos_version: TERMINOS, p_direccion_stellar: kpD.publicKey(), p_ventana_segundos: ventana })
  const id = r.id; exigir((await estado(id)).terminos_version === TERMINOS, 'el alquiler no quedó en la ' + TERMINOS)
  paso(k, `el dueño crea el alquiler e invita (link de 7 días, con la declaración y los Términos ${TERMINOS})`)
  if (CORREOS) await invitarPorCorreo(k, id)
  await inquilino.rpc('lk_ver_invitacion', { p_contrato: id, p_token: r.token })
  await inquilino.rpc('lk_aceptar_invitacion_con_terminos', { p_contrato: id, p_token: r.token, p_email_cavos: correo('inquilino', k), p_terminos_version: TERMINOS, p_direccion_stellar: kpI.publicKey() })
  const acept = await inquilino.filas('lk_aceptaciones_terminos', id); exigir(['dueno', 'inquilino'].every(x => acept.some(a => a.rol === x && a.version === TERMINOS && a.aceptado_en)), 'faltan las aceptaciones de los Términos')
  paso(k, `el inquilino se une con su propia cuenta, aceptando los Términos ${TERMINOS} y el Aviso de privacidad`)
  // La casilla de la app (AvisosCorreo → lk_guardar_consentimiento_correo): cada parte marca «Acepto…» con su correo de prueba.
  for (const [cta, rol] of [[dueno, 'dueno'], [inquilino, 'inquilino']]) await cta.rpc('lk_guardar_consentimiento_correo', { p_contrato: id, p_para: correoPrueba(k, rol), p_acepta: true, p_texto: CASILLA })
  paso(k, 'las dos partes marcan la casilla de avisos por correo (guardada en el servidor)')
  await dueno.rpc('lk_firmar', { p_contrato: id, p_etapa: 'contrato' }); await inquilino.rpc('lk_firmar', { p_contrato: id, p_etapa: 'contrato' }); paso(k, 'los dos firman el contrato')
  let pago = null
  if (conPago) {
    const d = await tw(dueno, { accion: 'desplegar', contrato: id }); paso(k, 'Trustless Work: se crea la cuenta segura (deploy)', d.tx)
    // La cuenta del inquilino es la misma en los cuatro casos: pedir y enviar el depósito en el mismo turno de la fila (si no, tx_bad_seq)
    pago = (await enFila(async () => { const { unsignedXdr } = await twDirecto(inquilino, { accion: 'fondear', contrato: id }); return twDirecto(inquilino, { accion: 'enviar', contrato: id, paso: 'fondear', signedXdr: firmar(kpI, unsignedXdr) }) })).tx
    paso(k, `el inquilino deposita ${MONTO} USDC`, pago)
  }
  await inquilino.rpc('lk_registrar_pago', { p_contrato: id, p_tx: pago })
  await fotos(inquilino, id, 'entrada'); await dueno.rpc('lk_firmar', { p_contrato: id, p_etapa: 'entrada' }); await inquilino.rpc('lk_firmar', { p_contrato: id, p_etapa: 'entrada' })
  await dueno.rpc('lk_iniciar_salida', { p_contrato: id }); await fotos(dueno, id, 'salida')
  await dueno.rpc('lk_firmar', { p_contrato: id, p_etapa: 'salida' }); await inquilino.rpc('lk_firmar', { p_contrato: id, p_etapa: 'salida' }); paso(k, 'fotos de entrada y salida firmadas: empieza el plazo del dueño')
  if (!(await estado(id)).ventana_inicio) { await dueno.rpc('lk_recibi_casa', { p_contrato: id }); paso(k, 'el dueño toca «Recibí la casa»: empieza su plazo') }
  await correosC(k, id, ['COR-C-01/dueno', 'COR-C-01/inquilino'])
  return id
}
const esperarPlazo = async k => { log(`… [${k}] esperando el plazo de ${VENTANA} s`); await espera((VENTANA + 3) * 1000) }
const estado = async id => (await D.leer('lk_contratos', id))[0]
const TERMINOS = '1.9-demo'   // PR #22 (b)+(c): versión guardada por alquiler (20261025050000)
const exigir = (ok, m) => { if (!ok) throw new Error(m) }
const ids = {}
// Capa para retomar las capturas con los datos de esta corrida (resultado, hashes, historial, aceptaciones): pantalla → foto del alquiler.
const capa = {}
async function capturar(pantalla, id) {
  const [c] = await D.leer('lk_contratos', id)
  capa[pantalla] = { contrato: { monto: Number(c.monto), estado: c.estado, resultado: c.resultado, liquidacion_tx: c.liquidacion_tx, escrow_contract_id: c.escrow_contract_id, terminos_version: c.terminos_version ?? null },
    aceptaciones_terminos: (await D.leer('lk_aceptaciones_terminos', id)).map(a => ({ rol: a.rol, version: a.version, aceptado_en: a.aceptado_en })),
    eventos: (await D.leer('lk_eventos', id)).map(e => ({ texto: e.texto, tx_hash: e.tx_hash, creado_en: e.creado_en })),
    reclamos: (await D.leer('lk_reclamos', id)).map(r => { const { contrato_id: _c, ...resto } = r; return resto }),
    aceptaciones: (await D.leer('lk_aceptaciones_mediacion', id)).map(a => ({ rol: a.rol, monto_dueno: Number(a.monto_dueno), aceptado_en: a.aceptado_en })) }
}
const flujos = {
  async aprobada() {   // «Todo bien, devolver» (Términos 6.5 a): el dueño aprueba en la cadena y el servidor libera el 100 % en ese momento
    const id = ids.aprobada = await hastaPlazo('aprobada', true)
    const { unsignedXdr, evidenciaTx } = await tw(dueno, { accion: 'aprobar', contrato: id }); paso('aprobada', 'evidencia de la plataforma', evidenciaTx)
    const ap = await tw(dueno, { accion: 'enviar', contrato: id, paso: 'aprobar', signedXdr: firmar(kpD, unsignedXdr) }); paso('aprobada', 'el dueño aprueba la devolución', ap.tx)
    exigir(ap.liberacion, 'no se liberó al aprobar: ' + (ap.errorLiberacion ?? 'sin respuesta')); paso('aprobada', 'devolución del 100 % al inquilino al aprobar (liberación)', ap.liberacion)
    const e = await estado(id); exigir(e.estado === 'cerrado' && e.resultado.via === 'devuelto' && Number(e.resultado.inquilino) === MONTO, 'no quedó cerrado como «devuelto» con el 100 % al inquilino')
    let rechazo = ''; try { await dueno.rpc('lk_reclamar', { p_contrato: id, p_monto: 1, p_motivo: 'después de aprobar' }) } catch (x) { rechazo = x.message }
    exigir(rechazo, 'el servidor dejó reclamar después de aprobar'); paso('aprobada', 'después de aprobar, el servidor no deja reclamar')
    await correosC('aprobada', id, ['COR-C-07/devuelto', 'COR-C-07/devuelto'])   // lo que hace /api/tw después de pagar
  },
  async silencioDueno() {   // 5.3 d: el dueño no aprueba ni reclama → devolución automática del 100 % (disputa + resolución)
    const id = ids.silencioDueno = await hastaPlazo('silencio-dueno', true)
    if (!REAL) await D.q(null, `update public.lk_contratos set ventana_inicio = now() - interval '2 minutes' where id = $1`, [id]); else await esperarPlazo('silencio-dueno')
    // 6.5 a) (20261025070000): vencido el plazo, aunque el cron todavía no haya devuelto el depósito, no se puede reclamar
    let tarde = ''; try { await dueno.rpc('lk_reclamar', { p_contrato: id, p_monto: 1, p_motivo: 'después del plazo' }) } catch (x) { tarde = x.message }
    exigir(REAL ? /plazo para reclamar ya terminó/.test(tarde) : tarde === 'El plazo para reclamar ya terminó y ya no puedes reclamar en la app. El depósito se le devuelve al inquilino; puede tardar hasta 24 horas. Fuera de la app, aplica la cláusula 6.5 d).', 'el servidor dejó reclamar con el plazo vencido: ' + (tarde || 'sin error'))
    exigir((await estado(id)).estado === 'ventana_reclamo' && !(await D.leer('lk_reclamos', id)).length, 'el reclamo tardío cambió el caso')
    paso('silencio-dueno', 'plazo vencido sin cron: el servidor rechaza el reclamo')
    exigir(await dueno.rpc('lk_cerrar_sin_reclamo', { p_contrato: id }), 'no cerró al vencer el plazo')
    const r = await tw(inquilino, { accion: 'devolver-automatico', contrato: id }); paso('silencio-dueno', 'disputa abierta por la plataforma', r.disputaTx); paso('silencio-dueno', 'la cuenta que resuelve disputas devuelve el 100 % al inquilino', r.tx)
    exigir((await D.leer('lk_eventos', id)).some(e => e.tx_hash === r.tx), 'la firma de la mediadora no quedó en el historial'); paso('silencio-dueno', 'la firma de la mediadora queda en el historial con su hash', r.tx)
    const e = await estado(id); exigir(e.resultado.via === 'automatico' && Number(e.resultado.inquilino) === MONTO, 'el resultado no es 100 % al inquilino'); await capturar('auto', id)
    await correosC('silencio-dueno', id, ['COR-C-07/automatico', 'COR-C-07/automatico'])
  },
  async mediacion() {   // reclamo → el inquilino rechaza → las dos partes aceptan el mismo reparto → la persona mediadora lo registra → «repartir»
    const id = ids.mediacion = await hastaPlazo('mediacion', true)
    const ruta = `${id}/reclamo/${randomUUID()}.jpg`; await dueno.subirFoto(ruta, FOTO)
    await dueno.rpc('lk_registrar_foto', { p_contrato: id, p_etapa: 'reclamo', p_cuarto: null, p_ruta: ruta, p_sha256: createHash('sha256').update(FOTO).digest('hex'), p_tomada_en: new Date().toISOString(), p_fecha_archivo: null, p_origen: 'camara', p_posible_galeria: false, p_sha256_original: null })
    await dueno.rpc('lk_reclamar', { p_contrato: id, p_monto: RECLAMO, p_motivo: 'Mancha en la pared de la sala (prueba)' }); paso('mediacion', `el dueño reclama ${RECLAMO} USDC`)
    await correosC('mediacion', id, ['COR-C-03'])
    // El inquilino toca «Ver el reclamo» en el correo: GET /api/correo?abrir=<enlace> solo muestra una página con un botón; al tocar
    // el botón (POST) se registra la apertura (6.5 b), una sola vez (Legal 25/10, 5:09 p. m., punto 4).
    const aviso = htmls.filter(h => h.to?.[0] === correoPrueba('mediacion', 'inquilino') && /\/api\/correo\?abrir=/.test(h.html)).pop()
    const token = aviso?.html.match(/\/api\/correo\?abrir=([0-9a-f]{64})/)?.[1]; exigir(token, 'COR-C-03 no trae el enlace de apertura')
    exigir(paginaAbrir(token).includes(`<form method="post" action="/api/correo?abrir=${token}">`), 'la página del enlace no trae el botón')
    exigir(!(await D.leer('lk_reclamos', id))[0].abierto_en, 'abrir la página (GET) registró la apertura')
    exigir(await abrirCorreo(envC, token, fC) === id, 'el botón de la página no abrió el alquiler'); await abrirCorreo(envC, token, fC)
    const [rec] = await D.leer('lk_reclamos', id); exigir(rec.abierto_en, 'no quedó registrada la apertura del aviso')
    exigir((await D.leer('lk_eventos', id)).filter(e => e.texto === 'El inquilino abrió el aviso del reclamo').length === 1, 'la apertura no quedó una sola vez en el historial')
    paso('mediacion', 'el inquilino abre el aviso del reclamo desde el correo: queda la hora (una sola vez en el historial)')
    await inquilino.rpc('lk_responder_reclamo', { p_contrato: id, p_acepta: false }); paso('mediacion', 'el inquilino rechaza: pasa a la mediación')
    await correosC('mediacion', id, ['COR-C-05/partes', 'COR-C-05/partes', 'COR-C-05/mediacion'])
    await dueno.rpc('lk_aceptar_acuerdo_mediacion', { p_contrato: id, p_monto_dueno: ACORDADO })
    const vistas = await inquilino.filas('lk_aceptaciones_mediacion', id); exigir(vistas.some(v => v.rol === 'dueno' && Number(v.monto_dueno) === ACORDADO), 'el inquilino no ve la aceptación del dueño')
    paso('mediacion', 'el inquilino ve lo que aceptó el dueño'); await capturar('mediacion', id)
    let rechazo = ''; try { await mediador.rpc('lk_decidir_mediacion', { p_contrato: id, p_monto_dueno: ACORDADO, p_motivo: null }) } catch (e) { rechazo = e.message }
    exigir(/Faltan las aceptaciones/.test(rechazo), 'la persona mediadora pudo cerrar con una sola aceptación'); paso('mediacion', 'con una sola aceptación la persona mediadora no puede cerrar')
    await inquilino.rpc('lk_aceptar_acuerdo_mediacion', { p_contrato: id, p_monto_dueno: ACORDADO })
    await mediador.rpc('lk_decidir_mediacion', { p_contrato: id, p_monto_dueno: ACORDADO, p_motivo: null }); paso('mediacion', `las dos partes aceptaron ${ACORDADO}/${MONTO - ACORDADO}: la persona mediadora lo registra`)
    const r = await tw(inquilino, { accion: 'repartir', contrato: id }); paso('mediacion', 'disputa abierta por la plataforma', r.disputaTx); paso('mediacion', `«repartir»: ${ACORDADO} USDC al dueño y ${MONTO - ACORDADO} al inquilino (menos 0,3 %)`, r.tx)
    const otra = await tw(dueno, { accion: 'repartir', contrato: id }); exigir(otra.yaExistia && otra.tx === r.tx, 'el segundo «repartir» no fue idempotente'); paso('mediacion', 'un segundo «repartir» no paga dos veces (mismo hash)')
    exigir((await D.leer('lk_eventos', id)).some(e => e.tx_hash === r.tx), 'la firma de la mediadora no quedó en el historial'); paso('mediacion', 'la firma de la mediadora queda en el historial con su hash', r.tx)
    exigir((await estado(id)).liquidacion_tx === r.tx, 'no guardó el hash en liquidacion_tx'); await capturar('cerrado', id)
    await correosC('mediacion', id, ['COR-C-06/partes', 'COR-C-06/partes'])
  },
  async silencioInquilino() {   // 6.5 c, opción 1 de Legal: el inquilino no responde → mediación «regla no disponible en esta versión (6.5.1 d)», sin pago
    if (!mig.m040) { omitidos.push('silencio del inquilino: falta la migración 20261025040000 en el destino (aplicarla en producción necesita aprobación)'); log('↷ silencio del inquilino OMITIDO: falta 040000'); return }
    const id = ids.silencioInquilino = await hastaPlazo('silencio-inquilino', false)
    const ruta = `${id}/reclamo/${randomUUID()}.jpg`; await dueno.subirFoto(ruta, FOTO)
    await dueno.rpc('lk_registrar_foto', { p_contrato: id, p_etapa: 'reclamo', p_cuarto: null, p_ruta: ruta, p_sha256: createHash('sha256').update(FOTO).digest('hex'), p_tomada_en: new Date().toISOString(), p_fecha_archivo: null, p_origen: 'camara', p_posible_galeria: false, p_sha256_original: null })
    await dueno.rpc('lk_reclamar', { p_contrato: id, p_monto: RECLAMO, p_motivo: 'Pomo del dormitorio quebrado (prueba)' }); paso('silencio-inquilino', `el dueño reclama ${RECLAMO} USDC`)
    await correosC('silencio-inquilino', id, ['COR-C-03'])
    exigir(await inquilino.rpc('lk_aplicar_silencio', { p_contrato: id }) === null, 'pasó a mediación antes del plazo')
    if (!REAL) await D.q(null, `update public.lk_reclamos set entregado_en = now() - interval '2 minutes' where contrato_id = $1`, [id]); else await esperarPlazo('silencio-inquilino')
    exigir(await dueno.rpc('lk_aplicar_silencio', { p_contrato: id }) === 'mediacion', 'no pasó a la mediación')
    const e = await estado(id); exigir(e.estado === 'mediacion' && !e.resultado && !e.liquidacion_tx, 'no debía cerrar ni pagar'); paso('silencio-inquilino', 'el inquilino no respondió: pasa a la mediación (regla no disponible en esta versión, 6.5.1 d), sin pago')
    await correosC('silencio-inquilino', id, ['COR-C-05/partes', 'COR-C-05/partes', 'COR-C-05/mediacion'])
    // P-06: plazo de 3 días hábiles de la mediación (lunes a viernes, sin feriados de Costa Rica), con el reloj de prueba.
    const [pl] = await D.leer('lk_mediacion_plazos', id); exigir(pl?.vence, 'no quedó programado el plazo de la mediación')
    paso('silencio-inquilino', `plazo de la mediación: ${pl.desde} → vence ${pl.vence} (3 días hábiles)`)
    await correosC('silencio-inquilino', id, ['COR-C-05/recordatorio', 'COR-C-05/recordatorio', 'COR-C-05/recordatorio-mediacion'], cronDiaAntes(pl.vence, 1))   // el día anterior, 3:00 a. m.
    await correosC('silencio-inquilino', id, ['COR-C-06/vencida', 'COR-C-06/vencida', 'COR-C-06/vencida-mediacion'], masDias(pl.vence, 1 / 1440))
    const v = await estado(id), [pl2] = await D.leer('lk_mediacion_plazos', id)
    exigir(v.estado === 'mediacion' && !v.resultado && !v.liquidacion_tx && pl2.vencido_en, 'al vencer la mediación no debía pagar ni cerrar')
    exigir((await D.leer('lk_eventos', id)).some(x => x.texto.startsWith('Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo)')), 'el vencimiento no quedó en el historial')
    paso('silencio-inquilino', 'vence la mediación (reloj de prueba): queda en el historial, no se paga nada y la mediación sigue abierta')
  },
  async recordatorios() {   // plazo de 7 días: recordatorios del dueño (quedan 3 días / vence mañana) y del inquilino tras el reclamo, con el reloj de prueba
    const id = ids.recordatorios = await hastaPlazo('recordatorios', true, 7 * 86400)
    const inicio = (await estado(id)).ventana_inicio; exigir(inicio, 'no empezó el plazo del dueño')
    const fin = finPlazo(inicio, 7 * 86400)
    await correosC('recordatorios', id, ['COR-C-02/d4'], cronDiaAntes(fin, 3))   // quedan 3 días (día calendario fin − 3)
    await correosC('recordatorios', id, ['COR-C-02/d6'], cronDiaAntes(fin, 1))   // vence mañana (día calendario fin − 1)
    const ruta = `${id}/reclamo/${randomUUID()}.jpg`; await dueno.subirFoto(ruta, FOTO)
    await dueno.rpc('lk_registrar_foto', { p_contrato: id, p_etapa: 'reclamo', p_cuarto: null, p_ruta: ruta, p_sha256: createHash('sha256').update(FOTO).digest('hex'), p_tomada_en: new Date().toISOString(), p_fecha_archivo: null, p_origen: 'camara', p_posible_galeria: false, p_sha256_original: null })
    await dueno.rpc('lk_reclamar', { p_contrato: id, p_monto: RECLAMO, p_motivo: 'Vidrio de la ventana rajado (prueba)' }); paso('recordatorios', `el dueño reclama ${RECLAMO} USDC`)
    await correosC('recordatorios', id, ['COR-C-03'])
    const [rec] = await D.leer('lk_reclamos', id); exigir(rec?.entregado_en, 'el reclamo no tiene hora de entrega')
    const finInq = finPlazo(rec.entregado_en, 7 * 86400)
    await correosC('recordatorios', id, ['COR-C-04/d4'], cronDiaAntes(finInq, 3))
    await correosC('recordatorios', id, ['COR-C-04/d6'], cronDiaAntes(finInq, 1))
    // 6.5 c) el inquilino acepta el reclamo: cierre por acuerdo, «repartir» en la red de prueba y COR-C-07 «acuerdo» a los dos
    await inquilino.rpc('lk_responder_reclamo', { p_contrato: id, p_acepta: true }); paso('recordatorios', 'el inquilino acepta el reclamo: cierre por acuerdo')
    const r = await tw(inquilino, { accion: 'repartir', contrato: id }); paso('recordatorios', `«repartir» del acuerdo: ${RECLAMO} USDC al dueño y ${MONTO - RECLAMO} al inquilino (menos 0,3 %)`, r.tx)
    exigir((await estado(id)).liquidacion_tx === r.tx, 'no guardó el hash del acuerdo')
    await correosC('recordatorios', id, ['COR-C-07/acuerdo', 'COR-C-07/acuerdo'])
  },
}
await Promise.all(Object.entries(flujos).map(([k, f]) => f().catch(e => { fallas.push(`${k}: ${limpio(e.message)}`); log(`✘ [${k}] ${limpio(e.message)}`) })))
// COR-C-08 y COR-C-09: correos de servicio de la cuenta (sin casilla). Una sola vez por pedido.
try {
  const pedido = Date.now(), para = correoPrueba('cuenta', 'dueno'), paraB = correoPrueba('cuenta', 'inquilino')
  const a1 = await enviarCorreoCuenta(envC, { correo: 'COR-C-08', variante: 'A', para, pedidoEn: pedido }, fC)
  const b1 = await enviarCorreoCuenta(envC, { correo: 'COR-C-08', variante: 'B', para: paraB, pedidoEn: pedido }, fC)
  const c1 = await enviarCorreoCuenta(envC, { correo: 'COR-C-09', para, pedidoEn: pedido, eliminadoEn: Date.now() }, fC)
  for (const [x, to] of [[a1, para], [b1, paraB], [c1, para]]) { exigir(x.id, x.plantilla + ' sin id de Resend'); enviadosC.push({ caso: 'cuenta', clave: x.clave, correo: x.plantilla.slice(0, 8), plantilla: x.plantilla, para: to, resend_id: REAL ? x.id : 'simulado', enviado_en: new Date().toISOString(), reloj: null }); paso('cuenta', `${x.plantilla} → ${to}`) }
  const otra = await enviarCorreoCuenta(envC, { correo: 'COR-C-08', variante: 'A', para, pedidoEn: pedido }, fC); exigir(otra.yaEnviado && !otra.id, 'COR-C-08 salió dos veces')
  paso('cuenta', 'el mismo pedido no envía COR-C-08 dos veces')
} catch (e) { fallas.push('cuenta: ' + limpio(e.message)); log('✘ [cuenta] ' + limpio(e.message)) }
// Segunda pasada: con todo ya enviado, el servidor no repite ningún correo (una vez por evento).
for (const [k, id] of Object.entries(ids)) { if (!id) continue
  try { await correosC(k, id, []); paso(k, 'segunda pasada: ningún correo repetido') } catch (e) { fallas.push(`${k} (segunda pasada): ${limpio(e.message)}`); log(`✘ [${k}] ${limpio(e.message)}`) } }
mkdirSync(SALIDA + '/correos', { recursive: true })
htmls.forEach((h, i) => writeFileSync(`${SALIDA}/correos/${String(i + 1).padStart(2, '0')}.html`, h.html))
writeFileSync(SALIDA + '/correos/indice.json', JSON.stringify(htmls.map((h, i) => ({ archivo: `${String(i + 1).padStart(2, '0')}.html`, para: h.to, asunto: h.subject, plantilla: enviadosC[i]?.plantilla ?? null })), null, 2))
const seg = Math.round((Date.now() - t0) / 1000)
mkdirSync(SALIDA, { recursive: true })
const est = { corrida: MARCA, modo: REAL ? 'real (testnet)' : 'simulado', destino: D.nombre, migraciones: mig, segundos: seg, ids, pasos, fallas, omitidos, correos: { activos: CORREOS, enviados, servidor: enviadosC,
  // Lo que la app NO envía en C (modo servidor): no se finge. Ver docs/prueba-completa.md.
  no_cubiertos: [] } }
writeFileSync(SALIDA + '/estado.json', JSON.stringify(est, null, 2))
writeFileSync(SALIDA + '/capa-capturas.json', JSON.stringify(capa, (k, v) => v instanceof Date ? v.toISOString() : v, 2))
if (REAL) { writeFileSync(SALIDA + '/sesiones.json', JSON.stringify({ dueno: dueno.sesion, inquilino: inquilino.sesion })); chmodSync(SALIDA + '/sesiones.json', 0o600) }   // solo para las capturas; vencen solas
const md = [`# E2E escenario C · ${est.modo}`, '', `- Corrida: ${MARCA} · destino: ${D.nombre} · ${seg} s`, `- Migraciones en el destino: 030000 ${mig.m030 ? 'sí' : 'NO'}, 040000 ${mig.m040 ? 'sí' : 'NO'}, 050000 ${mig.m050 ? 'sí' : 'NO'}, 060000 ${mig.m060 ? 'sí' : 'NO'}`,
  `- Resultado: ${fallas.length ? fallas.length + ' fallas' : 'todo en verde'}${omitidos.length ? ` · ${omitidos.length} omitido(s)` : ''}`, '', '| Alquiler | Paso | Transacción |', '|---|---|---|',
  ...pasos.map(p => `| ${p.alquiler} | ${p.paso} | ${p.tx ? (p.enlace ? `[${p.tx.slice(0, 10)}…](${p.enlace})` : `simulada ${p.tx.slice(0, 10)}…`) : ''} |`), '', ...fallas.map(f => '- FALLA: ' + f), ...omitidos.map(o => '- OMITIDO: ' + o),
  ...(CORREOS ? ['', '## Correos', '', '| Alquiler | Correo | Para | Id de Resend | Enviado (UTC) |', '|---|---|---|---|---|', ...enviados.map(c => `| ${c.caso} | ${c.asunto} | ${c.para} | ${c.resend_id} | ${c.enviado_en} |`), '',
    '## Correos del servidor (COR-C-01 a COR-C-09)', '', '| Alquiler | Plantilla | Para | Id de Resend | Enviado (UTC) | Reloj de prueba |', '|---|---|---|---|---|---|',
    ...enviadosC.map(c => `| ${c.caso} | ${c.plantilla} | ${c.para} | ${c.resend_id} | ${c.enviado_en} | ${c.reloj ?? ''} |`)] : [])].join('\n')
writeFileSync(SALIDA + '/informe.md', md + '\n')
log(`\n${fallas.length ? '✘' : '✔'} ${pasos.length} pasos, ${fallas.length} fallas, ${omitidos.length} omitidos en ${seg} s · ${SALIDA}/informe.md`)
await vite.close(); process.exit(fallas.length ? 1 : 0)
