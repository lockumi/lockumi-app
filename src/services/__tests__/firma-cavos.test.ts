// Opción A (26/10/2026): cada acción que mueve la cuenta segura exige una prueba NUEVA firmada con Cavos (api/_lib/prueba-cavos.ts);
// el depósito lo pone el ramp simulado de testnet (api/_lib/rampSimulado.ts); el servidor ya no firma por nadie, salvo para
// terminar los alquileres de antes con cuenta del servidor (PR #54). Todo simulado: sin red, llaves al azar.
import { describe, it, expect } from 'vitest'
import { type Transaction, Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, configuracion, cuentaServidorDe, FONDEO_SIMULADO, SIN_PRUEBA, TEXTO_REVISAR_PAGO, type Entorno, type Pedido } from '../../../api/_lib/tw'
import { revisarPrueba } from '../../../api/_lib/prueba-cavos'
import { exigirRampTestnet, rampActivo, rampSimulado } from '../../../api/_lib/rampSimulado'
import { pruebaDe, firmado } from './prueba-falsa'

const P = Keypair.random(), KD = Keypair.random(), KI = Keypair.random()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const c = configuracion(ENV)
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()
const USDC = { asset_code: 'USDC', asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }

type Op = { escrow?: { balance: number; approver: string }; nonces?: Set<string>; sinTabla?: boolean; eventos?: { tx_hash: string }[]; usdcTesoreria?: number; firmantes?: Record<string, unknown> }
function simular(contrato: Record<string, unknown>, uid: string, o: Op = {}) {
  const enviadas: string[] = [], llamadas: { url: string; metodo?: string; cuerpo?: Record<string, unknown> }[] = [], nonces = o.nonces ?? new Set<string>()
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : undefined
    llamadas.push({ url, metodo: init?.method, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) {
      const g = url.split('/').pop()!; if (o.firmantes?.[g]) return ok(o.firmantes[g])
      return ok({ id: g, sequence: '1', balances: [{ ...USDC, balance: g === P.publicKey() ? String(o.usdcTesoreria ?? 1000) : '0' }] })
    }
    if (url === 'https://horizon-testnet.stellar.org/transactions') { enviadas.push(decodeURIComponent(String(init!.body).slice(3))); return ok({ hash: 'c'.repeat(64) }) }
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    if (url.endsWith('/rest/v1/lk_pruebas_cavos')) {
      if (o.sinTabla) return new Response('{}', { status: 404 })
      if (nonces.has(cuerpo.nonce)) return new Response('{}', { status: 409 })
      nonces.add(cuerpo.nonce); return new Response(null, { status: 201 })
    }
    if (url.includes('/rest/v1/lk_eventos?') && !init?.method) return ok(o.eventos ?? [])
    if (url.includes('rpc/lk_cerrar_aprobado')) return ok(false)
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.includes('/helper/get-escrow-by-contract-ids')) return ok([{ contractId: CID, balance: o.escrow?.balance ?? 0, roles: { approver: o.escrow?.approver ?? P.publicKey() } }])
    if (url.endsWith('/helper/send-transaction')) { enviadas.push(cuerpo.signedXdr); return ok({ status: 'SUCCESS', contractId: CID }) }
    if (url.endsWith('/deployer/single-release') || url.includes('change-milestone-status')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('fund-escrow')) return ok({ unsignedTransaction: xdrDe(String(cuerpo.signer)) })
    if (url.endsWith('approve-milestone')) return ok({ unsignedTransaction: xdrDe(String(cuerpo.approver)) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, enviadas, llamadas, nonces }
}
const alquiler = (estado: string, o: { dueno?: string; inq?: string; escrow?: string | null } = {}) => ({ id: ID, estado, monto: 20, direccion: 'Calle 1',
  escrow_contract_id: o.escrow === undefined ? CID : o.escrow, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: o.dueno ?? KD.publicKey() }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: o.inq ?? KI.publicKey() }] })
const fuente = (x: string) => (TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction).source
const firmadaPor = (x: string, k: Keypair) => { const t = TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction; return t.signatures.some(s => k.verify(t.hash(), s.signature())) }
const ahora = () => Math.floor(Date.now() / 1000)

describe('el servidor rechaza acciones sin una prueba válida de Cavos', () => {
  it.each([
    ['sin prueba', (): ReturnType<typeof pruebaDe> | undefined => undefined],
    ['firma de otra llave', () => pruebaDe(Keypair.random(), 'pagar', ID, { direccion: KI.publicKey() })],
    ['prueba de otra cuenta', () => pruebaDe(Keypair.random(), 'pagar', ID)],
    ['para otra acción', () => pruebaDe(KI, 'liberar', ID)],
    ['para otro alquiler', () => pruebaDe(KI, 'pagar', '99999999-2222-3333-4444-555555555555')],
    ['vencida (más de 5 minutos)', () => pruebaDe(KI, 'pagar', ID, { ts: ahora() - 301 })],
    ['firma alterada', () => { const p = pruebaDe(KI, 'pagar', ID); return { ...p, nonce: p.nonce.replace(/^./, x => x === 'a' ? 'b' : 'a') } }],
  ] as const)('pagar: %s → 401, sin desplegar ni fondear', async (_n, prueba) => {
    const s = simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq')
    await expect(atender(ENV, { accion: 'pagar', contrato: ID, prueba: prueba() as never }, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 401, message: SIN_PRUEBA })
    expect(s.llamadas.some(l => l.url.startsWith('https://dev.api.trustlesswork.com'))).toBe(false); expect(s.enviadas).toEqual([])
  })
  it('el nonce sirve una sola vez', async () => {
    const nonces = new Set<string>(), p = firmado({ accion: 'pagar' as const, contrato: ID }, KI)
    await atender(ENV, p, 'Bearer t', simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq', { nonces }).f)
    await expect(atender(ENV, p, 'Bearer t', simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq', { nonces }).f)).rejects.toMatchObject({ estado: 401 })
  })
  it('sin la tabla de nonces (migración sin aplicar): 503 y no se mueve nada', async () => {
    const s = simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq', { sinTabla: true })
    await expect(atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', s.f)).rejects.toMatchObject({ estado: 503 })
    expect(s.enviadas).toEqual([])
  })
  it.each([
    ['aprobar', 'u-dueno', 'ventana_reclamo', KD],
    ['repartir', 'u-inq', 'cerrado', KI],
    ['liberar', 'u-inq', 'cerrado', KI],
    ['devolver-automatico', 'u-inq', 'cerrado', KI],
  ] as const)('%s: sin prueba o con la de la otra persona → 401', async (accion, uid, estado, _kp) => {
    const otra = uid === 'u-dueno' ? KI : KD
    for (const p of [{ accion, contrato: ID }, firmado({ accion, contrato: ID }, otra)]) {
      const s = simular(alquiler(estado), uid)
      await expect(atender(ENV, p as Pedido, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 401 })
      expect(s.enviadas).toEqual([])
    }
  })
  it('acepta la firma sin el prefijo de Cavos y la de una llave firmante de la cuenta (Horizon, peso ≥ medio)', async () => {
    const g = KI.publicKey(), ctl = Keypair.random()
    expect(await revisarPrueba(pruebaDe(KI, 'pagar', ID, { prefijo: false }), 'pagar', ID, g)).toBeNull()
    const p = pruebaDe(ctl, 'pagar', ID, { direccion: g })
    const conFirmante = simular({}, '', { firmantes: { [g]: { signers: [{ key: ctl.publicKey(), weight: 1 }, { key: g, weight: 0 }], thresholds: { med_threshold: 1 } } } }).f
    expect(await revisarPrueba(p, 'pagar', ID, g, conFirmante)).toBeNull()
    const pocoPeso = simular({}, '', { firmantes: { [g]: { signers: [{ key: ctl.publicKey(), weight: 1 }], thresholds: { med_threshold: 2 } } } }).f
    expect(await revisarPrueba(p, 'pagar', ID, g, pocoPeso)).toMatch(/no firma/)
  })
})

describe('pagar con prueba: ramp simulado de testnet', () => {
  it('despliega con approver = Lockumi, la tesorería fondea (firma la plataforma) y queda en el historial', async () => {
    const s = simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq')
    const r = await atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', s.f)
    expect(r).toMatchObject({ contractId: CID, ramp: 'simulado-testnet' })
    expect(s.llamadas.find(l => l.url.endsWith('/deployer/single-release'))!.cuerpo!.roles).toMatchObject({ approver: P.publicKey(), receiver: KI.publicKey() })
    expect(s.llamadas.find(l => l.url.endsWith('fund-escrow'))!.cuerpo).toEqual({ contractId: CID, signer: P.publicKey(), amount: 20 })
    for (const x of s.enviadas) { expect(fuente(x)).toBe(P.publicKey()); expect(firmadaPor(x, KI)).toBe(false) }
    expect(s.llamadas.some(l => l.url.endsWith('/rest/v1/lk_eventos') && l.cuerpo?.texto === FONDEO_SIMULADO && l.cuerpo?.tx_hash === r.tx)).toBe(true)
  })
  it('si a la tesorería le faltan USDC de prueba, primero los compra con su XLM de prueba (a sí misma)', async () => {
    const s = simular(alquiler('pendiente_pago', { escrow: null }), 'u-inq', { usdcTesoreria: 5 })
    await atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', s.f)
    const compra = s.enviadas.map(x => TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction).find(t => t.operations[0].type === 'pathPaymentStrictReceive')!
    expect(compra.source).toBe(P.publicKey()); expect(compra.operations[0]).toMatchObject({ destination: P.publicKey(), destAmount: '15.0000000' })
  })
  it('nunca fondea dos veces: con el fondeo en el historial devuelve el mismo; con saldo sin historial, a revisar', async () => {
    const ya = simular(alquiler('pendiente_pago'), 'u-inq', { eventos: [{ tx_hash: 'd'.repeat(64) }] })
    expect(await atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', ya.f)).toEqual({ contractId: CID, tx: 'd'.repeat(64), yaExistia: true })
    expect(ya.llamadas.some(l => l.url.endsWith('fund-escrow'))).toBe(false)
    const saldo = simular(alquiler('pendiente_pago'), 'u-inq', { escrow: { balance: 20, approver: P.publicKey() } })
    await expect(atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', saldo.f)).rejects.toMatchObject({ estado: 409, message: TEXTO_REVISAR_PAGO })
    expect(saldo.llamadas.some(l => l.url.endsWith('fund-escrow'))).toBe(false)
  })
  it('el ramp simulado no corre fuera de testnet; rampActivo es el único punto de cambio', async () => {
    expect(rampActivo).toBe(rampSimulado)
    expect(() => exigirRampTestnet({})).not.toThrow()
    expect(() => exigirRampTestnet({ STELLAR_NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015' })).toThrow(/red de prueba/)
    expect(() => exigirRampTestnet({ HORIZON_URL: 'https://horizon.stellar.org' })).toThrow(/red de prueba/)
    expect(() => exigirRampTestnet({ TRUSTLESS_WORK_BASE_URL: 'https://api.trustlesswork.com' })).toThrow(/red de prueba/)
    let llamado = false
    const deps = { entorno: { HORIZON_URL: 'https://horizon.stellar.org' }, asegurarUsdcTesoreria: async () => { llamado = true }, fondearDesdeTesoreria: async () => { llamado = true; return 'x' } }
    await expect(rampSimulado.fondear({ contrato: ID, escrow: CID, monto: 20 }, deps)).rejects.toThrow(/red de prueba/); expect(llamado).toBe(false)
  })
})

describe('alquileres de antes (PR #54, cuenta del servidor) siguen hasta cerrarse', () => {
  const INQ_S = cuentaServidorDe(c, 'u-inq'), DUENO_S = cuentaServidorDe(c, 'u-dueno')
  it('pagar sin prueba: el servidor deja lista la cuenta de antes (trustline) y el ramp fondea', async () => {
    const s = simular(alquiler('pendiente_pago', { inq: INQ_S.publicKey(), escrow: null }), 'u-inq')
    const r = await atender(ENV, { accion: 'pagar', contrato: ID }, 'Bearer t', s.f)
    expect(r.ramp).toBe('simulado-testnet')
    const trust = s.enviadas.map(x => TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction).find(t => t.operations[0].type === 'changeTrust')
    expect(trust).toBeUndefined()   // la cuenta simulada ya tiene trustline (saldo 0): no se firma nada por la persona
    expect(s.enviadas.every(x => !firmadaPor(x, INQ_S))).toBe(true)
  })
  it('aprobar: si el approver del escrow es la cuenta del servidor del dueño, la firma esa cuenta (solo testnet)', async () => {
    const s = simular(alquiler('ventana_reclamo', { dueno: DUENO_S.publicKey() }), 'u-dueno', { escrow: { balance: 20, approver: DUENO_S.publicKey() } })
    const r = await atender(ENV, { accion: 'aprobar', contrato: ID }, 'Bearer t', s.f)
    expect(r.legado).toBe(true)
    const ap = s.enviadas.find(x => fuente(x) === DUENO_S.publicKey())!; expect(firmadaPor(ap, DUENO_S)).toBe(true)
  })
  it('una cuenta Cavos nueva no puede usar la llave de otra persona ni «preparar-cuenta»', async () => {
    await expect(atender(ENV, { accion: 'preparar-cuenta', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago'), 'u-inq').f)).rejects.toMatchObject({ estado: 409 })
    // el dueño con cuenta del servidor no sirve para pagar como inquilino con cuenta Cavos
    await expect(atender(ENV, { accion: 'pagar', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago', { dueno: DUENO_S.publicKey(), escrow: null }), 'u-inq').f)).rejects.toMatchObject({ estado: 401 })
  })
})
