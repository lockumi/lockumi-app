// ── SIMULACIÓN TESTNET ── Ramp simulado para el depósito (opción A, 26/10/2026; como mockRampFund de Meteorito,
// api/_lib/escrow.ts). No hay dinero real ni cobro: la tesorería de Lockumi en la red de prueba (la cuenta de la plataforma)
// pone USDC de prueba, sin valor, en la cuenta segura del alquiler, como si la persona hubiera pagado por un ramp real.
// El inquilino no firma ninguna transacción: antes prueba con Cavos que la billetera es suya (api/_lib/prueba-cavos.ts).
// Fuera de testnet NO corre (exigirRampTestnet). Para usar un ramp real se cambia SOLO `rampActivo` (abajo) por otro `Ramp`.
// Docs: docs/firma-cavos.md.
import { PASSPHRASE_TESTNET, RED_ACTIVA, HORIZON_TESTNET, TW_TESTNET } from './red.js'

export interface PedidoRamp { contrato: string; escrow: string; monto: number }
/** Lo que el ramp necesita del proxy (api/_lib/tw.ts): así este archivo no toca llaves ni Trustless Work directamente. */
export interface DepsRamp {
  entorno: Record<string, string | undefined>
  /** Deja en la tesorería al menos `monto` USDC de prueba (compra con su XLM de prueba en el DEX de testnet si falta). */
  asegurarUsdcTesoreria(monto: number): Promise<void>
  /** fund-escrow de Trustless Work firmado por la tesorería y enviado. Devuelve el hash. */
  fondearDesdeTesoreria(escrow: string, monto: number): Promise<string>
}
export interface Ramp { nombre: string; fondear(p: PedidoRamp, d: DepsRamp): Promise<{ tx: string }> }

type Entorno = Record<string, string | undefined>
/** El ramp simulado solo existe en la red de prueba: con otra red, Horizon o API de Trustless Work, se rechaza. */
export function exigirRampTestnet(e: Entorno) {
  const pass = e.STELLAR_NETWORK_PASSPHRASE?.trim() || PASSPHRASE_TESTNET
  const horizon = (e.HORIZON_URL?.trim() || HORIZON_TESTNET).replace(/\/$/, '')
  const tw = (e.TRUSTLESS_WORK_BASE_URL?.trim() || TW_TESTNET).replace(/\/$/, '')
  if (pass !== PASSPHRASE_TESTNET || RED_ACTIVA !== PASSPHRASE_TESTNET || horizon !== HORIZON_TESTNET || tw !== TW_TESTNET)
    throw new Error('El ramp simulado solo existe en la red de prueba.')
}

/** SIMULACIÓN TESTNET: la tesorería fondea la cuenta segura con el monto del alquiler (sale de la base, nunca del navegador). */
export const rampSimulado: Ramp = {
  nombre: 'simulado-testnet',
  async fondear(p, d) {
    exigirRampTestnet(d.entorno)
    await d.asegurarUsdcTesoreria(p.monto)
    return { tx: await d.fondearDesdeTesoreria(p.escrow, p.monto) }
  },
}

/** ÚNICO punto para cambiar al ramp real. */
export const rampActivo: Ramp = rampSimulado
