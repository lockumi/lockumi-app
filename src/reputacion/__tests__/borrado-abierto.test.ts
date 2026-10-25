// Paso 19 · Eliminar la cuenta con un alquiler abierto (respuesta final de Legal, 25/10/2026): la solicitud es DEFINITIVA; el perfil deja
// de mostrarse al pedirla; con un alquiler abierto (depósito guardado, plazo para reclamar o mediación) la cuenta se elimina en un máximo
// de 5 días hábiles DESPUÉS de que se cierra el último; si no, en 5 días hábiles desde el pedido. Se guarda la fecha y la hora del pedido.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as B from '../borrado'
import { aceptarRep01, guardarDatos, aceptoRep01 } from '../consentimiento'
import type { Alquiler, Estado } from '../../types'

const E = 'dueno@lockumi.com', OTRO = 'otro@lockumi.com'
const alq = (id: string, estado: Estado, x: Partial<Alquiler> = {}) => ({ id, direccion: 'Casa ' + id, monto: 20, estado, duenoEmail: E, inquilinoEmail: OTRO, ...x }) as unknown as Alquiler
const cerrar = (a: Alquiler, fecha: string) => ({ ...a, estado: 'cerrado', resultado: { inquilino: 20, dueno: 0, via: 'acuerdo', fecha } }) as unknown as Alquiler
beforeEach(() => { const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } })
  aceptarRep01(E, ['x']); guardarDatos(E, 'Rodrigo S.', 'Escazú') })

describe('alquiler abierto = depósito guardado, plazo para reclamar o mediación en curso', () => {
  it('estados abiertos y no abiertos', () => {
    for (const e of ['fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion'] as Estado[]) expect(B.alquilerAbierto(alq('a', e))).toBe(true)
    for (const e of ['firmas', 'pendiente_pago', 'cerrado'] as Estado[]) expect(B.alquilerAbierto(alq('a', e))).toBe(false)
  })
  it('solo cuentan los alquileres de esa persona (como dueño o como inquilino)', () => {
    const xs = [alq('1', 'en_curso'), alq('2', 'reclamo', { duenoEmail: 'x@y.com', inquilinoEmail: 'z@y.com' }), alq('3', 'mediacion', { duenoEmail: 'x@y.com', inquilinoEmail: E.toUpperCase() })]
    expect(B.abiertosDe(xs, E).map(a => a.id)).toEqual(['1', '3'])
  })
})

describe('pedir eliminar la cuenta', () => {
  it('sin alquiler abierto: plazo de 5 días hábiles desde el pedido; se guarda la fecha y la hora (Costa Rica)', () => {
    const s = B.pedirBorrado(E, '2026-10-25T20:00:00Z', [])
    expect(s).toMatchObject({ pedido: '2026-10-25T20:00:00Z', hora: '2:00 p. m.', abierto: false, limite: B.fechaLimiteBorrado('2026-10-25T20:00:00Z') })
    expect(B.perfilDisponible(E)).toBe(false)
  })
  it('con un alquiler abierto: el perfil deja de mostrarse al instante, pero todavía no hay fecha límite', () => {
    const s = B.pedirBorrado(E, '2026-10-25T20:00:00Z', [alq('1', 'ventana_reclamo')])
    expect(s).toMatchObject({ abierto: true, limite: null, hora: '2:00 p. m.' }); expect(B.perfilDisponible(E)).toBe(false)
    expect(B.esperandoCierre(E)).toBe(true)
  })
  it('es definitiva: no hay forma de deshacerla ni de volver a mostrar el perfil; un segundo pedido no cambia nada', () => {
    const a = B.pedirBorrado(E, '2026-10-25T20:00:00Z', [alq('1', 'en_curso')])
    expect(B.pedirBorrado(E, '2026-10-27T20:00:00Z', [])).toEqual(a)
    expect(Object.keys(B).filter(k => /cancel|deshacer|restaur|mostrar|retir/i.test(k))).toEqual([])
    aceptarRep01(E, ['otra vez']); expect(B.perfilDisponible(E)).toBe(false)
  })
})

describe('la tarea de borrado', () => {
  it('mientras el alquiler sigue abierto no borra nada (los datos sirven para cerrarlo)', () => {
    const xs = [alq('1', 'mediacion')]; B.pedirBorrado(E, '2026-10-25T20:00:00Z', xs)
    expect(B.ejecutarBorrados(Date.parse('2026-11-30T20:00:00Z'), xs)).toEqual([])
    expect(aceptoRep01(E)).toBe(true); expect(B.solicitudBorrado(E)!.hecho).toBeUndefined()
  })
  it('sin la lista de alquileres no se arriesga: no borra a quien espera un cierre', () => {
    B.pedirBorrado(E, '2026-10-25T20:00:00Z', [alq('1', 'en_curso')])
    expect(B.ejecutarBorrados(Date.parse('2026-11-30T20:00:00Z'))).toEqual([]); expect(aceptoRep01(E)).toBe(true)
  })
  it('cuando se cierra el último alquiler abierto: el plazo de 5 días hábiles corre desde el cierre y se borra', () => {
    const a1 = alq('1', 'en_curso'), a2 = alq('2', 'reclamo'); B.pedirBorrado(E, '2026-10-25T20:00:00Z', [a1, a2])
    expect(B.ejecutarBorrados(Date.parse('2026-11-02T20:00:00Z'), [cerrar(a1, '2026-11-02T18:00:00Z'), a2])).toEqual([])   // falta uno
    const hechos = B.ejecutarBorrados(Date.parse('2026-11-27T16:00:00Z'), [cerrar(a1, '2026-11-02T18:00:00Z'), cerrar(a2, '2026-11-27T15:00:00Z')])
    expect(hechos).toEqual([E]); expect(aceptoRep01(E)).toBe(false)
    const s = B.solicitudBorrado(E)!
    expect(s).toMatchObject({ abierto: true, cierre: '2026-11-27T15:00:00Z', limite: B.fechaLimiteBorrado('2026-11-27T15:00:00Z') }); expect(s.hecho).toBeTruthy()
  })
  it('no toca los alquileres: la otra parte sigue viendo el contrato y el historial', () => {
    const xs = [cerrar(alq('1', 'en_curso'), '2026-11-02T18:00:00Z')]
    localStorage.setItem('lockumi.alquileres.v3', JSON.stringify(xs)); B.pedirBorrado(E, '2026-10-25T20:00:00Z', [])
    B.ejecutarBorrados(Date.parse('2026-10-26T20:00:00Z'), xs)
    expect(JSON.parse(localStorage.getItem('lockumi.alquileres.v3')!)).toEqual(xs)
  })
})
