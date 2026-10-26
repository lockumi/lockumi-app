// Paso 16 · Versión de los Términos de cada alquiler. Los alquileres firmados con la 1.6-demo siguen con las reglas de la 1.6-demo
// (pantallas y plazos de siempre) salvo que los dos acepten la 1.7-demo. Los nuevos, con el interruptor encendido, nacen en la 1.7-demo.
import type { Alquiler, Rol } from '../types'
import { pruebaCompleta } from './interruptor'
import { V17, edicionDeCuenta } from '../legal/version17'
import { edicionDe as edicionTexto, desde17, ordenVersion, versionVigente } from '../legal/versiones'
import { interruptoresLegales } from '../legal/documentos'
export { V17 }
export const V16 = '1.6-demo'
/** paso16-unido: la edición (versión con su fecha) que se guarda en los registros de aceptación; la 1.7-demo y posteriores la llevan. */
/** Paso 19 (Legal, bloqueo 2): con la reputación encendida, la versión vigente lleva la 1.10-demo solo si esa cuenta aceptó REP-01. */
export const edicionDe = (version: string, cuenta?: string) => { const e = edicionTexto(version); return e ? { edicion: version === versionActual() ? edicionDeCuenta(cuenta, e) : e } : {} }
/** Escenario C (preparación): la versión de los Términos según lo encendido (1.7-demo con A, 1.8-demo con B, 1.9-demo con C). */
export const versionActual = () => versionVigente(interruptoresLegales())
/** Sin versión guardada: el alquiler es de antes del paso 16, o sea 1.6-demo. */
export const versionAlquiler = (a?: Pick<Alquiler, 'terminos'>) => a?.terminos?.version ?? V16
/** Reglas de la prueba completa (Términos 1.7-demo o posteriores): interruptor encendido y alquiler en la 1.7-demo o después. */
export const reglas17 = (a?: Pick<Alquiler, 'terminos'>) => pruebaCompleta() && desde17(versionAlquiler(a))
/** Se puede pasar a la 1.7-demo antes de la salida (las reglas no cambian a mitad de un reclamo). */
const ANTES_DE_SALIR: Alquiler['estado'][] = ['firmas', 'pendiente_pago', 'fotos_entrada', 'en_curso']
/** Solo hacia la versión vigente y nunca hacia atrás. */
export const puedeCambiarA = (a: Alquiler, destino: string) => pruebaCompleta() && destino === versionActual() && ordenVersion(versionAlquiler(a)) < ordenVersion(destino) && ANTES_DE_SALIR.includes(a.estado)
export const puedeCambiarVersion = (a: Alquiler) => puedeCambiarA(a, versionActual())

const NOMBRE: Record<Rol, string> = { dueno: 'dueño', inquilino: 'inquilino' }
/** Una parte acepta pasar el alquiler a la versión vigente; con las dos, cambia la versión (queda la fecha de cada aceptación).
 *  Escenario C (preparación): sirve para 1.6 → 1.7 y para 1.7 → 1.8 o 1.9. `acepta` guarda a qué versión aceptó cada parte. */
export function aceptarVersion(x: Alquiler, rol: Rol, ahora: number, destino = versionActual()) {
  if (!puedeCambiarA(x, destino)) return
  const f = new Date(ahora).toISOString()
  const t = x.terminos ??= { version: V16 }
  if (t.hacia !== destino) { t.acepta = {}; t.hacia = destino }   // una aceptación vale solo para la versión que se aceptó
  t.acepta ??= {}
  if (t.acepta[rol]) return
  t.acepta[rol] = f
  // LEGAL: revisado (25/10, lista de Legal) · historial (texto propio)
  x.historial.push({ fecha: f, texto: `El ${NOMBRE[rol]} aceptó pasar este alquiler a los Términos ${destino}` })
  if (t.acepta.dueno && t.acepta.inquilino) {
    t.version = destino; t.desde = f; Object.assign(t, edicionDe(destino))
    x.historial.push({ fecha: f, texto: `Los dos aceptaron: este alquiler sigue ahora los Términos ${destino}` })
  }
}
/** paso 16 (compatibilidad): pasar a la versión vigente. */
export const aceptarVersion17 = (x: Alquiler, rol: Rol, ahora: number) => aceptarVersion(x, rol, ahora)

// LEGAL: revisado (25/10, lista de Legal) · tarjeta de cambio de versión (texto propio basado en la cláusula 12)
export const textoCambio = (desde: string, hacia: string) => `Este alquiler se firmó con los Términos ${desde} y sigue con sus reglas. Solo pasa a la versión ${hacia} si los dos lo aceptan. Si alguno no acepta, nada cambia.`
export const TEXTO_CAMBIO = textoCambio(V16, V17)
