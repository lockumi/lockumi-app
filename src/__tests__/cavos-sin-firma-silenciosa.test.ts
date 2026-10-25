// LEGAL: revisado (24/10) · Términos 5.3: «Lockumi no usa esa función» (firmar pagos pequeños sin pedir confirmación).
// El vault de Cavos firma SIN preguntar lo que queda dentro de los límites de la app (https://docs.cavos.xyz/docs/vault):
// pagos (`payment`) y `createAccount` de Stellar. En @cavos/kit 0.4.2 eso llega por `wallet.execute(monto, destino)`,
// `wallet.signTransaction(monto, destino)` o `signXdr` con una XDR que tenga esas operaciones; con `vault: false` la llave
// queda en la página y no hay límites. Si alguna de estas pruebas falla, hay que cambiar los Términos (5.3) antes de publicar.
import { describe, expect, it } from 'vitest'
// Mismo patrón que los otros tests que leen archivos (sin tipos de Node en el tsconfig).
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as {
  readFileSync(r: URL, c: 'utf8'): string; readdirSync(r: URL, o: { recursive: true }): string[] }
const SRC = new URL('../', import.meta.url)
const archivos = fs.readdirSync(SRC, { recursive: true }).map(f => f.replace(/\\/g, '/'))
  .filter(f => /\.(ts|tsx)$/.test(f) && !f.split('/').includes('__tests__'))
// Sin comentarios: solo cuenta el código que se ejecuta.
const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const codigo = archivos.map(f => ({ f, t: sinComentarios(fs.readFileSync(new URL(f, SRC), 'utf8')) }))
const donde = (re: RegExp) => codigo.filter(x => re.test(x.t)).map(x => x.f).sort()

describe('Cavos: sin firmas silenciosas (Términos 5.3)', () => {
  it('no usa execute ni signMessage de la billetera', () => {
    expect(donde(/\.execute\s*\(/)).toEqual([])
    expect(donde(/\bsignMessage\s*\(/)).toEqual([])
  })
  it('signTransaction solo aparece con Freighter (que siempre pide confirmar), nunca con monto y destino de Cavos', () => {
    expect(donde(/\bsignTransaction\s*\(/)).toEqual(['services/cuentaPropia.ts'])
    const t = codigo.find(x => x.f === 'services/cuentaPropia.ts')!.t
    expect(t.match(/\bsignTransaction\s*\([^)]*\)/g)!.every(m => /networkPassphrase/.test(m))).toBe(true)
  })
  it('el vault sigue activo: Cavos.connect con vault: true y nunca vault: false ni otro vault', () => {
    expect(donde(/vault\s*:\s*(false|\{)/)).toEqual([])
    expect(codigo.find(x => x.f === 'services/billetera.ts')!.t).toMatch(/Cavos\.connect\(\{[^)]*vault: true \}\)/)
    expect(donde(/Cavos\.connect\(\{/)).toEqual(['services/billetera.ts'])
    expect(donde(/\buseCavos\b|CavosProvider/)).toEqual([])
  })
  it('signXdr solo pasa por firmarXdr, y el código no arma pagos ni createAccount para que los firme la billetera', () => {
    expect(donde(/\.signXdr\s*\(/)).toEqual(['services/billetera.ts'])
    expect(donde(/\bfirmarXdr\s*\(/)).toEqual(['services/billetera.ts', 'services/cuentaPropia.ts', 'services/solo.ts', 'services/trustless.ts'])
    expect(donde(/Operation\.(payment|createAccount)\s*\(/)).toEqual([])
  })
})
