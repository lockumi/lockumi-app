// Paso 22 · supabase/revert/20261026000000_devolucion_automatica_revert.sql en Postgres (PGlite, todas las migraciones): quita las
// 4 funciones y las 6 columnas pago_* y su fila de schema_migrations, sin tocar el resto; la migración se puede volver a aplicar.
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
const FUNCIONES = ['lk_devoluciones_pendientes', 'lk_tomar_pago', 'lk_anotar_pago_pendiente', 'lk_soltar_pago']
let db: PGlite, leer: (p: string) => string
const estado = async () => ({
  columnas: (await db.query<{ c: string }>(`select column_name c from information_schema.columns where table_schema = 'public' and table_name = 'lk_contratos' and column_name like 'pago\\_%' order by 1`)).rows.map(r => r.c),
  funciones: (await db.query<{ f: string }>(`select proname f from pg_proc where proname = any($1) order by 1`, [FUNCIONES])).rows.map(r => r.f),
  fila: (await db.query(`select 1 from supabase_migrations.schema_migrations where version = '20261026000000'`)).rows.length,
  todas: Number((await db.query<{ n: number }>(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`)).rows[0].n),
})

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  leer = p => fs.readFileSync(p, 'utf8')
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(leer('supabase/migrations/' + m))
  await db.exec(`insert into supabase_migrations.schema_migrations values ('20261026000000', 'devolucion_automatica', array[$x$${'-'}$x$])`)
}, 60_000)

describe('revert de 20261026000000 (paso 22)', () => {
  it('quita exactamente lo que agrega la migración, y la migración se puede volver a aplicar', async () => {
    const antes = await estado()
    expect(antes.columnas).toEqual(['pago_bloqueo_hasta', 'pago_bloqueo_token', 'pago_error', 'pago_intentos', 'pago_revisar', 'pago_tx_pendiente'])
    expect(antes.funciones).toHaveLength(4); expect(antes.fila).toBe(1)
    await db.exec(leer('supabase/revert/20261026000000_devolucion_automatica_revert.sql'))
    const despues = await estado()
    expect(despues).toEqual({ columnas: [], funciones: [], fila: 0, todas: antes.todas - 4 })
    await db.exec(leer('supabase/migrations/20261026000000_devolucion_automatica.sql'))
    expect((await estado()).columnas).toEqual(antes.columnas); expect((await estado()).funciones).toHaveLength(4)
  })
})
