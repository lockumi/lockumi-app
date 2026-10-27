// Repartos y montos netos de Trustless Work (una sola fuente para la app, los resúmenes, el servidor y los correos).
//
// Partes del reparto (lo que se acordó): 2 decimales que suman exactamente el depósito (Coordinador 25/10, 5:39 p. m.). Se calcula en
// céntimos: el dueño se redondea y el inquilino (la última parte) recibe el residuo.
//
// Lo que LLEGA a cada parte (Katherine 27/10/2026, 1:05 p. m. CR: «mejor no redondear el monto… réstale la comisión real de Trustless»):
// el monto exacto, ya descontada la comisión real, sin redondear y sin ceros de más («0,997», «1,994», «0,4985»). Es el mismo cálculo
// que hace el contrato de Trustless Work en la red, en stroops (7 decimales, la unidad mínima de USDC en Stellar):
//   - Trustless-Work/Trustless-Work-Smart-Escrow f0b706e, contracts/escrow/src/modules/fee/calculator.rs:
//       TRUSTLESS_WORK_FEE_BPS = 30 (0,3 %) sobre BASIS_POINTS_DENOMINATOR = 10000; comisión = piso(total × 30 / 10000).
//   - …/modules/fee/distribution.rs (resolver una disputa con varias partes): a cada parte, piso(parte × comisión / total);
//       llega parte − esa comisión. La comisión de plataforma va igual, pero Lockumi la tiene en 0 (platformFee: 0 en api/_lib/tw.ts y
//       api/_lib/solo.ts): Lockumi no cobra nada.
//   - Medido en testnet: liberación 49fb34d0… 2 → 1,994 + 0,006; resolve_dispute cd92c786… 26,32 + 3,68 → 26,24104 + 3,66896 + 0,09.
export const COMISION_TW_BPS = 30
export const COMISION_PLATAFORMA_BPS = 0
const BPS = 10000n
const aStroops = (n: number) => BigInt(Math.round(Number(n || 0) * 1e7))
const deStroops = (s: bigint) => Number(s) / 1e7

/** Lo que llega a cada parte después de la comisión real de Trustless Work (y la de plataforma, hoy 0), igual que el contrato.
 *  Una sola parte = liberación o devolución completa. `comision` es lo que se descuenta en total (suma de lo que paga cada parte). */
export function netoTrustless(...partes: number[]): { llegan: number[]; comision: number } {
  const s = partes.map(aStroops), total = s.reduce((a, b) => a + b, 0n)
  if (total <= 0n) return { llegan: partes.map(() => 0), comision: 0 }
  const tw = total * BigInt(COMISION_TW_BPS) / BPS, pl = total * BigInt(COMISION_PLATAFORMA_BPS) / BPS
  let com = 0n
  const llegan = s.map(p => { if (p <= 0n) return 0; const f = p * tw / total + p * pl / total; com += f; return deStroops(p - f) })
  return { llegan, comision: deStroops(com) }
}
/** Lo que llega de un solo monto (devolución completa o una parte liberada sola). */
export const netoTW = (monto: number) => netoTrustless(monto).llegan[0]

const c = (n: number) => Math.round(Number(n || 0) * 100 + 1e-9)
/** Partes en céntimos (2 decimales; suman el depósito y el céntimo que sobra va al inquilino). Lo que llega a cada parte y la comisión:
 *  exactos, como el contrato (netoTrustless): 0,50 + 1,50 → llegan 0,4985 y 1,4955, comisión 0,006. Llegadas + comisión = depósito. */
export interface RepartoCentimos { dueno: number; inquilino: number; llegaDueno: number; llegaInquilino: number; comision: number; total: number }
export function repartoCentimos(dueno: number, inquilino: number): RepartoCentimos {
  const total = c(dueno + inquilino), d = Math.min(c(dueno), total), i = total - d
  const n = netoTrustless(d / 100, i / 100)
  return { dueno: d / 100, inquilino: i / 100, llegaDueno: n.llegan[0], llegaInquilino: n.llegan[1], comision: n.comision, total: total / 100 }
}
/** Monto exacto con coma decimal, como usd() (es-CR, al menos 2 decimales) pero sin redondear ni ceros de más: 1 → «1,00»,
 *  0,997 → «0,997», 0,4985 → «0,4985», 26,24104 → «26,24104» (hasta 7 decimales, la precisión de Stellar). */
export const exacto = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })
/** @deprecated nombre viejo (antes 4 decimales fijos); hoy es `exacto`. */
export const cuatroDecimales = exacto
