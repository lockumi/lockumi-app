// Paso 16 · Alquiler firmado con los Términos 1.6-demo: sigue con sus reglas salvo que los dos acepten la 1.7-demo.
// No es una pantalla que bloquee: es una tarjeta opcional en el detalle (solo con el interruptor encendido y antes de la salida).
import './prueba.css'
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe } from '../store'
import { fechaHora } from '../ui'
import { aceptarVersion17, TEXTO_CAMBIO, V16, V17 } from './version'

const NOMBRE: Record<Rol, string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
export function CambioVersion({ a, rol }: { a: Alquiler; rol: Rol }) {
  const ac = a.terminos?.acepta ?? {}
  return <section className="glass tarjeta pila cambio-version" aria-labelledby="t-version">
    <h3 id="t-version">Términos de este alquiler: versión {V16}</h3>
    <p>{TEXTO_CAMBIO}</p>
    <p className="nota"><a className="enlace" href="/terminos" target="_blank" rel="noopener">Ver los Términos {V17}</a> · <a className="enlace" href="/terminos-1-6" target="_blank" rel="noopener">Ver los {V16}</a></p>
    <ul className="lista">{(['inquilino', 'dueno'] as const).map(r => <li key={r}><span>{NOMBRE[r]}</span><span>{ac[r] ? `Aceptó el ${fechaHora(ac[r]!)}` : 'Pendiente'}</span></li>)}</ul>
    {!ac[rol] && <button type="button" className="boton boton--secundario boton--ancho" onClick={() => store.cambiar(a.id, x => aceptarVersion17(x, rol, ahoraDe(x)))}>Acepto pasar este alquiler a la {V17}</button>}
  </section>
}
