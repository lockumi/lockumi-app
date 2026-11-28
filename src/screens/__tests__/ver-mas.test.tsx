// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { VerMas } = await import('../Plegable')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: string, c: 'utf8'): string }

describe('Ver detalles', () => {
  it('el primer render no muestra el texto y el botón declara el estado', () => {
    const html = renderToStaticMarkup(createElement(VerMas, null, createElement('p', null, 'El depósito sigue guardado.')))
    const b = html.match(/<button type="button" class="cp-abrir" aria-expanded="false" aria-controls="([^"]+)"><span class="cp-abrir__txt">Ver detalles<\/span>/)
    expect(b).toBeTruthy()
    expect(html).toContain(`<div class="cp-completo" id="${b![1]}" role="region" aria-label="Ver detalles" hidden=""><p>El depósito sigue guardado.</p></div>`)
    const css = fs.readFileSync(process.cwd() + '/src/index.css', 'utf8')
    expect(css).toContain('.cp-completo[hidden]{display:none}')
    expect(css).toContain('.cp-completo:not([hidden]),.na-pliegue[open]>.na-pliegue__cuerpo{animation:none}')
  })
  it('al tocar, aria-expanded pasa a verdadero y el texto deja de estar hidden', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root: Root = createRoot(el)
    act(() => { root.render(createElement(VerMas, { etiqueta: 'Ver más' }, createElement('p', null, 'La persona invitada entra como inquilino.'))) })
    const boton = el.querySelector('button')!
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(el.querySelector('.cp-completo')?.hasAttribute('hidden')).toBe(true)
    act(() => { boton.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    expect(el.querySelector('.cp-completo')?.hasAttribute('hidden')).toBe(false)
    expect(el.textContent).toContain('La persona invitada entra como inquilino.')
    act(() => { root.unmount() })
    el.remove()
  })
})
