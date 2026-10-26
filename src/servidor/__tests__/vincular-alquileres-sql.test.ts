// Tus alquileres en cualquier dispositivo (26/10/2026, migración 20261026060000): lk_vincular_alquileres mueve los lugares (dueño e
// inquilino) con ese correo a la sesión nueva SOLO si esa sesión tiene el correo verificado por Cavos (Google/Apple) recién. Nunca con
// un correo verificado solo con el código de Lockumi ni sin verificar; idempotente; solo la clave de servicio; la revert lo deshace.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key, name text);`
let db: PGlite, fs: { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
let n = 0
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const vincular = async (u: string, c: string) => (await uno<{ n: number }>('select public.lk_vincular_alquileres($1, $2) n', [u, c]))!.n
const verificar = async (u: string, c: string, metodo: string, hace = '0 minutes') => {
  await db.query('insert into auth.users(id) values ($1) on conflict do nothing', [u])
  await db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo, verificado_en) values ($1, $2, $3, clock_timestamp() - $4::interval)
            on conflict (usuario, correo) do update set metodo = excluded.metodo, verificado_en = excluded.verificado_en`, [u, c, metodo, hace])
}
async function alquiler(dueno: string, correoDueno: string, inquilino: string, correoInquilino: string) {
  const c = id()
  await db.query(`insert into public.lk_contratos(id, estado, creado_por, direccion, monto, inicio, fin, email_inquilino) values ($1, 'pendiente_pago', $2, 'Casa demo', 1, current_date, current_date + 60, $3)`, [c, dueno, correoInquilino])
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'dueno', $2, $3), ($1, 'inquilino', $4, $5)`, [c, dueno, correoDueno, inquilino, correoInquilino])
  await db.query(`insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values ($1, 'contrato', 'dueno', $2), ($1, 'contrato', 'inquilino', $3)`, [c, dueno, inquilino])
  return c
}
const usuarioDe = async (c: string, rol: string) => (await uno<{ usuario: string }>('select usuario from public.lk_participantes where contrato_id = $1 and rol = $2', [c, rol]))!.usuario
const ve = async (u: string) => {   // lo que «Tus alquileres» lee con la sesión u (RLS)
  await db.query(`select set_config('test.uid', $1, false)`, [u]); await db.exec('set role authenticated')
  try { return (await db.query<{ id: string }>('select id from public.lk_contratos order by id')).rows.map(r => r.id) } finally { await db.exec('reset role'); await db.query(`select set_config('test.uid', '', false)`) }
}

beforeAll(async () => {
  fs = await import(['node', 'fs'].join(':')) as typeof fs
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.exec('grant usage on schema public to authenticated, anon')
}, 60_000)

describe('lk_vincular_alquileres', () => {
  it('Apple en un navegador nuevo: el lugar de inquilino (y su firma) pasa a la sesión nueva; la segunda vez no mueve nada', async () => {
    const dueno = id(), viejo = id(), nuevo = id()
    const c = await alquiler(dueno, 'dueno@ejemplo.com', viejo, 'x1@privaterelay.appleid.com')
    expect(await ve(nuevo)).toEqual([])
    await verificar(nuevo, 'x1@privaterelay.appleid.com', 'apple')
    expect(await vincular(nuevo, ' X1@privaterelay.appleid.com ')).toBe(1)
    expect(await usuarioDe(c, 'inquilino')).toBe(nuevo); expect(await usuarioDe(c, 'dueno')).toBe(dueno)
    expect((await uno<{ usuario: string }>(`select usuario from public.lk_firmas where contrato_id = $1 and rol = 'inquilino'`, [c]))!.usuario).toBe(nuevo)
    expect(await ve(nuevo)).toEqual([c]); expect(await ve(dueno)).toEqual([c])
    expect(await vincular(nuevo, 'x1@privaterelay.appleid.com')).toBe(0)
    expect((await uno<{ k: number }>('select count(*)::int k from public.lk_vinculaciones where contrato_id = $1', [c]))!.k).toBe(1)
  })
  it('dueño con Google: también se mueve su lugar de dueño', async () => {
    const viejo = id(), inq = id(), nuevo = id()
    const c = await alquiler(viejo, 'duena@gmail.com', inq, 'inq@ejemplo.com')
    await verificar(nuevo, 'duena@gmail.com', 'google')
    expect(await vincular(nuevo, 'duena@gmail.com')).toBe(1)
    expect(await usuarioDe(c, 'dueno')).toBe(nuevo); expect(await ve(nuevo)).toEqual([c])
  })
  it('NO: correo verificado solo con el código de Lockumi, sin verificar, verificación vieja u otro correo', async () => {
    const viejo = id(), nuevo = id()
    const c = await alquiler(id(), 'd2@ejemplo.com', viejo, 'solo.codigo@hotmail.com')
    expect(await vincular(nuevo, 'solo.codigo@hotmail.com')).toBe(0)                 // sin verificar
    await verificar(nuevo, 'solo.codigo@hotmail.com', 'email')
    expect(await vincular(nuevo, 'solo.codigo@hotmail.com')).toBe(0)                 // código de Lockumi
    await verificar(nuevo, 'solo.codigo@hotmail.com', 'apple', '30 minutes')
    expect(await vincular(nuevo, 'solo.codigo@hotmail.com')).toBe(0)                 // no es de este login
    await verificar(nuevo, 'otro@ejemplo.com', 'apple')
    expect(await vincular(nuevo, 'otro@ejemplo.com')).toBe(0)
    expect(await usuarioDe(c, 'inquilino')).toBe(viejo)
  })
  it('no junta los dos lugares en una sesión: se salta si ya es parte; si es dueña e inquilina con el mismo correo, trae el de dueño', async () => {
    const yo = id(), otro = id()
    const c1 = await alquiler(yo, 'mismo@ejemplo.com', otro, 'mismo@ejemplo.com')   // la sesión ya es dueña
    const viejoD = id(), viejoI = id(), nueva = id()
    const c2 = await alquiler(viejoD, 'doble@ejemplo.com', viejoI, 'doble@ejemplo.com')
    await verificar(yo, 'mismo@ejemplo.com', 'google'); await verificar(nueva, 'doble@ejemplo.com', 'google')
    expect(await vincular(yo, 'mismo@ejemplo.com')).toBe(0)
    expect(await usuarioDe(c1, 'inquilino')).toBe(otro); expect(await ve(yo)).toEqual([c1])
    expect(await vincular(nueva, 'doble@ejemplo.com')).toBe(1); expect(await vincular(nueva, 'doble@ejemplo.com')).toBe(0)
    expect(await usuarioDe(c2, 'dueno')).toBe(nueva); expect(await usuarioDe(c2, 'inquilino')).toBe(viejoI)
  })
  it('solo la clave de servicio: anon y authenticated no pueden llamarla ni leer lk_vinculaciones', async () => {
    for (const rol of ['anon', 'authenticated']) {
      await db.exec(`set role ${rol}`)
      try {
        await expect(db.query(`select public.lk_vincular_alquileres('${id()}', 'a@ejemplo.com')`)).rejects.toThrow(/permission denied/)
        await expect(db.query('select * from public.lk_vinculaciones')).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
  })
  it('la revert devuelve cada lugar a su sesión de antes y quita la función y la tabla', async () => {
    const viejo = id(), nuevo = id()
    const c = await alquiler(id(), 'd3@ejemplo.com', viejo, 'r@ejemplo.com')
    await verificar(nuevo, 'r@ejemplo.com', 'apple'); expect(await vincular(nuevo, 'r@ejemplo.com')).toBe(1)
    await db.exec(fs.readFileSync('supabase/revert/20261026060000_vincular_alquileres_revert.sql', 'utf8'))
    expect(await usuarioDe(c, 'inquilino')).toBe(viejo)
    expect((await uno<{ usuario: string }>(`select usuario from public.lk_firmas where contrato_id = $1 and rol = 'inquilino'`, [c]))!.usuario).toBe(viejo)
    expect((await uno<{ f: string | null; t: string | null }>(`select to_regprocedure('public.lk_vincular_alquileres(uuid,text)')::text f, to_regclass('public.lk_vinculaciones')::text t`))).toEqual({ f: null, t: null })
  })
})
