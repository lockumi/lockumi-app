// 26/10/2026 · Dos personas: Trustless Work respondía 400 «The trustline for address G… (role: receiver) could not be validated»
// porque la cuenta Cavos del inquilino no existía en testnet. Ahora (1) la app del inquilino prepara su cuenta antes de crear la
// cuenta segura (opción A: activación patrocinada por la plataforma y trustline firmada por la persona, sin Friendbot; el depósito lo pone el ramp simulado), (2) el servidor revisa la trustline del receiver antes de llamar a TW y (3) nunca se ve el error técnico.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, mensajeParaPersona, ErrorTw, type Entorno } from '../../../api/_lib/tw'
import { NO_PREPARAR_DEPOSITO, esTecnico } from '../../../api/_lib/red'
import { firmado } from './prueba-falsa'

const P = Keypair.random(), KI = Keypair.random(), DUENO = Keypair.random().publicKey(), INQ = KI.publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's' }
const ID = '11111111-2222-3333-4444-555555555555', CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
const CRUDO = 'Trustless Work /deployer/single-release respondió 400: The trustline for address ' + INQ + ' (role: receiver) could not be validated. Verify that the account exists and has the USDC asset trustline.'
const k = { id: ID, estado: 'pendiente_pago', monto: 1, direccion: 'Calle 1', escrow_contract_id: null, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-d', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-i', direccion_stellar: INQ }] }
const xdrDe = (o: string) => new TransactionBuilder(new Account(o, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(o).toScVal(), nativeToScVal(1, { type: 'i128' })] })).setTimeout(60).build().toXDR()

function servidor(horizon: (g: string) => Response) {
  const urls: string[] = []
  const f = (async (url: string, init?: RequestInit) => {
    urls.push(url); const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-i' })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([k])
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) { const g = url.split('/').pop()!; return g === P.publicKey() ? ok({ id: g, sequence: '1', balances: [{ asset_code: 'USDC', asset_issuer: ISSUER, balance: '100' }] }) : horizon(g) }
    if (url.endsWith('/deployer/single-release') || url.endsWith('fund-escrow')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS', contractId: CID })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, urls }
}

describe('servidor: el receiver necesita la trustline de USDC antes del deploy', () => {
  it('cuenta del inquilino inexistente o sin USDC → 409 con el texto neutral, sin llamar a Trustless Work', async () => {
    for (const h of [() => new Response('{}', { status: 404 }), () => new Response(JSON.stringify({ balances: [{ asset_type: 'native', balance: '10000' }] }))]) {
      const { f, urls } = servidor(h)
      const e = await atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', f).catch(x => x)
      expect(e).toBeInstanceOf(ErrorTw); expect(e.estado).toBe(409); expect(e.message).toBe(NO_PREPARAR_DEPOSITO)
      expect(urls.some(u => u.endsWith('/deployer/single-release'))).toBe(false)
    }
  })
  it('con la trustline del inquilino (aunque el dueño no la tenga) despliega', async () => {
    const { f } = servidor(g => g === INQ ? new Response(JSON.stringify({ balances: [{ asset_code: 'USDC', asset_issuer: ISSUER, balance: '0' }] })) : new Response('{}', { status: 404 }))
    expect((await atender(ENV, firmado({ accion: 'pagar', contrato: ID }, KI), 'Bearer t', f)).contractId).toBe(CID)
  })
})

describe('nunca el error técnico de Trustless Work en pantalla', () => {
  it('el 400 de la trustline → «No pudimos preparar el depósito…»; otros pasos → el aviso de la red de siempre', () => {
    expect(NO_PREPARAR_DEPOSITO).toBe('No pudimos preparar el depósito. Intenta de nuevo en un momento.')
    expect(esTecnico(CRUDO)).toBe(true)
    expect(mensajeParaPersona('pagar', CRUDO)).toBe(NO_PREPARAR_DEPOSITO)
    expect(mensajeParaPersona('liberar', 'Trustless Work /escrow/single-release/release-funds respondió 500: boom')).toBe('La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.')
    expect(mensajeParaPersona('pagar', 'El contrato no está esperando el depósito.')).toBe('El contrato no está esperando el depósito.')
  })
})

// ── Cliente (la app del inquilino) ──
const b = vi.hoisted(() => ({ llamadas: [] as string[], existe: false, trust: false, sinLlave: false }))
vi.mock('../billetera', () => ({
  conectarBilletera: async () => ({ direccion: INQ_CLIENTE, estado: 'ready' }),
  consultarSaldo: async () => (b.existe ? '10000' : null),
  consultarUsdc: async () => (!b.existe ? undefined : b.trust ? (b.llamadas.includes('compra') ? '1' : '0') : null),
  fondear: async () => { b.llamadas.push('friendbot'); b.existe = true },   // ya no se usa en dos personas: la prueba exige que no se llame
  olvidarBilletera: () => {},
  abrirTrustlineUsdc: async () => { b.llamadas.push('trustline'); b.trust = true; return 'tx-trust' },
  firmarXdr: async (x: string) => { b.llamadas.push('firma'); return x },
  firmarPrueba: async (accion: string) => { b.llamadas.push('prueba:' + accion); if (b.sinLlave) throw new Error('not an authorized signer'); return { direccion: INQ_CLIENTE } },
  mensajeFirma: (e: unknown) => String(e).includes('authorized signer') ? 'NO_FIRMANTE' : String(e),
  esTextoNoFirmante: (t: string) => t === 'NO_FIRMANTE',
}))
vi.mock('../../servidor/repositorio', () => ({ tokenSesion: async () => 't', recargar: async () => {} }))
const INQ_CLIENTE = vi.hoisted(() => 'GDJU2MWJWMC37S3PWUVUABI2NPDMGGTMCMY2O3PFNTWMPFDL7QL3VRBX')   // cuenta Cavos de prueba (al azar)

describe('cliente: el inquilino prepara su cuenta antes de crear la cuenta segura', () => {
  beforeEach(() => { b.llamadas.length = 0; b.existe = false; b.trust = false; b.sinLlave = false })
  const fetchFalso = (tw: (cuerpo: Record<string, unknown>) => Response) => vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/tw') {
      const c = JSON.parse(String(init!.body)); b.llamadas.push('tw:' + c.accion + (c.paso ? ':' + c.paso : ''))
      if (c.accion === 'activar-cuenta') {   // activación patrocinada (como /api/wallet/activate de Meteorito)
        if (c.paso === 'estado') return new Response(JSON.stringify({ listo: b.trust }))
        if (c.paso === 'preparar') return new Response(JSON.stringify({ unsignedXdr: 'xdr-sin-firmar' }))
        b.trust = true; return new Response(JSON.stringify({ listo: true, tx: 'tx-act' }))
      }
      return tw(c)
    }
    if (url.includes('/paths/strict-receive')) return new Response(JSON.stringify({ _embedded: { records: [{ source_amount: '5' }] } }))
    if (url.includes('/accounts/')) return new Response(JSON.stringify({ sequence: '1' }))
    if (url.endsWith('/transactions')) { b.llamadas.push('compra'); return new Response(JSON.stringify({ hash: 'h' })) }
    return new Response('no', { status: 404 })
  })
  it('activación patrocinada → prueba de Cavos → pagar (sin Friendbot, sin comprar USDC y sin firmar transacciones del depósito)', async () => {
    vi.stubGlobal('fetch', fetchFalso(c => new Response(JSON.stringify(c.accion === 'pagar' && c.prueba ? { contractId: CID, tx: 'tx-dep' } : {}))))
    const { trustless } = await import('../trustless')
    expect(await trustless.depositar(ID, 1, () => {}, INQ_CLIENTE)).toBe('tx-dep')
    expect(b.llamadas).toEqual(['tw:activar-cuenta:estado', 'prueba:activar-cuenta', 'tw:activar-cuenta:preparar', 'firma', 'tw:activar-cuenta:enviar', 'prueba:pagar', 'tw:pagar'])
    expect(b.llamadas).not.toContain('friendbot')
  })
  it('un error técnico que llegue del servidor no se muestra: «No pudimos preparar el depósito…»', async () => {
    b.existe = true; b.trust = true
    vi.stubGlobal('fetch', fetchFalso(() => new Response(JSON.stringify({ error: CRUDO }), { status: 502 })))
    const { trustless } = await import('../trustless')
    await expect(trustless.depositar(ID, 1, () => {}, INQ_CLIENTE)).rejects.toThrow(NO_PREPARAR_DEPOSITO)
  })
  it('sin la llave en este dispositivo: el servidor pide la prueba y se ve el mensaje corto de usar el dispositivo original', async () => {
    b.existe = true; b.trust = true; b.sinLlave = true
    vi.stubGlobal('fetch', fetchFalso(() => new Response(JSON.stringify({ error: 'No pudimos confirmar tu firma. Vuelve a tocar el botón.' }), { status: 401 })))
    const { trustless } = await import('../trustless')
    await expect(trustless.depositar(ID, 1, () => {}, INQ_CLIENTE)).rejects.toThrow('NO_FIRMANTE')
  })
  it('alquiler de antes con cuenta del servidor (otra cuenta que la billetera): no toca la billetera y lo resuelve el servidor', async () => {
    vi.stubGlobal('fetch', fetchFalso(c => new Response(JSON.stringify(c.accion === 'pagar' ? { contractId: CID, tx: 'tx-srv' } : {}))))
    const { trustless } = await import('../trustless')
    expect(await trustless.depositar(ID, 1, () => {}, INQ)).toBe('tx-srv')
    expect(b.llamadas).toEqual(['prueba:pagar', 'tw:pagar'])
  })
})
