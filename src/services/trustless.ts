// Escrow real en Trustless Work (Stellar testnet) por el proxy /api/tw: la llave de la API queda en el servidor.
// Camino feliz: la plataforma despliega → el inquilino deposita (firma con Cavos) → acta de salida → el dueño aprueba
// (firma con Cavos) → se cierra sin reclamo → la plataforma libera el 100 % al inquilino.
// Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/introduction · https://docs.cavos.xyz/docs/stellar
import { tokenSesion, recargar } from '../servidor/repositorio'
import { firmarXdr, mensajeFirma } from './billetera'
import { prepararCuentaCavos, asegurarTrustline } from './solo'
import { NO_PREPARAR_DEPOSITO, esTecnico } from '../../api/_lib/red'

export class ErrorTrustless extends Error {}
async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await tokenSesion() }, body: JSON.stringify(cuerpo) })
  const j = await r.json().catch(() => ({})) as T & { error?: string }
  // Nunca el error técnico (en inglés) de Trustless Work u Horizon en pantalla: solo en la consola.
  if (!r.ok) { const m = j.error || ''; if (!m || esTecnico(m)) { console.warn('[Lockumi] /api/tw', r.status, m); throw new ErrorTrustless(NO_PREPARAR_DEPOSITO) } throw new ErrorTrustless(m) }
  return j
}
async function firmarYEnviar(contrato: string, paso: 'fondear' | 'aprobar', unsignedXdr: string) {
  let signedXdr: string
  try { signedXdr = await firmarXdr(unsignedXdr) } catch (e) { throw new ErrorTrustless(mensajeFirma(e)) }
  return (await llamar<{ tx: string }>({ accion: 'enviar', contrato, paso, signedXdr })).tx
}
/** Firma del servidor en testnet (api/_lib/tw.ts, «mi-cuenta»): la cuenta de testnet de esta sesión, o null si está apagada. */
export async function cuentaServidor(): Promise<string | null> {
  try { return (await llamar<{ cuenta: string | null }>({ accion: 'mi-cuenta' })).cuenta ?? null } catch { return null }
}
const esDelServidor = async (cuenta?: string) => !!cuenta && cuenta === await cuentaServidor()
export const trustless = {
  /** Crea el escrow (si falta) y deposita el monto desde la cuenta Cavos del inquilino. Devuelve el hash de la transacción. */
  // 26/10/2026: la cuenta del inquilino es el «receiver» del escrow: Trustless Work exige que exista y tenga la trustline de USDC
  // (si no, 400). Antes de crear la cuenta segura, como «Obtener USDC de prueba» de un solo aparato: Friendbot → trustline →
  // USDC de prueba del exchange de testnet por lo que falte. Si ya está lista, solo lee Horizon. `cuenta`: la del alquiler.
  async depositar(contrato: string, monto?: number, avance: (t: string) => void = () => {}, cuenta?: string): Promise<string> {
    // Firma del servidor (testnet): el servidor deja lista la cuenta y firma el depósito. Sin firma en este dispositivo.
    const servidor = await esDelServidor(cuenta)
    if (servidor) await llamar({ accion: 'preparar-cuenta', contrato })
    else if (monto !== undefined) await prepararCuentaCavos(monto, avance, cuenta)
    avance('Creando la cuenta segura del depósito…')
    await llamar({ accion: 'desplegar', contrato })
    const r = await llamar<{ unsignedXdr?: string; tx?: string }>({ accion: 'fondear', contrato })
    avance('Guardando el depósito en la cuenta segura…')
    if (r.tx) return r.tx
    return firmarYEnviar(contrato, 'fondear', r.unsignedXdr!)
  },
  /** El dueño (al abrir un reclamo) deja lista su cuenta para recibir USDC en un reparto: Friendbot y trustline, si faltan. */
  async prepararDueno(cuenta?: string, contrato?: string): Promise<void> {
    if (contrato && await esDelServidor(cuenta)) { await llamar({ accion: 'preparar-cuenta', contrato }); return }
    await asegurarTrustline(() => {}, cuenta)
  },
  /** El dueño aprueba devolver el depósito (hito "entrega sin daños"). */
  async aprobarDevolucion(contrato: string): Promise<string> {
    const r = await llamar<{ unsignedXdr?: string; tx?: string }>({ accion: 'aprobar', contrato })
    const tx = r.tx ?? await firmarYEnviar(contrato, 'aprobar', r.unsignedXdr!); await recargar(); return tx
  },
  /** Libera el 100 % al inquilino (contrato cerrado sin reclamo y hito aprobado). */
  /** Paso 7: sin la aprobación del dueño, la devolución automática del 100 % al inquilino (disputa + resolución en el servidor). */
  async devolverAutomatico(contrato: string): Promise<string> {
    const { tx } = await llamar<{ tx: string }>({ accion: 'devolver-automatico', contrato }); await recargar(); return tx
  },
  /** PR #22: paga en la red el reparto de un caso cerrado por acuerdo o con las dos aceptaciones (disputa + resolución en el servidor). */
  async repartir(contrato: string): Promise<string> {
    const { tx } = await llamar<{ tx: string }>({ accion: 'repartir', contrato }); await recargar(); return tx
  },
  async liberar(contrato: string): Promise<string> {
    const { tx } = await llamar<{ tx: string }>({ accion: 'liberar', contrato }); await recargar(); return tx
  },
}
