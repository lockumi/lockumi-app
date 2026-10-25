import { describe, it, expect } from 'vitest'
import { repartoCentimos } from '../../api/_lib/centimos'
import { TEXTOS } from '../../api/_lib/textos-correos'
import { notaComisionReparto, notaComisionAuto } from '../prueba/dosPersonas'

const cts = (s: string) => [...s.matchAll(/(\d+),(\d{2}) USDC/g)].map(m => Number(m[1]) * 100 + Number(m[2]))
describe('repartos con 2 decimales que suman exactamente (Coordinador 25/10, 5:39 p. m.)', () => {
  it('20 = 5 + 15: llegan 4,99 + 14,96 y la comisión es 0,05 (antes 0,06 y sumaba 20,01)', () => {
    expect(repartoCentimos(5, 15)).toEqual({ dueno: 5, inquilino: 15, llegaDueno: 4.99, llegaInquilino: 14.96, comision: 0.05, total: 20 })
    const t = TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 20, dueno: 5, inquilino: 15 })
    expect(t).toContain('Llegan 4,99 USDC de prueba al dueño y 14,96 USDC de prueba al inquilino; Trustless Work descuenta 0,05 USDC de prueba')
  })
  it('para muchos repartos, partes y llegadas + comisión suman el depósito en céntimos', () => {
    for (let dep = 1; dep <= 40; dep += 0.37) for (let d = 0; d <= dep; d += 0.113) {
      const D = Math.round(dep * 1e7) / 1e7, x = Math.round(d * 1e7) / 1e7, r = repartoCentimos(x, D - x), T = Math.round(D * 100)
      expect(Math.round(r.dueno * 100) + Math.round(r.inquilino * 100)).toBe(T)
      expect(Math.round(r.llegaDueno * 100) + Math.round(r.llegaInquilino * 100) + Math.round(r.comision * 100)).toBe(T)
      expect(r.comision).toBeGreaterThanOrEqual(0)
    }
  })
  it('los textos mostrados suman el depósito (nota de la app, correo y devolución)', () => {
    for (const [d, i] of [[5, 15], [0.335, 1.665], [1.005, 0.995], [7.777, 12.223]]) {
      const T = Math.round((d + i) * 100)
      const n = cts(notaComisionReparto(i, d)); expect(n.reduce((a, b) => a + b, 0)).toBe(T)
      const c = cts(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: d + i, dueno: d, inquilino: i }))
      expect(c[1] + c[2]).toBe(T)          // reparto: dueño + inquilino
      expect(c[3] + c[4] + c[5]).toBe(T)   // llegan + llegan + comisión
      expect(cts(notaComisionAuto(d + i)).reduce((a, b) => a + b, 0)).toBe(T)
    }
  })
})
