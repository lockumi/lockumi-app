// Escrow real en Trustless Work (Stellar testnet) por el proxy /api/tw: la llave de la API queda en el servidor.
// Camino feliz: la plataforma despliega → el inquilino deposita (firma con Cavos) → acta de salida → el dueño aprueba
// (firma con Cavos) → se cierra sin reclamo → la plataforma libera el 100 % al inquilino.
// Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/introduction · https://docs.cavos.xyz/docs/stellar
import { tokenSesion, recargar } from '../servidor/repositorio'
import { firmarXdr, mensajeFirma } from './billetera'

export class ErrorTrustless extends Error {}
async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await tokenSesion() }, body: JSON.stringify(cuerpo) })
  const j = await r.json().catch(() => ({})) as T & { error?: string }
  if (!r.ok) throw new ErrorTrustless(j.error || `El servidor respondió ${r.status}.`)
  return j
}
async function firmarYEnviar(contrato: string, paso: 'fondear' | 'aprobar', unsignedXdr: string) {
  let signedXdr: string
  try { signedXdr = await firmarXdr(unsignedXdr) } catch (e) { throw new ErrorTrustless(mensajeFirma(e)) }
  return (await llamar<{ tx: string }>({ accion: 'enviar', contrato, paso, signedXdr })).tx
}
export const trustless = {
  /** Crea el escrow (si falta) y deposita el monto desde la cuenta Cavos del inquilino. Devuelve el hash de la transacción. */
  async depositar(contrato: string): Promise<string> {
    await llamar({ accion: 'desplegar', contrato })
    const { unsignedXdr } = await llamar<{ unsignedXdr: string }>({ accion: 'fondear', contrato })
    return firmarYEnviar(contrato, 'fondear', unsignedXdr)
  },
  /** El dueño aprueba devolver el depósito (hito "entrega sin daños"). */
  async aprobarDevolucion(contrato: string): Promise<string> {
    const { unsignedXdr } = await llamar<{ unsignedXdr: string }>({ accion: 'aprobar', contrato })
    const tx = await firmarYEnviar(contrato, 'aprobar', unsignedXdr); await recargar(); return tx
  },
  /** Libera el 100 % al inquilino (contrato cerrado sin reclamo y hito aprobado). */
  /** Paso 7: sin la aprobación del dueño, la devolución automática del 100 % al inquilino (disputa + resolución en el servidor). */
  async devolverAutomatico(contrato: string): Promise<string> {
    const { tx } = await llamar<{ tx: string }>({ accion: 'devolver-automatico', contrato }); await recargar(); return tx
  },
  async liberar(contrato: string): Promise<string> {
    const { tx } = await llamar<{ tx: string }>({ accion: 'liberar', contrato }); await recargar(); return tx
  },
}
