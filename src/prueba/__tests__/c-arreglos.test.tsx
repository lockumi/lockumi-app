// PR #22 · los 5 arreglos que salieron de las capturas del escenario C. Todo solo con VITE_DOS_PERSONAS (alquileres de dos personas):
// con el interruptor apagado, producción no cambia (dos-personas-apagado.test.tsx y las capturas píxel a píxel).
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '' })

const { Pago, Ventana, Cerrado } = await import('../../screens/Detalle')
const { aAlquiler } = await import('../../servidor/mapeo')
const { versionActual, puedeCambiarVersion, versionAlquiler } = await import('../version')

const INQ = 'inquilino.prueba@lockumi.com', DUENO = 'dueno.prueba@lockumi.com'
const base: Alquiler = { id: 'c0000000-0000-4000-8000-000000000009', direccion: 'Casa de prueba (C)', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-10', reglas: [],
  duenoEmail: DUENO, inquilinoEmail: INQ, inquilinoUnido: true, estado: 'pendiente_pago', rendimiento: false, historial: [], contrato: { firmas: { dueno: '2026-10-01T00:00:00Z', inquilino: '2026-10-01T00:00:00Z' } },
  entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true }
const ver = (a: Partial<Alquiler>, rol: 'dueno' | 'inquilino' = 'inquilino') => { const x = { ...base, ...a } as Alquiler, P = { pendiente_pago: Pago, ventana_reclamo: Ventana, cerrado: Cerrado }[x.estado as 'cerrado']
  return renderToStaticMarkup(<P a={x} rol={rol} />) }

describe('(a) C: el pago y el plazo no dicen «simulado» ni «demo local»', () => {
  it('pago del depósito (inquilino): USDC de prueba y red de prueba', () => {
    const h = ver({ miRol: 'inquilino' })
    expect(h).not.toContain('Pago simulado'); expect(h).not.toContain('Es una prueba: no se cobra nada.')
    expect(h).toContain('Red de prueba'); expect(h).toContain('Son USDC de prueba, sin valor')
  })
  it('plazo de reclamos de un alquiler de dos personas sin versión guardada (los de antes)', () => {
    const h = ver({ miRol: 'dueno', estado: 'ventana_reclamo', ventanaInicio: new Date().toISOString(), ventanaSegundos: 604800 }, 'dueno')
    expect(h).not.toContain('En esta demo local no hay red'); expect(h).toMatch(/Termina el/)
  })
})

describe('(b) versión de los Términos guardada en el servidor por alquiler', () => {
  const filas = (extra: object = {}) => ({ contrato: { id: base.id, direccion: 'Casa', monto: 800, inicio: '2026-10-01', fin: '2026-11-10', reglas: [], email_inquilino: INQ, estado: 'firmas' as const,
    ventana_inicio: null, ventana_segundos: 604800, escrow_contract_id: null, resultado: null, liquidacion_tx: null, creado_en: '2026-10-25T08:00:00Z', actualizado_en: '2026-10-25T08:00:00Z' },
    participantes: [{ rol: 'dueno' as const, usuario: 'u1', email_cavos: DUENO, direccion_stellar: null }, { rol: 'inquilino' as const, usuario: 'u2', email_cavos: INQ, direccion_stellar: null }],
    actas: [], firmas: [], fotos: [], reclamo: null, eventos: [], ...extra })
  it('un alquiler nuevo de C nace en la 1.9-demo, con quién aceptó y cuándo, y no ofrece pasar de versión', () => {
    const a = aAlquiler(filas({ terminos: { version: '1.9-demo', aceptaciones: [{ rol: 'dueno', aceptado_en: '2026-10-25T08:00:00Z' }, { rol: 'inquilino', aceptado_en: '2026-10-25T09:00:00Z' }] } }), 'u2', r => r)
    expect(versionActual()).toBe('1.9-demo'); expect(versionAlquiler(a)).toBe('1.9-demo')
    expect(a.terminos?.acepta).toEqual({ dueno: '2026-10-25T08:00:00Z', inquilino: '2026-10-25T09:00:00Z' })
    expect(puedeCambiarVersion(a)).toBe(false)
  })
  it('los de antes (sin versión en el servidor) conservan la suya', () => {
    const a = aAlquiler(filas(), 'u2', r => r)
    expect(a.terminos).toBeUndefined(); expect(versionAlquiler(a)).toBe('1.6-demo')
  })
})

describe('(c) casilla 1.9-demo dentro de la función', () => {
  it('«Acepto los Términos 1.9-demo y el Aviso de privacidad», con enlaces y obligatoria', async () => {
    const { CasillaVersion } = await import('../CasillaVersion')
    const h = renderToStaticMarkup(<CasillaVersion id="x" marcada={false} onCambio={() => {}} />)
    expect(h.replace(/<[^>]+>/g, '')).toContain('Acepto los Términos 1.9-demo y el Aviso de privacidad')
    expect(h).toContain('href="/terminos"'); expect(h).toContain('href="/privacidad"'); expect(h).toContain('required')
  })
  it('el inquilino no puede unirse sin marcarla', async () => {
    const { ZonaAceptar } = await import('../../screens/Invitacion')
    const z = (m: boolean) => renderToStaticMarkup(<ZonaAceptar marcada={m} onMarcar={() => {}} ocupado={false} onAceptar={() => {}} />)
    expect(z(false)).toMatch(/<button[^>]*disabled[^>]*>Aceptar invitación/); expect(z(true)).not.toMatch(/<button[^>]*disabled/)
    expect(z(false)).toContain('Acepto los')
  })
})

describe('(d) cierre con las dos aceptaciones', () => {
  const cerrado = { estado: 'cerrado' as const, miRol: 'inquilino' as const, liquidacionTx: 'b'.repeat(64),
    resultado: { via: 'mediacion' as const, cierre: 'dos_aceptan', dueno: 300, inquilino: 500, fecha: '2026-11-15T16:00:00Z' } }
  it('dice que lo aceptaron las dos partes, con la comisión de 0,3 % y el comprobante', () => {
    const h = ver(cerrado)
    expect(h).toContain('Lo aceptaron las dos partes.'); expect(h).not.toContain('Lo decidió una persona mediadora')
    expect(h).toContain('0,3 %'); expect(h).toContain('498,5000 USDC de prueba'); expect(h).toContain('299,1000 USDC de prueba')
    expect(h).toContain('https://stellar.expert/explorer/testnet/tx/' + 'b'.repeat(64)); expect(h).toContain('Ver comprobante en la red de prueba')
  })
  it('el mapeo conserva «cierre» del servidor', () => {
    const a = aAlquiler({ contrato: { id: base.id, direccion: 'Casa', monto: 800, inicio: '2026-10-01', fin: '2026-11-10', reglas: [], email_inquilino: INQ, estado: 'cerrado', ventana_inicio: null, ventana_segundos: 604800,
      escrow_contract_id: null, resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 300, inquilino: 500 }, liquidacion_tx: null, creado_en: 'x', actualizado_en: 'y' }, participantes: [], actas: [], firmas: [], fotos: [], reclamo: null, eventos: [] }, 'u', r => r)
    expect(a.resultado?.cierre).toBe('dos_aceptan')
  })
})

describe('(e) el link de invitación usa el origen público', () => {
  it('nunca 127.0.0.1: en local, app.lockumi.com; en producción, el propio origen', async () => {
    const { origenPublico, linkInvitacion } = await import('../../servidor/origen')
    expect(origenPublico({ origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1' })).toBe('https://app.lockumi.com')
    expect(origenPublico({ origin: 'http://localhost:5173', hostname: 'localhost' })).toBe('https://app.lockumi.com')
    expect(origenPublico({ origin: 'https://app.lockumi.com', hostname: 'app.lockumi.com' })).toBe('https://app.lockumi.com')
    expect(origenPublico({ origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1' }, 'https://otra.lockumi.com/')).toBe('https://otra.lockumi.com')
    expect(linkInvitacion('id1', 'tok')).toBe('https://app.lockumi.com/#/invitacion/id1/tok')
  })
})

describe('fecha de la 1.9-demo', () => {
  it('provisional: 25 de octubre de 2026 (poner la fecha real de encendido)', async () => {
    const { VERSIONES } = await import('../../legal/versiones')
    expect(VERSIONES.find(v => v.version === '1.9-demo')?.fecha).toBe('25 de octubre de 2026')
  })
})

describe('(b) consecuencia: un alquiler de C en la 1.9-demo usa el plazo de la prueba completa (PlazoDueno)', () => {
  it('sin un segundo botón de aprobar: PlazoDueno ya trae «Todo bien, devolver el depósito» en el servidor', async () => {
    const fuente = (await import('../../screens/Detalle.tsx?raw')).default
    expect(fuente).toContain('{!esDosPersonas(a) && <EscrowReal a={a} rol={rol} />}</PlazoDueno>')
  })
})
