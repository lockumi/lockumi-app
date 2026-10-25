// PR 4 · Flujo del dueño (B.4, B.2b, B.9, 6.5 a): entrega registrada, «Recibí la casa», inicio automático a los 2 días,
// 7 días naturales (domingo o feriado → siguiente día hábil), avisos 1/4/6 con registro, devolución y simulador de días.
import { describe, it, expect, vi } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
const d = await import('../dueno')
const { debidos } = await import('../avisos')
import type { Alquiler } from '../../types'

const DIA = 86_400_000
const base = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'a1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-10-20', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: 'demo@lockumi.com',
  estado: 'salida', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, salida: { cuartos: [], firmas: {} }, diasSimulados: 0, ...x })
// Jueves 22 oct 2026, 10:00 CR
const ENTREGA = +new Date('2026-10-22T10:00:00-06:00')

describe('entrega y plazo del dueño', () => {
  it('al confirmar las fotos de salida queda la entrega registrada y el plazo todavía no corre', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    expect(a.estado).toBe('ventana_reclamo'); expect(a.entrega).toBe(new Date(ENTREGA).toISOString()); expect(a.ventanaInicio).toBeUndefined()
    expect(d.inicioAuto(a)).toBe(ENTREGA + 2 * DIA)
    expect(debidos(a, ENTREGA + DIA)).toEqual([])
  })
  it('«Recibí la casa» empieza los 7 días naturales en ese momento', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    const t = ENTREGA + 3_600_000; d.recibirCasa(a, t)
    expect(a.recibido).toBe(new Date(t).toISOString()); expect(a.ventanaInicio).toBe(a.recibido)
    expect(d.finVentana(a)).toBe(t + 7 * DIA)   // jueves 29 oct: día hábil
    d.recibirCasa(a, t + DIA); expect(a.ventanaInicio).toBe(new Date(t).toISOString())   // una sola vez
  })
  it('si no toca «Recibí la casa», el plazo empieza solo 2 días después de la entrega (y el aviso del día 1 lo dice)', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    expect(d.sincronizar(a, ENTREGA + DIA, ENTREGA)).toBe(false); expect(a.ventanaInicio).toBeUndefined()
    expect(d.sincronizar(a, ENTREGA + 2 * DIA + 60_000, ENTREGA)).toBe(true)
    expect(a.ventanaInicio).toBe(new Date(ENTREGA + 2 * DIA).toISOString())
    expect(a.historial.at(-2)?.texto).toMatch(/empezó automáticamente 2 días después de la entrega/)
    expect(a.avisos?.map(v => v.id)).toEqual(['dueno-1'])
    expect(a.avisos![0].texto).toMatch(/^Como no confirmaste «Recibí la casa», tu plazo empezó automáticamente/)
  })
  it('(a) el día 7 cae en domingo: el plazo termina el lunes siguiente (día hábil) y el contador lo dice', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    const t = +new Date('2026-10-25T09:00:00-06:00'); d.recibirCasa(a, t)   // domingo 25 → 7 días = domingo 1 nov → lunes 2 nov
    expect(d.finVentana(a)).toBe(+new Date('2026-11-02T09:00:00-06:00'))
    const c = d.textoContador('dueno', a, t)
    expect(c).toBe('Te quedan 8 días y 0 horas para reclamar (vence el 2 nov 2026, 09:00, hora de Costa Rica). (se movió al siguiente día hábil porque el día 7 cae en domingo)')
  })
  it('(a) el día 7 cae en feriado: pasa al siguiente día hábil', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    d.recibirCasa(a, +new Date('2026-12-18T09:00:00-06:00'))   // 7 días = 25 dic (Navidad)
    expect(d.finVentana(a)).toBe(+new Date('2026-12-26T09:00:00-06:00'))
    expect(d.textoContador('dueno', a, +new Date('2026-12-18T09:00:00-06:00'))).toMatch(/porque el día 7 cae en feriado\)$/)
  })
})

describe('avisos 1, 4 y 6 con registro de entrega y apertura', () => {
  it('el simulador de días entrega los avisos de los días que se adelantan, una sola vez', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString()); d.recibirCasa(a, ENTREGA)
    d.sincronizar(a, ENTREGA, ENTREGA); expect(a.avisos?.map(v => v.id)).toEqual(['dueno-1'])
    d.simularDias(a, 5); d.sincronizar(a, ENTREGA + 5 * DIA, ENTREGA)
    expect(a.diasSimulados).toBe(5); expect(a.avisos?.map(v => v.id)).toEqual(['dueno-1', 'dueno-4', 'dueno-6'])
    expect(a.avisos![1].entregado).toBe(new Date(ENTREGA + 3 * DIA).toISOString()); expect(a.avisos![1].entregadoReal).toBe(new Date(ENTREGA).toISOString())
    expect(d.sincronizar(a, ENTREGA + 5 * DIA, ENTREGA)).toBe(false)
  })
  it('abrir un aviso guarda la hora por canal, una sola vez', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString()); d.recibirCasa(a, ENTREGA); d.sincronizar(a, ENTREGA, ENTREGA)
    d.abrirAviso(a, 'dueno-1', 'app', ENTREGA + 1000); d.abrirAviso(a, 'dueno-1', 'app', ENTREGA + 9000)
    d.abrirAviso(a, 'dueno-1', 'correo', ENTREGA + 5000)
    expect(a.avisos![0].abierto).toBe(new Date(ENTREGA + 1000).toISOString()); expect(a.avisos![0].abiertoCorreo).toBe(new Date(ENTREGA + 5000).toISOString())
  })
  it('con el plazo movido, el día 6 sigue siendo la víspera del último día', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    const t = +new Date('2026-10-25T09:00:00-06:00'); d.recibirCasa(a, t)
    const seis = debidos(a, t + 30 * DIA).find(x => x.id === 'dueno-6')!
    expect(seis.hora).toBe(+new Date('2026-10-31T09:00:00-06:00'))
  })
  it('después del vencimiento ya no se entregan avisos del plazo', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString()); d.recibirCasa(a, ENTREGA)
    d.sincronizar(a, ENTREGA + 8 * DIA, ENTREGA); expect(a.avisos?.map(v => v.id)).toEqual(['dueno-1', 'dueno-4', 'dueno-6'])
    expect(d.vencido(a, ENTREGA + 7 * DIA)).toBe(true); expect(d.vencido(a, ENTREGA + 7 * DIA - 1)).toBe(false)
  })
})

describe('textos (B.4, B.9)', () => {
  it('pantalla «¿Recibiste la casa?» con la fecha del inicio automático', () => {
    const a = base(); d.registrarEntrega(a, new Date(ENTREGA).toISOString())
    expect(d.textoRecibir(a)).toBe('¿Recibiste la casa? Tus 7 días naturales para reclamar empiezan cuando toques «Recibí la casa». Si no lo tocas, empiezan solos el 24 oct 2026, 10:00, hora de Costa Rica. Si el día 7 cae en domingo o en feriado, tu plazo termina el siguiente día hábil. Te avisamos en la app los días 1, 4 y 6. Toma las fotos de salida en la app: se guardan con la fecha y la hora.')
    expect(d.CONFIRMAR_DEVOLVER).toBe('Se devolverá todo el depósito al inquilino ahora. Después de esto no podrás reclamar en la app. Fuera de la app, conservas tus derechos según la ley.')
  })
  it('fase 1: los botones del dueño de prueba dicen «Simular: …»', () => {
    expect(d.botonRecibir(true)).toBe('Simular: el dueño recibe la casa'); expect(d.botonRecibir(false)).toBe('Recibí la casa')
  })
})
