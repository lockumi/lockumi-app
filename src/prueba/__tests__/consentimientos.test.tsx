// Paso 16: consentimiento en el momento de usar cada función. Mediación: casilla sin marcar dentro de la B.7 y registro (cuenta,
// alquiler, versión, texto y fecha) al pedirla. Correos: solo el gancho; la casilla es del paso 11 (wt-paso11).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import { registrarConsentimiento, consentimientoCorreo, CASILLA_MEDIACION } from '../consentimientos'
import { MediacionPC } from '../MediacionPC'
afterEach(() => vi.unstubAllEnvs())
const T = '2026-10-24T18:00:00.000Z'
const acta = { cuartos: [], firmas: { dueno: T, inquilino: T } }
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'c1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-10-24', reglas: [], duenoEmail: 'd@x', inquilinoEmail: 'i@x',
  estado: 'mediacion', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: acta, diasSimulados: 0, terminos: { version: '1.7-demo' },
  reclamo: { monto: 95, motivo: 'x', fotos: [], fecha: T }, ...x })

describe('consentimiento al usar la función', () => {
  it('registro de la mediación: cuenta, alquiler, versión del alquiler, texto exacto y fecha', () => {
    const x = alq()
    const c = registrarConsentimiento(x, 'mediacion', 'inquilino', CASILLA_MEDIACION, +new Date(T))
    expect(c).toEqual({ tipo: 'mediacion', cuenta: 'i@x', rol: 'inquilino', alquiler: 'c1', version: '1.7-demo', texto: CASILLA_MEDIACION, fecha: T })
    expect(x.consentimientos).toEqual([c])
  })
  it('gancho para los correos (paso 11): mismo registro con tipo «correo»', () => {
    const x = alq(); const c = consentimientoCorreo(x, 'dueno', 'Quiero recibir los avisos por correo.', +new Date(T))
    expect(c.tipo).toBe('correo'); expect(c.cuenta).toBe('d@x'); expect(x.consentimientos).toHaveLength(1)
  })
  it('B.7: la casilla empieza sin marcar y «Pedir mediación» está inactivo hasta marcarla', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const h = renderToStaticMarkup(<MediacionPC a={alq()} rol="inquilino" />)
    expect(h).toContain(CASILLA_MEDIACION); expect(h).toMatch(/<input type="checkbox"(?![^>]*checked)[^>]*\/?>/)
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pedir mediación<\/button>/)
  })
  it('al pedir la mediación se registra el consentimiento antes de pedirla', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/prueba/MediacionPC.tsx', 'utf8')).toMatch(/registrarConsentimiento\(x, 'mediacion', rol, CASILLA_MEDIACION, ahoraDe\(x\)\); pedirMediacion\(/)
  })
})
