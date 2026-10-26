// Estado de espera v2 del pago (src/espera.ts + src/EsperaPago.tsx). Ver docs/estado-espera.md.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EsperaPago } from '../EsperaPago'
import { etapaDeAvance, vozPago, tramoBarra, estadosPasos, PASOS_PAGO, NOTA_ESPERA_PAGO, ESPERA_PAGO, REINTENTO_PAGO } from '../espera'

const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const css = leer('../index.css'), escrowTs = leer('../services/escrow.ts'), detalle = leer('../screens/Detalle.tsx')
const html = (e: 0 | 1 | 2 | 3, fallo: 0 | 1 | 2 | 3 = 0) => renderToStaticMarkup(<EsperaPago etapa={e} fallo={fallo} etiqueta="Pagar 20 USDC" onPagar={() => {}} />)
const bloque = css.slice(css.indexOf('/* ── Estado de espera v2 del pago'))

describe('Estado de espera del pago: pasos reales', () => {
  it('cada texto de avance del depósito real se asigna a Firmando o Enviando (sin temporizadores)', () => {
    const fn = escrowTs.slice(escrowTs.indexOf('async function depositarPropio'), escrowTs.indexOf('async devolver('))
    const textos = [...fn.matchAll(/avance\((['`])(.*?)\1\)/g)].map(m => m[2])
    expect(textos.length).toBeGreaterThanOrEqual(6)
    for (const t of textos) expect(etapaDeAvance(t)).toBe(/^Guardando el depósito/.test(t) ? 2 : 1)
    expect(textos.filter(t => etapaDeAvance(t) === 2)).toEqual(['Guardando el depósito en la cuenta segura…', 'Guardando el depósito en la cuenta segura…'])
    expect(etapaDeAvance('Confirma el depósito en Freighter…')).toBe(1)
    const pago = detalle.slice(detalle.indexOf('function PagoSimulado'), detalle.indexOf('/** Fotos de entrada'))
    for (const t of [pago, leer('../EsperaPago.tsx'), leer('../espera.ts')]) expect(t).not.toMatch(/setTimeout|setInterval/)
  })
  it('estados de los pasos, barrita y voz', () => {
    expect(estadosPasos(1)).toEqual(['actual', 'futuro', 'futuro'])
    expect(estadosPasos(2)).toEqual(['hecho', 'actual', 'futuro'])
    expect(estadosPasos(3)).toEqual(['hecho', 'hecho', 'hecho'])
    expect(estadosPasos(0, 2)).toEqual(['hecho', 'error', 'futuro'])
    expect(vozPago(1)).toBe('Paso 1 de 3: Firmando.'); expect(vozPago(2)).toBe('Paso 2 de 3: Enviando.'); expect(vozPago(3)).toBe('Depósito guardado.')
    expect(tramoBarra(1).desde).toBe(0); expect(tramoBarra(2).desde).toBeCloseTo(33.33, 1); expect(tramoBarra(2).hasta).toBeLessThan(66.67); expect(tramoBarra(3).hasta).toBe(100)
    expect(PASOS_PAGO).toEqual(['Firmando', 'Enviando', 'Guardado'])
  })
})

describe('Estado de espera del pago: botón y accesibilidad', () => {
  it('en reposo: botón terracota «Pagar …» sin aria-busy', () => {
    const h = html(0)
    expect(h).toContain('boton--primario'); expect(h).toContain('Pagar 20 USDC'); expect(h).not.toContain('aria-busy'); expect(h).not.toContain('envio--t')
  })
  it('pagando: casita, «Guardando tu depósito…», aria-busy, nota, barrita y role=status por paso', () => {
    for (const e of [1, 2] as const) {
      const h = html(e)
      expect(h).toContain(`envio envio--t${e}`); expect(h).toContain('aria-busy="true"'); expect(h).toContain('aria-disabled="true"'); expect(h).not.toMatch(/\sdisabled=""/)
      expect(h).toContain(ESPERA_PAGO); expect(h).toContain('aviso-logo__llave'); expect(h).toContain(NOTA_ESPERA_PAGO); expect(h).not.toContain('hasta un minuto')
      expect(h).toContain('role="progressbar"'); expect(h).toContain(`aria-valuetext="${vozPago(e)}"`)
      expect(h).toMatch(new RegExp(`<p class="sr" role="status">${vozPago(e).replace('.', '\\.')}</p>`))
      expect(h).toContain('aria-current="step"')
    }
  })
  it('guardado: verde final con «Depósito guardado» y sin aria-busy', () => {
    const h = html(3); expect(h).toContain('envio--t3'); expect(h).toContain('Depósito guardado'); expect(h).not.toContain('aria-busy'); expect(h).toContain('envio__barra--listo')
  })
  it('error: botón activo «Volver a intentar el pago», paso con «(no se pudo)», sin barrita ni la promesa de no pagar dos veces', () => {
    const h = html(0, 2)
    expect(h).toContain(REINTENTO_PAGO); expect(h).not.toContain('aria-busy'); expect(h).toContain('envio__paso--error'); expect(h).toContain('(no se pudo)')
    expect(h).not.toContain('progressbar'); expect(h).not.toContain('dos veces')
  })
  it('CSS: tres verdes de la paleta, fundido de 500 ms, de golpe con reducir movimiento y sin terracota en espera', () => {
    expect(bloque).toMatch(/\.envio--t1 \.boton\.envio__boton\{background:var\(--estado-curso-fondo\);color:var\(--cafe\)/)
    expect(bloque).toMatch(/\.envio--t2 \.boton\.envio__boton\{background:var\(--salvia\);color:var\(--cafe\)/)
    expect(bloque).toMatch(/\.envio--t3 \.boton\.envio__boton\{background:var\(--exito\);color:var\(--fondo\)/)
    expect(bloque).toContain('background-color 500ms var(--ease)')
    expect(bloque).toMatch(/prefers-reduced-motion:reduce\)\{\.envio \.boton\.envio__boton,\.envio__barra>span\{transition:none!important\}/)
    expect(bloque).not.toMatch(/--accion|#[0-9A-Fa-f]{6}\b/)
  })
  it('textos nuevos marcados para Legal', () => {
    const src = leer('../espera.ts')
    for (const t of ['PASOS_PAGO', 'ESPERA_PAGO', 'NOTA_ESPERA_PAGO', 'LISTO_PAGO', 'REINTENTO_PAGO', 'BARRA_PAGO', 'LISTA_PASOS', 'MARCA_PASO', 'vozPago'])
      expect(src.split('\n').find(l => l.includes(`export const ${t} `) || l.includes(`export const ${t}=`))).toMatch(/\/\/ LEGAL: revisado \(25\/10, lista de Legal\)/)
  })
})

describe('Aviso v2 flotante con la 2.ª parada de Tab', () => {
  it('la pila del aviso v2 es position:fixed (no entra al flujo) aunque vaya al inicio del DOM', () => {
    const css = leer('../index.css')
    expect(css).toMatch(/\.tostadas\{position:fixed;/)
    expect(css).not.toMatch(/\.skip\s*\+\s*\.tostada|\.tostadas__zona\{[^}]*position:(static|relative)/)
  })
  it('<Alertas /> va justo después de «Saltar al contenido» en todas las pantallas con sesión o ingreso', () => {
    const app = leer('../App.tsx')
    expect(app.match(/\{skip\}\s*<Alertas \/>/g)?.length).toBe(4)   // + PuertaFirmante (26/10)   // sin pantalla de volver a aceptar desde el 24/10
    expect(app).not.toMatch(/<Pie \/>\s*<Alertas \/>/)
  })
})
