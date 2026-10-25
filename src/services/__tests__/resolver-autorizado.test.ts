// Legal (25/10, 1:24 a. m.) · A1: el navegador que creó el depósito manda su prueba (el permiso de «desplegar» o, si no lo tiene,
// el token de su cuenta de prueba) al abrir el reclamo y al repartir, y el reparto lleva lo reclamado (el dueño nunca recibe más).
import { describe, it, expect, vi, beforeEach } from 'vitest'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.mock('../../servidor/config', async orig => ({ ...(await orig<typeof import('../../servidor/config')>()), escrowReal: true, modoPrueba: true }))
vi.mock('../solo', async orig => {
  const o = await orig<typeof import('../solo')>()
  return { ...o,
    cuentaPruebaGuardada: () => 'GPRUEBA',
    prepararCuentaPrueba: vi.fn(async () => ({ g: 'GPRUEBA', txs: {} })),
    prepararDueno: vi.fn(async () => ({ dueno: 'GDUENO', trustlineTx: null })),
    desplegar: vi.fn(async () => ({ escrow: 'CESCROW', tx: 'tx-escrow', dueno: 'GDUENO', compraTx: null, permiso: 'f'.repeat(64) })),
    fondearPrueba: vi.fn(async () => ({ tx: 'tx-deposito', compraTx: null })),
  }
})
const cuerpos: Record<string, unknown>[] = []
vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => {
  const c = JSON.parse(String(init!.body)) as Record<string, unknown>; cuerpos.push(c)
  return new Response(JSON.stringify({ tx: 'ab'.repeat(32) }), { status: 200 })
}))
const { escrow } = await import('../escrow')
import type { Alquiler } from '../../types'
const alquiler = (red: Alquiler['red'], reclamo = 30) => ({ id: '00000000-0000-4000-8000-000000000001', monto: 100, red, reclamo: { monto: reclamo, motivo: 'x', fotos: [], fecha: '' } } as unknown as Alquiler)
beforeEach(() => { cuerpos.length = 0; mem.clear() })

describe('A1 · el cliente manda la autorización y lo reclamado', () => {
  it('al crear la cuenta segura guarda el permiso que devuelve el servidor', async () => {
    const guardado: unknown[] = []
    await escrow.depositar({ id: '00000000-0000-4000-8000-000000000001', monto: 1 } as Alquiler, (_t, r) => guardado.push(r), () => {})
    expect(guardado).toContainEqual({ escrow: 'CESCROW', permiso: 'f'.repeat(64) })
  })
  it('abrir el reclamo y repartir llevan el permiso; el reparto lleva lo reclamado', async () => {
    const red = { escrow: 'CESCROW', permiso: 'e'.repeat(64), txs: {} }
    await escrow.disputar(alquiler(red), () => {}, () => {})
    await escrow.resolver(alquiler(red), 30, () => {}, () => {})
    expect(cuerpos).toEqual([{ accion: 'disputar', escrow: 'CESCROW', permiso: 'e'.repeat(64) },
      { accion: 'resolver', escrow: 'CESCROW', alDueno: 30, reclamado: 30, permiso: 'e'.repeat(64) }])
  })
  it('sin permiso guardado (depósitos de antes), manda el token de la cuenta de prueba de este navegador', async () => {
    mem.set('lockumi.testnet.cuenta-prueba', 'c'.repeat(64))
    await escrow.resolver(alquiler({ escrow: 'CESCROW', txs: {} }), 10, () => {}, () => {})
    expect(cuerpos).toEqual([{ accion: 'resolver', escrow: 'CESCROW', alDueno: 10, reclamado: 30, token: 'c'.repeat(64) }])
  })
  it('el dueño nunca recibe más de lo reclamado, tampoco desde el cliente', async () => {
    const r = await escrow.resolver(alquiler({ escrow: 'CESCROW', permiso: 'e'.repeat(64), txs: {} }), 80, () => {}, () => {})
    expect(cuerpos[0]).toMatchObject({ alDueno: 30, reclamado: 30 }); expect(r.dueno).toBeLessThanOrEqual(30)
  })
})
