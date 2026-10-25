// B2 (escenario C, alquiler en el servidor): la app llama a lk_aceptar_acuerdo_mediacion (cada parte acepta un reparto),
// registra que el inquilino abrió el aviso del reclamo (6.5 b) y pide al servidor aplicar el silencio (6.5 c y 6.5.1).
import { describe, it, expect, vi, beforeEach } from 'vitest'
const rpcs: [string, Record<string, unknown>][] = []
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' }, access_token: 't' } } }) },
  rpc: async (fn: string, args: Record<string, unknown>) => { rpcs.push([fn, args]); return { data: fn === 'lk_aplicar_silencio' ? 'mediacion' : null, error: null } },
  from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }), in: async () => ({ data: [], error: null }) }) }),
  storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel: () => {},
}) }))
vi.mock('../servidor/config', async orig => ({ ...(await orig<typeof import('../servidor/config')>()), modoServidor: true, modoSolo: false,
  SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon',
  modoDe: () => ({ servidor: true, trustless: true, prueba: true, solo: false, video: false, escrowReal: true, dosPersonas: true }) }))
const { servidor } = await import('../servidor/repositorio')
const { acciones } = await import('../acciones')
const ID = '11111111-2222-3333-4444-555555555555'
const alquiler = (estado: string) => ({ id: ID, estado, escrowId: 'CABC', historial: [], monto: 100, reclamo: { monto: 30 } }) as never

describe('B2 · la app de dos personas usa las funciones nuevas del servidor', () => {
  beforeEach(() => { rpcs.length = 0 })
  it('repositorio: aceptarAcuerdo → lk_aceptar_acuerdo_mediacion con el monto para el dueño', async () => {
    await servidor.aceptarAcuerdo(ID, 12.5)
    expect(rpcs[0]).toEqual(['lk_aceptar_acuerdo_mediacion', { p_contrato: ID, p_monto_dueno: 12.5 }])
  })
  it('repositorio: abrirAvisoReclamo → lk_abrir_aviso_reclamo; aplicarSilencio → lk_aplicar_silencio (devuelve el resultado)', async () => {
    await servidor.abrirAvisoReclamo(ID)
    expect(await servidor.aplicarSilencio(ID)).toBe('mediacion')
    expect(rpcs.map(r => r[0])).toEqual(['lk_abrir_aviso_reclamo', 'lk_aplicar_silencio'])
  })
  it('acciones (servidor): aceptarAcuerdo, abrirAvisoReclamo y aplicarSilencio van al servidor', async () => {
    await acciones.aceptarAcuerdo!(alquiler('mediacion'), 30)
    await acciones.abrirAvisoReclamo!(alquiler('reclamo'))
    await acciones.aplicarSilencio!(alquiler('reclamo'))
    expect(rpcs.map(r => r[0])).toEqual(['lk_aceptar_acuerdo_mediacion', 'lk_abrir_aviso_reclamo', 'lk_aplicar_silencio'])
  })
  it('acciones (servidor): un monto fuera de 0..reclamado no llega al servidor', async () => {
    await expect(acciones.aceptarAcuerdo!(alquiler('mediacion'), 31)).rejects.toThrow(/reclam/)
    expect(rpcs).toEqual([])
  })
})
