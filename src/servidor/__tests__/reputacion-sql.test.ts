// Paso 19 · 20261025140000_reputacion.sql probada en Postgres (PGlite), con auth simulado. NO se aplicó a producción.
// Eliminar la cuenta: gratis, el perfil deja de mostrarse al pedirlo y todo se borra en un máximo de 5 días hábiles (sin feriados de CR).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { fechaLimiteBorrado } from '../../reputacion/borrado'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now());
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002', C = '00000000-0000-4000-8000-000000000003'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const cuenta = async (t: string, u: string) => (await uno<{ n: number }>(`select count(*)::int n from ${t} where usuario = $1`, [u])).n

beforeAll(async () => {
  db = new PGlite()
  await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  for (const u of [A, B, C]) {
    await db.query('insert into auth.users(id) values ($1)', [u])
    await db.query(`insert into public.lk_reputacion_perfiles(usuario, nombre_visible, canton) values ($1, 'Laura V.', 'Escazú')`, [u])
    await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, 'demo', '{a,b}')`, [u])
    await db.query(`insert into public.lk_reputacion_consentimientos(usuario, rol, opcion, version, texto) values ($1, 'dueno', 'destacados', 'demo', '{a}')`, [u])
    await db.query(`insert into public.lk_reputacion_revisiones(usuario, rol, contrato_id, texto, limite) values ($1, 'inquilino', gen_random_uuid(), 'x', now())`, [u])
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
    expect(await cuenta('public.lk_reputacion_aceptaciones', A)).toBe(0); expect(await cuenta('public.lk_reputacion_aceptaciones', B)).toBe(1)
    await como(null)
    expect((await uno<{ n: number }>('select public.lk_borrar_cuentas_pedidas() n')).n).toBe(1)
    expect((await uno<{ n: number }>('select count(*)::int n from auth.users where id = $1', [A])).n).toBe(0)
    expect((await uno<{ h: Date | null }>('select hecho_en h from public.lk_solicitudes_borrado where usuario = $1', [A])).h).not.toBeNull()
    expect(await cuenta('public.lk_reputacion_revisiones', A)).toBe(0)
    expect((await uno<{ n: number }>('select public.lk_borrar_cuentas_pedidas() n')).n).toBe(0)
  })
  it('con un alquiler abierto: el perfil deja de existir al instante, sin fecha límite; la cuenta se borra 5 días hábiles después del cierre', async () => {
    const K = 'c0000000-0000-4000-8000-0000000000aa'
    await db.query(`insert into public.lk_contratos(id, estado) values ($1, 'ventana_reclamo')`, [K])
    await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario) values ($1, 'dueno', $2), ($1, 'inquilino', $3)`, [K, C, B])
    await como(C)
    expect((await uno<{ f: Date | null }>('select public.lk_pedir_borrado_cuenta() f')).f).toBeNull()
    expect(await cuenta('public.lk_reputacion_perfiles', C)).toBe(0)
    const s0 = await uno<{ p: Date; a: boolean; l: Date | null }>('select pedido_en p, alquiler_abierto a, fecha_limite l from public.lk_solicitudes_borrado where usuario = $1', [C])
    expect(s0.p).toBeInstanceOf(Date); expect(s0.a).toBe(true); expect(s0.l).toBeNull()
    await como(null)
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    expect((await uno<{ n: number }>('select count(*)::int n from auth.users where id = $1', [C])).n).toBe(1)              // sigue: hay que cerrar el alquiler
    expect(await cuenta('public.lk_reputacion_revisiones', C)).toBe(1)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_participantes where contrato_id = $1', [K])).n).toBe(2) // la otra parte sigue viéndolo
    await db.query(`update public.lk_contratos set estado = 'cerrado', actualizado_en = '2026-11-27T15:00:00Z' where id = $1`, [K])
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    expect((await uno<{ n: number }>('select count(*)::int n from auth.users where id = $1', [C])).n).toBe(0)
    const s1 = await uno<{ c: Date; l: Date; h: Date | null }>('select cierre_en c, fecha_limite l, hecho_en h from public.lk_solicitudes_borrado where usuario = $1', [C])
    expect(new Date(s1.c).toISOString()).toBe('2026-11-27T15:00:00.000Z'); expect(new Date(s1.l).toISOString()).toBe(fechaLimiteBorrado('2026-11-27T15:00:00Z')); expect(s1.h).not.toBeNull()
  })
  it('la solicitud es definitiva: no hay función para deshacerla', async () => {
    const r = await db.query<{ n: string }>(`select proname n from pg_proc where proname ~ '^lk_' and proname ~ '(cancel|deshacer|restaur|mostrar)'`)
    expect(r.rows).toEqual([])
  })
  it('REP-01 es una sola aceptación con versión, fecha y hora; las vitrinas no aceptan «perfil»; la nota de respuesta tiene hasta 300 caracteres', async () => {
    const r = await uno<{ v: string; t: Date }>('select version v, aceptado_en t from public.lk_reputacion_aceptaciones where usuario = $1', [B])
    expect(r.v).toBe('demo'); expect(r.t).toBeInstanceOf(Date)
    await expect(db.query(`insert into public.lk_reputacion_consentimientos(usuario, rol, opcion, version, texto) values ($1, 'inquilino', 'perfil', 'demo', '{a}')`, [B])).rejects.toThrow()
    await expect(db.query(`insert into public.lk_reputacion_revisiones(usuario, rol, contrato_id, texto, nota, limite) values ($1, 'dueno', gen_random_uuid(), 'x', repeat('n', 301), now())`, [B])).rejects.toThrow()
    await db.query(`insert into public.lk_reputacion_revisiones(usuario, rol, contrato_id, texto, nota, limite) values ($1, 'dueno', gen_random_uuid(), 'x', repeat('n', 300), now())`, [B])
  })
  it('lo negativo de más de 10 años se borra; lo reciente queda', async () => {
    await db.query(`insert into public.lk_reputacion_eventos(usuario, rol, contrato_id, tipo, valor, ocurrio_en) values
      ($1, 'inquilino', gen_random_uuid(), 'descuento_deposito', 4, now() - interval '10 years 1 day'),
      ($1, 'inquilino', gen_random_uuid(), 'descuento_deposito', 4, now() - interval '9 years 364 days')`, [B])
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    expect(await cuenta('public.lk_reputacion_eventos', B)).toBe(1)
  })
})
