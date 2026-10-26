// Katherine (26/10, 2:26 a. m.): 20261026030000_sin_bloqueo_perfil.sql quita el bloqueo «Antes de crear un alquiler o unirte a uno…» (disparador
// y función); el revert lo devuelve con el mensaje de 20261026020000 y borra su fila. PGlite con todas las migraciones.
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
  create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key, name text, statements text[]);`
const MIG = 'supabase/migrations/20261026030000_sin_bloqueo_perfil.sql', REV = 'supabase/revert/20261026030000_sin_bloqueo_perfil_revert.sql'
let db: PGlite, leer: (p: string) => string
const hay = async () => (await db.query(`select 1 from pg_trigger where tgname = 'lk_sin_perfil_tras_encendido'`)).rows.length + (await db.query(`select 1 from pg_proc where proname = 'lk_sin_perfil_tras_encendido'`)).rows.length

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  leer = p => fs.readFileSync(p, 'utf8')
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(leer('supabase/migrations/' + m))
  await db.exec(`insert into supabase_migrations.schema_migrations values ('20261026030000', 'sin_bloqueo_perfil', array[$x$${'-'}$x$])`)
}, 60_000)

describe('20261026030000 · sin bloqueo para cuentas sin perfil', () => {
  it('después de todas las migraciones no queda el disparador ni su función (ni el mensaje)', async () => {
    expect(await hay()).toBe(0)
  })
  it('el revert lo devuelve con el mensaje de 20261026020000 y quita su fila; se puede volver a aplicar', async () => {
    await db.exec(leer(REV)); expect(await hay()).toBe(2)
    expect((await db.query<{ d: string }>(`select prosrc d from pg_proc where proname = 'lk_sin_perfil_tras_encendido'`)).rows[0].d).toContain('acepta los Términos 1.13-demo')
    expect((await db.query(`select 1 from supabase_migrations.schema_migrations where version = '20261026030000'`)).rows.length).toBe(0)
    await db.exec(leer(MIG)); expect(await hay()).toBe(0)
  })
})
