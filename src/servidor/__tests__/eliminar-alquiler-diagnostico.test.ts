// Diagnóstico (26/10): en master (migraciones hasta 20261026000000, sin la propuesta 20261026010000) NADIE puede borrar ni archivar un alquiler en el servidor compartido. Migraciones reales en PGlite.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite, id = ''
beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql') && f < '20261026010000').sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.query(`select set_config('test.uid', $1, false)`, [DUENO])
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  id = (await db.query<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 20, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL])).rows[0].r.id
}, 60_000)

describe('diagnóstico: eliminar un alquiler', () => {
  it('no hay ninguna función para eliminar, cancelar o archivar un alquiler', async () => {
    const r = await db.query<{ n: string }>(`select proname n from pg_proc where proname like 'lk\\_%' and (proname ~ '(elimin|archiv|ocult)' or (proname ~ 'cancel') or (proname ~ 'borrar' and proname !~ '(cuentas|invitaciones|codigo|mediacion)'))`)
    expect(r.rows.map(x => x.n)).toEqual([])
  })
  it('el estado no admite «cancelado» ni «archivado»', async () => {
    await expect(db.query(`update public.lk_contratos set estado = 'cancelado' where id = $1`, [id])).rejects.toThrow(/check/)
  })
  it('el dueño (authenticated) no puede borrar su alquiler directo en la tabla: no hay permiso de DELETE', async () => {
    await db.exec('set role authenticated')
    await expect(db.query('delete from public.lk_contratos where id = $1', [id])).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
    expect((await db.query('select 1 from public.lk_contratos where id = $1', [id])).rows.length).toBe(1)
  })
})
