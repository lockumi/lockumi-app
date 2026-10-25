// PR 4 · acciones del dueño con el interruptor encendido (demo local, cuenta segura simulada).
import { describe, it, expect, vi, beforeAll } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { store } = await import('../../store')
const { acciones } = await import('../../acciones')
const { turno } = await import('../../flujo')
const { alertaPorCambio, instantanea } = await import('../../alertas')
const DIA = 86_400_000

let id = ''
const nuevo = () => {
  const a = store.crear({ direccion: 'Casa', monto: 800, inicio: '2026-01-01', fin: '2026-10-20', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: 'demo@lockumi.com' })
  store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = { cuartos: [], firmas: { inquilino: new Date().toISOString() } } })
  return a.id
}
describe('flujo del dueño (interruptor encendido)', () => {
  beforeAll(async () => { id = nuevo(); await acciones.firmar(store.obtener(id)!, 'salida', 'dueno') })
  it('al confirmar las fotos de salida: entrega registrada y el plazo espera «Recibí la casa»', () => {
    const a = store.obtener(id)!
    expect(a.estado).toBe('ventana_reclamo'); expect(a.entrega).toBeTruthy(); expect(a.ventanaInicio).toBeUndefined()
    expect(turno(a, 'dueno').tu).toBe('Toca «Recibí la casa» cuando la recibas.')
  })
  it('no se devuelve solo antes del final del plazo', async () => {
    await acciones.cerrarSinReclamo(store.obtener(id)!); expect(store.obtener(id)!.estado).toBe('ventana_reclamo')
  })
  it('el aviso del simulador no dice que terminó el plazo', () => {
    const a = store.obtener(id)!; const b = structuredClone(a); b.diasSimulados += 1
    expect(alertaPorCambio(instantanea(a), b, 'inquilino')?.titulo).toBe('Reloj de la demo adelantado')
  })
  it('«Todo bien, devolver» (después de confirmar) devuelve todo una sola vez, aunque se toque dos veces', async () => {
    const x = store.obtener(id)!
    await Promise.all([acciones.devolverTodo!(x), acciones.devolverTodo!(x)])
    const a = store.obtener(id)!
    expect(a.estado).toBe('cerrado'); expect(a.resultado).toMatchObject({ inquilino: 800, dueno: 0, via: 'devuelto' })
    expect(a.historial.filter(h => h.texto.startsWith('El dueño tocó «Todo bien, devolver»'))).toHaveLength(1)
  })
  it('al vencer el plazo sin reclamo se devuelve todo (con el reloj de la demo)', async () => {
    const otro = nuevo(); await acciones.firmar(store.obtener(otro)!, 'salida', 'dueno')
    const { recibirCasa } = await import('../dueno')
    store.cambiar(otro, x => recibirCasa(x, Date.now()))
    store.cambiar(otro, x => { x.diasSimulados += 6 }); await acciones.cerrarSinReclamo(store.obtener(otro)!); expect(store.obtener(otro)!.estado).toBe('ventana_reclamo')
    store.cambiar(otro, x => { x.diasSimulados += 3 }); await acciones.cerrarSinReclamo(store.obtener(otro)!)
    expect(store.obtener(otro)!.resultado).toMatchObject({ inquilino: 800, via: 'automatico' })
    expect(DIA).toBeGreaterThan(0)
  })
})
