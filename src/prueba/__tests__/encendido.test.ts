// Paso 16 · el interruptor se enciende en un commit aparte (.env.production); el contenido se publica antes, con el archivo ausente.
// Si el archivo existe, solo puede encender la prueba completa y no tener ningún secreto ni otra variable. vitest no lo carga.
import { describe, it, expect } from 'vitest'
const env = import.meta.glob('/.env.production', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
describe('interruptor de producción (.env.production)', () => {
  it('ausente (apagado) o solo VITE_PRUEBA_COMPLETA=1, sin secretos', () => {
    const t = env['/.env.production']
    if (t === undefined) return
    expect(t).toMatch(/^VITE_PRUEBA_COMPLETA=1$/m)
    for (const l of t.split('\n').filter(l => l.trim() && !l.startsWith('#'))) expect(l).toMatch(/^VITE_PRUEBA_COMPLETA=1$/)
  })
})
