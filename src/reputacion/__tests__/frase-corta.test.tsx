// Reputación · frase corta de «Solo tú ves esto» (opción B de Legal, aprobada por Katherine el 27/10/2026, 4:52 p. m. CR).
// Textos literales por caso (Legal, aprobados 27/10/2026, 5:03 p. m. CR). «Completo» = fraccionDescontada === 0.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'
import { UI } from '../textos'

const NOTA = 'Un reparto no baja tu puntaje, salvo que se haya devuelto al inquilino el 90 % o más de lo que reclamaste (cláusula 15.3).'

// Casos de Legal aprobados por Katherine el 27/10/2026, 5:03 p. m. CR: un test por caso, textos literales.
const R = 'un reparto del depósito (reclamo aceptado o mediación)'
describe('Dueño', () => {
  it('t = 0', () => { expect(UI.devolvioDe(0, 0)).toBe('Todavía no tienes alquileres cerrados.') })
  it('t = 1, completo', () => { expect(UI.devolvioDe(1, 1)).toBe('Tu único alquiler cerrado terminó con el depósito devuelto completo al inquilino.') })
  it('t = 1, reparto', () => { expect(UI.devolvioDe(0, 1)).toBe(`Tu único alquiler cerrado terminó con ${R}.`) })
  it('t ≥ 2, todos completos (nunca «0 con…»)', () => { expect(UI.devolvioDe(5, 5)).toBe('Tus 5 alquileres cerrados terminaron con el depósito devuelto completo.') })
  it('t ≥ 2, todos con reparto (nunca «0 con…»)', () => { expect(UI.devolvioDe(0, 3)).toBe(`Tus 3 alquileres cerrados terminaron con ${R}.`) })
  it('mixta, varios', () => { expect(UI.devolvioDe(3, 5)).toBe(`De tus 5 alquileres cerrados: 3 con el depósito devuelto completo y 2 con ${R}.`) })
  it('mixta, una parte que vale 1 se queda como está', () => {
    expect(UI.devolvioDe(1, 2)).toBe(`De tus 2 alquileres cerrados: 1 con el depósito devuelto completo y 1 con ${R}.`)
    expect(UI.devolvioDe(4, 5)).toBe(`De tus 5 alquileres cerrados: 4 con el depósito devuelto completo y 1 con ${R}.`)
  })
  it('nota 15.3, literal', () => { expect(UI.notaReparto).toBe(NOTA) })
  it('nunca la redacción propia ni «0 con»', () => {
    for (let t = 0; t <= 6; t++) for (let c = 0; c <= t; c++) { const x = UI.devolvioDe(c, t); expect(x).not.toMatch(/De tu 1 alquiler|\b0 con|\b1 alquileres/) }
  })
})

describe('Inquilino', () => {
  it('t = 0', () => { expect(UI.recibioDe(0, 0)).toBe('Todavía no tienes alquileres cerrados.') })
  it('t = 1, completo', () => { expect(UI.recibioDe(1, 1)).toBe('En tu único alquiler cerrado recibiste tu depósito completo.') })
  it('t = 1, reparto', () => { expect(UI.recibioDe(0, 1)).toBe(`En tu único alquiler cerrado hubo ${R}.`) })
  it('t ≥ 2, todos completos', () => { expect(UI.recibioDe(5, 5)).toBe('En tus 5 alquileres cerrados recibiste tu depósito completo.') })
  it('t ≥ 2, todos con reparto', () => { expect(UI.recibioDe(0, 3)).toBe(`En tus 3 alquileres cerrados hubo ${R}.`) })
  it('mixta, varios', () => { expect(UI.recibioDe(3, 5)).toBe(`De tus 5 alquileres cerrados: en 3 recibiste tu depósito completo y en 2 hubo ${R}.`) })
  it('mixta, una parte que vale 1 se queda como está', () => {
    expect(UI.recibioDe(1, 2)).toBe(`De tus 2 alquileres cerrados: en 1 recibiste tu depósito completo y en 1 hubo ${R}.`)
    expect(UI.recibioDe(1, 4)).toBe(`De tus 4 alquileres cerrados: en 1 recibiste tu depósito completo y en 3 hubo ${R}.`)
  })
  it('nunca la redacción propia ni «en 0»', () => {
    for (let t = 0; t <= 6; t++) for (let c = 0; c <= t; c++) expect(UI.recibioDe(c, t)).not.toMatch(/De tu 1 alquiler|\ben 0\b|\b1 alquileres/)
  })
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

  const aceptar = async () => { const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú'); aceptarRep01('o@x.cr', ['x']) }
  const sembrar = (...xs: ReturnType<typeof alq>[]) => mem.set('lockumi.alquileres.v3', JSON.stringify(xs))

  it('t = 0: la frase, SIN la nota 15.3 (dueño e inquilino)', async () => {
    await aceptar()
    const d = await pantalla('/perfil/dueno'), i = await pantalla('/perfil/inquilino')
    expect(d).toContain('Todavía no tienes alquileres cerrados.'); expect(d).not.toContain(NOTA)
    expect(i).toContain('Todavía no tienes alquileres cerrados.'); expect(i).not.toContain(NOTA)
  })
  it('dueño t = 1 completo: sin la nota', async () => {
    await aceptar(); sembrar(alq('1', U.email, 'o@x.cr', 20, 'devuelto'))
    const d = await pantalla('/perfil/dueno')
    expect(d).toContain('Tu único alquiler cerrado terminó con el depósito devuelto completo al inquilino.'); expect(d).not.toContain(NOTA)
  })
  it('dueño t = 1 reparto: con la nota', async () => {
    await aceptar(); sembrar(alq('1', U.email, 'o@x.cr', 10, 'acuerdo'))
    const d = await pantalla('/perfil/dueno')
    expect(d).toContain(`Tu único alquiler cerrado terminó con ${R}.`); expect(d).toContain(NOTA)
  })
  it('dueño t ≥ 2 todos completos: sin la nota', async () => {
    await aceptar(); sembrar(alq('1', U.email, 'o@x.cr', 20, 'devuelto'), alq('2', U.email, 'o@x.cr', 20, 'acuerdo'))
    const d = await pantalla('/perfil/dueno')
    expect(d).toContain('Tus 2 alquileres cerrados terminaron con el depósito devuelto completo.'); expect(d).not.toContain(NOTA)
  })
  it('5 cerrados del dueño (3 completos, 2 con reparto) y 2 del inquilino (1 y 1): nota solo al dueño; la insignia no cambia', async () => {
    await aceptar()
    sembrar(alq('1', U.email, 'o@x.cr', 20, 'devuelto'), alq('2', U.email, 'o@x.cr', 20, 'devuelto'), alq('3', U.email, 'o@x.cr', 20, 'acuerdo'),
      alq('4', U.email, 'o@x.cr', 10, 'acuerdo'), alq('5', U.email, 'o@x.cr', 5, 'mediacion'), alq('6', 'o@x.cr', U.email, 20, 'devuelto'), alq('7', 'o@x.cr', U.email, 12, 'acuerdo'))
    const d = await pantalla('/perfil/dueno'), i = await pantalla('/perfil/inquilino')
    expect(d).toContain(`De tus 5 alquileres cerrados: 3 con el depósito devuelto completo y 2 con ${R}.`); expect(d).toContain(NOTA)
    expect(i).toContain(`De tus 2 alquileres cerrados: en 1 recibiste tu depósito completo y en 1 hubo ${R}.`); expect(i).not.toContain(NOTA)
    expect(d).not.toContain('depósitos completos'); expect(i).not.toContain('Recibió su depósito completo en')
    expect(d).toContain('Devolvió el depósito completo')   // insignia de textos.ts, igual que antes
  })
})
