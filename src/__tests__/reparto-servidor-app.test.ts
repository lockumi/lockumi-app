// PR #22 · la app de dos personas pide a /api/tw «repartir» solo cuando el servidor cerró por acuerdo o por la mediación con las dos
// aceptaciones; un cierre automático sigue con «devolver-automatico» o «liberar». Nunca con un caso abierto.
import { describe, it, expect, vi, beforeEach } from 'vitest'
const llamadas: string[] = []
vi.mock('../servidor/config', async orig => ({ ...(await orig<typeof import('../servidor/config')>()), modoServidor: true, modoSolo: false,
  modoDe: () => ({ servidor: true, trustless: true, prueba: true, solo: false, video: false, escrowReal: true, dosPersonas: true }) }))
vi.mock('../servidor/repositorio', () => ({ servidor: {
  cerrarSinReclamo: async () => { llamadas.push('lk_cerrar_sin_reclamo'); return false },
  responder: async () => { llamadas.push('lk_responder_reclamo') },
  decidir: async () => { llamadas.push('lk_decidir_mediacion') },
} }))
vi.mock('../services/trustless', () => ({ trustless: {
  liberar: async () => { llamadas.push('liberar'); return 'tx' }, devolverAutomatico: async () => { llamadas.push('devolver-automatico'); return 'tx' },
  repartir: async () => { llamadas.push('repartir'); return 'tx' } } }))
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { acciones } = await import('../acciones')
const alq = (estado: string, via?: string, liquidacionTx?: string) => ({ id: '11111111-2222-3333-4444-555555555555', estado, escrowId: 'CABC', liquidacionTx,
  resultado: via ? { via, dueno: 30, inquilino: 70 } : undefined, historial: [], monto: 100, reclamo: { monto: 30 } }) as never

describe('PR #22 · la app pide el reparto en la red solo con un cierre aceptado', () => {
  beforeEach(() => { llamadas.length = 0 })
  it('el inquilino acepta el reclamo → el servidor cierra por acuerdo → repartir', async () => {
    await acciones.responder(alq('reclamo'), true)
    expect(llamadas).toEqual(['lk_responder_reclamo', 'repartir'])
  })
  it('el inquilino no acepta → mediación, sin pago', async () => {
    await acciones.responder(alq('reclamo'), false)
    expect(llamadas).toEqual(['lk_responder_reclamo'])
  })
  it('la mediación registra el acuerdo de las dos partes → repartir', async () => {
    await acciones.decidir(alq('mediacion'), 30)
    expect(llamadas).toEqual(['lk_decidir_mediacion', 'repartir'])
  })
  it('al volver a abrir un caso cerrado por acuerdo o mediación sin pagar → repartir; automático → devolución; pagado → nada', async () => {
    await acciones.cerrarSinReclamo(alq('cerrado', 'mediacion')); await acciones.cerrarSinReclamo(alq('cerrado', 'acuerdo'))
    expect(llamadas).toEqual(['lk_cerrar_sin_reclamo', 'repartir', 'lk_cerrar_sin_reclamo', 'repartir'])
    llamadas.length = 0
    await acciones.cerrarSinReclamo(alq('cerrado', 'automatico'))
    expect(llamadas).toEqual(['lk_cerrar_sin_reclamo', 'devolver-automatico'])
    llamadas.length = 0
    await acciones.cerrarSinReclamo(alq('cerrado', 'mediacion', 'a'.repeat(64)))
    expect(llamadas).toEqual(['lk_cerrar_sin_reclamo'])
  })
})

describe('PR #22 · el bloqueo del reparto no se muestra como comprobante', () => {
  it('liquidacion_tx «en-curso» no llega a la app como hash', async () => {
    const { comprobanteLiquidacion } = await vi.importActual<typeof import('../servidor/mapeo')>('../servidor/mapeo')
    expect(comprobanteLiquidacion('en-curso')).toBeUndefined()
    expect(comprobanteLiquidacion(null)).toBeUndefined()
    expect(comprobanteLiquidacion('a'.repeat(64))).toBe('a'.repeat(64))
  })
})
