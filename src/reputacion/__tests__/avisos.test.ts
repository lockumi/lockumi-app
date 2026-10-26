// Paso 19 · REP-12 (regla 10): aviso en la app cada vez que el puntaje cambia o un alquiler pasa a «En revisión», y aviso cuando un hecho
// deja de contar por los 10 años (regla 8). El correo queda pendiente (VITE_CORREOS sigue apagado).
import { describe, it, expect } from 'vitest'
import { avisoCambio, hechosVencidos } from '../avisos'
import type { Alquiler } from '../../types'

const alq = (id: string, dueno: number, fecha: string, direccion = 'Casa ' + id) => ({ id, direccion, monto: 20, estado: 'cerrado',
  resultado: { inquilino: 20 - dueno, dueno, via: 'acuerdo', fecha } }) as unknown as Alquiler

describe('aviso de cambio de puntaje (REP-12)', () => {
  it('sin cambio o la primera vez, no hay aviso', () => {
    expect(avisoCambio(undefined, '4,6 de 5', [])).toBeNull(); expect(avisoCambio('4,6 de 5', '4,6 de 5', [])).toBeNull()
  })
  it('cuando cambia: «Tu puntaje pasó de {antes} a {después} por el cierre del alquiler {alquiler} el {fecha}.»', () => {
    const a = avisoCambio('5,0 de 5', '4,6 de 5', [alq('1', 0, '2026-05-01T18:00:00Z'), alq('2', 5, '2026-10-20T18:00:00Z', 'Casa Escazú')])!
    expect(a.titulo).toBe('Tu puntaje cambió')
    expect(a.texto).toBe('Tu puntaje pasó de 5,0 de 5 a 4,6 de 5 por el cierre del alquiler Casa Escazú el 20 de octubre de 2026.')
    expect(a.nota).toBe('Si crees que hay un error, pide una revisión: mientras la revisamos, tu puntaje dice «En revisión».')
  })
  it('también avisa cuando pasa a «En revisión»', () => {
    expect(avisoCambio('4,6 de 5', 'En revisión', [alq('1', 0, '2026-05-01T18:00:00Z')])?.texto).toContain('a En revisión')
  })
})
describe('hechos que dejan de contar a los 10 años (REP-12)', () => {
  it('un descuento de hace más de 10 años se avisa una vez', () => {
    const viejo = alq('v', 5, '2016-10-01T18:00:00Z'), nuevo = alq('n', 5, '2026-01-01T18:00:00Z')
    const ahora = Date.parse('2026-10-25T18:00:00Z')
    expect(hechosVencidos([viejo, nuevo], 'inquilino', ahora, []).map(a => a.id)).toEqual(['v'])
    expect(hechosVencidos([viejo, nuevo], 'inquilino', ahora, ['v'])).toEqual([])
    expect(hechosVencidos([viejo], 'dueno', ahora, [])).toEqual([])
  })
})
