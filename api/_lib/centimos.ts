// Repartos mostrados con 2 decimales que suman exactamente el total (Coordinador 25/10, 5:39 p. m.).
// Se calcula en céntimos: el dueño se redondea y el inquilino (la última parte) recibe el residuo; lo mismo con lo que
// llega y la comisión de Trustless Work (0,3 %), que se queda con el residuo para que «llega + llega + comisión» = total.
const COMISION_TW = 0.003
const c = (n: number) => Math.round(Number(n || 0) * 100 + 1e-9)
export interface RepartoCentimos { dueno: number; inquilino: number; llegaDueno: number; llegaInquilino: number; comision: number; total: number }
export function repartoCentimos(dueno: number, inquilino: number): RepartoCentimos {
  const total = c(dueno + inquilino), d = Math.min(c(dueno), total), i = total - d
  const ld = c(dueno * (1 - COMISION_TW)), li = c(inquilino * (1 - COMISION_TW))
  return { dueno: d / 100, inquilino: i / 100, llegaDueno: ld / 100, llegaInquilino: li / 100, comision: (total - ld - li) / 100, total: total / 100 }
}
