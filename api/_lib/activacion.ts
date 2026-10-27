// Activación de la cuenta de una persona en testnet, como api/wallet/activate.ts + api/_lib/wallet.ts de Meteorito (26/10/2026).
// NO custodial: la cuenta y la línea de confianza de USDC son de la persona (firma con Cavos signXdr). La plataforma solo PATROCINA
// las reservas (CAP-33: beginSponsoringFutureReserves / endSponsoringFutureReserves), crea la cuenta con 0 XLM propios y paga el fee.
// Sin Friendbot y sin que la persona necesite XLM. Los USDC del depósito los pone el ramp simulado (rampSimulado.ts).
// Solo testnet (la llama /api/tw después de exigirRampTestnet). Docs: docs/fondeo-testnet.md.
import { Account, Keypair, Networks, Operation, Asset, TransactionBuilder, FeeBumpTransaction, type Transaction } from '@stellar/stellar-sdk'
import { HORIZON_TESTNET, PASSPHRASE_TESTNET, USDC } from './red.js'

export type EstadoCuenta = 'listo' | 'sin-cuenta' | 'sin-linea'
const G = /^G[A-Z2-7]{55}$/
/** Error con código HTTP (tw.ts lo convierte en ErrorTw). */
export class ErrorActivacion extends Error { estado: number; constructor(estado: number, m: string) { super(m); this.estado = estado } }
const usdc = () => new Asset(USDC.code, USDC.issuer)

/** Estado en Horizon: sin cuenta (404), sin la línea de USDC, o lista. Cualquier otro fallo de Horizon es un error (no se supone). */
export async function estadoCuenta(g: string, f: typeof fetch = fetch): Promise<EstadoCuenta> {
  if (!G.test(g)) throw new ErrorActivacion(400, 'Cuenta no válida.')
  const r = await f(`${HORIZON_TESTNET}/accounts/${g}`)
  if (r.status === 404) return 'sin-cuenta'
  if (!r.ok) throw new ErrorActivacion(502, 'Horizon respondió ' + r.status)
  const a = await r.json() as { balances?: { asset_code?: string; asset_issuer?: string }[] }
  return a.balances?.some(b => b.asset_code === USDC.code && b.asset_issuer === USDC.issuer) ? 'listo' : 'sin-linea'
}

/** Transacción sin firmar: origen = plataforma (paga fee y reserva); la línea de confianza la firma la persona. */
export async function construirActivacion(plataforma: Keypair, g: string, estado: Exclude<EstadoCuenta, 'listo'>, f: typeof fetch = fetch): Promise<Transaction> {
  const r = await f(`${HORIZON_TESTNET}/accounts/${plataforma.publicKey()}`)
  if (!r.ok) throw new ErrorActivacion(r.status === 404 ? 503 : 502, 'Horizon respondió ' + r.status + ' al leer la cuenta de la plataforma')
  const p = await r.json() as { sequence: string }
  const b = new TransactionBuilder(new Account(plataforma.publicKey(), p.sequence), { fee: '1000', networkPassphrase: PASSPHRASE_TESTNET })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: g }))
  if (estado === 'sin-cuenta') b.addOperation(Operation.createAccount({ destination: g, startingBalance: '0' }))
  b.addOperation(Operation.changeTrust({ asset: usdc(), source: g })).addOperation(Operation.endSponsoringFutureReserves({ source: g }))
  return b.setTimeout(120).build()
}

/** Valida EXACTAMENTE la forma de construirActivacion (lo que la plataforma va a firmar) y que venga la firma de la persona. */
export function validarActivacion(xdr: string, g: string, plataformaPublica: string): Transaction {
  let t
  try { t = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) } catch { throw new ErrorActivacion(400, 'Transacción inválida.') }
  if (t instanceof FeeBumpTransaction) throw new ErrorActivacion(400, 'Transacción inválida.')
  if (t.source !== plataformaPublica) throw new ErrorActivacion(400, 'Transacción inesperada.')
  if (Number(t.fee) > 10_000) throw new ErrorActivacion(400, 'Transacción inesperada.')
  const o = t.operations as any[], n = o.length   // eslint-disable-line @typescript-eslint/no-explicit-any
  const propia = (x: { source?: string }) => (x.source ?? t.source) === t.source
  const ok = (n === 3 || n === 4)
    && o[0].type === 'beginSponsoringFutureReserves' && o[0].sponsoredId === g && propia(o[0])
    && (n === 3 || (o[1].type === 'createAccount' && o[1].destination === g && Number(o[1].startingBalance) === 0 && propia(o[1])))
    && o[n - 2].type === 'changeTrust' && o[n - 2].source === g && o[n - 2].line?.code === USDC.code && o[n - 2].line?.issuer === USDC.issuer
    && o[n - 1].type === 'endSponsoringFutureReserves' && o[n - 1].source === g
  if (!ok) throw new ErrorActivacion(400, 'Transacción inesperada.')
  const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join(''), pista = hex(Keypair.fromPublicKey(g).signatureHint())
  if (!t.signatures.some(s => hex(s.hint()) === pista)) throw new ErrorActivacion(400, 'Falta tu firma.')
  return t
}

/** La plataforma firma (patrocinador y origen) y envía. Devuelve el hash. */
export async function firmarYEnviarActivacion(plataforma: Keypair, t: Transaction, f: typeof fetch = fetch): Promise<string> {
  t.sign(plataforma)
  const r = await f(`${HORIZON_TESTNET}/transactions`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'tx=' + encodeURIComponent(t.toXDR()) })
  const j = await r.json().catch(() => ({})) as { hash?: string; extras?: { result_codes?: unknown } }
  if (!r.ok || !j.hash) throw new ErrorActivacion(502, 'Horizon rechazó la activación: ' + JSON.stringify(j.extras?.result_codes ?? r.status).slice(0, 160))
  return j.hash
}
