// Paso 19 · Legal, respuesta a 96e931b (25/10/2026, 4:41 p. m.), límite (g) de docs/reputacion.md: las LECTURAS de reputación (políticas
// RLS y funciones) filtran por el correo VERIFICADO de la sesión, no solo por la sesión. Con dos correos en un aparato, la sesión ve solo
// lo del correo que verificó por última vez (el de quien entró con Cavos en ese aparato): A no ve nada de B ni B de A.
// Las políticas se prueban con el papel `authenticated` (como en Supabase), no con el dueño de las tablas (que se salta RLS).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now(), email_inquilino text);
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant select on tables to anon, authenticated;   -- como Supabase`
let n = 0
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, kid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const como = (u: string | null) => db.query(`select set_config('test.uid', $1, false)`, [u ?? ''])
const aparato = async () => { const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u]); return u }
/** api/verificar-correo.ts con la clave de servicio: es lo que pasa cada vez que alguien entra con Cavos en ese aparato. */
const verificar = (u: string, correo: string) => db.query(`select public.lk_registrar_correo_verificado($1, $2, 'google')`, [u, correo])
const TABLAS = ['lk_reputacion_perfiles', 'lk_reputacion_aceptaciones', 'lk_reputacion_consentimientos', 'lk_reputacion_eventos', 'lk_reputacion_revisiones', 'lk_solicitudes_borrado']
/** Lo que la sesión ve de cada tabla, leyendo como `authenticated` (con RLS). */
async function veo(u: string) {
  await como(u); await db.exec('set role authenticated')
  try {
    const r: Record<string, string[]> = {}
    for (const t of TABLAS) r[t] = (await db.query<{ c: string | null }>(`select correo c from public.${t} order by 1`)).rows.map(x => x.c ?? '(sin correo)')
    return r
  } finally { await db.exec('reset role'); await como(null) }
}
async function sembrar(u: string, correo: string | null, conPedido = false) {
  await db.query(`insert into public.lk_reputacion_perfiles(usuario, correo, nombre_visible, canton) values ($1, $2, 'Ejemplo E.', 'Escazú')`, [u, correo])
  await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, correo, version, texto) values ($1, $2, 'v', '{a}')`, [u, correo])
  await db.query(`insert into public.lk_reputacion_consentimientos(usuario, correo, rol, opcion, version, texto) values ($1, $2, 'dueno', 'destacados', 'v', '{x}')`, [u, correo])
  await db.query(`insert into public.lk_reputacion_eventos(usuario, correo, rol, contrato_id, tipo, valor, ocurrio_en) values ($1, $2, 'dueno', $3, 'descuento_deposito', 3, now())`, [u, correo, kid()])
  await db.query(`insert into public.lk_reputacion_revisiones(usuario, correo, rol, contrato_id, texto, limite) values ($1, $2, 'inquilino', $3, 'Está mal', now())`, [u, correo, kid()])
  if (conPedido) await db.query(`insert into public.lk_solicitudes_borrado(usuario, correo, alquiler_abierto) values ($1, $2, true)`, [u, correo])
}
const todo = (xs: string[]) => Object.fromEntries(TABLAS.map(t => [t, t === 'lk_solicitudes_borrado' ? xs.slice(0, 1) : xs]))

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  // Aquí solo importan las lecturas: los eventos se siembran sin alquiler real (lk_rep_evento_cuenta los descartaría).
  await db.exec('alter table public.lk_reputacion_eventos disable trigger lk_rep_evento_cuenta')
}, 30_000)

describe('lecturas por el correo verificado de la sesión (RLS)', () => {
  it('A y B en el mismo aparato: con A verificado, A no ve nada de B; con B verificado, B no ve nada de A', async () => {
    const U = await aparato()
    await sembrar(U, 'a.lee@ejemplo.com', true); await sembrar(U, 'b.lee@ejemplo.com', true)
    await verificar(U, 'a.lee@ejemplo.com')
    expect(await veo(U)).toEqual(todo(['a.lee@ejemplo.com']))
    await verificar(U, 'b.lee@ejemplo.com')                       // B entra con Cavos en el mismo aparato
    expect(await veo(U)).toEqual(todo(['b.lee@ejemplo.com']))
    await verificar(U, 'A.Lee@ejemplo.com ')                      // vuelve A
    expect(await veo(U)).toEqual(todo(['a.lee@ejemplo.com']))
  })
  it('sin correo verificado, la sesión no ve nada (cierre por defecto), ni siquiera lo de su propia sesión', async () => {
    const U = await aparato(); await sembrar(U, 'nadie.v@ejemplo.com', true); await sembrar(U, null)
    expect(await veo(U)).toEqual(Object.fromEntries(TABLAS.map(t => [t, []])))
  })
  it('filas sin correo (anteriores): solo las ve una sesión con un único correo; en un aparato con dos correos, ninguno', async () => {
    const S = await aparato(); await sembrar(S, null); await verificar(S, 'solo.uno@ejemplo.com')
    expect((await veo(S)).lk_reputacion_perfiles).toEqual(['(sin correo)'])
    const D = await aparato(); await sembrar(D, null); await verificar(D, 'd1@ejemplo.com'); await verificar(D, 'd2@ejemplo.com')
    expect((await veo(D)).lk_reputacion_perfiles).toEqual([])
  })
  it('otra sesión con el mismo correo verificado no lee por tabla las filas de la primera (la descarga del servidor sí las junta)', async () => {
    const A = await aparato(), B = await aparato(); await sembrar(A, 'dos.ap@ejemplo.com'); await verificar(A, 'dos.ap@ejemplo.com'); await verificar(B, 'dos.ap@ejemplo.com')
    expect((await veo(B)).lk_reputacion_perfiles).toEqual([])
    await como(B); const d = (await uno<{ d: { perfiles: unknown[] } }>(`select public.lk_mis_datos_reputacion('dos.ap@ejemplo.com') d`)).d; await como(null)
    expect(d.perfiles).toHaveLength(1)
  })
  it('anon no lee ninguna tabla de reputación', async () => {
    const U = await aparato(); await sembrar(U, 'anon.v@ejemplo.com'); await verificar(U, 'anon.v@ejemplo.com')
    await db.exec('set role anon')
    try { for (const t of TABLAS) expect((await db.query(`select 1 from public.${t}`)).rows, t).toEqual([]) } finally { await db.exec('reset role') }
  })
})

describe('funciones de lectura: solo el correo verificado ACTIVO de la sesión', () => {
  it('descarga y lk_necesita_rep01: con A activo, pedir lo de B se rechaza; sin correo, da lo de A', async () => {
    const U = await aparato(); await sembrar(U, 'a.fn@ejemplo.com'); await sembrar(U, 'b.fn@ejemplo.com')
    await verificar(U, 'b.fn@ejemplo.com'); await verificar(U, 'a.fn@ejemplo.com')
    await como(U)
    await expect(db.query(`select public.lk_mis_datos_reputacion('b.fn@ejemplo.com')`)).rejects.toThrow(/no es el de tu cuenta en este aparato/)
    await expect(db.query(`select public.lk_necesita_rep01('b.fn@ejemplo.com')`)).rejects.toThrow(/no es el de tu cuenta en este aparato/)
    await expect(db.query(`select public.lk_pedir_borrado_cuenta('b.fn@ejemplo.com')`)).rejects.toThrow(/no es el de tu cuenta en este aparato/)
    await expect(db.query(`select public.lk_aceptar_reputacion('b.fn@ejemplo.com', 'v', '{b}')`)).rejects.toThrow(/No pudimos leer el correo de tu cuenta/)
    const d = (await uno<{ d: { correo: string; perfiles: { correo: string }[]; aceptaciones: { correo: string }[] } }>('select public.lk_mis_datos_reputacion() d')).d
    expect(d.correo).toBe('a.fn@ejemplo.com'); expect(d.perfiles.map(x => x.correo)).toEqual(['a.fn@ejemplo.com']); expect(d.aceptaciones.map(x => x.correo)).toEqual(['a.fn@ejemplo.com'])
    expect(JSON.stringify(d)).not.toContain('b.fn@')
    await como(null)
  })
  it('las políticas usan la función del correo activo y las funciones de apoyo no exponen correos de otros', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const sql = fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')
    for (const t of TABLAS) expect(sql, t).toMatch(new RegExp(`create policy \\w+ on public\\.${t} for select to authenticated using \\(usuario = auth\\.uid\\(\\) and public\\.lk_fila_de_mi_correo\\(correo\\)\\)`))
    expect(sql).not.toMatch(/for select using \(usuario = auth\.uid\(\)\);/)
  })
})
