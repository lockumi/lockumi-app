import { describe, it, expect } from 'vitest'
import { store } from '../../store'
import { etapaDe, pasoTexto } from '../../flujo'
import { ordenarInicio, teToca } from '../inicio-lista'

describe('Inicio: la tarjeta grande sale del flujo, no del dibujo', () => {
  const email = 'katherine@ejemplo.cr'
  const lista = store.todos()

  it('en la semilla te toca firmar la casa, no el alquiler que ya está en curso', () => {
    const curso = lista.find(a => a.id === 'a1')!
    const firmas = lista.find(a => a.id === 'a2')!
    expect(teToca(curso, email)).toBe(false)
    expect(teToca(firmas, email)).toBe(true)
    expect(ordenarInicio(lista, email).principal?.id).toBe('a2')
    expect(pasoTexto(firmas)).toBe(`Paso ${etapaDe(firmas) + 1} de 8`)
  })

  it('sin pendientes, la primera de la lista queda grande', () => {
    const solo = lista.filter(a => a.id === 'a1')
    expect(ordenarInicio(solo, email).principal?.id).toBe('a1')
    expect(ordenarInicio([], email)).toEqual({ principal: null, resto: [] })
  })
})
