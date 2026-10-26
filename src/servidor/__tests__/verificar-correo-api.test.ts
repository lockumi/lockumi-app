// Paso 19 · Legal, 25/10/2026, 4:23 p. m. (límite 1, bloqueante): el servidor verifica el correo contra el token de Cavos sin tocar el
// login. La app lee el token que el kit YA guarda (CavosAuth.getAuthToken(): el id_token de Google o Apple, o el del enclave de Cavos
// para el código por correo; https://docs.cavos.xyz/docs/auth) y lo manda a POST /api/verificar-correo con su sesión de Supabase.
// La función valida firma (JWKS publicado por el emisor), emisor, audiencia, vencimiento y correo, y solo entonces registra
// (sesión, correo) con la clave de servicio. Todo lo demás se rechaza (cierre por defecto).
import { describe, it, expect, vi } from 'vitest'
import { verificarTokenCavos, verificarConHuella, atenderVerificacion, EMISORES, llaveValida, huellaDeUso } from '../../../api/_lib/cavos-token'

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
const APP = '00000000-0000-4000-8000-0000000000aa'   // id interno de la app en Cavos: un UUID, no la clave cav_… (docs/reputacion.md)
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
    // La clave pública del frontend (cav_…) no es el prefijo del nonce: se avisa con 503 en vez de rechazar todo en silencio.
    await expect(verificarTokenCavos(t, { ...ENV, CAVOS_APP_ID: 'cav_c1b1cec42e7b62cd01f377b5a3291b276079' }, f, AHORA)).rejects.toMatchObject({ estado: 503, message: /UUID/ })
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
  it('manda la huella SHA-256 de los claims (nunca el token ni su firma) y el mismo token no verifica dos veces', async () => {
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

// Legal 6:04 p. m. · BLOQUEANTE: la huella de un solo uso NO puede depender de la firma (es maleable).
const ORDEN_P256 = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551n
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const desdeB64u = (t: string) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
/** Cambia el bit de relleno más bajo del último carácter base64url de la firma: los bytes decodificados no cambian. */
function rellenoAlterado(t: string) {
  const [h, p, f] = t.split('.'), ult = f!.at(-1)!, otro = ALFABETO[ALFABETO.indexOf(ult) ^ 1]!
  const g = f!.slice(0, -1) + otro
  expect(Array.from(desdeB64u(g))).toEqual(Array.from(desdeB64u(f!)))   // misma firma en bytes
  return `${h}.${p}.${g}`
}
/** ES256: (r, s) → (r, n − s), la otra firma ECDSA válida del mismo contenido. */
function ecdsaReescrita(t: string) {
  const [h, p, f] = t.split('.'), b = desdeB64u(f!)
  const s = BigInt('0x' + Array.from(b.slice(32), x => x.toString(16).padStart(2, '0')).join('')), s2 = (ORDEN_P256 - s).toString(16).padStart(64, '0')
  const nueva = new Uint8Array(64); nueva.set(b.slice(0, 32)); nueva.set(Uint8Array.from(s2.match(/../g)!, x => parseInt(x, 16)), 32)
  return `${h}.${p}.${b64u(nueva)}`
}
const huellasEnviadas = (f: { mock: { calls: [string, RequestInit | undefined][] } }) =>
  f.mock.calls.filter(([u]) => u.endsWith('lk_registrar_correo_verificado')).map(([, i]) => JSON.parse(String(i!.body)).p_huella as string)

describe('Legal 6:04 p. m. · BLOQUEANTE: huella de un solo uso sobre iss|sub|iat|nonce, nunca sobre la firma', () => {
  const tokens = async () => {
    const e = await escenario()
    const tg = await firmar(e.google, { ...e.base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
    const te = await firmar(e.enclave, { ...e.base, nonce: 'otro.hash-del-secreto', iss: 'https://enclave.cavos.xyz', aud: 'aud-enclave-lockumi', email: 'ana@ejemplo.com' })
    return { ...e, tg, te }
  }
  for (const [nombre, cual, alterar] of [
    ['firma con el bit de relleno alterado (Google, RS256)', 'tg', rellenoAlterado],
    ['firma con el bit de relleno alterado (enclave, ES256)', 'te', rellenoAlterado],
    ['firma ECDSA reescrita s → n−s (enclave, ES256)', 'te', ecdsaReescrita],
    ['reuso del mismo token, tal cual', 'tg', (t: string) => t],
    ['reuso del mismo token del enclave, tal cual', 'te', (t: string) => t],
  ] as const) it(`${nombre}: la firma sigue valiendo, pero da «ya usado» (403) con la misma huella`, async () => {
    const e = await tokens(), t = e[cual], t2 = alterar(t)
    if (nombre.startsWith('firma')) expect(t2).not.toBe(t)
    expect(await verificarTokenCavos(t2, ENV, e.f, AHORA)).toEqual(await verificarTokenCavos(t, ENV, e.f, AHORA))   // la variante es válida
    expect((await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, e.f, AHORA)).estado).toBe(200)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t2 }, e.f, AHORA)
    expect(r.estado).toBe(403); expect((r.cuerpo as { error: string }).error).toMatch(/Sal de Lockumi y vuelve a entrar con tu correo/)
    expect(warn).toHaveBeenCalledWith('verificar-correo', 'token ya usado'); warn.mockRestore()
    const [h1, h2] = huellasEnviadas(e.f); expect(h1).toMatch(/^[0-9a-f]{64}$/); expect(h2).toBe(h1)
  })
  it('la huella es la de los claims (iss|sub|iat|nonce), no la del token ni la de su firma; sin sub no se verifica', async () => {
    const e = await tokens()
    const { huella } = await verificarConHuella(e.tg, ENV, e.f, AHORA)
    expect(huella).toBe(await huellaDeUso({ iss: 'https://accounts.google.com', sub: 'u1', iat: e.base.iat, nonce: e.base.nonce }))
    const sha = async (x: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)))).map(b => b.toString(16).padStart(2, '0')).join('')
    expect(huella).not.toBe(await sha(e.tg)); expect(huella).not.toBe(await sha(e.tg.split('.')[2]!))
    // Otro login (otro iat o nonce) es otro uso; otra persona (sub) también.
    expect(await huellaDeUso({ iss: 'https://accounts.google.com', sub: 'u1', iat: e.base.iat + 1, nonce: e.base.nonce })).not.toBe(huella)
    expect(await huellaDeUso({ iss: 'https://accounts.google.com', sub: 'u2', iat: e.base.iat, nonce: e.base.nonce })).not.toBe(huella)
    for (const sub of [undefined, '', 7]) await expect(verificarTokenCavos(await firmar(e.google, { ...e.base, sub, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true }), ENV, e.f, AHORA), String(sub)).rejects.toThrow(/sub/)
  })
})

describe('Legal 6:04 p. m. · JWKS reales (copia del 25/10, 6:05 p. m.): todas las llaves publican use = "sig" y su alg', () => {
  it('las llaves reales del enclave, Google y Apple pasan la regla estricta; la del enclave se importa como ECDSA P-256', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const reales = JSON.parse(fs.readFileSync('src/servidor/__tests__/fixtures/jwks-reales-2026-10-25.json', 'utf8')) as Record<string, { keys: (JsonWebKey & { kid: string; use?: string })[] }>
    for (const m of ['google', 'apple', 'email'] as const) {
      const keys = reales[EMISORES[m].jwks]!.keys; expect(keys.length, m).toBeGreaterThan(0)
      for (const k of keys) { expect(k.use, `${m} ${k.kid}`).toBe('sig'); expect(k.alg, `${m} ${k.kid}`).toBe(EMISORES[m].alg); expect(llaveValida(k, EMISORES[m].alg)).toBe(true) }
    }
    const [e] = reales[EMISORES.email.jwks]!.keys
    expect([e!.kty, e!.crv]).toEqual(['EC', 'P-256'])
    await expect(crypto.subtle.importKey('jwk', { kty: e!.kty, crv: e!.crv, x: e!.x, y: e!.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])).resolves.toBeDefined()
    // La regla sigue cerrada: sin use, con otro use o con otro alg, no.
    expect(llaveValida({ ...e!, use: undefined }, 'ES256')).toBe(false); expect(llaveValida({ ...e!, use: 'enc' }, 'ES256')).toBe(false); expect(llaveValida(e!, 'RS256')).toBe(false)
  })
})

// Tus alquileres en cualquier dispositivo (26/10/2026, migración 20261026060000): tras verificar con el token de Google/Apple, el
// servidor llama a lk_vincular_alquileres con la sesión y el correo DEL TOKEN (nunca uno que mande el cliente).
describe('atenderVerificacion · trae los alquileres de ese correo a esta sesión', () => {
  const conVincular = (f: typeof fetch, respuesta: () => Response) => vi.fn(async (url: string, init?: RequestInit) =>
    url.endsWith('/rest/v1/rpc/lk_vincular_alquileres') ? respuesta() : f(url, init)) as unknown as typeof fetch & { mock: { calls: [string, RequestInit | undefined][] } }
  it('Apple: llama con el correo del token (no el del cuerpo) y responde vinculados', async () => {
    const { apple, f, base } = await escenario(), g = conVincular(f, () => new Response('2', { status: 200 }))
    const t = await firmar(apple, { ...base, iss: 'https://appleid.apple.com', aud: 'aud-apple-de-cavos', email: 'X1@privaterelay.appleid.com', email_verified: 'true' })
    const r = await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t, correo: 'intruso@ejemplo.com' }, g, AHORA)
    expect(r).toEqual({ estado: 200, cuerpo: { correo: 'x1@privaterelay.appleid.com', vinculados: 2 } })
    const llamadas = g.mock.calls.filter(([u]) => u.endsWith('lk_vincular_alquileres'))
    expect(llamadas).toHaveLength(1)
    expect(JSON.parse(String(llamadas[0]![1]!.body))).toEqual({ p_usuario: '00000000-0000-4000-8000-000000000001', p_correo: 'x1@privaterelay.appleid.com' })
    expect((llamadas[0]![1]!.headers as Record<string, string>).authorization).toBe('Bearer servicio-de-prueba')
  })
  it('nada que mover o la base falla: la misma respuesta de siempre; token ya usado: no se llama', async () => {
    for (const resp of [() => new Response('0', { status: 200 }), () => new Response('{"message":"x"}', { status: 500 })]) {
      const { google, f, base } = await escenario(), g = conVincular(f, resp)
      const t = await firmar(google, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'ana@ejemplo.com', email_verified: true })
      expect(await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, g, AHORA)).toEqual({ estado: 200, cuerpo: { correo: 'ana@ejemplo.com' } })
      expect((await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: t }, g, AHORA)).estado).toBe(403)
      expect(g.mock.calls.filter(([u]) => u.endsWith('lk_vincular_alquileres'))).toHaveLength(1)
    }
  })
  it('token de correo con código de Lockumi (aud «cavos-email») o token inválido: nunca se llama', async () => {
    const { enclave, intruso, f, base } = await escenario(), g = conVincular(f, () => new Response('1', { status: 200 }))
    const e = await firmar(enclave, { ...base, nonce: 'hash-del-secreto', iss: 'https://enclave.cavos.xyz', aud: 'cavos-email', email: 'c@ejemplo.com' })
    await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: e }, g, AHORA)
    const malo = await firmar(intruso, { ...base, iss: 'https://accounts.google.com', aud: 'aud-google-de-cavos', email: 'a@ejemplo.com', email_verified: true })
    expect((await atenderVerificacion(ENV, 'Bearer sesion-ok', { token: malo }, g, AHORA)).estado).toBe(403)
    expect(g.mock.calls.filter(([u]) => u.endsWith('lk_vincular_alquileres'))).toHaveLength(0)
  })
})
