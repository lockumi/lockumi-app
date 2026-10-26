// Acceso con Cavos (@cavos/kit, CavosAuth).
// - Con VITE_CAVOS_APP_ID definido: login REAL (Google / Apple por redirección, correo con código de 9 caracteres).
// - Sin VITE_CAVOS_APP_ID: proveedor SIMULADO (sin red; cualquier código de 6 dígitos sirve).
// El kit solo se carga (import dinámico) en modo real. No hay llaves en el código: el App ID es público.
// Fuentes: https://docs.cavos.xyz/docs/auth · README de @cavos/kit 0.4.2 (npm).
import type { Usuario } from '../types'

export interface CavosLike {
  getGoogleOAuthUrl(redirectUri: string): Promise<string>
  getAppleOAuthUrl(redirectUri: string): Promise<string>
  handleCallback(search: string, redirectUri: string): Promise<{ email: string; nombre?: string }>
  sendOtp(email: string): Promise<void>
  verifyOtp(email: string, code: string): Promise<{ email: string; nombre?: string }>
  salir?(): void
}

export const APP_ID = (import.meta.env.VITE_CAVOS_APP_ID as string | undefined)?.trim() || ''
export const modoReal = APP_ID !== ''

/** Formato del código por correo: el simulado usa 6 dígitos; Cavos envía 9 caracteres (minúsculas y dígitos). */
export const formatoCodigo = modoReal
  ? { largo: 9, limpiar: (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 9), etiqueta: 'Código de 9 caracteres', teclado: 'text' as const }
  : { largo: 6, limpiar: (s: string) => s.replace(/\D/g, '').slice(0, 6), etiqueta: 'Código de 6 dígitos', teclado: 'numeric' as const }

/** URL de regreso del OAuth. El kit no exige una ruta; usamos la raíz porque el router es por hash
 *  (no hace falta reescritura en Vercel). Debe registrarse EXACTA en Cavos → App → Callback URLs. */
export const urlRegreso = () => window.location.origin + '/'

/** ¿La página abrió con el regreso de Google o Apple (?cavos_auth_code=… o ?auth_data=…)? Solo en modo real. */
export const hayRegreso = (search = window.location.search) => { const q = new URLSearchParams(search); return modoReal && (q.has('cavos_auth_code') || q.has('auth_data')) }

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Proveedor simulado: no hay red ni billetera; cualquier código de 6 dígitos es válido. */
const simulado: CavosLike = {
  async getGoogleOAuthUrl() { return '#sim-google' },
  async getAppleOAuthUrl() { return '#sim-apple' },
  async handleCallback() { return { email: 'katherine@ejemplo.cr', nombre: 'Katherine' } },
  async sendOtp() { await espera(400) },
  async verifyOtp(email, code) { await espera(400); if (!/^\d{6}$/.test(code)) throw new Error('codigo'); return { email } },
}

/** Proveedor real sobre CavosAuth, cargado bajo demanda. */
let realP: Promise<CavosLike> | null = null
let cavosAuth: import('@cavos/kit').CavosAuth | null = null
const real = () => realP ??= import('@cavos/kit').then(({ CavosAuth }) => {
  const c = cavosAuth = new CavosAuth({ appId: APP_ID })
  const a = (i: { userId: string; email?: string; name?: string }) => ({ email: i.email ?? i.userId, nombre: i.name })
  return {
    getGoogleOAuthUrl: (r) => c.getGoogleOAuthUrl(r),
    getAppleOAuthUrl: (r) => c.getAppleOAuthUrl(r),
    handleCallback: async (s, r) => a(await c.handleCallback(s, r)),
    sendOtp: (e) => c.sendOtp(e),
    verifyOtp: async (e, k) => a(await c.verifyOtp(e, k)),
    salir: () => c.clearStoredIdentity(),
  } satisfies CavosLike
})
const proveedor = (): Promise<CavosLike> => modoReal ? real() : Promise.resolve(simulado)

/** 26/10: si Cavos no responde (la petición queda colgada en Safari), «Enviar código» quedaba en «Enviando…» sin mensaje.
 *  Con este límite el envío falla a los 20 s y la pantalla muestra el error que ya existe. No cambia el flujo de Cavos. */
export const LIMITE_ENVIO_MS = 20_000
export const conLimite = <T,>(p: Promise<T>, ms = LIMITE_ENVIO_MS): Promise<T> => new Promise<T>((ok, mal) => {
  const t = setTimeout(() => mal(new Error('kit/auth: sin respuesta')), ms)
  p.then(v => { clearTimeout(t); ok(v) }, e => { clearTimeout(t); mal(e) })
})

const K = 'lockumi.usuario'
const K_METODO = 'lockumi.oauth.metodo'
const guardar = (u: Usuario) => { localStorage.setItem(K, JSON.stringify(u)); return u }
/** Guarda cambios del usuario actual (por ejemplo, la aceptación de los Términos). */
export const guardarUsuario = guardar
const aUsuario = (email: string, metodo: Usuario['metodo'], nombre?: string): Usuario => ({ email, metodo, nombre: nombre ?? email.split('@')[0] })

export interface AuthService {
  loginGoogle(): Promise<Usuario>
  loginApple(): Promise<Usuario>
  sendOtp(email: string): Promise<void>
  verifyOtp(email: string, code: string): Promise<Usuario>
  handleCallback(params: URLSearchParams, metodo: 'google' | 'apple'): Promise<Usuario>
  /** Si la URL actual es un regreso de Cavos (?cavos_auth_code=…), lo completa, limpia la URL y devuelve el usuario. */
  completarRegreso(): Promise<Usuario | null>
  actual(): Usuario | null
  salir(): void
}

async function social(metodo: 'google' | 'apple'): Promise<Usuario> {
  const p = await proveedor()
  const url = await (metodo === 'google' ? p.getGoogleOAuthUrl(urlRegreso()) : p.getAppleOAuthUrl(urlRegreso()))
  if (!modoReal) { await espera(500); return auth.handleCallback(new URLSearchParams(), metodo) }
  // Real: el kit guarda un secreto de un solo uso en sessionStorage; el regreso debe llegar a esta misma pestaña y origen.
  sessionStorage.setItem(K_METODO, metodo)
  window.location.assign(url)
  return new Promise<Usuario>(() => {}) // la página se va; nunca resuelve
}

export const auth: AuthService = {
  loginGoogle: () => social('google'),
  loginApple: () => social('apple'),
  async handleCallback(params, metodo) {
    const r = await (await proveedor()).handleCallback('?' + params.toString(), urlRegreso())
    return guardar(aUsuario(r.email, metodo, r.nombre))
  },
  async completarRegreso() {
    if (!modoReal) return null
    const q = new URLSearchParams(window.location.search)
    if (!q.has('cavos_auth_code') && !q.has('auth_data')) return null
    const metodo = sessionStorage.getItem(K_METODO) === 'apple' ? 'apple' : 'google'
    sessionStorage.removeItem(K_METODO)
    try { return await this.handleCallback(q, metodo) }
    finally { history.replaceState(null, '', window.location.pathname + window.location.hash) }
  },
  sendOtp: (email) => conLimite(proveedor().then(p => p.sendOtp(email))),
  async verifyOtp(email, code) { const r = await (await proveedor()).verifyOtp(email, code); return guardar(aUsuario(r.email, 'correo', r.nombre)) },
  actual() { try { const s = localStorage.getItem(K); return s ? JSON.parse(s) : null } catch { return null } },
  salir() { localStorage.removeItem(K); if (modoReal) void real().then(p => p.salir?.()) },
}

/** Configuración de Cavos para la billetera: Stellar testnet. Un solo App ID sirve para los entornos
 *  `production` y `development` del panel; `environment` (de quién son el gas y la config) es independiente
 *  de `network` (qué red). Fuente: https://docs.cavos.xyz/docs/environments */
export const CAVOS_BILLETERA = {
  chains: ['stellar'] as const, defaultChain: 'stellar' as const,
  network: 'testnet' as const, environment: 'production' as const,
  appSalt: 'lockumi', // NUNCA cambiar cuando haya usuarios (deriva la dirección)
}

/** Identidad del último login real de Cavos (persistida por el kit), para conectar la billetera. */
export async function identidadCavos() {
  if (!modoReal) return null
  await real()
  return cavosAuth?.restoreIdentity() ?? null
}
/** La instancia de CavosAuth (AuthProvider) con la identidad restaurada, para `Cavos.connect({ auth })`.
 *  Hay que pasar `auth` y no solo `identity`: el registro de billeteras y el vault toman el token del login
 *  con `auth.getAuthToken()`; con `identity` sola no hay token y falla ("registry lookup skipped: no login token"). */
export async function authCavos() {
  if (!modoReal) return null
  await real()
  return cavosAuth?.restoreIdentity() ? cavosAuth : null
}
