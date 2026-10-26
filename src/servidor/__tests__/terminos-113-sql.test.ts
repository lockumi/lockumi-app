// supabase/migrations/20261026020000_terminos_113_reputacion.sql y su vuelta atrás en PGlite (todas las migraciones): la migración solo
// cambia el mensaje del bloqueo (nombra los Términos 1.13-demo); el revert devuelve el cuerpo de 20261025140000_reputacion.sql byte a byte.
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
const MIG = 'supabase/migrations/20261026020000_terminos_113_reputacion.sql', REV = 'supabase/revert/20261026020000_terminos_113_reputacion_revert.sql'
let db: PGlite, leer: (p: string) => string
const cuerpo = async () => (await db.query<{ d: string }>(`select prosrc d from pg_proc where proname = 'lk_sin_perfil_tras_encendido'`)).rows[0].d
const cuerpoDe = (p: string) => leer(p).match(/function public\.lk_sin_perfil_tras_encendido\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/)![1]

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  leer = p => fs.readFileSync(p, 'utf8')
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(leer('supabase/migrations/' + m))
  await db.exec(`insert into supabase_migrations.schema_migrations values ('20261026020000', 'terminos_113_reputacion', array[$x$${'-'}$x$])`)
}, 60_000)

describe('20261026020000 · Términos 1.13-demo (mensaje del bloqueo)', () => {
  it('el mensaje nombra los Términos 1.13-demo; lk_rep01_pendiente no cambia (no mira la versión)', async () => {
    expect(await cuerpo()).toContain('acepta los Términos 1.13-demo, incluido tu perfil de reputación público, en la app. No tiene ningún costo.')
    expect(leer(MIG)).not.toMatch(/lk_rep01_pendiente\s*\(/)
    expect(leer('supabase/migrations/20261025140000_reputacion.sql').match(/function public\.lk_rep01_pendiente[\s\S]*?\$\$;/)![0]).not.toContain('version')
  })
  it('el revert devuelve el cuerpo de 20261025140000_reputacion.sql, quita su fila y se puede volver a aplicar', async () => {
    await db.exec(leer(REV))
    expect(await cuerpo()).toBe(cuerpoDe('supabase/migrations/20261025140000_reputacion.sql'))
    expect((await db.query(`select 1 from supabase_migrations.schema_migrations where version = '20261026020000'`)).rows.length).toBe(0)
    await db.exec(leer(MIG)); expect(await cuerpo()).toBe(cuerpoDe(MIG))
  })
})
