// Paso 19 · Puntaje de reputación (sección C.3 de legal/reputacion-textos.md) como funciones puras. Escritas ANTES del código (TDD).
import { describe, it, expect } from 'vitest'
import type { Alquiler, Resultado } from '../../types'
import { cuentaParaPuntaje, fraccionDescontada, valorDelAlquiler, calcularPuntaje, formatoPuntaje, lineaPublica, insignias, tieneLlave,
  zonaVitrina, ordenarVitrina, MINIMO_PARA_PUNTAJE, MINIMO_POR_CANTON } from '../puntaje'

const DIA = 86_400_000, AHORA = Date.parse('2026-11-16T16:00:00Z')
const hace = (d: number) => new Date(AHORA - d * DIA).toISOString()
const acta = (fotos: boolean) => ({ firmas: {}, cuartos: [{ nombre: 'Sala', nota: '', items: [], fotos: fotos ? [{ src: 'x', por: 'dueno' as const, fecha: hace(1) }] : [] }] })
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'a' + Math.random(), direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
  duenoEmail: 'd@x.cr', inquilinoEmail: 'i@x.cr', estado: 'cerrado', rendimiento: false, historial: [], contrato: { firmas: { dueno: hace(300), inquilino: hace(300) } },
  entrada: acta(true), salida: acta(true), pago: hace(299), diasSimulados: 0, resultado: { inquilino: 800, dueno: 0, via: 'automatico', fecha: hace(10) }, ...x })
const res = (dueno: number, inquilino: number, via: Resultado['via'], d = 10): Resultado => ({ dueno, inquilino, via, fecha: hace(d) })

describe('qué alquileres cuentan (C.3)', () => {
  it('solo los cerrados en la app', () => {
    expect(cuentaParaPuntaje(alq())).toBe(true)
    for (const estado of ['firmas', 'pendiente_pago', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion'] as const)
      expect(cuentaParaPuntaje(alq({ estado, resultado: undefined }))).toBe(false)
  })
  it('las simulaciones y las mediaciones simuladas no cuentan', () => {
    expect(cuentaParaPuntaje(alq({ resultado: res(300, 500, 'simulacion') }))).toBe(false)
  })
})

describe('solo un reclamo que terminó con descuento del depósito baja el puntaje', () => {
  it('sin reclamo o reclamo cerrado sin descontar nada: no hay descuento', () => {
    expect(fraccionDescontada(alq())).toBe(0)
    expect(fraccionDescontada(alq({ resultado: res(0, 800, 'devuelto') }))).toBe(0)
    expect(fraccionDescontada(alq({ resultado: res(0, 800, 'acuerdo') }))).toBe(0)
  })
  it('descuento aceptado por el inquilino, por la Regla (6.5.1) o por acuerdo en la mediación: en proporción a lo descontado', () => {
    expect(fraccionDescontada(alq({ resultado: res(160, 640, 'acuerdo') }))).toBeCloseTo(0.2)
    expect(fraccionDescontada(alq({ resultado: res(400, 400, 'propuesta') }))).toBeCloseTo(0.5)
    expect(fraccionDescontada(alq({ resultado: res(800, 0, 'mediacion') }))).toBeCloseTo(1)
  })
  it('con la comisión de la red los montos no suman el depósito: igual se usa la proporción', () => {
    expect(fraccionDescontada(alq({ resultado: res(159.52, 638.08, 'acuerdo') }))).toBeCloseTo(0.2)
  })
  it('ejemplo de C.3: si se descontó el 20 %, ese alquiler vale 4,0 para el inquilino', () => {
    expect(valorDelAlquiler(alq({ resultado: res(160, 640, 'acuerdo') }), 'inquilino')).toBeCloseTo(4)
  })
  it('el descuento lo paga el inquilino: al dueño no le baja', () => {
    expect(valorDelAlquiler(alq({ resultado: res(160, 640, 'acuerdo') }), 'dueno')).toBe(5)
  })
  it('cada alquiler cerrado sin descuento vale 5,0', () => {
    expect(valorDelAlquiler(alq(), 'inquilino')).toBe(5); expect(valorDelAlquiler(alq(), 'dueno')).toBe(5)
  })
})

describe('calcularPuntaje', () => {
  it('todos empiezan con 5,0 y no se muestra hasta el 3.er alquiler cerrado', () => {
    expect(MINIMO_PARA_PUNTAJE).toBe(3)
    expect(calcularPuntaje([], 'inquilino')).toEqual({ cerrados: 0, valor: null, enRevision: false })
    expect(calcularPuntaje([alq(), alq()], 'inquilino')).toEqual({ cerrados: 2, valor: null, enRevision: false })
    expect(calcularPuntaje([alq(), alq(), alq()], 'inquilino')).toEqual({ cerrados: 3, valor: 5, enRevision: false })
  })
  it('es el promedio de los alquileres cerrados, con un decimal', () => {
    const p = calcularPuntaje([alq(), alq(), alq({ resultado: res(160, 640, 'acuerdo') })], 'inquilino')
    expect(p.valor).toBe(4.7)   // (5 + 5 + 4) / 3 = 4,666…
  })
  it('los reclamos abiertos no cuentan, pero el puntaje público dice «En revisión»', () => {
    const p = calcularPuntaje([alq(), alq(), alq(), alq({ estado: 'reclamo', resultado: undefined })], 'inquilino')
    expect(p).toEqual({ cerrados: 3, valor: 5, enRevision: true })
    expect(calcularPuntaje([alq(), alq(), alq(), alq({ estado: 'mediacion', resultado: undefined })], 'dueno').enRevision).toBe(true)
  })
  it('las simulaciones no suman alquileres cerrados', () => {
    expect(calcularPuntaje([alq(), alq(), alq({ resultado: res(800, 0, 'simulacion') })], 'inquilino')).toEqual({ cerrados: 2, valor: null, enRevision: false })
  })
  it('el puntaje va de 0 a 5', () => {
    const p = calcularPuntaje([1, 2, 3].map(() => alq({ resultado: res(800, 0, 'mediacion') })), 'inquilino')
    expect(p.valor).toBe(0)
  })
  it('no depende de cuándo se cerró el alquiler (no hay otro plazo de conservación)', () => {
    expect(calcularPuntaje([alq({ resultado: res(0, 800, 'automatico', 3000) }), alq(), alq()], 'dueno').cerrados).toBe(3)
  })
})

describe('lo que se muestra en público (sin frases negativas)', () => {
  it('formato con coma decimal', () => { expect(formatoPuntaje(4.8)).toBe('4,8'); expect(formatoPuntaje(5)).toBe('5,0') })
  it('antes de 3 alquileres: «Nuevo en Lockumi», en singular o plural', () => {
    expect(lineaPublica({ cerrados: 0, valor: null, enRevision: false }, true)).toBe('Nuevo en Lockumi · 0 alquileres cerrados')
    expect(lineaPublica({ cerrados: 1, valor: null, enRevision: false }, true)).toBe('Nuevo en Lockumi · 1 alquiler cerrado')
  })
  it('con un reclamo abierto: «En revisión»', () => { expect(lineaPublica({ cerrados: 5, valor: 4.9, enRevision: true }, true)).toBe('En revisión') })
  it('un puntaje menor a 3,0 se ve igual que quien eligió no mostrar su puntaje', () => {
    const bajo = lineaPublica({ cerrados: 7, valor: 2.4, enRevision: false }, true), oculto = lineaPublica({ cerrados: 7, valor: 4.9, enRevision: false }, false)
    expect(bajo).toBe('7 alquileres cerrados en Lockumi'); expect(oculto).toBe(bajo)
  })
  it('D1 y D6 de Legal: la línea sin puntaje dice «{t} alquileres cerrados en Lockumi»', () => {
    expect(lineaPublica({ cerrados: 14, valor: 4.8, enRevision: false }, false)).toBe('14 alquileres cerrados en Lockumi')
  })
  it('con 3 o más y «Mostrar mi puntaje»: el puntaje', () => { expect(lineaPublica({ cerrados: 4, valor: 4.8, enRevision: false }, true)).toBe('4,8 de 5') })
})

describe('insignias (C.7): solo positivas', () => {
  it('dueño con todo completo', () => {
    expect(insignias([alq()], 'dueno')).toEqual(['contrato', 'deposito', 'fotos-entrada', 'fotos-salida', 'devolvio'])
  })
  it('inquilino con todo completo', () => {
    expect(insignias([alq()], 'inquilino')).toEqual(['contrato', 'deposito', 'fotos-entrada', 'fotos-salida', 'recibio'])
  })
  it('sin hechos no hay insignias (nunca grises ni negativas)', () => {
    expect(insignias([alq({ estado: 'firmas', contrato: { firmas: {} }, pago: undefined, entrada: acta(false), salida: undefined, resultado: undefined })], 'dueno')).toEqual([])
  })
  it('un descuento no da «Devolvió el depósito completo», pero tampoco agrega nada negativo', () => {
    expect(insignias([alq({ resultado: res(100, 700, 'acuerdo') })], 'dueno')).toEqual(['contrato', 'deposito', 'fotos-entrada', 'fotos-salida'])
  })
})

describe('Llave Lockumi (C.7)', () => {
  const diez = () => Array.from({ length: 10 }, () => alq())
  it('10 o más alquileres cerrados, puntaje de 4,8 o más, ningún descuento en 12 meses y fotos completas', () => {
    expect(tieneLlave(diez(), 'inquilino', AHORA)).toBe(true)
    expect(tieneLlave(diez().slice(1), 'inquilino', AHORA)).toBe(false)
  })
  it('un descuento en los últimos 12 meses la quita', () => {
    expect(tieneLlave([...diez(), alq({ resultado: res(8, 792, 'acuerdo', 100) })], 'inquilino', AHORA)).toBe(false)
  })
  it('un descuento de hace más de 12 meses no la quita si el puntaje sigue en 4,8 o más', () => {
    expect(tieneLlave([...diez(), alq({ resultado: res(8, 792, 'acuerdo', 400) })], 'inquilino', AHORA)).toBe(true)
  })
  it('faltan fotos de salida en un alquiler: no hay Llave', () => {
    expect(tieneLlave([...diez(), alq({ salida: acta(false) })], 'dueno', AHORA)).toBe(false)
  })
})

describe('vitrina: solo el cantón, sin ranking', () => {
  it('cantón con 10 o más personas; si no, la provincia', () => {
    expect(MINIMO_POR_CANTON).toBe(10)
    expect(zonaVitrina('Escazú', 'San José', 10)).toBe('Escazú')
    expect(zonaVitrina('Escazú', 'San José', 9)).toBe('San José (provincia)')
  })
  type T = { nombre: string; canton: string; precio: number; cerrados: number; valor: number | null }
  const t = (nombre: string, canton: string, precio: number, cerrados: number, valor: number | null = null): T => ({ nombre, canton, precio, cerrados, valor })
  it('ordena por cantón y precio; el puntaje no cambia el orden', () => {
    const a = [t('A', 'Escazú', 500, 5, 3.1), t('B', 'Escazú', 300, 5, 5), t('C', 'Alajuela', 900, 5, 4)]
    const b = a.map(x => ({ ...x, valor: x.valor === 5 ? 3.1 : 5 }))
    expect(ordenarVitrina(a).map(x => x.nombre)).toEqual(['C', 'B', 'A'])
    expect(ordenarVitrina(b).map(x => x.nombre)).toEqual(['C', 'B', 'A'])
  })
  it('una de cada tres tarjetas es un Espacio para nuevos (posiciones 3, 6…)', () => {
    const d = [1, 2, 3, 4].map(i => t('D' + i, 'Escazú', i * 100, 5)), n = [1, 2].map(i => t('N' + i, 'Escazú', i * 100, i - 1))
    expect(ordenarVitrina([...n, ...d]).map(x => x.nombre)).toEqual(['D1', 'D2', 'N1', 'D3', 'D4', 'N2'])
  })
  it('si no hay nuevos, los destacados siguen en su orden', () => {
    expect(ordenarVitrina([t('B', 'Escazú', 2, 3), t('A', 'Escazú', 1, 3)]).map(x => x.nombre)).toEqual(['A', 'B'])
  })
})

describe('tope de la ley (Ley 8968, art. 6.1; sección E, medida a): un descuento deja de contar 10 años después', () => {
  const viejo = (d: number) => alq({ resultado: res(800, 0, 'mediacion', d) })
  it('un descuento de hace menos de 10 años cuenta', () => {
    expect(calcularPuntaje([viejo(365 * 9), alq(), alq()], 'inquilino', AHORA).valor).toBeCloseTo(3.3)
  })
  it('un descuento de hace más de 10 años ya no baja el puntaje (el alquiler vale 5,0)', () => {
    expect(calcularPuntaje([viejo(3653 + 1), alq(), alq()], 'inquilino', AHORA).valor).toBe(5)
    expect(valorDelAlquiler(viejo(3653 + 1), 'inquilino', AHORA)).toBe(5)
  })
  it('no hay ningún otro plazo: un alquiler sin descuento de hace 12 años sigue contando', () => {
    expect(calcularPuntaje([alq({ resultado: res(0, 800, 'automatico', 365 * 12) }), alq(), alq()], 'dueno', AHORA).cerrados).toBe(3)
  })
})
