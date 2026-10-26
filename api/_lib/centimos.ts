// Repartos mostrados con 2 decimales que suman exactamente el total (Coordinador 25/10, 5:39 p. m.).
// Se calcula en céntimos: el dueño se redondea y el inquilino (la última parte) recibe el residuo. Lo que llega y la comisión de
// Trustless Work (0,3 %) van con 4 decimales exactos (Legal 25/10, 6:10 p. m.) y la comisión es el residuo: «llega + llega + comisión» = total.
const COMISION_TW = 0.003
const c = (n: number) => Math.round(Number(n || 0) * 100 + 1e-9)
/** Partes en céntimos (2 decimales; suman el depósito y el céntimo que sobra va al inquilino). Lo que llega a cada parte y la comisión,
 *  con 4 decimales y el cálculo exacto (Legal 25/10, 6:10 p. m.): 0,50 + 1,50 → llegan 0,4985 y 1,4955, comisión 0,0060 (con 2 decimales
 *  la comisión salía 0,00 y las llegadas, más de lo que llega de verdad). Llegadas + comisión suman el depósito en diezmilésimos. */
export interface RepartoCentimos { dueno: number; inquilino: number; llegaDueno: number; llegaInquilino: number; comision: number; total: number }
export function repartoCentimos(dueno: number, inquilino: number): RepartoCentimos {
  const total = c(dueno + inquilino), d = Math.min(c(dueno), total), i = total - d
  const ld = Math.round(d * 100 * (1 - COMISION_TW) + 1e-9), li = Math.round(i * 100 * (1 - COMISION_TW) + 1e-9)   // diezmilésimos
  return { dueno: d / 100, inquilino: i / 100, llegaDueno: ld / 1e4, llegaInquilino: li / 1e4, comision: (total * 100 - ld - li) / 1e4, total: total / 100 }
}
/** 4 decimales, solo para las líneas del reparto (lo que llega y la comisión). */
export const cuatroDecimales = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
