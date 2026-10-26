// Paso 19 · Legal, 25/10/2026, 4:23 p. m. (límite 1, bloqueante): verificar en el servidor el correo con el que la persona entró con
// Cavos, SIN tocar el login. El kit de Cavos (@cavos/kit, CavosAuth.getAuthToken()) ya guarda el token que entregó el proveedor al
// iniciar sesión: el id_token de Google o de Apple, o el JWT del enclave de Cavos para el código por correo
// (https://docs.cavos.xyz/docs/auth: «issuer https://enclave.cavos.xyz, keys at https://enclave.cavos.xyz/.well-known/jwks.json»).
// Aquí se valida como lo hace el enclave de Cavos (docs.cavos.xyz/docs/hardware-isolated-recovery): firma con las llaves públicas
// del emisor (JWKS), emisor, audiencia, vencimiento y el correo. Solo WebCrypto (sin dependencias nuevas). Cierre por defecto.
import { servicio, rpc, ES_RELAY } from './supabase.js'
import { mandarCodigo, ERRORES as ERRORES_CODIGO } from './codigo-correo.js'

// Legal, revisión de 96e931b (4:45 p. m.): audiencias POR EMISOR (CAVOS_AUD_GOOGLE, CAVOS_AUD_APPLE, CAVOS_AUD_EMAIL), iat de 5 minutos
// como máximo, token de un solo uso (huella en lk_tokens_usados), email_verified false rechazado con cualquier emisor, llave del JWKS
// solo de firma y con el alg del emisor, kid desconocido → JWKS como mucho una vez por minuto, y límite de intentos (lk_intento_verificacion).
// Google y Apple (login de Cavos): nonce «<app id>.<BASE64URL(SHA-256(secreto))>» (docs.cavos.xyz/llms-full.txt, «What the enclave
// verifies»): se exige el prefijo con el App ID de Lockumi (CAVOS_APP_ID). El hash del secreto NO se puede comprobar (el secreto queda en
// el cliente). El enclave (código por correo) no documenta el formato de su nonce: no se exige.
// Legal, 25/10/2026, 9:00 p. m.: el token de correo del enclave trae aud «cavos-email», la MISMA para todas las apps de Cavos (sonda en
// producción, docs/reputacion.md). Con ese token el correo NO se registra directo: queda «por confirmar» y se manda el código de 6
// números de Lockumi a ese correo (acción 'verificar_correo'); solo con el código correcto queda verificado (/api/codigo-correo).
export const AUD_EMAIL_COMPARTIDA = 'cavos-email'
export const EMISORES = {
  google: { iss: ['https://accounts.google.com', 'accounts.google.com'], alg: 'RS256', jwks: 'https://www.googleapis.com/oauth2/v3/certs', aud: 'CAVOS_AUD_GOOGLE' },
  apple: { iss: ['https://appleid.apple.com'], alg: 'RS256', jwks: 'https://appleid.apple.com/auth/keys', aud: 'CAVOS_AUD_APPLE' },
  email: { iss: ['https://enclave.cavos.xyz'], alg: 'ES256', jwks: 'https://enclave.cavos.xyz/.well-known/jwks.json', aud: 'CAVOS_AUD_EMAIL' },
} as const
export type Metodo = keyof typeof EMISORES
type Env = Record<string, string | undefined>
export class ErrorVerificacion extends Error { estado: number; constructor(estado: number, motivo: string) { super(motivo); this.estado = estado } }
const MARGEN = 60   // segundos de tolerancia del reloj
const EDAD_MAXIMA = 300   // segundos: el token tiene que ser de un login de hace 5 minutos o menos (como exige el enclave de Cavos)
const JWKS_MINIMO = 60_000   // ms entre lecturas del JWKS por un kid desconocido

const bytes = (b64u: string) => { const b = atob(b64u.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, ch => ch.charCodeAt(0)) }
const json = (b64: string) => JSON.parse(new TextDecoder().decode(bytes(b64))) as Record<string, unknown>
const normalizar = (c: unknown) => typeof c === 'string' ? c.trim().toLowerCase() : ''
const lista = (v: string | undefined) => (v ?? '').split(',').map(x => x.trim()).filter(Boolean)
/** Audiencias permitidas de UN emisor (lista separada por comas en su variable). */
export const audiencias = (env: Env, m: Metodo) => lista(env[EMISORES[m].aud])
const configurado = (env: Env) => (Object.keys(EMISORES) as Metodo[]).some(m => audiencias(env, m).length > 0)
export const huellaHex = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')

// JWKS por emisor, 10 minutos en memoria (por función fetch, para que las pruebas no se mezclen).
// Un kid desconocido vuelve a leer el JWKS solo si la última lectura fue hace 1 minuto o más (no se puede usar para martillar al emisor).
type Jwk = JsonWebKey & { kid?: string; use?: string }
/** Revisión previa al encendido (Legal 6:04 p. m.): los JWKS reales del enclave, Google y Apple (leídos el 25/10/2026, 6:05 p. m. CR)
 *  publican use = "sig" y alg en TODAS sus llaves, así que la regla estricta se mantiene: use = sig y alg = el fijo del emisor. */
export const llaveValida = (k: Jwk, alg: string) => k.use === 'sig' && k.alg === alg
const cache = new WeakMap<typeof fetch, Map<string, { hasta: number; leido: number; keys: Jwk[] }>>()
async function llave(url: string, kid: string, alg: string, f: typeof fetch, ahora: number) {
  let m = cache.get(f); if (!m) { m = new Map(); cache.set(f, m) }
  let e = m.get(url)
  if (!e || e.hasta < ahora || (!e.keys.some(k => k.kid === kid) && ahora - e.leido >= JWKS_MINIMO)) {
    const r = await f(url).catch(() => null)
    if (!r?.ok) throw new ErrorVerificacion(503, `No se pudieron leer las llaves públicas de ${url}.`)
    e = { hasta: ahora + 600_000, leido: ahora, keys: ((await r.json()) as { keys?: Jwk[] }).keys ?? [] }; m.set(url, e)
  }
  const k = e.keys.find(x => x.kid === kid)
  if (!k) throw new ErrorVerificacion(403, 'La firma usa una llave que el emisor no publica.')
  if (!llaveValida(k, alg)) throw new ErrorVerificacion(403, 'La llave publicada no es de firma o no es del algoritmo del emisor.')
  return k
}

/** Legal 6:04 p. m. (BLOQUEANTE): huella de un solo uso sobre los claims firmados iss|sub|iat|nonce, NUNCA sobre la firma.
 *  La firma es maleable: los bits de relleno del último carácter base64url no cambian los bytes decodificados, y en ES256 (s → n−s)
 *  hay dos firmas válidas para el mismo contenido. Con la huella sobre los claims, cualquier variante de la firma da la misma huella.
 *  Se codifica como arreglo JSON (sin ambigüedad aunque un claim traiga «|»). */
export const huellaDeUso = (c: { iss: string; sub: string; iat: number; nonce?: unknown }) =>
  huellaHex(JSON.stringify(['lockumi-uso-v2', c.iss, c.sub, c.iat, typeof c.nonce === 'string' ? c.nonce : null]))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Valida el token de Cavos y devuelve el correo (normalizado) y el método. Lanza ErrorVerificacion si algo no cuadra. */
export async function verificarTokenCavos(token: string, env: Env, f: typeof fetch = fetch, ahora = Date.now()): Promise<{ correo: string; metodo: Metodo }> {
  const { correo, metodo } = await verificarConHuella(token, env, f, ahora)
  return { correo, metodo }
}
/** Igual que verificarTokenCavos, y además la huella de un solo uso (huellaDeUso) de los claims ya verificados. */
export async function verificarConHuella(token: string, env: Env, f: typeof fetch = fetch, ahora = Date.now()): Promise<{ correo: string; metodo: Metodo; huella: string; conCodigo: boolean }> {
  const partes = String(token ?? '').split('.')
  if (partes.length !== 3 || !partes[0] || !partes[1]) throw new ErrorVerificacion(403, 'El token no tiene el formato de un JWT.')
  let cab: Record<string, unknown>, c: Record<string, unknown>
  try { cab = json(partes[0]); c = json(partes[1]) } catch { throw new ErrorVerificacion(403, 'El token no tiene el formato de un JWT.') }
  const metodo = (Object.keys(EMISORES) as Metodo[]).find(m => (EMISORES[m].iss as readonly string[]).includes(String(c.iss)))
  if (cab.alg !== 'RS256' && cab.alg !== 'ES256') throw new ErrorVerificacion(403, 'El algoritmo de la firma no está permitido.')
  if (!metodo) throw new ErrorVerificacion(403, 'El emisor del token no es Google, Apple ni el enclave de Cavos.')
  const em = EMISORES[metodo]
  if (cab.alg !== em.alg) throw new ErrorVerificacion(403, 'El algoritmo de la firma no corresponde al emisor.')
  const auds = audiencias(env, metodo)
  if (!auds.length) throw new ErrorVerificacion(503, `Falta ${em.aud}: no se verifica ningún correo de ese emisor.`)
  const appId = env.CAVOS_APP_ID?.trim()
  if (metodo !== 'email' && !appId) throw new ErrorVerificacion(503, 'Falta CAVOS_APP_ID: no se verifica ningún correo de Google ni de Apple.')
  // El prefijo del nonce es el id interno de la app en Cavos (UUID), no la clave pública «cav_…» de VITE_CAVOS_APP_ID (comprobado con
  // GET https://cavos.xyz/api/oauth/v2/google, 25/10 6:06 p. m.; docs/reputacion.md). Con «cav_…» se rechazaría todo: mejor avisar.
  if (metodo !== 'email' && !UUID.test(appId!)) throw new ErrorVerificacion(503, 'CAVOS_APP_ID tiene que ser el id interno de la app en Cavos (UUID), no la clave cav_.')
  if (typeof cab.kid !== 'string') throw new ErrorVerificacion(403, 'La firma no dice con qué llave se hizo.')
  const jwk = await llave(em.jwks, cab.kid, em.alg, f, ahora)
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
  if (typeof c.iat !== 'number') throw new ErrorVerificacion(403, 'El token no dice cuándo se emitió (iat).')
  if (c.iat - MARGEN > s) throw new ErrorVerificacion(403, 'El token dice que se emitió en el futuro.')
  if (s - c.iat > EDAD_MAXIMA) throw new ErrorVerificacion(403, 'El token tiene más de 5 minutos: hay que volver a entrar.')
  if (metodo !== 'email' && !(typeof c.nonce === 'string' && c.nonce.startsWith(`${appId}.`) && c.nonce.length > appId!.length + 1))
    throw new ErrorVerificacion(403, 'El nonce no es de un login de Cavos para el App ID de Lockumi.')
  const correo = normalizar(c.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) throw new ErrorVerificacion(403, 'El token no trae un correo.')
  if (c.email_verified === false || c.email_verified === 'false') throw new ErrorVerificacion(403, 'El emisor dice que no confirmó el correo.')
  if (metodo !== 'email' && !(c.email_verified === true || c.email_verified === 'true')) throw new ErrorVerificacion(403, 'El proveedor no confirmó el correo.')
  if (typeof c.sub !== 'string' || !c.sub || c.sub.length > 256) throw new ErrorVerificacion(403, 'El token no dice de quién es (sub).')
  // conCodigo: token del enclave con la audiencia compartida «cavos-email» → además hace falta el código de Lockumi (Legal 9:00 p. m.).
  const conCodigo = metodo === 'email' && aud.includes(AUD_EMAIL_COMPARTIDA)
  return { correo, metodo, huella: await huellaDeUso({ iss: String(c.iss), sub: c.sub, iat: c.iat, nonce: c.nonce }), conCodigo }
}

// LEGAL: revisado (25/10) · ronda 4:41 · texto propio (respuesta de /api/verificar-correo; la app no lo muestra: el servidor decide después)
export const NO_SE_PUDO_VERIFICAR = 'No pudimos confirmar el correo de tu cuenta. Sal de Lockumi y vuelve a entrar con tu correo.'

// LEGAL: revisado (25/10, 5:04 p. m.) · ronda 4:45 · texto propio aprobado por Legal (respuesta 429 de /api/verificar-correo; la app no lo muestra)
export const DEMASIADOS_INTENTOS = 'Hiciste muchos intentos seguidos. Espera 10 minutos y vuelve a entrar con tu correo.'
// Respuesta 403 de /api/verificar-correo cuando falta el código del correo (la app no la muestra: muestra «Revisa tu correo»).
export const FALTA_CODIGO = 'Falta el código que te enviamos por correo.'
/** Límites de intentos (ventana de 10 minutos): por sesión de Supabase y por IP (la IP se guarda como huella, nunca en claro). */
export const LIMITES = { sesion: 5, ip: 30, ventana: '10 minutes' } as const

/** POST /api/verificar-correo: sesión de Supabase (Bearer) + { token } de Cavos → registra (sesión, correo, huella del token) con la
 *  clave de servicio. ip: la del pedido (x-forwarded-for / x-real-ip), para el límite de intentos. */
export async function atenderVerificacion(env: Env, bearer: string | null, body: unknown, f: typeof fetch = fetch, ahora = Date.now(), ip: string | null = null, origen: string | null = null):
  Promise<{ estado: number; cuerpo: { correo: string; codigo?: true; motivo?: string; error?: string } | { error: string } }> {
  const s = servicio(env), anon = (env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim()
  if (!s || !anon || !configurado(env)) return { estado: 503, cuerpo: { error: 'La verificación del correo no está configurada.' } }
  if (!bearer || !/^Bearer \S+$/.test(bearer)) return { estado: 401, cuerpo: { error: 'Falta la sesión.' } }
  const token = (body as { token?: unknown } | null)?.token
  if (typeof token !== 'string' || !token) return { estado: 400, cuerpo: { error: 'Falta el token de Cavos.' } }
  const intento = async (clave: string, max: number) => {
    try { return await rpc<boolean>(s, 'lk_intento_verificacion', { p_clave: clave, p_max: max, p_ventana: LIMITES.ventana }, f) === true } catch { return null }
  }
  const laIp = (ip ?? '').split(',')[0]!.trim()
  if (laIp) {
    const ok = await intento(`ip:${await huellaHex(laIp)}`, LIMITES.ip)
    if (ok === null) return { estado: 503, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
    if (!ok) return { estado: 429, cuerpo: { error: DEMASIADOS_INTENTOS } }
  }
  const r = await f(`${s.url}/auth/v1/user`, { headers: { apikey: anon, authorization: bearer } }).catch(() => null)
  const uid = r?.ok ? ((await r.json()) as { id?: string }).id : undefined
  if (!uid) return { estado: 401, cuerpo: { error: 'La sesión no es válida.' } }
  const ok = await intento(`sesion:${uid}`, LIMITES.sesion)
  if (ok === null) return { estado: 503, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
  if (!ok) return { estado: 429, cuerpo: { error: DEMASIADOS_INTENTOS } }
  let v: { correo: string; metodo: Metodo; huella: string; conCodigo: boolean }
  try { v = await verificarConHuella(token, env, f, ahora) } catch (e) {
    const estado = e instanceof ErrorVerificacion ? e.estado : 403
    console.warn('verificar-correo', e instanceof Error ? e.message : 'error')   // el motivo, nunca el token
    return { estado, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
  }
  // Legal 9:00 p. m.: token de correo con aud «cavos-email» → el correo queda POR CONFIRMAR (lk_correo_por_confirmar, que también gasta
  // el token: un solo uso) y se manda el código de Lockumi a ESE correo. NO se registra en lk_correos_verificados: eso lo hace
  // /api/codigo-correo (acción 'verificar_correo') con el código correcto. Sin el código: 403 con codigo: true (la app muestra
  // «Revisa tu correo»); motivo/error solo si no salió un código nuevo (límite de reenvíos o Resend).
  if (v.conCodigo) {
    let estado: string
    try { estado = await rpc<string>(s, 'lk_correo_por_confirmar', { p_usuario: uid, p_correo: v.correo, p_huella: v.huella }, f) } catch (e) {
      const usado = e instanceof Error && /409/.test(e.message)
      console.warn('verificar-correo', usado ? 'token ya usado' : 'no se pudo dejar por confirmar')
      return { estado: usado ? 403 : 503, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
    }
    const falta = { correo: v.correo, codigo: true as const, error: FALTA_CODIGO }
    if (estado === 'pendiente') return { estado: 403, cuerpo: falta }   // ya se mandó; «Reenviar código» va por /api/codigo-correo
    const m = await mandarCodigo(env, s, uid, v.correo, 'verificar_correo', origen, f)
    if (m.motivo && m.motivo !== 'correo') return { estado: 403, cuerpo: { ...falta, motivo: m.motivo, error: ERRORES_CODIGO[m.motivo] } }
    return { estado: 403, cuerpo: falta }
  }
  // Un solo uso: la base guarda la huella de los claims (iss|sub|iat|nonce, huellaDeUso; nunca la firma ni el token) y rechaza la segunda
  // vez, aunque sea otra sesión o la firma venga reescrita (Legal 6:04 p. m.).
  try { await rpc(s, 'lk_registrar_correo_verificado', { p_usuario: uid, p_correo: v.correo, p_metodo: v.metodo, p_huella: v.huella }, f) } catch (e) {
    const usado = e instanceof Error && /409/.test(e.message)
    console.warn('verificar-correo', usado ? 'token ya usado' : 'no se pudo registrar')
    return { estado: usado ? 403 : 503, cuerpo: { error: NO_SE_PUDO_VERIFICAR } }
  }
  // Tus alquileres en cualquier dispositivo (26/10/2026): con el correo que Cavos verificó (Google/Apple, sacado del token aquí, nunca
  // del cliente), los lugares de esa persona pasan a esta sesión (lk_vincular_alquileres, migración 20261026060000). Si falla, el
  // correo igual quedó verificado: no se cambia la respuesta.
  let vinculados = 0
  try { vinculados = Number(await rpc<number>(s, 'lk_vincular_alquileres', { p_usuario: uid, p_correo: v.correo }, f)) || 0 } catch {
    console.warn('verificar-correo', 'no se pudieron traer los alquileres')
  }
  // Correo real para avisos con Apple (20261026080000): si esta cuenta de Apple ya guardó su correo real ('apple-real'), también se traen
  // los alquileres de ese correo. Lo busca el servidor por el correo de Apple del token; la base exige el token de Apple de ESTA sesión.
  if (v.metodo === 'apple' && ES_RELAY.test(v.correo)) try {
    const real = await rpc<string | null>(s, 'lk_correo_real_de', { p_correo: v.correo }, f)
    if (real) vinculados += Number(await rpc<number>(s, 'lk_vincular_alquileres', { p_usuario: uid, p_correo: real }, f)) || 0
  } catch { console.warn('verificar-correo', 'no se pudieron traer los alquileres del correo real') }
  return { estado: 200, cuerpo: { correo: v.correo, ...(vinculados > 0 && { vinculados }) } }
}
