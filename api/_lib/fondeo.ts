// Fondeo automático de la billetera Cavos en testnet: XLM (Friendbot) + USDC de prueba desde la tesorería (plataforma).
// - SOLO testnet: se niega si la red configurada no es la de prueba. Interruptor: LOCKUMI_FONDEO_TESTNET=1 (apagado por defecto).
// - Idempotente: una cuenta se fondea una sola vez. Se mira la red (Horizon): si la tesorería ya le envió USDC, o si ya tiene el
//   monto, no se envía nada. No hay estado propio ni base de datos.
// - Nunca lanza por fallas del faucet: devuelve un estado y la app reintenta al pagar. La trustline de USDC la firma la persona
//   con su billetera Cavos (aquí no existe su llave): sin trustline el estado es «falta-trustline».
// Reusa los ayudantes de api/_lib/tw.ts (leerCuenta, enviarHorizon, tbH). Fuentes: https://developers.stellar.org/docs/learn/fundamentals/networks#friendbot
import { Keypair, Operation, Asset } from '@stellar/stellar-sdk'
import { leerCuenta, usdcDe, enviarHorizon, tbH, type Entorno } from './tw.js'
import { PASSPHRASE_TESTNET, HORIZON_TESTNET, FRIENDBOT, USDC, TOPE_USDC, exigirTestnet } from './red.js'

export type EstadoFondeo = 'apagado' | 'listo' | 'ya-fondeada' | 'falta-trustline' | 'pendiente' | 'tesoreria-sin-saldo'
export interface ResultadoFondeo { estado: EstadoFondeo; xlm?: boolean; usdcTx?: string }
const G = /^G[A-Z2-7]{55}$/

export const fondeoActivo = (e: Entorno) => e.LOCKUMI_FONDEO_TESTNET?.trim() === '1'
/** USDC de prueba que se le dan a cada cuenta: LOCKUMI_FONDEO_USDC (por defecto y como máximo TOPE_USDC). */
export function montoFondeo(e: Entorno) { const n = Number(e.LOCKUMI_FONDEO_USDC); return Number.isFinite(n) && n > 0 ? Math.min(n, TOPE_USDC) : TOPE_USDC }

/** ¿La tesorería ya le envió USDC de prueba a esta cuenta alguna vez? (lectura de la red: es la marca de «ya fondeada»). */
export async function yaRecibioDeTesoreria(g: string, tesoreria: string, f: typeof fetch): Promise<boolean> {
  const r = await f(`${HORIZON_TESTNET}/accounts/${g}/payments?order=desc&limit=200`)
  if (!r.ok) throw new Error('horizon ' + r.status)
  const j = await r.json() as { _embedded?: { records?: { type: string; from?: string; asset_code?: string; asset_issuer?: string }[] } }
  return (j._embedded?.records ?? []).some(x => x.type === 'payment' && x.from === tesoreria && x.asset_code === USDC.code && x.asset_issuer === USDC.issuer)
}

// Una solicitud a la vez por cuenta en esta instancia (evita pagar dos veces por doble toque).
const enCurso = new Map<string, Promise<ResultadoFondeo>>()

export async function fondearCuenta(e: Entorno, plataforma: Keypair, g: string, f: typeof fetch = fetch): Promise<ResultadoFondeo> {
  if (!fondeoActivo(e)) return { estado: 'apagado' }
  exigirTestnet(e.STELLAR_NETWORK_PASSPHRASE?.trim() || PASSPHRASE_TESTNET, HORIZON_TESTNET, FRIENDBOT)   // nunca en mainnet
  if (!G.test(g) || g === plataforma.publicKey()) throw new Error('cuenta no válida')
  const previa = enCurso.get(g); if (previa) return previa
  const p = hacer(e, plataforma, g, f).finally(() => enCurso.delete(g)); enCurso.set(g, p); return p
}

async function hacer(e: Entorno, plataforma: Keypair, g: string, f: typeof fetch): Promise<ResultadoFondeo> {
  try {
    let a = await leerCuenta(g, f), xlm = true
    if (!a) {   // cuenta nueva: XLM de prueba gratis
      const r = await f(`${FRIENDBOT}/?addr=${g}`)
      if (!r.ok && !(r.status === 400 && /already|exist/i.test(await r.text().catch(() => '')))) return { estado: 'pendiente', xlm: false }
      a = await leerCuenta(g, f); if (!a) return { estado: 'pendiente', xlm: false }
    }
    const tiene = usdcDe(a)
    if (tiene === null) return { estado: 'falta-trustline', xlm }   // la firma la persona (Cavos) y se vuelve a llamar
    const P = plataforma.publicKey(), meta = montoFondeo(e)
    if (tiene >= meta || await yaRecibioDeTesoreria(g, P, f)) return { estado: 'ya-fondeada', xlm }
    const falta = Math.round((meta - tiene) * 1e7) / 1e7
    const tes = await leerCuenta(P, f)
    if (Number(usdcDe(tes) ?? 0) < falta) return { estado: 'tesoreria-sin-saldo', xlm }
    const t = tbH(tes!).addOperation(Operation.payment({ destination: g, asset: new Asset(USDC.code, USDC.issuer), amount: falta.toFixed(7) })).setTimeout(60).build()
    t.sign(plataforma)
    return { estado: 'listo', xlm, usdcTx: await enviarHorizon(t, f) }
  } catch (x) { console.error('fondeo', x instanceof Error ? x.message : 'error'); return { estado: 'pendiente' } }
}
