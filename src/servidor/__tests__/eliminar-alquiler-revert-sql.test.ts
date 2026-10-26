// supabase/revert/20261026010000_eliminar_ocultar_reiniciar_revert.sql en PGlite (todas las migraciones): quita lo que agrega la migración,
// devuelve lk_ver_invitacion a su cuerpo anterior (byte a byte con 20261017000000_lockumi_e2e.sql) y la migración se puede volver a aplicar.
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
const FUNCIONES = ['lk_borrar_alquiler', 'lk_con_dinero', 'lk_eliminar_alquiler', 'lk_ocultar_alquiler', 'lk_reiniciar_mi_demo', 'lk_se_puede_eliminar', 'lk_se_puede_ocultar']
const MIG = 'supabase/migrations/20261026010000_eliminar_ocultar_reiniciar.sql', REV = 'supabase/revert/20261026010000_eliminar_ocultar_reiniciar_revert.sql'
let db: PGlite, leer: (p: string) => string
const estado = async () => ({
  funciones: (await db.query<{ f: string }>(`select proname f from pg_proc where proname = any($1) order by 1`, [FUNCIONES])).rows.map(r => r.f),
  tabla: (await db.query(`select 1 from information_schema.tables where table_schema = 'public' and table_name = 'lk_ocultos'`)).rows.length,
  fila: (await db.query(`select 1 from supabase_migrations.schema_migrations where version = '20261026010000'`)).rows.length,
  ver: (await db.query<{ d: string }>(`select prosrc d from pg_proc where proname = 'lk_ver_invitacion'`)).rows[0].d,
})
const cuerpoE2E = () => leer('supabase/migrations/20261017000000_lockumi_e2e.sql').match(/function public\.lk_ver_invitacion[\s\S]*?as \$\$([\s\S]*?)\$\$;/)![1]

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  leer = p => fs.readFileSync(p, 'utf8')
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(leer('supabase/migrations/' + m))
  await db.exec(`insert into supabase_migrations.schema_migrations values ('20261026010000', 'eliminar_ocultar_reiniciar', array[$x$${'-'}$x$])`)
}, 60_000)

describe('revert de 20261026010000 (eliminar, ocultar, reiniciar)', () => {
  it('quita lo nuevo, devuelve lk_ver_invitacion como estaba y se puede volver a aplicar', async () => {
    const antes = await estado()
    expect(antes.funciones).toEqual(FUNCIONES); expect(antes.tabla).toBe(1); expect(antes.ver).toContain('Esta invitación ya no está disponible.')
    await db.exec(leer(REV))
    const despues = await estado()
    expect({ ...despues, ver: undefined }).toEqual({ funciones: [], tabla: 0, fila: 0, ver: undefined })
    expect(despues.ver).toBe(cuerpoE2E())
    await db.exec(leer(MIG)); expect((await estado()).funciones).toEqual(FUNCIONES)
  })
})
