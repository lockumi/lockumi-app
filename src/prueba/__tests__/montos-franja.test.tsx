// Ajustes de Legal (24/10, 11:25 p. m.), solo con el interruptor encendido: montos «800 USDC de prueba» en todas las pantallas
// (también la cabecera y la tarjeta del detalle) y la franja de la red de prueba visible en todas las pantallas.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usd, Fondo, AVISO_RED, AVISO_RED_SIMULADO } from '../../ui'
afterEach(() => vi.unstubAllEnvs())

describe('montos con el interruptor', () => {
  it('encendido: «800 USDC de prueba»', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(usd(800)).toBe('800,00 USDC de prueba'); expect(usd(705.5)).toBe('705,50 USDC de prueba'); expect(usd(0.5)).toBe('0,50 USDC de prueba')   // 2 decimales (Legal 25/10, punto 8)
  })
  it('apagado: como siempre (en las pruebas no hay red: «USD 800,00»)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0')
    expect(usd(800)).toMatch(/^USD\s800,00$/)
  })
})
describe('franja de la red de prueba', () => {
  it('encendido: se ve en todas las pantallas (Fondo), aunque el depósito sea simulado', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const h = renderToStaticMarkup(<Fondo><p>x</p></Fondo>)
    expect(h).toContain('class="aviso-red" role="note"'); expect(h.includes(AVISO_RED) || h.includes(AVISO_RED_SIMULADO)).toBe(true)
  })
  it('apagado y sin red: no cambia (no hay franja)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0')
    expect(renderToStaticMarkup(<Fondo><p>x</p></Fondo>)).not.toContain('aviso-red')
  })
})

describe('cabecera del contrato (barra) con el interruptor', () => {
  it('encendido: el monto no se corta con «…» (la línea puede bajar)', async () => {
    const fs = await import(['node', 'fs'].join(':'))
    const tsx = fs.readFileSync('src/screens/ContratoCompacto.tsx', 'utf8'), css = fs.readFileSync('src/index.css', 'utf8')
    expect(tsx).toMatch(/cc-barra__txt' \+ \(pruebaCompleta\(\) \? ' cc-barra__txt--ajusta'/)
    expect(css).toMatch(/\.cc-barra__txt--ajusta strong\{white-space:normal\}/)
  })
})
