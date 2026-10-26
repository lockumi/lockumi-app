// Paso 21 · Legal 25/10/2026, 10:10 p. m.: la invitación solo se acepta si el correo invitado (lower + trim) está en
// lk_correos_verificados para la sesión que acepta (migración 20261025230000). El correo que manda la app (p_email_cavos) no decide.
// Se mantiene: huella del token, un solo uso, 7 días y el dueño no acepta. PGlite con todas las migraciones, como reglas-solo-dueno-sql.
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
const DUENO = '00000000-0000-4000-8000-0000000002d1', A = '00000000-0000-4000-8000-0000000002a1', B = '00000000-0000-4000-8000-0000000002b1', C = '00000000-0000-4000-8000-0000000002c1'
const INVITADO = 'luis.demo@lockumi.com'
const OTRO_CORREO = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
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
  await db.exec(fs.readFileSync('supabase/migrations/20261025230000_invitacion_correo_verificado.sql', 'utf8'))   // idempotente
  await db.exec('grant usage on schema public to authenticated')
  for (const u of [A, B, C]) await como(u)
}, 60_000)

describe('aceptar la invitación: solo con el correo invitado verificado para ESTA sesión', () => {
  it('NEGATIVA: la sesión B, con OTRO correo verificado, manda el correo invitado y recibe el texto de Legal; no se une', async () => {
    const r = await crear(); await verificar(B, 'otra.persona@lockumi.com')
    await expect(aceptar(B, r.id, r.token, INVITADO)).rejects.toThrow(OTRO_CORREO)
    expect(await inquilino(r.id)).toBeUndefined()
    // El link sigue sirviendo para la persona correcta (el intento fallido no lo gasta).
    await verificar(A, INVITADO); await aceptar(A, r.id, r.token, INVITADO)
    expect((await inquilino(r.id))!.usuario).toBe(A)
  })
  it('POSITIVA: la sesión A, con el correo invitado verificado, acepta (aunque la app mande mayúsculas o espacios) y queda ese correo', async () => {
    const r = await crear(); await verificar(A, INVITADO)
    await aceptar(A, r.id, r.token, '  LUIS.demo@lockumi.COM ')
    expect(await inquilino(r.id)).toEqual({ usuario: A, email_cavos: INVITADO })
  })
  it('lo que mande la app no cuenta: con el correo invitado verificado, aunque p_email_cavos sea otro, se guarda el verificado', async () => {
    const r = await crear(); await verificar(C, INVITADO)
    await aceptar(C, r.id, r.token, 'cualquiera@otro.com')
    expect((await inquilino(r.id))!.email_cavos).toBe(INVITADO)
  })
  it('una sesión SIN correo verificado no acepta (texto ya aprobado: «No pudimos confirmar el correo de tu cuenta…»)', async () => {
    const r = await crear(); const S = '00000000-0000-4000-8000-0000000002e1'
    await expect(aceptar(S, r.id, r.token, INVITADO)).rejects.toThrow(/No pudimos confirmar el correo de tu cuenta\. Sal de Lockumi, vuelve a entrar con tu correo/)
  })
  it('se mantiene: token con huella, un solo uso (el primero que acepta) y el dueño no acepta', async () => {
    const r = await crear(); await verificar(DUENO, INVITADO)
    await expect(aceptar(DUENO, r.id, r.token, INVITADO)).rejects.toThrow(/Eres el dueño/)
    await verificar(A, INVITADO)
    await expect(aceptar(A, r.id, 'ef'.repeat(32), INVITADO)).rejects.toThrow(/ya no está disponible/)
    await aceptar(A, r.id, r.token, INVITADO)
    await verificar(B, INVITADO)
    await expect(aceptar(B, r.id, r.token, INVITADO)).rejects.toThrow('Esta invitación ya no está disponible. Si todavía la necesitas, pídele al dueño que te envíe una nueva.')
    expect((await uno<{ h: string | null }>(`select invitacion_hash h from public.lk_contratos where id = $1`, [r.id]))!.h).toBeNull()
  })
  it('se mantiene: vence a los 7 días', async () => {
    const r = await crear(); await verificar(A, INVITADO)
    expect((await uno<{ ok: boolean }>(`select invitacion_expira <= now() + interval '7 days 1 minute' ok from public.lk_contratos where id = $1`, [r.id]))!.ok).toBe(true)
    await db.query(`alter table public.lk_contratos disable trigger lk_invitacion_7_dias`)
    await db.query(`update public.lk_contratos set invitacion_expira = now() - interval '1 minute' where id = $1`, [r.id])
    await db.query(`alter table public.lk_contratos enable trigger lk_invitacion_7_dias`)
    await expect(aceptar(A, r.id, r.token, INVITADO)).rejects.toThrow(/venci|ya no está disponible/)
  })
  it('la app no puede escribir ni leer lk_correos_verificados (solo el servidor con la clave de servicio)', async () => {
    await como(B); await db.exec('set role authenticated')
    try {
      await expect(db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, $2, 'email')`, [B, INVITADO])).rejects.toThrow(/permission denied/)
      await expect(db.query(`select * from public.lk_correos_verificados`)).rejects.toThrow(/permission denied/)
    } finally { await db.exec('reset role') }
  })
})
