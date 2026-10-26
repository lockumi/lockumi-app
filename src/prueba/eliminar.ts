// PROTOTIPO (26/10, rama local eliminar-alquiler-propuesta; sin merge ni deploy). Eliminar, ocultar y «Reiniciar mi demo».
// Reglas: se elimina SOLO antes de que haya depósito (y, con otra persona, antes de que acepte la invitación); después, solo se
// oculta de MI lista (el historial y el contrato quedan); con un depósito guardado no se elimina ni se oculta: se explica.
// Nunca se mueve dinero ni se toca una cuenta de garantía en la red. Nunca se toca un alquiler de otra persona.
// LEGAL: revisado (26/10, revisión de c97585b) · reglas y textos visibles de este archivo y de Eliminar.tsx (salvo lo marcado en eliminar-textos.ts).
import { store, ahoraReal, olvidarVista } from '../store'
import { servidor, olvidarInvitacion } from '../servidor/repositorio'
import { olvidarInvitacionEnviada } from './invitacion'
import type { Alquiler } from '../types'

const igual = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
/** ¿Es un alquiler de esta persona? (dueño o inquilino con su correo). Los de otra cuenta en el mismo navegador, no. */
export const esMio = (a: Alquiler, email: string) => (a.dosPersonas && !!a.miRol) || igual(a.duenoEmail, email) || igual(a.inquilinoEmail, email)   // servidor: RLS ya da solo los míos
/** ¿Ya hay un depósito guardado (o se está pagando)? Cualquier rastro de pago cuenta: ante la duda, NO se elimina. */
export const tieneDeposito = (a: Alquiler) => !!a.pago || !!a.red?.txs?.deposito || !['firmas', 'pendiente_pago'].includes(a.estado)
/** ¿Dejó algo en la red de prueba? Cuenta de garantía (aunque no tenga depósito) o cualquier paso ya registrado (trustline, compra…).
 *  Entonces no se elimina: solo se oculta. Así un alquiler eliminado nunca deja nada en la red (Legal, revisión de c97585b, punto 3). */
export const tieneGarantia = (a: Alquiler) => !!a.red?.escrow || Object.values(a.red?.txs ?? {}).some(Boolean) || (!!a.escrowId && !a.escrowId.startsWith('sim-'))
/** Borra lo que este aparato guarda de un alquiler eliminado: el papel elegido («Ver como»), el link de la invitación y el correo al que
 *  salió (Legal: «se borra» es un borrado real, incluido el correo de la persona invitada). */
export function olvidarEnEsteAparato(id: string) { olvidarVista(id); olvidarInvitacion(id); olvidarInvitacionEnviada(id) }
/** ¿Queda dinero guardado? Cerrado y ya devuelto, no. Ante la duda, sí. */
export const conDinero = (a: Alquiler) => a.estado === 'cerrado' ? (a.dosPersonas ? tieneGarantia(a) && !a.liquidacionTx : false) : tieneDeposito(a)
export const oculto = (a: Alquiler, email: string) => !!a.ocultoParaMi || !!a.ocultoPor?.[email.trim().toLowerCase()]

export type Opcion = 'eliminar' | 'ocultar' | 'esperar'
/** Qué puede hacer esta persona con este alquiler. */
export function opcionDe(a: Alquiler, email: string): Opcion | null {
  if (!esMio(a, email)) return null
  if (a.dosPersonas) {   // con otra persona: eliminar solo el dueño y solo antes de que la otra persona acepte (servidor: lk_eliminar_alquiler)
    if (a.miRol === 'dueno' && a.inquilinoUnido === false && a.estado === 'firmas' && !tieneGarantia(a)) return 'eliminar'
    return conDinero(a) || (a.estado === 'pendiente_pago' && tieneGarantia(a)) ? 'esperar' : 'ocultar'
  }
  if (!tieneDeposito(a)) return tieneGarantia(a) ? 'ocultar' : 'eliminar'
  return conDinero(a) ? 'esperar' : 'ocultar'
}

export class NoSePuede extends Error {}
/** Elimina un alquiler de este aparato (sin depósito). Vuelve a leer lo guardado justo antes, por si cambió en otra pestaña. */
export async function eliminarAlquiler(id: string, email: string, a0?: Alquiler) {
  if (a0?.dosPersonas) { if (opcionDe(a0, email) !== 'eliminar') throw new NoSePuede('deposito'); await servidor.eliminarAlquiler(id); olvidarEnEsteAparato(id); return a0.direccion }
  const a = store.fresco(id)
  if (!a) throw new NoSePuede('ya-no-esta')
  if (opcionDe(a, email) !== 'eliminar') throw new NoSePuede(tieneDeposito(a) ? 'deposito' : 'no-es-tuyo')
  store.quitar(id); olvidarEnEsteAparato(id)
  return a.direccion
}
export async function ocultarAlquiler(id: string, email: string, ocultar = true, a0?: Alquiler) {
  if (a0?.dosPersonas) { if (ocultar && opcionDe(a0, email) !== 'ocultar') throw new NoSePuede('deposito'); await servidor.ocultarAlquiler(id, ocultar); return }
  const a = store.fresco(id)
  if (!a) throw new NoSePuede('ya-no-esta')
  if (ocultar && opcionDe(a, email) !== 'ocultar') throw new NoSePuede('deposito')
  const k = email.trim().toLowerCase()
  store.cambiar(id, x => { const m = { ...(x.ocultoPor ?? {}) }; if (ocultar) m[k] = ahoraReal(); else delete m[k]; x.ocultoPor = m })
}

/** Lo que haría «Reiniciar mi demo», sin hacerlo (para la pantalla de confirmación). */
export function planReinicio(todos: readonly Alquiler[], email: string) {
  const mios = todos.filter(a => esMio(a, email) && !oculto(a, email))
  return { eliminar: mios.filter(a => opcionDe(a, email) === 'eliminar'), ocultar: mios.filter(a => opcionDe(a, email) === 'ocultar'),
    quedan: mios.filter(a => opcionDe(a, email) === 'esperar') }
}
/** Reinicia SOLO los alquileres de esta persona: elimina los que no tienen depósito, oculta los terminados y deja los que tienen
 *  un depósito guardado (no se pueden quitar sin perder el camino para devolverlo). */
export async function reiniciarMiDemo(email: string, todos: readonly Alquiler[]) {
  const p = planReinicio(todos.filter(a => !a.dosPersonas), email)
  let e = 0, o = 0, q = p.quedan.length
  for (const a of p.eliminar) { try { await eliminarAlquiler(a.id, email); e++ } catch { q++ } }      // si cambió en otra pestaña, se queda
  for (const a of p.ocultar) { try { await ocultarAlquiler(a.id, email); o++ } catch { q++ } }
  // Los de otra persona (servidor): una sola llamada que solo ve los alquileres de esta sesión.
  if (todos.some(a => a.dosPersonas && esMio(a, email))) { const r = await servidor.reiniciarMiDemo(); (r.ids ?? []).forEach(olvidarEnEsteAparato); e += r.eliminados; o += r.ocultos; q += r.quedan }
  return { eliminados: e, ocultos: o, quedan: q }
}

// Aviso de una sola vez en «Tus alquileres» después de eliminar, ocultar o reiniciar.
const K_AVISO = 'lockumi.aviso-lista'
export const dejarAviso = (t: string) => { try { sessionStorage.setItem(K_AVISO, t) } catch { /* nada */ } }
export const tomarAviso = () => { try { const t = sessionStorage.getItem(K_AVISO); sessionStorage.removeItem(K_AVISO); return t } catch { return null } }

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
