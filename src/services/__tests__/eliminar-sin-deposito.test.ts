// 26/10 (Katherine): el dueño elimina un alquiler de dos personas mientras la cuenta segura no tenga fondos (saldo leído en la red).
import { describe, it, expect } from 'vitest'
import { Keypair } from '@stellar/stellar-sdk'
import { atender, type Entorno } from '../../../api/_lib/tw'

const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: Keypair.random().secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
function simular(uid: string, k: Record<string, unknown>, saldo: number | null) {
  const urls: string[] = []
  const f = (async (url: string) => {
    urls.push(url); const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.includes('/rest/v1/lk_contratos?id=eq.')) return ok([{ id: ID, monto: 20, direccion: 'x', resultado: null, liquidacion_tx: null, escrow_contract_id: null, ...k,
      lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: null }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: null }] }])
    if (url.includes('get-escrow-by-contract-ids')) return ok([{ contractId: CID, balance: saldo, flags: {} }])
    if (url.includes('rpc/lk_eliminar_sin_deposito')) return ok(true)
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, urls }
}
const borro = (u: string[]) => u.some(x => x.includes('rpc/lk_eliminar_sin_deposito'))

describe('eliminar sin depósito', () => {
  it('con la cuenta segura en 0 (o sin crear), el dueño elimina', async () => {
    const a = simular('u-dueno', { estado: 'pendiente_pago', escrow_contract_id: CID }, 0)
    expect(await atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', a.f)).toEqual({ eliminado: true }); expect(borro(a.urls)).toBe(true)
    const b = simular('u-dueno', { estado: 'firmas' }, null)
    expect(await atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', b.f)).toEqual({ eliminado: true })
    expect(b.urls.some(x => x.includes('get-escrow'))).toBe(false)
  })
  it('con fondos en la cuenta segura, no se elimina aunque la base diga pendiente_pago', async () => {
    const a = simular('u-dueno', { estado: 'pendiente_pago', escrow_contract_id: CID }, 20)
    await expect(atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', a.f)).rejects.toMatchObject({ estado: 409 }); expect(borro(a.urls)).toBe(false)
    const b = simular('u-dueno', { estado: 'en_curso', escrow_contract_id: CID }, 0)
    await expect(atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', b.f)).rejects.toMatchObject({ estado: 409 })
  })
  it('el inquilino o alguien ajeno no elimina', async () => {
    await expect(atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', simular('u-inq', { estado: 'firmas' }, null).f)).rejects.toMatchObject({ estado: 403 })
    await expect(atender(ENV, { accion: 'eliminar', contrato: ID }, 'Bearer t', simular('u-otro', { estado: 'firmas' }, null).f)).rejects.toMatchObject({ estado: 403 })
  })
})
