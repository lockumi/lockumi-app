import { describe, it, expect } from 'vitest'
import { type Transaction, Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, firmarComoPlataforma, configuracion, ErrorTw, APROBADO, type Entorno } from '../../../api/_lib/tw'
import { pagoFalso } from './pago-falso'

const P = Keypair.random(), M = Keypair.random(), DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const LLAVE = 'llave-secreta-de-prueba'
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: LLAVE, LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(),   SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()

function simular(contrato: Record<string, unknown>, uid = 'u-inq') {
  const llamadas: { url: string; init?: RequestInit; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, init, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    { const pg = pagoFalso({ cid: CID, monto: 20, receiver: INQ, releaseSigner: P.publicKey(), disputeResolver: P.publicKey() })(url); if (pg) return pg }   // paso 22: bloqueo y estado del escrow
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS', contractId: CID })
    if (url.endsWith('/deployer/single-release') || url.includes('change-milestone-status') || url.endsWith('release-funds')) return ok({ status: 'SUCCESS', unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('fund-escrow')) return ok({ unsignedTransaction: xdrDe(INQ) })
    if (url.endsWith('approve-milestone')) return ok({ unsignedTransaction: xdrDe(DUENO) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}
const base = { id: ID, monto: 20, direccion: 'Calle 1', escrow_contract_id: null, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: INQ }] }

describe('proxy de Trustless Work', () => {
  it('despliega con los roles de la base, firma como plataforma y no devuelve la llave', async () => {
    const { f, llamadas } = simular({ ...base, estado: 'pendiente_pago' })
    const r = await atender(ENV, { accion: 'desplegar', contrato: ID }, 'Bearer t', f)
    expect(r.contractId).toBe(CID); expect(JSON.stringify(r)).not.toContain(LLAVE)
    const dep = llamadas.find(l => l.url.endsWith('/deployer/single-release'))!
    expect((dep.init!.headers as Record<string, string>)['x-api-key']).toBe(LLAVE)
    expect(dep.cuerpo!.roles).toEqual({ approver: DUENO, serviceProvider: P.publicKey(), platformAddress: P.publicKey(), releaseSigner: P.publicKey(), disputeResolver: P.publicKey(), receiver: INQ })
    expect(dep.cuerpo!.trustline).toEqual({ address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', symbol: 'USDC' })
    expect(dep.cuerpo!.amount).toBe(20); expect(dep.cuerpo!.platformFee).toBe(0)
    const env = llamadas.find(l => l.url.endsWith('/helper/send-transaction'))!
    expect(TransactionBuilder.fromXDR(String(env.cuerpo!.signedXdr), Networks.TESTNET).signatures).toHaveLength(1)
    expect(llamadas.some(l => l.init?.method === 'PATCH' && String(l.init.body).includes(CID))).toBe(true)
  })
  it('solo el inquilino pide la XDR del depósito, y sale de su cuenta', async () => {
    const k = { ...base, estado: 'pendiente_pago', escrow_contract_id: CID }
    await expect(atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(k, 'u-dueno').f)).rejects.toMatchObject({ estado: 403 })
    const r = await atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(k).f)
    expect((TransactionBuilder.fromXDR(String(r.unsignedXdr), Networks.TESTNET) as Transaction).source).toBe(INQ)
  })
  it('quien no participa no puede usar el proxy', async () => {
    await expect(atender(ENV, { accion: 'desplegar', contrato: ID }, 'Bearer t', simular({ ...base, estado: 'pendiente_pago' }, 'otro').f)).rejects.toMatchObject({ estado: 403 })
  })
  it('enviar rechaza transacciones que no salen de la cuenta del participante', async () => {
    const k = { ...base, estado: 'pendiente_pago', escrow_contract_id: CID }
    await expect(atender(ENV, { accion: 'enviar', contrato: ID, paso: 'fondear', signedXdr: xdrDe(DUENO) }, 'Bearer t', simular(k).f)).rejects.toMatchObject({ estado: 400 })
    const r = await atender(ENV, { accion: 'enviar', contrato: ID, paso: 'fondear', signedXdr: xdrDe(INQ) }, 'Bearer t', simular(k).f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/)
  })
  it('la aprobación del dueño deja la evidencia de la plataforma y queda anotada', async () => {
    const k = { ...base, estado: 'ventana_reclamo', escrow_contract_id: CID }
    const { f, llamadas } = simular(k, 'u-dueno')
    const r = await atender(ENV, { accion: 'aprobar', contrato: ID }, 'Bearer t', f)
    expect((TransactionBuilder.fromXDR(String(r.unsignedXdr), Networks.TESTNET) as Transaction).source).toBe(DUENO)
    expect(llamadas.find(l => l.url.includes('change-milestone-status'))!.cuerpo).toMatchObject({ milestoneIndex: '0', newStatus: 'Completed', serviceProvider: P.publicKey() })
    const s = simular(k, 'u-dueno'); await atender(ENV, { accion: 'enviar', contrato: ID, paso: 'aprobar', signedXdr: xdrDe(DUENO) }, 'Bearer t', s.f)
    expect(s.llamadas.some(l => l.url.endsWith('lk_eventos') && String(l.init!.body).includes(APROBADO))).toBe(true)
  })
  it('liberar solo con contrato cerrado sin reclamo', async () => {
    await expect(atender(ENV, { accion: 'liberar', contrato: ID }, 'Bearer t', simular({ ...base, estado: 'ventana_reclamo', escrow_contract_id: CID }).f)).rejects.toMatchObject({ estado: 409 })
    const { f, llamadas } = simular({ ...base, estado: 'cerrado', escrow_contract_id: CID, resultado: { via: 'automatico' } })
    const r = await atender(ENV, { accion: 'liberar', contrato: ID }, 'Bearer t', f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/); expect(llamadas.find(l => l.url.endsWith('release-funds'))!.cuerpo).toEqual({ contractId: CID, releaseSigner: P.publicKey() })
  })
  it('la plataforma no firma transacciones ajenas', () => {
    expect(() => firmarComoPlataforma(configuracion(ENV), xdrDe(INQ))).toThrow(ErrorTw)
  })
  it('sin variables avisa cuáles faltan (sin mostrar valores) y no acepta mainnet', () => {
    expect(() => configuracion({})).toThrow(/TRUSTLESS_WORK_API_KEY/)
    expect(() => configuracion({ ...ENV, TRUSTLESS_WORK_BASE_URL: 'https://api.trustlesswork.com' })).toThrow(/testnet/)
    expect(configuracion({ ...ENV, LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey() }).mediador).toBe(M.publicKey())
    expect(() => configuracion({ ...ENV, LOCKUMI_TW_MEDIADOR_PUBLICA: 'x' })).toThrow(/válida/)
  })
})
