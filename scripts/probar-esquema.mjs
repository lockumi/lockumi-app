// Prueba local del esquema de Supabase (supabase/migrations/*.sql) con PGlite (Postgres en WASM).
// Simula lo mínimo de Supabase: roles anon/authenticated, auth.uid() desde request.jwt.claim.sub, storage.buckets/objects.
// Uso: node scripts/probar-esquema.mjs
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite()
const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security; grant select, insert on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to authenticated;
create publication supabase_realtime;`
await db.exec(STUB)
const dir = new URL('../supabase/migrations/', import.meta.url)
for (const f of readdirSync(dir).sort()) { const sql = readFileSync(new URL(f, dir), 'utf8'); await db.exec(sql); await db.exec(sql) /* idempotente */ }

const DUENO = '11111111-1111-4111-8111-111111111111', INQ = '22222222-2222-4222-8222-222222222222', OTRO = '33333333-3333-4333-8333-333333333333', MED = '44444444-4444-4444-8444-444444444444'
await db.exec(`insert into public.lk_mediadores values ('${MED}', 'Mediación Lockumi')`)
let ok = 0, fallas = 0
const como = async (uid, sql, params = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
  try { return (await db.query(sql, params)).rows } finally { await db.exec('reset role') }
}
const espera = async (n, f) => { try { await f(); ok++; console.log('OK   ', n) } catch (e) { fallas++; console.log('FALLA', n, '→', e.message) } }
const falla = async (n, f, patron) => espera(n, async () => {
  try { await f() } catch (e) { if (patron && !patron.test(e.message)) throw new Error('mensaje inesperado: ' + e.message); return }
  throw new Error('debía fallar y no falló')
})
const hoy = new Date().toISOString().slice(0, 10)
const mas = (d, m) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10) }
const G1 = 'G' + 'A'.repeat(55), G2 = 'G' + 'B'.repeat(55)

await falla('anon no puede crear', () => como(null, `select public.lk_crear_contrato('Casa de prueba', 100, $1::date, $2::date, '{}', 'inq@x.cr', 'dueno@x.cr')`, [hoy, mas(hoy, 6)]))
await falla('entrada en el pasado rechazada', () => como(DUENO, `select public.lk_crear_contrato('Casa de prueba', 100, $1::date, $2::date, '{}', 'inq@x.cr', 'dueno@x.cr')`, ['2020-01-01', '2020-08-01']), /anterior a hoy/)
await falla('duración < 1 mes rechazada', () => como(DUENO, `select public.lk_crear_contrato('Casa de prueba', 100, $1::date, $2::date, '{}', 'inq@x.cr', 'dueno@x.cr')`, [hoy, new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10)]))
await falla('monto 0 rechazado', () => como(DUENO, `select public.lk_crear_contrato('Casa de prueba', 0, $1::date, $2::date, '{}', 'inq@x.cr', 'dueno@x.cr')`, [hoy, mas(hoy, 6)]))
let id, token
await espera('dueño crea contrato y recibe token', async () => {
  const [r] = await como(DUENO, `select public.lk_crear_contrato('Casa de prueba', 100, $1::date, $2::date, array['Sin mascotas'], 'inq@x.cr', 'dueno@x.cr', '${G1}', 60) as r`, [hoy, mas(hoy, 6)])
  ;({ id, token } = r.r); if (!/^[0-9a-f]{64}$/.test(token)) throw new Error('token raro')
})
await espera('el hash del token no es visible', async () => { await falla('x', () => como(DUENO, `select invitacion_hash from public.lk_contratos`)); fallas = fallas })
await espera('otra persona no ve el contrato', async () => { const r = await como(OTRO, `select id from public.lk_contratos`); if (r.length) throw new Error('lo ve') })
await falla('nadie inserta directo en tablas', () => como(DUENO, `insert into public.lk_firmas values ($1, 'contrato', 'inquilino', $2)`, [id, DUENO]))
await falla('dueño no puede firmar antes de que acepte el inquilino', () => como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id]), /todavía no aceptó/)
await falla('token incorrecto', () => como(INQ, `select public.lk_aceptar_invitacion($1, 'xxx', 'inq@x.cr')`, [id]), /no es válido/)
await falla('otro correo no puede aceptar', () => como(OTRO, `select public.lk_aceptar_invitacion($1, $2, 'otro@x.cr')`, [id, token]), /Esta invitación es para/)
await falla('el dueño no puede aceptar su propia invitación', () => como(DUENO, `select public.lk_aceptar_invitacion($1, $2, 'inq@x.cr')`, [id, token]), /Eres el dueño/)
await espera('link nuevo invalida el anterior (solo el dueño)', async () => {
  await falla('x', () => como(INQ, `select public.lk_nueva_invitacion($1)`, [id]), /No participas/)
  const [r] = await como(DUENO, `select public.lk_nueva_invitacion($1) t`, [id])
  await falla('x', () => como(INQ, `select public.lk_ver_invitacion($1, $2)`, [id, token]), /no es válido/); token = r.t
})
await espera('el inquilino ve la invitación y la acepta', async () => {
  await como(INQ, `select public.lk_ver_invitacion($1, $2)`, [id, token]); await como(INQ, `select public.lk_aceptar_invitacion($1, $2, 'INQ@x.cr', '${G2}')`, [id, token])
})
await falla('el link es de un solo uso', () => como(OTRO, `select public.lk_aceptar_invitacion($1, $2, 'inq@x.cr')`, [id, token]), /no es válido/)
await espera('los dos ven el contrato y los participantes', async () => {
  for (const u of [DUENO, INQ]) { const r = await como(u, `select count(*)::int n from public.lk_participantes where contrato_id = $1`, [id]); if (r[0].n !== 2) throw new Error('ve ' + r[0].n) }
})
await falla('el inquilino no puede reclamar ni registrar el escrow', () => como(INQ, `select public.lk_registrar_escrow($1, $2, 'tx')`, [id, 'C' + 'A'.repeat(55)]), /le corresponde al dueño/)
await espera('firma del dueño: estado sigue en firmas', async () => { const [r] = await como(DUENO, `select public.lk_firmar($1, 'contrato') e`, [id]); if (r.e !== 'firmas') throw new Error(r.e) })
await falla('el dueño no firma dos veces', () => como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id]), /Ya firmaste/)
await espera('firma del inquilino: pasa a pendiente_pago', async () => { const [r] = await como(INQ, `select public.lk_firmar($1, 'contrato') e`, [id]); if (r.e !== 'pendiente_pago') throw new Error(r.e) })
await falla('el dueño no puede marcar el pago', () => como(DUENO, `select public.lk_registrar_pago($1, 'tx')`, [id]), /le corresponde al inquilino/)
await falla('pago con tx sin escrow creado', () => como(INQ, `select public.lk_registrar_pago($1, 'tx')`, [id]), /Falta crear/)
await espera('dueño registra escrow, inquilino paga', async () => {
  await como(DUENO, `select public.lk_registrar_escrow($1, $2, 'txdeploy')`, [id, 'C' + 'A'.repeat(55)]); await como(INQ, `select public.lk_registrar_pago($1, 'txfund')`, [id])
})
await falla('no se confirma la entrada sin fotos', () => como(INQ, `select public.lk_firmar($1, 'entrada')`, [id]), /cada espacio necesita/)
await falla('foto con ruta de otro contrato rechazada', () => como(INQ, `select public.lk_registrar_foto($1, 'entrada', 0, 'otro/entrada/a.jpg', $2, now(), null, 'camara', false)`, [id, 'a'.repeat(64)]), /Ruta/)
await espera('storage: participante sube a su carpeta; otro no', async () => {
  await como(INQ, `insert into storage.objects(bucket_id, name) values ('lk-fotos', $1)`, [`${id}/entrada/x.jpg`])
  await falla('x', () => como(OTRO, `insert into storage.objects(bucket_id, name) values ('lk-fotos', $1)`, [`${id}/entrada/y.jpg`]))
  const r = await como(OTRO, `select name from storage.objects`); if (r.length) throw new Error('otro ve fotos')
  const r2 = await como(DUENO, `select name from storage.objects`); if (r2.length !== 1) throw new Error('dueño no ve la foto')
})
await espera('fotos y checklist de los 4 espacios', async () => {
  for (let c = 0; c < 4; c++) {
    await como(c % 2 ? DUENO : INQ, `select public.lk_registrar_foto($1, 'entrada', $2, $3, $4, now(), null, 'camara', false)`, [id, c, `${id}/entrada/${c}.jpg`, String(c).repeat(64)])
    for (let i = 0; i < 3; i++) await como(INQ, `select public.lk_editar_item($1, 'entrada', $2, $3, 'bien')`, [id, c, i])
  }
})
await espera('confirmación de entrada de los dos → en_curso', async () => {
  await como(DUENO, `select public.lk_firmar($1, 'entrada')`, [id]); const [r] = await como(INQ, `select public.lk_firmar($1, 'entrada') e`, [id]); if (r.e !== 'en_curso') throw new Error(r.e)
})
await espera('editar después de confirmar borra confirmaciones (solo mientras el paso está abierto)', async () => {
  await falla('x', () => como(INQ, `select public.lk_editar_item($1, 'entrada', 0, 0, 'detalle')`, [id]), /ya no está abierto/)
})
await espera('salida y ventana', async () => {
  await como(INQ, `select public.lk_iniciar_salida($1)`, [id])
  for (let c = 0; c < 4; c++) { await como(DUENO, `select public.lk_registrar_foto($1, 'salida', $2, $3, $4, now(), null, 'archivo', true)`, [id, c, `${id}/salida/${c}.jpg`, 'f'.repeat(63) + c]); for (let i = 0; i < 3; i++) await como(DUENO, `select public.lk_editar_item($1, 'salida', $2, $3, 'bien')`, [id, c, i]) }
  await como(DUENO, `select public.lk_firmar($1, 'salida')`, [id]); const [r] = await como(INQ, `select public.lk_firmar($1, 'salida') e`, [id]); if (r.e !== 'ventana_reclamo') throw new Error(r.e)
})
await falla('reclamo sin foto rechazado', () => como(DUENO, `select public.lk_reclamar($1, 30, 'Mancha en la pared de la sala')`, [id]), /foto del daño/)
await falla('el inquilino no puede reclamar', () => como(INQ, `select public.lk_reclamar($1, 30, 'Mancha en la pared de la sala')`, [id]), /dueño/)
await falla('reclamo mayor que el depósito', async () => { await como(DUENO, `select public.lk_registrar_foto($1, 'reclamo', null, $2, $3, now(), null, 'camara', false)`, [id, `${id}/reclamo/1.jpg`, 'e'.repeat(64)]); await como(DUENO, `select public.lk_reclamar($1, 500, 'Mancha en la pared de la sala')`, [id]) }, /no más que el depósito/)
// LEGAL: revisado (24/10) · textos de 20261024120000_lk_mediacion_acuerdo.sql (la persona mediadora registra el acuerdo, no decide)
await espera('reclamo, rechazo y acuerdo registrado por la persona mediadora', async () => {
  await como(DUENO, `select public.lk_reclamar($1, 30, 'Mancha en la pared de la sala')`, [id]); await como(INQ, `select public.lk_responder_reclamo($1, false)`, [id])
  await falla('x', () => como(DUENO, `select public.lk_decidir_mediacion($1, 30)`, [id]), /Solo la persona mediadora puede registrar el acuerdo\./)
  const v = await como(MED, `select estado from public.lk_contratos where id = $1`, [id]); if (v[0]?.estado !== 'mediacion') throw new Error('el mediador no ve el caso')
  await como(MED, `select public.lk_decidir_mediacion($1, 20, 'Daño parcial')`, [id])
  const [c] = await como(INQ, `select estado, resultado from public.lk_contratos where id = $1`, [id]); if (c.estado !== 'cerrado' || Number(c.resultado.dueno) !== 20 || Number(c.resultado.inquilino) !== 80) throw new Error(JSON.stringify(c))
  const ev = await como(INQ, `select texto from public.lk_eventos where contrato_id = $1 order by id`, [id]); if (!ev.some(x => /^Acuerdo registrado: 20 USDC al dueño y 80(\.00)? al inquilino · Daño parcial$/.test(x.texto)) || ev.some(x => /decidi/.test(x.texto))) throw new Error(JSON.stringify(ev.map(x => x.texto)))
  await como(MED, `select public.lk_registrar_liquidacion($1, 'txresolve')`, [id])
})
await espera('historial con hashes de transacción', async () => {
  const r = await como(INQ, `select texto, tx_hash from public.lk_eventos where contrato_id = $1 order by id`, [id]); if (r.filter(x => x.tx_hash).length !== 3) throw new Error(JSON.stringify(r))
})
await espera('tablas en la publicación de tiempo real', async () => {
  const { rows: [r] } = await db.query(`select count(*)::int n from pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'lk\\_%'`); if (r.n !== 7) throw new Error(r.n)
})
// Caminos 1 y 2 con un contrato nuevo cada uno, hasta la ventana de reclamos.
async function hastaVentana(nombre) {
  const [r] = await como(DUENO, `select public.lk_crear_contrato($1, 100, $2::date, $3::date, '{}', 'inq@x.cr', 'dueno@x.cr', '${G1}', 60) as r`, [nombre, hoy, mas(hoy, 6)])
  const { id: c, token: t } = r.r
  await como(INQ, `select public.lk_aceptar_invitacion($1, $2, 'inq@x.cr', '${G2}')`, [c, t])
  for (const u of [DUENO, INQ]) await como(u, `select public.lk_firmar($1, 'contrato')`, [c])
  await como(DUENO, `select public.lk_registrar_escrow($1, $2, 'tx')`, [c, 'C' + 'B'.repeat(55)]); await como(INQ, `select public.lk_registrar_pago($1, 'tx')`, [c])
  for (const etapa of ['entrada', 'salida']) {
    if (etapa === 'salida') await como(DUENO, `select public.lk_iniciar_salida($1)`, [c])
    for (let k = 0; k < 4; k++) { await como(INQ, `select public.lk_registrar_foto($1, $2, $3, $4, $5, now(), null, 'camara', false)`, [c, etapa, k, `${c}/${etapa}/${k}.jpg`, 'a'.repeat(63) + k]); for (let i = 0; i < 3; i++) await como(INQ, `select public.lk_editar_item($1, $2, $3, $4, 'bien')`, [c, etapa, k, i]) }
    for (const u of [DUENO, INQ]) await como(u, `select public.lk_firmar($1, $2)`, [c, etapa])
  }
  return c
}
await espera('camino 1 · sin reclamo: no cierra antes del plazo, cierra después con 100 % al inquilino', async () => {
  const c = await hastaVentana('Casa sin reclamo')
  const [a] = await como(INQ, `select public.lk_cerrar_sin_reclamo($1) x`, [c]); if (a.x !== false) throw new Error('cerró antes')
  await db.exec(`update public.lk_contratos set ventana_inicio = now() - interval '2 minutes' where id = '${c}'`) // simula que pasó el plazo
  await falla('x', () => como(DUENO, `select public.lk_reclamar($1, 10, 'Mancha en la pared de la sala')`, [c]), /plazo para reclamar ya terminó/)
  const [b] = await como(INQ, `select public.lk_cerrar_sin_reclamo($1) x`, [c]); if (b.x !== true) throw new Error('no cerró')
  const [z] = await como(DUENO, `select resultado from public.lk_contratos where id = $1`, [c]); if (z.resultado.via !== 'automatico' || Number(z.resultado.inquilino) !== 100) throw new Error(JSON.stringify(z))
})
await espera('camino 2 · reclamo aceptado: reparto acordado', async () => {
  const c = await hastaVentana('Casa con reclamo')
  await como(DUENO, `select public.lk_registrar_foto($1, 'reclamo', null, $2, $3, now(), null, 'camara', false)`, [c, `${c}/reclamo/1.jpg`, 'b'.repeat(64)])
  await como(DUENO, `select public.lk_reclamar($1, 35.5, 'Puerta del clóset rota')`, [c])
  await falla('x', () => como(DUENO, `select public.lk_responder_reclamo($1, true)`, [c]), /inquilino/)
  await como(INQ, `select public.lk_responder_reclamo($1, true)`, [c])
  const [z] = await como(INQ, `select estado, resultado from public.lk_contratos where id = $1`, [c]); if (z.estado !== 'cerrado' || Number(z.resultado.dueno) !== 35.5 || Number(z.resultado.inquilino) !== 64.5) throw new Error(JSON.stringify(z))
  await falla('x', () => como(MED, `select estado from public.lk_contratos where id = $1`, [c]).then(r => { if (!r.length) throw new Error('no ve') }))
})
console.log(`\n${ok} OK · ${fallas} FALLA`)
process.exit(fallas ? 1 : 0)
