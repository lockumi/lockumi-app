// Reputación · frase corta de «Solo tú ves esto» (opción B de Legal, aprobada por Katherine el 27/10/2026, 4:52 p. m. CR).
// Textos literales; se omite la parte que vale 0 y con 1 alquiler cerrado va en singular. «Completo» = fraccionDescontada === 0.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'
import { UI } from '../textos'

const NOTA = 'Un reparto no baja tu puntaje, salvo que se haya devuelto al inquilino el 90 % o más de lo que reclamaste (cláusula 15.3).'

describe('Dueño: «De tus {t} alquileres cerrados: {c} con el depósito devuelto completo y {r} con un reparto…»', () => {
  it('varios con las dos partes (texto literal)', () => {
    expect(UI.devolvioDe(3, 5)).toBe('De tus 5 alquileres cerrados: 3 con el depósito devuelto completo y 2 con un reparto del depósito (reclamo aceptado o mediación).')
    expect(UI.devolvioDe(1, 2)).toBe('De tus 2 alquileres cerrados: 1 con el depósito devuelto completo y 1 con un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('se omite la parte que vale 0', () => {
    expect(UI.devolvioDe(5, 5)).toBe('De tus 5 alquileres cerrados: 5 con el depósito devuelto completo.')
    expect(UI.devolvioDe(0, 4)).toBe('De tus 4 alquileres cerrados: 4 con un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('con 1 alquiler cerrado, en singular', () => {
    expect(UI.devolvioDe(1, 1)).toBe('De tu 1 alquiler cerrado: 1 con el depósito devuelto completo.')
    expect(UI.devolvioDe(0, 1)).toBe('De tu 1 alquiler cerrado: 1 con un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('sin alquileres cerrados', () => { expect(UI.devolvioDe(0, 0)).toBe('Todavía no tienes alquileres cerrados.') })
  it('nota de debajo, literal', () => { expect(UI.notaReparto).toBe(NOTA) })
})

describe('Inquilino: «De tus {t} alquileres cerrados: en {c} recibiste tu depósito completo y en {r} hubo un reparto…»', () => {
  it('varios con las dos partes (texto literal)', () => {
    expect(UI.recibioDe(3, 5)).toBe('De tus 5 alquileres cerrados: en 3 recibiste tu depósito completo y en 2 hubo un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('se omite la parte que vale 0', () => {
    expect(UI.recibioDe(5, 5)).toBe('De tus 5 alquileres cerrados: en 5 recibiste tu depósito completo.')
    expect(UI.recibioDe(0, 3)).toBe('De tus 3 alquileres cerrados: en 3 hubo un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('con 1 alquiler cerrado, en singular', () => {
    expect(UI.recibioDe(1, 1)).toBe('De tu 1 alquiler cerrado: en 1 recibiste tu depósito completo.')
    expect(UI.recibioDe(0, 1)).toBe('De tu 1 alquiler cerrado: en 1 hubo un reparto del depósito (reclamo aceptado o mediación).')
  })
  it('sin alquileres cerrados', () => { expect(UI.recibioDe(0, 0)).toBe('Todavía no tienes alquileres cerrados.') })
})

describe('Pantalla «Mi perfil»: la nota del reparto va solo para el dueño', () => {
  const mem = new Map<string, string>(), ses = new Map<string, string>()
  const almacen = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)) }, removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } })
  const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
  const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return texto(renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>X</p></R>)) }
  beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); vi.stubGlobal('localStorage', almacen(mem)); vi.stubGlobal('sessionStorage', almacen(ses))
    vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1')
    vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } }) })

  const alq = (id: string, dueno: string, inquilino: string, devuelto: number, via: string) => ({ id, direccion: 'Casa ' + id, monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
    duenoEmail: dueno, inquilinoEmail: inquilino, estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} },
    resultado: { inquilino: devuelto, dueno: 20 - devuelto, via, fecha: new Date(Date.now() + 60_000).toISOString() } })   // cerrado después de aceptar los perfiles

  it('sin alquileres cerrados: dueño con la nota, inquilino sin ella', async () => {
    const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú')
    const d = await pantalla('/perfil/dueno'), i = await pantalla('/perfil/inquilino')
    expect(d).toContain('Todavía no tienes alquileres cerrados.'); expect(d).toContain(NOTA)
    expect(i).toContain('Todavía no tienes alquileres cerrados.'); expect(i).not.toContain(NOTA)
  })
  it('5 cerrados del dueño (3 completos, 2 con reparto) y 2 del inquilino (1 y 1); la insignia no cambia', async () => {
    const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú')
    aceptarRep01('o@x.cr', ['x'])
    mem.set('lockumi.alquileres.v3', JSON.stringify([alq('1', U.email, 'o@x.cr', 20, 'devuelto'), alq('2', U.email, 'o@x.cr', 20, 'devuelto'), alq('3', U.email, 'o@x.cr', 20, 'acuerdo'),
      alq('4', U.email, 'o@x.cr', 10, 'acuerdo'), alq('5', U.email, 'o@x.cr', 5, 'mediacion'), alq('6', 'o@x.cr', U.email, 20, 'devuelto'), alq('7', 'o@x.cr', U.email, 12, 'acuerdo')]))
    const d = await pantalla('/perfil/dueno'), i = await pantalla('/perfil/inquilino')
    expect(d).toContain('De tus 5 alquileres cerrados: 3 con el depósito devuelto completo y 2 con un reparto del depósito (reclamo aceptado o mediación).'); expect(d).toContain(NOTA)
    expect(i).toContain('De tus 2 alquileres cerrados: en 1 recibiste tu depósito completo y en 1 hubo un reparto del depósito (reclamo aceptado o mediación).'); expect(i).not.toContain(NOTA)
    expect(d).not.toContain('depósitos completos'); expect(i).not.toContain('Recibió su depósito completo en')
    expect(d).toContain('Devolvió el depósito completo')   // insignia de textos.ts, igual que antes
  })
})
