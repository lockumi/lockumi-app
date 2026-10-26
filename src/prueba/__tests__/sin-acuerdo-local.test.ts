// Legal (25/10, 1:16 a. m.): con un reclamo o una mediación abiertos, la devolución automática del plazo nunca corre y nada
// reparte el depósito por vencimiento (demo local con el interruptor encendido; cuenta segura simulada).
import { describe, it, expect, vi } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { store } = await import('../../store')
const { acciones } = await import('../../acciones')
const { recibirCasa } = await import('../dueno')

async function conReclamo() {
  const a = store.crear({ direccion: 'Casa', monto: 800, inicio: '2026-01-01', fin: '2026-10-20', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: 'demo@lockumi.com' })
  store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = { cuartos: [], firmas: { inquilino: new Date().toISOString() } } })
  await acciones.firmar(store.obtener(a.id)!, 'salida', 'dueno')
  store.cambiar(a.id, x => recibirCasa(x, Date.now()))
  await acciones.reclamar(store.obtener(a.id)!, 30, 'Pared manchada en la sala', [])
  expect(store.obtener(a.id)!.estado).toBe('reclamo')
  return a.id
}
const pasan = (id: string, dias: number) => store.cambiar(id, x => { x.diasSimulados += dias })

describe('sin acuerdo no hay liberación por plazo (demo local)', () => {
  it('con un reclamo abierto, la devolución automática de los 7 días no corre aunque el plazo haya vencido', async () => {
    const id = await conReclamo(); pasan(id, 30)
    await acciones.cerrarSinReclamo(store.obtener(id)!)
    await acciones.devolverTodo!(store.obtener(id)!)
    expect(store.obtener(id)!.estado).toBe('reclamo'); expect(store.obtener(id)!.resultado).toBeUndefined()
  })
  it('en la mediación, el caso sigue abierto: ni la devolución automática ni el paso de los días lo cierran', async () => {
    const id = await conReclamo()
    await acciones.responder(store.obtener(id)!, false)
    expect(store.obtener(id)!.estado).toBe('mediacion')
    pasan(id, 90)
    await acciones.cerrarSinReclamo(store.obtener(id)!)
    await acciones.devolverTodo!(store.obtener(id)!)
    await acciones.aplicarSilencio!(store.obtener(id)!)
    expect(store.obtener(id)!.estado).toBe('mediacion'); expect(store.obtener(id)!.resultado).toBeUndefined()
  })
})
