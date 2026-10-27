import { afterEach, describe, expect, it, vi } from 'vitest'
import { Buffer as BufferPaquete } from 'buffer'

// Vite no incluye Buffer y el kit de Cavos (borsh, @solana/web3.js…) lo usa como global: sin polyfill, probarFirma lanzaba
// «ReferenceError: Buffer is not defined». Ver docs/firma-cavos.md.
const g = globalThis as { Buffer?: unknown }
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }

describe('polyfill de Buffer', () => {
  const original = g.Buffer
  afterEach(() => { g.Buffer = original; vi.resetModules() })

  it('define globalThis.Buffer cuando el entorno no lo trae (como el navegador con Vite)', async () => {
    delete g.Buffer
    expect(typeof g.Buffer).toBe('undefined')
    await import('../polyfills.ts')
    expect(typeof g.Buffer).toBe('function')
    expect(g.Buffer).toBe(BufferPaquete)
    expect(BufferPaquete.from('lockumi').toString('hex')).toBe('6c6f636b756d69')
  })

  it('no pisa un Buffer que ya existe', async () => {
    vi.resetModules()
    await import('../polyfills.ts')
    expect(g.Buffer).toBe(original)
  })

  it('src/main.tsx lo importa como PRIMERA línea, antes de React y de cualquier módulo de Cavos o Stellar', () => {
    const lineas = fs.readFileSync(new URL('../main.tsx', import.meta.url), 'utf8').split('\n').filter((l: string) => l.trim())
    expect(lineas[0]).toMatch(/^import '\.\/polyfills\.ts'/)
  })
})
