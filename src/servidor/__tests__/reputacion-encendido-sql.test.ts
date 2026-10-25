// Paso 19 · Respuesta de Legal a 6c71866 (25/10/2026, 3:42 p. m.), en 20261025140000_reputacion.sql (escrita, NO aplicada a producción):
// 2) con la reputación encendida, una cuenta sin aceptación de REP-01 y sin alquileres no entra a un alquiler (crear ni unirse);
// 3) un alquiler cuenta para la reputación solo si las dos cuentas tienen perfil.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now());
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
const u = (n: number) => `00000000-0000-4000-8000-00000000000${n}`, k = (n: number) => `00000000-0000-4000-9000-00000000000${n}`
const VIEJA = u(1), NUEVA_SIN = u(2), NUEVA_CON = u(3), OTRA_CON = u(4)
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const entrar = (c: string, rol: string, usuario: string) => db.query('insert into public.lk_participantes values ($1, $2, $3)', [c, rol, usuario])
const contrato = (c: string, estado = 'firmas') => db.query('insert into public.lk_contratos(id, estado) values ($1, $2)', [c, estado])

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  for (const x of [VIEJA, NUEVA_SIN, NUEVA_CON, OTRA_CON]) await db.query('insert into auth.users(id) values ($1)', [x])
  await contrato(k(9), 'cerrado'); await entrar(k(9), 'inquilino', VIEJA)        // la cuenta anterior ya tenía un alquiler
  for (const x of [NUEVA_CON, OTRA_CON]) await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, '1.10-demo', '{a,b}')`, [x])
}, 30_000)

describe('sin REP-01 y sin alquileres', () => {
  it('con la reputación apagada (sin fila de encendido), nadie queda bloqueado', async () => {
    await contrato(k(1)); await entrar(k(1), 'dueno', NUEVA_SIN)
    await db.query('delete from public.lk_participantes where contrato_id = $1', [k(1)])
  })
  it('encendida: sin REP-01 ni alquileres no crea ni se une; con alquileres o con REP-01, sí', async () => {
    await db.query('insert into public.lk_reputacion_encendido default values')
    await contrato(k(2))
    for (const rol of ['dueno', 'inquilino']) await expect(entrar(k(2), rol, NUEVA_SIN)).rejects.toThrow(/primero acepta tu perfil de reputación/)
    await entrar(k(2), 'dueno', VIEJA); await entrar(k(2), 'inquilino', NUEVA_CON)
    expect((await uno<{ v: boolean }>('select public.lk_sin_perfil_ni_alquileres($1) v', [NUEVA_SIN])).v).toBe(true)
    expect((await uno<{ v: boolean }>('select public.lk_sin_perfil_ni_alquileres($1) v', [VIEJA])).v).toBe(false)
    await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, '1.10-demo', '{a,b}')`, [NUEVA_SIN])
    await contrato(k(3)); await entrar(k(3), 'dueno', NUEVA_SIN)                   // ya aceptó: entra
  })
})

describe('alquileres que cuentan', () => {
  it('lk_cuenta_para_reputacion mira las DOS cuentas (en los dos sentidos)', async () => {
    const v = async (c: string) => (await uno<{ v: boolean }>('select public.lk_cuenta_para_reputacion($1) v', [c])).v
    await contrato(k(4), 'cerrado'); await entrar(k(4), 'dueno', NUEVA_CON); await entrar(k(4), 'inquilino', VIEJA)
    await contrato(k(5), 'cerrado'); await entrar(k(5), 'dueno', VIEJA); await entrar(k(5), 'inquilino', NUEVA_CON)
    await contrato(k(6), 'cerrado'); await entrar(k(6), 'dueno', NUEVA_CON); await entrar(k(6), 'inquilino', OTRA_CON)
    expect([await v(k(4)), await v(k(5)), await v(k(6))]).toEqual([false, false, true])
  })
})
