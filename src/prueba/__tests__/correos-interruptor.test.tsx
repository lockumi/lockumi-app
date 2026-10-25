// paso16-unido · Los correos del paso 11 tienen su propio interruptor (VITE_CORREOS=1, con la prueba completa). Apagado, la app no
// ofrece «Recibir los avisos por correo» (y los textos legales no hablan de correos: unificado-17.test.ts).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import { correosActivos } from '../interruptor'
import { PlazoDueno } from '../PlazoDueno'
afterEach(() => vi.unstubAllEnvs())

const alq = (): Alquiler => ({ id: 'c1', direccion: 'Casa', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2026-11-30', reglas: [], duenoEmail: 'd@x.com', inquilinoEmail: 'i@x.com',
  estado: 'ventana_reclamo', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, entrega: '2026-11-30T18:00:00.000Z', terminos: { version: '1.7-demo' } })
const ver = () => renderToStaticMarkup(<PlazoDueno a={alq()} rol="inquilino" reclamo={() => null} />)

describe('interruptor de los correos', () => {
  it('solo con la prueba completa y VITE_CORREOS=1', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_CORREOS', ''); expect(correosActivos()).toBe(false)
    vi.stubEnv('VITE_CORREOS', '1'); expect(correosActivos()).toBe(true)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0'); expect(correosActivos()).toBe(false)
  })
  it('apagado: no aparece «Recibir los avisos por correo»; encendido, sí', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_CORREOS', '0')
    expect(ver()).not.toContain('Recibir los avisos por correo')
    vi.stubEnv('VITE_CORREOS', '1')
    expect(ver()).toContain('Recibir los avisos por correo')
  })
})
