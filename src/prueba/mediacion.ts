// Mediación Lockumi (demo) de la prueba completa (Términos 1.7-demo, 6.3 f, 6.7, 6.8; B.7, B.12, B.14). Funciones puras.
// En la demo no hay una persona real: el reparto se elige con «Resolver el reclamo (simulación)» (6.8 b). La mediación con una
// persona del equipo queda fuera hasta que Legal publique el texto de Privacidad (LEGAL-produccion-2114.md).
import type { Alquiler } from '../types'
import { sumarHabiles } from '../../api/_lib/plazos'

export const CUPO = 10
const iso = (t: number) => new Date(t).toISOString()
const u = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`

/** Casos que la Mediación Lockumi (demo) atiende ahora: en mediación y con la mediación pedida. */
export const casosActivos = (lista: Alquiler[]) => lista.filter(a => a.estado === 'mediacion' && a.reclamo?.mediacion?.estado === 'pedida').length

/** Pedir la mediación (B.7). Si ya hay 10 casos, queda «sin cupo» (B.12). Una sola vez por reclamo. */
export function pedirMediacion(x: Alquiler, lista: Alquiler[], ahora: number): 'pedida' | 'sin-cupo' | 'no-usar' {
  const r = x.reclamo!; if (r.mediacion) return r.mediacion.estado
  const estado = casosActivos(lista.filter(a => a.id !== x.id)) >= CUPO ? 'sin-cupo' : 'pedida'
  r.mediacion = { estado, fecha: iso(ahora) }
  // LEGAL: revisar · historial
  x.historial.push({ fecha: iso(ahora), texto: estado === 'pedida' ? 'Se pidió la Mediación Lockumi (demo)' : 'La Mediación Lockumi (demo) no tenía cupo (10 casos)' })
  return estado
}
export function noUsarMediacion(x: Alquiler, ahora: number) {
  const r = x.reclamo!; if (r.mediacion) return
  r.mediacion = { estado: 'no-usar', fecha: iso(ahora) }
  // LEGAL: revisar · historial
  x.historial.push({ fecha: iso(ahora), texto: 'Se prefirió no usar la Mediación Lockumi (demo)' })
}
/** Plazo de respuesta: 3 días hábiles desde que se pidió (6.8 b). */
export const plazoMediacion = (a: Alquiler) => a.reclamo?.mediacion?.estado === 'pedida' ? sumarHabiles(+new Date(a.reclamo.mediacion.fecha), 3) : null

/** El reparto suma el depósito (el inquilino recibe el resto) y el dueño nunca recibe más de lo reclamado (6.3 e y f, 6.6). */
export const repartoValido = (a: Alquiler, alDueno: number) => Number.isFinite(alDueno) && alDueno >= 0 && alDueno <= (a.reclamo?.monto ?? 0) && alDueno <= a.monto

// LEGAL: revisado (24/10, v4) · B.14 (confirmación y aviso del resultado)
export const textoConfirmar = (d: number, i: number) => `El dueño recibirá ${u(d)} y el inquilino ${u(i)}. Esto mueve el depósito de prueba de verdad en la red de prueba y no se puede deshacer en la app. Es una simulación: no lo decide una persona mediadora y no tiene efecto legal.`
export const textoResultado = (d: number, i: number) => `El dueño recibió ${u(d)} y el inquilino ${u(i)}, en la red de prueba. El reparto se eligió con el botón de simulación: no lo decidió una persona mediadora. En la demo, no tiene efecto legal. Fuera de la app, los dos conservan sus derechos.`
// LEGAL: revisar · 6.3 f (texto propio basado en la cláusula)
export const textoNoReclamado = (a: Alquiler) => `La parte no reclamada, ${u(Math.round((a.monto - (a.reclamo?.monto ?? 0)) * 100) / 100)}, se libera al inquilino cuando se cierra el reclamo (6.3 f). Mientras tanto, todo el depósito de prueba sigue bloqueado en la cuenta segura.`
