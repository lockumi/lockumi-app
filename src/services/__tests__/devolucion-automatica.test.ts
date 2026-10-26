// Paso 7 · Modo de dos personas, opción 1 (Términos 1.7-demo 5.3 d, 6.5 a, 4.2 c, 4.2 e): si el dueño no aprueba ni reclama en su
// plazo, la cuenta de plataforma abre la disputa y OTRA cuenta (la que resuelve disputas) entrega el 100 % al inquilino.
// Fuente: Trustless Work, «Dispute Escrow» (el que resuelve no puede abrir la disputa) y «Resolve Dispute» (la suma de los repartos
// es el saldo): https://docs.trustlesswork.com/trustless-work/api-rest/deploy/change-dispute-flag
//         https://docs.trustlesswork.com/trustless-work/api-rest/deploy/resolving-disputes
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, configuracion, repartoAutomatico, firmarComoMediador, APROBADO, type Entorno } from '../../../api/_lib/tw'

const P = Keypair.random(), M = Keypair.random(), DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(),
  LOCKUMI_TW_MEDIADOR_SECRET: M.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()
const base = { id: ID, monto: 800, direccion: 'Calle 1', escrow_contract_id: CID, liquidacion_tx: null, estado: 'cerrado', resultado: { via: 'automatico', dueno: 0, inquilino: 800 },
  lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: INQ }] }

function simular(contrato: Record<string, unknown>, eventos: { texto: string }[] = [], uid = 'u-inq') {
  const llamadas: { url: string; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    if (url.includes('/rest/v1/lk_eventos?') && !init?.method) return ok(eventos)
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS' })
    if (url.endsWith('/dispute-escrow')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('/resolve-dispute')) return ok({ unsignedTransaction: xdrDe(M.publicKey()) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}

describe('paso 7 · devolución automática (dos personas, opción 1)', () => {
  it('el reparto automático es siempre el 100 % al inquilino: una sola línea, al inquilino, por todo el depósito', () => {
    for (const monto of [0.01, 1, 20, 800, 49999.99]) {
      const r = repartoAutomatico({ ...base, monto } as never)
      expect(r).toEqual([{ address: INQ, amount: monto }])
    }
    // La función no recibe montos ni destinatarios: no hay forma de pedirle otro reparto.
    expect(repartoAutomatico.length).toBe(1)
  })
  it('la plataforma abre la disputa y la cuenta mediadora (distinta) la resuelve con el 100 % al inquilino', async () => {
    const { f, llamadas } = simular(base)
    const r = await atender(ENV, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/)
    const disp = llamadas.find(l => l.url.endsWith('/escrow/single-release/dispute-escrow'))!
    expect(disp.cuerpo).toEqual({ contractId: CID, signer: P.publicKey() })
    const res = llamadas.find(l => l.url.endsWith('/escrow/single-release/resolve-dispute'))!
    expect(res.cuerpo).toEqual({ contractId: CID, disputeResolver: M.publicKey(), distributions: [{ address: INQ, amount: 800 }] })
    expect(llamadas.findIndex(l => l.url.endsWith('dispute-escrow'))).toBeLessThan(llamadas.findIndex(l => l.url.endsWith('resolve-dispute')))
    const enviadas = llamadas.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => TransactionBuilder.fromXDR(String(l.cuerpo!.signedXdr), Networks.TESTNET))
    expect(enviadas.map(t => (t as unknown as { source: string }).source)).toEqual([P.publicKey(), M.publicKey()])
    expect(JSON.stringify(r)).not.toContain(M.secret())
  })
  it('solo si venció el plazo sin reclamo (cerrado automático) y sin la aprobación del dueño', async () => {
    for (const k of [{ ...base, estado: 'ventana_reclamo', resultado: null }, { ...base, resultado: { via: 'mediacion', dueno: 5, inquilino: 795 } }, { ...base, estado: 'reclamo' }, { ...base, estado: 'mediacion', resultado: null }, { ...base, estado: 'reclamo', resultado: { via: 'automatico' } }])
      await expect(atender(ENV, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', simular(k).f)).rejects.toMatchObject({ estado: 409 })
    await expect(atender(ENV, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', simular(base, [{ texto: APROBADO }]).f)).rejects.toMatchObject({ estado: 409 })
  })
  it('si la cuenta mediadora falta o es la misma de la plataforma, no se abre ninguna disputa', async () => {
    const sin = { ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: undefined, LOCKUMI_TW_MEDIADOR_PUBLICA: undefined }
    const a = simular(base); await expect(atender(sin, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', a.f)).rejects.toMatchObject({ estado: 503 })
    expect(a.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
    const igual = { ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: P.publicKey() }
    const b = simular(base); await expect(atender(igual, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', b.f)).rejects.toMatchObject({ estado: 409 })
    expect(b.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
    expect(() => configuracion({ ...ENV, LOCKUMI_TW_MEDIADOR_PUBLICA: Keypair.random().publicKey() })).toThrow(/no coincide/)
  })
  it('la cuenta mediadora solo firma transacciones de contrato que salen de ella', () => {
    const c = configuracion(ENV)
    expect(() => firmarComoMediador(c, xdrDe(P.publicKey()))).toThrow(/cuenta que resuelve disputas/)
    expect(TransactionBuilder.fromXDR(firmarComoMediador(c, xdrDe(M.publicKey())), Networks.TESTNET).signatures).toHaveLength(1)
  })
  it('si ya se devolvió, no repite', async () => {
    const { f, llamadas } = simular({ ...base, liquidacion_tx: 'a'.repeat(64) })
    expect(await atender(ENV, { accion: 'devolver-automatico', contrato: ID }, 'Bearer t', f)).toEqual({ tx: 'a'.repeat(64), yaExistia: true })
    expect(llamadas.some(l => l.url.includes('dispute'))).toBe(false)
  })
})
