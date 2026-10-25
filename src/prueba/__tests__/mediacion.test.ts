// PR 6 (paso 10) · Mediación Lockumi (demo) B.7, sin cupo B.12, «Resolver el reclamo (simulación)» B.14 y la parte no reclamada (6.3 f).
import { describe, it, expect } from 'vitest'
import type { Alquiler } from '../../types'
import { CUPO, casosActivos, pedirMediacion, noUsarMediacion, plazoMediacion, repartoValido, textoConfirmar, textoResultado, textoNoReclamado } from '../mediacion'

const T0 = +new Date('2026-11-06T16:00:00Z')   // viernes 6 nov 2026, 10:00 hora de Costa Rica
const alq = (id: string, x: Partial<Alquiler> = {}): Alquiler => ({ id, direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-10-31', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
  estado: 'mediacion', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0,
  reclamo: { monto: 95, motivo: 'Pared', fotos: [], fecha: new Date(T0).toISOString() }, ...x })
const pedida = (id: string) => alq(id, { reclamo: { monto: 95, motivo: 'Pared', fotos: [], fecha: 'f', mediacion: { estado: 'pedida', fecha: 'f' } } })

describe('Mediación Lockumi (demo)', () => {
  it('cuenta solo los casos en mediación con la mediación pedida (cupo de 10)', () => {
    const otros = [pedida('1'), pedida('2'), alq('3'), { ...pedida('4'), estado: 'cerrado' as const }]
    expect(CUPO).toBe(10); expect(casosActivos(otros)).toBe(2)
  })
  it('pedirla con cupo queda «pedida» y responde en 3 días hábiles (viernes → miércoles)', () => {
    const x = alq('a'); expect(pedirMediacion(x, [], T0)).toBe('pedida')
    expect(x.reclamo!.mediacion).toEqual({ estado: 'pedida', fecha: new Date(T0).toISOString() })
    expect(plazoMediacion(x)).toBe(T0 + 5 * 86_400_000)
  })
  it('con 10 casos activos queda «sin cupo» (B.12) y no cambia nada más', () => {
    const lista = Array.from({ length: 10 }, (_, i) => pedida(String(i)))
    const x = alq('a'); expect(pedirMediacion(x, lista, T0)).toBe('sin-cupo')
    expect(x.estado).toBe('mediacion'); expect(x.resultado).toBeUndefined()
  })
  it('pedirla dos veces no la duplica; «Prefiero no usarla» queda registrado', () => {
    const x = alq('a'); pedirMediacion(x, [], T0); pedirMediacion(x, [], T0 + 1000)
    expect(x.reclamo!.mediacion!.fecha).toBe(new Date(T0).toISOString()); expect(x.historial).toHaveLength(1)
    const y = alq('b'); noUsarMediacion(y, T0); expect(y.reclamo!.mediacion!.estado).toBe('no-usar')
  })
})
describe('Resolver el reclamo (simulación), B.14', () => {
  it('el reparto suma el depósito y el dueño nunca recibe más de lo reclamado', () => {
    const a = alq('a')
    expect(repartoValido(a, 95)).toBe(true); expect(repartoValido(a, 0)).toBe(true)
    expect(repartoValido(a, 96)).toBe(false); expect(repartoValido(a, -1)).toBe(false); expect(repartoValido(a, NaN)).toBe(false)
  })
  it('textos de la confirmación y del aviso del resultado (B.14)', () => {
    expect(textoConfirmar(95, 705)).toBe('El dueño recibirá 95 USDC de prueba y el inquilino 705 USDC de prueba. Esto mueve el depósito de prueba de verdad en la red de prueba y no se puede deshacer en la app. Es una simulación: no lo decide una persona mediadora y no tiene efecto legal.')
    expect(textoResultado(95, 705)).toBe('El dueño recibió 95 USDC de prueba y el inquilino 705 USDC de prueba, en la red de prueba. El reparto se eligió con el botón de simulación: no lo decidió una persona mediadora. En la demo, no tiene efecto legal. Fuera de la app, los dos conservan sus derechos.')
  })
  it('la parte no reclamada se libera al cerrar el reclamo (6.3 f)', () => {
    expect(textoNoReclamado(alq('a'))).toBe('La parte no reclamada, 705 USDC de prueba, se libera al inquilino cuando se cierra el reclamo (6.3 f). Mientras tanto, todo el depósito de prueba sigue bloqueado en la cuenta segura.')
  })
})
