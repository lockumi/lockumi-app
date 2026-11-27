import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Aviso, Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('fetch', vi.fn())

const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }
const aviso = (x: Partial<Aviso>): Aviso => ({ id: 'dueno-1', para: 'dueno', dia: 1, asunto: 'Revisar la casa', texto: 'texto ya guardado', entregado: '2026-11-01T15:00:00.000Z', entregadoReal: '2026-11-01T15:00:00.000Z', ...x })
const lista: Pick<Alquiler, 'id' | 'direccion' | 'duenoEmail' | 'inquilinoEmail' | 'miRol' | 'avisos'>[] = []

vi.doMock('../../store', async (o) => {
  const m = await o<typeof import('../../store')>()
  return { ...m, useAlquileres: () => lista }
})

const { avisosVisibles, marcarAvisoAbierto } = await import('../avisos-datos')
const { Avisos } = await import('../Avisos')
const { store } = await import('../../store')
const fuente = await import('../avisos-datos.ts?raw').then(m => m.default as string)

describe('centro de avisos', () => {
  it('solo los avisos del rol de esta persona, del más nuevo al más viejo', () => {
    const v = avisosVisibles([
      { id: 'a1', direccion: 'Escazú', duenoEmail: U.email, inquilinoEmail: 'inq@ejemplo.cr', avisos: [aviso({ id: 'd1', entregado: '2026-11-01T00:00:00.000Z' }), aviso({ id: 'i1', para: 'inquilino', asunto: 'Para el inquilino', entregado: '2026-11-03T00:00:00.000Z' })] },
      { id: 'a2', direccion: 'Heredia', duenoEmail: 'otro@ejemplo.cr', inquilinoEmail: U.email, avisos: [aviso({ id: 'i2', para: 'inquilino', asunto: 'Te toca', entregado: '2026-11-02T00:00:00.000Z' })] },
    ], U.email)
    expect(v.map(x => x.aviso.id)).toEqual(['i2', 'd1'])
    expect(avisosVisibles([{ id: 'x', direccion: 'Nadie', duenoEmail: 'a@b.c', inquilinoEmail: 'c@d.e', avisos: [aviso({})] }], U.email)).toEqual([])
  })
  it('abrir marca abierto con el registro que ya existe y no agrega avisos ni llama a la red', () => {
    const creado = store.crear({ direccion: 'Ejemplo de prueba', monto: 1, inicio: '2026-11-01', fin: '2027-11-01', reglas: [], duenoEmail: U.email, inquilinoEmail: 'inq@ejemplo.cr' })
    store.cambiar(creado.id, a => { a.avisos = [aviso({ id: 'dueno-1' })] })
    expect(store.obtener(creado.id)!.avisos).toHaveLength(1)
    expect(marcarAvisoAbierto(creado.id, 'dueno-1')).toBe('#/alquiler/' + creado.id)
    const guardado = store.obtener(creado.id)!.avisos!
    expect(guardado).toHaveLength(1)
    expect(guardado[0].abierto).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    expect(fuente).not.toMatch(/enviarCorreo|avisosPorEnviar/)
  })
  it('la pantalla vacía no inventa asuntos; con un aviso muestra el asunto real', () => {
    lista.length = 0
    const vacio = renderToStaticMarkup(<Avisos u={U} />)
    expect(vacio).toContain('Todavía no hay avisos.')
    expect(vacio).not.toMatch(/Firmas listas|Depósito protegido|Quedan 5 días/)
    lista.push({ id: 'a9', direccion: 'Casa ejemplo', duenoEmail: U.email, inquilinoEmail: 'inq@ejemplo.cr', avisos: [aviso({ asunto: 'Revisar la casa', dia: 'reparacion' })] })
    const h = renderToStaticMarkup(<Avisos u={U} />)
    expect(h).toContain('Revisar la casa')
    expect(h).toContain('Casa ejemplo')
    expect(h).toContain('href="#/alquiler/a9"')
    expect(h).toContain('avisos-centro__item--salida')
    expect(h).toContain('Nuevo')
  })
})
