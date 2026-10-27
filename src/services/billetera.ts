// Billetera Stellar testnet con Cavos (@cavos/kit) + lectura de saldo en Horizon y creación de la cuenta por la tesorería de Lockumi.
// Fuentes: https://docs.cavos.xyz/docs/stellar (Cavos.connect con chains ["stellar"], network "testnet")
//          https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/accounts (GET /accounts/{id}, 404 si no existe)
//          https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts (createAccount, reserva)
import { CAVOS_BILLETERA, authCavos, modoReal, APP_ID } from './auth'
import { MENSAJE_PRUEBA, SIN_SESION, clasificarFirma, esSinSesion, type EstadoFirmante } from './firmante'
import { mensajePrueba, type AccionPrueba, type Prueba } from '../../api/_lib/prueba-mensaje'

export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
export type EstadoBilletera = 'undeployed' | 'ready' | 'needs-device-approval'
/** `llave`: la cuenta tiene una llave de acceso (passkey) guardada; solo se sabe al conectar con `{ llave: true }`. */
export interface Billetera { direccion: string; estado: EstadoBilletera; llave?: boolean }
type Fetch = typeof fetch

export const esDireccionStellar = (g: string) => /^G[A-Z2-7]{55}$/.test(g)
export const abreviar = (g: string) => g.length > 12 ? g.slice(0, 4) + '…' + g.slice(-4) : g
export const enlaceExplorer = (g: string) => 'https://stellar.expert/explorer/testnet/account/' + g

/** Saldo XLM nativo como texto decimal (p. ej. "10000.0000000"), o null si la cuenta aún no existe en testnet. */
export async function consultarSaldo(g: string, f: Fetch = fetch): Promise<string | null> {
  const r = await f(`${HORIZON_TESTNET}/accounts/${g}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error('horizon ' + r.status)
  const d = await r.json() as { balances?: { asset_type: string; balance: string }[] }
  return d.balances?.find(b => b.asset_type === 'native')?.balance ?? '0'
}

/** Saldo de USDC de testnet (emisor de Circle), null si no hay trustline, undefined si la cuenta no existe. */
export async function consultarUsdc(g: string, f: Fetch = fetch): Promise<string | null | undefined> {
  const r = await f(`${HORIZON_TESTNET}/accounts/${g}`)
  if (r.status === 404) return undefined
  if (!r.ok) throw new Error('horizon ' + r.status)
  const d = await r.json() as { balances?: { asset_code?: string; asset_issuer?: string; balance: string }[] }
  return d.balances?.find(b => b.asset_code === 'USDC' && b.asset_issuer === 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')?.balance ?? null
}

/** Pide a Lockumi que cree la cuenta en testnet: la tesorería de prueba la crea con XLM de prueba (createAccount; no hay Friendbot).
 *  Si la cuenta ya existe, no pasa nada. */
export async function fondear(g: string, f: Fetch = fetch): Promise<void> {
  const r = await f('/api/solo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: 'crear-cuenta', cuenta: g }) })
  if (!r.ok) throw new Error('crear-cuenta ' + r.status)
}

/** "10000.0000000" → "10 000 XLM" (hasta 2 decimales). */
export const formatoXlm = (s: string) =>
  new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(s)) + ' XLM'

export class ErrorBilletera extends Error { codigo: string; constructor(codigo: string, mensaje: string) { super(mensaje); this.codigo = codigo } }
/** Código y mensaje técnicos de cualquier error, para mostrarlos en "Ver detalle". */
export function detalleError(e: unknown): { codigo: string; mensaje: string } {
  if (e instanceof ErrorBilletera) return { codigo: e.codigo, mensaje: e.message }
  const m = e instanceof Error ? e.message : String(e)
  const codigo = /no login token/.test(m) ? 'sin-token' : /allowed web origins/.test(m) ? 'origen-no-registrado'
    : /registry .*failed: (\d+)/.test(m) ? 'registro-' + m.match(/failed: (\d+)/)![1] : /vault/i.test(m) ? 'vault' : (e as { name?: string })?.name || 'desconocido'
  return { codigo, mensaje: m.slice(0, 400) }
}

// ── Pagar desde cualquier dispositivo (recuperación social de Cavos, README de @cavos/kit 0.4.2 «Hardware-isolated social
// recovery») ── Sin esto, la billetera solo vive en el navegador donde se creó: en otro dispositivo el kit queda en
// `needs-device-approval` y al firmar lanza «kit/stellar: this device is not an authorized signer of the wallet».
// Con la recuperación activa en el panel de Cavos, pasamos lo mismo que pasa el CavosProvider oficial: un
// SocialRecoveryClient (enclave Nitro con las medidas fijadas en el kit) y la credencial fresca del login (≤ 5 min, un solo
// uso). Así el dispositivo de origen sella la billetera en el enclave y un dispositivo nuevo la recupera al entrar.
// Si la recuperación no está activa en el panel, no se pasa nada y todo queda como antes.
export const URL_CONFIG_RECUPERACION = `https://cavos.xyz/api/recovery/social/config?app_id=${encodeURIComponent(APP_ID)}&environment=${CAVOS_BILLETERA.environment}`
export async function recuperacionActiva(f: Fetch = fetch): Promise<boolean> {
  try { const r = await f(URL_CONFIG_RECUPERACION); return r.ok && (await r.json() as { enabled?: unknown }).enabled === true } catch { return false }
}
interface AuthRecuperacion { hasSocialRecoveryCredential(): boolean; consumeSocialRecoveryCredential(): unknown }
type KitRecuperacion = { SocialRecoveryClient: new (o: { baseUrl: string; appId: string; environment?: 'development' | 'production'; attestation: unknown }) => unknown; DEFAULT_SOCIAL_RECOVERY_ATTESTATION: unknown }
export async function opcionesRecuperacion(auth: AuthRecuperacion, activa: () => Promise<boolean> = recuperacionActiva,
  kit: () => Promise<KitRecuperacion> = () => import('@cavos/kit') as unknown as Promise<KitRecuperacion>) {
  if (!await activa()) return {}
  const { SocialRecoveryClient, DEFAULT_SOCIAL_RECOVERY_ATTESTATION } = await kit()
  const socialRecovery = new SocialRecoveryClient({ baseUrl: 'https://cavos.xyz', appId: APP_ID, environment: CAVOS_BILLETERA.environment, attestation: DEFAULT_SOCIAL_RECOVERY_ATTESTATION })
  const cred = auth.hasSocialRecoveryCredential() ? auth.consumeSocialRecoveryCredential() : undefined
  return { socialRecovery, ...cred ? { socialRecoveryCredential: cred } : {} } as unknown as Pick<import('@cavos/kit').ConnectOptions, 'socialRecovery' | 'socialRecoveryCredential'>
}

/** Texto para cuando este dispositivo no puede firmar con la cuenta (creada en otro navegador o equipo). Al entrar, la puerta
 *  (screens/Firmante.tsx) ofrece «Entrar con mi llave de acceso»; este texto es para cuando falla a mitad de una acción. */
export const NO_FIRMANTE = 'Este dispositivo no puede usar tu cuenta. Sal y vuelve a entrar con tu llave de acceso.'
export const esTextoNoFirmante = (t: string | null | undefined) => !!t && t.includes(NO_FIRMANTE)
export const esNoFirmante = (m: string) => /not an authorized signer|needs-device-approval|restore by connecting with the enclave|protected by recovery|complete a fresh social login/i.test(m)

let conexion: Promise<Billetera> | null = null
/** Conecta la billetera con la identidad del login de Cavos. Solo en modo real.
 *  `{ llave: true }`: conecta con la llave de acceso (passkey), para averiguar si la cuenta tiene una o para aprobar este
 *  dispositivo con ella (el vault de Cavos la pide en su propia ventana). Si este dispositivo ya tiene la llave de la cuenta,
 *  no pide nada. Nunca se pasa en las conexiones automáticas: abriría esa ventana sin que la persona lo pida. */
export function conectarBilletera(o: { llave?: boolean } = {}): Promise<Billetera> {
  if (import.meta.env.DEV) { // gancho de prueba local, nunca en el build
    const g = localStorage.getItem('lockumi.billetera.prueba')
    if (g) return Promise.resolve({ direccion: g, estado: 'undeployed' })
  }
  if (!modoReal) return Promise.reject(new Error('simulado'))
  const conectar = async () => {
    const auth = await authCavos()
    if (!auth) throw new ErrorBilletera('sin-identidad', 'No hay identidad de Cavos guardada en este navegador.')
    if (!auth.getAuthToken()) throw new ErrorBilletera('sin-token', 'La sesión de Cavos no tiene token en esta pestaña (se abrió en otra pestaña o se cerró).')
    const { Cavos, PasskeyPrf } = await import('@cavos/kit')
    // `auth` (no solo `identity`): el kit lee el token del login con auth.getAuthToken() para el registro y el vault.
    const rec = await opcionesRecuperacion(auth)
    // Con vault, el objeto PasskeyPrf solo marca recovery "passkey": la passkey la pide el vault en su propio origen.
    const llave = o.llave ? { passkeyPrf: new PasskeyPrf({ rpName: 'Lockumi' }) } : {}
    const s = await Cavos.connect({ ...CAVOS_BILLETERA, chains: [...CAVOS_BILLETERA.chains], auth, appId: APP_ID, ...rec, ...llave, vault: true })
    const w = s.wallet('stellar')
    cartera = w as unknown as CarteraStellar
    const b: Billetera = { direccion: w.address, estado: w.status as EstadoBilletera }
    return o.llave ? { ...b, llave: (w as unknown as { passkeyRestore?: boolean }).passkeyRestore === true } : b
  }
  if (o.llave) { const p = conectar(); conexion = p.catch(e => { conexion = null; throw e }); conexion.catch(() => {}); return p }
  return conexion ??= conectar().catch(e => { conexion = null; throw e })
}
export const olvidarBilletera = () => { conexion = null; cartera = null }

// ── Firmas y USDC (Stellar testnet) ──
// signXdr: firma una XDR armada por otro (p. ej. la API de Trustless Work) sin enviarla. Con el vault, contratos y
// trustlines quedan "fuera del límite": el vault muestra su propio aviso y la persona aprueba.
// Fuentes: https://docs.cavos.xyz/docs/stellar · https://docs.cavos.xyz/docs/vault
interface CarteraStellar {
  address: string; status: string
  signXdr(unsignedXdr: string): Promise<string>
  addTrustline(asset: { code: string; issuer: string }, opts?: { sponsored?: boolean }): Promise<string>
  tokenBalance(asset: { code: string; issuer: string }): Promise<string>
  signMessage?(message: string): Promise<{ signature?: Uint8Array | number[] | string; publicKey?: string } | unknown>
}
let cartera: CarteraStellar | null = null
export const USDC_TESTNET = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }
async function miCartera() { await conectarBilletera(); if (!cartera) throw new ErrorBilletera('sin-cartera', 'La billetera no está conectada.'); return cartera }
export async function firmarXdr(xdr: string): Promise<string> { return (await miCartera()).signXdr(xdr) }
/** Abre la trustline de USDC (la cuenta tiene que existir: la crea la tesorería de Lockumi primero). Paga la comisión en XLM de la propia cuenta. */
export async function abrirTrustlineUsdc(): Promise<string> {
  let w = await miCartera()
  // El kit guarda el estado al conectar: si la tesorería creó la cuenta después, volvemos a conectar para que la vea "ready".
  if (w.status === 'undeployed') { olvidarBilletera(); w = await miCartera() }
  return w.addTrustline(USDC_TESTNET, { sponsored: false })
}
export async function saldoUsdc(): Promise<string> { return (await miCartera()).tokenBalance(USDC_TESTNET) }
/** Mensaje claro para los rechazos del vault (https://docs.cavos.xyz/docs/vault). */
export function mensajeFirma(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (esNoFirmante(m)) return NO_FIRMANTE
  // Sesión perdida o vencida (pestaña nueva, token de ~1 h): antes salía el texto técnico «La sesión de Cavos no tiene token…».
  if (esSinSesion((e as { codigo?: string })?.codigo + ' ' + m)) return SIN_SESION
  if (/user rejected/i.test(m)) return 'Rechazaste la firma en la billetera.'
  if (/policy does not allow/i.test(m)) return 'La configuración de la billetera no permite esta firma (regla de aprobaciones en el panel de Cavos).'
  if (/deployed account|execute\(\)/i.test(m)) return 'Tu cuenta Stellar todavía no existe en testnet. Cárgale XLM de prueba primero.'
  return m
}

/** Gancho de prueba local (nunca en el build): una dirección fija en lugar de la billetera de Cavos. */
const prueba = () => import.meta.env.DEV && typeof localStorage !== 'undefined' ? localStorage.getItem('lockumi.billetera.prueba') : null

// LEGAL: pendiente (26/10/2026, opción A) · Términos 5.3: signMessage firma un TEXTO (no una transacción, no mueve fondos):
// el texto fijo «lockumi-login» al entrar y la prueba de billetera de cada acción del depósito. Es el único lugar que lo llama.
function firmarMensaje(w: CarteraStellar, m: string) {
  if (!w.signMessage) throw new ErrorBilletera('sin-firma-mensaje', 'La billetera no firma mensajes.')
  return w.signMessage(m)
}
const aBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
function firmaBase64(s: unknown): string {
  if (s instanceof Uint8Array || Array.isArray(s)) return aBase64(Uint8Array.from(s as ArrayLike<number>))
  if (typeof s === 'string') return /^[0-9a-f]{128}$/i.test(s) ? aBase64(Uint8Array.from(s.match(/../g)!.map(h => parseInt(h, 16)))) : s
  throw new ErrorBilletera('firma-mal-formada', 'La billetera no devolvió la firma.')
}
/** Opción A (26/10/2026): prueba firmada con Cavos de que la billetera es de esta persona, para UNA acción de UN alquiler
 *  (api/_lib/prueba-mensaje.ts). Nonce nuevo cada vez; el servidor la verifica y la gasta. Nunca se guarda. */
export async function firmarPrueba(accion: AccionPrueba, contrato: string): Promise<Prueba> {
  if (prueba()) throw new ErrorBilletera('sin-cartera', 'Billetera de prueba local: no firma.')
  const w = await miCartera()
  if (w.status === 'needs-device-approval') throw new ErrorBilletera('no-firmante', 'needs-device-approval')
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
  const ts = Math.floor(Date.now() / 1000)
  const r = await firmarMensaje(w, mensajePrueba(accion, contrato, w.address, nonce, ts)) as { signature?: unknown; publicKey?: unknown }
  return { direccion: w.address, clave: typeof r?.publicKey === 'string' ? r.publicKey : w.address, firma: firmaBase64(r?.signature), nonce, ts }
}

/** Prueba real de firma al entrar: conecta una vez y firma 'lockumi-login' (gratis). La firma se descarta: nunca se guarda.
 *  Sin reintentos ni conexiones con llave automáticas: un fallo aquí no dispara nada más (el vault solo borra su copia local
 *  dentro de connect, V:413-427; no volvemos a conectar por nuestra cuenta). Sin Cavos (demo simulada) no hay billetera: 'puede'. */
export async function probarFirma(): Promise<EstadoFirmante> {
  const g = prueba()
  if (!modoReal && !g) return 'puede'
  try {
    const b = await conectarBilletera()
    if (b.estado === 'needs-device-approval') return 'no-firmante'
    if (g) { const f = localStorage.getItem('lockumi.billetera.prueba.firma'); return f === 'no' ? 'no-firmante' : f === 'sin-sesion' || f === 'error' ? f : 'puede' }
    if (!cartera) return 'error'
    await firmarMensaje(cartera, MENSAJE_PRUEBA)
    return 'puede'
  } catch (e) { return clasificarFirma(e) }
}
/** ¿Hay sesión de Cavos con token en esta pestaña? Sin Cavos (demo) siempre true. No lee ni muestra el token: solo si existe. */
export async function haySesionFirma(): Promise<boolean> {
  const g = prueba()
  if (g) return localStorage.getItem('lockumi.billetera.prueba.sesion') !== 'no'
  if (!modoReal) return true
  try { const a = await authCavos(); return !!a && !!a.getAuthToken() } catch { return false }
}
