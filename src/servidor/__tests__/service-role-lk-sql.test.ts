// 20261025080000_service_role_lk.sql probada en Postgres (PGlite) con los privilegios por defecto del proyecto de producción:
// las tablas nuevas de postgres dan a service_role solo Dxtm y las secuencias, nada. El servidor de Trustless Work (api/_lib/tw.ts)
// lee y escribe lk_contratos y lk_eventos con la clave de servicio.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
  alter default privileges in schema public grant delete, truncate, references, trigger on tables to anon, authenticated, service_role;
  alter default privileges in schema public revoke all on sequences from public, anon, authenticated, service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const MIG = '20261025080000_service_role_lk.sql'
const ACL = `select c.relname n, coalesce(array_to_string(array(select a::text from unnest(coalesce(c.relacl, acldefault(case c.relkind when 'S' then 's' else 'r' end::"char", c.relowner))) a where a::text not like 'service_role=%' order by 1), ','), '') acl
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'S') order by 1`
let db: PGlite, antes: { n: string; acl: string }[], leiaAntes: boolean
const tablas = async () => (await db.query<{ t: string }>(`select tablename t from pg_tables where schemaname = 'public' and tablename like 'lk\\_%' order by 1`)).rows.map(r => r.t)

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  const todas = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  for (const m of todas.filter(f => f !== MIG)) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  antes = (await db.query<{ n: string; acl: string }>(ACL)).rows
  leiaAntes = (await db.query<{ ok: boolean }>(`select has_table_privilege('service_role', 'public.lk_contratos', 'select') ok`)).rows[0].ok
  await db.exec(fs.readFileSync('supabase/migrations/' + MIG, 'utf8'))
}, 60_000)

describe('080000 · permisos de service_role en lk_*', () => {
  it('sin la migración, service_role no puede leer lk_contratos (como en producción)', () => {
    expect(leiaAntes).toBe(false)
  })
  it('service_role puede leer, insertar, actualizar y borrar en todas las tablas lk_*', async () => {
    const ts = await tablas(); expect(ts).toContain('lk_contratos'); expect(ts).toContain('lk_eventos'); expect(ts).toContain('lk_mediadores')
    for (const t of ts) for (const p of ['select', 'insert', 'update', 'delete'])
      expect((await db.query<{ ok: boolean }>(`select has_table_privilege('service_role', $1, $2) ok`, ['public.' + t, p])).rows[0].ok, `${t} ${p}`).toBe(true)
  })
  it('service_role puede usar la secuencia de lk_eventos', async () => {
    expect((await db.query<{ ok: boolean }>(`select has_sequence_privilege('service_role', 'public.lk_eventos_id_seq', 'usage') ok`)).rows[0].ok).toBe(true)
  })
  it('no cambia los permisos de anon, authenticated ni de otras tablas', async () => {
    expect((await db.query<{ n: string; acl: string }>(ACL)).rows).toEqual(antes)
  })
  it('anon y authenticated siguen sin poder escribir en lk_contratos', async () => {
    for (const r of ['anon', 'authenticated']) for (const p of ['insert', 'update'])
      expect((await db.query<{ ok: boolean }>(`select has_table_privilege($1, 'public.lk_contratos', $2) ok`, [r, p])).rows[0].ok).toBe(false)
  })
})
