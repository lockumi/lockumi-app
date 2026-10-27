import type { Alquiler, Rol } from '../types'
import { modoDe } from '../servidor/config'
import { esDosPersonas } from '../prueba/dosPersonas'

/** ¿La firma del contrato pide primero «Entrar de nuevo» (ConSesion) si esta pestaña no tiene sesión de Cavos?
 *  - Inquilino (26/10): siempre, mientras no haya firmado (luego paga con su billetera).
 *  - Dueño (U4, 27/10/2026; con el OK de Katherine, 12:54 p. m. CR): solo si al alquiler le falta su cuenta Stellar. Sin sesión no hay
 *    billetera, la cuenta no se puede guardar al firmar y el pago del inquilino termina en 409 «Falta la cuenta Stellar del dueño.».
 *    Con la cuenta ya guardada (lo normal al crear con sesión) el dueño firma como antes, sin pedir nada. */
export function pideSesionAntesDeFirmar(a: Alquiler, rol: Rol): boolean {
  if (!esDosPersonas(a) || !modoDe(a).trustless || a.contrato.firmas[rol]) return false
  if (rol === 'inquilino') return true
  return rol === 'dueno' && a.miRol === 'dueno' && !a.cuentas?.dueno
}
