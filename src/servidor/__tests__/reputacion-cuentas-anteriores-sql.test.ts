// Paso 19 · Ronda del 25/10/2026 (Legal): en 20261025140000_reputacion.sql (escrita, NO aplicada a producción):
// 1) un alquiler entre una cuenta anterior (sin aceptación de reputación) y una nueva no cuenta para ninguna de las dos;
// 2) con un pedido de borrado pendiente, la cuenta no puede crear ni unirse a alquileres nuevos (texto literal de Legal).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now());
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
const u = (n: number) => `00000000-0000-4000-8000-00000000000${n}`, k = (n: number) => `00000000-0000-4000-9000-00000000000${n}`
const NUEVA1 = u(1), NUEVA2 = u(2), VIEJA = u(3), BORRA = u(4)
const LIT = 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const contrato = async (id: string, dueno: string, inquilino: string, estado = 'cerrado') => {
  await db.query('insert into public.lk_contratos(id, estado) values ($1, $2)', [id, estado])
  await db.query(`insert into public.lk_participantes values ($1, 'dueno', $2), ($1, 'inquilino', $3)`, [id, dueno, inquilino]) }
const evento = (usuario: string, c: string) => db.query(`insert into public.lk_reputacion_eventos(usuario, rol, contrato_id, tipo, valor, ocurrio_en) values ($1, 'dueno', $2, 'reclamo_indebido', 3.1, now())`, [usuario, c])
const eventos = async (c: string) => (await uno<{ n: number }>('select count(*)::int n from public.lk_reputacion_eventos where contrato_id = $1', [c])).n

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  for (const x of [NUEVA1, NUEVA2, VIEJA, BORRA]) await db.query('insert into auth.users(id) values ($1)', [x])
  for (const x of [NUEVA1, NUEVA2, BORRA]) await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, '1.10-demo', '{a,b}')`, [x])
  await db.query(`select public.lk_registrar_correo_verificado($1, 'borra@ejemplo.com', 'google', md5(random()::text) || md5(random()::text))`, [BORRA])   // correo verificado (4:23 p. m.)
}, 30_000)

describe('cuentas anteriores (sin aceptación de reputación)', () => {
  it('un alquiler cuenta solo si las dos partes aceptaron la reputación', async () => {
    await contrato(k(1), NUEVA1, NUEVA2); await contrato(k(2), NUEVA1, VIEJA); await contrato(k(3), VIEJA, NUEVA2)
    const v = async (c: string) => (await uno<{ v: boolean }>('select public.lk_cuenta_para_reputacion($1) v', [c])).v
    expect(await v(k(1))).toBe(true); expect(await v(k(2))).toBe(false); expect(await v(k(3))).toBe(false)
  })
  it('los eventos de un alquiler con una cuenta anterior no se guardan para ninguna de las dos', async () => {
    await evento(NUEVA1, k(1)); await evento(NUEVA1, k(2)); await evento(VIEJA, k(2)); await evento(NUEVA2, k(3))
    expect(await eventos(k(1))).toBe(1); expect(await eventos(k(2))).toBe(0); expect(await eventos(k(3))).toBe(0)
  })
  it('quien tenía perfil y pidió eliminar su cuenta sigue contando para la otra parte', async () => {
    await contrato(k(4), NUEVA1, BORRA); await como(BORRA); await db.query('select public.lk_pedir_borrado_cuenta()'); await como(null)
    expect((await uno<{ c: boolean }>('select con_perfil c from public.lk_solicitudes_borrado where usuario = $1', [BORRA])).c).toBe(true)
    expect((await uno<{ v: boolean }>('select public.lk_cuenta_para_reputacion($1) v', [k(4)])).v).toBe(true)
  })
})

describe('borrado pendiente: no crea ni se une a alquileres nuevos', () => {
  it('no puede entrar como parte de un alquiler nuevo (crear o aceptar una invitación), con el texto de Legal', async () => {
    await db.query(`insert into public.lk_contratos(id, estado) values ($1, 'firmas')`, [k(5)])
    await expect(db.query(`insert into public.lk_participantes values ($1, 'dueno', $2)`, [k(5), BORRA])).rejects.toThrow(LIT)
    await expect(db.query(`insert into public.lk_participantes values ($1, 'inquilino', $2)`, [k(5), BORRA])).rejects.toThrow(LIT)
    await db.query(`insert into public.lk_participantes values ($1, 'dueno', $2)`, [k(5), NUEVA2])   // las demás cuentas, igual
  })
})
