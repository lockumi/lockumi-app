// Paso 19 · Legal, 25/10/2026, 9:00 p. m.: el token de correo de Cavos (iss https://enclave.cavos.xyz) trae aud «cavos-email», la MISMA
// para todas las apps de Cavos, así que la firma y la audiencia no prueban que el login fue en Lockumi. Con ese token el correo solo
// queda verificado con el código de 6 números que manda Lockumi (lk_usar_codigo, acción 'verificar_correo'; migración
// 20261025210000_verificar_correo_codigo.sql). Google y Apple no cambian (nonce con el App ID). Contra la migración real (PGlite): el
// fetch falso hace de JWKS de los emisores, de Supabase (auth y RPC con la clave de servicio o con la sesión) y de Resend.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { atenderVerificacion, EMISORES, AUD_EMAIL_COMPARTIDA } from '../../../api/_lib/cavos-token'
import { atenderCodigo, ERRORES } from '../../../api/_lib/codigo-correo'
import { SEGUNDO_FACTOR } from '../../reputacion/textos'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now(), email_inquilino text);
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated, service_role; grant usage on schema auth to anon, authenticated, service_role;`
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
const activo = async (u: string) => (await uno<{ c: string | null }>('select public.lk_correo_activo($1) c', [u])).c
const codigoDe = (c: Correo) => /^Tu código de Lockumi: (\d{6})$/.exec(c.subject)![1]!
const otro = (c: string) => String((Number(c) + 1) % 1_000_000).padStart(6, '0')

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  await db.exec(`create or replace function public.lk_intento_verificacion(p_clave text, p_max int, p_ventana interval) returns boolean language sql as $$ select true $$`)
  for (let i = 0; i < 2; i++) await db.exec(fs.readFileSync('supabase/migrations/20261025210000_verificar_correo_codigo.sql', 'utf8'))   // idempotente
  enclave = await llaves('ES256', 'e1'); google = await llaves('RS256', 'g1')
  jwks = { [EMISORES.email.jwks]: { keys: [enclave.jwk] }, [EMISORES.google.jwks]: { keys: [google.jwk] } }
}, 60_000)

describe('token de correo de Cavos con aud «cavos-email»: hace falta el código de Lockumi', () => {
  it('un token «cavos-email» VÁLIDO sin el código da 403: el correo NO queda verificado y Lockumi manda el código a ese correo', async () => {
    const u = await sesion(), c = 'ana@ejemplo.com', antes = enviados.length
    const r = await verificar(u, await tokenCorreo(' Ana@Ejemplo.com'))
    expect(r.estado).toBe(403)
    expect(r.cuerpo).toMatchObject({ correo: c, codigo: true })
    expect(await verificado(u)).toEqual([]); expect(await activo(u)).toBeNull()
    expect(enviados.length).toBe(antes + 1)
    const m = enviados.at(-1)!
    expect(m.to).toEqual([c]); expect(m.subject).toBe(`Tu código de Lockumi: ${codigoDe(m)}`)
    expect(m.text).toContain('Escribe este código en Lockumi para confirmar tu correo. Vale 10 minutos.')
    const fila = await uno<{ accion: string; huella: string }>('select accion, huella from public.lk_codigos_correo where usuario = $1', [u])
    expect(fila.accion).toBe('verificar_correo'); expect(JSON.stringify(fila)).not.toContain(codigoDe(m))   // solo la huella
    // Con la sesión (authenticated), tampoco hay correo para eliminar o descargar.
    expect((await codigo(u, { paso: 'pedir', accion: 'eliminar' })).cuerpo).toMatchObject({ motivo: 'correo' })
  })
  it('con el código correcto queda verificado (método email) y es su correo activo; el código no sirve dos veces', async () => {
    const u = await sesion(), c = 'bruno@ejemplo.com'
    expect((await verificar(u, await tokenCorreo(c))).estado).toBe(403)
    const cod = codigoDe(enviados.at(-1)!)
    expect(await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: otro(cod) })).toEqual({ estado: 403, cuerpo: { error: ERRORES.codigo, motivo: 'codigo' } })
    expect(await verificado(u)).toEqual([])
    expect(await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).toEqual({ estado: 200, cuerpo: { hecho: true, correo: c } })
    expect(await verificado(u)).toEqual([{ correo: c, metodo: 'email' }]); expect(await activo(u)).toBe(c)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_correos_por_confirmar where usuario = $1', [u])).n).toBe(0)
    expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).estado).toBe(403)   // un solo uso
    // Ya verificado: el segundo factor de siempre va a ese correo (aquí 429 «minuto»: el límite es por correo, el código de recién cuenta).
    expect((await codigo(u, { paso: 'pedir', accion: 'eliminar' })).cuerpo).toMatchObject({ correo: c })
  })
  it('el código solo vale para la sesión y el correo del token: otra sesión con ese código no verifica nada', async () => {
    const u = await sesion(), otra = await sesion(), c = 'carla@ejemplo.com'
    await verificar(u, await tokenCorreo(c)); const cod = codigoDe(enviados.at(-1)!)
    expect((await codigo(otra, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).estado).toBe(403)
    expect(await verificado(otra)).toEqual([])
    expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).estado).toBe(200)
  })
  it('el token es de un solo uso: otra sesión con el mismo token → 403 sin código ni correo por confirmar; la misma sesión (recargó) → 403 y sigue esperando el código, sin mandar otro', async () => {
    const u = await sesion(), otra = await sesion(), c = 'dario@ejemplo.com', t = await tokenCorreo(c)
    await verificar(u, t); const antes = enviados.length
    const r = await verificar(otra, t)
    expect(r.estado).toBe(403); expect(r.cuerpo).not.toHaveProperty('codigo')
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_correos_por_confirmar where usuario = $1', [otra])).n).toBe(0)
    expect(await verificar(u, t)).toMatchObject({ estado: 403, cuerpo: { correo: c, codigo: true } })
    expect(enviados.length).toBe(antes)
  })
  it('«Reenviar código»: 1 por minuto y 5 por hora (los mismos límites), y anula el anterior', async () => {
    const u = await sesion(), c = 'eva@ejemplo.com'
    await verificar(u, await tokenCorreo(c)); const primero = codigoDe(enviados.at(-1)!)
    expect(await codigo(u, { paso: 'pedir', accion: 'verificar_correo' })).toEqual({ estado: 429, cuerpo: { error: ERRORES.minuto, motivo: 'minuto', correo: c } })
    await db.query(`update public.lk_codigos_correo set creado_en = creado_en - interval '90 seconds' where correo = $1`, [c])
    expect(await codigo(u, { paso: 'pedir', accion: 'verificar_correo' })).toEqual({ estado: 200, cuerpo: { enviado: true, correo: c } })
    const segundo = codigoDe(enviados.at(-1)!)
    if (segundo !== primero) expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: primero })).estado).toBe(403)
    for (let i = 0; i < 3; i++) { await db.query(`update public.lk_codigos_correo set creado_en = creado_en - interval '90 seconds' where correo = $1`, [c]); expect((await codigo(u, { paso: 'pedir', accion: 'verificar_correo' })).estado).toBe(200) }
    await db.query(`update public.lk_codigos_correo set creado_en = creado_en - interval '90 seconds' where correo = $1`, [c])
    expect((await codigo(u, { paso: 'pedir', accion: 'verificar_correo' })).cuerpo).toMatchObject({ motivo: 'hora' })
  })
  it('5 intentos: después del quinto código mal, ni el correcto verifica', async () => {
    const u = await sesion(), c = 'fer@ejemplo.com'
    await verificar(u, await tokenCorreo(c)); const cod = codigoDe(enviados.at(-1)!)
    for (let i = 0; i < 5; i++) expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: otro(cod) })).estado).toBe(403)
    expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).estado).toBe(403)
    expect(await verificado(u)).toEqual([])
  })
  it('vence a los 10 minutos', async () => {
    const u = await sesion(), c = 'gabi@ejemplo.com'
    await verificar(u, await tokenCorreo(c)); const cod = codigoDe(enviados.at(-1)!)
    await db.query(`update public.lk_codigos_correo set vence_en = clock_timestamp() - interval '1 second' where correo = $1`, [c])
    expect((await codigo(u, { paso: 'confirmar', accion: 'verificar_correo', codigo: cod })).estado).toBe(403)
    expect(await verificado(u)).toEqual([])
  })
  it('sin un código confirmado, lk_confirmar_correo_pendiente rechaza (28000) y no registra nada', async () => {
    const u = await sesion(), c = 'hugo@ejemplo.com'
    await verificar(u, await tokenCorreo(c))
    await expect(db.query('select public.lk_confirmar_correo_pendiente($1)', [u])).rejects.toThrow(/Ese código no es correcto o ya venció/)
    expect(await verificado(u)).toEqual([])
  })
  it('la app (anon o authenticated) no lee las tablas ni llama a las funciones nuevas', async () => {
    const u = await sesion()
    for (const rol of ['anon', 'authenticated']) {
      await db.exec(`set role ${rol}`)
      try {
        await expect(db.query('select * from public.lk_correos_por_confirmar')).rejects.toThrow(/permission denied/)
        for (const fn of [`lk_correo_pendiente('${u}')`, `lk_correo_por_confirmar('${u}', 'x@ejemplo.com', '${'a'.repeat(64)}')`, `lk_correo_para_codigo('${u}', 'verificar_correo')`, `lk_confirmar_correo_pendiente('${u}')`])
          await expect(db.query(`select public.${fn}`), `${rol}: ${fn}`).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
  })
})

describe('Google y Apple no cambian; un aud de correo propio de Lockumi tampoco pide el código', () => {
  it('Google con el nonce del App ID: 200 y verificado enseguida, sin código', async () => {
    const u = await sesion(), antes = enviados.length
    const t = await firmar(google, { iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'gina@ejemplo.com', email_verified: true, sub: 'g-1', iat: seg - 10, exp: seg + 600, nonce: `${APP}.hash` })
    expect(await verificar(u, t)).toEqual({ estado: 200, cuerpo: { correo: 'gina@ejemplo.com' } })
    expect(await verificado(u)).toEqual([{ correo: 'gina@ejemplo.com', metodo: 'google' }]); expect(enviados.length).toBe(antes)
    const ajeno = await firmar(google, { iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'gina@ejemplo.com', email_verified: true, sub: 'g-2', iat: seg - 10, exp: seg + 600, nonce: 'otra-app.hash' })
    expect((await verificar(await sesion(), ajeno)).estado).toBe(403)   // nonce de otra app: sigue rechazado
  })
  it('si algún día el enclave da un aud propio de Lockumi (CAVOS_AUD_EMAIL ≠ «cavos-email»), se registra como antes', async () => {
    const u = await sesion()
    const t = await firmar(enclave, { iss: 'https://enclave.cavos.xyz', aud: 'aud-propia-lockumi', email: 'ines@ejemplo.com', sub: 'e-propio', iat: seg - 10, exp: seg + 600 })
    expect(await atenderVerificacion({ ...ENV, CAVOS_AUD_EMAIL: 'aud-propia-lockumi' }, `Bearer sesion-${u}`, { token: t }, f, AHORA)).toEqual({ estado: 200, cuerpo: { correo: 'ines@ejemplo.com' } })
  })
})

describe('textos literales de Legal (9:00 p. m.)', () => {
  it('pantalla «Revisa tu correo» y el correo del código', () => {
    expect(SEGUNDO_FACTOR.titulo).toBe('Revisa tu correo')
    expect(SEGUNDO_FACTOR.texto.verificar_correo).toBe('Te enviamos un código de 6 números a {correo}. Escríbelo aquí para confirmar tu correo.')
  })
})
