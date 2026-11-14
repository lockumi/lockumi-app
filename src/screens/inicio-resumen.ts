import type { Alquiler } from '../types'
import { ambos, etapaDe, NOMBRE, otro, turno } from '../flujo'
import { rolDe } from '../store'
import { tieneDeposito } from '../prueba/eliminar'
import { teToca } from './inicio-lista'

/** Un mismo id en la lista mezclada (navegador y servidor) cuenta una sola vez. */
export function sinRepetidos(lista: readonly Alquiler[]): Alquiler[] {
  const vistos = new Set<string>()
  const out: Alquiler[] = []
  for (const a of lista) {
    if (!a.id || vistos.has(a.id)) continue
    vistos.add(a.id)
    out.push(a)
  }
  return out
}

/** Saldos activos: sin cerrados y sin el mismo id repetido. Ocultos no llegan: los quita la pantalla, igual que el listado. */
export function activos(lista: readonly Alquiler[]): Alquiler[] {
  return sinRepetidos(lista).filter(a => a.estado !== 'cerrado')
}

/**
 * Custodia solo con un dato que ya existe.
 * Firmas: todavía no hay depósito. Pendiente de pago: solo si el pago o la transacción ya están.
 * Un estado posterior lo acredita (`tieneDeposito`). Cerrado no es saldo activo.
 */
export function enCustodia(a: Alquiler): boolean {
  if (a.estado === 'cerrado' || a.estado === 'firmas') return false
  if (a.estado === 'pendiente_pago') return !!(a.pago || a.red?.txs?.deposito)
  return tieneDeposito(a)
}

export type Saldos = { previsto: number; custodia: number; porDepositar: number; sinImporte: number }

/** Previsto es la suma. Custodia es solo la parte acreditada. Lo demás queda por depositar. Un monto que no es número no se inventa. */
export function saldosDe(lista: readonly Alquiler[]): Saldos {
  const s: Saldos = { previsto: 0, custodia: 0, porDepositar: 0, sinImporte: 0 }
  for (const a of activos(lista)) {
    if (typeof a.monto !== 'number' || !Number.isFinite(a.monto)) { s.sinImporte++; continue }
    s.previsto += a.monto
    if (enCustodia(a)) s.custodia += a.monto
    else s.porDepositar += a.monto
  }
  return s
}

/** El pago es tarea del inquilino, y solo cuando las dos firmas ya están. */
export function puedePagar(a: Alquiler, email: string): boolean {
  if (a.estado !== 'pendiente_pago' || enCustodia(a)) return false
  if (!ambos(a.contrato?.firmas ?? {})) return false
  return rolDe(a, email) === 'inquilino'
}

export function esTareaPropia(a: Alquiler, email: string): boolean {
  if (a.estado === 'cerrado') return false
  if (a.estado === 'pendiente_pago') return puedePagar(a, email)
  return teToca(a, email)
}

export function tareasPropias(lista: readonly Alquiler[], email: string): Alquiler[] {
  return activos(lista).filter(a => esTareaPropia(a, email)).sort((a, b) => etapaDe(a) - etapaDe(b) || lista.indexOf(a) - lista.indexOf(b))
}

/** Esperas que no son tarea tuya. El alquiler en curso se cuenta aparte. */
export function esperas(lista: readonly Alquiler[], email: string): Alquiler[] {
  return activos(lista).filter(a => a.estado !== 'en_curso' && !esTareaPropia(a, email))
}

export function enCursoSinTarea(lista: readonly Alquiler[], email: string): number {
  return activos(lista).filter(a => a.estado === 'en_curso' && !esTareaPropia(a, email)).length
}

export type CopiaTarea = { titulo: string; texto: string; boton: string }

export function copiaTarea(a: Alquiler, email: string): CopiaTarea {
  const rol = rolDe(a, email)
  if (a.estado === 'firmas' && !a.contrato?.firmas?.[rol]) return {
    titulo: 'Tu firma está pendiente',
    texto: 'Revisa el contrato antes de firmar. El depósito todavía no se ha realizado.',
    boton: 'Ver contrato y firmar',
  }
  if (puedePagar(a, email)) return {
    titulo: 'El depósito está pendiente',
    texto: 'Las dos firmas ya firmaron. Revisa el importe antes de continuar.',
    boton: 'Revisar depósito',
  }
  const t = turno(a, rol)
  return { titulo: t.tu, texto: t.sigue, boton: 'Continuar' }
}

export function textoEspera(a: Alquiler, email: string): string {
  const rol = rolDe(a, email)
  const firmas = a.contrato?.firmas ?? {}
  if (a.estado === 'firmas' && !firmas[otro(rol)]) return `A la espera de la firma del ${NOMBRE[otro(rol)]}.`
  if (a.estado === 'pendiente_pago' && !enCustodia(a)) return rol === 'dueno' ? 'A la espera del depósito del inquilino.' : 'A la espera del depósito.'
  return turno(a, rol).otra
}

export function textoEnCurso(n: number): string {
  if (n <= 0) return ''
  return n === 1 ? '1 alquiler en curso, sin tarea para ti.' : `${n} alquileres en curso, sin tarea para ti.`
}

export function textoPendientes(n: number): string {
  return n === 1 ? '1 pendiente' : `${n} pendientes`
}
