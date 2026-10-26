// B.1 · Regla de propuesta automática (opcional, al firmar; solo inquilino). Términos 1.7-demo, 6.5.1.
import './prueba.css'
import { useState } from 'react'
import type { RegistroRegla } from '../types'
import { terminosActual } from '../legal/documentos'
import { edicionDe } from './version'

// LEGAL: revisado (24/10) · B.1 v4 (prueba-completa-textos.md), palabra por palabra
export const TITULO_REGLA = 'Regla de propuesta automática (opcional)'
export const TEXTO_REGLA = 'Puedes alquilar con o sin esta regla. Si la aceptas: si el dueño hace un reclamo y no respondes en 7 días naturales desde que el aviso te llega en la app, la app aplica una propuesta automática, solo si abriste al menos un aviso del reclamo y si cada daño está en la lista del contrato, tiene fotos de entrada y de salida tomadas en la app, una factura o un precio de referencia y una descripción, y el total es como máximo el 30 % de tu depósito. El desgaste normal nunca se cobra. Si no abriste ningún aviso o si se supera el 30 %, el caso pasa a la mediación. Lo aplicado es final dentro de la app. Si no la aceptas: si no respondes o no se ponen de acuerdo, el caso pasa a la mediación, y la mediación tiene costo. Siempre puedes ir a los tribunales: tu derecho dura un año (Ley 7527, art. 120).'
export const ROTULO_REGLA = 'Demo: la propuesta automática es simulada y la mediación no se cobra.'  // LEGAL: revisado (25/10, lista de Legal) · se quitó «El costo que verías en un servicio real es: [PENDIENTE].» (Katherine, 24/10)
export const CASILLA_REGLA = 'Acepto la Regla de propuesta automática, con 7 días naturales para responder.'
// LEGAL: revisado (24/10) · F.01 (ejemplo con la etiqueta «Ejemplo»)
export const EJEMPLO_REGLA = 'Depósito de 800 USDC de prueba: el 30 % es 240. Si abriste algún aviso y no respondes un reclamo de 95 USDC de prueba con pruebas completas, se aplica la propuesta. Uno de 300 USDC de prueba supera el 30 %: pasa a la mediación.'

/** Registro (no visible): cuenta, alquiler, versión de los Términos, sí o no, fecha y hora ISO 8601. */
export const registroRegla = (cuenta: string, alquiler: string, acepta: boolean, ahora = new Date()): RegistroRegla =>
  ({ cuenta, alquiler, version: terminosActual().version, ...edicionDe(terminosActual().version, cuenta), acepta, fecha: ahora.toISOString() })

/** Las partes en negrita del texto de Legal. */
const NEGRITA = ['con o sin', 'Si la aceptas:', '7 días naturales', '30 % de tu depósito', 'Si no la aceptas:', 'la mediación tiene costo']
function conNegrita(t: string) {
  const re = new RegExp(`(${NEGRITA.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`)
  return t.split(re).map((p, i) => NEGRITA.includes(p) ? <strong key={i}>{p}</strong> : p)
}

export function ReglaPropuesta({ onListo }: { onListo: (acepta: boolean) => void }) {
  const [acepta, setAcepta] = useState(false)
  return <section className="pila regla" aria-labelledby="t-regla">
    <h2 id="t-regla">{TITULO_REGLA}</h2>
    <p>{conNegrita(TEXTO_REGLA)}</p>
    <p className="nota">{ROTULO_REGLA}</p>
    <p className="nota"><span className="chip chip--neutro">Ejemplo</span> {EJEMPLO_REGLA}</p>
    <label className="casilla-legal__fila casilla-legal"><input type="checkbox" id="acepto-regla" checked={acepta} onChange={e => setAcepta(e.target.checked)} /><span>{CASILLA_REGLA}</span></label>
    <button type="button" className="boton boton--pc boton--ancho boton--grande" onClick={() => onListo(acepta)}>Continuar</button>
    <a className="enlace" href="/terminos" target="_blank" rel="noopener">Ver el texto completo (cláusula 6.5.1)</a>
  </section>
}
