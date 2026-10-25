// Escenario C · correos del servidor COR-C-01 a COR-C-09 (lista y diseño: docs/correos-c.md; textos: api/_lib/textos-correos.ts).
// * Qué toca a quién sale de Supabase (lk_correos_pendientes: estado del alquiler + casilla guardada − lo ya enviado).
// * Cada correo se reserva (lk_correo_reservar, clave única) antes de llamar a Resend con esa misma clave de idempotencia, y se
//   marca enviado o fallido (lk_correo_marcar): sale una sola vez por evento y queda registrado.
// * Corre desde el cron diario (/api/borrados), /api/correo (tipo 'avisos', después de cada paso en la app) y /api/tw (al pagar).
// * Encendido con CORREOS_C=1 (servidor). REGLA DURA: con cualquier texto «LEGAL: revisar», no sale nada, salvo la excepción local
//   LOCKUMI_CORREOS_BORRADOR=1 fuera de Vercel, y entonces solo al buzón de prueba lockumi@mail.grokbot.com.
// RESEND_API_KEY y SUPABASE_SERVICE_ROLE_KEY solo viven en el servidor y nunca se devuelven.
import { servicio, rpc, type ServicioSupabase } from './supabase.js'
import { ErrorCorreo, REMITENTE, origenPermitido } from './correo.js'
import { TEXTOS, textosPorRevisar, DEMO, PIE, PIE_BAJA, NOTA_CONFIRMAR, NOTA_UN_BOTON, type DatosCorreo } from './textos-correos.js'
import { sumarHabiles } from './plazos.js'

type Env = Record<string, string | undefined>
/** Buzón de prueba (igual que scripts/correos-e2e.mjs). */
export const BUZON_PRUEBA = /^lockumi(\+[a-z0-9-]{1,56})?@mail\.grokbot\.com$/i
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
/** sha256 en hexadecimal (Web Crypto: Node 22 y Vercel). */
export const sha256 = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))
const tokenNuevo = () => hex(crypto.getRandomValues(new Uint8Array(32)))
export const LOGO = 'https://app.lockumi.com/icon-192.png'

/** Excepción local para la prueba al buzón: nunca en Vercel (ni vista previa ni producción). */
export const borradorPermitido = (env: Env) => env.LOCKUMI_CORREOS_BORRADOR === '1' && !env.VERCEL && env.VERCEL_ENV !== 'production'
/** Falla si algún texto tiene «LEGAL: revisar» y no vale la excepción local. Devuelve si se envía en modo borrador. */
export function revisarTextos(env: Env): { borrador: boolean } {
  const faltan = textosPorRevisar()
  if (!faltan.length) return { borrador: false }
  if (borradorPermitido(env)) return { borrador: true }
  throw new ErrorCorreo(503, `No se envía ningún correo: ${faltan.length} textos todavía tienen la marca «LEGAL: revisar».`)
}

export interface Pendiente { clave: string; correo: string; contrato_id: string | null; rol: string; para: string | null; datos: Record<string, unknown> }
/** Plantilla de textos-correos.ts para un pendiente. */
export function plantillaDe(p: Pendiente): string {
  const d = p.datos, med = p.rol === 'mediacion'
  switch (p.correo) {
    case 'COR-C-01': return `COR-C-01/${p.rol}`
    case 'COR-C-02': return `COR-C-02/d${d.dia}`
    case 'COR-C-03': return 'COR-C-03'
    case 'COR-C-04': return `COR-C-04/d${d.dia}`
    case 'COR-C-05': return d.variante === 'recordatorio' ? (med ? 'COR-C-05/recordatorio-mediacion' : 'COR-C-05/recordatorio') : (med ? 'COR-C-05/mediacion' : 'COR-C-05/partes')
    case 'COR-C-06': return d.variante === 'vencida' ? (med ? 'COR-C-06/vencida-mediacion' : 'COR-C-06/vencida') : 'COR-C-06/partes'
    case 'COR-C-07': return `COR-C-07/${d.via}`
    default: return p.correo
  }
}
const ms = (x: unknown) => typeof x === 'string' ? Date.parse(x) : typeof x === 'number' ? x : undefined
const num = (x: unknown) => x === null || x === undefined ? undefined : Number(x)
function datosDe(d: Record<string, unknown>): DatosCorreo {
  return { deposito: num(d.deposito), reclamado: num(d.reclamado), vence: ms(d.vence ?? d.fin), auto: !!d.auto, abierto: !!d.abierto,
    motivo: d.motivo === 'rechazo' ? 'rechazo' : 'silencio', dueno: num(d.dueno), inquilino: num(d.inquilino) }
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Asunto, HTML y texto plano con el diseño de la invitación (logo, crema, café, botones naranjas, línea durazno). */
export function armarC(clave: string, d: DatosCorreo, o: { origen: string; alquiler?: string; abrir?: string }) {
  const t = TEXTOS[clave]; if (!t) throw new ErrorCorreo(400, 'Correo inválido.')
  const asunto = t.asunto(d), cuerpo = t.cuerpo(d)
  const base = o.alquiler ? `${o.origen}/#/alquiler/${encodeURIComponent(o.alquiler)}?aviso=${t.id.toLowerCase()}&canal=correo` : `${o.origen}/`
  const botones = t.botones.map(b => ({ texto: b.texto, url: b.destino === 'reclamo' && o.abrir ? o.abrir : b.destino === 'devolver' ? `${base}&confirmar=devolver` : base }))
  const nota = t.nota === 'confirmar' ? NOTA_CONFIRMAR : t.nota === 'uno' ? NOTA_UN_BOTON : ''
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#3D2A22;background:#FFF5EE;max-width:560px;margin:0 auto;padding:0 0 16px">
<div style="height:6px;background:#E8531F;background-image:linear-gradient(90deg,#E8531F,#FFB08A)"></div>
<div style="padding:16px">
<p style="margin:0 0 12px"><img src="${LOGO}" width="40" height="40" alt="Lockumi" style="vertical-align:middle;border-radius:10px"> <strong style="font-size:18px;color:#3D2A22;vertical-align:middle">Lockumi</strong></p>
<p style="font-size:13px;color:#7A5446;margin:0 0 12px"><strong>${esc(DEMO)}</strong></p>
<h1 style="font-size:20px;margin:0 0 12px;color:#3D2A22">${esc(asunto)}</h1>
<p style="font-size:15px;line-height:1.5">${esc(cuerpo)}</p>
${botones.map(b => `<p><a href="${esc(b.url)}" style="display:inline-block;background:#FF6B35;color:#3D2A22;font-weight:bold;padding:10px 16px;border-radius:8px;border:1px solid #E8531F;text-decoration:none">${esc(b.texto)}</a></p>`).join('\n')}
${nota ? `<p style="font-size:13px;color:#7A5446">${esc(nota)}</p>` : ''}
${t.baja ? `<p style="font-size:13px;color:#3D2A22">${esc(PIE_BAJA)}</p>` : ''}
<hr style="border:none;border-top:1px solid #FFB08A;margin:20px 0"><p style="font-size:12px;color:#7A5446;line-height:1.5">${esc(PIE)} <a href="${esc(o.origen)}/privacidad" style="color:#E8531F">Privacidad</a></p>
</div></body></html>`
  const texto = [DEMO, asunto, cuerpo, botones.map(b => `${b.texto}: ${b.url}`).join('\n'), nota, t.baja ? PIE_BAJA : '', `${PIE} Privacidad: ${o.origen}/privacidad`].filter(Boolean).join('\n\n')
  return { asunto, html, texto }
}

async function resend(llave: string, para: string, c: { asunto: string; html: string; texto: string }, clave: string, f: typeof fetch) {
  const r = await f('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json', 'idempotency-key': clave.slice(0, 256) },
    body: JSON.stringify({ from: REMITENTE, to: [para], subject: c.asunto, html: c.html, text: c.texto }),
  })
  const j = await r.json().catch(() => ({})) as { id?: string }
  return r.ok && j.id ? j.id : null
}
const espera = (n: number) => new Promise(r => setTimeout(r, n))
function preparar(env: Env, origen?: string) {
  const s = servicio(env); if (!s) throw new ErrorCorreo(503, 'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.')
  const llave = env.RESEND_API_KEY?.trim(); if (!llave) throw new ErrorCorreo(503, 'El correo no está configurado en este servidor.')
  const o = (origen ?? env.CORREOS_ORIGEN ?? 'https://app.lockumi.com').replace(/\/+$/, '')
  if (!origenPermitido(o)) throw new ErrorCorreo(403, 'Origen de la app no permitido para los enlaces.')
  return { s, llave, origen: o }
}
/** ¿Se puede enviar a esta dirección? En borrador o con CORREOS_SOLO_BUZON=1, solo al buzón de prueba. */
const destinoPermitido = (env: Env, borrador: boolean, para: string) => EMAIL.test(para) && (!(borrador || env.CORREOS_SOLO_BUZON === '1') || BUZON_PRUEBA.test(para))

export interface Resultado { apagado?: true; enviados: { clave: string; correo: string; plantilla: string; para: string; id: string }[]; omitidos: { clave: string; motivo: string }[]; vencidas: number }

/** Vence el plazo de 3 días hábiles de la mediación (P-06): guarda el plazo, marca los vencidos y deja el evento en el historial.
 *  Corre SIEMPRE, con o sin CORREOS_C (Legal 25/10, 5:09 p. m., punto 3): en la corrida diaria (api/_lib/borrados.ts), después de
 *  cada paso con un alquiler en /api/tw y en cada aviso de la app (/api/correo { tipo: 'avisos' }). No envía correos. */
export async function vencerMediaciones(env: Env, op: { contrato?: string; ahora?: string } = {}, f: typeof fetch = fetch): Promise<number> {
  if (op.contrato !== undefined && !UUID.test(op.contrato)) throw new ErrorCorreo(400, 'Alquiler inválido.')
  const s = servicio(env); if (!s) throw new ErrorCorreo(503, 'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.')
  return Number(await rpc<number>(s, 'lk_mediacion_vencimientos', { p_contrato: op.contrato ?? null, ...(op.ahora ? { p_ahora: op.ahora } : {}) }, f)) || 0
}

/** Envía lo que toca (de un alquiler o de todos). `ahora`: reloj de prueba para los recordatorios (solo lo usa el servidor). */
export async function procesarCorreos(env: Env, op: { contrato?: string; ahora?: string; origen?: string; pausaMs?: number } = {}, f: typeof fetch = fetch): Promise<Resultado> {
  if (env.CORREOS_C !== '1') return { apagado: true, enviados: [], omitidos: [], vencidas: 0 }
  const { borrador } = revisarTextos(env)
  const { s, llave, origen } = preparar(env, op.origen)
  if (op.contrato !== undefined && !UUID.test(op.contrato)) throw new ErrorCorreo(400, 'Alquiler inválido.')
  const args = { p_contrato: op.contrato ?? null, ...(op.ahora ? { p_ahora: op.ahora } : {}) }
  const vencidas = await rpc<number>(s, 'lk_mediacion_vencimientos', args, f)
  const pendientes = await rpc<Pendiente[]>(s, 'lk_correos_pendientes', args, f)
  const r: Resultado = { enviados: [], omitidos: [], vencidas: Number(vencidas) || 0 }
  for (const p of pendientes) {
    const para = (p.rol === 'mediacion' ? env.CORREO_MEDIACION ?? '' : p.para ?? '').trim().toLowerCase()
    if (!para) { r.omitidos.push({ clave: p.clave, motivo: 'sin-correo-de-mediacion' }); continue }
    if (!destinoPermitido(env, borrador, para)) { r.omitidos.push({ clave: p.clave, motivo: 'solo-buzon-de-prueba' }); continue }
    const plantilla = plantillaDe(p)
    if (!TEXTOS[plantilla]) { r.omitidos.push({ clave: p.clave, motivo: 'sin-plantilla' }); continue }
    const token = p.correo === 'COR-C-03' ? tokenNuevo() : null
    const ok = await enviarUno(s, llave, f, {
      clave: p.clave, correo: p.correo, contrato: p.contrato_id, rol: p.rol, para, token,
      c: armarC(plantilla, datosDe(p.datos), { origen, alquiler: p.contrato_id ?? undefined, abrir: token ? `${origen}/api/correo?abrir=${token}` : undefined }),
    })
    if (ok.id) r.enviados.push({ clave: p.clave, correo: p.correo, plantilla, para, id: ok.id }); else r.omitidos.push({ clave: p.clave, motivo: ok.motivo })
    if (op.pausaMs !== 0) await espera(op.pausaMs ?? 600)   // Resend: 2 pedidos por segundo
  }
  return r
}

async function enviarUno(s: ServicioSupabase, llave: string, f: typeof fetch, e: { clave: string; correo: string; contrato: string | null; rol: string; para: string; token: string | null; c: { asunto: string; html: string; texto: string } }): Promise<{ id?: string; motivo: string }> {
  const reservado = await rpc<boolean>(s, 'lk_correo_reservar', { p_clave: e.clave, p_correo: e.correo, p_contrato: e.contrato, p_rol: e.rol, p_para: e.para,
    p_token_hash: e.token ? await sha256(e.token) : null }, f)
  if (!reservado) return { motivo: 'ya-enviado' }
  let id: string | null = null
  try { id = await resend(llave, e.para, e.c, e.clave, f) } catch { id = null }
  await rpc(s, 'lk_correo_marcar', { p_clave: e.clave, p_enviado: !!id, p_resend_id: id }, f)
  return id ? { id, motivo: '' } : { motivo: 'resend-fallo' }
}

/** COR-C-08 y COR-C-09: correos de servicio por un pedido de eliminar la cuenta. No dependen de la casilla. Solo el servidor
 *  (proceso de borrado a pedido; ver docs/correos-c.md). Una sola vez por pedido: la clave lleva el correo y la hora del pedido. */
export async function enviarCorreoCuenta(env: Env, p: { correo: 'COR-C-08' | 'COR-C-09'; variante?: 'A' | 'B'; para: string; pedidoEn: number; eliminadoEn?: number; origen?: string }, f: typeof fetch = fetch) {
  const { borrador } = revisarTextos(env)
  const { s, llave, origen } = preparar(env, p.origen)
  const para = String(p.para ?? '').trim().toLowerCase()
  if (!destinoPermitido(env, borrador, para)) throw new ErrorCorreo(400, borrador ? 'En modo borrador solo se envía al buzón de prueba.' : 'Correo inválido.')
  if (!Number.isFinite(p.pedidoEn)) throw new ErrorCorreo(400, 'Fecha del pedido inválida.')
  const plantilla = p.correo === 'COR-C-08' ? `COR-C-08/${p.variante === 'B' ? 'B' : 'A'}` : 'COR-C-09'
  const clave = `${p.correo}:${para}:${p.pedidoEn}`
  const c = armarC(plantilla, { pedidoEn: p.pedidoEn, limite: sumarHabiles(p.pedidoEn, 5), eliminadoEn: p.eliminadoEn ?? Date.now() }, { origen })
  const r = await enviarUno(s, llave, f, { clave, correo: p.correo, contrato: null, rol: 'cuenta', para, token: null, c })
  if (!r.id && r.motivo !== 'ya-enviado') throw new ErrorCorreo(502, 'No pudimos enviar el correo ahora.')
  return { clave, plantilla, id: r.id ?? null, yaEnviado: r.motivo === 'ya-enviado' }
}

// LEGAL: revisar · página del enlace de COR-C-03 (texto nuevo, Legal 25/10 5:09 p. m., punto 4: la apertura se registra solo al tocar el botón)
export const PAGINA_ABRIR = {
  titulo: 'Aviso de reclamo · Lockumi (demo)',
  texto: 'Para ver el reclamo en la app, toca el botón. Al tocarlo, queda registrado que abriste el aviso.',
  boton: 'Ver el reclamo en la app',
}
const escHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** GET /api/correo?abrir=<enlace>: solo muestra esta página (no registra nada; los programas que revisan enlaces en los correos
 *  también hacen GET). El botón hace POST a la misma dirección y ahí se registra la apertura (6.5 b). */
export function paginaAbrir(token: string): string {
  const t = PAGINA_ABRIR
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${escHtml(t.titulo)}</title></head>
<body style="font-family:Arial,sans-serif;color:#3D2A22;background:#FFF5EE;max-width:560px;margin:0 auto;padding:24px 16px">
<h1 style="font-size:20px;margin:0 0 12px">${escHtml(t.titulo)}</h1>
<p style="line-height:1.5">${escHtml(t.texto)}</p>
<form method="post" action="/api/correo?abrir=${escHtml(token)}"><button type="submit" style="background:#FF6B35;color:#3D2A22;font-weight:bold;font-size:16px;padding:12px 18px;border-radius:8px;border:1px solid #E8531F;cursor:pointer">${escHtml(t.boton)}</button></form>
</body></html>`
}

/** Enlace de COR-C-03: registra la apertura y devuelve el alquiler (o null si el enlace no existe). Solo con el POST del botón. */
export async function abrirCorreo(env: Env, token: string, f: typeof fetch = fetch): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const s = servicio(env); if (!s) return null
  return await rpc<string | null>(s, 'lk_correo_abierto', { p_token_hash: await sha256(token) }, f)
}

/** POST /api/correo { tipo: 'avisos', alquiler } · la app avisa después de cada paso; el servidor envía lo que toque de ESE
 *  alquiler. Solo una persona del alquiler (la sesión de Supabase en Authorization). El navegador no elige textos ni destinatarios. */
export async function atenderAvisos(env: Env, p: { alquiler?: unknown }, bearer: string | null, origen: string, f: typeof fetch = fetch) {
  const alquiler = typeof p?.alquiler === 'string' ? p.alquiler : ''
  if (!UUID.test(alquiler)) throw new ErrorCorreo(400, 'Alquiler inválido.')
  if (!bearer) throw new ErrorCorreo(401, 'Falta la sesión.')
  const s = servicio(env); if (!s) throw new ErrorCorreo(503, 'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.')
  const u = await f(`${s.url}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? s.llave, authorization: bearer } })
  if (!u.ok) throw new ErrorCorreo(401, 'La sesión no es válida.')
  const uid = ((await u.json()) as { id?: string }).id ?? ''
  if (!UUID.test(uid)) throw new ErrorCorreo(401, 'La sesión no es válida.')
  const q = await f(`${s.url}/rest/v1/lk_participantes?select=rol&contrato_id=eq.${alquiler}&usuario=eq.${uid}`, { headers: { apikey: s.llave, authorization: `Bearer ${s.llave}` } })
  if (!q.ok || !((await q.json()) as unknown[]).length) throw new ErrorCorreo(403, 'No participas en este alquiler.')
  // El plazo de la mediación vence aunque los correos estén apagados (punto 3); después, solo con CORREOS_C=1, los correos.
  const vencidas = await vencerMediaciones(env, { contrato: alquiler }, f)
  if (env.CORREOS_C !== '1') return { apagado: true, enviados: 0, vencidas }
  const r = await procesarCorreos(env, { contrato: alquiler, origen: origenPermitido(origen) ? origen : undefined }, f)
  return { enviados: r.enviados.length }
}
