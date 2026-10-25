// Escenario C (preparación) · Aviso que no bloquea cuando sube la versión de los Términos (B → 1.8-demo, C → 1.9-demo).
// Con solo A encendido no se ve nada (la vigente es la 1.7-demo). Lo nuevo se acepta con la casilla de cada función.
import type { Usuario } from '../types'
import { pruebaCompleta } from '../prueba/interruptor'
import { interruptoresLegales } from './documentos'
import { avisoNuevaVersion } from './versiones'

export function AvisoVersion({ u }: { u: Usuario }) {
  const t = pruebaCompleta() ? avisoNuevaVersion(u.terminos?.version, interruptoresLegales()) : null
  if (!t) return null
  return <p className="glass tarjeta nota aviso-version" role="status">{t} <a className="enlace" href="/terminos" target="_blank" rel="noopener">Ver los Términos</a></p>
}
