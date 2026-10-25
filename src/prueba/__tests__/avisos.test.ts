import { describe, it, expect } from 'vitest'
import { textoAviso, botonesAviso, PLANTILLAS } from '../../../api/_lib/avisos'
import { debidos, plazoDueno } from '../avisos'
import { actaVacia } from '../../store'
import type { Alquiler } from '../../types'

const base = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'a1', direccion: 'x', monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-11-30', reglas: [], duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'demo@lockumi.com', estado: 'ventana_reclamo', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: actaVacia(), diasSimulados: 0, ...x })

describe('avisos 1, 4 y 6', () => {
  it('textos con «depósito de prueba» y hora de Costa Rica', () => {
    const d1 = textoAviso('dueno-1', { deposito: 20, venceMs: +new Date('2026-11-09T16:00:00Z'), recibido: false })
    expect(d1.asunto).toBe('Tienes 7 días naturales para revisar la casa y reclamar')
    expect(d1.texto).toMatch(/^Como no confirmaste «Recibí la casa», tu plazo empezó automáticamente 2 días después de la entrega registrada\./)
    expect(d1.texto).toContain('depósito de prueba de 20 USDC de prueba. Vence el 9 nov 2026, 10:00 a. m., hora de Costa Rica.')
    expect(textoAviso('reclamo-6', { deposito: 20, reclamado: 5, venceMs: 0, regla: true }).texto).toContain('La app registra que abriste este aviso.')
    expect(textoAviso('reclamo-6', { deposito: 20, reclamado: 5, venceMs: 0, regla: false }).texto).toContain('que tiene costo (en la demo no se cobra)')
    for (const p of PLANTILLAS) expect(textoAviso(p, { deposito: 1 }).asunto.length).toBeGreaterThan(5)
  })
  it('«Todo bien, devolver» solo abre la confirmación', () => {
    expect(botonesAviso('dueno-1').map(b => b.accion)).toEqual(['ver', 'confirmar-devolver'])
  })
  it('salen los días 1, 4 y 6 al avanzar el reloj, una sola vez cada uno', () => {
    const ini = '2026-11-02T16:00:00Z'
    const a = base({ ventanaInicio: ini, entrega: '2026-10-31T16:00:00Z' })
    const t = (d: number) => +new Date(ini) + d * 86400000
    expect(debidos(a, t(0)).map(x => x.id)).toEqual(['dueno-1'])
    expect(debidos(a, t(3)).map(x => x.id)).toEqual(['dueno-1', 'dueno-4'])
    expect(debidos(a, t(5.5)).map(x => x.id)).toEqual(['dueno-1', 'dueno-4', 'dueno-6'])
    const ya = base({ ...a, avisos: [{ id: 'dueno-1', para: 'dueno', dia: 1, asunto: '', texto: '', entregado: ini, entregadoReal: ini }] })
    expect(debidos(ya, t(5.5)).map(x => x.id)).toEqual(['dueno-4', 'dueno-6'])
  })
  it('plazo del dueño: si vence en domingo pasa al lunes', () => {
    // 1 nov 2026 es domingo: empieza el domingo 25 oct → vence el domingo 1 nov → lunes 2 nov
    const p = plazoDueno(base({ ventanaInicio: '2026-10-25T16:00:00Z' }))!
    expect(p.movido).toBe('domingo'); expect(new Date(p.fin).toISOString().slice(0, 10)).toBe('2026-11-02')
  })
  it('aviso de reparación 5 días antes del fin del alquiler', () => {
    const a = base({ estado: 'en_curso', fin: '2026-11-30' })
    expect(debidos(a, +new Date('2026-11-24T00:00:00Z'))).toEqual([])
    expect(debidos(a, +new Date('2026-11-25T18:00:00Z')).map(x => x.id)).toEqual(['reparacion-5'])
  })
})
