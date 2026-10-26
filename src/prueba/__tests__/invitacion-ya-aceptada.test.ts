// 26/10/2026: volver a abrir un link de invitación ya usado desde una sesión que ya es parte del alquiler lleva al alquiler.
import { describe, it, expect, vi, beforeEach } from 'vitest'
const datos = new Map<string, object>(); const ir = vi.fn()
vi.mock('../../servidor/repositorio', () => ({ servidor: {}, recargar: vi.fn(async () => {}), repositorio: { obtener: (id: string) => datos.get(id) } }))
vi.mock('../../router', () => ({ ir }))
vi.mock('../../store', () => ({ activarServidor: vi.fn() }))
describe('abrirSiYaEsMio', () => {
  beforeEach(() => { datos.clear(); ir.mockClear() })
  it('si el alquiler ya es mío, va al alquiler', async () => {
    datos.set('a1', { id: 'a1' })
    const { abrirSiYaEsMio } = await import('../../screens/Invitacion')
    expect(await abrirSiYaEsMio('a1')).toBe(true); expect(ir).toHaveBeenCalledWith('/alquiler/a1')
  })
  it('si no es mío, queda el texto de siempre («ya no está disponible»)', async () => {
    const { abrirSiYaEsMio } = await import('../../screens/Invitacion')
    expect(await abrirSiYaEsMio('otro')).toBe(false); expect(ir).not.toHaveBeenCalled()
  })
  it('la pantalla lo usa solo cuando lk_ver_invitacion falla', async () => {
    const src = (await import('../../screens/Invitacion.tsx?raw')).default
    expect(src).toMatch(/\.catch\(e => abrirSiYaEsMio\(id\)\.then\(mio => \{ if \(!mio\) setErr\(e\.message\) \}\)\)/)
  })
})
