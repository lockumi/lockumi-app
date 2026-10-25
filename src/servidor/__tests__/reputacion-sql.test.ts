// Paso 19 · 20261025140000_reputacion.sql probada en Postgres (PGlite), con auth simulado. NO se aplicó a producción.
// Eliminar la cuenta: gratis, el perfil deja de mostrarse al pedirlo y todo se borra en un máximo de 5 días hábiles (sin feriados de CR).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fechaLimiteBorrado } from '../../reputacion/borrado'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const cuenta = async (t: string, u: string) => (await uno<{ n: number }>(`select count(*)::int n from ${t} where usuario = $1`, [u])).n

beforeAll(async () => {
  db = new PGlite()
  await db.exec(PRELUDIO)
  await db.exec(readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  for (const u of [A, B]) {
    await db.query('insert into auth.users(id) values ($1)', [u])
    await db.query(`insert into public.lk_reputacion_perfiles(usuario, nombre_visible, canton) values ($1, 'Laura V.', 'Escazú')`, [u])
    await db.query(`insert into public.lk_reputacion_consentimientos(usuario, rol, opcion, version, texto) values ($1, 'dueno', 'perfil', 'demo', '{a,b}')`, [u])
  }
}, 30_000)

describe('migración de reputación (archivo; no aplicada a producción)', () => {
  it('la fecha límite es la misma que en la app (fines de semana, Semana Santa, 1.º de diciembre)', async () => {
    for (const p of ['2026-10-25T20:00:00Z', '2026-11-27T15:00:00Z', '2026-03-30T15:00:00Z', '2026-10-26T05:00:00Z', '2026-12-23T18:00:00Z']) {
      const r = await uno<{ f: Date }>('select public.lk_fecha_limite_borrado($1::timestamptz) f', [p])
      expect(new Date(r.f).toISOString()).toBe(fechaLimiteBorrado(p))
    }
  })
  it('pedir el borrado exige sesión', async () => {
    await como(null)
    await expect(db.query('select public.lk_pedir_borrado_cuenta()')).rejects.toThrow(/Entra a tu cuenta/)
  })
  it('al pedirlo, el perfil deja de existir al instante; la tarea programada borra la cuenta y deja constancia', async () => {
    await como(A)
    await db.query('select public.lk_pedir_borrado_cuenta()')
    expect(await cuenta('public.lk_reputacion_perfiles', A)).toBe(0)
    expect(await cuenta('public.lk_reputacion_perfiles', B)).toBe(1)
    await como(null)
    expect((await uno<{ n: number }>('select public.lk_borrar_cuentas_pedidas() n')).n).toBe(1)
    expect((await uno<{ n: number }>('select count(*)::int n from auth.users where id = $1', [A])).n).toBe(0)
    expect((await uno<{ h: Date | null }>('select hecho_en h from public.lk_solicitudes_borrado where usuario = $1', [A])).h).not.toBeNull()
    expect((await uno<{ n: number }>('select public.lk_borrar_cuentas_pedidas() n')).n).toBe(0)
  })
  it('lo negativo de más de 10 años se borra; lo reciente queda', async () => {
    await db.query(`insert into public.lk_reputacion_eventos(usuario, rol, contrato_id, tipo, valor, ocurrio_en) values
      ($1, 'inquilino', gen_random_uuid(), 'descuento_deposito', 4, now() - interval '10 years 1 day'),
      ($1, 'inquilino', gen_random_uuid(), 'descuento_deposito', 4, now() - interval '9 years 364 days')`, [B])
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    expect(await cuenta('public.lk_reputacion_eventos', B)).toBe(1)
  })
})
