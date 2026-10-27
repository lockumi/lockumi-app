// Fase 1 (una sola persona, Stellar TESTNET, sin base de datos). Habla con /api/solo; las llaves de las cuentas de prueba
// viven solo en el servidor: aquí solo llegan claves públicas (G…), la cuenta segura (C…) y hashes de transacciones.
// Fuentes: https://developers.stellar.org/docs/data/apis/horizon/api-reference/list-strict-receive-payment-paths
//          https://docs.cavos.xyz/docs/stellar (signXdr, addTrustline) · https://docs.cavos.xyz/docs/vault
import { TOPE_USDC, MONTO_MAX_USDC, montoValido, mensajeSaldoPropio, mensajeSaldoAlPagar } from '../../api/_lib/red'
import { conectarBilletera, consultarUsdc, consultarSaldo, fondear, firmarXdr, abrirTrustlineUsdc, olvidarBilletera, mensajeFirma } from './billetera'

export { TOPE_USDC, MONTO_MAX_USDC, montoValido, mensajeSaldoPropio, mensajeSaldoAlPagar }
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

/** "Obtener USDC de prueba" con la billetera Cavos: la tesorería crea la cuenta si hace falta → trustline (addTrustline, la firma la persona) → la tesorería envía los USDC de prueba que faltan. */
export async function obtenerUsdc(objetivo: number, avance: (t: string) => void = () => {}): Promise<{ g: string; txs: Txs; saldo: string }> {
  if (!montoValido(objetivo, TOPE_USDC)) throw new ErrorSolo(`Puedes pedir hasta ${TOPE_USDC} USDC de prueba.`)
  if (usarPrueba()) { avance('Preparando el inquilino de prueba y enviando USDC de prueba…'); const r = await prepararCuentaPrueba(objetivo); return { ...r, saldo: (await consultarUsdc(r.g)) ?? '0' } }
  return prepararCuentaCavos(objetivo, avance)
}

/** La cuenta de la billetera Cavos existe en testnet (la crea la tesorería de Lockumi) y tiene la trustline de USDC (la firma la persona). Si ya está, solo lee. */
export async function asegurarTrustline(avance: (t: string) => void = () => {}, esperada?: string): Promise<{ g: string; trustline?: string }> {
  const g = (await conectarBilletera()).direccion
  if (esperada && g !== esperada) throw Object.assign(new ErrorSolo('No pudimos preparar el depósito. Intenta de nuevo en un momento.'), { otraCuenta: true })   // otra billetera: no tocamos nada
  if (await consultarSaldo(g) === null) { avance('Activando tu cuenta de prueba…'); await fondear(g); olvidarBilletera() }
  if (await consultarUsdc(g) !== null) return { g }
  avance('Habilitando USDC en tu cuenta…')
  try { return { g, trustline: await abrirTrustlineUsdc() } } catch (e) { throw new ErrorSolo(mensajeFirma(e)) }
}

/** Cuenta Cavos lista para pagar `objetivo`: la tesorería crea la cuenta si hace falta → trustline → la tesorería envía por USDC de prueba lo que falte. */
export async function prepararCuentaCavos(objetivo: number, avance: (t: string) => void = () => {}, esperada?: string): Promise<{ g: string; txs: Txs; saldo: string }> {
  const { g, trustline } = await asegurarTrustline(avance, esperada); const txs: Txs = { ...(trustline && { trustline }) }
  const saldo = Number(await consultarUsdc(g) ?? 0), falta = Math.round((objetivo - saldo) * 1e7) / 1e7
  if (falta > 0) {
    avance('Enviando USDC de prueba…')
    const r = await api<{ compraTx: string | null }>({ accion: 'usdc-cuenta', cuenta: g, monto: objetivo })
    if (r.compraTx) txs.compra = r.compraTx
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
