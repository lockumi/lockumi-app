import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} })

const { Navegacion } = await import('../Navegacion')
const { Barra } = await import('../../ui')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const app = fs.readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }

describe('navegación de perfil, avisos y ayuda', () => {
  it('la barra inferior marca la sección y no reemplaza Inicio', () => {
    const inicio = renderToStaticMarkup(<Navegacion r="/" />)
    expect(inicio).toContain('href="#/"')
    expect(inicio).toContain('href="#/avisos"')
    expect(inicio).toContain('href="#/ayuda"')
    expect(inicio).toContain('href="#/perfil"')
    expect(inicio).toContain('aria-current="page"')
    expect(inicio.match(/aria-current="page"/g)).toHaveLength(1)
    const ayuda = renderToStaticMarkup(<Navegacion r="/ayuda" />)
    expect(ayuda).toContain('href="#/ayuda" aria-current="page"')
    expect(renderToStaticMarkup(<Navegacion r="/perfil/llave" />)).toContain('href="#/perfil" aria-current="page"')
  })
  it('la cabecera suma la campana y conserva correo, recorrido y Salir', () => {
    const h = renderToStaticMarkup(<Barra u={U} onSalir={() => {}} r="/avisos" />)
    expect(h).toContain('katherine@ejemplo.cr')
    expect(h).toContain('aria-label="Avisos"')
    expect(h).toContain('href="#/avisos"')
    expect(h).toContain('aria-current="page"')
    expect(h).toContain('aria-label="¿Cómo funciona?"')
    expect(h).toContain('aria-label="Salir"')
    expect(app).toContain('className="app-cuerpo"')
    expect(app).toContain('<Navegacion r={r} className="nav-app--pie" />')
    expect(app).toContain("r === '/perfil'")
    expect(app).toContain("r === '/avisos'")
    expect(app).toContain("r === '/ayuda'")
  })
})
