// Arreglo 26/10/2026 (Katherine, 3:07 p. m.; migración 20261026100000): el inquilino no puede ser la misma cuenta que el dueño ni tener un
// correo del dueño (sin mayúsculas ni espacios), mirando también los correos verificados y el correo real de Apple (lk_correos_reales).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-0000000002d1', A = '00000000-0000-4000-8000-0000000002a1'
const INVITADO = 'luis.demo@lockumi.com', E = '00000000-0000-4000-8000-0000000002e1', F = '00000000-0000-4000-8000-0000000002f1'
const DEL_DUENO = 'Este link es para la otra persona. Cierra sesión o ábrelo en otro dispositivo.'
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
/** Lo que hace el servidor (api/verificar-correo.ts / api/codigo-correo.ts, clave de servicio) después de comprobar el inicio de sesión. */
const verificar = async (uid: string, correo: string) => { await db.query(`insert into auth.users(id) values ($1) on conflict do nothing`, [uid]); return db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, $2, 'email') on conflict do nothing`, [uid, correo]) }
const aceptar = async (uid: string, id: string, token: string, correoApp: string) => {
  await como(uid); await db.exec('set role authenticated')
  try { await db.query(`select public.lk_aceptar_invitacion($1, $2, $3)`, [id, token, correoApp]) } finally { await db.exec('reset role') }
}
async function crear(email = '  Luis.Demo@Lockumi.com ') {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  return (await uno<{ r: { id: string; token: string } }>(`select public.lk_crear_contrato_invitando('Ejemplo · Casa demo', 20, $1::date, $2::date, '{No fumar}', $3, 'demo@lockumi.com', $4) r`, [hoy, fin, email, DECL]))!.r
}
const inquilino = async (id: string) => (await uno<{ usuario: string; email_cavos: string }>(`select usuario, email_cavos from public.lk_participantes where contrato_id = $1 and rol = 'inquilino'`, [id]))

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.exec('grant usage on schema public to authenticated')
  
}, 60_000)

const ver = async (uid: string, id: string, token: string) => {
  await como(uid); await db.exec('set role authenticated')
  try { return (await uno<{ r: { es_dueno: boolean } }>(`select public.lk_ver_invitacion($1, $2) r`, [id, token]))!.r.es_dueno } finally { await db.exec('reset role') }
}

describe('el inquilino no puede ser el dueño (misma cuenta o mismo correo)', () => {
  it('otra cuenta con el correo del dueño (con mayúsculas) y el correo invitado verificados: se rechaza con el texto de la app; no se une', async () => {
    const r = await crear(); await verificar(E, INVITADO); await verificar(E, 'demo@lockumi.com')
    expect(await ver(E, r.id, r.token)).toBe(true)
    await expect(aceptar(E, r.id, r.token, ' DEMO@Lockumi.com')).rejects.toThrow(DEL_DUENO)
    expect(await inquilino(r.id)).toBeUndefined()
  })
  it('si el dueño verificó el correo invitado en su aparato, la persona invitada de verdad igual se une', async () => {
    const r = await crear(), G = '00000000-0000-4000-8000-0000000002a7'
    await verificar(DUENO, INVITADO); await verificar(G, INVITADO)
    await aceptar(G, r.id, r.token, INVITADO)
    expect((await inquilino(r.id))!.usuario).toBe(G)
  })
  it('Apple con correo oculto cuyo correo real es el del dueño: se rechaza', async () => {
    const r = await crear(), relay = 'zz9@privaterelay.appleid.com'
    await verificar(F, INVITADO); await verificar(F, relay)
    await db.query(`insert into public.lk_correos_reales(correo_apple, correo_real, usuario) values ($1, 'demo@lockumi.com', $2)`, [relay, F])
    await expect(aceptar(F, r.id, r.token, INVITADO)).rejects.toThrow(DEL_DUENO)
    expect(await inquilino(r.id)).toBeUndefined()
  })
  it('la misma cuenta del dueño tampoco se une (también por inserción directa) y la invitada de verdad sí', async () => {
    const r = await crear()
    expect(await ver(DUENO, r.id, r.token)).toBe(true)
    await expect(db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'otro@lockumi.com')`, [r.id, DUENO])).rejects.toThrow()
    await verificar(A, INVITADO); expect(await ver(A, r.id, r.token)).toBe(false)
    await aceptar(A, r.id, r.token, INVITADO)
    expect((await inquilino(r.id))!.usuario).toBe(A)
  })
})
