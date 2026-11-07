import type { Alquiler } from '../types'
import { etapaDe, turno } from '../flujo'
import { rolDe } from '../store'

/** Sin acción tuya: el texto de `turno` ya lo dice. No es una lista nueva de estados. */
const SIN_ACCION = /^(No tienes|Ya |Listo|Disfruta)/

export function teToca(a: Alquiler, email: string): boolean {
  if (a.estado === 'cerrado') return false
  const rol = rolDe(a, email)
  return !SIN_ACCION.test(turno(a, rol).tu)
}

/** La tarjeta grande es la que te toca (la etapa más temprana). Si ninguna, la primera de la lista. */
export function ordenarInicio(lista: Alquiler[], email: string): { principal: Alquiler | null; resto: Alquiler[] } {
  if (!lista.length) return { principal: null, resto: [] }
  const urgentes = lista.filter(a => teToca(a, email)).sort((a, b) => etapaDe(a) - etapaDe(b) || lista.indexOf(a) - lista.indexOf(b))
  const principal = urgentes[0] ?? lista[0]
  return { principal, resto: lista.filter(a => a.id !== principal.id) }
}
