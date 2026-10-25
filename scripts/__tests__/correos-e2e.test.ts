// E2E de C con correos: los correos de prueba salen SOLO al buzón de prueba (lockumi@mail.grokbot.com, con etiqueta +).
import { describe, it, expect, vi } from 'vitest'
import { BUZON, correoPrueba, fetchSoloBuzon } from '../correos-e2e.mjs'

const resend = (to: unknown) => ['https://api.resend.com/emails', { method: 'POST', body: JSON.stringify({ to, subject: 'x' }) }] as const

describe('correos del E2E de C', () => {
  it('arma direcciones del buzón de prueba con etiqueta por caso y papel', () => {
    expect(correoPrueba('silencio-inquilino', 'inquilino')).toBe('lockumi+e2ec-silencio-inquilino-inquilino@mail.grokbot.com')
    for (const c of ['aprobada', 'silencio-dueno', 'mediacion', 'silencio-inquilino']) for (const r of ['dueno', 'inquilino'])
      expect(BUZON.test(correoPrueba(c, r))).toBe(true)
  })
  it('deja pasar los envíos al buzón de prueba', async () => {
    const f = vi.fn(async () => new Response('{"id":"1"}')), g = fetchSoloBuzon(f)
    await g(...resend(['lockumi@mail.grokbot.com'])); await g(...resend(['lockumi+e2ec-aprobada-inquilino@mail.grokbot.com']))
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('bloquea cualquier otra dirección antes de llamar a Resend', async () => {
    const f = vi.fn(async () => new Response('{"id":"1"}')), g = fetchSoloBuzon(f)
    for (const to of [['otra@correo.com'], ['lockumi@mail.grokbot.com', 'otra@correo.com'], ['lockumi@mail.grokbot.com.evil.com'], ['xlockumi@mail.grokbot.com'], [], undefined])
      await expect(g(...resend(to))).rejects.toThrow(/buzón de prueba/)
    await expect(g('https://api.resend.com/emails', { method: 'POST', body: JSON.stringify({ to: ['lockumi@mail.grokbot.com'], cc: ['otra@correo.com'] }) })).rejects.toThrow(/buzón de prueba/)
    expect(f).not.toHaveBeenCalled()
  })
  it('no toca las demás llamadas', async () => {
    const f = vi.fn(async () => new Response('{}')), g = fetchSoloBuzon(f)
    await g('https://horizon-testnet.stellar.org/x', {}); expect(f).toHaveBeenCalledTimes(1)
  })
})
