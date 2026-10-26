// Depósito con USDC de prueba de la PROPIA cuenta del inquilino (sin tope de 20: el límite es su saldo real, hasta el máximo de la app).
// Firma la billetera de la persona: su cuenta Lockumi (Cavos, signXdr) o Freighter. Lockumi nunca ve su llave.
// Fuentes: https://docs.freighter.app/docs/guide/usingFreighterWebApp (isConnected, requestAccess, getNetworkDetails, signTransaction)
//          https://docs.cavos.xyz/docs/stellar (signXdr)
import { PASSPHRASE_TESTNET } from '../../api/_lib/red'
import { conectarBilletera, consultarUsdc, firmarXdr, mensajeFirma, NO_FIRMANTE } from './billetera'
import { esTextoSinSesion } from './firmante'
import { modoReal } from './auth'

export type Firma = 'cavos' | 'freighter'
export const NOMBRE_FIRMA: Record<Firma, string> = { cavos: 'tu cuenta Lockumi', freighter: 'Freighter' }
export class ErrorCuenta extends Error {}

/** ¿Está Freighter instalado en este navegador? (sin pedir permiso) */
export async function hayFreighter(): Promise<boolean> {
  try { const f = await import('@stellar/freighter-api'); return (await f.isConnected()).isConnected === true } catch { return false }
}
/** ¿Se puede usar la cuenta Lockumi (Cavos) para firmar? Solo si la app entra con Cavos. */
export const hayCavos = () => modoReal

/** Conecta la billetera elegida y devuelve su dirección pública G… */
export async function conectar(firma: Firma): Promise<string> {
  if (firma === 'cavos') {
    let b: Awaited<ReturnType<typeof conectarBilletera>>
    try { b = await conectarBilletera() }
    catch (e) { const m = mensajeFirma(e); throw new ErrorCuenta(esTextoSinSesion(m) ? m : 'No pudimos abrir tu cuenta Lockumi. Cierra sesión, vuelve a entrar y toca el botón otra vez.') }
    // Firmante (26/10): antes devolvía la dirección aunque este dispositivo no pudiera firmar, y el error salía recién al pagar.
    if (b.estado === 'needs-device-approval') throw new ErrorCuenta(NO_FIRMANTE)
    return b.direccion
  }
  const f = await import('@stellar/freighter-api')
  if (!(await f.isConnected()).isConnected) throw new ErrorCuenta('No encontramos Freighter en este navegador. Instálalo desde freighter.app y vuelve a tocar el botón.')
  const a = await f.requestAccess()
  if (a.error || !a.address) throw new ErrorCuenta('Freighter no compartió tu cuenta. Ábrelo, acepta la conexión con Lockumi y vuelve a tocar el botón.')
  const n = await f.getNetworkDetails()
  if (n.networkPassphrase !== PASSPHRASE_TESTNET) throw new ErrorCuenta('Freighter está en otra red. Ábrelo, cambia a «Testnet» y vuelve a tocar el botón.')
  return a.address
}

/** USDC de prueba de Circle en la cuenta: número (0 si no tiene), o null si la cuenta no existe o no tiene USDC habilitado. */
export async function saldoPropio(g: string): Promise<number | null> {
  const s = await consultarUsdc(g); return s === null || s === undefined ? null : Number(s)
}

/** La billetera firma la transacción del depósito que armó el servidor (no se envía aquí). */
export async function firmar(firma: Firma, xdr: string, g: string): Promise<string> {
  if (firma === 'cavos') {
    try { return await firmarXdr(xdr) } catch (e) { throw new ErrorCuenta(mensajeFirma(e) + ' Vuelve a tocar el botón cuando estés listo.') }
  }
  const f = await import('@stellar/freighter-api')
  const r = await f.signTransaction(xdr, { networkPassphrase: PASSPHRASE_TESTNET, address: g })
  if (r.error || !r.signedTxXdr) throw new ErrorCuenta('No se firmó el depósito en Freighter. Vuelve a tocar el botón y acepta en Freighter.')
  if (r.signerAddress && r.signerAddress !== g) throw new ErrorCuenta('Freighter firmó con otra cuenta. Elige en Freighter la misma cuenta que usaste al crear el alquiler y vuelve a tocar el botón.')
  return r.signedTxXdr
}
