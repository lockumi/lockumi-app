// PR 5 (paso 9) · acciones del reclamo con el interruptor encendido (demo local, cuenta segura simulada).
import { describe, it, expect, vi } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { store } = await import('../../store')
const { acciones } = await import('../../acciones')
const { sincronizar } = await import('../dueno')
const { plazoInquilino } = await import('../avisos')
const DIA = 86_400_000
const foto = { src: 'x', por: 'dueno' as const, fecha: new Date().toISOString(), origen: 'camara' as const }
const rubro = { id: 'r1', ref: 0, cantidad: 10, motivo: 'dano' as const, descripcion: 'Mancha grande en la pared de la sala', cuarto: 0, fotos: [foto], factura: { monto: 60 } }

const nuevo = (regla = true) => {
  const a = store.crear({ direccion: 'Casa', monto: 800, inicio: '2026-01-01', fin: '2026-10-20', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: 'demo@lockumi.com' })
  store.cambiar(a.id, x => {
    const f = { dueno: 'f', inquilino: 'f' }; x.estado = 'ventana_reclamo'; x.entrega = x.ventanaInicio = new Date().toISOString()
    x.entrada = { cuartos: [{ nombre: 'Sala', items: [], fotos: [foto], nota: '' }], firmas: f }
    x.regla = { cuenta: 'demo@lockumi.com', alquiler: x.id, version: '1.7-demo', acepta: regla, fecha: new Date().toISOString() }
  })
  return a.id
}
describe('acciones del reclamo (interruptor encendido)', () => {
  it('reclamar por rubros abre la disputa una sola vez y entrega el aviso del día 1', async () => {
    const id = nuevo(); const x = store.obtener(id)!
    await Promise.all([acciones.reclamarRubros!(x, [rubro]), acciones.reclamarRubros!(x, [rubro])])
    const a = store.obtener(id)!
    expect(a.estado).toBe('reclamo'); expect(a.reclamo!.rubros).toHaveLength(1)
    expect(a.historial.filter(h => h.texto.startsWith('El dueño reclamó'))).toHaveLength(1)
    store.cambiar(id, y => { sincronizar(y, Date.now()) }); expect(store.obtener(id)!.avisos!.map(v => v.id)).toEqual(['reclamo-1'])
  })
  it('si el inquilino acepta todo, se reparte lo reclamado (acuerdo)', async () => {
    const id = nuevo(); await acciones.reclamarRubros!(store.obtener(id)!, [rubro]); const pedido = store.obtener(id)!.reclamo!.monto
    await acciones.responderRubros!(store.obtener(id)!, { r1: { acepta: true } })
    expect(store.obtener(id)!.resultado).toMatchObject({ dueno: pedido, inquilino: 800 - pedido, via: 'acuerdo' })
  })
  it('propuesta aceptada por los dos: se reparte el monto de la propuesta', async () => {
    const id = nuevo(); await acciones.reclamarRubros!(store.obtener(id)!, [rubro])
    await acciones.responderRubros!(store.obtener(id)!, { r1: { acepta: false, soporte: { tipo: 'cotizacion', monto: 10, comercio: 'Pinturas S.A.' } } })
    const al = store.obtener(id)!.reclamo!.propuesta!.alDueno
    await acciones.votarPropuesta!(store.obtener(id)!, 'inquilino', true); expect(store.obtener(id)!.estado).toBe('reclamo')
    await acciones.votarPropuesta!(store.obtener(id)!, 'dueno', true)
    expect(store.obtener(id)!.resultado).toMatchObject({ dueno: al, inquilino: 800 - al, via: 'acuerdo' })
  })
  it('propuesta rechazada: pasa a la Mediación Lockumi (demo)', async () => {
    const id = nuevo(); await acciones.reclamarRubros!(store.obtener(id)!, [rubro])
    await acciones.responderRubros!(store.obtener(id)!, { r1: { acepta: false } })
    await acciones.votarPropuesta!(store.obtener(id)!, 'inquilino', false)
    expect(store.obtener(id)!.estado).toBe('mediacion')
  })
  it('silencio con la regla y un aviso abierto: se aplica la propuesta automática al vencer (con el reloj de la demo)', async () => {
    const id = nuevo(); await acciones.reclamarRubros!(store.obtener(id)!, [rubro]); store.cambiar(id, y => { y.reclamo!.pantallaAbierta = new Date().toISOString() })
    await acciones.aplicarSilencio!(store.obtener(id)!); expect(store.obtener(id)!.estado).toBe('reclamo')
    const fin = plazoInquilino(store.obtener(id)!)!.fin
    store.cambiar(id, y => { y.diasSimulados += Math.ceil((fin - Date.now()) / DIA) + 1 })
    await acciones.aplicarSilencio!(store.obtener(id)!)
    const a = store.obtener(id)!; expect(a.resultado?.via).toBe('propuesta'); expect(a.resultado!.dueno).toBe(a.reclamo!.monto)
  })
  it('silencio sin abrir avisos: pasa a la mediación, sin repartir', async () => {
    const id = nuevo(); await acciones.reclamarRubros!(store.obtener(id)!, [rubro])
    store.cambiar(id, y => { y.diasSimulados += 10 })
    await acciones.aplicarSilencio!(store.obtener(id)!)
    expect(store.obtener(id)!.estado).toBe('mediacion'); expect(store.obtener(id)!.resultado).toBeUndefined()
  })
})
