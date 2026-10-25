// Paso 16 · Privacidad 1.7-demo: lo que se usa para una mediación se borra o se anonimiza 30 días después de cerrar el caso,
// salvo que una de las partes pida guardarlo para un reclamo fuera de la app. Se conservan los montos y el resultado
// (lo que se movió en la red de prueba es público y no se puede borrar). Funciones puras; las aplica sincronizarTodos.
// paso16-unido (Legal, 25/10, arreglo 3): en un solo aparato la Mediación Lockumi (demo) ya no se «pide» (B.7 es la simulación),
// así que se borra todo caso que se cerró en la mediación. En los alquileres con otra persona, el borrado en Supabase (fotos
// del bucket lk-fotos y mensajes) lo hace el trabajo del servidor api/borrados.ts (supabase/migrations/20261025010000_*.sql).
import type { Alquiler, Rol } from '../types'
import { versionAlquiler, V17 } from './version'

export const DIAS_BORRADO = 30
const DIA = 86_400_000
// LEGAL: revisado (25/10, 12:05 a. m.) · historial, texto exacto de Legal
export const TEXTO_BORRADO = 'Se borraron las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo), 30 días después de cerrar el caso. Se conservan los montos y el resultado.'
const QUIEN: Record<Rol, string> = { dueno: 'El dueño', inquilino: 'El inquilino' }
// LEGAL: revisado (25/10, 12:05 a. m.) · historial, texto exacto de Legal
export const textoGuardar = (rol: Rol) => `${QUIEN[rol]} pidió guardar los datos de la mediación para un reclamo fuera de la app.`

/** El caso se cerró en la Mediación Lockumi (demo): con la simulación (B.14), con la persona mediadora o con la mediación pedida. */
export const pasoPorMediacion = (a: Alquiler) => a.estado === 'cerrado' && !!a.reclamo &&
  (a.reclamo.mediacion?.estado === 'pedida' || a.resultado?.via === 'simulacion' || a.resultado?.via === 'mediacion')
/** Estado del borrado (lo nuevo en `datosMediacion`; lo anterior, en `mediacion`). */
export const datosMediacion = (a: Alquiler) => ({ borrado: a.reclamo?.datosMediacion?.borrado ?? a.reclamo?.mediacion?.borrado, guardar: a.reclamo?.datosMediacion?.guardar ?? a.reclamo?.mediacion?.guardar })

export function debeBorrarMediacion(a: Alquiler, ahora: number) {
  if (versionAlquiler(a) !== V17 || !pasoPorMediacion(a)) return false
  const d = datosMediacion(a); if (d.borrado || d.guardar) return false
  const cierre = +new Date(a.resultado?.fecha ?? a.reclamo!.mediacion?.fecha ?? a.reclamo!.fecha)
  return Number.isFinite(cierre) && ahora >= cierre + DIAS_BORRADO * DIA
}
export function borrarMediacion(x: Alquiler, ahora: number) {
  if (!debeBorrarMediacion(x, ahora)) return
  const r = x.reclamo!
  r.fotos = []; r.motivo = ''
  for (const b of r.rubros ?? []) { b.fotos = []; b.descripcion = ''; if (b.factura) b.factura = { monto: b.factura.monto } }
  for (const k of Object.keys(r.respuestas ?? {})) { const s = r.respuestas![k].soporte; if (s) r.respuestas![k].soporte = { tipo: s.tipo, monto: s.monto, comercio: '' } }
  const fecha = new Date(ahora).toISOString()
  r.datosMediacion = { ...r.datosMediacion, borrado: fecha }
  x.historial.push({ fecha, texto: TEXTO_BORRADO })
}
/** Una parte pide guardar los datos para un reclamo fuera de la app (no se borran). Queda en el historial. */
export function guardarMediacion(x: Alquiler, rol: Rol, ahora: number) {
  if (!x.reclamo || !pasoPorMediacion(x)) return
  const d = datosMediacion(x); if (d.borrado || d.guardar) return
  const fecha = new Date(ahora).toISOString()
  x.reclamo.datosMediacion = { ...x.reclamo.datosMediacion, guardar: { por: rol, fecha } }
  x.historial.push({ fecha, texto: textoGuardar(rol) })
}
