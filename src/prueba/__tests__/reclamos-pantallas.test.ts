// PR 5 (paso 9) · las pantallas nuevas del reclamo solo se montan con el interruptor encendido (producción sigue igual).
import { describe, it, expect } from 'vitest'
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const det = fs.readFileSync(new URL('../../screens/Detalle.tsx', import.meta.url), 'utf8')
describe('Detalle con el interruptor', () => {
  it('reclamo: ReclamoPC solo con pruebaCompleta(); si no, la pantalla de siempre', () => {
    expect(det).toMatch(/reclamo: pruebaCompleta\(\) \? <ReclamoPC \{\.\.\.p\} \/> : <Reclamo \{\.\.\.p\} \/>/)
  })
  it('el formulario del reclamo por rubros va dentro de PlazoDueno (que solo se monta con el interruptor encendido)', () => {
    expect(det).toMatch(/<PlazoDueno a=\{a\} rol=\{rol\} reclamo=\{cerrar => <FormRubros a=\{a\} onCancelar=\{cerrar\} \/>\}>/)
  })
})
