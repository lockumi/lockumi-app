// Paso 15 · B.8 (suscripción: la demo es gratis) y B.13 (rendimiento del depósito: función en estudio, cláusula 10).
// Solo con el interruptor de la prueba completa encendido (se montan en Crear). Sin casillas: en la demo no se autoriza nada.
import { useRef } from 'react'
import './prueba.css'
import { Simulado } from '../ui'

export function SuscripcionB8() {
  // LEGAL: revisado (24/10) · B.8
  return <section className="pila" aria-labelledby="t-b8">
    <h3 id="t-b8">Suscripción</h3>
    <p><strong>En la demo, la app es gratis.</strong> No hay suscripción ni se cobra nada. En el servicio con dinero real, el inquilino pagaría una suscripción anual de USD 15 (monto provisional), que se informaría antes de firmar.</p>
    <div className="cuadro-real"><strong>En el servicio con dinero real (no disponible en la demo):</strong> se pedirían dos autorizaciones aparte. Texto que se pediría al inquilino: «Si no pago la suscripción a tiempo, autorizo que se descuente solo de la parte del depósito que me toca a mí, al final y después de los reclamos del dueño. Lockumi me avisaría 7 días antes y me daría un recibo.» Texto que se pediría al dueño: «Acepto que, si el inquilino no paga la suscripción, se descuente solo de la parte del depósito que le toca al inquilino, al final y después de mis reclamos.»</div>
  </section>
}

export function RendimientoB13() {
  const ref = useRef<HTMLDetailsElement>(null)
  // LEGAL: revisado (24/10) · B.13 (sin tasas, porcentajes, montos, gráficos, fechas, «gana», «Activar» ni «Avisarme»)
  return <details ref={ref} className="pila aviso-app" aria-labelledby="t-b13">
    <summary><strong id="t-b13">Rendimiento del depósito: función en estudio</strong> <Simulado texto="Función en estudio" /> <Simulado texto="Simulación" /></summary>
    <p>Lockumi está estudiando, sin fecha, una función opcional para el depósito. <strong>No está disponible</strong> en la demo ni en ningún otro lugar, y no se puede contratar. Esto no es una oferta ni una invitación a invertir. Si algún día existiera, el resultado sería variable, no garantizado, y podría haber pérdidas. Su lanzamiento depende de una revisión legal y regulatoria. Solo funcionaría si el dueño y el inquilino la aceptan cada uno por separado. Más información: <a href="#/terminos">cláusula 10 de los Términos</a>.</p>
    <button type="button" className="boton boton--secundario" onClick={() => { if (ref.current) ref.current.open = false }}>Entendido</button>
  </details>
}
