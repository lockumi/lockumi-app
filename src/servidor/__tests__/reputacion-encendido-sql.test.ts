// Paso 19 · Respuesta de Legal a 6c71866 (25/10/2026, 3:42 p. m.), en 20261025140000_reputacion.sql (escrita, NO aplicada a producción):
// 2) una cuenta creada desde el encendido de la 1.10-demo y sin aceptación de REP-01 no entra a ningún alquiler (crear ni unirse);
// 3) cada aceptación de los Términos guarda la edición de ESA persona, y un alquiler cuenta solo si las dos cuentas tienen perfil.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, created_at timestamptz not null default now());
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now());
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
const u = (n: number) => `00000000-0000-4000-8000-00000000000${n}`, k = (n: number) => `00000000-0000-4000-9000-00000000000${n}`
const VIEJA = u(1), NUEVA_SIN = u(2), NUEVA_CON = u(3), OTRA_CON = u(4)
const EDICION = '1.10-demo · 2 de noviembre de 2026', E17 = '1.7-demo · 25 de octubre de 2026'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const entrar = (c: string, rol: string, usuario: string) => db.query('insert into public.lk_participantes values ($1, $2, $3)', [c, rol, usuario])
const contrato = (c: string, estado = 'firmas') => db.query('insert into public.lk_contratos(id, estado) values ($1, $2)', [c, estado])

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  await db.query(`insert into auth.users(id, created_at) values ($1, '2026-10-01T12:00:00Z'), ($2, '2026-11-05T12:00:00Z'), ($3, '2026-11-05T12:00:00Z'), ($4, '2026-11-03T12:00:00Z')`, [VIEJA, NUEVA_SIN, NUEVA_CON, OTRA_CON])
  for (const x of [NUEVA_CON, OTRA_CON]) await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, '1.10-demo', '{a,b}')`, [x])
}, 30_000)

describe('cuentas creadas desde el encendido sin REP-01', () => {
  it('sin encendido registrado, nadie queda bloqueado', async () => {
    await contrato(k(1)); await entrar(k(1), 'dueno', NUEVA_SIN)
  })
  it('con el encendido registrado: la cuenta posterior sin REP-01 no crea ni se une; las anteriores y las que aceptaron, sí', async () => {
    await db.query(`insert into public.lk_reputacion_encendido(encendido_en, edicion) values ('2026-11-02T06:00:00Z', $1)`, [EDICION])
    await contrato(k(2))
    for (const rol of ['dueno', 'inquilino']) await expect(entrar(k(2), rol, NUEVA_SIN)).rejects.toThrow(/primero acepta tu perfil de reputación/)
    await entrar(k(2), 'dueno', VIEJA); await entrar(k(2), 'inquilino', NUEVA_CON)
    expect((await uno<{ v: boolean }>('select public.lk_cuenta_posterior_al_encendido($1) v', [NUEVA_SIN])).v).toBe(true)
    expect((await uno<{ v: boolean }>('select public.lk_cuenta_posterior_al_encendido($1) v', [VIEJA])).v).toBe(false)
  })
})

describe('edición de cada aceptación y alquileres que cuentan', () => {
  it('lk_aceptaciones_terminos guarda la edición de quien acepta, aunque el cliente mande otra', async () => {
    await contrato(k(3)); await entrar(k(3), 'dueno', NUEVA_CON); await entrar(k(3), 'inquilino', VIEJA)
    await como(NUEVA_CON); await db.query(`select public.lk_registrar_aceptacion_terminos($1, '1.7-demo')`, [k(3)])
    await como(VIEJA); await db.query(`select public.lk_registrar_aceptacion_terminos($1, '1.7-demo')`, [k(3)]); await como(null)
    await db.query(`insert into public.lk_aceptaciones_terminos(usuario, contrato_id, version, edicion) values ($1, $2, '1.7-demo', $3)`, [OTRA_CON, k(3), E17])
    const r = (await db.query<{ usuario: string; edicion: string }>('select usuario, edicion from public.lk_aceptaciones_terminos where contrato_id = $1', [k(3)])).rows
    expect(Object.fromEntries(r.map(x => [x.usuario, x.edicion]))).toEqual({ [NUEVA_CON]: EDICION, [VIEJA]: E17, [OTRA_CON]: EDICION })
  })
  it('lk_cuenta_para_reputacion mira las DOS cuentas (en los dos sentidos)', async () => {
    const v = async (c: string) => (await uno<{ v: boolean }>('select public.lk_cuenta_para_reputacion($1) v', [c])).v
    await contrato(k(4), 'cerrado'); await entrar(k(4), 'dueno', NUEVA_CON); await entrar(k(4), 'inquilino', VIEJA)
    await contrato(k(5), 'cerrado'); await entrar(k(5), 'dueno', VIEJA); await entrar(k(5), 'inquilino', NUEVA_CON)
    await contrato(k(6), 'cerrado'); await entrar(k(6), 'dueno', NUEVA_CON); await entrar(k(6), 'inquilino', OTRA_CON)
    expect([await v(k(4)), await v(k(5)), await v(k(6))]).toEqual([false, false, true])
  })
})
