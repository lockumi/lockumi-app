// Legal (24/10, 11:25 p. m.): texto nuevo de la franja amarilla de la red de prueba. CAMBIO VISIBLE: no se publica sin el OK de Katherine.
import { describe, it, expect } from 'vitest'
import { AVISO_RED } from '../ui'
describe('franja de la red de prueba', () => {
  it('texto de Legal', () => { expect(AVISO_RED).toBe('Red de prueba de Stellar: sin dinero real.') })
})
