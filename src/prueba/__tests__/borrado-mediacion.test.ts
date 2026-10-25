// Paso 16 · Privacidad 1.7-demo: «Lo que se usa para una mediación lo borramos o lo anonimizamos 30 días después de cerrar el caso,
// salvo que una de las partes nos pida guardarlo para un reclamo fuera de la app.»
import { describe, it, expect } from 'vitest'
import fuenteSincronizar from '../sincronizar.ts?raw'
import type { Alquiler, Foto } from '../../types'
import { DIAS_BORRADO, debeBorrarMediacion, borrarMediacion, guardarMediacion, TEXTO_BORRADO } from '../borrado'

const CIERRE = '2026-11-10T16:00:00.000Z'
const DIA = 86_400_000
const f = (src: string): Foto => ({ src, por: 'dueno', fecha: CIERRE })
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'm1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-10-31', reglas: [], duenoEmail: 'd@x', inquilinoEmail: 'i@x',
  estado: 'cerrado', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, terminos: { version: '1.7-demo' },
  reclamo: { monto: 95, motivo: 'Pared manchada', fotos: [f('a.jpg')], fecha: CIERRE, mediacion: { estado: 'pedida', fecha: CIERRE },
    rubros: [{ id: 'r1', ref: -1, cantidad: 1, motivo: 'dano', descripcion: 'Pared de la sala', cuarto: 0, fotos: [f('b.jpg')], factura: { monto: 95, foto: f('c.jpg') } }],
    respuestas: { r1: { acepta: false, soporte: { tipo: 'cotizacion', monto: 40, comercio: 'Ferretería X', foto: f('d.jpg') } } } },
  resultado: { dueno: 60, inquilino: 740, via: 'simulacion', fecha: CIERRE }, ...x })
const t0 = +new Date(CIERRE)

describe('borrado de los datos de la mediación a los 30 días', () => {
  it('son 30 días desde que se cerró el caso (resultado.fecha)', () => {
    expect(DIAS_BORRADO).toBe(30)
    expect(debeBorrarMediacion(alq(), t0 + 30 * DIA - 1)).toBe(false)
    expect(debeBorrarMediacion(alq(), t0 + 30 * DIA)).toBe(true)
  })
  it('solo si el caso está cerrado y la mediación se usó (pedida)', () => {
    const tarde = t0 + 31 * DIA
    expect(debeBorrarMediacion(alq({ estado: 'mediacion' }), tarde)).toBe(false)
    expect(debeBorrarMediacion(alq({ reclamo: { monto: 95, motivo: 'x', fotos: [], fecha: CIERRE } }), tarde)).toBe(false)
    expect(debeBorrarMediacion(alq({ reclamo: { monto: 95, motivo: 'x', fotos: [], fecha: CIERRE, mediacion: { estado: 'no-usar', fecha: CIERRE } } }), tarde)).toBe(false)
    expect(debeBorrarMediacion(alq({ reclamo: { monto: 95, motivo: 'x', fotos: [], fecha: CIERRE, mediacion: { estado: 'sin-cupo', fecha: CIERRE } } }), tarde)).toBe(false)
  })
  it('borra fotos, motivos, descripciones y soportes; conserva montos y resultado; deja registro e historial', () => {
    const x = alq(); borrarMediacion(x, t0 + 30 * DIA)
    const r = x.reclamo!
    expect(r.fotos).toEqual([]); expect(r.motivo).toBe('')
    expect(r.rubros![0].fotos).toEqual([]); expect(r.rubros![0].descripcion).toBe(''); expect(r.rubros![0].factura).toEqual({ monto: 95 })
    expect(r.respuestas!.r1.soporte).toEqual({ tipo: 'cotizacion', monto: 40, comercio: '' })
    expect(r.monto).toBe(95); expect(x.resultado).toEqual({ dueno: 60, inquilino: 740, via: 'simulacion', fecha: CIERRE })
    expect(r.mediacion!.borrado).toBe(new Date(t0 + 30 * DIA).toISOString())
    expect(x.historial.at(-1)!.texto).toBe(TEXTO_BORRADO)
    expect(debeBorrarMediacion(x, t0 + 60 * DIA)).toBe(false)
  })
  it('no borra si una de las partes pidió guardarlo para un reclamo fuera de la app', () => {
    const x = alq(); guardarMediacion(x, 'inquilino', t0 + DIA)
    expect(x.reclamo!.mediacion!.guardar).toEqual({ por: 'inquilino', fecha: new Date(t0 + DIA).toISOString() })
    expect(debeBorrarMediacion(x, t0 + 90 * DIA)).toBe(false)
  })
  it('los alquileres con la 1.6-demo no tienen mediación: no se tocan', () => {
    expect(debeBorrarMediacion(alq({ terminos: { version: '1.6-demo' } }), t0 + 31 * DIA)).toBe(false)
  })
  it('la sincronización de la prueba lo aplica con el reloj de la demo', () => {
    const s = fuenteSincronizar
    expect(s).toMatch(/debeBorrarMediacion\(a, ahoraDe\(a\)\)/); expect(s).toMatch(/borrarMediacion\(x, ahoraDe\(x\)\)/)
  })
})
