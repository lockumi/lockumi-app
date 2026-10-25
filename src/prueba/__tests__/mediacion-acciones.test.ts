// PR 6 (paso 10) · «Resolver el reclamo (simulación)» con el interruptor encendido (cuenta segura simulada).
import { describe, it, expect, vi } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { store } = await import('../../store')
const { acciones } = await import('../../acciones')
const nuevo = () => {
  const a = store.crear({ direccion: 'Casa', monto: 800, inicio: '2026-01-01', fin: '2026-10-20', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: 'demo@lockumi.com' })
  store.cambiar(a.id, x => { x.estado = 'mediacion'; x.reclamo = { monto: 95, motivo: 'Pared', fotos: [], fecha: new Date().toISOString() } })
  return a.id
}
describe('resolverSimulacion', () => {
  it('reparte una sola vez (doble toque) y cierra con via «simulacion»', async () => {
    const id = nuevo(); const x = store.obtener(id)!
    await Promise.all([acciones.resolverSimulacion!(x, 95), acciones.resolverSimulacion!(x, 95)])
    const a = store.obtener(id)!
    expect(a.estado).toBe('cerrado'); expect(a.resultado).toMatchObject({ dueno: 95, inquilino: 705, via: 'simulacion' })
    expect(a.historial.filter(h => h.texto.startsWith('Reclamo resuelto (simulación)'))).toHaveLength(1)
  })
  it('rechaza un reparto inválido sin mover nada', async () => {
    const id = nuevo()
    await expect(acciones.resolverSimulacion!(store.obtener(id)!, 500)).rejects.toThrow('El dueño no puede recibir más de lo que reclamó.')
    expect(store.obtener(id)!.estado).toBe('mediacion')
  })
})
