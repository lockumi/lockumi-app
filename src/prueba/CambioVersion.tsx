// Paso 16 · Alquiler firmado con los Términos 1.6-demo: sigue con sus reglas salvo que los dos acepten la 1.7-demo.
// No es una pantalla que bloquee: es una tarjeta opcional en el detalle (solo con el interruptor encendido y antes de la salida).
import './prueba.css'
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe } from '../store'
import { fechaHora } from '../ui'
import { aceptarVersion, textoCambio, versionAlquiler, versionActual, V16 } from './version'
import { rutaTerminos } from '../legal/documentos'

const NOMBRE: Record<Rol, string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
export function CambioVersion({ a, rol }: { a: Alquiler; rol: Rol }) {
  const desde = versionAlquiler(a), hacia = versionActual()
  const ac = a.terminos?.hacia === hacia || (a.terminos?.hacia === undefined && desde === V16) ? a.terminos?.acepta ?? {} : {}
  return <section className="glass tarjeta pila cambio-version" aria-labelledby="t-version">
    <h3 id="t-version">Términos de este alquiler: versión {desde}</h3>
    <p>{textoCambio(desde, hacia)}</p>
    <p className="nota"><a className="enlace" href="/terminos" target="_blank" rel="noopener">Ver los Términos {hacia}</a> · <a className="enlace" href={rutaTerminos(desde)} target="_blank" rel="noopener">Ver los {desde}</a></p>
    <ul className="lista">{(['inquilino', 'dueno'] as const).map(r => <li key={r}><span>{NOMBRE[r]}</span><span>{ac[r] ? `Aceptó el ${fechaHora(ac[r]!)}` : 'Pendiente'}</span></li>)}</ul>
    {!ac[rol] && <button type="button" className="boton boton--secundario boton--ancho" onClick={() => store.cambiar(a.id, x => aceptarVersion(x, rol, ahoraDe(x), hacia))}>Acepto pasar este alquiler a la {hacia}</button>}
  </section>
}
