import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} })

const { Navegacion } = await import('../Navegacion')
const { Barra } = await import('../../ui')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const app = fs.readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
const ayuda = fs.readFileSync(new URL('../Ayuda.tsx', import.meta.url), 'utf8')
const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }

describe('navegación de perfil, avisos y ayuda', () => {
  it('la barra tiene Inicio, Avisos, Alquileres y Perfil; Ayuda no está en la barra', () => {
    const inicio = renderToStaticMarkup(<Navegacion r="/" />)
    expect(inicio).toContain('>Inicio<')
    expect(inicio).toContain('>Avisos<')
    expect(inicio).toContain('>Alquileres<')
    expect(inicio).toContain('>Perfil<')
    expect(inicio).not.toContain('>Ayuda<')
    expect(inicio).not.toContain('href="#/ayuda"')
    expect(inicio.match(/aria-current="page"/g)).toHaveLength(1)
    expect(inicio).toContain('href="#/" aria-current="page"')
    const enAlquiler = renderToStaticMarkup(<Navegacion r="/alquiler/a2" />)
    expect(enAlquiler.match(/aria-current="page"/g)).toHaveLength(1)
    const marcado = enAlquiler.slice(enAlquiler.indexOf('aria-current="page"'))
    expect(marcado.startsWith('aria-current="page"')).toBe(true)
    expect(marcado.slice(0, 900)).toContain('>Alquileres<')
    expect(marcado.slice(0, 900)).not.toContain('>Inicio<')
    expect(renderToStaticMarkup(<Navegacion r="/perfil/llave" />)).toContain('href="#/perfil" aria-current="page"')
    expect(renderToStaticMarkup(<Navegacion r="/avisos" />)).toContain('href="#/avisos" aria-current="page"')
  })
  it('Inicio y Alquileres abren rutas distintas y el listado sigue siendo el de siempre', () => {
    const html = renderToStaticMarkup(<Navegacion r="/" />)
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1])
    expect(hrefs).toEqual(['#/', '#/avisos', '#/alquileres', '#/perfil'])
    const enLista = renderToStaticMarkup(<Navegacion r="/alquileres" />)
    expect(enLista).toContain('href="#/alquileres" aria-current="page"')
    expect(enLista).not.toContain('href="#/" aria-current="page"')
    expect(app).toContain("r === '/alquileres' ? <Inicio")
    expect(app).toContain('<ResumenInicio')
  })
  it('la cabecera abre Ayuda con un icono vectorial, sin campana ni texto visible', () => {
    const h = renderToStaticMarkup(<Barra u={U} onSalir={() => {}} r="/ayuda" />)
    expect(h).toContain('href="#/ayuda"')
    expect(h).toContain('aria-label="Ayuda"')
    expect(h).toContain('aria-current="page"')
    expect(h).toContain('<circle')
    expect(h).not.toContain('nav-campana')
    expect(h).not.toContain('aria-label="Avisos"')
    expect(h).not.toContain('¿Cómo funciona?')
    expect(h).not.toContain('>?<')
    expect(h).toContain('aria-label="Salir"')
    expect(app).toContain('className="app-cuerpo"')
    expect(app).toContain('<Navegacion r={r} className="nav-app--pie" />')
    expect(app).toContain("r === '/ayuda'")
    expect(ayuda).toContain('abrirRecorrido(u')
    expect(ayuda).toContain('Ver el recorrido')
  })
})
