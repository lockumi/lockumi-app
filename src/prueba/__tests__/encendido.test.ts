// Paso 16 · commit aparte que enciende el interruptor en los builds de producción (.env.production). vitest no lo carga.
import { describe, it, expect } from 'vitest'
const env = import.meta.glob('/.env.production', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
describe('interruptor encendido en producción', () => {
  it('.env.production tiene VITE_PRUEBA_COMPLETA=1 y ningún secreto', () => {
    const t = env['/.env.production'] ?? ''
    expect(t).toMatch(/^VITE_PRUEBA_COMPLETA=1$/m)
    for (const l of t.split('\n').filter(l => l.trim() && !l.startsWith('#'))) expect(l).toMatch(/^VITE_PRUEBA_COMPLETA=1$/)
  })
})
