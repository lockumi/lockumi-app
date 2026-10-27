// Fondeo automático en testnet (api/_lib/fondeo.ts) y cuenta nueva (api/_lib/cuentaNueva.ts), con red falsa.
import { describe, it, expect, vi } from 'vitest'
import { Keypair } from '@stellar/stellar-sdk'
import { fondearCuenta, montoFondeo } from '../../../api/_lib/fondeo'
import { cuentaNueva, cuerpoActualizar } from '../../../api/_lib/cuentaNueva'
import { USDC } from '../../../api/_lib/red'
import { pedirFondeo, fondearEnSegundoPlano, _reiniciarFondeo } from '../fondeoTestnet'

const H = 'https://horizon-testnet.stellar.org'
const P = Keypair.random(), G = Keypair.random().publicKey()
const cuentaH = (id: string, usdc: string | null) => ({ id, sequence: '1', balances: [{ asset_type: 'native', balance: '10000.0000000' }, ...(usdc === null ? [] : [{ asset_type: 'credential_alphanum4', asset_code: USDC.code, asset_issuer: USDC.issuer, balance: usdc }])] })
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status })
interface Mundo { cuentas: Record<string, ReturnType<typeof cuentaH> | null>; pagosDe?: Record<string, unknown[]>; friendbotOk?: boolean; enviados: string[] }
function red(m: Mundo): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    if (u.startsWith('https://friendbot.stellar.org')) { if (m.friendbotOk === false) return json({}, 500); const g = new URL(u).searchParams.get('addr')!; m.cuentas[g] = cuentaH(g, null); return json({}) }
    let r: RegExpMatchArray | null
    if ((r = u.match(/\/accounts\/(G[A-Z2-7]+)\/payments/))) return json({ _embedded: { records: m.pagosDe?.[r[1]] ?? [] } })
    if ((r = u.match(/\/accounts\/(G[A-Z2-7]+)$/))) { const c = m.cuentas[r[1]]; return c ? json(c) : json({}, 404) }
    if (u === H + '/transactions' && init?.method === 'POST') { m.enviados.push(String(init.body)); return json({ hash: 'h'.repeat(64) }) }
    return json({}, 404)
  }) as typeof fetch
}
const nuevo = (): Mundo => ({ cuentas: { [P.publicKey()]: cuentaH(P.publicKey(), '1000.0000000') }, enviados: [] })
const ENC = { LOCKUMI_FONDEO_TESTNET: '1' }

describe('fondearCuenta', () => {
  it('apagado por defecto: no toca la red', async () => {
    const f = vi.fn(); expect(await fondearCuenta({}, P, G, f as never)).toEqual({ estado: 'apagado' }); expect(f).not.toHaveBeenCalled()
  })
  it('nunca en mainnet', async () => {
    await expect(fondearCuenta({ ...ENC, STELLAR_NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015' }, P, G, vi.fn() as never)).rejects.toThrow(/red de prueba/)
  })
  it('cuenta nueva: Friendbot y luego pide la trustline (la firma la persona)', async () => {
    const m = nuevo(); const r = await fondearCuenta(ENC, P, G, red(m))
    expect(r).toEqual({ estado: 'falta-trustline', xlm: true }); expect(m.cuentas[G]).toBeTruthy(); expect(m.enviados).toHaveLength(0)
  })
  it('con trustline: la tesorería envía el USDC una sola vez (la segunda vez, ya fondeada)', async () => {
    const m = nuevo(); m.cuentas[G] = cuentaH(G, '0.0000000')
    const r = await fondearCuenta(ENC, P, G, red(m)); expect(r.estado).toBe('listo'); expect(m.enviados).toHaveLength(1)
    // la red ahora muestra el pago de la tesorería a la cuenta, y la cuenta lo gastó
    m.cuentas[G] = cuentaH(G, '0.0000000'); m.pagosDe = { [G]: [{ type: 'payment', from: P.publicKey(), asset_code: USDC.code, asset_issuer: USDC.issuer }] }
    expect((await fondearCuenta(ENC, P, G, red(m))).estado).toBe('ya-fondeada'); expect(m.enviados).toHaveLength(1)
  })
  it('si ya tiene el monto, no envía nada (cuentas de antes con saldo)', async () => {
    const m = nuevo(); m.cuentas[G] = cuentaH(G, '25.0000000'); expect((await fondearCuenta(ENC, P, G, red(m))).estado).toBe('ya-fondeada'); expect(m.enviados).toHaveLength(0)
  })
  it('dos pedidos a la vez pagan una sola vez', async () => {
    const m = nuevo(); m.cuentas[G] = cuentaH(G, '0.0000000'); const f = red(m)
    const [a, b] = await Promise.all([fondearCuenta(ENC, P, G, f), fondearCuenta(ENC, P, G, f)])
    expect(a).toEqual(b); expect(m.enviados).toHaveLength(1)
  })
  it('Friendbot caído: no lanza, queda pendiente para reintentar al pagar', async () => {
    const m = nuevo(); m.friendbotOk = false; expect((await fondearCuenta(ENC, P, G, red(m))).estado).toBe('pendiente')
  })
  it('tesorería sin saldo: lo dice, no envía', async () => {
    const m = nuevo(); m.cuentas[P.publicKey()] = cuentaH(P.publicKey(), '1.0000000'); m.cuentas[G] = cuentaH(G, '0.0000000')
    expect((await fondearCuenta(ENC, P, G, red(m))).estado).toBe('tesoreria-sin-saldo'); expect(m.enviados).toHaveLength(0)
  })
  it('el monto nunca pasa del tope de USDC de prueba', () => { expect(montoFondeo({ LOCKUMI_FONDEO_USDC: '500' })).toBe(20); expect(montoFondeo({ LOCKUMI_FONDEO_USDC: '5' })).toBe(5); expect(montoFondeo({})).toBe(20) })
})

describe('cliente', () => {
  it('pedirFondeo nunca lanza: sin sesión o sin red queda pendiente', async () => {
    expect(await pedirFondeo(G, vi.fn().mockRejectedValue(new Error('red')) as never, async () => 't')).toBe('pendiente')
    expect(await pedirFondeo(G, vi.fn() as never, async () => { throw new Error('sin sesión') })).toBe('pendiente')
    expect(await pedirFondeo(G, (async () => json({ estado: 'listo' })) as never, async () => 't')).toBe('listo')
  })
  it('en segundo plano pide una sola vez por cuenta (y de nuevo si falló)', async () => {
    _reiniciarFondeo(); const f = vi.fn(async () => json({ estado: 'ya-fondeada' }))
    vi.doMock('../../servidor/repositorio', () => ({ supabase: async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } }) }))
    fondearEnSegundoPlano(G, f as never); fondearEnSegundoPlano(G, f as never); await new Promise(r => setTimeout(r, 20))
    expect(f.mock.calls.length).toBeLessThanOrEqual(1)
  })
})

describe('cuentaNueva', () => {
  const NUEVA = Keypair.random().publicKey(), ESC = 'C' + 'A'.repeat(55), UID = '00000000-0000-4000-8000-0000000000a1'
  const cfg = { plataforma: P, mediador: Keypair.random().publicKey(), base: 'https://dev.api.trustlesswork.com', llave: 'k', supa: { url: 'https://s.supabase.co', anon: 'a', servicio: 's' } } as never
  it('el cuerpo cambia solo el rol de la persona (dueño = approver, inquilino = receiver)', () => {
    const e = { engagementId: 'x', title: 't', description: 'd', amount: 20, platformFee: 0, roles: { approver: 'A', serviceProvider: 'S', platformAddress: 'P', releaseSigner: 'R', disputeResolver: 'D', receiver: 'V' }, milestones: [{ description: 'm', status: 'pending' }] }
    expect(cuerpoActualizar({ plataforma: P }, ESC, e, 'dueno', NUEVA).escrow.roles).toEqual({ ...e.roles, approver: NUEVA })
    expect(cuerpoActualizar({ plataforma: P }, ESC, e, 'inquilino', NUEVA).escrow.roles).toEqual({ ...e.roles, receiver: NUEVA })
  })
  function mundo(escrows: Record<string, { balance: number | string }>, filas: unknown[]) {
    const llamadas: string[] = []
    const f = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url); llamadas.push((init?.method ?? 'GET') + ' ' + u.replace(/^https:\/\/[^/]+/, '').split('?')[0])
      if (u.includes('/rest/v1/lk_participantes?usuario=eq.')) return json(filas)
      if (u.includes('/rest/v1/lk_participantes?usuario=neq.')) return json([])
      if (u.includes('rpc/lk_cuenta_nueva')) return json({ generacion: 2, sin_escrow: 1 })
      if (u.includes('rpc/lk_asignar_cuenta')) return json(true)
      if (u.includes('get-escrow-by-contract-ids')) return json([{ contractId: ESC, engagementId: 'e', title: 't', description: 'd', amount: 20, platformFee: 0, roles: { approver: 'A', receiver: 'V' }, milestones: [], flags: {}, ...escrows[ESC] }])
      return json({}, 500)
    }) as typeof fetch
    return { f, llamadas }
  }
  const fila = (estado: string, escrow: string | null, liq: string | null = null) => ({ contrato_id: crypto.randomUUID(), rol: 'inquilino', direccion_stellar: 'G' + 'A'.repeat(55), lk_contratos: { id: crypto.randomUUID(), estado, escrow_contract_id: escrow, liquidacion_tx: liq } })
  it('cuenta los alquileres: sin escrow (los pasa la base), con depósito (no se tocan) y cerrados', async () => {
    const { f, llamadas } = mundo({ [ESC]: { balance: 20 } }, [fila('firmas', null), fila('pendiente_pago', ESC), fila('cerrado', ESC, 'f'.repeat(64))])
    const r = await cuentaNueva(cfg, UID, NUEVA, f)
    expect(r).toEqual({ generacion: 2, sinEscrow: 1, rolesActualizados: 0, conDeposito: 2, fallidos: 0 })
    expect(llamadas.some(l => l.startsWith('PUT'))).toBe(false)   // nada se cambió en Trustless Work
  })
  it('cuenta segura sin saldo: update-escrow (falla controlada si TW no responde) y no se pasa en la base', async () => {
    const { f, llamadas } = mundo({ [ESC]: { balance: 0 } }, [fila('pendiente_pago', ESC)])
    const e = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await cuentaNueva(cfg, UID, NUEVA, f)
    expect(llamadas.some(l => l.startsWith('PUT') && l.includes('update-escrow'))).toBe(true)
    expect(r.fallidos).toBe(1); expect(llamadas.some(l => l.includes('lk_asignar_cuenta'))).toBe(false); e.mockRestore()
  })
  it('rechaza cuentas inválidas o de la plataforma', async () => {
    await expect(cuentaNueva(cfg, UID, 'hola', vi.fn() as never)).rejects.toThrow(/no es válida/)
    await expect(cuentaNueva(cfg, UID, P.publicKey(), vi.fn() as never)).rejects.toThrow(/no es válida/)
  })
})
