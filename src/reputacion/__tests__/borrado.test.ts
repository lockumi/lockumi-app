// Paso 19 · Eliminar la cuenta (decisión de Katherine, 25/10/2026): gratis y completo en un máximo de 5 días hábiles
// (lunes a viernes, sin los feriados de Costa Rica). Al eliminarla, el perfil de reputación desaparece.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { feriadosCR, esDiaHabilCR, fechaLimiteBorrado, pedirBorrado, solicitudBorrado, ejecutarBorrados, perfilDisponible, DIAS_HABILES_BORRADO } from '../borrado'
import { guardarDatos, aceptar, leer, activa } from '../consentimiento'

const E = 'demo@lockumi.com'
beforeEach(() => { const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } }) })

describe('feriados de Costa Rica (Código de Trabajo, art. 148; calendario MTSS 2026)', () => {
  it('2026: los 12 feriados, con Jueves y Viernes Santo según la Pascua', () => {
    expect([...feriadosCR(2026)].sort()).toEqual(['2026-01-01', '2026-04-02', '2026-04-03', '2026-04-11', '2026-05-01', '2026-07-25', '2026-08-02',
      '2026-08-15', '2026-08-31', '2026-09-15', '2026-12-01', '2026-12-25'])
  })
  it('Semana Santa se mueve con la Pascua (2027: 25 y 26 de marzo)', () => {
    expect(feriadosCR(2027).has('2027-03-25')).toBe(true); expect(feriadosCR(2027).has('2027-03-26')).toBe(true)
  })
  it('sábados, domingos y feriados no son hábiles', () => {
    expect(esDiaHabilCR('2026-10-26')).toBe(true)    // lunes
    expect(esDiaHabilCR('2026-10-24')).toBe(false)   // sábado
    expect(esDiaHabilCR('2026-10-25')).toBe(false)   // domingo
    expect(esDiaHabilCR('2026-12-01')).toBe(false)   // martes, feriado
  })
})

describe('plazo: 5 días hábiles, contados desde el día siguiente al pedido (hora de Costa Rica)', () => {
  it('son 5', () => { expect(DIAS_HABILES_BORRADO).toBe(5) })
  it('pedido un domingo: vence el viernes siguiente al final del día', () => {
    expect(fechaLimiteBorrado('2026-10-25T20:00:00Z')).toBe('2026-10-31T05:59:59.999Z')   // viernes 30/10, 23:59:59 CR
  })
  it('un feriado en medio corre el plazo un día', () => {
    expect(fechaLimiteBorrado('2026-11-27T15:00:00Z')).toBe('2026-12-08T05:59:59.999Z')   // vie 27/11 → lun 30, (mar 1 feriado), mié 2, jue 3, vie 4, lun 7
  })
  it('se usa la fecha de Costa Rica: el domingo 11 p. m. CR (lunes 5 a. m. UTC) sigue siendo domingo', () => {
    expect(fechaLimiteBorrado('2026-10-26T05:00:00Z')).toBe('2026-10-31T05:59:59.999Z')
  })
  it('Semana Santa: pedido el lunes 30/3/2026 vence el miércoles 8/4', () => {
    expect(fechaLimiteBorrado('2026-03-30T15:00:00Z')).toBe('2026-04-09T05:59:59.999Z')   // 31, 1, (2 y 3 feriados), 6, 7, 8
  })
})

describe('pedir el borrado (demo en este navegador)', () => {
  it('guarda el pedido con su fecha límite y es gratis (no pide nada más)', () => {
    const s = pedirBorrado(E, '2026-10-25T20:00:00Z')
    expect(s).toEqual({ pedido: '2026-10-25T20:00:00Z', limite: '2026-10-31T05:59:59.999Z' })
    expect(solicitudBorrado(E)).toEqual(s)
  })
  it('desde el pedido, el perfil de reputación ya no se muestra', () => {
    guardarDatos(E, 'Laura V.', 'Escazú'); aceptar(E, 'dueno', 'perfil', ['a', 'b'])
    expect(perfilDisponible(E)).toBe(true)
    pedirBorrado(E, '2026-10-25T20:00:00Z'); expect(perfilDisponible(E)).toBe(false)
  })
  it('el borrado programado elimina los datos de reputación antes del límite y deja constancia', () => {
    guardarDatos(E, 'Laura V.', 'Escazú'); aceptar(E, 'dueno', 'perfil', ['a', 'b'])
    pedirBorrado(E, '2026-10-25T20:00:00Z')
    expect(ejecutarBorrados(Date.parse('2026-10-25T20:30:00Z'))).toEqual([E])
    expect(leer(E).nombre).toBeUndefined(); expect(activa(leer(E), 'dueno', 'perfil')).toBe(false)
    expect(solicitudBorrado(E)?.hecho).toBe('2026-10-25T20:30:00.000Z')
    expect(ejecutarBorrados(Date.parse('2026-10-26T20:30:00Z'))).toEqual([])   // no se repite
  })
  it('un segundo pedido no corre el plazo', () => {
    pedirBorrado(E, '2026-10-25T20:00:00Z'); expect(pedirBorrado(E, '2026-10-28T20:00:00Z').limite).toBe('2026-10-31T05:59:59.999Z')
  })
})
