import { describe, it, expect, vi } from 'vitest'

// usdExacto: mismo criterio que usd() (coma decimal, al menos 2 decimales, mismo sufijo), pero sin redondear lo que llega.
describe('usdExacto (Katherine 27/10/2026: 0,997 USDC y no «1,00»)', () => {
  it('con la red de prueba: «0,997 USDC», «1,994 USDC», «1,00 USDC»', async () => {
    vi.resetModules(); vi.doMock('../servidor/config', async o => ({ ...(await o<object>()), escrowReal: true }))
    const { usdExacto, usd } = await import('../ui'); const { netoTW } = await import('../../api/_lib/centimos')
    expect(usdExacto(netoTW(1))).toMatch(/^0,997 USDC/); expect(usdExacto(netoTW(2))).toMatch(/^1,994 USDC/); expect(usdExacto(1)).toMatch(/^1,00 USDC/)
    expect(usd(netoTW(1))).toMatch(/^1,00 USDC/)   // usd() redondea a 2: por eso lo que llega usa usdExacto
    vi.doUnmock('../servidor/config')
  })
})
