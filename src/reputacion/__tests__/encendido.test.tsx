// Paso 19 · Reputación ENCENDIDA (VITE_REPUTACION=1): las pantallas nuevas, sin casitas, solo con cantón, sin números de posición,
// sin «Dejar de mostrar» y con la eliminación de la cuenta en 5 días hábiles.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const sinNavegador = () => vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={U} r={r} salir={() => {}} />) }
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => { vi.resetModules(); mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); sinNavegador() })

describe('reputación encendida', () => {
  it('Inicio muestra la tarjeta «Tu perfil en Lockumi»', async () => {
    const { Inicio } = await import('../../screens/Inicio')
    const h = renderToStaticMarkup(<Inicio u={U} />)
    expect(h).toContain('Tu perfil en Lockumi'); expect(h).toContain('href="#/perfil"')
  })
  it('mi perfil: banda ondulada, papel con su ícono, sin «Dejar de mostrar» ni «Oro»', async () => {
    for (const r of ['/perfil', '/perfil/dueno', '/perfil/inquilino']) {
      const h = await pantalla(r)
      expect(h).toContain('rp-banda'); expect(h).toContain('M0 128C90 110')
      expect(h).toMatch(/rp-rol--(dueno|inquilino)/)
      expect(texto(h)).not.toMatch(/dejar de mostrar|desactiv|oro\b|verificad/i)
      expect(h).toContain('Eliminar mi cuenta')
    }
  })
  it('hacer público: un paso por pantalla, con las dos casillas separadas', async () => {
    const h1 = await pantalla('/perfil/dueno/publicar/1')
    expect(texto(h1)).toContain('Paso 1 de 5'); expect(h1).toContain('Nombre visible'); expect(h1).toContain('Escazú')
    const h2 = await pantalla('/perfil/inquilino/publicar/2')
    expect(texto(h2)).toContain('Paso 2 de 5'); expect((h2.match(/type="checkbox"/g) ?? []).length).toBe(2)
    expect(texto(h2)).toContain('mayor de 18 años'); expect(texto(h2)).not.toMatch(/Ajustes|dejar de mostrar/i)
  })
  it('vitrina: solo cantón, sin barrio ni distancia, sin números de posición, con «Espacio para nuevos» y «Ejemplo»', async () => {
    for (const r of ['/perfil/vitrina', '/perfil/vitrina/inquilinos']) {
      const t = texto(await pantalla(r))
      expect(t).toContain('Escazú'); expect(t).toContain('Espacio para nuevos'); expect(t).toContain('Ejemplo'); expect(t).toContain('no es un ranking')
      expect(t).not.toMatch(/barrio [A-ZÁÉÍÓÚ]|\bkm\b|metros|#\d|\bN\.?º|\b\d+\.\s+[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-Z]\./)
    }
  })
  it('Llave Lockumi y cómo se calcula (con la regla de los dueños y los 10 años)', async () => {
    expect(texto(await pantalla('/perfil/llave'))).toContain('Llave Lockumi')
    const t = texto(await pantalla('/perfil/calculo'))
    expect(t).toContain('Para los dueños'); expect(t).toContain('10 años')
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
