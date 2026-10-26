// Login con código por correo de Cavos (26/10/2026): el correo del token del enclave («cavos-email», validado en el servidor) confirmado
// con el código queda con método «cavos-email» y trae los alquileres de ese correo; el código de invitación de Lockumi («email») no.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { atenderVerificacion, EMISORES, AUD_EMAIL_COMPARTIDA } from '../../../api/_lib/cavos-token'
import { atenderCodigo } from '../../../api/_lib/codigo-correo'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key, name text);`
const URL_SB = 'https://proyecto.supabase.co', PEPPER = 'pepper-de-prueba-'.repeat(3)
const APP = '00000000-0000-4000-8000-0000000000aa'
const ENV = { CAVOS_AUD_GOOGLE: 'aud-google-de-cavos', CAVOS_AUD_APPLE: 'aud-apple-de-cavos', CAVOS_AUD_EMAIL: AUD_EMAIL_COMPARTIDA, CAVOS_APP_ID: APP,
  SUPABASE_URL: URL_SB, SUPABASE_ANON_KEY: 'anon-de-prueba', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba', RESEND_API_KEY: 're_de_prueba', LOCKUMI_CODIGO_PEPPER: PEPPER }
const AHORA = Date.parse('2026-10-25T22:30:00Z'), seg = Math.floor(AHORA / 1000)

const b64u = (b: ArrayBuffer | Uint8Array | string) => {
  const u = typeof b === 'string' ? new TextEncoder().encode(b) : b instanceof Uint8Array ? b : new Uint8Array(b)
  return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
type Llaves = { privada: CryptoKey; jwk: JsonWebKey & { kid: string; alg: string; use: string } }
async function llaves(alg: 'ES256' | 'RS256', kid: string): Promise<Llaves> {
  const par = alg === 'ES256'
    ? await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    : await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  return { privada: par.privateKey, jwk: { ...await crypto.subtle.exportKey('jwk', par.publicKey), kid, alg, use: 'sig' } }
}
async function firmar(k: Llaves, claims: Record<string, unknown>) {
  const cab = b64u(JSON.stringify({ alg: k.jwk.alg, kid: k.jwk.kid, typ: 'JWT' })), cuerpo = b64u(JSON.stringify(claims))
  const algo = k.jwk.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' }
  return `${cab}.${cuerpo}.${b64u(await crypto.subtle.sign(algo, k.privada, new TextEncoder().encode(`${cab}.${cuerpo}`)))}`
}

let n = 0, db: PGlite, enclave: Llaves, google: Llaves, jwks: Record<string, unknown>
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
type Correo = { to: string[]; subject: string; html: string; text: string }
const enviados: Correo[] = []
const f = vi.fn(async (url: string, init?: RequestInit) => {
  const h = (init?.headers ?? {}) as Record<string, string>
  if (url in jwks) return new Response(JSON.stringify(jwks[url]), { status: 200 })
  if (url === 'https://api.resend.com/emails') { enviados.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: `re_${enviados.length}` }), { status: 200 }) }
  if (url === `${URL_SB}/auth/v1/user`) { const m = /^Bearer sesion-(.+)$/.exec(h.authorization ?? ''); return m ? new Response(JSON.stringify({ id: m[1] })) : new Response('{}', { status: 401 }) }
  const m = new RegExp(`^${URL_SB}/rest/v1/rpc/(lk_[a-z_]+)$`).exec(url)
  if (!m) return new Response('{}', { status: 404 })
  const args = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, ks = Object.keys(args)
  const servicio = h.authorization === 'Bearer servicio-de-prueba' && h.apikey === 'servicio-de-prueba'
  const sesion = /^Bearer sesion-(.+)$/.exec(h.authorization ?? '')?.[1]
  if (!servicio && !(sesion && h.apikey === 'anon-de-prueba')) return new Response('{}', { status: 401 })
  try {
    await db.query(`select set_config('test.uid', $1, false)`, [servicio ? '' : sesion])
    if (!servicio) await db.exec('set role authenticated')
    const r = await uno<{ r: unknown }>(`select public.${m[1]}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`, ks.map(k => args[k]))
    return new Response(JSON.stringify(r.r), { status: 200 })
  } catch (e) {   // como PostgREST: 23505 → 409, 28000 → 403
    const code = (e as { code?: string }).code
    return new Response(JSON.stringify({ message: (e as Error).message }), { status: code === '23505' ? 409 : code === '28000' ? 403 : 400 })
  } finally { await db.exec('reset role'); await db.query(`select set_config('test.uid', '', false)`) }
}) as unknown as typeof fetch

async function sesion() { const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u]); return u }
let k = 0
/** Un token de correo del enclave de Cavos (ES256, aud «cavos-email»), como el que guarda el kit 0.4.2 después del código de Cavos. */
const tokenCorreo = (correo: string, extra: Record<string, unknown> = {}) =>
  firmar(enclave, { iss: 'https://enclave.cavos.xyz', aud: 'cavos-email', email: correo, sub: `enclave-${++k}`, iat: seg - 10, exp: seg + 600, nonce: `otra-app.hash-${k}`, ...extra })
const verificar = (u: string, token: string) => atenderVerificacion(ENV, `Bearer sesion-${u}`, { token }, f, AHORA, null, 'http://localhost:4319')
const codigo = (u: string, body: Record<string, unknown>) => atenderCodigo(ENV, `Bearer sesion-${u}`, body, 'http://localhost:4319', f)
const verificado = async (u: string) => (await db.query<{ correo: string; metodo: string }>('select correo, metodo from public.lk_correos_verificados where usuario = $1', [u])).rows
const codigoDe = (c: Correo) => /^Tu código de Lockumi: (\d{6})$/.exec(c.subject)![1]!

let fs: { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
beforeAll(async () => {
  fs = await import(['node', 'fs'].join(':')) as typeof fs
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(x => x.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.exec('grant usage on schema public to anon, authenticated, service_role')
  await db.exec(`create or replace function public.lk_intento_verificacion(p_clave text, p_max int, p_ventana interval) returns boolean language sql as $$ select true $$`)
  enclave = await llaves('ES256', 'e1'); google = await llaves('RS256', 'g1')
  jwks = { [EMISORES.email.jwks]: { keys: [enclave.jwk] }, [EMISORES.google.jwks]: { keys: [google.jwk] } }
}, 60_000)
async function alquilerDe(inquilino: string, correo: string) {
  const c = uid(), dueno = await sesion()
  await db.query(`insert into public.lk_contratos(id, estado, creado_por, direccion, monto, inicio, fin, email_inquilino) values ($1, 'pendiente_pago', $2, 'Casa demo', 1, current_date, current_date + 60, $3)`, [c, dueno, correo])
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'dueno', $2, 'dueno@ejemplo.com'), ($1, 'inquilino', $3, $4)`, [c, dueno, inquilino, correo])
  return c
}
const inquilinoDe = async (c: string) => (await uno<{ usuario: string }>(`select usuario from public.lk_participantes where contrato_id = $1 and rol = 'inquilino'`, [c])).usuario

describe('login con código por correo de Cavos («cavos-email»): también trae los alquileres (migración 20261026070000)', () => {
  it('token del enclave validado + código a ese correo → método «cavos-email» y el lugar pasa a la sesión nueva; sin código, nada', async () => {
    const viejo = await sesion(), c = 'carla@ejemplo.com', k = await alquilerDe(viejo, c), nueva = await sesion()
    expect((await verificar(nueva, await tokenCorreo(c))).estado).toBe(403)       // falta el código: no se mueve nada
    expect(await inquilinoDe(k)).toBe(viejo)
    const r = await codigo(nueva, { paso: 'confirmar', accion: 'verificar_correo', codigo: codigoDe(enviados.at(-1)!) })
    expect(r).toEqual({ estado: 200, cuerpo: { hecho: true, correo: c, vinculados: 1 } })
    expect(await verificado(nueva)).toEqual([{ correo: c, metodo: 'cavos-email' }])
    expect(await inquilinoDe(k)).toBe(nueva)
  })
  it('el código de invitación de Lockumi (método «email») nunca trae alquileres', async () => {
    const viejo = await sesion(), c = 'ines@ejemplo.com', k = await alquilerDe(viejo, c), nueva = await sesion()
    await db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, $2, 'email')`, [nueva, c])
    expect((await uno<{ n: number }>('select public.lk_vincular_alquileres($1, $2) n', [nueva, c])).n).toBe(0)
    expect(await inquilinoDe(k)).toBe(viejo)
  })
  it('la revert deja «cavos-email» como «email» y la función vuelve a google/apple', async () => {
    await db.exec(fs.readFileSync('supabase/revert/20261026070000_vincular_cavos_email_revert.sql', 'utf8'))
    expect((await uno<{ n: number }>(`select count(*)::int n from public.lk_correos_verificados where metodo = 'cavos-email'`)).n).toBe(0)
    const fn = (await uno<{ s: string }>(`select prosrc s from pg_proc where proname = 'lk_vincular_alquileres'`)).s
    expect(fn).not.toContain('cavos-email')
  })
})
