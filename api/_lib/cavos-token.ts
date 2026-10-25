// Paso 19 · Legal, 25/10/2026, 4:23 p. m. (límite 1, bloqueante): verificar en el servidor el correo con el que la persona entró con
// Cavos, SIN tocar el login. El kit de Cavos (@cavos/kit, CavosAuth.getAuthToken()) ya guarda el token que entregó el proveedor al
// iniciar sesión: el id_token de Google o de Apple, o el JWT del enclave de Cavos para el código por correo
// (https://docs.cavos.xyz/docs/auth: «issuer https://enclave.cavos.xyz, keys at https://enclave.cavos.xyz/.well-known/jwks.json»).
// Aquí se valida como lo hace el enclave de Cavos (docs.cavos.xyz/docs/hardware-isolated-recovery): firma con las llaves públicas
// del emisor (JWKS), emisor, audiencia, vencimiento y el correo. Solo WebCrypto (sin dependencias nuevas). Cierre por defecto.
import { servicio, rpc } from './supabase.js'

export const EMISORES = {
  google: { iss: ['https://accounts.google.com', 'accounts.google.com'], alg: 'RS256', jwks: 'https://www.googleapis.com/oauth2/v3/certs' },
  apple: { iss: ['https://appleid.apple.com'], alg: 'RS256', jwks: 'https://appleid.apple.com/auth/keys' },
  email: { iss: ['https://enclave.cavos.xyz'], alg: 'ES256', jwks: 'https://enclave.cavos.xyz/.well-known/jwks.json' },
} as const
export type Metodo = keyof typeof EMISORES
type Env = Record<string, string | undefined>
export class ErrorVerificacion extends Error { estado: number; constructor(estado: number, motivo: string) { super(motivo); this.estado = estado } }
const MARGEN = 60   // segundos de tolerancia del reloj

const bytes = (b64u: string) => { const b = atob(b64u.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, ch => ch.charCodeAt(0)) }
const json = (b64: string) => JSON.parse(new TextDecoder().decode(bytes(b64))) as Record<string, unknown>
const normalizar = (c: unknown) => typeof c === 'string' ? c.trim().toLowerCase() : ''
export const audiencias = (env: Env) => (env.CAVOS_AUDIENCIAS ?? '').split(',').map(x => x.trim()).filter(Boolean)

// JWKS por emisor, 10 minutos en memoria (por función fetch, para que las pruebas no se mezclen).
const cache = new WeakMap<typeof fetch, Map<string, { hasta: number; keys: (JsonWebKey & { kid?: string })[] }>>()
async function llave(url: string, kid: string, f: typeof fetch, ahora: number) {
  let m = cache.get(f); if (!m) { m = new Map(); cache.set(f, m) }
  let e = m.get(url)
  if (!e || e.hasta < ahora || !e.keys.some(k => k.kid === kid)) {
    const r = await f(url).catch(() => null)
    if (!r?.ok) throw new ErrorVerificacion(503, `No se pudieron leer las llaves públicas de ${url}.`)
    e = { hasta: ahora + 600_000, keys: ((await r.json()) as { keys?: (JsonWebKey & { kid?: string })[] }).keys ?? [] }; m.set(url, e)
  }
  const k = e.keys.find(x => x.kid === kid)
  if (!k) throw new ErrorVerificacion(403, 'La firma usa una llave que el emisor no publica.')
  return k
}

/** Valida el token de Cavos y devuelve el correo (normalizado) y el método. Lanza ErrorVerificacion si algo no cuadra. */
export async function verificarTokenCavos(token: string, env: Env, f: typeof fetch = fetch, ahora = Date.now()): Promise<{ correo: string; metodo: Metodo }> {
  const auds = audiencias(env)
  if (!auds.length) throw new ErrorVerificacion(503, 'Falta CAVOS_AUDIENCIAS: no se verifica ningún correo.')
  const partes = String(token ?? '').split('.')
  if (partes.length !== 3 || !partes[0] || !partes[1]) throw new ErrorVerificacion(403, 'El token no tiene el formato de un JWT.')
  let cab: Record<string, unknown>, c: Record<string, unknown>
  try { cab = json(partes[0]); c = json(partes[1]) } catch { throw new ErrorVerificacion(403, 'El token no tiene el formato de un JWT.') }
  const metodo = (Object.keys(EMISORES) as Metodo[]).find(m => (EMISORES[m].iss as readonly string[]).includes(String(c.iss)))
  if (cab.alg !== 'RS256' && cab.alg !== 'ES256') throw new ErrorVerificacion(403, 'El algoritmo de la firma no está permitido.')
  if (!metodo) throw new ErrorVerificacion(403, 'El emisor del token no es Google, Apple ni el enclave de Cavos.')
  const em = EMISORES[metodo]
  if (cab.alg !== em.alg) throw new ErrorVerificacion(403, 'El algoritmo de la firma no corresponde al emisor.')
  if (typeof cab.kid !== 'string') throw new ErrorVerificacion(403, 'La firma no dice con qué llave se hizo.')
  const jwk = await llave(em.jwks, cab.kid, f, ahora)
  const algo = em.alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
  let ok = false
  try {
    const k = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, crv: jwk.crv, x: jwk.x, y: jwk.y }, algo, false, ['verify'])
    ok = await crypto.subtle.verify(em.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' }, k,
      bytes(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`))
  } catch { ok = false }
  if (!ok) throw new ErrorVerificacion(403, 'La firma del token no es válida.')
  const aud = Array.isArray(c.aud) ? c.aud.map(String) : [String(c.aud ?? '')]
  if (!aud.some(a => auds.includes(a))) throw new ErrorVerificacion(403, 'La audiencia del token no es la de Lockumi en Cavos.')
  const s = Math.floor(ahora / 1000)
  if (typeof c.exp !== 'number' || c.exp + MARGEN < s) throw new ErrorVerificacion(403, 'El token está vencido.')
  if (typeof c.nbf === 'number' && c.nbf - MARGEN > s) throw new ErrorVerificacion(403, 'El token todavía no vale (vencimiento).')
  const correo = normalizar(c.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) throw new ErrorVerificacion(403, 'El token no trae un correo.')
  if (metodo !== 'email' && !(c.email_verified === true || c.email_verified === 'true')) throw new ErrorVerificacion(403, 'El proveedor no confirmó el correo.')
  return { correo, metodo }
}

// LEGAL: revisado (25/10) · ronda 4:41 · texto propio (respuesta de /api/verificar-correo; la app no lo muestra: el servidor decide después)
export const NO_SE_PUDO_VERIFICAR = 'No pudimos confirmar el correo de tu cuenta. Sal de Lockumi y vuelve a entrar con tu correo.'

/** POST /api/verificar-correo: sesión de Supabase (Bearer) + { token } de Cavos → registra (sesión, correo) con la clave de servicio. */
export async function atenderVerificacion(env: Env, bearer: string | null, body: unknown, f: typeof fetch = fetch, ahora = Date.now()):
  Promise<{ estado: number; cuerpo: { correo: string } | { error: string } }> {
  const s = servicio(env), anon = (env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim()
  if (!s || !anon || !audiencias(env).length) return { estado: 503, cuerpo: { error: 'La verificación del correo no está configurada.' } }
  if (!bearer || !/^Bearer \S+$/.test(bearer)) return { estado: 401, cuerpo: { error: 'Falta la sesión.' } }
  const token = (body as { token?: unknown } | null)?.token
  if (typeof token !== 'string' || !token) return { estado: 400, cuerpo: { error: 'Falta el token de Cavos.' } }
  const r = await f(`${s.url}/auth/v1/user`, { headers: { apikey: anon, authorization: bearer } }).catch(() => null)
  const uid = r?.ok ? ((await r.json()) as { id?: string }).id : undefined
  if (!uid) return { estado: 401, cuerpo: { error: 'La sesión no es válida.' } }
  let v: { correo: string; metodo: Metodo }
  try { v = await verificarTokenCavos(token, env, f, ahora) } catch (e) {
    const estado = e instanceof ErrorVerificacion ? e.estado : 403
    console.warn('verificar-correo', e instanceof Error ? e.message : 'error')   // el motivo, nunca el token
    return { estado, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
  }
  try { await rpc(s, 'lk_registrar_correo_verificado', { p_usuario: uid, p_correo: v.correo, p_metodo: v.metodo }, f) } catch {
    return { estado: 503, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
  }
  return { estado: 200, cuerpo: { correo: v.correo } }
}
