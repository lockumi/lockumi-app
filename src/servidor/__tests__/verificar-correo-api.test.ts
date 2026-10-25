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
type Llaves = { privada: CryptoKey; jwk: JsonWebKey & { kid: string; alg: string; use: string } }
async function llaves(alg: 'ES256' | 'RS256', kid: string): Promise<Llaves> {
  const par = alg === 'ES256'
    ? await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    : await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  return { privada: par.privateKey, jwk: { ...await crypto.subtle.exportKey('jwk', par.publicKey), kid, alg, use: 'sig' } }   // como publican Google, Apple y el enclave
}
async function firmar(k: Llaves, claims: Record<string, unknown>, kid = k.jwk.kid) {
  const cab = b64u(JSON.stringify({ alg: k.jwk.alg, kid, typ: 'JWT' })), cuerpo = b64u(JSON.stringify(claims))
  const algo = k.jwk.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' }
  return `${cab}.${cuerpo}.${b64u(await crypto.subtle.sign(algo, k.privada, new TextEncoder().encode(`${cab}.${cuerpo}`)))}`
}
const AHORA = Date.parse('2026-10-25T22:30:00Z'), seg = Math.floor(AHORA / 1000)
// Audiencias POR EMISOR (Legal 4:45): la de Google no vale para Apple ni para el enclave, y al revés.
const APP = 'app-lockumi-de-prueba'
const ENV = { CAVOS_AUD_GOOGLE: 'aud-google-de-cavos', CAVOS_AUD_APPLE: 'aud-apple-de-cavos', CAVOS_AUD_EMAIL: 'aud-enclave-lockumi', CAVOS_APP_ID: APP, SUPABASE_URL: 'https://proyecto.supabase.co', SUPABASE_ANON_KEY: 'anon-de-prueba', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba' }
async function escenario() {
  const usadas = new Set<string>(), bloqueadas = new Set<string>(), permitir = (k: string) => !bloqueadas.has(k)
  const google = await llaves('RS256', 'g1'), apple = await llaves('RS256', 'a1'), enclave = await llaves('ES256', 'e1'), intruso = await llaves('RS256', 'g1')
  const jwks: Record<string, unknown> = { [EMISORES.google.jwks]: { keys: [google.jwk] }, [EMISORES.apple.jwks]: { keys: [apple.jwk] }, [EMISORES.email.jwks]: { keys: [enclave.jwk] } }
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (url in jwks) return new Response(JSON.stringify(jwks[url]), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return (init?.headers as Record<string, string> | undefined)?.authorization === 'Bearer sesion-ok'
      ? new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000001' }), { status: 200 }) : new Response('{}', { status: 401 })
    if (url.endsWith('/rest/v1/rpc/lk_registrar_correo_verificado')) return usadas.has(JSON.parse(String(init?.body)).p_huella)
      ? new Response('{"message":"Ese token ya se usó."}', { status: 409 }) : (usadas.add(JSON.parse(String(init?.body)).p_huella), new Response('true', { status: 200 }))
    if (url.endsWith('/rest/v1/rpc/lk_intento_verificacion')) return new Response(String(permitir(JSON.parse(String(init?.body)).p_clave)), { status: 200 })
    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch & { mock: { calls: [string, RequestInit | undefined][] } }
  const base = { exp: seg + 600, iat: seg - 10, sub: 'u1', nonce: `${APP}.hash-del-secreto` }
  return { google, apple, enclave, intruso, f, base, jwks, bloqueadas }
}

describe('verificarTokenCavos: el correo sale de un token firmado por Google, Apple o el enclave de Cavos', () => {
  it('acepta los tres emisores con la audiencia configurada y devuelve el correo normalizado y el método', async () => {
    const { google, apple, enclave, f, base } = await escenario()
    expect(await verificarTokenCavos(await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: ' Ana@Ejemplo.com', email_verified: true }), ENV, f, AHORA))
      .toEqual({ correo: 'ana@ejemplo.com', metodo: 'google' })
    expect(await verificarTokenCavos(await firmar(apple, { ...base, iss: 'https://appleid.apple.com', aud: 'aud-apple-de-cavos', email: 'b@ejemplo.com', email_verified: 'true' }), ENV, f, AHORA))
      .toEqual({ correo: 'b@ejemplo.com', metodo: 'apple' })
    expect(await verificarTokenCavos(await firmar(enclave, { ...base, nonce: 'hash-del-secreto', iss: 'https://enclave.cavos.xyz', aud: ['otra', 'aud-enclave-lockumi'], email: 'c@ejemplo.com' }), ENV, f, AHORA))
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
  it('sin la audiencia de ESE emisor (o sin CAVOS_APP_ID para Google/Apple) no verifica nada (cierre por defecto)', async () => {
    const { google, f, base } = await escenario()
    const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true })
    await expect(verificarTokenCavos(t, { ...ENV, CAVOS_AUD_GOOGLE: '' }, f, AHORA)).rejects.toThrow(/CAVOS_AUD_GOOGLE/)
    await expect(verificarTokenCavos(t, { ...ENV, CAVOS_APP_ID: '' }, f, AHORA)).rejects.toThrow(/CAVOS_APP_ID/)
  })
})

describe('Legal 4:45 · BLOQUEANTE 2 y ajustes de cavos-token.ts', () => {
  const g = (base: Record<string, unknown>) => ({ ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true })
  it('iat: más de 5 minutos de antigüedad, sin iat o en el futuro → rechazado', async () => {
    const { google, f, base } = await escenario()
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), iat: seg - 301 }), ENV, f, AHORA)).rejects.toThrow(/5 minutos/)
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), iat: undefined }), ENV, f, AHORA)).rejects.toThrow(/iat/)
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), iat: seg + 120 }), ENV, f, AHORA)).rejects.toThrow(/futuro/)
    expect(await verificarTokenCavos(await firmar(google, { ...g(base), iat: seg - 299 }), ENV, f, AHORA)).toEqual({ correo: 'a@ejemplo.com', metodo: 'google' })
  })
  it('audiencias por emisor: un token de Google con la audiencia de Apple (o del enclave) no vale', async () => {
    const { google, apple, enclave, f, base } = await escenario()
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), aud: 'aud-apple-de-cavos' }), ENV, f, AHORA)).rejects.toThrow(/audiencia/)
    await expect(verificarTokenCavos(await firmar(apple, { ...g(base), iss: 'https://appleid.apple.com', aud: 'aud-google-de-cavos' }), ENV, f, AHORA)).rejects.toThrow(/audiencia/)
    await expect(verificarTokenCavos(await firmar(enclave, { ...base, iss: 'https://enclave.cavos.xyz', aud: 'aud-google-de-cavos', email: 'c@ejemplo.com' }), ENV, f, AHORA)).rejects.toThrow(/audiencia/)
  })
  it('nonce de Google/Apple: tiene que empezar con el App ID de Lockumi en Cavos («<app id>.<hash>», docs.cavos.xyz)', async () => {
    const { google, f, base } = await escenario()
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), nonce: 'otra-app.hash' }), ENV, f, AHORA)).rejects.toThrow(/App ID/)
    await expect(verificarTokenCavos(await firmar(google, { ...g(base), nonce: undefined }), ENV, f, AHORA)).rejects.toThrow(/App ID/)
  })
  it('email_verified === false (o "false") se rechaza con CUALQUIER emisor, también el enclave', async () => {
    const { enclave, f, base } = await escenario(), e = { ...base, iss: 'https://enclave.cavos.xyz', aud: 'aud-enclave-lockumi', email: 'c@ejemplo.com' }
    await expect(verificarTokenCavos(await firmar(enclave, { ...e, email_verified: false }), ENV, f, AHORA)).rejects.toThrow(/no confirmó el correo/)
    await expect(verificarTokenCavos(await firmar(enclave, { ...e, email_verified: 'false' }), ENV, f, AHORA)).rejects.toThrow(/no confirmó el correo/)
  })
  it('la llave del JWKS tiene que ser de firma (use = sig) y con el alg del emisor', async () => {
    for (const cambio of [{ use: 'enc' }, { use: undefined }, { alg: 'RS384' }]) {
      const { google, f, base, jwks } = await escenario()
      jwks[EMISORES.google.jwks] = { keys: [{ ...google.jwk, use: 'sig', ...cambio }] }
      await expect(verificarTokenCavos(await firmar(google, g(base)), ENV, f, AHORA), JSON.stringify(cambio)).rejects.toThrow(/llave/)
    }
  })
  it('kid desconocido: vuelve a leer el JWKS como mucho una vez por minuto', async () => {
    const { google, f, base } = await escenario()
    const t = await firmar(google, g(base), 'kid-que-no-existe')
    for (let i = 0; i < 4; i++) await expect(verificarTokenCavos(t, ENV, f, AHORA + i * 1000)).rejects.toThrow(/llave/)
    expect(f.mock.calls.filter(([u]) => u === EMISORES.google.jwks)).toHaveLength(1)
    await expect(verificarTokenCavos(t, ENV, f, AHORA + 61_000)).rejects.toThrow(/llave/)
    expect(f.mock.calls.filter(([u]) => u === EMISORES.google.jwks)).toHaveLength(2)
  })
})

describe('atenderVerificacion · un solo uso y límite de intentos (Legal 4:45)', () => {
  it('manda la huella SHA-256 del token (nunca el token) y el mismo token no verifica dos veces', async () => {
    const { google, f, base } = await escenario()
    const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
    expect((await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, f, AHORA)).estado).toBe(200)
    const cuerpo = JSON.parse(String(f.mock.calls.find(([u]) => u.endsWith('lk_registrar_correo_verificado'))![1]!.body))
    expect(cuerpo.p_huella).toMatch(/^[0-9a-f]{64}$/); expect(JSON.stringify(cuerpo)).not.toContain(t.split('.')[2])
    const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, f, AHORA)
    expect(r.estado).toBe(403); expect((r.cuerpo as { error: string }).error).toMatch(/Sal de Lockumi y vuelve a entrar con tu correo/)
  })
  it('límite por sesión y por IP: si la base dice que no, 429 con un texto que dice cómo seguir y sin leer el JWKS', async () => {
    for (const clave of ['sesion:00000000-0000-4000-8000-000000000001', 'ip:']) {
      const { google, f, base, bloqueadas } = await escenario()
      const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
      const ipClave = 'ip:' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('203.0.113.9')))).map(b => b.toString(16).padStart(2, '0')).join('')
      bloqueadas.add(clave === 'ip:' ? ipClave : clave)
      const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, f, AHORA, '203.0.113.9, 10.0.0.1')
      expect(r.estado, clave).toBe(429); expect((r.cuerpo as { error: string }).error).toMatch(/Espera 10 minutos y vuelve a entrar con tu correo/)
      expect(f.mock.calls.some(([u]) => u === EMISORES.google.jwks), clave).toBe(false)
      const claves = f.mock.calls.filter(([u]) => u.endsWith('lk_intento_verificacion')).map(([, i]) => JSON.parse(String(i!.body)).p_clave)
      expect(claves.every((k: string) => !k.includes('203.0.113.9'))).toBe(true)   // la IP va como huella, nunca en claro
    }
  })
  it('api/verificar-correo.ts pasa la IP del pedido (x-forwarded-for o x-real-ip)', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('api/verificar-correo.ts', 'utf8')).toMatch(/x-forwarded-for[\s\S]*x-real-ip/)
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
    expect(JSON.parse(String(init!.body))).toMatchObject({ p_usuario: '00000000-0000-4000-8000-000000000001', p_correo: 'ana@ejemplo.com', p_metodo: 'google' })
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
