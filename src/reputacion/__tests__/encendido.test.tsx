// Paso 19 · Reputación ENCENDIDA (VITE_REPUTACION=1): puerta OBLIGATORIA (dueño e inquilino, cada uno con sus casillas), pantallas nuevas
// sin casitas, solo con cantón, sin números de posición, sin «Dejar de mostrar» ni «Mostrar mi puntaje», y eliminación en 5 días hábiles.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const sinNavegador = () => vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const aceptarTodo = async () => { const { guardarDatos, aceptar } = await import('../consentimiento')
  guardarDatos(U.email, 'Demo D.', 'Escazú'); aceptar(U.email, 'dueno', 'perfil', ['x', 'y']); aceptar(U.email, 'inquilino', 'perfil', ['x', 'y']) }
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => { vi.resetModules(); mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); sinNavegador() })

describe('reputación encendida', () => {
  it('Inicio muestra la tarjeta «Tu perfil en Lockumi»', async () => {
    const { Inicio } = await import('../../screens/Inicio')
    const h = renderToStaticMarkup(<Inicio u={U} />)
    expect(h).toContain('Tu perfil en Lockumi'); expect(h).toContain('href="#/perfil"')
  })
  it('OBLIGATORIA: sin aceptar, ninguna pantalla se puede usar; empieza por el nombre visible y el cantón (paso 1 de 3)', async () => {
    for (const r of ['/', '/crear', '/perfil', '/perfil/dueno', '/perfil/vitrina', '/alquiler/x']) {
      const h = await pantalla(r), t = texto(h)
      expect(t).not.toContain('PANTALLA-DE-SIEMPRE'); expect(t).toContain('Paso 1 de 3'); expect(h).toContain('Nombre visible'); expect(h).toContain('Escazú')
      expect(t).not.toMatch(/Ahora no|sin activarlo|Saltar|Mostrar mi puntaje/i); expect(t).toContain('Salir'); expect(t).toContain('Eliminar mi cuenta')
    }
  })
  it('paso 2: perfil de DUEÑO con sus dos casillas propias; paso 3: perfil de INQUILINO con las suyas', async () => {
    const { guardarDatos, aceptar } = await import('../consentimiento')
    guardarDatos(U.email, 'Demo D.', 'Escazú')
    let h = await pantalla('/'), t = texto(h)
    expect(t).toContain('Paso 2 de 3'); expect(t).toContain('Activar mi perfil público de dueño'); expect(h).toContain('rp-rol--dueno')
    expect((h.match(/type="checkbox"/g) ?? []).length).toBe(2); expect(h).not.toMatch(/type="checkbox"[^>]*checked/)
    expect(t).toContain('mayor de 18 años'); expect(t).toContain('público y fijo'); expect(t).toContain('Sin esta aceptación no puedes usar Lockumi')
    expect(t).not.toContain('PANTALLA-DE-SIEMPRE'); expect(t).not.toMatch(/Ahora no|Ajustes/)
    aceptar(U.email, 'dueno', 'perfil', ['x', 'y'])
    h = await pantalla('/'); t = texto(h)
    expect(t).toContain('Paso 3 de 3'); expect(t).toContain('Activar mi perfil público de inquilino'); expect(h).toContain('rp-rol--inquilino')
    expect((h.match(/type="checkbox"/g) ?? []).length).toBe(2); expect(t).not.toContain('PANTALLA-DE-SIEMPRE')
  })
  it('con los dos papeles aceptados, la app se usa igual que siempre', async () => {
    await aceptarTodo()
    expect(texto(await pantalla('/'))).toContain('PANTALLA-DE-SIEMPRE')
    expect(texto(await pantalla('/crear'))).toContain('PANTALLA-DE-SIEMPRE')
  })
  it('«Eliminar mi cuenta» se puede usar sin aceptar (es la forma de no tener reputación)', async () => {
    const t = texto(await pantalla('/perfil/eliminar'))
    expect(t).toContain('5 días hábiles'); expect(t).not.toContain('Paso 1 de 3')
  })
  it('mi perfil: banda ondulada, papel con su ícono, perfil fijo, sin «Dejar de mostrar», «Mostrar mi puntaje» ni «Oro»', async () => {
    await aceptarTodo()
    for (const r of ['/perfil', '/perfil/dueno', '/perfil/inquilino']) {
      const h = await pantalla(r), t = texto(h)
      expect(h).toContain('rp-banda'); expect(h).toContain('M0 128C90 110')
      expect(h).toMatch(/rp-rol--(dueno|inquilino)/)
      expect(t).not.toMatch(/dejar de mostrar|desactiv|mostrar mi puntaje|oro\b|verificad/i)
      expect(t).toContain('Tu perfil es público y fijo.'); expect(t).toContain('Nuevo en Lockumi · 0 alquileres cerrados')
      expect(h).toContain('Eliminar mi cuenta')
    }
  })
  it('vitrina (opcional): una sola pantalla con una casilla y «Ahora no»', async () => {
    await aceptarTodo()
    const h = await pantalla('/perfil/dueno/aparecer'), t = texto(h)
    expect(t).toContain('Aparecer en Nuevos en Lockumi'); expect((h.match(/type="checkbox"/g) ?? []).length).toBe(1); expect(t).toContain('Ahora no')
  })
  it('vitrina: solo cantón, sin barrio ni distancia, sin números de posición, con «Espacio para nuevos» y «Ejemplo»; puntajes siempre visibles desde 3', async () => {
    await aceptarTodo()
    for (const r of ['/perfil/vitrina', '/perfil/vitrina/inquilinos']) {
      const t = texto(await pantalla(r))
      expect(t).toContain('Escazú'); expect(t).toContain('Espacio para nuevos'); expect(t).toContain('Ejemplo'); expect(t).toContain('no es un ranking')
      expect(t).not.toMatch(/barrio [A-ZÁÉÍÓÚ]|\bkm\b|metros|#\d|\bN\.?º|\b\d+\.\s+[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-Z]\./)
      expect(t).not.toMatch(/eligen no mostrar|alquileres cerrados en Lockumi/)
    }
    expect(texto(await pantalla('/perfil/vitrina'))).toContain('3,9 de 5')
    expect(texto(await pantalla('/perfil/vitrina/inquilinos'))).toContain('4,2 de 5')
  })
  it('Llave Lockumi y cómo se calcula (regla por papel, 90 %, 10 años)', async () => {
    await aceptarTodo()
    expect(texto(await pantalla('/perfil/llave'))).toContain('Llave Lockumi')
    const t = texto(await pantalla('/perfil/calculo'))
    expect(t).toContain('Si eres dueño:'); expect(t).toContain('Si eres inquilino:'); expect(t).toContain('90 %'); expect(t).toContain('10 años')
  })
  it('eliminar la cuenta: gratis, 5 días hábiles; después el perfil ya no se muestra', async () => {
    expect(texto(await pantalla('/perfil/eliminar'))).toContain('5 días hábiles')
    const { guardarDatos, aceptar } = await import('../consentimiento'), { pedirBorrado, ejecutarBorrados, perfilDisponible } = await import('../borrado')
    guardarDatos(U.email, 'Demo D.', 'Escazú'); aceptar(U.email, 'dueno', 'perfil', ['x'])
    pedirBorrado(U.email, '2026-10-25T20:00:00Z'); ejecutarBorrados()
    expect(perfilDisponible(U.email)).toBe(false)
    const t = texto(await pantalla('/perfil/eliminar/listo'))
    expect(t).toContain('Listo. Eliminamos tu cuenta.'); expect(t).toContain('30 de octubre de 2026')
  })
})
