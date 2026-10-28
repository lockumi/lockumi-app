// Reputación · «Solo tú ves esto» sin parpadeo (aprobado por Katherine el 27/10/2026, 9:21 p. m. CR: «arreglen el parpadeo sin tocar el diseño»).
// Mientras carga, o si la carga falla, la tarjeta no muestra «Todavía no tienes alquileres cerrados.» ni un puntaje de 0.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'
import { cargarInfoReputacion, estadoInfoReputacion, _reiniciarInfoReputacion } from '../perfilesServidor'

const CERO = 'Todavía no tienes alquileres cerrados.', CERO_PUBLICO = 'Nuevo en Lockumi · 0 alquileres cerrados'
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const mem = new Map<string, string>(), ses = new Map<string, string>()
const almacen = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)) }, removeItem: (k: string) => { m.delete(k) },
  clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } })
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const alq = (id: string) => ({ id, direccion: 'Casa ' + id, monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
  duenoEmail: U.email, inquilinoEmail: 'o@x.cr', estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} },
  resultado: { inquilino: 20, dueno: 0, via: 'devuelto', fecha: new Date(Date.now() + 60_000).toISOString() } })

let estado: 'cargando' | 'listo' | 'error' = 'listo'
const pantalla = async (r = '/perfil/dueno') => { const { default: R } = await import('../Pantallas'); return texto(renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>X</p></R>)) }
beforeEach(async () => {
  vi.resetModules(); mem.clear(); ses.clear(); vi.stubGlobal('localStorage', almacen(mem)); vi.stubGlobal('sessionStorage', almacen(ses))
  vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); estado = 'listo'
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos(), useEstadoAlquileres: () => estado } })
  const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú'); aceptarRep01('o@x.cr', ['x'])
})

describe('«Solo tú ves esto» mientras carga', () => {
  it('cargando: no aparece la frase de 0 ni «Nuevo en Lockumi · 0…» (dueño e inquilino)', async () => {
    estado = 'cargando'
    for (const r of ['/perfil/dueno', '/perfil/inquilino']) { const t = await pantalla(r); expect(t).toContain('Solo tú ves esto'); expect(t).not.toContain(CERO); expect(t).not.toContain(CERO_PUBLICO) }
  })
  it('error: no aparece un 0 falso', async () => {
    estado = 'error'
    for (const r of ['/perfil/dueno', '/perfil/inquilino']) { const t = await pantalla(r); expect(t).toContain('Solo tú ves esto'); expect(t).not.toContain(CERO); expect(t).not.toContain(CERO_PUBLICO) }
  })
  it('cargando o error: tampoco sale un aviso «Tu puntaje cambió» falso (con un puntaje ya visto)', async () => {
    const { marcarVisto } = await import('../avisos'); marcarVisto(U.email, 'dueno', { linea: '5,0 de 5', vencidos: [] })
    for (const x of ['cargando', 'error'] as const) { estado = x; expect(await pantalla()).not.toContain('Tu puntaje cambió') }
  })
  it('datos con t = 0: sí aparece la frase de 0', async () => {
    const t = await pantalla(); expect(t).toContain(CERO); expect(t).toContain(CERO_PUBLICO)
  })
  it('datos con t ≥ 1: la frase normal', async () => {
    mem.set('lockumi.alquileres.v3', JSON.stringify([alq('1'), alq('2')]))
    const t = await pantalla(); expect(t).toContain('Tus 2 alquileres cerrados terminaron con el depósito devuelto completo.'); expect(t).not.toContain(CERO)
  })
})

describe('Información de reputación del servidor: cargando, error y listo', () => {
  beforeEach(() => _reiniciarInfoReputacion())
  const xs = [alq('a')] as never[]
  it('sin alquileres cerrados no hay nada que esperar', () => { expect(estadoInfoReputacion([])).toBe('listo') })
  it('cargando hasta la respuesta; luego listo', async () => {
    let soltar!: (v: { contrato_id: string; cuenta: boolean; desde: string | null }[]) => void
    const p = cargarInfoReputacion(xs, () => new Promise(r => { soltar = r }))
    expect(estadoInfoReputacion(xs)).toBe('cargando')
    soltar([{ contrato_id: 'a', cuenta: true, desde: null }]); await p
    expect(estadoInfoReputacion(xs)).toBe('listo')
  })
  it('si falla: error (y se reintenta en la próxima carga)', async () => {
    await cargarInfoReputacion(xs, () => Promise.reject(new Error('sin red')))
    expect(estadoInfoReputacion(xs)).toBe('error')
    await cargarInfoReputacion(xs, async () => [{ contrato_id: 'a', cuenta: true, desde: null }])
    expect(estadoInfoReputacion(xs)).toBe('listo')
  })
})
