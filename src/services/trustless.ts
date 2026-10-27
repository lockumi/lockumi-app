// Escrow real en Trustless Work (Stellar testnet) por el proxy /api/tw: la llave de la API queda en el servidor.
// Camino feliz: la plataforma despliega → el inquilino deposita (firma con Cavos) → acta de salida → el dueño aprueba
// (firma con Cavos) → se cierra sin reclamo → la plataforma libera el 100 % al inquilino.
// Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/introduction · https://docs.cavos.xyz/docs/stellar
import { tokenSesion, recargar } from '../servidor/repositorio'
import { firmarXdr, firmarPrueba, mensajeFirma, esTextoNoFirmante, conectarBilletera } from './billetera'
import { SIN_PRUEBA, type AccionPrueba, type Prueba } from '../../api/_lib/prueba-mensaje'
import { esTextoSinSesion } from './firmante'
import { NO_PREPARAR_DEPOSITO, esTecnico } from '../../api/_lib/red'

export class ErrorTrustless extends Error {}
async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await tokenSesion() }, body: JSON.stringify(cuerpo) })
  const j = await r.json().catch(() => ({})) as T & { error?: string }
  // Nunca el error técnico (en inglés) de Trustless Work u Horizon en pantalla: solo en la consola.
  if (!r.ok) { const m = j.error || ''; if (!m || esTecnico(m)) { console.warn('[Lockumi] /api/tw', r.status, m); throw new ErrorTrustless(NO_PREPARAR_DEPOSITO) } throw new ErrorTrustless(m) }
  return j
}
async function firmarYEnviar(contrato: string, unsignedXdr: string) {
  let signedXdr: string
  try { signedXdr = await firmarXdr(unsignedXdr) } catch (e) { throw new ErrorTrustless(mensajeFirma(e)) }
  return (await llamar<{ tx: string }>({ accion: 'enviar', contrato, paso: 'aprobar', signedXdr })).tx
}
/** Opción A (26/10/2026): cada acción que mueve la cuenta segura va con una prueba nueva firmada con Cavos. Si este
 *  dispositivo no pudo firmarla, se pide igual (los alquileres de antes con cuenta del servidor no la necesitan) y, si el
 *  servidor la exige, se muestra el motivo real (este dispositivo no puede firmar, o volver a entrar). */
async function conPrueba<T>(accion: AccionPrueba, contrato: string): Promise<T> {
  let prueba: Prueba | undefined, fallo: unknown = null
  try { prueba = await firmarPrueba(accion, contrato) } catch (e) { fallo = e }
  try { return await llamar<T>({ accion, contrato, ...prueba ? { prueba } : {} }) }
  catch (e) { if (fallo && e instanceof Error && e.message === SIN_PRUEBA) throw new ErrorTrustless(mensajeFirma(fallo)); throw e }
}
/** La cuenta del alquiler no es la billetera de este dispositivo (cuenta del servidor de un alquiler de antes, PR #54) o este
 *  dispositivo no puede firmar: se sigue y el servidor decide (prepara la cuenta de antes, o pide la prueba y muestra el motivo). */
const esLegado = (e: unknown) => (e as { otraCuenta?: boolean })?.otraCuenta === true || [esTextoNoFirmante, esTextoSinSesion].some(f => f(e instanceof Error ? e.message : String(e)))
/** Como /api/wallet/activate de Meteorito: la plataforma crea la cuenta y paga la reserva (patrocinio), y la persona firma con Cavos la
 *  línea de confianza de USDC. Sin Friendbot ni XLM propio. Si ya está lista, solo lee. */
async function activarCuenta(contrato: string, avance: (t: string) => void, esperada?: string): Promise<void> {
  const g = (await conectarBilletera()).direccion
  if (esperada && g !== esperada) throw Object.assign(new ErrorTrustless(NO_PREPARAR_DEPOSITO), { otraCuenta: true })   // otra billetera: no tocamos nada
  if ((await llamar<{ listo: boolean }>({ accion: 'activar-cuenta', contrato, paso: 'estado' })).listo) return
  avance('Activando tu cuenta de prueba…')
  let prueba: Prueba
  try { prueba = await firmarPrueba('activar-cuenta', contrato) } catch (e) { throw new ErrorTrustless(mensajeFirma(e)) }
  const { unsignedXdr } = await llamar<{ unsignedXdr?: string }>({ accion: 'activar-cuenta', contrato, paso: 'preparar', prueba })
  if (!unsignedXdr) return
  let signedXdr: string
  try { signedXdr = await firmarXdr(unsignedXdr) } catch (e) { throw new ErrorTrustless(mensajeFirma(e)) }
  await llamar({ accion: 'activar-cuenta', contrato, paso: 'enviar', signedXdr })
}
export const trustless = {
  /** Opción A (26/10/2026, SIMULACIÓN TESTNET): el inquilino prueba con Cavos que la billetera es suya; Lockumi crea la cuenta
   *  segura y la fondea con USDC de prueba (ramp simulado, api/_lib/rampSimulado.ts). Antes deja lista su cuenta para recibir
   *  la devolución (Friendbot y trustline, si faltan). `cuenta`: la del alquiler. Devuelve el hash del fondeo. */
  async depositar(contrato: string, _monto?: number, avance: (t: string) => void = () => {}, cuenta?: string): Promise<string> {
    await activarCuenta(contrato, avance, cuenta).catch(e => { if (!esLegado(e)) throw e })
    avance('Guardando el depósito en la cuenta segura…')
    return (await conPrueba<{ tx: string }>('pagar', contrato)).tx
  },
  /** El dueño (al abrir un reclamo) deja lista su cuenta para recibir USDC en un reparto (activación patrocinada, si falta).
   *  Alquileres de antes con cuenta del servidor (PR #54): la prepara el servidor. */
  async prepararDueno(cuenta?: string, contrato?: string): Promise<void> {
    if (!contrato) return
    try { await activarCuenta(contrato, () => {}, cuenta) } catch (e) { if (!esLegado(e)) throw e; await llamar({ accion: 'preparar-cuenta', contrato }) }
  },
  /** El dueño aprueba devolver el depósito (hito "entrega sin daños"). */
  async aprobarDevolucion(contrato: string): Promise<string> {
    const r = await conPrueba<{ unsignedXdr?: string; tx?: string }>('aprobar', contrato)
    const tx = r.tx ?? await firmarYEnviar(contrato, r.unsignedXdr!); await recargar(); return tx
  },
  /** Paso 7: sin la aprobación del dueño, la devolución automática del 100 % al inquilino (disputa + resolución en el servidor). */
  async devolverAutomatico(contrato: string): Promise<string> {
    const { tx } = await conPrueba<{ tx: string }>('devolver-automatico', contrato); await recargar(); return tx
  },
  /** PR #22: paga en la red el reparto de un caso cerrado por acuerdo o con las dos aceptaciones (disputa + resolución en el servidor). */
  async repartir(contrato: string): Promise<string> {
    const { tx } = await conPrueba<{ tx: string }>('repartir', contrato); await recargar(); return tx
  },
  /** Libera el 100 % al inquilino (contrato cerrado sin reclamo y hito aprobado). */
  async liberar(contrato: string): Promise<string> {
    const { tx } = await conPrueba<{ tx: string }>('liberar', contrato); await recargar(); return tx
  },
}
