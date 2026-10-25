// B2 · 20261025040000_silencio_regla_651.sql (escenario C, sin aplicar) probada en Postgres (PGlite).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002', MED = '00000000-0000-4000-8000-000000000009'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const ultimoEvento = async (id: string) => (await uno<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id desc limit 1', [id]))!.t
const estado = async (id: string) => (await uno<{ estado: string; resultado: { via: string; cierre: string; dueno: number; inquilino: number } | null }>('select estado, resultado from public.lk_contratos where id = $1', [id]))!

async function crear() {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const r = await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 100, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL])
  const id = r!.r.id
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
  return id
}

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.query(`insert into public.lk_mediadores values ($1, 'Mediación Lockumi')`, [MED])
}, 60_000)


// B2 (Legal, 25/10, 1:24 a. m.) · alquileres de dos personas en el servidor:
// - 5.3 d / 6.5 a: si el dueño no aprueba ni reclama en su plazo, el 100 % vuelve al inquilino (lk_cerrar_sin_reclamo y lk_vencimientos).
// - 6.5 c / 6.5.1: si el inquilino no responde en su plazo, ANTES de la mediación se aplica la Regla 6.5.1 solo si la aceptó aparte al
//   firmar, abrió al menos un aviso del reclamo, las pruebas están completas y el monto no supera el 30 % del depósito (mismas
//   condiciones que reglaAplica en src/prueba/propuesta.ts, usada por src/prueba/reclamos.ts:49). Si falta algo, pasa a la mediación.
const SEG = 60
async function enReclamo(o: { regla?: boolean; abre?: boolean; monto?: number; fotosEntrada?: boolean; firmasEntrada?: boolean; vencido?: boolean } = {}) {
  const { regla = true, abre = true, monto = 30, fotosEntrada = true, firmasEntrada = true, vencido = true } = o
  const id = await crear()
  if (regla) { await db.query(`update public.lk_contratos set estado = 'firmas' where id = $1`, [id]); await como(INQ); await db.query(`select public.lk_aceptar_regla_651($1, '1.9-demo')`, [id]) }
  await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', ventana_inicio = now(), ventana_segundos = $2 where id = $1`, [id, SEG])
  if (fotosEntrada) await db.query(`insert into public.lk_fotos(contrato_id, etapa, cuarto, por_rol, ruta, sha256, tomada_en, origen) values ($1, 'entrada', 0, 'dueno', $2, repeat('a', 64), now(), 'camara')`, [id, id + '/entrada/a.jpg'])
  if (firmasEntrada) await db.query(`insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values ($1, 'entrada', 'dueno', $2), ($1, 'entrada', 'inquilino', $3)`, [id, DUENO, INQ])
  await db.query(`insert into public.lk_fotos(contrato_id, etapa, cuarto, por_rol, ruta, sha256, tomada_en, origen) values ($1, 'reclamo', 0, 'dueno', $2, repeat('b', 64), now(), 'camara')`, [id, id + '/reclamo/b.jpg'])
  await como(DUENO); await db.query(`select public.lk_reclamar($1, $2, 'Pared manchada en la sala')`, [id, monto])
  if (abre) { await como(INQ); await db.query('select public.lk_abrir_aviso_reclamo($1)', [id]) }
  if (vencido) await db.query(`update public.lk_reclamos set entregado_en = now() - interval '2 minutes', abierto_en = case when abierto_en is not null then now() - interval '100 seconds' end where contrato_id = $1`, [id])
  return id
}
const silencio = async (id: string, uid = DUENO) => { await como(uid); return (await uno<{ r: string | null }>('select public.lk_aplicar_silencio($1) r', [id]))!.r }

describe('B2 · Regla 6.5.1 antes de la mediación (servidor, dos personas)', () => {
  it('con todas las condiciones, al vencer el plazo del inquilino se aplica la regla: el dueño recibe lo reclamado y el resto vuelve', async () => {
    const id = await enReclamo()
    expect(await silencio(id)).toBe('regla_651')
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'regla_651', dueno: 30, inquilino: 70 } })
    expect(await ultimoEvento(id)).toMatch(/^Se aplicó la Regla de propuesta automática \(6\.5\.1\): 30(\.00)? USDC al dueño y 70(\.00)? al inquilino/)
  })
  it('antes de que venza el plazo no hace nada', async () => {
    const id = await enReclamo({ vencido: false })
    expect(await silencio(id)).toBeNull(); expect((await estado(id)).estado).toBe('reclamo')
  })
  it.each([
    [{ regla: false }, /no aceptó la regla/],
    [{ abre: false }, /no abrió ningún aviso/],
    [{ monto: 31 }, /30 %/],
    [{ fotosEntrada: false }, /pruebas completas/],
    [{ firmasEntrada: false }, /pruebas completas/],
  ] as const)('si falta una condición (%o), pasa a la mediación sin reparto', async (o, motivo) => {
    const id = await enReclamo(o)
    expect(await silencio(id)).toBe('mediacion')
    expect(await estado(id)).toMatchObject({ estado: 'mediacion', resultado: null })
    expect(await ultimoEvento(id)).toMatch(motivo)
  })
  it('si el inquilino respondió, no hay silencio', async () => {
    const id = await enReclamo()
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    expect(await silencio(id)).toBeNull(); expect((await estado(id)).estado).toBe('mediacion')
  })
  it('solo el inquilino registra que abrió el aviso, una sola vez, y solo con el reclamo abierto', async () => {
    const id = await enReclamo({ abre: false, vencido: false })
    await como(DUENO); await expect(db.query('select public.lk_abrir_aviso_reclamo($1)', [id])).rejects.toThrow(/inquilino/)
    await como(INQ); await db.query('select public.lk_abrir_aviso_reclamo($1)', [id])
    const a = (await uno<{ a: Date }>('select abierto_en a from public.lk_reclamos where contrato_id = $1', [id]))!.a
    await db.query('select public.lk_abrir_aviso_reclamo($1)', [id])
    expect((await uno<{ a: Date }>('select abierto_en a from public.lk_reclamos where contrato_id = $1', [id]))!.a).toEqual(a)
  })
  it('abrir el aviso después del plazo no cuenta para la regla', async () => {
    const id = await enReclamo({ abre: false })
    await como(INQ); await db.query('select public.lk_abrir_aviso_reclamo($1)', [id])
    expect(await silencio(id)).toBe('mediacion')
  })
  it('quien no participa no puede aplicar el silencio', async () => {
    const id = await enReclamo()
    await expect(silencio(id, MED)).rejects.toThrow(/No participas/)
  })
})

describe('B2 · silencio del dueño (5.3 d) y corrida diaria lk_vencimientos', () => {
  it('si el dueño no reclama ni aprueba en su plazo, el 100 % vuelve al inquilino (via automatico)', async () => {
    const id = await crear()
    await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', ventana_inicio = now() - interval '2 minutes', ventana_segundos = 60 where id = $1`, [id])
    await como(INQ); expect((await uno<{ r: boolean }>('select public.lk_cerrar_sin_reclamo($1) r', [id]))!.r).toBe(true)
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'automatico', dueno: 0, inquilino: 100 } })
  })
  it('lk_vencimientos (solo service_role) cierra los plazos del dueño vencidos y aplica el silencio del inquilino', async () => {
    const sinReclamo = await crear(), conRegla = await enReclamo(), sinRegla = await enReclamo({ regla: false }), abierto = await enReclamo({ vencido: false })
    await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', ventana_inicio = now() - interval '2 minutes', ventana_segundos = 60 where id = $1`, [sinReclamo])
    const r = (await uno<{ r: { automatico: number; regla_651: number; mediacion: number } }>('select public.lk_vencimientos() r'))!.r
    expect(r.automatico).toBeGreaterThanOrEqual(1); expect(r.regla_651).toBeGreaterThanOrEqual(1); expect(r.mediacion).toBeGreaterThanOrEqual(1)
    expect((await estado(sinReclamo)).resultado).toMatchObject({ via: 'automatico', inquilino: 100 })
    expect((await estado(conRegla)).resultado).toMatchObject({ via: 'regla_651' })
    expect((await estado(sinRegla)).estado).toBe('mediacion')
    expect((await estado(abierto)).estado).toBe('reclamo')
    const p = await uno<{ a: boolean; s: boolean }>(`select has_function_privilege('authenticated', 'public.lk_vencimientos()', 'execute') a, has_function_privilege('service_role', 'public.lk_vencimientos()', 'execute') s`)
    expect(p).toEqual({ a: false, s: true })
  })
})
