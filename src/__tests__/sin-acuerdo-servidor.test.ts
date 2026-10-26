// Legal (25/10, 1:16 a. m.) · escenario C (alquiler en el servidor): si el servidor no cierra (reclamo o mediación abiertos),
// la app no pide ninguna liberación ni la devolución automática a /api/tw.
import { describe, it, expect, vi, beforeEach } from 'vitest'
const llamadas: string[] = []
vi.mock('../servidor/config', async orig => ({ ...(await orig<typeof import('../servidor/config')>()), modoServidor: true, modoSolo: false,
  modoDe: () => ({ servidor: true, trustless: true, prueba: true, solo: false, video: false, escrowReal: true, dosPersonas: true }) }))
vi.mock('../servidor/repositorio', () => ({ servidor: { cerrarSinReclamo: async () => { llamadas.push('lk_cerrar_sin_reclamo'); return false } } }))
vi.mock('../services/trustless', () => ({ trustless: {
  liberar: async () => { llamadas.push('liberar'); return 'tx' }, devolverAutomatico: async () => { llamadas.push('devolver-automatico'); return 'tx' } } }))
vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const { acciones } = await import('../acciones')
const alquiler = (estado: string) => ({ id: '11111111-2222-3333-4444-555555555555', estado, escrowId: 'CABC', liquidacionTx: undefined, historial: [], monto: 100 }) as never

describe('escenario C: la devolución automática no corre con un caso abierto', () => {
  beforeEach(() => { llamadas.length = 0 })
  it.each(['reclamo', 'mediacion'])('estado %s: el servidor no cierra y la app no pide liberar ni devolver', async estado => {
    await acciones.cerrarSinReclamo(alquiler(estado))
    expect(llamadas).toEqual(['lk_cerrar_sin_reclamo'])
  })
})
