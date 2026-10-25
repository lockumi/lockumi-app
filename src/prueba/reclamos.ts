// Reclamo de la prueba completa (Términos 1.7-demo, 6.4, 6.5 b y c, 6.5.1, 6.7; B.2, B.6, B.10). Funciones puras sobre una copia
// del alquiler (se usan dentro de store.cambiar). La propuesta automática es SIMULADA: no usa inteligencia artificial ni envía datos.
import type { Alquiler, Rol, Rubro, RespuestaRubro } from '../types'
import { fechaCR } from '../../api/_lib/plazos'
import { plazoInquilino } from './avisos'
import { propuesta, totalReclamado, reglaAplica, primeraApertura, MOTIVOS } from './propuesta'
import { PRECIOS } from '../../api/_lib/precios'

const iso = (t: number) => new Date(t).toISOString()
const u = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
/** Nombre de un rubro (de la tabla de precios de referencia, o «Otro rubro»). */
export const nombreRubro = (r: Pick<Rubro, 'ref'>) => r.ref >= 0 && PRECIOS[r.ref] ? PRECIOS[r.ref].rubro : 'Otro rubro'

/** El dueño reclama por rubros: queda abierto el reclamo y el aviso del día 1 se entrega en la app en ese momento (6.5 b). */
export function nuevoReclamo(x: Alquiler, rubros: Rubro[], ahora: number) {
  const monto = totalReclamado(x, rubros)
  x.estado = 'reclamo'
  x.reclamo = { monto, motivo: rubros.map(r => `${nombreRubro(r)}: ${r.descripcion.trim()}`).join(' · '), fotos: rubros.flatMap(r => r.fotos), fecha: iso(ahora), rubros, entregado: iso(ahora) }
  // LEGAL: revisar · historial
  x.historial.push({ fecha: iso(ahora), texto: `El dueño reclamó ${u(monto)} por ${rubros.length === 1 ? '1 rubro' : `${rubros.length} rubros`}` })
}
/** Abrir la pantalla del reclamo cuenta como apertura (B.2 v4). Se guarda solo la primera vez. */
export function abrirReclamo(x: Alquiler, ahora: number) { if (x.reclamo) x.reclamo.pantallaAbierta ??= iso(ahora) }

/** Respuesta del inquilino por rubro. Si acepta todo: acuerdo por lo reclamado. Si no: propuesta automática (6.7) que esperan los dos. */
export function responderRubros(x: Alquiler, resp: Record<string, RespuestaRubro>, ahora: number): 'acuerdo' | 'propuesta' {
  const r = x.reclamo!; r.respuestas = resp
  if ((r.rubros ?? []).every(b => resp[b.id]?.acepta)) { r.respuesta = 'aceptado'; return 'acuerdo' }
  r.respuesta = 'rechazado'
  r.propuesta = { alDueno: propuesta(x, r.rubros ?? [], resp).total, fecha: iso(ahora) }
  // LEGAL: revisar · historial
  x.historial.push({ fecha: iso(ahora), texto: `El inquilino no aceptó todo el reclamo. Propuesta automática (simulación): ${u(r.propuesta.alDueno)} al dueño` })
  return 'propuesta'
}
/** Cada parte acepta o no la propuesta. Se aplica solo si los dos la aceptan; si uno no, pasa a la Mediación Lockumi (demo). */
export function votarPropuesta(x: Alquiler, rol: Rol, si: boolean, ahora: number): 'aplicar' | 'mediacion' | null {
  const p = x.reclamo?.propuesta; if (!p) return null
  p[rol] = si ? 'si' : 'no'
  // LEGAL: revisar · historial
  x.historial.push({ fecha: iso(ahora), texto: `El ${rol === 'dueno' ? 'dueño' : 'inquilino'} ${si ? 'aceptó' : 'no aceptó'} la propuesta automática` })
  if (p.dueno === 'no' || p.inquilino === 'no') return 'mediacion'
  return p.dueno === 'si' && p.inquilino === 'si' ? 'aplicar' : null
}
/** Regla del silencio (6.5 c): al vencer el plazo del inquilino sin respuesta. El silencio no es aceptación. */
export function silencio(a: Alquiler, ahora: number): null | { tipo: 'propuesta'; alDueno: number } | { tipo: 'mediacion'; motivo: string } {
  const pl = plazoInquilino(a)
  if (a.estado !== 'reclamo' || !a.reclamo || a.reclamo.respuestas || !pl || ahora < pl.fin) return null
  const r = reglaAplica(a)
  return r.aplica ? { tipo: 'propuesta', alDueno: propuesta(a, a.reclamo.rubros ?? []).total } : { tipo: 'mediacion', motivo: r.motivo }
}
// LEGAL: revisado (24/10, v4) · B.10 (3 líneas debajo del monto)
export function textoSeAplico(a: Alquiler, r: { dueno: number; inquilino: number }): [string, string, string] {
  const regla = a.regla ? fechaCR(+new Date(a.regla.fecha)) : '—', abrio = primeraApertura(a)
  return [
    `El dueño recibió ${u(r.dueno)} y a ti se te liberaron ${u(r.inquilino)}.`,
    `Por qué: aceptaste la regla el ${regla}, abriste el aviso del reclamo el ${abrio ? fechaCR(+new Date(abrio)) : '—'} y no respondiste en 7 días naturales. El reclamo cumplió las condiciones: pruebas completas y no más del 30 % del depósito.`,
    'Lo aplicado es final dentro de la app. Siempre puedes ir a los tribunales: tu derecho dura un año (Ley 7527, art. 120).',
  ]
}
export { MOTIVOS }
