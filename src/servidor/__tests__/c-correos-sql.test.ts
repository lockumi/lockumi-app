// Escenario C · 20261025090000_c_correos.sql probada en Postgres (PGlite), con los privilegios por defecto del proyecto de
// producción (igual que service-role-lk-sql.test.ts). Correos COR-C-01 a COR-C-07 (pendientes por estado, con reloj de prueba),
// casilla guardada en el servidor, registro de envíos (una sola vez por evento) y apertura del aviso del reclamo (COR-C-03).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
  alter default privileges in schema public grant delete, truncate, references, trigger on tables to anon, authenticated, service_role;
  alter default privileges in schema public revoke all on sequences from public, anon, authenticated, service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create table public.waitlist (id serial primary key, email text); create table public.waitlist_intentos (id serial primary key, ip text);
  insert into public.waitlist(email) values ('a@correo.com'), ('b@correo.com'); insert into public.waitlist_intentos(ip) values ('1.2.3.4');`
const MIG = '20261025090000_c_correos.sql'
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002', OTRO = '00000000-0000-4000-8000-000000000003'
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
const CASILLA = 'Acepto que Lockumi me envíe avisos por correo'
const DIA = 86_400_000
let db: PGlite, fs: { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }, huellaAntes = '', funcionesAntes: string[] = []
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const filas = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows
const uno = async <T>(sql: string, p: unknown[] = []) => (await filas<T>(sql, p))[0]
const HUELLA = `select md5(string_agg(t, '|' order by t)) h from (
  select 'c' || (select count(*) from public.lk_contratos) || 'e' || (select count(*) from public.lk_eventos) || 'w' || (select string_agg(email, ',' order by id) from public.waitlist)
    || 'i' || (select string_agg(ip, ',' order by id) from public.waitlist_intentos) t) x`
type Pend = { clave: string; correo: string; rol: string; para: string | null; datos: Record<string, unknown> }
const pendientes = (id: string, ahora: Date | string = new Date()) => filas<Pend>(`select clave, correo, rol, para, datos from public.lk_correos_pendientes($1, $2::timestamptz) order by clave`, [id, typeof ahora === 'string' ? ahora : ahora.toISOString()])
const claves = async (id: string, ahora?: Date) => (await pendientes(id, ahora)).map(p => p.clave.replace(id, 'X'))

async function crear(seg = 604800) {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * DIA).toISOString().slice(0, 10)
  const r = await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 100, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3, null, $4) r`, [hoy, fin, DECL, seg])
  const id = r!.r.id
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
  return id
}
const casilla = async (id: string, uid: string, para: string, acepta = true) => { await como(uid); return (await uno<{ r: boolean }>('select public.lk_guardar_consentimiento_correo($1, $2, $3, $4) r', [id, para, acepta, CASILLA]))!.r }
async function entregada(seg = 604800, recibi = true) {
  const id = await crear(seg)
  await casilla(id, DUENO, 'Dueno@Correo.com'); await casilla(id, INQ, 'inquilina@correo.com')
  await db.query(`update public.lk_contratos set estado = 'ventana_reclamo' where id = $1`, [id])
  if (recibi) { await como(DUENO); await db.query('select public.lk_recibi_casa($1)', [id]) }
  return id
}
async function reclamo(id: string) {
  await db.query(`insert into public.lk_fotos(contrato_id, etapa, cuarto, por_rol, ruta, sha256, tomada_en, origen) values ($1, 'reclamo', 0, 'dueno', $2, repeat('b', 64), now(), 'camara')`, [id, id + '/reclamo/b.jpg'])
  await como(DUENO); await db.query(`select public.lk_reclamar($1, 30, 'Pared manchada en la sala')`, [id])
}

beforeAll(async () => {
  fs = await import(['node', 'fs'].join(':')) as typeof fs
  db = new PGlite(); await db.exec(PRELUDIO)
  const todas = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  for (const m of todas.filter(f => f !== MIG)) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await como(null); await crear()   // un alquiler de antes, para ver que la migración no lo toca
  huellaAntes = (await uno<{ h: string }>(HUELLA))!.h
  funcionesAntes = (await filas<{ f: string }>(`select p.oid::regprocedure::text f from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1`)).map(r => r.f)
  await db.exec(fs.readFileSync('supabase/migrations/' + MIG, 'utf8'))
  await db.exec(fs.readFileSync('supabase/migrations/' + MIG, 'utf8'))   // idempotente
}, 60_000)

describe('20261025090000 · solo agrega (tablas, funciones y permisos), sin cambiar datos', () => {
  it('no cambia ni borra datos (lk_*, waitlist y waitlist_intentos quedan iguales)', async () => {
    await como(null); expect((await uno<{ h: string }>(HUELLA))!.h).toBe(huellaAntes)
  })
  it('no reemplaza ninguna función existente: todas sus funciones son nuevas', () => {
    const sql = fs.readFileSync('supabase/migrations/' + MIG, 'utf8')
    const nuevas = [...sql.matchAll(/create or replace function public\.(\w+)/g)].map(m => m[1])
    expect(nuevas.length).toBe(9)
    for (const n of nuevas) expect(funcionesAntes.some(f => f.startsWith(`${n}(`))).toBe(false)
    expect(sql).not.toMatch(/\b(drop table|drop function|truncate|alter table public\.(lk_contratos|lk_reclamos|lk_eventos|lk_participantes))\b/i)
    expect(sql.replace(/\$\$[\s\S]*?\$\$/g, '')).not.toMatch(/^\s*(delete|update|insert)\b/im)   // ningún cambio de datos fuera de las funciones
  })
  it('service_role puede usar las tablas y las funciones del servidor; anon y authenticated no', async () => {
    for (const t of ['lk_correos_consentimiento', 'lk_correos_enviados', 'lk_mediacion_plazos']) for (const p of ['select', 'insert', 'update', 'delete'])
      expect((await uno<{ ok: boolean }>(`select has_table_privilege('service_role', 'public.${t}', '${p}') ok`))!.ok).toBe(true)
    expect((await uno<{ ok: boolean }>(`select has_table_privilege('authenticated', 'public.lk_correos_enviados', 'select') ok`))!.ok).toBe(false)
    expect((await uno<{ ok: boolean }>(`select has_table_privilege('anon', 'public.lk_correos_consentimiento', 'select') ok`))!.ok).toBe(false)
    for (const f of ['lk_mediacion_vencimientos(uuid, timestamptz)', 'lk_correos_por_estado(uuid, timestamptz)', 'lk_correos_pendientes(uuid, timestamptz)', 'lk_correo_reservar(text, text, uuid, text, text, text)', 'lk_correo_marcar(text, boolean, text)', 'lk_correo_abierto(text)', 'lk_correo_cuenta_registrado(text)']) {
      expect((await uno<{ ok: boolean }>(`select has_function_privilege('service_role', 'public.${f}', 'execute') ok`))!.ok).toBe(true)
      expect((await uno<{ ok: boolean }>(`select has_function_privilege('authenticated', 'public.${f}', 'execute') ok`))!.ok).toBe(false)
      expect((await uno<{ ok: boolean }>(`select has_function_privilege('anon', 'public.${f}', 'execute') ok`))!.ok).toBe(false)
    }
    expect((await uno<{ ok: boolean }>(`select has_function_privilege('authenticated', 'public.lk_guardar_consentimiento_correo(uuid, text, boolean, text)', 'execute') ok`))!.ok).toBe(true)
    expect((await uno<{ ok: boolean }>(`select has_function_privilege('anon', 'public.lk_guardar_consentimiento_correo(uuid, text, boolean, text)', 'execute') ok`))!.ok).toBe(false)
  })
})

describe('«Recibir los avisos por correo» guardado en el servidor', () => {
  it('cada parte guarda SU casilla (el papel sale de la sesión); desmarcar la borra; otra persona no puede', async () => {
    const id = await crear()
    expect(await casilla(id, DUENO, ' Dueno@Correo.com ')).toBe(true)
    expect(await uno(`select rol, para, texto from public.lk_correos_consentimiento where contrato_id = $1`, [id])).toEqual({ rol: 'dueno', para: 'dueno@correo.com', texto: CASILLA })
    await expect(casilla(id, OTRO, 'x@correo.com')).rejects.toThrow(/No participas/)
    await expect(casilla(id, INQ, 'sin-arroba')).rejects.toThrow(/nombre@correo.com/)
    expect(await casilla(id, DUENO, 'dueno@correo.com', false)).toBe(false)
    expect((await filas(`select 1 from public.lk_correos_consentimiento where contrato_id = $1`, [id])).length).toBe(0)
  })
  it('sin casilla no hay avisos para esa parte (solo la versión de la persona mediadora, que no depende de la casilla)', async () => {
    const id = await crear(); await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', ventana_inicio = now() where id = $1`, [id])
    expect(await pendientes(id, new Date(Date.now() + 6.5 * DIA))).toEqual([])
  })
})

describe('Pendientes por evento (COR-C-01 a COR-C-07) con reloj de prueba', () => {
  it('COR-C-01 al empezar el plazo (los dos; la del dueño es su día 1); COR-C-02 los días 4 y 6 solo al dueño, y solo el último que toca', async () => {
    const id = await entregada()
    expect(await claves(id)).toEqual(['COR-C-01:X:dueno', 'COR-C-01:X:inquilino'])
    expect((await pendientes(id))[0].datos.auto).toBe(false)
    const t0 = Date.now()
    expect((await claves(id, new Date(t0 + 1.01 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual([])
    // el día 4 empieza 3 días después del inicio (día 1 = las primeras 24 h)
    expect((await claves(id, new Date(t0 + 2.99 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual([])
    expect((await claves(id, new Date(t0 + 3.01 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual(['COR-C-02:X:dueno:d4'])
    expect((await claves(id, new Date(t0 + 4.99 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual(['COR-C-02:X:dueno:d4'])
    expect((await claves(id, new Date(t0 + 5.01 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual(['COR-C-02:X:dueno:d6'])
    const d6 = await pendientes(id, new Date(t0 + 6.01 * DIA))
    expect(d6.filter(p => p.correo === 'COR-C-02').map(p => [p.rol, p.para, p.datos.dia])).toEqual([['dueno', 'dueno@correo.com', 6]])
    expect((await claves(id, new Date(t0 + 8 * DIA))).filter(c => c.startsWith('COR-C-02'))).toEqual([])   // plazo vencido
  })
  it('sin «Recibí la casa», el plazo empieza 2 días después de la entrega (y ahí sale COR-C-01)', async () => {
    const id = await entregada(604800, false)
    expect(await claves(id)).toEqual([])
    const p = await pendientes(id, new Date(Date.now() + 2.01 * DIA))
    expect(p.map(x => [x.clave.replace(id, 'X'), x.datos.auto])).toEqual([['COR-C-01:X:dueno', true], ['COR-C-01:X:inquilino', true]])
  })
  it('después de «Todo bien, devolver» no hay recordatorios', async () => {
    const id = await entregada()
    await db.query(`insert into public.lk_eventos(contrato_id, texto) values ($1, 'El dueño aprobó en la cadena devolver el depósito completo')`, [id])
    expect(await claves(id, new Date(Date.now() + 4.01 * DIA))).toEqual([])
  })
  it('COR-C-03 al reclamar (solo al inquilino) y COR-C-04 los días 4 y 6 de su plazo si no respondió; con reclamo no hay COR-C-02', async () => {
    const id = await entregada(); await reclamo(id)
    const p = await pendientes(id)
    expect(p.map(x => [x.correo, x.rol, x.datos.reclamado])).toEqual([['COR-C-03', 'inquilino', 30]])
    expect(await claves(id, new Date(Date.now() + 2.99 * DIA))).toEqual(['COR-C-03:X:inquilino'])
    expect(await claves(id, new Date(Date.now() + 3.01 * DIA))).toEqual(['COR-C-03:X:inquilino', 'COR-C-04:X:inquilino:d4'])
    await como(INQ); await db.query('select public.lk_abrir_aviso_reclamo($1)', [id])
    const d6 = (await pendientes(id, new Date(Date.now() + 6.01 * DIA))).filter(x => x.correo === 'COR-C-04')
    expect(d6.map(x => [x.clave.replace(id, 'X'), x.datos.dia, x.datos.abierto])).toEqual([['COR-C-04:X:inquilino:d6', 6, true]])
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    expect((await claves(id, new Date(Date.now() + 6.01 * DIA))).some(c => /COR-C-0[34]/.test(c))).toBe(false)
  })
  it('COR-C-05 al pasar a la mediación: los dos y la persona mediadora (sin correo: lo pone el servidor)', async () => {
    const id = await entregada(); await reclamo(id)
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    const p = await pendientes(id)
    expect(p.every(x => typeof x.datos.desde === 'string')).toBe(true)
    expect(p.map(x => [x.clave.replace(id, 'X'), x.para, x.datos.motivo])).toEqual([
      ['COR-C-05:X:dueno', 'dueno@correo.com', 'rechazo'], ['COR-C-05:X:inquilino', 'inquilina@correo.com', 'rechazo'], ['COR-C-05:X:mediacion', null, 'rechazo']])
  })
  it('COR-C-06 con el resultado de la mediación (solo las partes; sin COR-C-07, que es para los cierres sin mediación)', async () => {
    const id = await entregada(); await reclamo(id)
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    await db.query(`update public.lk_contratos set estado = 'cerrado', resultado = '{"via":"mediacion","dueno":10,"inquilino":90}' where id = $1`, [id])
    expect(await claves(id)).toEqual(['COR-C-06:X:dueno', 'COR-C-06:X:inquilino'])
    await db.query(`update public.lk_contratos set liquidacion_tx = repeat('a', 64) where id = $1`, [id])
    expect(await claves(id)).toEqual(['COR-C-06:X:dueno', 'COR-C-06:X:inquilino'])
  })
  it('COR-C-07 (a devuelto, b automático, c acuerdo) solo cuando el pago quedó en la red de prueba', async () => {
    const id = await entregada(); await reclamo(id)
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, true)', [id])
    expect((await claves(id)).some(c => c.startsWith('COR-C-07'))).toBe(false)
    await db.query(`update public.lk_contratos set liquidacion_tx = 'en-curso' where id = $1`, [id])
    expect((await claves(id)).some(c => c.startsWith('COR-C-07'))).toBe(false)   // el bloqueo de «repartir» no es un pago
    await db.query(`update public.lk_contratos set liquidacion_tx = repeat('a', 64) where id = $1`, [id])
    const p = await pendientes(id)
    expect(p.map(x => [x.rol, x.datos.via, x.datos.dueno, x.datos.inquilino])).toEqual([['dueno', 'acuerdo', 30, 70], ['inquilino', 'acuerdo', 30, 70]])
  })
})

describe('Registro de envíos: una sola vez por evento', () => {
  const reservar = (clave: string, id: string | null, token: string | null = null) => uno<{ r: boolean }>(`select public.lk_correo_reservar($1, 'COR-C-01', $2, 'dueno', 'dueno@correo.com', $3) r`, [clave, id, token]).then(x => x!.r)
  it('reservar solo funciona la primera vez; enviado, ya no está pendiente; fallido, se puede reintentar', async () => {
    const id = await entregada(); const k = `COR-C-01:${id}:dueno`
    expect(await reservar(k, id)).toBe(true); expect(await reservar(k, id)).toBe(false)
    expect(await claves(id)).toEqual(['COR-C-01:X:inquilino'])
    await db.query(`select public.lk_correo_marcar($1, false)`, [k])
    expect(await claves(id)).toEqual(['COR-C-01:X:dueno', 'COR-C-01:X:inquilino'])
    expect(await reservar(k, id)).toBe(true)
    await db.query(`select public.lk_correo_marcar($1, true, 'resend-1')`, [k])
    expect(await uno(`select estado, resend_id from public.lk_correos_enviados where clave = $1`, [k])).toEqual({ estado: 'enviado', resend_id: 'resend-1' })
    expect(await reservar(k, id)).toBe(false); expect(await claves(id)).toEqual(['COR-C-01:X:inquilino'])
  })
  it('COR-C-03: abrir el enlace del correo registra la primera apertura en el envío y en el reclamo (un solo evento)', async () => {
    const id = await entregada(); await reclamo(id)
    const token = 'c'.repeat(64)
    await uno(`select public.lk_correo_reservar($1, 'COR-C-03', $2, 'inquilino', 'inquilina@correo.com', $3)`, [`COR-C-03:${id}:inquilino`, id, token])
    expect((await uno<{ r: string }>(`select public.lk_correo_abierto($1) r`, [token]))!.r).toBe(id)
    expect((await uno<{ r: string }>(`select public.lk_correo_abierto($1) r`, [token]))!.r).toBe(id)
    expect((await uno<{ a: string | null }>(`select abierto_en a from public.lk_reclamos where contrato_id = $1`, [id]))!.a).not.toBeNull()
    expect((await uno<{ a: string | null }>(`select abierto_en a from public.lk_correos_enviados where token_hash = $1`, [token]))!.a).not.toBeNull()
    expect((await filas(`select 1 from public.lk_eventos where contrato_id = $1 and texto = 'El inquilino abrió el aviso del reclamo'`, [id])).length).toBe(1)
    expect((await uno<{ r: string | null }>(`select public.lk_correo_abierto($1) r`, ['d'.repeat(64)]))!.r).toBeNull()
  })
  it('los correos de servicio (sin alquiler) también quedan registrados', async () => {
    expect((await uno<{ r: boolean }>(`select public.lk_correo_reservar('COR-C-08:x@correo.com:1', 'COR-C-08', null, 'cuenta', 'x@correo.com') r`))!.r).toBe(true)
    await db.query(`select public.lk_correo_marcar('COR-C-08:x@correo.com:1', true, 'r8')`)
    expect((await uno<{ r: boolean }>(`select public.lk_correo_cuenta_registrado('COR-C-08:x@correo.com:1') r`))!.r).toBe(true)
  })
})

describe('P-06 · plazo de 3 días hábiles de la Mediación Lockumi (demo)', () => {
  it('lk_sumar_habiles salta sábados, domingos y feriados de ley (igual que sumarHabiles)', async () => {
    const { sumarHabiles } = await import('../../../api/_lib/plazos')
    for (const t of ['2026-10-23T16:00:00Z', '2026-12-23T16:00:00Z', '2027-03-24T16:00:00Z', '2026-09-14T03:00:00Z']) {
      const r = (await uno<{ r: Date }>(`select public.lk_sumar_habiles($1::timestamptz, 3) r`, [t]))!.r
      expect(new Date(r).getTime()).toBe(sumarHabiles(Date.parse(t), 3))
    }
  })
  it('al entrar en mediación se fija el plazo; 1 día antes sale el recordatorio; al vencer: evento, correo «sin acuerdo», sin pago y la mediación sigue', async () => {
    const id = await entregada(); await reclamo(id)
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    await como(null)
    expect((await uno<{ n: number }>(`select public.lk_mediacion_vencimientos($1) n`, [id]))!.n).toBe(0)
    const m = (await uno<{ desde: Date; vence: Date }>(`select desde, vence from public.lk_mediacion_plazos where contrato_id = $1`, [id]))!
    const { sumarHabiles } = await import('../../../api/_lib/plazos')
    expect(new Date(m.vence).getTime()).toBe(sumarHabiles(new Date(m.desde).getTime(), 3))
    const antes = new Date(new Date(m.vence).getTime() - 3_600_000)
    expect((await claves(id, antes)).filter(c => c.endsWith(':recordatorio'))).toEqual(['COR-C-05:X:dueno:recordatorio', 'COR-C-05:X:inquilino:recordatorio', 'COR-C-05:X:mediacion:recordatorio'])
    const despues = new Date(new Date(m.vence).getTime() + 60_000)
    expect((await uno<{ n: number }>(`select public.lk_mediacion_vencimientos($1, $2::timestamptz) n`, [id, despues.toISOString()]))!.n).toBe(1)
    expect((await uno<{ n: number }>(`select public.lk_mediacion_vencimientos($1, $2::timestamptz) n`, [id, despues.toISOString()]))!.n).toBe(0)
    expect((await uno<{ estado: string; liquidacion_tx: string | null }>(`select estado, liquidacion_tx from public.lk_contratos where id = $1`, [id]))).toEqual({ estado: 'mediacion', liquidacion_tx: null })
    expect((await filas(`select 1 from public.lk_eventos where contrato_id = $1 and texto like 'Venció el plazo de 3 días hábiles%'`, [id])).length).toBe(1)
    expect((await claves(id, despues)).filter(c => c.endsWith(':vencida'))).toEqual(['COR-C-06:X:dueno:vencida', 'COR-C-06:X:inquilino:vencida', 'COR-C-06:X:mediacion:vencida'])
  })
})
