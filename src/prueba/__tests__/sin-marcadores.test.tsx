// Ningún marcador de borrador («[REGIÓN: …]», «[PENDIENTE…]», «[CONFIRMAR]», «ABIERTO», «[ALGO: …]») puede verse en la app
// con el interruptor encendido. Pedido de Katherine (24/10, 11:08 p. m.): la B.6 mostraba «[REGIÓN: la elige Katherine]».
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import { ReclamoPC } from '../ReclamoPC'
import { MediacionPC } from '../MediacionPC'
import { ReglaPropuesta, ROTULO_REGLA } from '../Regla'
import { PaginaLegal } from '../../legal/PaginaLegal'

const MARCADOR = /\[(?:REGI[OÓ]N|PENDIENTE|CONFIRMAR|ABIERTO|SERVICIO REAL)[^\]]*\]|\[[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{2,}:[^\]]*\]|\bABIERTO\b/
const T = '2026-10-24T18:00:00.000Z'
const acta = { cuartos: [{ nombre: 'Sala', items: [], fotos: [], nota: '' }], firmas: { dueno: T, inquilino: T } }
const alq = (x: Partial<Alquiler>): Alquiler => ({ id: 'm1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-10-24', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
  estado: 'reclamo', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: acta, salida: acta, entrega: T, ventanaInicio: T, diasSimulados: 0, ...x })
const rubro = { id: 'r1', ref: 0, cantidad: 1, motivo: 'dano' as const, descripcion: 'Mancha', cuarto: 0, fotos: [] }
const rec = { monto: 95, motivo: 'Pintura', fotos: [], fecha: T, entregado: T, pantallaAbierta: T, rubros: [rubro], respuestas: { r1: { acepta: false } } }
afterEach(() => vi.unstubAllEnvs())

describe('sin marcadores visibles (interruptor encendido)', () => {
  it('el patrón reconoce los marcadores', () => {
    for (const m of ['región [REGIÓN: la elige Katherine]', '[PENDIENTE]', '([PENDIENTE: monto y quién lo paga])', '[CONFIRMAR]', 'ABIERTO', '[PAÍS: x]']) expect(m).toMatch(MARCADOR)
    for (const m of ['[Ver el reclamo]', 'Abierto en la app', 'Del 1 oct']) expect(m).not.toMatch(MARCADOR)
  })
  const pantallas: [string, () => string][] = [
    ['B.6 propuesta automática', () => renderToStaticMarkup(<ReclamoPC a={alq({ reclamo: { ...rec, propuesta: { alDueno: 60, fecha: T } } })} rol="inquilino" />)],
    ['reclamo por rubros', () => renderToStaticMarkup(<ReclamoPC a={alq({ reclamo: { ...rec, respuestas: undefined } })} rol="inquilino" />)],
    ['B.7 mediación', () => renderToStaticMarkup(<MediacionPC a={alq({ estado: 'mediacion', reclamo: { ...rec, propuesta: { alDueno: 60, fecha: T, inquilino: 'no' } } })} rol="inquilino" />)],
    ['B.14 mediación pedida', () => renderToStaticMarkup(<MediacionPC a={alq({ estado: 'mediacion', reclamo: { ...rec, mediacion: { estado: 'pedida', fecha: T } } })} rol="dueno" />)],
    ['/terminos (1.7-demo)', () => renderToStaticMarkup(<PaginaLegal slug="terminos" />)],
    ['/privacidad (1.7-demo)', () => renderToStaticMarkup(<PaginaLegal slug="privacidad" />)],
    ['B.1 regla', () => renderToStaticMarkup(<ReglaPropuesta onListo={() => {}} />) + ROTULO_REGLA],
  ]
  for (const [n, f] of pantallas) it(n, () => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); const h = f().replace(/<[^>]+>/g, ' '); expect(h.match(MARCADOR)?.[0] ?? null).toBeNull()
    // Paso 16: las notas internas para Legal (<!-- LEGAL: … -->) nunca se ven, ni dentro de un párrafo.
    expect(h).not.toMatch(/&lt;!--|LEGAL:/) })
  it('ningún texto del código de la app (fuera de comentarios y pruebas) tiene marcadores', async () => {
    const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readdirSync(r: URL, o: { recursive: true }): string[]; readFileSync(r: URL, c: 'utf8'): string }
    const malos: string[] = []
    for (const raiz of [new URL('../../', import.meta.url), new URL('../../../api/', import.meta.url)]) for (const f of fs.readdirSync(raiz, { recursive: true })) {
      if (!/\.tsx?$/.test(f) || f.includes('__tests__')) continue
      fs.readFileSync(new URL(f, raiz), 'utf8').split('\n').forEach((l, i) => {
        const sin = l.replace(/\{\/\*.*?\*\/\}/g, '').replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, '')
        if (MARCADOR.test(sin)) malos.push(`${f}:${i + 1}`)
      })
    }
    expect(malos).toEqual([])
  })
})
