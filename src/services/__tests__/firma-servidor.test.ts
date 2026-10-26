// Firma del servidor en testnet (api/_lib/tw.ts): llave por cuenta, permisos, interruptor y rechazo fuera de testnet.
import { describe, it, expect } from 'vitest'
import { type Transaction, Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, configuracion, cuentaServidorDe, firmaServidorActiva, type Entorno } from '../../../api/_lib/tw'
import { duenoDe, inquilinoPruebaDe } from '../../../api/_lib/solo'

const P = Keypair.random()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const c = configuracion(ENV)
const DUENO = cuentaServidorDe(c, 'u-dueno'), INQ = cuentaServidorDe(c, 'u-inq')
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()

function simular(contrato: Record<string, unknown>, uid: string) {
  const enviadas: string[] = [], urls: string[] = []
  const f = (async (url: string, init?: RequestInit) => {
    urls.push(url); const cuerpo = init?.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : undefined
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) return ok({ id: url.split('/').pop(), sequence: '1', balances: [{ asset_code: 'USDC', asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', balance: '100' }] })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    if (url.includes('rpc/lk_cerrar_aprobado')) return ok(false)
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) { enviadas.push(cuerpo.signedXdr); return ok({ status: 'SUCCESS' }) }
    if (url.includes('change-milestone-status')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('fund-escrow')) return ok({ unsignedTransaction: xdrDe(String(cuerpo.signer)) })
    if (url.endsWith('approve-milestone')) return ok({ unsignedTransaction: xdrDe(String(cuerpo.approver)) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, enviadas, urls }
}
const alquiler = (estado: string, dueno = DUENO.publicKey(), inq = INQ.publicKey()) => ({ id: ID, estado, monto: 20, direccion: 'Calle 1', escrow_contract_id: CID, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: dueno }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: inq }] })
const firmante = (x: string) => (TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction).signatures.some(s => INQ.verify((TransactionBuilder.fromXDR(x, Networks.TESTNET) as Transaction).hash(), s.signature()))

describe('firma del servidor en testnet', () => {
  it('la llave es determinística, distinta por cuenta y distinta de las del modo de una persona', () => {
    expect(cuentaServidorDe(c, 'u-inq').publicKey()).toBe(INQ.publicKey())
    expect(DUENO.publicKey()).not.toBe(INQ.publicKey())
    const s = { seed: P.secret() }
    expect([duenoDe(s, 'u-inq').publicKey(), inquilinoPruebaDe(s, 'u-inq').publicKey()]).not.toContain(INQ.publicKey())
    expect(cuentaServidorDe(configuracion({ ...ENV, LOCKUMI_TW_PLATAFORMA_SECRET: Keypair.random().secret() }), 'u-inq').publicKey()).not.toBe(INQ.publicKey())
  })
  it('«mi-cuenta» solo devuelve la clave pública; con el interruptor apagado, nada', async () => {
    const r = await atender(ENV, { accion: 'mi-cuenta' }, 'Bearer t', simular({}, 'u-inq').f)
    expect(r).toEqual({ cuenta: INQ.publicKey() }); expect(JSON.stringify(r)).not.toContain(INQ.secret())
    expect(await atender({ ...ENV, FIRMA_SERVIDOR_TESTNET: '0' }, { accion: 'mi-cuenta' }, 'Bearer t', simular({}, 'u-inq').f)).toEqual({ cuenta: null })
  })
  it('fuera de testnet se rechaza', () => {
    expect(() => firmaServidorActiva({ STELLAR_NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015' })).toThrow(/red de prueba/)
    expect(() => firmaServidorActiva({ HORIZON_URL: 'https://horizon.stellar.org' })).toThrow(/red de prueba/)
    expect(firmaServidorActiva({})).toBe(true); expect(firmaServidorActiva({ FIRMA_SERVIDOR_TESTNET: '0' })).toBe(false)
  })
  it('el inquilino paga sin firmar en el dispositivo: el servidor firma con SU cuenta y envía', async () => {
    const s = simular(alquiler('pendiente_pago'), 'u-inq')
    const r = await atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', s.f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/); expect(r.unsignedXdr).toBeUndefined(); expect(firmante(s.enviadas[0])).toBe(true)
  })
  it('con el interruptor apagado o una cuenta de antes (Cavos), vuelve la firma en el dispositivo', async () => {
    const off = await atender({ ...ENV, FIRMA_SERVIDOR_TESTNET: '0' }, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago'), 'u-inq').f)
    expect(off.unsignedXdr).toBeTruthy(); expect(off.tx).toBeUndefined()
    const vieja = await atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago', DUENO.publicKey(), Keypair.random().publicKey()), 'u-inq').f)
    expect(vieja.unsignedXdr).toBeTruthy()
  })
  it('nadie firma por el alquiler de otra persona', async () => {
    // otra sesión: no participa
    await expect(atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago'), 'u-otro').f)).rejects.toMatchObject({ estado: 403 })
    await expect(atender(ENV, { accion: 'preparar-cuenta', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago'), 'u-otro').f)).rejects.toMatchObject({ estado: 403 })
    // el dueño no paga por el inquilino
    await expect(atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', simular(alquiler('pendiente_pago'), 'u-dueno').f)).rejects.toMatchObject({ estado: 403 })
    // la cuenta guardada es la llave de otra persona: no se firma con nada del servidor
    const ajena = cuentaServidorDe(c, 'u-otro').publicKey()
    const s = simular(alquiler('pendiente_pago', DUENO.publicKey(), ajena), 'u-inq')
    const r = await atender(ENV, { accion: 'fondear', contrato: ID }, 'Bearer t', s.f)
    expect(r.unsignedXdr).toBeTruthy(); expect(s.enviadas).toHaveLength(0)
    await expect(atender(ENV, { accion: 'preparar-cuenta', contrato: ID }, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 409 })
  })
  it('el dueño aprueba la devolución firmada por el servidor con su cuenta', async () => {
    const s = simular(alquiler('ventana_reclamo'), 'u-dueno')
    const r = await atender(ENV, { accion: 'aprobar', contrato: ID }, 'Bearer t', s.f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/); expect(r.firmaServidor).toBe(true); expect(s.enviadas).toHaveLength(2)
    const t = TransactionBuilder.fromXDR(s.enviadas[1], Networks.TESTNET) as Transaction
    expect(t.source).toBe(DUENO.publicKey()); expect(t.signatures.some(x => DUENO.verify(t.hash(), x.signature()))).toBe(true)
  })
})
