import { describe, it, expect, beforeEach } from 'vitest'
import { Keypair, TransactionBuilder, Networks } from '@stellar/stellar-sdk'
import { atenderSolo, reiniciarLimites, type Entorno } from '../../../api/_lib/solo'
import { crearCuentaDesdeTesoreria, XLM_CUENTA_PRUEBA } from '../../../api/_lib/activacion'
import { prepararCuentaLegado } from '../../../api/_lib/tw'
import { USDC } from '../../../api/_lib/red'

// Sin Friendbot (26/10/2026): la tesorería (plataforma) crea las cuentas de prueba con createAccount.
const P = Keypair.random(), SEED = 'semilla-de-prueba-'.padEnd(48, 'x')
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave-de-prueba', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_DEMO_SEED: SEED }
const G = Keypair.random().publicKey()
const lineaUsdc = (b: string) => ({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer, balance: b })

/** Horizon simulado: `existen` = cuentas que ya existen (con sus saldos); las demás dan 404 hasta que se envía su createAccount. */
function horizon(existen: Record<string, unknown[]> = {}) {
  const cuentas = new Map(Object.entries(existen)); cuentas.set(P.publicKey(), [lineaUsdc('500')])
  const enviadas: { ops: string[]; destino?: string; inicial?: string; firmante: string }[] = []; const urls: string[] = []
  const f = (async (url: string, init?: RequestInit) => {
    urls.push(url)
    if (url.includes('/accounts/')) { const g = url.split('/').pop()!; const b = cuentas.get(g)
      return b ? new Response(JSON.stringify({ id: g, sequence: '1', balances: b })) : new Response('{}', { status: 404 }) }
    if (url.endsWith('/transactions')) {
      const t = TransactionBuilder.fromXDR(decodeURIComponent(String(init!.body).slice(3)), Networks.TESTNET) as import('@stellar/stellar-sdk').Transaction
      const o = t.operations as any[]   // eslint-disable-line @typescript-eslint/no-explicit-any
      enviadas.push({ ops: o.map(x => x.type), destino: o[0].destination, inicial: o[0].startingBalance, firmante: t.source })
      if (o[0].type === 'createAccount') cuentas.set(o[0].destination, [{ asset_type: 'native', balance: o[0].startingBalance }])
      if (o[0].type === 'changeTrust') cuentas.set(t.source, [...(cuentas.get(t.source) ?? []), lineaUsdc('0')])
      if (o[0].type === 'payment') cuentas.set(o[0].destination, [lineaUsdc(o[0].amount)])
      return new Response(JSON.stringify({ hash: 'ab'.repeat(32) }))
    }
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, enviadas, urls }
}
beforeEach(() => reiniciarLimites())

describe('sin Friendbot: la tesorería crea las cuentas', () => {
  it('crearCuentaDesdeTesoreria: createAccount firmado por la plataforma; si ya existe no envía nada', async () => {
    const h = horizon()
    expect(await crearCuentaDesdeTesoreria(P, G, h.f)).toBe('ab'.repeat(32))
    expect(h.enviadas).toEqual([{ ops: ['createAccount'], destino: G, inicial: Number(XLM_CUENTA_PRUEBA).toFixed(7), firmante: P.publicKey() }])
    expect(await crearCuentaDesdeTesoreria(P, G, h.f)).toBeNull(); expect(h.enviadas).toHaveLength(1)
    expect(h.urls.some(u => /friendbot/i.test(u))).toBe(false)
  })
  it('rechaza direcciones que no son G…', async () => { await expect(crearCuentaDesdeTesoreria(P, 'x', horizon().f)).rejects.toThrow(/no válida/) })
  it('solo: crear-cuenta la crea la tesorería; una cuenta ya existente no es error', async () => {
    const h = horizon()
    expect(await atenderSolo(ENV, { accion: 'crear-cuenta', cuenta: G }, 'ip', h.f)).toEqual({ creada: true })
    expect(await atenderSolo(ENV, { accion: 'crear-cuenta', cuenta: G }, 'ip', h.f)).toEqual({ creada: false })
    await expect(atenderSolo(ENV, { accion: 'crear-cuenta', cuenta: P.publicKey() }, 'ip', h.f)).rejects.toThrow(/no es válida/)
    expect(h.urls.some(u => /friendbot/i.test(u))).toBe(false)
  })
  it('solo: la cuenta del dueño de prueba la crea la tesorería y abre su trustline', async () => {
    const h = horizon()
    const r = await atenderSolo(ENV, { accion: 'dueno', contrato: '11111111-2222-4333-8444-555555555555' }, 'ip', h.f)
    expect(h.enviadas.map(e => e.ops[0])).toEqual(['createAccount', 'changeTrust']); expect(typeof r.dueno).toBe('string')
    expect(h.urls.some(u => /friendbot/i.test(u))).toBe(false)
  })
  it('solo: usdc-cuenta envía desde la tesorería lo que falta (tope 20) y no compra en el DEX', async () => {
    const h = horizon({ [G]: [lineaUsdc('3')] })
    const r = await atenderSolo(ENV, { accion: 'usdc-cuenta', cuenta: G, monto: 20 }, 'ip', h.f)
    expect(r.via).toBe('tesoreria'); expect(h.enviadas.map(e => e.ops[0])).toEqual(['payment'])
    await expect(atenderSolo(ENV, { accion: 'usdc-cuenta', cuenta: G, monto: 25 }, 'ip', h.f)).rejects.toThrow(/hasta 20/)
  })
  it('solo: usdc-cuenta exige cuenta y línea de USDC; si la tesorería no alcanza, avisa (503) sin comprar en el DEX', async () => {
    await expect(atenderSolo(ENV, { accion: 'usdc-cuenta', cuenta: G, monto: 5 }, 'ip', horizon().f)).rejects.toThrow(/todavía no existe/)
    await expect(atenderSolo(ENV, { accion: 'usdc-cuenta', cuenta: G, monto: 5 }, 'ip', horizon({ [G]: [{ asset_type: 'native', balance: '5' }] }).f)).rejects.toThrow(/USDC habilitado/)
    const h = horizon({ [G]: [lineaUsdc('0')] }); const dedos = h.f
    const pobre = (async (u: string, i?: RequestInit) => u.endsWith(P.publicKey()) ? new Response(JSON.stringify({ id: P.publicKey(), sequence: '1', balances: [lineaUsdc('1')] })) : dedos(u, i)) as typeof fetch
    await expect(atenderSolo(ENV, { accion: 'usdc-cuenta', cuenta: G, monto: 20 }, 'ip', pobre)).rejects.toThrow(/Ahora no pudimos ponerte USDC/)
    expect(h.enviadas).toHaveLength(0)
  })
  it('PR #54 (legado): la cuenta del servidor la crea la tesorería y abre su trustline', async () => {
    const k = Keypair.random(), h = horizon()
    expect((await prepararCuentaLegado(k, P, h.f)).trustline).toBe('ab'.repeat(32))
    expect(h.enviadas.map(e => e.ops[0])).toEqual(['createAccount', 'changeTrust'])
    expect(h.urls.some(u => /friendbot/i.test(u))).toBe(false)
  })
})
