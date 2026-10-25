// Paso 15 · B.8 (la demo es gratis, suscripción del servicio real) y B.13 (rendimiento: función en estudio), solo con el interruptor.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SuscripcionB8, RendimientoB13 } from '../SuscripcionPC'

const texto = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
describe('B.8 suscripción', () => {
  const t = texto(renderToStaticMarkup(<SuscripcionB8 />))
  it('texto de Legal', () => {
    expect(t).toContain('En la demo, la app es gratis. No hay suscripción ni se cobra nada. En el servicio con dinero real, el inquilino pagaría una suscripción anual de USD 15 (monto provisional), que se informaría antes de firmar.')
  })
  it('cuadro del servicio real sin casillas, con las dos autorizaciones', () => {
    expect(t).toContain('En el servicio con dinero real (no disponible en la demo): se pedirían dos autorizaciones aparte.')
    expect(t).toContain('«Si no pago la suscripción a tiempo, autorizo que se descuente solo de la parte del depósito que me toca a mí, al final y después de los reclamos del dueño. Lockumi me avisaría 7 días antes y me daría un recibo.»')
    expect(t).toContain('«Acepto que, si el inquilino no paga la suscripción, se descuente solo de la parte del depósito que le toca al inquilino, al final y después de mis reclamos.»')
    expect(renderToStaticMarkup(<SuscripcionB8 />)).not.toContain('type="checkbox"')
    expect(t).not.toContain('No se muestra ni se marca en la demo')
  })
})
describe('B.13 rendimiento', () => {
  const h = renderToStaticMarkup(<RendimientoB13 />), t = texto(h)
  it('etiquetas y título', () => {
    expect(t).toContain('Función en estudio'); expect(t).toContain('Simulación'); expect(t).toContain('Rendimiento del depósito: función en estudio')
    expect(t).not.toMatch(/próximamente/i)
  })
  it('texto de Legal y botón Entendido', () => {
    expect(t).toContain('Lockumi está estudiando, sin fecha, una función opcional para el depósito. No está disponible en la demo ni en ningún otro lugar, y no se puede contratar. Esto no es una oferta ni una invitación a invertir. Si algún día existiera, el resultado sería variable, no garantizado, y podría haber pérdidas. Su lanzamiento depende de una revisión legal y regulatoria. Solo funcionaría si el dueño y el inquilino la aceptan cada uno por separado. Más información: cláusula 10 de los Términos.')
    expect(h).toContain('>Entendido</button>')
  })
  it('nada prohibido: tasas, porcentajes, montos, «gana», «Activar», «Avisarme»', () => {
    expect(t.replace('cláusula 10', '')).not.toMatch(/%|\bUSD\b|USDC|\bgana\b|Activar|Avisarme|\d/)
  })
})
