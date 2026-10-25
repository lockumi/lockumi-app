// Paso 7 · textos de la devolución automática en el modo de dos personas (detrás del interruptor).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { esDosPersonas, TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO, TEXTO_CERRADO_AUTO } from '../dosPersonas'

afterEach(() => vi.unstubAllEnvs())
describe('paso 7 · modo de dos personas', () => {
  it('solo con el interruptor encendido', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '')
    expect(esDosPersonas({ dosPersonas: true })).toBe(false)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(esDosPersonas({ dosPersonas: true })).toBe(true)
    expect(esDosPersonas({})).toBe(false)
  })
  it('textos: 100 % al inquilino, sin persona que decida, sin mediación y sin promesas', () => {
    expect(TEXTO_CERRADO_AUTO).toBe('El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino. Ninguna persona decidió este reparto.')
    for (const t of [TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO, TEXTO_CERRADO_AUTO]) {
      expect(t).toContain('100 %'); expect(t).not.toMatch(/verificad|garantiz|vos |tenés|podés/i)
    }
    expect(TEXTO_AUTO_DUENO).toContain('No la decide una persona ni pasa a la Mediación Lockumi (demo).')
  })
})
