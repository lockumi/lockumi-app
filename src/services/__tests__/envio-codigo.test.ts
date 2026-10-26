// 26/10: «Enviar código» no puede quedar en silencio si Cavos no responde (iPhone Safari, Hotmail).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { conLimite, LIMITE_ENVIO_MS } from '../auth'

afterEach(() => { vi.useRealTimers() })
describe('envío del código con límite de tiempo', () => {
  it('si Cavos nunca responde, falla a los 20 s (la pantalla muestra «No pudimos enviar el código»)', async () => {
    vi.useFakeTimers()
    const r = conLimite(new Promise<void>(() => {})).then(() => 'ok', () => 'error')
    await vi.advanceTimersByTimeAsync(LIMITE_ENVIO_MS - 1); let fin = ''; void r.then(v => { fin = v })
    await Promise.resolve(); expect(fin).toBe('')
    await vi.advanceTimersByTimeAsync(1); expect(await r).toBe('error')
    expect(LIMITE_ENVIO_MS).toBe(20_000)
  })
  it('deja pasar la respuesta de Cavos y su error (p. ej. «not supported»)', async () => {
    await expect(conLimite(Promise.resolve(7))).resolves.toBe(7)
    await expect(conLimite(Promise.reject(new Error('This email provider is not supported yet.')))).rejects.toThrow(/not supported/)
  })
})
