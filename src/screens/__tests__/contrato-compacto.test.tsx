// Contrato compacto (maqueta diseno/envio/contrato-compacto, aprobada el 24/10/2026): tarjeta corta (escritorio) y barra compacta
// (celular) que abren el contrato completo en un panel u hoja. Lo que necesita un navegador (abrir, Escape, «Cerrar», foco y deslizar)
// lo revisa scripts/contrato-compacto/capturar.mjs; aquí, el marcado, los textos, el gesto y los estilos.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { ContratoCompacto, PanelContrato, cierraAlDeslizar, TEXTO_VER_CONTRATO, TEXTO_CERRAR, CONSULTA_ESCRITORIO } = await import('../ContratoCompacto')
const { usd, fecha } = await import('../../ui')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const css = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
const detalle = fs.readFileSync(new URL('../Detalle.tsx', import.meta.url), 'utf8')

const A: Alquiler = {
  id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Apartamento en Heredia centro', monto: 20, moneda: 'USDC',
  inicio: '2026-10-24', fin: '2027-10-09', reglas: ['No se permiten mascotas'],
  duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'demo@lockumi.com', estado: 'fotos_entrada', rendimiento: false, historial: [],
  contrato: { firmas: { dueno: '2026-10-24T07:00:00.000Z', inquilino: '2026-10-24T07:00:00.000Z' } }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0,
}
const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1])
const COMPLETO = ['El alquiler', 'Partes', 'Reglas', 'No se permiten mascotas', 'El depósito', 'Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.',
  '7 días para reclamos', 'Mediación', 'Firmas', 'Este contrato se guarda solo en tu navegador. El lugar y las fotos no salen de él.']

describe('contrato compacto: tarjeta (escritorio)', () => {
  const html = renderToStaticMarkup(<ContratoCompacto a={A} como="tarjeta" />)
  const tarjeta = html.slice(0, html.indexOf('<dialog'))
  it('muestra lugar, depósito, fechas y estado', () => {
    for (const [et, v] of [['Lugar', A.direccion], ['Depósito', usd(A.monto)], ['Fechas', `${fecha(A.inicio)} → ${fecha(A.fin)}`], ['Estado', 'Firmado por los dos']])
      expect(tarjeta, et).toMatch(new RegExp(`<dt>${et}</dt><dd>(<span[^>]*>)?${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    expect(renderToStaticMarkup(<ContratoCompacto a={{ ...A, contrato: { firmas: { inquilino: 'x' } } }} como="tarjeta" />)).toContain('Pendiente de firmas')
  })
  it('«Ver contrato» es un botón real que abre un diálogo; el contrato completo no se dibuja hasta abrirlo', () => {
    expect(tarjeta).toMatch(new RegExp(`<button type="button" class="[^"]*cc-ver" aria-haspopup="dialog" aria-expanded="false">${TEXTO_VER_CONTRATO}</button>`))
    expect(html.match(/<dialog/g)).toHaveLength(1)
    expect(html).toContain('cc-panel--lado'); expect(html).not.toContain('cc-panel--hoja')
    expect(html).toContain(`aria-label="${TEXTO_CERRAR}"`)
    expect(html.slice(html.indexOf('<dialog'), html.indexOf('</dialog>'))).not.toContain('pueden tomarlo solos')
  })
  it('sin ids repetidos', () => { const x = ids(html); expect(new Set(x).size).toBe(x.length) })
  it('imprimir con el menú del navegador da el contrato completo (bloque solo para el papel)', () => {
    const papel = html.slice(html.indexOf('<div class="cc-papel"'))
    for (const t of COMPLETO) expect(papel, t).toContain(t)
    expect(papel).not.toContain('cp-abrir'); expect(papel).not.toContain('hidden=""')
  })
})

describe('contrato compacto: barra (celular)', () => {
  const html = renderToStaticMarkup(<ContratoCompacto a={A} como="barra" />)
  it('muestra lugar y depósito y «Ver contrato»; abre una hoja desde abajo', () => {
    expect(html).toContain(`<strong>${A.direccion} · ${usd(A.monto)}</strong>`)
    expect(html).toMatch(new RegExp(`<button type="button" class="cc-barra" aria-haspopup="dialog" aria-expanded="false">.*${TEXTO_VER_CONTRATO}</span></button>`))
    expect(html.match(/<dialog/g)).toHaveLength(1); expect(html).toContain('cc-panel--hoja'); expect(html).toContain('cc-panel__asa')
    const x = ids(html); expect(new Set(x).size).toBe(x.length)
  })
  it('el panel abierto tiene el contrato completo y «Descargar o imprimir»', () => {
    const abierto = renderToStaticMarkup(<PanelContrato a={A} abierto hoja onCerrar={() => {}} />)
    for (const t of [...COMPLETO, 'Descargar o imprimir']) expect(abierto, t).toContain(t)
    expect(abierto).not.toContain('Ver contrato completo')
  })
  it('deslizar hacia abajo: cierra si baja más de 120 px o con un gesto rápido', () => {
    expect(cierraAlDeslizar(121, 2000)).toBe(true); expect(cierraAlDeslizar(100, 2000)).toBe(false)
    expect(cierraAlDeslizar(60, 80)).toBe(true); expect(cierraAlDeslizar(30, 20)).toBe(false); expect(cierraAlDeslizar(0, 0)).toBe(false)
  })
})

describe('contrato compacto: pantalla y estilos', () => {
  it('Detalle dibuja una sola variante según el ancho (tarjeta o barra) y ya no el contrato entero en la columna', () => {
    expect(detalle).toContain(`escritorio && <ContratoCompacto a={a} como="tarjeta" />`)
    expect(detalle).toContain(`!escritorio && <div className="cc-arriba" inert={!!ejemplo}><ContratoCompacto a={a} como="barra" />`)
    expect(detalle).not.toMatch(/detalle__lado[\s\S]*<ContratoDoc a=\{a\} \/>[\s\S]*<\/aside>/)
    expect(CONSULTA_ESCRITORIO).toBe('(min-width: 960px)'); expect(css).toContain('@media (min-width:960px){.detalle{grid-template-columns')
  })
  it('columna fija bajo el aviso (48 px) y nunca más alta que la pantalla', () => {
    expect(css).toMatch(/@media \(min-width:960px\)\{\.detalle__lado\{top:48px;max-height:calc\(100vh - 64px\);overflow:auto/)
  })
  it('letra de 14 px o más, sin animación con «reducir movimiento» y el panel no sale en el papel', () => {
    const reglas = css.slice(css.indexOf('/* ===== Contrato compacto'))
    for (const m of reglas.matchAll(/font:\d+ (\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14)
    expect(reglas).toMatch(/prefers-reduced-motion:reduce\)\{\.cc-panel\[open\]\{animation:none\}/)
    expect(reglas).toMatch(/\.cc-panel\{display:none!important\}/)
  })
})

// LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide.
describe('Mediación en el contrato', () => {
  it('la persona mediadora ayuda a buscar un acuerdo; no decide por ustedes', () => {
    const t = renderToStaticMarkup(<PanelContrato a={A} abierto onCerrar={() => {}} hoja={false} />)
    expect(t).toContain('Si no se ponen de acuerdo, una persona mediadora revisa con ustedes las fotos de entrada y de salida y les ayuda a buscar un acuerdo sobre el reparto del depósito. No decide por ustedes.')
    expect(t).not.toMatch(/mediadora[^.]*decide cómo/)
  })
  // LEGAL: revisado (24/10) · ronda 2: el depósito ya no promete «ni Lockumi» y los botones registran el acuerdo, no deciden.
  it('ronda 2 de Legal: depósito, botones de la persona mediadora y comprobante', async () => {
    const doc = fs.readFileSync(new URL('../ContratoDoc.tsx', import.meta.url), 'utf8')
    expect(doc).toContain('Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.')
    expect(doc).not.toContain('ni Lockumi')
    for (const t of ["'Registrar el acuerdo'", "'Demo: registrar el acuerdo'", 'Te avisaremos cuando haya un acuerdo.']) expect(detalle).toContain(t)
    expect(detalle).not.toMatch(/Decidir como mediador|decidir como mediador|: 'Decidir'\)|haya una decisión/)
    const { NOMBRE_PASO } = await import('../../services/comprobantes')
    expect(NOMBRE_PASO.resolucion).toBe('Reparto del depósito')
    expect(fs.readFileSync(new URL('../../acciones.ts', import.meta.url), 'utf8')).not.toContain('mediadora decidió')
  })
})
