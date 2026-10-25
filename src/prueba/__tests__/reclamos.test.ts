// PR 5 (paso 9) · reclamo por rubros, respuesta del inquilino, propuesta automática simulada (B.6) y regla del silencio (6.5 c, 6.5.1, B.10).
import { describe, it, expect } from 'vitest'
import type { Alquiler, Rubro } from '../../types'
import { nuevoReclamo, abrirReclamo, responderRubros, votarPropuesta, silencio, textoSeAplico } from '../reclamos'
import { sincronizar } from '../dueno'
import { plazoInquilino } from '../avisos'
import { propuesta } from '../propuesta'

const T0 = +new Date('2026-11-02T16:00:00Z')   // lunes 2 nov 2026, 10:00 hora de Costa Rica
const DIA = 86_400_000
const foto = { src: 'x', por: 'dueno' as const, fecha: new Date(T0).toISOString(), origen: 'camara' as const }
const firmado = { dueno: 'f', inquilino: 'f' }
function alq(x: Partial<Alquiler> = {}): Alquiler {
  return { id: 'a1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-10-31', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
    estado: 'ventana_reclamo', rendimiento: false, historial: [], contrato: { firmas: firmado }, diasSimulados: 0,
    entrada: { cuartos: [{ nombre: 'Sala', items: [], fotos: [foto], nota: '' }], firmas: firmado },
    salida: { cuartos: [{ nombre: 'Sala', items: [], fotos: [foto], nota: '' }], firmas: firmado },
    entrega: new Date(T0 - 3 * DIA).toISOString(), ventanaInicio: new Date(T0 - DIA).toISOString(),
    regla: { cuenta: 'i', alquiler: 'a1', version: '1.7-demo', acepta: true, fecha: '2026-01-01T15:00:00.000Z' }, ...x }
}
// Pintura interior (mano de obra), 10 m², factura de 60: completo y menor al 30 % de 800.
const rubro = (x: Partial<Rubro> = {}): Rubro => ({ id: 'r1', ref: 0, cantidad: 10, motivo: 'dano', descripcion: 'Mancha grande en la pared de la sala', cuarto: 0, fotos: [foto], factura: { monto: 60 }, ...x })

describe('reclamo por rubros', () => {
  it('el monto es el total calculado y el aviso del día 1 se entrega en la app al reclamar (empieza el plazo del inquilino)', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0)
    expect(x.estado).toBe('reclamo'); expect(x.reclamo!.monto).toBe(propuesta(x, [rubro()]).total)
    expect(x.reclamo!.entregado).toBe(new Date(T0).toISOString())
    sincronizar(x, T0, T0)
    expect(x.avisos!.map(v => v.id)).toEqual(['reclamo-1'])
    expect(plazoInquilino(x)!.fin).toBe(T0 + 7 * DIA)
  })
  it('abrir la pantalla del reclamo cuenta como apertura (una sola vez)', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); abrirReclamo(x, T0 + 1000); abrirReclamo(x, T0 + 9000)
    expect(x.reclamo!.pantallaAbierta).toBe(new Date(T0 + 1000).toISOString())
  })
})
describe('respuesta del inquilino', () => {
  it('si acepta todos los rubros, es un acuerdo por el monto reclamado', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0)
    expect(responderRubros(x, { r1: { acepta: true } }, T0)).toBe('acuerdo'); expect(x.reclamo!.propuesta).toBeUndefined()
  })
  it('si rechaza con una cotización más baja, la propuesta automática usa el punto medio y espera a los dos', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); const pedido = x.reclamo!.monto
    expect(responderRubros(x, { r1: { acepta: false, soporte: { tipo: 'cotizacion', monto: 10, comercio: 'Pinturas S.A.' } } }, T0)).toBe('propuesta')
    expect(x.reclamo!.propuesta!.alDueno).toBe(Math.round((pedido + 10) / 2 * 100) / 100)
    expect(x.reclamo!.propuesta!.dueno).toBeUndefined(); expect(x.reclamo!.propuesta!.inquilino).toBeUndefined()
  })
  it('la propuesta solo se aplica si los dos la aceptan; si uno no, pasa a la Mediación Lockumi (demo)', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); responderRubros(x, { r1: { acepta: false } }, T0)
    expect(votarPropuesta(x, 'inquilino', true, T0)).toBeNull()
    expect(votarPropuesta(x, 'dueno', true, T0)).toBe('aplicar')
    const y = alq(); nuevoReclamo(y, [rubro()], T0); responderRubros(y, { r1: { acepta: false } }, T0)
    expect(votarPropuesta(y, 'dueno', false, T0)).toBe('mediacion')
  })
})
describe('regla del silencio (6.5 c y 6.5.1)', () => {
  const vencido = (x: Alquiler) => plazoInquilino(x)!.fin
  it('antes del vencimiento, o si respondió, no pasa nada', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); abrirReclamo(x, T0)
    expect(silencio(x, vencido(x) - 1)).toBeNull()
    responderRubros(x, { r1: { acepta: false } }, T0); expect(silencio(x, vencido(x))).toBeNull()
  })
  it('(b) regla aceptada, pruebas completas, ≤ 30 % y abrió un aviso: se aplica la propuesta automática', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); sincronizar(x, T0, T0); x.avisos![0].abierto = new Date(T0 + 60_000).toISOString()
    expect(silencio(x, vencido(x))).toEqual({ tipo: 'propuesta', alDueno: x.reclamo!.monto })
  })
  it('(c) regla aceptada pero sin abrir ningún aviso: pasa a la mediación', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); sincronizar(x, T0, T0)
    expect(silencio(x, vencido(x))).toMatchObject({ tipo: 'mediacion', motivo: 'El inquilino no abrió ningún aviso del reclamo.' })
  })
  it('sin la regla, más del 30 % o sin pruebas completas: pasa a la mediación', () => {
    const sin = alq({ regla: { cuenta: 'i', alquiler: 'a1', version: '1.7-demo', acepta: false, fecha: 'f' } }); nuevoReclamo(sin, [rubro()], T0); abrirReclamo(sin, T0)
    expect(silencio(sin, vencido(sin))?.tipo).toBe('mediacion')
    const caro = alq(); nuevoReclamo(caro, [rubro({ factura: { monto: 400 }, cantidad: 200 })], T0); abrirReclamo(caro, T0)
    expect(silencio(caro, vencido(caro))).toMatchObject({ tipo: 'mediacion', motivo: 'El total supera el 30 % del depósito.' })
    const sinFoto = alq(); nuevoReclamo(sinFoto, [rubro({ fotos: [] })], T0); abrirReclamo(sinFoto, T0)
    expect(silencio(sinFoto, vencido(sinFoto))?.tipo).toBe('mediacion')
  })
  it('si el día 7 cae en domingo, el plazo del inquilino termina el siguiente día hábil', () => {
    const lunes = T0 - DIA   // reclamo el domingo 1 nov: el día 7 es domingo 8 nov → lunes 9 nov
    const x = alq(); nuevoReclamo(x, [rubro()], lunes); abrirReclamo(x, lunes)
    expect(silencio(x, lunes + 7 * DIA)).toBeNull(); expect(silencio(x, lunes + 8 * DIA)?.tipo).toBe('propuesta')
  })
  it('texto B.10 con las fechas de la regla y de la apertura', () => {
    const x = alq(); nuevoReclamo(x, [rubro()], T0); abrirReclamo(x, T0)
    const t = textoSeAplico(x, { dueno: 50, inquilino: 750 })
    expect(t[0]).toBe('El dueño recibió 50 USDC de prueba y a ti se te liberaron 750 USDC de prueba.')
    expect(t[1]).toMatch(/^Por qué: aceptaste la regla el 1 ene 2026, abriste el aviso del reclamo el 2 nov 2026 y no respondiste en 7 días naturales\./)
    expect(t[2]).toBe('Lo aplicado es final dentro de la app. Siempre puedes ir a los tribunales: tu derecho dura un año (Ley 7527, art. 120).')
  })
})
