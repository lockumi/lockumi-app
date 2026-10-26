// paso21 · Solo el dueño pone las reglas del alquiler. El inquilino las ve y acepta (o no se une), pero no puede cambiarlas por la API:
// lk_contratos no tiene permiso de escritura para anon ni authenticated (RLS + revoke) y ninguna función lk_* cambia «reglas»
// después de crear el alquiler. Quién puede aceptar la invitación: invitacion-correo-verificado-sql.test.ts.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-0000000000d1', INQ = '00000000-0000-4000-8000-0000000000e1'
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const comoRol = async <T>(rol: string, uid: string, f: () => Promise<T>) => { await db.exec(`set role ${rol}`); await como(uid); try { return await f() } finally { await db.exec('reset role') } }
async function crear() {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  return (await uno<{ r: { id: string; token: string } }>(`select public.lk_crear_contrato_invitando('Ejemplo · Casa demo', 20, $1::date, $2::date, '{No fumar dentro de la casa}', 'luis.demo@lockumi.com', 'demo@lockumi.com', $3) r`, [hoy, fin, DECL]))!.r
}

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('reglas: solo el dueño', () => {
  it('el inquilino unido NO puede cambiar las reglas por la API (update directo rechazado) y siguen iguales', async () => {
    const r = await crear()
    await db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, 'luis.demo@lockumi.com', 'email') on conflict do nothing`, [INQ])   // paso 21: correo verificado
    await como(INQ); await db.query(`select public.lk_aceptar_invitacion($1, $2, 'luis.demo@lockumi.com')`, [r.id, r.token])
    expect((await uno<{ rol: string }>(`select rol from public.lk_participantes where contrato_id = $1 and usuario = $2`, [r.id, INQ]))!.rol).toBe('inquilino')
    // Puede VERLAS (RLS de lectura)…
    const ve = await comoRol('authenticated', INQ, () => db.query<{ reglas: string[] }>('select reglas from public.lk_contratos where id = $1', [r.id]))
    expect(ve.rows[0].reglas).toEqual(['No fumar dentro de la casa'])
    // …pero no cambiarlas: ni update, ni insert, ni delete (PostgREST usa estos mismos permisos).
    await expect(comoRol('authenticated', INQ, () => db.query(`update public.lk_contratos set reglas = '{Se permiten mascotas}' where id = $1`, [r.id]))).rejects.toThrow(/permission denied/)
    await expect(comoRol('anon', INQ, () => db.query(`update public.lk_contratos set reglas = '{}' where id = $1`, [r.id]))).rejects.toThrow(/permission denied/)
    await expect(comoRol('authenticated', INQ, () => db.query(`delete from public.lk_contratos where id = $1`, [r.id]))).rejects.toThrow(/permission denied/)
    // El dueño tampoco las cambia después de crear (no hay función para eso): quedan como se firmaron.
    await expect(comoRol('authenticated', DUENO, () => db.query(`update public.lk_contratos set reglas = '{}' where id = $1`, [r.id]))).rejects.toThrow(/permission denied/)
    expect((await uno<{ reglas: string[] }>('select reglas from public.lk_contratos where id = $1', [r.id]))!.reglas).toEqual(['No fumar dentro de la casa'])
  })
  it('authenticated no tiene UPDATE/INSERT/DELETE sobre lk_contratos, y ninguna función lk_* que pueda ejecutar escribe «reglas» salvo al crear', async () => {
    const p = await uno<{ u: boolean; i: boolean; d: boolean }>(`select has_table_privilege('authenticated', 'public.lk_contratos', 'UPDATE') u, has_table_privilege('authenticated', 'public.lk_contratos', 'INSERT') i, has_table_privilege('authenticated', 'public.lk_contratos', 'DELETE') d`)
    expect(p).toEqual({ u: false, i: false, d: false })
    expect((await uno<{ u: boolean }>(`select has_column_privilege('authenticated', 'public.lk_contratos', 'reglas', 'UPDATE') u`))!.u).toBe(false)
    const fs = (await db.query<{ f: string }>(`select p.proname f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'lk\\_%' and has_function_privilege('authenticated', p.oid, 'EXECUTE') and p.prosrc ~* 'reglas'`)).rows.map(x => x.f).sort()
    // Solo las de crear (quien crea queda como DUEÑO) y la de ver la invitación (lectura).
    expect(fs).toEqual(['lk_crear_contrato', 'lk_crear_contrato_con_terminos', 'lk_crear_contrato_invitando', 'lk_ver_invitacion'])
    const src = (await db.query<{ s: string }>(`select prosrc s from pg_proc where proname = any($1)`, [fs])).rows.map(x => x.s).join('\n')
    expect(src).not.toMatch(/update\s+public\.lk_contratos\s+set[^;]*reglas/i)
    expect((await uno<{ s: string }>(`select prosrc s from pg_proc where proname = 'lk_crear_contrato'`))!.s).toMatch(/values \(v_id, 'dueno', auth\.uid\(\)/)
  })
})
