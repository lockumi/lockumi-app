// Activación patrocinada de la cuenta (api/_lib/activacion.ts + acción «activar-cuenta» de /api/tw), como api/wallet/activate.ts de
// Meteorito: la plataforma crea la cuenta con 0 XLM y paga la reserva; la persona firma la línea de confianza de USDC. Red falsa.
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Asset } from '@stellar/stellar-sdk'
import { estadoCuenta, construirActivacion, validarActivacion } from '../../../api/_lib/activacion'
import { atender, ErrorTw, type Entorno } from '../../../api/_lib/tw'
import { USDC } from '../../../api/_lib/red'
import { pruebaDe } from './prueba-falsa'

const P = Keypair.random(), KI = Keypair.random(), INQ = KI.publicKey(), DUENO = Keypair.random().publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's' }
const ID = '11111111-2222-3333-4444-555555555555'
const k = { id: ID, estado: 'pendiente_pago', monto: 1, direccion: 'Calle 1', escrow_contract_id: null, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-d', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-i', direccion_stellar: INQ }] }
const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
const conUsdc = { balances: [{ asset_code: USDC.code, asset_issuer: USDC.issuer, balance: '0' }] }

interface Mundo { cuentas: Record<string, unknown | null>; enviados: string[]; nonces: Set<string> }
function red(m: Mundo): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-i' })
    if (url.includes('/rest/v1/lk_pruebas_cavos')) { const n = JSON.parse(String(init!.body)).nonce; if (m.nonces.has(n)) return new Response('{}', { status: 409 }); m.nonces.add(n); return new Response(null, { status: 201 }) }
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([k])
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) {
      const g = url.split('/').pop()!; if (g === P.publicKey()) return ok({ id: g, sequence: '100', balances: [] })
      const c = m.cuentas[g]; return c ? ok(c) : new Response('{}', { status: 404 })
    }
    if (url === 'https://horizon-testnet.stellar.org/transactions' && init?.method === 'POST') {
      const xdr = decodeURIComponent(String(init.body).slice(3)); m.enviados.push(xdr); m.cuentas[INQ] = conUsdc; return ok({ hash: 'h'.repeat(64) })
    }
    return new Response('no', { status: 404 })
  }) as typeof fetch
}
const mundo = (): Mundo => ({ cuentas: {}, enviados: [], nonces: new Set() })
const firmaPersona = (xdr: string, kp = KI) => { const t = TransactionBuilder.fromXDR(xdr, Networks.TESTNET); t.sign(kp); return t.toXDR() }

describe('activacion.ts', () => {
  it('estado: sin cuenta, sin línea de USDC o lista; un fallo de Horizon no se toma por «no existe»', async () => {
    const m = mundo(); const f = red(m)
    expect(await estadoCuenta(INQ, f)).toBe('sin-cuenta')
    m.cuentas[INQ] = { balances: [{ asset_type: 'native', balance: '0' }] }; expect(await estadoCuenta(INQ, f)).toBe('sin-linea')
    m.cuentas[INQ] = conUsdc; expect(await estadoCuenta(INQ, f)).toBe('listo')
    await expect(estadoCuenta(INQ, (async () => new Response('x', { status: 503 })) as never)).rejects.toThrow(/503/)
  })
  it('la transacción: origen = plataforma, cuenta con 0 XLM propios, línea firmada por la persona, reserva patrocinada', async () => {
    const t = await construirActivacion(P, INQ, 'sin-cuenta', red(mundo()))
    expect(t.source).toBe(P.publicKey()); expect(t.operations.map(o => o.type)).toEqual(['beginSponsoringFutureReserves', 'createAccount', 'changeTrust', 'endSponsoringFutureReserves'])
    expect((await construirActivacion(P, INQ, 'sin-linea', red(mundo()))).operations).toHaveLength(3)
    t.sign(KI); expect(() => validarActivacion(t.toXDR(), INQ, P.publicKey())).not.toThrow()
  })
  it('validar rechaza lo que no sea exactamente eso', async () => {
    const buena = (await construirActivacion(P, INQ, 'sin-linea', red(mundo()))).toXDR()
    expect(() => validarActivacion(buena, INQ, P.publicKey())).toThrow(/Falta tu firma/)                      // sin la firma de la persona
    expect(() => validarActivacion(firmaPersona(buena), DUENO, P.publicKey())).toThrow(/inesperada/)           // para otra cuenta
    const otra = new TransactionBuilder(new Account(P.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination: INQ, asset: Asset.native(), amount: '10' })).setTimeout(60).build(); otra.sign(KI)
    expect(() => validarActivacion(otra.toXDR(), INQ, P.publicKey())).toThrow(/inesperada/)                    // un pago, no una activación
    const ajena = new TransactionBuilder(new Account(KI.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) })).setTimeout(60).build(); ajena.sign(KI)
    expect(() => validarActivacion(ajena.toXDR(), INQ, P.publicKey())).toThrow(/inesperada/)                   // origen distinto de la plataforma
    expect(() => validarActivacion('no-es-xdr', INQ, P.publicKey())).toThrow(/inválida/)
  })
})

describe('/api/tw · activar-cuenta', () => {
  it('estado: dice qué falta, sin prueba y sin tocar la red; lista → { listo: true }', async () => {
    const m = mundo(); const f = red(m)
    expect(await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'estado' }, 'Bearer t', f)).toEqual({ listo: false, estado: 'sin-cuenta' })
    m.cuentas[INQ] = conUsdc; expect(await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'estado' }, 'Bearer t', f)).toEqual({ listo: true })
    expect(m.enviados).toHaveLength(0)
  })
  it('preparar exige la prueba de Cavos (de un solo uso); enviar: la plataforma firma y la cuenta queda lista', async () => {
    const m = mundo(); const f = red(m)
    const sin = await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'preparar' }, 'Bearer t', f).catch(x => x)
    expect(sin).toBeInstanceOf(ErrorTw); expect(sin.estado).toBe(401)
    const prueba = pruebaDe(KI, 'activar-cuenta', ID)
    const r = await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'preparar', prueba }, 'Bearer t', f) as { unsignedXdr: string }
    expect(r.unsignedXdr).toBeTruthy()
    const repetida = await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'preparar', prueba }, 'Bearer t', f).catch(x => x)
    expect(repetida.estado).toBe(401)                                                                   // el nonce ya se gastó
    const e = await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'enviar', signedXdr: firmaPersona(r.unsignedXdr) }, 'Bearer t', f)
    expect(e).toMatchObject({ listo: true }); expect(m.enviados).toHaveLength(1)
    const enviada = TransactionBuilder.fromXDR(m.enviados[0], Networks.TESTNET)
    expect(enviada.signatures).toHaveLength(2)                                                          // persona + plataforma
  })
  it('enviar sin la firma de la persona o con otra transacción: rechazado y no se envía nada', async () => {
    const m = mundo(); const f = red(m)
    const t = (await construirActivacion(P, INQ, 'sin-cuenta', f)).toXDR()
    for (const xdr of [t, 'xx']) { const e = await atender(ENV, { accion: 'activar-cuenta', contrato: ID, paso: 'enviar', signedXdr: xdr }, 'Bearer t', f).catch(x => x); expect(e.estado).toBe(400) }
    expect(m.enviados).toHaveLength(0)
  })
})
