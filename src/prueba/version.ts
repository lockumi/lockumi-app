// Paso 16 · Versión de los Términos de cada alquiler. Los alquileres firmados con la 1.6-demo siguen con las reglas de la 1.6-demo
// (pantallas y plazos de siempre) salvo que los dos acepten la 1.7-demo. Los nuevos, con el interruptor encendido, nacen en la 1.7-demo.
import type { Alquiler, Rol } from '../types'
import { pruebaCompleta } from './interruptor'

export const V16 = '1.6-demo', V17 = '1.7-demo'
/** Sin versión guardada: el alquiler es de antes del paso 16, o sea 1.6-demo. */
export const versionAlquiler = (a?: Pick<Alquiler, 'terminos'>) => a?.terminos?.version ?? V16
/** Reglas de la prueba completa (Términos 1.7-demo): interruptor encendido y alquiler en la 1.7-demo. */
export const reglas17 = (a?: Pick<Alquiler, 'terminos'>) => pruebaCompleta() && versionAlquiler(a) === V17
/** Se puede pasar a la 1.7-demo antes de la salida (las reglas no cambian a mitad de un reclamo). */
const ANTES_DE_SALIR: Alquiler['estado'][] = ['firmas', 'pendiente_pago', 'fotos_entrada', 'en_curso']
export const puedeCambiarVersion = (a: Alquiler) => pruebaCompleta() && versionAlquiler(a) === V16 && ANTES_DE_SALIR.includes(a.estado)

const NOMBRE: Record<Rol, string> = { dueno: 'dueño', inquilino: 'inquilino' }
/** Una parte acepta pasar el alquiler a la 1.7-demo; con las dos, cambia la versión (queda la fecha de cada aceptación). */
export function aceptarVersion17(x: Alquiler, rol: Rol, ahora: number) {
  if (!puedeCambiarVersion(x)) return
  const f = new Date(ahora).toISOString()
  const t = x.terminos ??= { version: V16 }; t.acepta ??= {}
  if (t.acepta[rol]) return
  t.acepta[rol] = f
  // LEGAL: revisar · historial (texto propio)
  x.historial.push({ fecha: f, texto: `El ${NOMBRE[rol]} aceptó pasar este alquiler a los Términos ${V17}` })
  if (t.acepta.dueno && t.acepta.inquilino) {
    t.version = V17; t.desde = f
    x.historial.push({ fecha: f, texto: `Los dos aceptaron: este alquiler sigue ahora los Términos ${V17}` })
  }
}

// LEGAL: revisar · tarjeta de cambio de versión (texto propio basado en la cláusula 12)
export const TEXTO_CAMBIO = `Este alquiler se firmó con los Términos ${V16} y sigue con sus reglas. Solo pasa a la versión ${V17} si los dos lo aceptan. Si alguno no acepta, nada cambia.`
