// PR 6 (paso 10) · «Te toca / Qué sigue» con el interruptor encendido: en la demo nadie del equipo atiende la mediación.
import { describe, it, expect, vi } from 'vitest'
import type { Alquiler } from '../../types'
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { turno } = await import('../../flujo')
const a = (estado: Alquiler['estado']) => ({ estado, contrato: { firmas: {} }, entrada: { firmas: {} } }) as unknown as Alquiler
describe('turno con la prueba completa', () => {
  it('reclamo: responder rubro por rubro; si no hay acuerdo, propuesta automática y luego la mediación (demo)', () => {
    expect(turno(a('reclamo'), 'inquilino')).toEqual({ tu: 'Responde el reclamo rubro por rubro.', otra: 'El dueño espera tu respuesta.', sigue: 'Si no aceptas todo, verás una propuesta automática (simulación). Si no hay acuerdo, pasa a la Mediación Lockumi (demo).' })
    expect(turno(a('reclamo'), 'dueno').sigue).toBe('Si no acepta todo, verán una propuesta automática (simulación). Si no hay acuerdo, pasa a la Mediación Lockumi (demo).')
  })
  it('mediación: nadie la revisa en la demo; el reparto se elige con el botón de simulación', () => {
    expect(turno(a('mediacion'), 'inquilino')).toEqual({ tu: 'Puedes pedir la Mediación Lockumi (demo) o resolver el reclamo con el botón de simulación.', otra: 'No hubo acuerdo.', sigue: 'El depósito de prueba sigue bloqueado hasta que se resuelva el reclamo.' })
  })
})
