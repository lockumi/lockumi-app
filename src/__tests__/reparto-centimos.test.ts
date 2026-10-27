import { describe, it, expect } from 'vitest'
import { repartoCentimos, netoTrustless, netoTW, exacto, COMISION_TW_BPS, COMISION_PLATAFORMA_BPS } from '../../api/_lib/centimos'
import { TEXTOS, llega } from '../../api/_lib/textos-correos'
import { notaComisionReparto, notaComisionAuto, recibeInquilino } from '../prueba/dosPersonas'

// Katherine 27/10/2026, 1:05 p. m. CR: lo que llega, exacto y menos la comisión real de Trustless Work (sin redondear, sin ceros de más).
// montos del texto en stroops (7 decimales)
const st = (s: string) => [...s.matchAll(/(\d+),(\d{2,7}) USDC/g)].map(m => Number(m[1]) * 1e7 + Number(m[2].padEnd(7, '0')))
describe('comisión real de Trustless Work (contrato: 30 bps sobre 10000, en stroops; plataforma Lockumi = 0)', () => {
  it('constantes del contrato y de Lockumi', () => { expect(COMISION_TW_BPS).toBe(30); expect(COMISION_PLATAFORMA_BPS).toBe(0) })
  it('liberación real de testnet 49fb34d0…: 2 → llegan 1,994 y comisión 0,006', () => {
    expect(netoTrustless(2)).toEqual({ llegan: [1.994], comision: 0.006 }); expect(netoTW(1)).toBe(0.997)
  })
  it('resolve_dispute real cd92c786…: 26,32 + 3,68 → 26,24104 + 3,66896 y comisión 0,09 (eeca5f43…: 16,32 + 3,68 → 16,27104 + 3,66896 + 0,06)', () => {
    expect(netoTrustless(26.32, 3.68)).toEqual({ llegan: [26.24104, 3.66896], comision: 0.09 })
    expect(netoTrustless(16.32, 3.68)).toEqual({ llegan: [16.27104, 3.66896], comision: 0.06 })
  })
  it('reparto real de b10557f9 (tx 54b8a02d…9385, 27/10/2026 13:20 CR): 4 + 6 → 3,988 + 5,982 y 0,03 a la cuenta de Trustless Work (GA6KH5VW…)', () => {
    expect(netoTrustless(4, 6)).toEqual({ llegan: [3.988, 5.982], comision: 0.03 })
    expect(repartoCentimos(4, 6)).toMatchObject({ llegaDueno: 3.988, llegaInquilino: 5.982, comision: 0.03 })
  })
  it('redondea como el contrato (piso en stroops), nunca hacia arriba; 0 → 0', () => {
    expect(netoTW(0.0000333)).toBe(0.0000333)            // 333 stroops × 30 / 10000 = 0,999 → 0 de comisión
    expect(netoTW(0.0001)).toBe(0.0000997)
    expect(netoTrustless(0, 5)).toEqual({ llegan: [0, 4.985], comision: 0.015 })
    expect(netoTrustless(0)).toEqual({ llegan: [0], comision: 0 })
  })
  it('exacto: coma decimal, mínimo 2 decimales, sin ceros de más ni redondeo a 2', () => {
    expect(exacto(0.997)).toBe('0,997'); expect(exacto(1)).toBe('1,00'); expect(exacto(1.994)).toBe('1,994'); expect(exacto(0.4985)).toBe('0,4985')
    expect(exacto(26.24104)).toBe('26,24104'); expect(exacto(797.6)).toBe('797,60'); expect(exacto(0.0000997)).toBe('0,0000997')
  })
  it('una sola función: correos, notas y la devolución dan lo mismo', () => {
    for (const m of [1, 2, 0.33, 7.77, 800]) { expect(llega(m)).toBe(netoTW(m)); expect(recibeInquilino(m)).toBe(netoTW(m)) }
  })
})

describe('repartos: partes con 2 decimales que suman el depósito; lo que llega y la comisión, exactos', () => {
  it('20 = 5 + 15: llegan 4,985 + 14,955 y la comisión es 0,06', () => {
    expect(repartoCentimos(5, 15)).toEqual({ dueno: 5, inquilino: 15, llegaDueno: 4.985, llegaInquilino: 14.955, comision: 0.06, total: 20 })
    const t = TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 20, dueno: 5, inquilino: 15 })
    expect(t).toContain('Reparto acordado: 5,00 USDC de prueba al dueño y 15,00 USDC de prueba al inquilino. Trustless Work descuenta el 0,3 % de cada monto (0,06 USDC de prueba en total), así que llegan 4,985 USDC de prueba al dueño y 14,955 USDC de prueba al inquilino. Lockumi no recibe nada.')
  })
  it('la comisión nunca desaparece: 0,50 + 1,50 → 0,4985 + 1,4955 y 0,006; 0,33 + 0,67 → 0,32901 + 0,66799 y 0,003', () => {
    const a = repartoCentimos(0.5, 1.5), b = repartoCentimos(0.33, 0.67)
    expect([a.dueno, a.inquilino, a.llegaDueno, a.llegaInquilino, a.comision]).toEqual([0.5, 1.5, 0.4985, 1.4955, 0.006])
    expect([b.llegaDueno, b.llegaInquilino, b.comision]).toEqual([0.32901, 0.66799, 0.003])
    expect(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 2, dueno: 0.5, inquilino: 1.5 })).toContain('Reparto acordado: 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino. Trustless Work descuenta el 0,3 % de cada monto (0,006 USDC de prueba en total), así que llegan 0,4985 USDC de prueba al dueño y 1,4955 USDC de prueba al inquilino. Lockumi no recibe nada.')
    expect(notaComisionReparto(1.5, 0.5)).toContain('Llegaron 1,4955 USDC de prueba al inquilino y 0,4985 USDC de prueba al dueño: la red de prueba de Trustless Work descuenta el 0,3 % (0,006 USDC de prueba)')
    expect(notaComisionAuto(1)).toContain('Llegaron 0,997 USDC de prueba: la red de prueba de Trustless Work descuenta el 0,3 % (0,003 USDC de prueba)')
    expect(TEXTOS['COR-C-07/devuelto'].cuerpo({ deposito: 1 })).toContain('llegan 0,997 USDC de prueba')
  })
  it('para muchos repartos: partes suman el depósito en céntimos y llegadas + comisión suman el depósito en stroops', () => {
    for (let dep = 1; dep <= 40; dep += 0.37) for (let d = 0; d <= dep; d += 0.113) {
      const D = Math.round(dep * 1e7) / 1e7, x = Math.round(d * 1e7) / 1e7, r = repartoCentimos(x, D - x), T = Math.round(D * 100)
      expect(Math.round(r.dueno * 100) + Math.round(r.inquilino * 100)).toBe(T)
      expect(Math.round(r.llegaDueno * 1e7) + Math.round(r.llegaInquilino * 1e7) + Math.round(r.comision * 1e7)).toBe(T * 1e5)
      if (T > 0) expect(r.comision).toBeGreaterThan(0)
    }
  })
  it('los textos mostrados suman el depósito (nota de la app, correo y devolución), sin redondear', () => {
    for (const [d, i] of [[5, 15], [0.335, 1.665], [1.005, 0.995], [7.777, 12.223]]) {
      const T = Math.round((d + i) * 100) * 1e5
      expect(st(notaComisionReparto(i, d)).reduce((a, b) => a + b, 0)).toBe(T)
      const c = st(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: d + i, dueno: d, inquilino: i }))
      expect(c[1] + c[2]).toBe(T)          // reparto: dueño + inquilino
      expect(c[3] + c[4] + c[5]).toBe(T)   // llegan + llegan + comisión
      expect(st(notaComisionAuto(d + i)).reduce((a, b) => a + b, 0)).toBe(T)
    }
  })
})
