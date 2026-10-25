// Paso 19 · Legal, 25/10/2026, 4:23 p. m. (límite 1, bloqueante): el servidor verifica el correo contra el token de Cavos sin tocar el
// login. La app lee el token que el kit YA guarda (CavosAuth.getAuthToken(): el id_token de Google o Apple, o el del enclave de Cavos
// para el código por correo; https://docs.cavos.xyz/docs/auth) y lo manda a POST /api/verificar-correo con su sesión de Supabase.
// La función valida firma (JWKS publicado por el emisor), emisor, audiencia, vencimiento y correo, y solo entonces registra
// (sesión, correo) con la clave de servicio. Todo lo demás se rechaza (cierre por defecto).
import { describe, it, expect, vi } from 'vitest'
import { verificarTokenCavos, atenderVerificacion, EMISORES } from '../../../api/_lib/cavos-token'

const b64u = (b: ArrayBuffer | Uint8Array | string) => {
  const u = typeof b === 'string' ? new TextEncoder().encode(b) : b instanceof Uint8Array ? b : new Uint8Array(b)
  return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
type Llaves = { privada: CryptoKey; jwk: JsonWebKey & { kid: string; alg: string } }
async function llaves(alg: 'ES256' | 'RS256', kid: string): Promise<Llaves> {
  const par = alg === 'ES256'
    ? await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    : await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  return { privada: par.privateKey, jwk: { ...await crypto.subtle.exportKey('jwk', par.publicKey), kid, alg } }
}
async function firmar(k: Llaves, claims: Record<string, unknown>, kid = k.jwk.kid) {
  const cab = b64u(JSON.stringify({ alg: k.jwk.alg, kid, typ: 'JWT' })), cuerpo = b64u(JSON.stringify(claims))
  const algo = k.jwk.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' }
  return `${cab}.${cuerpo}.${b64u(await crypto.subtle.sign(algo, k.privada, new TextEncoder().encode(`${cab}.${cuerpo}`)))}`
}
const AHORA = Date.parse('2026-10-25T22:30:00Z'), seg = Math.floor(AHORA / 1000)
const ENV = { CAVOS_AUDIENCIAS: 'aud-google-de-cavos, aud-enclave-lockumi', SUPABASE_URL: 'https://proyecto.supabase.co', SUPABASE_ANON_KEY: 'anon-de-prueba', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba' }
async function escenario() {
  const google = await llaves('RS256', 'g1'), apple = await llaves('RS256', 'a1'), enclave = await llaves('ES256', 'e1'), intruso = await llaves('RS256', 'g1')
  const jwks: Record<string, unknown> = { [EMISORES.google.jwks]: { keys: [google.jwk] }, [EMISORES.apple.jwks]: { keys: [apple.jwk] }, [EMISORES.email.jwks]: { keys: [enclave.jwk] } }
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (url in jwks) return new Response(JSON.stringify(jwks[url]), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return (init?.headers as Record<string, string> | undefined)?.authorization === 'Bearer sesion-ok'
      ? new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000001' }), { status: 200 }) : new Response('{}', { status: 401 })
    if (url.endsWith('/rest/v1/rpc/lk_registrar_correo_verificado')) return new Response('true', { status: 200 })
    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch & { mock: { calls: [string, RequestInit | undefined][] } }
  const base = { exp: seg + 600, iat: seg - 10, sub: 'u1', nonce: 'x.y' }
  return { google, apple, enclave, intruso, f, base }
}

describe('verificarTokenCavos: el correo sale de un token firmado por Google, Apple o el enclave de Cavos', () => {
  it('acepta los tres emisores con la audiencia configurada y devuelve el correo normalizado y el método', async () => {
    const { google, apple, enclave, f, base } = await escenario()
    expect(await verificarTokenCavos(await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: ' Ana@Ejemplo.com', email_verified: true }), ENV, f, AHORA))
      .toEqual({ correo: 'ana@ejemplo.com', metodo: 'google' })
    expect(await verificarTokenCavos(await firmar(apple, { ...base, iss: 'https://appleid.apple.com', aud: 'aud-google-de-cavos', email: 'b@ejemplo.com', email_verified: 'true' }), ENV, f, AHORA))
      .toEqual({ correo: 'b@ejemplo.com', metodo: 'apple' })
    expect(await verificarTokenCavos(await firmar(enclave, { ...base, iss: 'https://enclave.cavos.xyz', aud: ['otra', 'aud-enclave-lockumi'], email: 'c@ejemplo.com' }), ENV, f, AHORA))
      .toEqual({ correo: 'c@ejemplo.com', metodo: 'email' })
  })
  it('rechaza: firma de otra llave, emisor desconocido, otra audiencia, vencido, sin correo o correo de Google sin verificar', async () => {
    const { google, intruso, f, base } = await escenario(), g = { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true }
    await expect(verificarTokenCavos(await firmar(intruso, g), ENV, f, AHORA)).rejects.toThrow(/firma/)
    await expect(verificarTokenCavos(await firmar(google, { ...g, iss: 'https://evil.example' }), ENV, f, AHORA)).rejects.toThrow(/emisor/)
    await expect(verificarTokenCavos(await firmar(google, { ...g, aud: 'otra-app' }), ENV, f, AHORA)).rejects.toThrow(/audiencia/)
    await expect(verificarTokenCavos(await firmar(google, { ...g, exp: seg - 120 }), ENV, f, AHORA)).rejects.toThrow(/venci/)
    await expect(verificarTokenCavos(await firmar(google, { ...g, email: undefined }), ENV, f, AHORA)).rejects.toThrow(/correo/)
    await expect(verificarTokenCavos(await firmar(google, { ...g, email_verified: false }), ENV, f, AHORA)).rejects.toThrow(/correo/)
    await expect(verificarTokenCavos('no.es.jwt', ENV, f, AHORA)).rejects.toThrow()
    const sinFirma = (await firmar(google, g)).split('.').slice(0, 2).join('.') + '.'
    await expect(verificarTokenCavos(sinFirma, ENV, f, AHORA)).rejects.toThrow()
  })
  it('alg «none» o HS256 nunca valen, aunque el kid exista', async () => {
    const { f, base } = await escenario()
    const cab = b64u(JSON.stringify({ alg: 'HS256', kid: 'g1' })), cuerpo = b64u(JSON.stringify({ ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true }))
    await expect(verificarTokenCavos(`${cab}.${cuerpo}.abc`, ENV, f, AHORA)).rejects.toThrow(/algoritmo/)
  })
  it('sin CAVOS_AUDIENCIAS configurado no verifica nada (cierre por defecto)', async () => {
    const { google, f, base } = await escenario()
    const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true })
    await expect(verificarTokenCavos(t, { ...ENV, CAVOS_AUDIENCIAS: '' }, f, AHORA)).rejects.toThrow(/CAVOS_AUDIENCIAS/)
  })
})

describe('atenderVerificacion (POST /api/verificar-correo)', () => {
  it('con sesión de Supabase y token válido, registra (sesión, correo) con la clave de servicio y no devuelve secretos', async () => {
    const { google, f, base } = await escenario()
    const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
    const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, f, AHORA)
    expect(r).toEqual({ estado: 200, cuerpo: { correo: 'ana@ejemplo.com' } })
    const [url, init] = f.mock.calls.find(([u]) => u.endsWith('lk_registrar_correo_verificado'))!
    expect(url).toBe('https://proyecto.supabase.co/rest/v1/rpc/lk_registrar_correo_verificado')
    expect(JSON.parse(String(init!.body))).toEqual({ p_usuario: '00000000-0000-4000-8000-000000000001', p_correo: 'ana@ejemplo.com', p_metodo: 'google' })
    expect(JSON.stringify(r)).not.toMatch(/servicio-de-prueba|anon-de-prueba/)
  })
  it('sin sesión 401, sesión inválida 401, token inválido 403 (y no registra nada), sin configuración 503', async () => {
    const { intruso, f, base } = await escenario()
    const malo = await firmar(intruso, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
    expect((await atenderVerificacion(ENV, null, { token: malo }, f, AHORA)).estado).toBe(401)
    expect((await atenderVerificacion(ENV, 'Bearer otra', { token: malo }, f, AHORA)).estado).toBe(401)
    const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: malo }, f, AHORA)
    expect(r.estado).toBe(403); expect(String((r.cuerpo as { error: string }).error)).toMatch(/Sal de Lockumi y vuelve a entrar con tu correo/)
    expect((await atenderVerificacion(ENV, 'Bearer sesion-ok', {}, f, AHORA)).estado).toBe(400)
    expect((await atenderVerificacion({}, 'Bearer sesion-ok', { token: malo }, f, AHORA)).estado).toBe(503)
    expect(f.mock.calls.some(([u]) => u.endsWith('lk_registrar_correo_verificado'))).toBe(false)
  })
  it('el archivo api/verificar-correo.ts existe, solo acepta POST y usa atenderVerificacion', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('api/verificar-correo.ts', 'utf8')
    expect(s).toMatch(/export async function POST/); expect(s).not.toMatch(/export async function GET/); expect(s).toMatch(/atenderVerificacion\(process\.env/)
  })
})
