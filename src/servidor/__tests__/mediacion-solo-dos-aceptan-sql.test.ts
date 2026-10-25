// A2 (Legal, 25/10, 1:24 a. m.) · 20261025020000_mediacion_solo_dos_aceptan.sql probada en Postgres (PGlite), con auth y storage simulados.
// Reemplaza en producción la lk_decidir_mediacion vieja (la persona mediadora cerraba sola) por la que solo cierra con las
// aceptaciones de las dos partes con el mismo reparto (Términos 2.2 b y 6.8). No depende del escenario C ni cambia nada visible.
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
async function enMediacion(id?: string) {
  id ??= await crear()
  await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo, respuesta) values ($1, 30, 'Pared manchada en la sala', 'rechazado')`, [id])
  await db.query(`update public.lk_contratos set estado = 'mediacion' where id = $1`, [id])
  return id
}
const acepta = async (uid: string, id: string, monto: number) => { await como(uid); await db.query('select public.lk_aceptar_acuerdo_mediacion($1, $2)', [id, monto]) }
const registrar = async (id: string, monto: number) => { await como(MED); await db.query(`select public.lk_decidir_mediacion($1, $2, 'Daño parcial')`, [id, monto]) }

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.query(`insert into public.lk_mediadores values ($1, 'Mediación Lockumi')`, [MED])
}, 60_000)

describe('lk_decidir_mediacion en producción: solo con las dos aceptaciones (A2)', () => {
  it('sin aceptaciones, la persona mediadora no puede cerrar el caso con un reparto', async () => {
    const id = await enMediacion()
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
    expect((await estado(id)).estado).toBe('mediacion')
  })
  it('con una sola aceptación tampoco', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20)
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
  })
  it('si las dos partes aceptaron repartos distintos, no cierra', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20); await acepta(INQ, id, 10)
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
  })
  it('con las dos aceptaciones del mismo reparto, cierra y lo registra', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20); await acepta(INQ, id, 20)
    await registrar(id, 20)
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 20, inquilino: 80 } })
    expect(await ultimoEvento(id)).toBe('Acuerdo registrado: 20 USDC al dueño y 80 al inquilino (aceptado por las dos partes) · Daño parcial')
  })
  it('una parte puede cambiar su aceptación antes del cierre; el reparto registrado debe ser el aceptado por las dos', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 25); await acepta(INQ, id, 15); await acepta(DUENO, id, 15)
    await expect(registrar(id, 25)).rejects.toThrow(/aceptaciones de las dos partes/)
    await registrar(id, 15)
    expect((await estado(id)).resultado).toMatchObject({ cierre: 'dos_aceptan', dueno: 15 })
  })
  it('solo las partes aceptan, solo con el caso en mediación y dentro de lo reclamado', async () => {
    const id = await enMediacion()
    await expect(acepta(MED, id, 10)).rejects.toThrow(/No participas/)
    await expect(acepta(INQ, id, 31)).rejects.toThrow(/entre 0 y lo reclamado/)
    const otro = await crear()
    await expect(acepta(INQ, otro, 10)).rejects.toThrow(/no está en la Mediación/)
  })
  it('la persona mediadora tampoco puede cerrar sola con el 100 % al inquilino (la devolución automática de 5.3 d no pasa por la mediación)', async () => {
    const id = await enMediacion()
    await expect(registrar(id, 0)).rejects.toThrow(/aceptaciones de las dos partes/)
    expect(await estado(id)).toMatchObject({ estado: 'mediacion', resultado: null })
  })
  it('con las dos aceptaciones del 100 % al inquilino, sí cierra (es un acuerdo)', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 0); await acepta(INQ, id, 0)
    await registrar(id, 0)
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 0, inquilino: 100 } })
  })
  it('nadie escribe directo en las tablas de aceptaciones', async () => {
    const r = await uno<{ a: boolean; u: boolean; s: boolean; x: boolean; d: boolean }>(`select has_table_privilege('authenticated', 'public.lk_aceptaciones_mediacion', 'insert') a,
      has_table_privilege('authenticated', 'public.lk_aceptaciones_mediacion', 'update') u, has_table_privilege('authenticated', 'public.lk_aceptaciones_mediacion', 'select') s,
      has_function_privilege('anon', 'public.lk_aceptar_acuerdo_mediacion(uuid, numeric)', 'execute') x, has_function_privilege('anon', 'public.lk_decidir_mediacion(uuid, numeric, text)', 'execute') d`)
    expect(r).toEqual({ a: false, u: false, s: true, x: false, d: false })
  })
  it('no depende del escenario C: no crea lk_reglas_651 ni lk_aceptar_regla_651 y mantiene la misma firma de lk_decidir_mediacion', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const sql = fs.readFileSync('supabase/migrations/20261025020000_mediacion_solo_dos_aceptan.sql', 'utf8')
    expect(sql).not.toMatch(/lk_reglas_651|lk_aceptar_regla_651/)
    expect((await uno<{ d: string | null }>(`select to_regprocedure('public.lk_decidir_mediacion(uuid, numeric, text)')::text d`))!.d).toBe('lk_decidir_mediacion(uuid,numeric,text)')
  })
})

// Legal (25/10, 1:16 a. m.): en C, un caso sin acuerdo sigue abierto y no hay liberación por plazo.
