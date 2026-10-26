import { describe, it, expect } from 'vitest'
import { repartoCentimos } from '../../api/_lib/centimos'
import { TEXTOS } from '../../api/_lib/textos-correos'
import { notaComisionReparto, notaComisionAuto } from '../prueba/dosPersonas'

// montos del texto en diezmilésimos (las partes van con 2 decimales y lo que llega y la comisión con 4)
const cts = (s: string) => [...s.matchAll(/(\d+),(\d{2,4}) USDC/g)].map(m => Number(m[1]) * 1e4 + Number(m[2].padEnd(4, '0')))
describe('repartos: partes con 2 decimales que suman el depósito; lo que llega y la comisión con 4 decimales exactos (Legal 25/10, 6:10 p. m.)', () => {
  it('20 = 5 + 15: llegan 4,9850 + 14,9550 y la comisión es 0,0600', () => {
    expect(repartoCentimos(5, 15)).toEqual({ dueno: 5, inquilino: 15, llegaDueno: 4.985, llegaInquilino: 14.955, comision: 0.06, total: 20 })
    const t = TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 20, dueno: 5, inquilino: 15 })
    expect(t).toContain('Llegan 4,9850 USDC de prueba al dueño y 14,9550 USDC de prueba al inquilino; Trustless Work descuenta 0,0600 USDC de prueba')
  })
  it('la comisión nunca desaparece: 0,50 + 1,50 → 0,4985 + 1,4955 y comisión 0,0060; 1 + 1 → 0,9970 + 0,9970 y 0,0060', () => {
    const a = repartoCentimos(0.5, 1.5), b = repartoCentimos(1, 1)
    expect([a.dueno, a.inquilino, a.llegaDueno, a.llegaInquilino, a.comision]).toEqual([0.5, 1.5, 0.4985, 1.4955, 0.006])
    expect([b.llegaDueno, b.llegaInquilino, b.comision]).toEqual([0.997, 0.997, 0.006])
    expect(a.comision).toBeGreaterThan(0); expect(b.comision).toBeGreaterThan(0)
    for (const [d, i] of [[0.5, 1.5], [1, 1]]) {
      const correo = TEXTOS['COR-C-06/partes'].cuerpo({ deposito: d + i, dueno: d, inquilino: i }) + TEXTOS['COR-C-07/acuerdo'].cuerpo({ deposito: d + i, dueno: d, inquilino: i })
      expect(correo).not.toMatch(/descuenta 0,00 /)
      expect(notaComisionReparto(i, d)).not.toMatch(/\(0,00 /)
    }
    expect(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 2, dueno: 0.5, inquilino: 1.5 })).toContain('Llegan 0,4985 USDC de prueba al dueño y 1,4955 USDC de prueba al inquilino; Trustless Work descuenta 0,0060 USDC de prueba')
    expect(notaComisionReparto(1.5, 0.5)).toContain('Llegaron 1,4955 USDC de prueba al inquilino y 0,4985 USDC de prueba al dueño: la red de prueba de Trustless Work descuenta el 0,3 % (0,0060 USDC de prueba)')
    expect(notaComisionAuto(1)).toContain('Llegaron 0,9970 USDC de prueba: la red de prueba de Trustless Work descuenta el 0,3 % (0,0030 USDC de prueba)')
  })
  it('para muchos repartos, partes y llegadas + comisión suman el depósito en céntimos', () => {
    for (let dep = 1; dep <= 40; dep += 0.37) for (let d = 0; d <= dep; d += 0.113) {
      const D = Math.round(dep * 1e7) / 1e7, x = Math.round(d * 1e7) / 1e7, r = repartoCentimos(x, D - x), T = Math.round(D * 100)
      expect(Math.round(r.dueno * 100) + Math.round(r.inquilino * 100)).toBe(T)
      expect(Math.round(r.llegaDueno * 1e4) + Math.round(r.llegaInquilino * 1e4) + Math.round(r.comision * 1e4)).toBe(T * 100)
      if (T > 0) expect(r.comision).toBeGreaterThan(0)
    }
  })
  it('los textos mostrados suman el depósito (nota de la app, correo y devolución)', () => {
    for (const [d, i] of [[5, 15], [0.335, 1.665], [1.005, 0.995], [7.777, 12.223]]) {
      const T = Math.round((d + i) * 100) * 100
      const n = cts(notaComisionReparto(i, d)); expect(n.reduce((a, b) => a + b, 0)).toBe(T)
      const c = cts(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: d + i, dueno: d, inquilino: i }))
      expect(c[1] + c[2]).toBe(T)          // reparto: dueño + inquilino
      expect(c[3] + c[4] + c[5]).toBe(T)   // llegan + llegan + comisión
      expect(cts(notaComisionAuto(d + i)).reduce((a, b) => a + b, 0)).toBe(T)
    }
  })
})
