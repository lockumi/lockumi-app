// Contrato plegable (maqueta producto/contrato-plegable): cerrado por defecto, se abre y se cierra con un botón real
// (aria-expanded / aria-controls / hidden) y la versión para imprimir o guardar como PDF es siempre la completa.
// Desde el 24/10/2026 (contrato compacto) el detalle del alquiler ya no muestra este contrato plegable en la columna derecha: lo
// muestra entero dentro del panel «Ver contrato» (ver contrato-compacto.test.tsx). Lo plegable sigue en la pantalla de firma.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import type { Alquiler } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { ContratoDoc, Documento, TEXTO_VER, TEXTO_OCULTAR, TEXTO_CONTENIDO } = await import('../ContratoDoc')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const css = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

const A: Alquiler = {
  id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Apartamento en Barreal de Heredia', monto: 20, moneda: 'USDC',
  inicio: '2026-10-19', fin: '2027-04-19', reglas: ['No se permiten mascotas', 'No fumar dentro del apartamento'],
  duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [],
  contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0,
}
const SIEMPRE = ['Contrato', 'Pendiente de firmas', 'Referencia 3F2A9C1B', 'El alquiler', 'Apartamento en Barreal de Heredia', 'Partes', 'demo@lockumi.com',
  'Este contrato se guarda solo en tu navegador. El lugar y las fotos no salen de él.', 'Descargar o imprimir']
const PLEGADO = ['Reglas', 'No se permiten mascotas', 'El depósito', 'Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.',
  '7 días para reclamos', 'Mediación', 'Si no se ponen de acuerdo, una persona mediadora revisa con ustedes las fotos', 'Firmas', 'Pendiente</span>']

/** Parte el HTML en lo que queda a la vista y lo que está dentro del bloque plegado (`<div class="cp-completo" …>`). */
const partir = (html: string) => {
  const i = html.indexOf('<div class="cp-completo"'), j = html.indexOf('<footer class="ct__pie">')
  return { region: html.slice(i, j), visible: html.slice(0, i) + html.slice(j) }
}
/** Busca el botón en el árbol que devuelve Documento (sin DOM: se llama al componente como función). */
const buscarBoton = (n: ReactNode): ReactElement<{ onClick: () => void }> | null => {
  if (Array.isArray(n)) { for (const x of n) { const r = buscarBoton(x); if (r) return r } return null }
  if (!isValidElement(n)) return null
  const p = n.props as { className?: string; children?: ReactNode }
  if (n.type === 'button' && p.className === 'cp-abrir') return n as ReactElement<{ onClick: () => void }>
  return buscarBoton(p.children)
}

describe('contrato plegable', () => {
  it('empieza cerrado: botón real con aria-expanded="false" que apunta al bloque oculto', () => {
    const html = renderToStaticMarkup(<ContratoDoc a={A} />)
    const b = html.match(/<button type="button" class="cp-abrir" aria-expanded="(\w+)" aria-controls="([^"]+)">/)
    expect(b, 'botón').not.toBeNull()
    expect(b![1]).toBe('false')
    expect(html).toContain(`<div class="cp-completo" id="${b![2]}" role="region" aria-label="Contrato completo" hidden="">`)
    expect(html).toContain(TEXTO_VER); expect(html).toContain(`<small>${TEXTO_CONTENIDO}</small>`); expect(html).not.toContain(TEXTO_OCULTAR)
  })
  it('cerrado: el resumen, el pie y «Descargar o imprimir» quedan a la vista; Reglas, depósito, reclamos, mediación y firmas, plegados', () => {
    const { region, visible } = partir(renderToStaticMarkup(<ContratoDoc a={A} />))
    for (const t of SIEMPRE) expect(visible, t).toContain(t)
    for (const t of PLEGADO) { expect(region, t).toContain(t); expect(visible, t).not.toContain('<h3>' + t + '</h3>') }
    expect(region).not.toContain('Este contrato se guarda solo en tu navegador')
  })
  it('el botón abre y cierra: alterna el estado y cambia el texto, aria-expanded y hidden', () => {
    const alternar = vi.fn()
    const boton = buscarBoton(Documento({ a: A, plegado: { abierto: false, alternar, id: 'x' } }))
    expect(boton).not.toBeNull(); boton!.props.onClick(); expect(alternar).toHaveBeenCalledTimes(1)
    const abierto = renderToStaticMarkup(<Documento a={A} plegado={{ abierto: true, alternar, id: 'x' }} />)
    expect(abierto).toContain('aria-expanded="true" aria-controls="x"'); expect(abierto).toContain(TEXTO_OCULTAR)
    expect(abierto).toContain('<div class="cp-completo" id="x" role="region" aria-label="Contrato completo">')
    const cerrado = renderToStaticMarkup(<Documento a={A} plegado={{ abierto: false, alternar, id: 'x' }} />)
    expect(cerrado).toContain('aria-expanded="false"'); expect(cerrado).toContain('aria-label="Contrato completo" hidden=""')
  })
  it('la versión para imprimir es siempre la completa, sin botón ni partes ocultas', () => {
    const html = renderToStaticMarkup(<Documento a={A} impresion plegado={{ abierto: false, alternar: () => {}, id: 'x' }} />)
    expect(html).toContain('ct--impresion'); expect(html).not.toContain('cp-abrir'); expect(html).not.toContain('hidden')
    for (const t of [...SIEMPRE.filter(t => t !== 'Descargar o imprimir'), ...PLEGADO]) expect(html, t).toContain(t)
  })
  it('al imprimir con el menú del navegador, @media print muestra lo plegado y oculta el botón', () => {
    const print = css.slice(css.indexOf('@media print{'))
    expect(print).toMatch(/\.cp-completo\[hidden\]\{display:block!important\}/)
    expect(print).toMatch(/\.cp-abrir\{display:none!important\}/)
  })
  it('estilos: área táctil de 56 px, letra de 14 px o más y solo variables de la app', () => {
    const reglas = css.split('\n').filter(l => l.startsWith('.cp-') || l.startsWith('  background:var(--fondo)')).join('\n')
    expect(reglas).toContain('min-height:56px')
    for (const m of reglas.matchAll(/font:\d+ (\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14)
    expect(reglas.match(/#[0-9A-Fa-f]{3,6}\b/g) ?? []).toEqual(['#fff', '#fff'])
  })
})
