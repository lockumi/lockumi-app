// Con VITE_DOS_PERSONAS apagado (producción), un alquiler que diga dosPersonas (por ejemplo, guardado de antes en el navegador)
// se ve igual que hoy: el contrato no cambia de texto. Lo encontró la comparación píxel a píxel antes de publicar el paso 7.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { Documento } = await import('../../screens/ContratoDoc')
const { TEXTO_GUARDA_DOS } = await import('../dosPersonas')

const A: Alquiler = { id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Casa', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-11-01', reglas: [],
  duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'inquilino.prueba@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0 }

describe('modo de dos personas apagado', () => {
  it('el contrato de un alquiler marcado dosPersonas se ve igual que el de hoy', () => {
    expect(renderToStaticMarkup(<Documento a={{ ...A, dosPersonas: true }} impresion />)).toBe(renderToStaticMarkup(<Documento a={A} impresion />))
    const html = renderToStaticMarkup(<Documento a={{ ...A, dosPersonas: true }} impresion />)
    expect(html).toContain('Este contrato se guarda solo en tu navegador'); expect(html).not.toContain(TEXTO_GUARDA_DOS)
  })
})
