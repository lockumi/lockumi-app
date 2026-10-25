// PR 7 (pasos 12 y 13) · lo nuevo solo se monta con el interruptor encendido.
import { describe, it, expect } from 'vitest'
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const det = fs.readFileSync(new URL('../../screens/Detalle.tsx', import.meta.url), 'utf8')
describe('Detalle con el interruptor', () => {
  it('en_curso: el aviso de 5 días va debajo de la pantalla de siempre, solo con pruebaCompleta()', () => {
    expect(det).toMatch(/en_curso: pruebaCompleta\(\) \? <><EnCurso \{\.\.\.p\} \/><AvisoSalida \{\.\.\.p\} \/><\/> : <EnCurso \{\.\.\.p\} \/>/)
  })
})
