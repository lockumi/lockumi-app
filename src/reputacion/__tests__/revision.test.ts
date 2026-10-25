// Paso 19 · REP-11 (Corregir o pedir revisión) y regla 7 («En revisión»): acuse al instante con fecha y hora, el alquiler deja de contar
// y el puntaje público dice «En revisión»; respuesta en un máximo de 5 días hábiles.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pedirRevision, revisiones, enRevisionIds, validarRevision, NOTA_MAX } from '../revision'
import { calcularPuntaje, lineaPublica } from '../puntaje'
import type { Alquiler } from '../../types'

const E = 'demo@lockumi.com', F = '2026-10-26T15:30:00.000Z'
beforeEach(() => { const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k) }) })
const alq = (id: string, inquilino: number, dueno: number) => ({ id, monto: 20, estado: 'cerrado', resultado: { inquilino, dueno, via: 'acuerdo', fecha: '2026-06-30T18:00:00Z' } }) as unknown as Alquiler

describe('pedir revisión', () => {
  it('acuse al instante con fecha, hora y fecha límite de respuesta (5 días hábiles)', () => {
    const r = pedirRevision(E, { alquilerId: 'a2', rol: 'inquilino', texto: 'El descuento no corresponde.' }, F)
    expect(r.fecha).toBe(F); expect(r.hora).toBe('09:30'); expect(r.limite).toBe('2026-11-03T05:59:59.999Z')
    expect(revisiones(E)).toHaveLength(1); expect([...enRevisionIds(E, 'inquilino')]).toEqual(['a2']); expect([...enRevisionIds(E, 'dueno')]).toEqual([])
  })
  it('mientras se revisa, ese alquiler no cuenta y el puntaje público dice «En revisión»', () => {
    const xs = [alq('a1', 20, 0), alq('a2', 10, 10), alq('a3', 20, 0), alq('a4', 20, 0)]
    expect(lineaPublica(calcularPuntaje(xs, 'inquilino', Date.parse(F)))).toBe('4,4 de 5')
    const p = calcularPuntaje(xs, 'inquilino', Date.parse(F), new Set(['a2']))
    expect(p.enRevision).toBe(true); expect(p.cerrados).toBe(3); expect(p.valor).toBe(5); expect(lineaPublica(p)).toBe('En revisión')
  })
  it('cada error dice cómo arreglarlo; la nota de respuesta tiene hasta 300 caracteres', () => {
    expect(NOTA_MAX).toBe(300)
    expect(validarRevision({ alquilerId: '', texto: 'x' })).toMatch(/Elige el alquiler/)
    expect(validarRevision({ alquilerId: 'a1', texto: ' ' })).toMatch(/Explica qué está mal/)
    expect(validarRevision({ alquilerId: 'a1', texto: 'x', nota: 'n'.repeat(301) })).toMatch(/300 caracteres/)
    expect(validarRevision({ alquilerId: 'a1', texto: 'x', nota: 'n'.repeat(300) })).toBeNull()
  })
})
