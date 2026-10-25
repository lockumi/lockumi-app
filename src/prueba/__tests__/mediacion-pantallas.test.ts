// PR 6 (paso 10) · la pantalla nueva de la mediación solo se monta con el interruptor encendido.
import { describe, it, expect } from 'vitest'
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const det = fs.readFileSync(new URL('../../screens/Detalle.tsx', import.meta.url), 'utf8')
describe('Detalle con el interruptor', () => {
  it('mediacion: MediacionPC solo con pruebaCompleta(); si no, la de siempre', () => {
    expect(det).toMatch(/mediacion: reglas17\(a\) \? <MediacionPC \{\.\.\.p\} \/> : <Mediacion \{\.\.\.p\} \/>/)
  })
  it('el aviso del resultado B.14 en «Terminado» va detrás del interruptor', () => {
    expect(det).toMatch(/pruebaCompleta\(\) && r\.via === 'simulacion' && <ResueltoSimulacion a=\{a\} \/>/)
  })
})
