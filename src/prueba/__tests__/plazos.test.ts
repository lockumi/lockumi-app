import { describe, it, expect } from 'vitest'
import { pascua, feriados, vencimiento, sumarHabiles, fechaHoraCR, diaCR, DIA_MS } from '../../../api/_lib/plazos'

const cr = (s: string) => +new Date(s + '-06:00')
describe('plazos (hora de Costa Rica, feriados del art. 148)', () => {
  it('Semana Santa 2026 coincide con el calendario del MTSS (2 y 3 de abril)', () => {
    expect(pascua(2026)).toEqual([4, 5])
    const f = feriados(2026)
    expect(f['2026-04-02']).toBe('Jueves Santo'); expect(f['2026-04-03']).toBe('Viernes Santo')
    expect(Object.keys(f)).toHaveLength(12)
    for (const d of ['2026-01-01', '2026-04-11', '2026-05-01', '2026-07-25', '2026-08-02', '2026-08-15', '2026-08-31', '2026-09-15', '2026-12-01', '2026-12-25']) expect(f[d]).toBeTruthy()
    expect(f['2026-10-12']).toBeUndefined()   // 12 de octubre ya no es feriado
  })
  it('caso (a): el día 7 cae en domingo y pasa al lunes', () => {
    const v = vencimiento(cr('2026-11-01T10:00:00'), 7 * DIA_MS)
    expect(diaCR(cr('2026-11-08T10:00:00')).semana).toBe(0)
    expect(v.movido).toBe('domingo'); expect(fechaHoraCR(v.fin)).toBe('9 nov 2026, 10:00')
  })
  it('caso (a): el día 7 cae en feriado (1 de diciembre) y pasa al siguiente día hábil', () => {
    const v = vencimiento(cr('2026-11-24T09:30:00'), 7 * DIA_MS)
    expect(v.movido).toBe('feriado'); expect(v.feriado).toBe('Abolición del Ejército'); expect(fechaHoraCR(v.fin)).toBe('2 dic 2026, 09:30')
  })
  it('feriado en sábado seguido de domingo: pasa al lunes', () => {
    const v = vencimiento(cr('2027-12-18T08:00:00'), 7 * DIA_MS)
    expect(v.movido).toBe('feriado'); expect(fechaHoraCR(v.fin)).toBe('27 dic 2027, 08:00')
  })
  it('día normal: no se mueve; plazos cortos de prueba no se mueven', () => {
    expect(vencimiento(cr('2026-11-02T10:00:00'), 7 * DIA_MS)).toEqual({ fin: cr('2026-11-09T10:00:00'), movido: null })
    expect(vencimiento(cr('2026-11-01T10:00:00'), 300_000).movido).toBeNull()
  })
  it('la hora de Costa Rica no depende de la zona del aparato (23:30 CR sigue siendo el mismo día)', () => {
    expect(diaCR(cr('2026-11-07T23:30:00'))).toEqual({ fecha: '2026-11-07', semana: 6 })
  })
  it('3 días hábiles de la mediación: sin fines de semana ni feriados', () => {
    expect(fechaHoraCR(sumarHabiles(cr('2026-11-27T10:00:00'), 3))).toBe('3 dic 2026, 10:00')   // vie → lun, (mar 1 dic feriado), mié, jue
    expect(fechaHoraCR(sumarHabiles(cr('2026-11-02T10:00:00'), 3))).toBe('5 nov 2026, 10:00')
  })
})
