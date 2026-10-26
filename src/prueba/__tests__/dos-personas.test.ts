// Paso 7 · textos de la devolución automática en el modo de dos personas (detrás del interruptor).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { esDosPersonas, TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO, TEXTO_CERRADO_AUTO } from '../dosPersonas'
import { montoPrueba, recibeInquilino, notaComisionAuto, TERMINOS_42E } from '../dosPersonas'

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
    expect(TEXTO_CERRADO_AUTO).toBe('El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino, menos el 0,3 % de comisión de la red de prueba de Trustless Work. Ninguna persona decidió este reparto.')
    for (const t of [TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO, TEXTO_CERRADO_AUTO]) {
      expect(t).toContain('100 %'); expect(t).not.toMatch(/verificad|garantiz|vos |tenés|podés/i)
    }
    expect(TEXTO_AUTO_DUENO).toContain('No la decide una persona ni pasa a la Mediación Lockumi (demo).')
  })
})

// Legal 24/10 23:29: en la red de prueba Trustless Work descuenta 0,3 % también en resolve_dispute (medido en testnet).
describe('paso 7 · monto real que recibe el inquilino', () => {
  it('montos «… USDC de prueba» y el neto con la comisión de 0,3 %', () => {
    expect(montoPrueba(800)).toBe('800,00 USDC de prueba'); expect(montoPrueba(0.5)).toBe('0,50 USDC de prueba')   // 2 decimales (Legal 25/10, punto 8)
    expect(montoPrueba(797.6)).toBe('797,60 USDC de prueba')
    expect(recibeInquilino(800)).toBe(797.6)
    expect(recibeInquilino(1)).toBe(0.997)
    expect(notaComisionAuto(800)).toBe('Llegaron 797,6000 USDC de prueba: la red de prueba de Trustless Work descuenta el 0,3 % (2,4000 USDC de prueba). El dueño y Lockumi no reciben nada.')
  })
  it('textos con la comisión y la 4.2 e) de Legal', () => {
    for (const t of [TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO]) expect(t).toContain('menos el 0,3 % de comisión de la red de prueba de Trustless Work')
    expect(TEXTO_CERRADO_AUTO).toContain('menos el 0,3 % de comisión de la red de prueba de Trustless Work')
    expect(TERMINOS_42E).toContain('…entrega al inquilino el 100 % del saldo del depósito, menos solo la comisión de la red de prueba de Trustless Work. No puede entregar nada al dueño ni a Lockumi.'.slice(1))
  })
})
