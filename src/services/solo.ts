// Fase 1 (una sola persona, Stellar TESTNET, sin base de datos). Habla con /api/solo; las llaves de las cuentas de prueba
// viven solo en el servidor: aquí solo llegan claves públicas (G…), la cuenta segura (C…) y hashes de transacciones.
// Fuentes: https://developers.stellar.org/docs/data/apis/horizon/api-reference/list-strict-receive-payment-paths
//          https://docs.cavos.xyz/docs/stellar (signXdr, addTrustline) · https://docs.cavos.xyz/docs/vault
import { PASSPHRASE_TESTNET, HORIZON_TESTNET, USDC, TOPE_USDC, MONTO_MAX_USDC, MAX_XLM_COMPRA, montoValido, mensajeSaldoPropio, mensajeSaldoAlPagar } from '../../api/_lib/red'
import { conectarBilletera, consultarUsdc, consultarSaldo, fondear, firmarXdr, abrirTrustlineUsdc, olvidarBilletera, mensajeFirma } from './billetera'

export { TOPE_USDC, MONTO_MAX_USDC, MAX_XLM_COMPRA, montoValido, mensajeSaldoPropio, mensajeSaldoAlPagar }
export class ErrorSolo extends Error {}
async function api<T>(cuerpo: Record<string, unknown>): Promise<T> {
  let r: Response
  try { r = await fetch('/api/solo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }) }
  catch { throw new ErrorSolo('No pudimos conectar con Lockumi. Revisa tu conexión a internet y vuelve a intentarlo.') }
  const j = await r.json().catch(() => ({})) as T & { error?: string }
  if (!r.ok) throw new ErrorSolo(j.error || `El servidor respondió ${r.status}. Intenta de nuevo en un minuto.`)
  return j
}

// ── Cuenta de prueba de respaldo (inquilino custodiado por Lockumi) ──
// El navegador guarda solo un identificador aleatorio; la llave se deriva y se usa en el servidor.
// Ahora el servidor firma por el inquilino de prueba (Cavos solo se usa para entrar). La firma con Cavos queda lista para después:
// se activa solo con localStorage 'lockumi.testnet.usar-cavos' = '1'.
const K_TOKEN = 'lockumi.testnet.cuenta-prueba', K_USAR = 'lockumi.testnet.usar-cavos'
export const usarPrueba = () => localStorage.getItem(K_USAR) !== '1'
export const fijarUsarPrueba = (v: boolean) => { localStorage.setItem(K_USAR, v ? '0' : '1'); dispatchEvent(new Event('lockumi-cuenta')) }
export function tokenPrueba() {
  let t = localStorage.getItem(K_TOKEN)
  if (!t || !/^[0-9a-f]{64}$/.test(t)) { t = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(K_TOKEN, t) }
  return t
}
const K_G_PRUEBA = 'lockumi.testnet.cuenta-prueba.g'
export const cuentaPruebaGuardada = () => localStorage.getItem(K_G_PRUEBA)

export type Txs = { trustline?: string; compra?: string }
/** Cuenta del inquilino: la billetera Cavos, o la cuenta de prueba de respaldo si está activado el interruptor. */
export async function cuentaInquilino(): Promise<{ g: string; prueba: boolean }> {
  if (usarPrueba()) return { g: cuentaPruebaGuardada() ?? '', prueba: true }   // '' = todavía no se creó (paso "Obtener USDC de prueba")
  return { g: (await conectarBilletera()).direccion, prueba: false }
}
export async function prepararCuentaPrueba(monto?: number): Promise<{ g: string; txs: Txs }> {
  const r = await api<{ inquilino: string; trustlineTx: string | null; compraTx: string | null }>({ accion: 'cuenta-prueba', token: tokenPrueba(), ...(monto !== undefined && { monto }) })
  localStorage.setItem(K_G_PRUEBA, r.inquilino)
  return { g: r.inquilino, txs: { ...(r.trustlineTx && { trustline: r.trustlineTx }), ...(r.compraTx && { compra: r.compraTx }) } }
}

/** Precio actual en XLM de prueba para recibir `cantidad` USDC de prueba (DEX de testnet). */
export async function cotizar(cantidad: number, f: typeof fetch = fetch): Promise<number> {
  const q = new URLSearchParams({ destination_asset_type: 'credit_alphanum4', destination_asset_code: USDC.code, destination_asset_issuer: USDC.issuer, destination_amount: cantidad.toFixed(7), source_assets: 'native' })
  const r = await f(`${HORIZON_TESTNET}/paths/strict-receive?${q}`)
  if (!r.ok) throw new ErrorSolo('No pudimos consultar el precio de prueba. Intenta de nuevo en un minuto.')
  const j = await r.json() as { _embedded?: { records?: { source_amount: string }[] } }
  const p = (j._embedded?.records ?? []).map(x => Number(x.source_amount)).filter(n => n > 0)
  if (!p.length) throw new ErrorSolo('Ahora no hay USDC de prueba disponible en la red de prueba. Intenta más tarde o usa faucet.circle.com.')
  return Math.min(...p)
}
/** Máximo a gastar: precio + 10 %, nunca más de MAX_XLM_COMPRA. Si el precio ya pasa ese tope, no se compra. */
export function maximoAGastar(precio: number) {
  const max = Math.ceil(precio * 1.1 * 1e7) / 1e7
  if (precio > MAX_XLM_COMPRA) throw new ErrorSolo(`El precio de prueba subió (${precio.toFixed(2)} XLM). Por seguridad no gastamos más de ${MAX_XLM_COMPRA} XLM de prueba. Intenta más tarde.`)
  return Math.min(max, MAX_XLM_COMPRA)
}

/** "Obtener USDC de prueba" con la billetera Cavos: Friendbot si hace falta → trustline (addTrustline) → path payment XLM→USDC (signXdr). */
export async function obtenerUsdc(objetivo: number, avance: (t: string) => void = () => {}): Promise<{ g: string; txs: Txs; saldo: string }> {
  if (!montoValido(objetivo, TOPE_USDC)) throw new ErrorSolo(`Puedes pedir hasta ${TOPE_USDC} USDC de prueba.`)
  if (usarPrueba()) { avance('Preparando el inquilino de prueba y enviando USDC de prueba…'); const r = await prepararCuentaPrueba(objetivo); return { ...r, saldo: (await consultarUsdc(r.g)) ?? '0' } }
  const g = (await conectarBilletera()).direccion; const txs: Txs = {}
  if (await consultarSaldo(g) === null) { avance('Activando tu cuenta con XLM de prueba gratis…'); await fondear(g); olvidarBilletera() }
  if (await consultarUsdc(g) === null) {
    avance('Habilitando USDC en tu cuenta…')
    try { txs.trustline = await abrirTrustlineUsdc() } catch (e) { throw new ErrorSolo(mensajeFirma(e)) }
  }
  const saldo = Number(await consultarUsdc(g) ?? 0), falta = Math.round((objetivo - saldo) * 1e7) / 1e7
  if (falta > 0) {
    avance('Consultando el precio de prueba…')
    const max = maximoAGastar(await cotizar(falta))
    const { TransactionBuilder, Operation, Asset, Account } = await import('@stellar/stellar-sdk')
    const r = await fetch(`${HORIZON_TESTNET}/accounts/${g}`); if (!r.ok) throw new ErrorSolo('No pudimos leer tu cuenta en la red de prueba. Intenta de nuevo.')
    const a = await r.json() as { sequence: string }
    const t = new TransactionBuilder(new Account(g, a.sequence), { fee: '1000', networkPassphrase: PASSPHRASE_TESTNET })
      .addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: max.toFixed(7), destination: g, destAsset: new Asset(USDC.code, USDC.issuer), destAmount: falta.toFixed(7), path: [] }))
      .setTimeout(120).build()
    avance('Confirma la compra en tu billetera…')
    let firmada: string; try { firmada = await firmarXdr(t.toXDR()) } catch (e) { throw new ErrorSolo(mensajeFirma(e)) }
    avance('Comprando USDC de prueba…')
    const s = await fetch(`${HORIZON_TESTNET}/transactions`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'tx=' + encodeURIComponent(firmada) })
    const j = await s.json().catch(() => ({})) as { hash?: string; extras?: { result_codes?: { operations?: string[] } } }
    if (!s.ok || !j.hash) {
      const c = j.extras?.result_codes?.operations?.[0] ?? ''
      throw new ErrorSolo(/over_sendmax|too_few_offers/.test(c) ? 'El precio de prueba cambió mientras comprabas. Vuelve a tocar el botón.'
        : /underfunded/.test(c) ? 'No te alcanza el XLM de prueba para comprar. Usa faucet.circle.com para recibir USDC de prueba gratis.'
        : 'La red de prueba rechazó la compra. Vuelve a intentarlo en un minuto.')
    }
    txs.compra = j.hash
  }
  return { g, txs, saldo: (await consultarUsdc(g)) ?? '0' }
}

// ── Depósito, aprobación y liberación ──
export type Pasos = Partial<Record<'escrow' | 'trustline' | 'compra' | 'deposito' | 'evidencia' | 'aprobacion' | 'liberacion' | 'duenoTrustline', string>>
export async function depositar(contrato: string, monto: number, avance: (t: string) => void = () => {}) {
  if (!montoValido(monto)) throw new ErrorSolo(`El depósito de prueba es de máximo ${MONTO_MAX_USDC.toLocaleString('es-CR')} USDC.`)
  const { g, prueba } = await cuentaInquilino()
  if (!g) throw new ErrorSolo('Primero toca "Obtener USDC de prueba".')
  avance('Preparando la cuenta del dueño de prueba…')
  const d = await api<{ dueno: string; trustlineTx: string | null }>({ accion: 'dueno', contrato })
  avance('Creando la cuenta segura del depósito…')
  const e = await desplegar(contrato, g, monto, prueba ? 'lockumi' : 'propia')
  const pasos: Pasos = { escrow: e.tx, ...(d.trustlineTx && { duenoTrustline: d.trustlineTx }) }
  let deposito: string
  if (prueba) { avance('Depositando desde la cuenta de prueba…'); deposito = (await api<{ tx: string }>({ accion: 'fondear-prueba', escrow: e.escrow, token: tokenPrueba() })).tx }
  else {
    const { unsignedXdr } = await api<{ unsignedXdr: string }>({ accion: 'fondear', escrow: e.escrow, inquilino: g })
    avance('Confirma el depósito en tu billetera…')
    let firmada: string; try { firmada = await firmarXdr(unsignedXdr) } catch (x) { throw Object.assign(new ErrorSolo(mensajeFirma(x)), { escrow: e.escrow, pasos }) }
    avance('Guardando el depósito en la cuenta segura…')
    deposito = (await api<{ tx: string }>({ accion: 'enviar-deposito', escrow: e.escrow, signedXdr: firmada })).tx
  }
  return { escrow: e.escrow, dueno: d.dueno, inquilino: g, prueba, pasos: { ...pasos, deposito } as Pasos }
}
/** Si el depósito falló después de crear la cuenta segura, se reintenta solo el depósito sobre ese mismo escrow. */
export async function reintentarDeposito(escrow: string) {
  const { g, prueba } = await cuentaInquilino()
  if (prueba) return (await api<{ tx: string }>({ accion: 'fondear-prueba', escrow, token: tokenPrueba() })).tx
  const { unsignedXdr } = await api<{ unsignedXdr: string }>({ accion: 'fondear', escrow, inquilino: g })
  let firmada: string; try { firmada = await firmarXdr(unsignedXdr) } catch (x) { throw new ErrorSolo(mensajeFirma(x)) }
  return (await api<{ tx: string }>({ accion: 'enviar-deposito', escrow, signedXdr: firmada })).tx
}
export const prepararDueno = (contrato: string) => api<{ dueno: string; trustlineTx: string | null }>({ accion: 'dueno', contrato })
/** Crea la cuenta segura. `origen` dice de dónde salen los USDC de prueba: con 'lockumi' va el token de la cuenta de prueba y el
 *  servidor la completa hasta el monto justo antes de revisar el saldo (devuelve `compraTx` si envió USDC de prueba). */
export const desplegar = (contrato: string, inquilino: string, monto: number, origen: 'lockumi' | 'propia') =>
  api<{ escrow: string; tx: string; dueno: string; permiso?: string; trustlineTx?: string | null; compraTx?: string | null }>({ accion: 'desplegar', contrato, inquilino, monto, origen, ...(origen === 'lockumi' && { token: tokenPrueba() }) })
/** Cuenta propia: el servidor arma la transacción del depósito para la dirección de la persona; su billetera la firma. */
export const fondearPropio = (escrow: string, inquilino: string) => api<{ unsignedXdr: string }>({ accion: 'fondear', escrow, inquilino })
export const enviarDeposito = (escrow: string, signedXdr: string) => api<{ tx: string }>({ accion: 'enviar-deposito', escrow, signedXdr })
export const fondearPrueba = (escrow: string) => api<{ tx: string; compraTx: string | null }>({ accion: 'fondear-prueba', escrow, token: tokenPrueba() })
/** Prueba de que este navegador creó el depósito (A1): el permiso que devolvió «desplegar» o, en depósitos de antes, el token de su cuenta de prueba. */
export type Autorizacion = { permiso: string } | { token: string }
export const autorizacion = (red?: { permiso?: string }): Autorizacion => red?.permiso ? { permiso: red.permiso } : { token: tokenPrueba() }
export const disputar = (escrow: string, auth: Autorizacion) => api<{ tx?: string; yaDisputado?: boolean }>({ accion: 'disputar', escrow, ...auth })
export const resolver = (escrow: string, alDueno: number, reclamado: number, auth: Autorizacion) => api<{ tx?: string; yaResuelto?: boolean }>({ accion: 'resolver', escrow, alDueno, reclamado, ...auth })
export const aprobar = (escrow: string, huella?: string) => api<{ evidenciaTx: string | null; aprobacionTx?: string; yaAprobado?: boolean }>({ accion: 'aprobar', escrow, ...(huella && { huella }) })
export const liberar = (escrow: string) => api<{ tx: string }>({ accion: 'liberar', escrow })

/** Huella SHA-256 del acta de salida: hash de las huellas de las fotos (no de datos personales). */
export async function huellaActa(huellas: string[]): Promise<string | undefined> {
  const hs = huellas.filter(h => /^[0-9a-f]{64}$/.test(h)).sort(); if (!hs.length) return undefined
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hs.join('\n')))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
