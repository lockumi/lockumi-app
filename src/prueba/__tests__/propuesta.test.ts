import { describe, it, expect } from 'vitest'
import { calcular, propuesta, pruebasCompletas, reglaAplica, totalReclamado, primeraApertura, MOTIVOS } from '../propuesta'
import { PRECIOS, COLONES_POR_USDC } from '../../../api/_lib/precios'
import { actaVacia } from '../../store'
import type { Alquiler, Rubro } from '../../types'

const foto = { src: 'data:image/png;base64,AA', por: 'dueno' as const, fecha: '2027-11-01T10:00:00Z', origen: 'camara' as const }
function alquiler(monto = 20, x: Partial<Alquiler> = {}): Alquiler {
  const entrada = actaVacia(); entrada.cuartos.forEach(c => c.fotos.push(foto)); entrada.firmas = { dueno: 'x', inquilino: 'y' }
  return { id: 'a1', direccion: 'Ejemplo', monto, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-11-01', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
    estado: 'reclamo', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada, diasSimulados: 0, ...x }
}
const iPomo = PRECIOS.findIndex(p => p.rubro.startsWith('Pomo')), iLimpieza = PRECIOS.findIndex(p => p.rubro.startsWith('Limpieza profunda de vivienda'))
const rubro = (x: Partial<Rubro> = {}): Rubro => ({ id: 'r1', ref: iPomo, cantidad: 1, motivo: 'dano', descripcion: 'Pomo del dormitorio quebrado', cuarto: 2, fotos: [foto], ...x })

describe('propuesta automática (simulación)', () => {
  it('la tabla no usa filas sin fuente y tiene vida útil simulada', () => {
    expect(PRECIOS.every(p => p.fuente && p.url.startsWith('https://') && p.colones > 0)).toBe(true)
    expect(PRECIOS.some(p => /Vidrio|Copia de llave|Instalación de piso/.test(p.rubro))).toBe(false)
    expect(Object.keys(MOTIVOS)).toHaveLength(6)
  })
  it('usa el menor entre la factura y la referencia + 25 %, menos la depreciación', () => {
    const ref = Math.round(PRECIOS[iPomo].colones / COLONES_POR_USDC * 100) / 100
    const c = calcular(alquiler(), rubro({ factura: { monto: 100 } }))
    expect(c.referencia).toBe(ref); expect(c.tope).toBe(Math.round(ref * 1.25 * 100) / 100)
    expect(c.base).toBe(c.tope)   // la factura supera el tope
    expect(c.depreciacion).toBeCloseTo(1 / 10, 2)   // 1 año sobre 10 de vida útil
    expect(c.reclamado).toBeCloseTo(c.tope! * (1 - c.depreciacion), 1)
    expect(c.razones.join(' ')).toMatch(/más un 25 %/)
  })
  it('servicio sin depreciación; la cotización menor del inquilino lleva al punto medio', () => {
    const r = rubro({ ref: iLimpieza, cantidad: 0.02 })
    const c = calcular(alquiler(), r)
    expect(c.depreciacion).toBe(0)
    const p = propuesta(alquiler(), [r], { r1: { acepta: false, soporte: { tipo: 'cotizacion', monto: 2, comercio: 'Limpiezas S.A.' } } })
    expect(p.filas[0].propuesto).toBe(Math.round((2 + c.reclamado) / 2 * 100) / 100)
  })
  it('nunca pasa el depósito (6.6)', () => { expect(totalReclamado(alquiler(5), [rubro({ cantidad: 10 })])).toBe(5) })
  it('pruebas completas (6.4.1): avisa qué falta', () => {
    expect(pruebasCompletas(alquiler(), rubro())).toEqual([])
    expect(pruebasCompletas(alquiler(), rubro({ fotos: [], ref: -1, descripcion: 'corto' }))).toEqual(['foto de salida', 'factura o precio de referencia', 'descripción'])
  })
})

describe('Regla de propuesta automática (6.5.1)', () => {
  const regla = { cuenta: 'demo@lockumi.com', alquiler: 'a1', version: '1.7-demo', acepta: true, fecha: '2027-01-01T00:00:00Z' }
  const abierto = [{ id: 'reclamo-1', para: 'inquilino' as const, dia: 1, asunto: '', texto: '', entregado: 'x', entregadoReal: 'x', abierto: '2027-11-02T10:00:00Z' }]
  const base = (x: Partial<Alquiler>) => alquiler(100, { regla, avisos: abierto, reclamo: { monto: 1, motivo: '', fotos: [], fecha: 'x', rubros: [rubro()] }, ...x })
  it('se aplica con regla, pruebas completas, ≤ 30 % y un aviso abierto', () => { expect(reglaAplica(base({}))).toEqual({ aplica: true, motivo: '' }) })
  it('sin la regla no se aplica', () => { expect(reglaAplica(base({ regla: { ...regla, acepta: false } })).aplica).toBe(false) })
  it('caso (b): más del 30 % del depósito pasa a mediación', () => {
    const r = reglaAplica(base({ reclamo: { monto: 9, motivo: '', fotos: [], fecha: 'x', rubros: [rubro({ cantidad: 3 })] } }))
    expect(r).toEqual({ aplica: false, motivo: 'El total supera el 30 % del depósito.' })
  })
  it('caso (c): si no abrió ningún aviso ni la pantalla del reclamo, pasa a mediación', () => {
    expect(reglaAplica(base({ avisos: [{ ...abierto[0], abierto: undefined }] }))).toEqual({ aplica: false, motivo: 'El inquilino no abrió ningún aviso del reclamo.' })
  })
  it('cuenta la apertura por correo o de la pantalla del reclamo, y devuelve la primera', () => {
    expect(primeraApertura({ avisos: [{ ...abierto[0], abierto: undefined, abiertoCorreo: '2027-11-03T00:00:00Z' }] })).toBe('2027-11-03T00:00:00Z')
    expect(primeraApertura({ avisos: [], reclamo: { monto: 1, motivo: '', fotos: [], fecha: 'x', pantallaAbierta: '2027-11-04T00:00:00Z' } })).toBe('2027-11-04T00:00:00Z')
    expect(primeraApertura({ avisos: [{ ...abierto[0], id: 'dueno-1', para: 'dueno' }] })).toBeNull()
  })
  it('sin pruebas completas no se aplica', () => { expect(reglaAplica(base({ reclamo: { monto: 1, motivo: '', fotos: [], fecha: 'x', rubros: [rubro({ fotos: [] })] } })).aplica).toBe(false) })
})
