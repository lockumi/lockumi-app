// PR #22 · textos de Legal (25/10, 2:53 a. m.) para el escenario C, aprobados sobre 4be7582. Solo con VITE_DOS_PERSONAS
// (alquileres de dos personas): con el interruptor apagado, producción no cambia.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '' })

const { Contrato, Pago } = await import('../../screens/Detalle')
const { Expediente } = await import('../Expediente')
const { turno } = await import('../../flujo')
const D = await import('../dosPersonas')
const V = await import('../../legal/versiones')

const INQ = 'inquilino.prueba@lockumi.com', DUENO = 'dueno.prueba@lockumi.com'
const T19 = { version: '1.9-demo', fecha: '2026-10-25T08:00:00Z', edicion: '1.9-demo · 25 de octubre de 2026' }
const base: Alquiler = { id: 'c0000000-0000-4000-8000-000000000019', direccion: 'Casa de prueba (C)', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-10', reglas: [],
  duenoEmail: DUENO, inquilinoEmail: INQ, inquilinoUnido: true, estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} },
  entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true, terminos: { version: '1.9-demo', acepta: T19 } } as unknown as Alquiler
const A = (x: Partial<Alquiler> = {}) => ({ ...base, ...x }) as Alquiler

const TITULO = 'Si hay un reclamo'
const TEXTO = 'En esta versión, la app no aplica ninguna propuesta por su cuenta. Si el dueño hace un reclamo y no respondes a tiempo (cláusula 6.5), el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. Si el dueño no hace un reclamo a tiempo, recibes el 100 % del depósito.'
const PAGO = 'Tu cuenta Lockumi te pedirá confirmar el pago en la red de prueba. Son USDC de prueba, sin valor.'

describe('1) C, pantalla de firmar: sin la Regla 6.5.1; nota «Si hay un reclamo» sin casilla', () => {
  it('el inquilino ve la nota informativa (estilo de recuadro) y nunca la tarjeta ni su casilla', () => {
    const h = renderToStaticMarkup(<Contrato a={A()} rol="inquilino" />)
    expect(h).not.toContain('Regla de propuesta automática (opcional)'); expect(h).not.toContain('acepto-regla')
    expect(h).toContain(TITULO); expect(h).toContain(TEXTO)
    expect(h).toMatch(/<div class="auto-dos" role="note"[^>]*><p><strong>Si hay un reclamo<\/strong><\/p><p>En esta versión/)
    expect(h).toContain('Firmas del contrato')   // pasa directo a leer y firmar
  })
  it('los textos son los de Legal, palabra por palabra', () => { expect(D.TITULO_RECLAMO_DOS).toBe(TITULO); expect(D.TEXTO_RECLAMO_DOS).toBe(TEXTO) })
  it('sin dos personas, la Regla 6.5.1 sigue igual (A)', () => {
    const h = renderToStaticMarkup(<Contrato a={A({ dosPersonas: false, terminos: { version: '1.7-demo', acepta: { ...T19, version: '1.7-demo' } }, id: 'local-1' } as Partial<Alquiler>)} rol="inquilino" />)
    expect(h).toContain('Regla de propuesta automática (opcional)'); expect(h).not.toContain(TITULO)
  })
  it('Detalle nunca guarda la regla en un alquiler de dos personas', async () => {
    const src = (await import('../../screens/Detalle.tsx?raw')).default as string
    expect(src).toMatch(/if \(reglas17\(a\) && !esDosPersonas\(a\) && rol === 'inquilino' && !a\.regla/)
  })
})

describe('2) «Qué sigue» y otros textos de C: la propuesta solo se aplica si las dos partes la aceptan', () => {
  const r = A({ estado: 'reclamo' })
  it.each(['inquilino', 'dueno'] as const)('reclamo abierto (%s)', rol => {
    const t = turno(r, rol)
    expect(t.sigue).toContain('propuesta automática (simulación)'); expect(t.sigue).toContain('Mediación Lockumi (demo)')
    expect(t.sigue).toContain('solo se aplica si las dos partes la aceptan')
    expect(t.sigue).not.toMatch(/se aplica sola|por su cuenta|si no respond/)
  })
  it('sin dos personas, «Qué sigue» no cambia', () => {
    expect(turno(A({ estado: 'reclamo', dosPersonas: false }), 'inquilino').sigue).toBe('Si no aceptas todo, verás una propuesta automática (simulación). Si no hay acuerdo, pasa a la Mediación Lockumi (demo).')
  })
  it('al vencer el plazo del inquilino, C no dice «Aplicando la regla»', async () => {
    expect(D.TEXTO_SILENCIO_DOS).not.toMatch(/regla/i); expect(D.TEXTO_SILENCIO_DOS).toContain('Mediación Lockumi (demo)')
    const src = (await import('../ReclamoPC.tsx?raw')).default as string
    expect(src).toMatch(/esDosPersonas\(a\) \? TEXTO_SILENCIO_DOS : 'Venció el plazo para responder\. Aplicando la regla…'/)
  })
  it('el expediente de C dice que la regla no se ofrece en esta versión', async () => {
    const { contenidoExpediente } = await import('../expediente')
    const s = contenidoExpediente(A({ estado: 'cerrado' }), Date.parse('2026-11-16T16:00:00Z'), {}).find(x => x.titulo === 'Aceptaciones')!
    expect(s.lineas).toContain('Regla de propuesta automática: no se ofrece en esta versión (cláusula 6.5.1 d)')
  })
  it('el expediente de C descarga datos reales de la prueba: «Descargar el expediente (datos de prueba)»', () => {
    expect(renderToStaticMarkup(<Expediente a={A({ estado: 'cerrado' })} />)).toContain('Descargar el expediente (datos de prueba)')
    expect(renderToStaticMarkup(<Expediente a={A({ estado: 'cerrado', dosPersonas: false })} />)).toContain('Descargar el expediente (demo)')
  })
})

describe('3) pago en C: confirma la cuenta Lockumi (Cavos), la única que firma el depósito de dos personas', () => {
  it('nota del inquilino, palabra por palabra', () => {
    const h = renderToStaticMarkup(<Pago a={A({ estado: 'pendiente_pago', miRol: 'inquilino', cuentas: { inquilino: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV' } })} rol="inquilino" />)
    expect(h).toContain(`<p class="nota">${PAGO}</p>`); expect(h).not.toContain('Freighter')
  })
  it('el depósito de dos personas solo lo firma la billetera Cavos (trustless.depositar → firmarXdr → Cavos)', async () => {
    const t = (await import('../../services/trustless.ts?raw')).default as string, b = (await import('../../services/billetera.ts?raw')).default as string
    expect(t).toMatch(/import \{ firmarXdr, mensajeFirma \} from '\.\/billetera'/)
    expect(b).toMatch(/export async function firmarXdr\(xdr: string\): Promise<string> \{ return \(await miCartera\(\)\)\.signXdr\(xdr\) \}/)
    expect(b).not.toMatch(/freighter/i)
  })
})

describe('4) fecha de la 1.9-demo: una sola constante, provisional hasta el encendido', () => {
  it('FECHA_V19 es la de la 1.9-demo', () => {
    expect(V.FECHA_V19).toBe('25 de octubre de 2026')
    expect(V.VERSIONES.find(v => v.version === '1.9-demo')!.fecha).toBe(V.FECHA_V19)
  })
  it('no hay otra copia de la fecha en versiones.ts', async () => {
    const src = (await import('../../legal/versiones.ts?raw')).default as string
    expect(src.match(/'25 de octubre de 2026'/g)).toHaveLength(1)
  })
})
