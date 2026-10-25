// Avisos de la prueba completa: días 1, 4 y 6 de cada plazo (Términos 1.7-demo, 6.5 a y b; B.2, B.2b) y el aviso de reparación
// 5 días antes de la salida (6.1.1, B.3). Cada aviso guarda la hora de entrega y de apertura (en la app y por el enlace del correo).
// Se entregan cuando la app está abierta y llega su hora, con el reloj de la demo (días simulados incluidos): por eso, al adelantar
// días con el simulador, salen los avisos de esos días. No hay tareas programadas en el servidor.
import type { Alquiler, Aviso, Rol } from '../types'
import { plazoMs } from '../flujo'
import { vencimiento, DIA_MS } from '../../api/_lib/plazos'
import { PRECIOS } from '../../api/_lib/precios'
import { textoAviso, OTRO_RUBRO, type DatosAviso, type Plantilla } from '../../api/_lib/avisos'

export const DIAS_AVISO = [1, 4, 6] as const
/** Inicio y fin del plazo del dueño (7 días naturales desde «Recibí la casa» o 2 días después de la entrega). */
export function plazoDueno(a: Alquiler) {
  if (!a.ventanaInicio) return null
  const inicio = +new Date(a.ventanaInicio); return { inicio, ...vencimiento(inicio, plazoMs(a)) }
}
/** Plazo del inquilino para responder: 7 días naturales desde que el aviso del reclamo se le entregó en la app. */
export function plazoInquilino(a: Alquiler) {
  const e = a.reclamo?.entregado; if (!e) return null
  const inicio = +new Date(e); return { inicio, ...vencimiento(inicio, plazoMs(a)) }
}
/** Fecha de fin del alquiler a las 12:00 de Costa Rica. */
export const finAlquiler = (a: Pick<Alquiler, 'fin'>) => +new Date(a.fin + 'T12:00:00-06:00')
/** Días que faltan (redondeados hacia arriba) para que salga el aviso de 5 días (B.3). */
export const diasHastaAvisoSalida = (a: Alquiler, ahora: number) => Math.max(0, Math.ceil((finAlquiler(a) - 5 * DIA_MS - ahora) / DIA_MS))
/** Nombres de los rubros del reclamo (de la tabla de precios; «otro rubro» si no tiene precio de referencia). */
export const rubrosDe = (a: Alquiler) => (a.reclamo?.rubros ?? []).map(r => r.ref >= 0 ? PRECIOS[r.ref]?.rubro ?? OTRO_RUBRO : OTRO_RUBRO)
/** Datos del aviso (los mismos que se mandan al servidor de correo). */
export function datosAviso(a: Alquiler, p: Plantilla): DatosAviso {
  const pl = p.startsWith('dueno') ? plazoDueno(a) : p.startsWith('reclamo') ? plazoInquilino(a) : null
  return { deposito: a.monto, reclamado: a.reclamo?.monto, venceMs: pl?.fin, finAlquilerMs: finAlquiler(a), recibido: !!a.recibido, regla: !!a.regla?.acepta, rubros: rubrosDe(a) }
}
export const contenido = (a: Alquiler, p: Plantilla) => textoAviso(p, datosAviso(a, p))

/** Hora de entrega de los días 1, 4 y 6 dentro de un plazo. El día 1 empieza con el plazo; los días 4 y 6 se cuentan hacia atrás
 *  desde el vencimiento (el 6 es la víspera del último día), así «vence mañana» sigue siendo cierto si el plazo se movió por un
 *  domingo o feriado. Con plazos cortos de prueba (no en días enteros), proporcional. */
const horaDia = (inicio: number, ms: number, dia: number, fin = inicio + ms) =>
  dia === 1 ? inicio : ms % DIA_MS === 0 ? fin - (8 - dia) * DIA_MS : inicio + ms * (dia - 1) / 7
export interface Debido { id: Plantilla; para: Rol; dia: Aviso['dia']; hora: number }
/** Avisos que ya deberían estar entregados a la hora `ahora` y todavía no lo están. */
export function debidos(a: Alquiler, ahora: number): Debido[] {
  const r: Debido[] = [], ms = plazoMs(a)
  const pd = plazoDueno(a)
  if (a.estado === 'ventana_reclamo' && pd && a.entrega) for (const d of DIAS_AVISO) { const h = horaDia(pd.inicio, ms, d, pd.fin); if (h <= ahora && h < pd.fin) r.push({ id: `dueno-${d}`, para: 'dueno', dia: d, hora: h }) }
  const pi = plazoInquilino(a)
  if (a.estado === 'reclamo' && pi) for (const d of DIAS_AVISO) { const h = horaDia(pi.inicio, ms, d, pi.fin); if (h <= ahora && h < pi.fin) r.push({ id: `reclamo-${d}`, para: 'inquilino', dia: d, hora: h }) }
  if (a.estado === 'en_curso') { const h = finAlquiler(a) - 5 * DIA_MS; if (h <= ahora) r.push({ id: 'reparacion-5', para: 'inquilino', dia: 'reparacion', hora: h }) }
  return r.filter(x => !(a.avisos ?? []).some(v => v.id === x.id))
}
