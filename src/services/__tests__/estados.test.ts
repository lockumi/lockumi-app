// Cada estado del flujo tiene su grupo de color en «Tus alquileres» y cada grupo usa solo tonos que ya existían en index.css.
import { describe, it, expect } from 'vitest'
import { GRUPO_ESTADO, ICONO_ESTADO, claseEstado } from '../../estados'
import { ETIQUETA_ESTADO } from '../../types'

// index.css tal cual está en el disco (en las pruebas, Vite no entrega el CSS como texto). El nombre del módulo se arma
// en tiempo de ejecución para no sumar los tipos de Node a la app.
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const css = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

it('lee index.css', () => { expect(css.length).toBeGreaterThan(10000) })
describe('Tus alquileres: un color por estado', () => {
  it.each([
    ['firmas', 'pendiente'], ['pendiente_pago', 'pendiente'], ['fotos_entrada', 'pendiente'], ['salida', 'pendiente'],
    ['en_curso', 'curso'], ['ventana_reclamo', 'curso'],
    ['reclamo', 'reclamo'], ['mediacion', 'reclamo'],
    ['cerrado', 'terminado'],
  ] as const)('%s → %s', (estado, grupo) => {
    expect(GRUPO_ESTADO[estado]).toBe(grupo)
    expect(claseEstado(estado)).toBe('estado--' + grupo)
  })
  it('no queda ningún estado sin grupo ni ícono', () => {
    const estados = Object.keys(ETIQUETA_ESTADO)
    expect(Object.keys(GRUPO_ESTADO).sort()).toEqual([...estados].sort())
    expect(Object.keys(ICONO_ESTADO).sort()).toEqual([...estados].sort())
  })
  it('cada grupo tiene sus 4 tonos (fondo, borde, texto, sello) y una clase en index.css', () => {
    for (const g of new Set(Object.values(GRUPO_ESTADO))) {
      for (const t of ['fondo', 'borde', 'texto', 'sello']) expect(css).toMatch(new RegExp(`--estado-${g}-${t}:`))
      expect(css).toContain(`.estado--${g}{`)
    }
  })
  it('los colores de los estados son tonos que ya existían en la app (sin colores nuevos)', () => {
    const corte = css.indexOf('/* ===== Tus alquileres: un color por estado')
    const hex = (t: string) => new Set((t.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((x: string) => x.toUpperCase()))
    const usados = hex(css.slice(corte)), previos = hex(css.slice(0, corte))
    expect(corte).toBeGreaterThan(0)
    for (const h of usados) expect(previos.has(h), h).toBe(true)
    expect([...usados].sort()).toEqual(['#2F5E56', '#527C78', '#555C58', '#5C4A00', '#8A3030', '#A8C9B8', '#C45C5C', '#C4B48A', '#E0EEE3', '#E5E6DE', '#EEF0EA', '#F3EBD6', '#F6E4E1'])
  })
})
