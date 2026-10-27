// PR #22 · lista de Legal, puntos 5 y 7: en C, «Recibí la casa» va al servidor (lk_recibi_casa), el inicio automático (2 días
// después de la entrega) viene del servidor (entregado_en) y, tras «Todo bien, devolver», ya no se ofrece «Revisar y reclamar».
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '' })

const { PlazoDueno } = await import('../PlazoDueno')
const { aAlquiler } = await import('../../servidor/mapeo')
const { APROBADO_DUENO } = await import('../dosPersonas')

const ENTREGA = '2026-10-20T15:00:00.000Z', DIA = 86_400_000
const base: Alquiler = { id: 'c0000000-0000-4000-8000-000000000010', direccion: 'Casa C', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-10', reglas: [],
  duenoEmail: 'd@x.com', inquilinoEmail: 'i@x.com', inquilinoUnido: true, estado: 'ventana_reclamo', rendimiento: false, historial: [], contrato: { firmas: {} },
  entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true, miRol: 'dueno', ventanaSegundos: 604800, entrega: ENTREGA }
const ver = (a: Partial<Alquiler>) => renderToStaticMarkup(<PlazoDueno a={{ ...base, ...a } as Alquiler} rol="dueno" reclamo={() => null} />)

describe('C: plazo del dueño en el servidor', () => {
  it('antes de empezar el plazo, el dueño ve «Recibí la casa»', () => {
    expect(ver({})).toMatch(/<button[^>]*>[^<]*Recibí la casa/)
  })
  it('después de aprobar la devolución completa, no aparece «Revisar y reclamar»', () => {
    const h = ver({ ventanaInicio: new Date().toISOString(), historial: [{ fecha: ENTREGA, texto: APROBADO_DUENO }] })
    expect(h).not.toContain('Revisar y reclamar'); expect(h).toContain('Ya aprobaste la devolución completa')
  })
  it('sin aprobar, sí aparece', () => {
    expect(ver({ ventanaInicio: new Date().toISOString() })).toContain('Revisar y reclamar')
  })
})

describe('mapeo: entregado_en y el inicio automático', () => {
  const filas = (c: object) => ({ contrato: { id: base.id, direccion: 'Casa', monto: 800, inicio: '2026-10-01', fin: '2026-11-10', reglas: [], email_inquilino: 'i@x.com', estado: 'ventana_reclamo' as const,
    ventana_inicio: null, ventana_segundos: 604800, escrow_contract_id: null, resultado: null, liquidacion_tx: null, creado_en: ENTREGA, actualizado_en: ENTREGA, ...c },
    participantes: [], actas: [], firmas: [], fotos: [], reclamo: null, eventos: [] })
  it('antes de los 2 días: entrega sí, plazo no', () => {
    const a = aAlquiler(filas({ entregado_en: ENTREGA }), 'u1', r => r, +new Date(ENTREGA) + DIA)
    expect(a.entrega).toBe(ENTREGA); expect(a.ventanaInicio).toBeUndefined()
  })
  it('a los 2 días, el plazo empieza solo (lo mismo que calcula lk_inicio_plazo)', () => {
    const a = aAlquiler(filas({ entregado_en: ENTREGA }), 'u1', r => r, +new Date(ENTREGA) + 2 * DIA)
    expect(a.ventanaInicio).toBe(new Date(+new Date(ENTREGA) + 2 * DIA).toISOString())
  })
  it('si el dueño tocó «Recibí», manda ventana_inicio; y «devuelto» se conserva', () => {
    const a = aAlquiler(filas({ entregado_en: ENTREGA, ventana_inicio: '2026-10-21T10:00:00Z', estado: 'cerrado', resultado: { via: 'devuelto', dueno: 0, inquilino: 800 } }), 'u1', r => r)
    expect(a.ventanaInicio).toBe('2026-10-21T10:00:00Z'); expect(a.resultado?.via).toBe('devuelto')
  })
})

describe('C: cerrado por «Todo bien, devolver» (devuelto)', async () => {
  const { Cerrado } = await import('../../screens/Detalle')
  const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', TX = 'a'.repeat(64)
  const cerrado = (x: Partial<Alquiler>) => renderToStaticMarkup(<Cerrado a={{ ...base, estado: 'cerrado', escrowId: CID, resultado: { via: 'devuelto', dueno: 0, inquilino: 800, fecha: ENTREGA }, ...x } as Alquiler} rol="dueno" />)
  it('montos en USDC de prueba, con la comisión del 0,3 %', () => {
    const h = cerrado({ liquidacionTx: TX })
    expect(h).toContain('797,60 USDC de prueba'); expect(h).toContain('descuenta el 0,3 %'); expect(h).not.toMatch(/\bUSD\b(?! ?C)/)
    expect(h).toContain('stellar.expert/explorer/testnet/tx/' + TX)
  })
  it('si la liberación no llegó a la red, ofrece reintentarla', () => {
    expect(cerrado({})).toContain('Liberar el depósito al inquilino')
  })
})
