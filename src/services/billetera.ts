// Billetera Stellar testnet con Cavos (@cavos/kit) + lectura de saldo en Horizon y fondeo con Friendbot.
// Fuentes: https://docs.cavos.xyz/docs/stellar (Cavos.connect con chains ["stellar"], network "testnet")
//          https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/accounts (GET /accounts/{id}, 404 si no existe)
//          https://developers.stellar.org/docs/learn/fundamentals/networks#friendbot (fondeo de testnet)
import { CAVOS_BILLETERA, authCavos, modoReal, APP_ID } from './auth'

export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
export const FRIENDBOT = 'https://friendbot.stellar.org'
export type EstadoBilletera = 'undeployed' | 'ready' | 'needs-device-approval'
export interface Billetera { direccion: string; estado: EstadoBilletera }
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

/** Pide a Friendbot que cree y fondee la cuenta en testnet (10 000 XLM de prueba). */
export async function fondear(g: string, f: Fetch = fetch): Promise<void> {
  const r = await f(`${FRIENDBOT}/?addr=${encodeURIComponent(g)}`)
  if (r.ok) return
  // Friendbot responde 400 si la cuenta ya existe: no es un error para el usuario.
  const t = await r.text().catch(() => '')
  if (r.status === 400 && /already|createAccountAlreadyExist|op_already_exists/i.test(t)) return
  throw new Error('friendbot ' + r.status)
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

/** Texto para cuando este dispositivo no puede firmar con la billetera (creada en otro navegador o equipo). */
export const NO_FIRMANTE = 'Este dispositivo todavía no puede firmar con tu billetera. Sal y vuelve a entrar con la misma cuenta, y paga enseguida. Si sigue igual, entra una vez desde el navegador donde creaste tu cuenta y luego vuelve a intentarlo aquí.'
export const esNoFirmante = (m: string) => /not an authorized signer|needs-device-approval|restore by connecting with the enclave|protected by recovery|complete a fresh social login/i.test(m)

let conexion: Promise<Billetera> | null = null
/** Conecta la billetera con la identidad del login de Cavos. Solo en modo real. */
export function conectarBilletera(): Promise<Billetera> {
  if (import.meta.env.DEV) { // gancho de prueba local, nunca en el build
    const g = localStorage.getItem('lockumi.billetera.prueba')
    if (g) return Promise.resolve({ direccion: g, estado: 'undeployed' })
  }
  if (!modoReal) return Promise.reject(new Error('simulado'))
  return conexion ??= (async () => {
    const auth = await authCavos()
    if (!auth) throw new ErrorBilletera('sin-identidad', 'No hay identidad de Cavos guardada en este navegador.')
    if (!auth.getAuthToken()) throw new ErrorBilletera('sin-token', 'La sesión de Cavos no tiene token en esta pestaña (se abrió en otra pestaña o se cerró).')
    const { Cavos } = await import('@cavos/kit')
    // `auth` (no solo `identity`): el kit lee el token del login con auth.getAuthToken() para el registro y el vault.
    const rec = await opcionesRecuperacion(auth)
    const s = await Cavos.connect({ ...CAVOS_BILLETERA, chains: [...CAVOS_BILLETERA.chains], auth, appId: APP_ID, vault: true, ...rec })
    const w = s.wallet('stellar')
    cartera = w as unknown as CarteraStellar
    return { direccion: w.address, estado: w.status as EstadoBilletera }
  })().catch(e => { conexion = null; throw e })
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
}
let cartera: CarteraStellar | null = null
export const USDC_TESTNET = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }
async function miCartera() { await conectarBilletera(); if (!cartera) throw new ErrorBilletera('sin-cartera', 'La billetera no está conectada.'); return cartera }
export async function firmarXdr(xdr: string): Promise<string> { return (await miCartera()).signXdr(xdr) }
/** Abre la trustline de USDC (la cuenta tiene que existir: Friendbot primero). Paga la comisión en XLM de la propia cuenta. */
export async function abrirTrustlineUsdc(): Promise<string> {
  let w = await miCartera()
  // El kit guarda el estado al conectar: si Friendbot creó la cuenta después, volvemos a conectar para que la vea "ready".
  if (w.status === 'undeployed') { olvidarBilletera(); w = await miCartera() }
  return w.addTrustline(USDC_TESTNET, { sponsored: false })
}
export async function saldoUsdc(): Promise<string> { return (await miCartera()).tokenBalance(USDC_TESTNET) }
/** Mensaje claro para los rechazos del vault (https://docs.cavos.xyz/docs/vault). */
export function mensajeFirma(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (esNoFirmante(m)) return NO_FIRMANTE
  if (/user rejected/i.test(m)) return 'Rechazaste la firma en la billetera.'
  if (/policy does not allow/i.test(m)) return 'La configuración de la billetera no permite esta firma (regla de aprobaciones en el panel de Cavos).'
  if (/deployed account|execute\(\)/i.test(m)) return 'Tu cuenta Stellar todavía no existe en testnet. Cárgale XLM de prueba primero.'
  return m
}
