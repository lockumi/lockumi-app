import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} })

const { NOTA_TITULO } = await import('../Login')
const { PASOS_RECORRIDO } = await import('../../recorrido')
const { NOTA_AYUDA, PREGUNTAS, RESPUESTA_RENDIMIENTO, preguntasVisibles } = await import('../ayuda-datos')
const { Ayuda } = await import('../Ayuda')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const suscripcion = fs.readFileSync(new URL('../../prueba/SuscripcionPC.tsx', import.meta.url), 'utf8').replace(/<[^>]+>/g, '')

const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }

describe('ayuda mínima', () => {
  it('copia textos vigentes y deja el conjunto señalado para revisión legal', () => {
    expect(PREGUNTAS.find(p => p.id === 'seguro')!.respuesta).toBe(NOTA_TITULO)
    expect(PREGUNTAS.find(p => p.id === 'guarda')!.respuesta).toBe(PASOS_RECORRIDO[0].texto)
    expect(PREGUNTAS.find(p => p.id === 'fotos')!.respuesta).toBe(PASOS_RECORRIDO[3].texto)
    expect(PREGUNTAS.find(p => p.id === 'acuerdo')!.respuesta).toBe(PASOS_RECORRIDO[5].texto)
    expect(suscripcion).toContain(RESPUESTA_RENDIMIENTO)
    expect(RESPUESTA_RENDIMIENTO).not.toMatch(/\d\s*%|ganarás|garantizado al/)
    expect(NOTA_AYUDA).toMatch(/Pendiente de revisión legal antes de producción/)
  })
  it('los filtros solo muestran u ocultan esas preguntas', () => {
    expect(preguntasVisibles(null).map(p => p.id)).toEqual(['seguro', 'guarda', 'rendimiento', 'fotos', 'acuerdo'])
    expect(preguntasVisibles('fotos').map(p => p.id)).toEqual(['fotos'])
    expect(preguntasVisibles('mediacion').map(p => p.id)).toEqual(['acuerdo'])
    expect(preguntasVisibles('reclamos').map(p => p.id)).toEqual(['acuerdo'])
    expect(preguntasVisibles('deposito').map(p => p.id)).toEqual(['seguro', 'guarda', 'rendimiento'])
  })
  it('la pantalla abre el recorrido que ya existe y enlaza los documentos', () => {
    const h = renderToStaticMarkup(<Ayuda u={U} />)
    expect(h).toContain('Ver el recorrido')
    expect(h).toContain(NOTA_AYUDA)
    expect(h).toContain('¿Lockumi es un seguro?')
    expect(h).toContain('href="/terminos"')
    expect(h).toContain('href="#/terminos"')
    expect(h).toContain('aria-pressed="false"')
    expect(h).not.toMatch(/te recomiendo|deberías|ganarás/)
  })
})
