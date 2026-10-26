// (b)+(c) · 20261025050000_terminos_por_alquiler.sql (escenario C, sin aplicar) probada en Postgres (PGlite):
// la versión de los Términos queda guardada por alquiler al crearlo, y se guarda quién aceptó los Términos y el Aviso de privacidad y cuándo.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002', OTRO = '00000000-0000-4000-8000-000000000003'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const fechas = () => [new Date().toISOString().slice(0, 10), new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)]
const crear = async (version: string | null) => {
  await como(DUENO); const [hoy, fin] = fechas()
  return (await uno<{ r: { id: string; token: string } }>(`select public.lk_crear_contrato_con_terminos('Casa de prueba', 100, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3, $4) r`, [hoy, fin, DECL, version]))!.r
}

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) { const s = fs.readFileSync('supabase/migrations/' + m, 'utf8'); await db.exec(s); if (m.includes('terminos_por_alquiler')) await db.exec(s) /* idempotente */ }
}, 60_000)

describe('Términos por alquiler (C)', () => {
  it('al crear, el alquiler queda en la versión pedida y se guarda la aceptación del dueño (quién y cuándo)', async () => {
    const r = await crear('1.9-demo')
    expect((await uno<{ v: string }>('select terminos_version v from public.lk_contratos where id = $1', [r.id]))!.v).toBe('1.9-demo')
    const a = await uno<{ rol: string; usuario: string; version: string; aceptado_en: Date }>('select * from public.lk_aceptaciones_terminos where contrato_id = $1', [r.id])
    expect(a).toMatchObject({ rol: 'dueno', usuario: DUENO, version: '1.9-demo' }); expect(a!.aceptado_en).toBeTruthy()
    expect((await uno<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id desc limit 1', [r.id]))!.t).toMatch(/dueño aceptó los Términos 1\.9-demo y el Aviso de privacidad/)
  })
  it('sin versión, o con una versión rara, no se crea', async () => {
    await expect(crear(null)).rejects.toThrow(/Términos/); await expect(crear('2.0')).rejects.toThrow(/Términos/)
  })
  it('el inquilino se une solo aceptando la misma versión; queda guardado quién y cuándo', async () => {
    const r = await crear('1.9-demo')
    await como(INQ)
    await expect(db.query(`select public.lk_aceptar_invitacion_con_terminos($1, $2, 'invitada@correo.com', null)`, [r.id, r.token])).rejects.toThrow(/Términos/)
    await expect(db.query(`select public.lk_aceptar_invitacion_con_terminos($1, $2, 'invitada@correo.com', '1.6-demo')`, [r.id, r.token])).rejects.toThrow(/Términos/)
    expect((await uno<{ n: number }>(`select count(*)::int n from public.lk_participantes where contrato_id = $1 and rol = 'inquilino'`, [r.id]))!.n).toBe(0)
    await db.query(`select public.lk_aceptar_invitacion_con_terminos($1, $2, 'invitada@correo.com', '1.9-demo')`, [r.id, r.token])
    const filas = (await db.query<{ rol: string; usuario: string }>('select rol, usuario from public.lk_aceptaciones_terminos where contrato_id = $1 order by rol', [r.id])).rows
    expect(filas).toEqual([{ rol: 'dueno', usuario: DUENO }, { rol: 'inquilino', usuario: INQ }])
  })
  it('los alquileres de antes (sin la función nueva) quedan sin versión: conservan la suya', async () => {
    await como(DUENO); const [hoy, fin] = fechas()
    const r = (await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa vieja', 100, $1::date, $2::date, '{}', 'otra@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL]))!.r
    expect((await uno<{ v: string | null }>('select terminos_version v from public.lk_contratos where id = $1', [r.id]))!.v).toBeNull()
  })
  it('solo las partes ven las aceptaciones; anon no puede llamar a las funciones', async () => {
    const r = await crear('1.9-demo')
    const ver = async (rol: string, uid: string) => { await db.exec(`set role ${rol}`); await como(uid); try { return (await db.query('select * from public.lk_aceptaciones_terminos where contrato_id = $1', [r.id])).rows.length } finally { await db.exec('reset role') } }
    expect(await ver('authenticated', DUENO)).toBe(1); expect(await ver('authenticated', OTRO)).toBe(0)
    await db.exec('set role anon'); try { await expect(db.query(`select public.lk_aceptar_invitacion_con_terminos($1, 'x', 'a@b.c', '1.9-demo')`, [r.id])).rejects.toThrow(/permission denied/) } finally { await db.exec('reset role') }
  })
})
