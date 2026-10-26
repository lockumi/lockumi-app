// Legal 25/10, 5:09 p. m. (puntos 7 y 8): hora siempre en 12 h y montos siempre con 2 decimales; «de prueba» en el historial.
import { describe, it, expect } from 'vitest'
import { montosDosDecimales } from '../servidor/mapeo'
import { DEVUELTO_AUTO, REPARTO_DISPUTA } from '../../api/_lib/tw'
import { ampm } from '../ui'

describe('formatos de Legal', () => {
  it('historial: los montos del servidor se muestran con 2 decimales y coma, sin tocar porcentajes ni montos ya formateados', () => {
    expect(montosDosDecimales('El dueño reclamó 30 USDC de prueba')).toBe('El dueño reclamó 30,00 USDC de prueba')
    expect(montosDosDecimales('Acuerdo: 30.5 al dueño y 69.5 al inquilino')).toBe('Acuerdo: 30,50 al dueño y 69,50 al inquilino')
    expect(montosDosDecimales('Se liberó el depósito al inquilino desde Trustless Work (800 USDC de prueba menos la comisión de 0,3 % de Trustless Work)'))
      .toBe('Se liberó el depósito al inquilino desde Trustless Work (800,00 USDC de prueba menos la comisión de 0,3 % de Trustless Work)')
    expect(montosDosDecimales('30,00 USDC de prueba al dueño y 70,00 USDC de prueba al inquilino')).toBe('30,00 USDC de prueba al dueño y 70,00 USDC de prueba al inquilino')
    expect(montosDosDecimales('el 100 % del depósito')).toBe('el 100 % del depósito')
  })
  it('textos del historial de Trustless Work con «de prueba» (punto 7)', () => {
    expect(DEVUELTO_AUTO).toBe('Devolución automática: la cuenta que resuelve disputas entregó el 100 % del depósito de prueba al inquilino')
    expect(REPARTO_DISPUTA).toBe('Se abrió la disputa en Trustless Work (red de prueba) para pagar el reparto aceptado')
  })
  it('«a. m.» / «p. m.» con espacios duros', () => {
    expect(ampm('25 oct 2026, 4:44 p. m.')).toBe('25 oct 2026, 4:44\u00a0p.\u00a0m.')
    expect(ampm('9:05 a.\u00a0m.')).toBe('9:05\u00a0a.\u00a0m.')
  })
})
