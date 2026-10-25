// Paso 15 · la B.8 y la B.13 solo se montan en Crear con el interruptor encendido.
import { describe, it, expect } from 'vitest'
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const crear = fs.readFileSync(new URL('../../screens/Crear.tsx', import.meta.url), 'utf8')
describe('Crear con el interruptor', () => {
  it('B.8 y B.13 antes del Anexo 6-A, solo con pruebaCompleta()', () => {
    expect(crear).toMatch(/\{pruebaCompleta\(\) && <><SuscripcionB8 \/><RendimientoB13 \/><\/>\}\n\s*\{pruebaCompleta\(\) && <Anexo6A/)
  })
})
