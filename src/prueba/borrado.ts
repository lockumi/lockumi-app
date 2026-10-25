// Paso 16 · Privacidad 1.7-demo: lo que se usa para una mediación se borra o se anonimiza 30 días después de cerrar el caso,
// salvo que una de las partes pida guardarlo para un reclamo fuera de la app. Se conservan los montos y el resultado
// (lo que se movió en la red de prueba es público y no se puede borrar). Funciones puras; las aplica sincronizarTodos.
import type { Alquiler, Rol } from '../types'
import { versionAlquiler, V17 } from './version'

export const DIAS_BORRADO = 30
const DIA = 86_400_000
// LEGAL: revisar · historial
export const TEXTO_BORRADO = 'Se borraron los datos de la Mediación Lockumi (demo): 30 días después de cerrar el caso'

export function debeBorrarMediacion(a: Alquiler, ahora: number) {
  const m = a.reclamo?.mediacion
  if (versionAlquiler(a) !== V17 || a.estado !== 'cerrado' || m?.estado !== 'pedida' || m.borrado || m.guardar) return false
  const cierre = +new Date(a.resultado?.fecha ?? m.fecha)
  return Number.isFinite(cierre) && ahora >= cierre + DIAS_BORRADO * DIA
}
export function borrarMediacion(x: Alquiler, ahora: number) {
  if (!debeBorrarMediacion(x, ahora)) return
  const r = x.reclamo!
  r.fotos = []; r.motivo = ''
  for (const b of r.rubros ?? []) { b.fotos = []; b.descripcion = ''; if (b.factura) b.factura = { monto: b.factura.monto } }
  for (const k of Object.keys(r.respuestas ?? {})) { const s = r.respuestas![k].soporte; if (s) r.respuestas![k].soporte = { tipo: s.tipo, monto: s.monto, comercio: '' } }
  const fecha = new Date(ahora).toISOString()
  r.mediacion!.borrado = fecha
  x.historial.push({ fecha, texto: TEXTO_BORRADO })
}
/** Una parte pide guardar los datos para un reclamo fuera de la app (no se borran). */
export function guardarMediacion(x: Alquiler, rol: Rol, ahora: number) {
  const m = x.reclamo?.mediacion; if (!m || m.borrado || m.guardar) return
  m.guardar = { por: rol, fecha: new Date(ahora).toISOString() }
}
