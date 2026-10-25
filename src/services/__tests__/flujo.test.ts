import { describe, it, expect } from 'vitest'
import { firmar, estadoFirma, ambos, etapaDe, pasoTexto, turno, ahoraPrueba, ErrorFirma } from '../../flujo'
import type { Alquiler } from '../../types'
const T = '2026-10-16T20:00:00Z'
describe('firmas', () => {
  it('cada uno firma solo por sí mismo', () => {
    expect(() => firmar({}, 'dueno', 'inquilino', T)).toThrow(ErrorFirma)
    expect(() => firmar({}, 'inquilino', 'dueno', T)).toThrow('Solo puedes firmar por ti.')
  })
  it('no se firma dos veces', () => { expect(() => firmar({ dueno: T }, 'dueno', 'dueno', T)).toThrow('Ya firmaste.') })
  it('estados: te toca → esperando → firmado por los dos', () => {
    let f = {}
    expect(estadoFirma(f, 'dueno').texto).toBe('Te toca firmar')
    f = firmar(f, 'dueno', 'dueno', T)
    expect(estadoFirma(f, 'dueno').texto).toBe('Firmaste ✓ · Esperando la firma del inquilino')
    expect(estadoFirma(f, 'inquilino').texto).toBe('Te toca firmar')
    expect(ambos(f)).toBe(false)
    f = firmar(f, 'inquilino', 'inquilino', T)
    expect(ambos(f)).toBe(true)
    expect(estadoFirma(f, 'inquilino').texto).toBe('Firmado por los dos')
    expect(estadoFirma(f, 'dueno').texto).toBe('Firmado por los dos')
  })
  it('el inquilino firma primero', () => {
    const f = firmar({}, 'inquilino', 'inquilino', T)
    expect(estadoFirma(f, 'inquilino').texto).toBe('Firmaste ✓ · Esperando la firma del dueño')
  })
})
describe('etapas y turnos', () => {
  const base = { contrato: { firmas: {} }, entrada: { firmas: {}, cuartos: [] } } as unknown as Alquiler
  it('paso X de 8', () => {
    expect(pasoTexto({ estado: 'firmas' })).toBe('Paso 2 de 8')
    expect(etapaDe({ estado: 'en_curso' })).toBe(4)
    expect(pasoTexto({ estado: 'cerrado' })).toBe('Paso 8 de 8')
  })
  it('qué te toca según rol', () => {
    expect(turno({ ...base, estado: 'pendiente_pago' }, 'inquilino').tu).toBe('Paga el depósito.')
    expect(turno({ ...base, estado: 'pendiente_pago' }, 'dueno').otra).toMatch(/inquilino tiene que pagar/)
    expect(turno({ ...base, estado: 'firmas', contrato: { firmas: { dueno: T } } }, 'inquilino').otra).toBe('El dueño ya firmó.')
  })
})

describe('textoPlazo', async () => {
  const { textoPlazo } = await import('../../acciones')
  it('muestra el plazo real del contrato', () => {
    expect(textoPlazo({})).toBe('7 días')
    expect(textoPlazo({ ventanaSegundos: 86400 })).toBe('1 día')
    expect(textoPlazo({ ventanaSegundos: 7200 })).toBe('2 horas')
    expect(textoPlazo({ ventanaSegundos: 300 })).toBe('5 minutos')
    expect(textoPlazo({ ventanaSegundos: 60 })).toBe('1 minuto')
  })
})

// LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide.
describe('mediación: la persona mediadora ayuda, no decide', () => {
  const a = (estado: Alquiler['estado']) => ({ estado, contrato: { firmas: {} }, entrada: { firmas: {} } }) as unknown as Alquiler
  it('textos «sigue» de reclamo y mediación', () => {
    expect(turno(a('reclamo'), 'inquilino').sigue).toBe('Si lo rechazas, una persona mediadora les ayuda a buscar un acuerdo.')
    expect(turno(a('reclamo'), 'dueno').sigue).toBe('Si lo rechaza, una persona mediadora les ayuda a buscar un acuerdo.')
    expect(turno(a('mediacion'), 'inquilino').sigue).toBe('La persona mediadora les ayuda a acordar cómo se reparte el depósito.')
  })
  it('línea de la prueba: el reparto lo decides tú (simulación)', () => {
    expect(ahoraPrueba(a('mediacion'))).toBe('Ahora toca la mediación (simulada). En esta prueba, el reparto lo decides tú con el botón de abajo.')
  })
  it('ningún texto dice que la persona mediadora decide', () => {
    const todo = [...(['reclamo', 'mediacion'] as const).flatMap(e => (['dueno', 'inquilino'] as const).map(r => turno(a(e), r).sigue))].join(' ')
    expect(todo).not.toMatch(/decide|decidir/)
  })
})
