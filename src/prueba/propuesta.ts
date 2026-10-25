// Propuesta automática SIMULADA (Términos 1.7-demo, 6.4.3, 6.4.4, 6.5.1 y 6.7). No usa inteligencia artificial ni envía datos.
// Por cada rubro: el menor entre la factura y el precio de referencia más un 25 %, menos la depreciación por vida útil.
import type { Alquiler, Rubro, RespuestaRubro } from '../types'
import { PRECIOS, COLONES_POR_USDC } from '../../api/_lib/precios'

export const MARGEN = 0.25
export { TOPE_REGLA } from '../../api/_lib/avisos'
import { TOPE_REGLA } from '../../api/_lib/avisos'
const r2 = (n: number) => Math.round(n * 100) / 100
/** Motivos de retención (lista cerrada, 6.2). */
export const MOTIVOS: Record<Rubro['motivo'], string> = {
  dano: 'Daño más allá del desgaste normal (6.2 a)',
  faltante: 'Faltante del inventario de entrada (6.2 b)',
  limpieza: 'Limpieza para volver al estado de entrada (6.2 c)',
  reparacion: 'Reparación de uso marcada en el Anexo 6-A, parte B (6.2 d)',
  alquiler: 'Alquiler pendiente, con comprobante (6.2 e)',
  servicios: 'Servicios o cuotas a cargo del inquilino, con recibo (6.2 f)',
}
/** Años del alquiler (para la depreciación). */
export const anios = (a: Pick<Alquiler, 'inicio' | 'fin'>) => Math.max(0, (+new Date(a.fin) - +new Date(a.inicio)) / (365.25 * 86_400_000))
/** Precio de referencia en USDC de prueba (con el tipo de cambio simulado). */
export const referencia = (r: Pick<Rubro, 'ref' | 'cantidad'>) => r.ref >= 0 && PRECIOS[r.ref] ? r2(PRECIOS[r.ref].colones * r.cantidad / COLONES_POR_USDC) : null
export interface Calculo {
  id: string; referencia: number | null; tope: number | null; factura: number | null; base: number
  depreciacion: number; reclamado: number; cotizacion: number | null; propuesto: number; razones: string[]
}
/** Cálculo de un rubro. `resp`: respuesta del inquilino (si rechazó con factura o cotización). */
export function calcular(a: Pick<Alquiler, 'inicio' | 'fin'>, r: Rubro, resp?: RespuestaRubro): Calculo {
  const ref = referencia(r), tope = ref === null ? null : r2(ref * (1 + MARGEN)), fac = r.factura?.monto ?? null
  const razones: string[] = []
  let base: number
  if (fac !== null && tope !== null) { base = Math.min(fac, tope); razones.push(fac <= tope ? `Se usa la factura (${fmt(fac)}): no supera el precio de referencia más un 25 % (${fmt(tope)}).` : `La factura (${fmt(fac)}) supera el precio de referencia más un 25 %: se usa ${fmt(tope)}.`) }
  else if (fac !== null) { base = fac; razones.push(`Sin precio de referencia: se usa la factura (${fmt(fac)}).`) }
  else if (ref !== null) { base = ref; razones.push(`Sin factura: se usa el precio de referencia (${fmt(ref)}, ${PRECIOS[r.ref].fuente}).`) }
  else { base = 0; razones.push('Sin factura ni precio de referencia: este rubro no tiene pruebas para calcular un monto.') }
  const vida = r.ref >= 0 ? PRECIOS[r.ref]?.vida ?? 0 : 0
  const dep = vida > 0 ? Math.min(0.9, anios(a) / vida) : 0
  if (vida > 0) razones.push(`Depreciación simulada: ${Math.round(dep * 100)} % (${anios(a).toFixed(1).replace('.', ',')} años de alquiler sobre ${vida} años de vida útil).`)
  else razones.push('Sin depreciación (servicio o sin vida útil).')
  const reclamado = r2(base * (1 - dep))
  let propuesto = reclamado; let cot: number | null = null
  if (resp && !resp.acepta && resp.soporte) {
    cot = resp.soporte.monto
    if (cot < reclamado) { propuesto = r2((cot + reclamado) / 2); razones.push(`El inquilino presentó una ${resp.soporte.tipo} de ${fmt(cot)}: se propone el punto medio (${fmt(propuesto)}).`) }
    else razones.push(`La ${resp.soporte.tipo} del inquilino (${fmt(cot)}) no es menor: se mantiene ${fmt(reclamado)}.`)
  }
  return { id: r.id, referencia: ref, tope, factura: fac, base: r2(base), depreciacion: dep, reclamado, cotizacion: cot, propuesto, razones }
}
const fmt = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
/** Total que pide el dueño (sin pasar el depósito, 6.6). */
export const totalReclamado = (a: Pick<Alquiler, 'inicio' | 'fin' | 'monto'>, rubros: Rubro[]) => r2(Math.min(a.monto, rubros.reduce((s, r) => s + calcular(a, r).reclamado, 0)))
/** Propuesta: los rubros aceptados por el inquilino van completos; los rechazados, con el cálculo de arriba. */
export function propuesta(a: Pick<Alquiler, 'inicio' | 'fin' | 'monto'>, rubros: Rubro[], resp: Record<string, RespuestaRubro> = {}) {
  const filas = rubros.map(r => calcular(a, r, resp[r.id]))
  return { filas, total: r2(Math.min(a.monto, filas.reduce((s, f) => s + f.propuesto, 0))) }
}
/** Pruebas completas de un rubro (6.4.1): foto de entrada firmada, foto de salida en la app, factura o precio de referencia y descripción. */
export function pruebasCompletas(a: Pick<Alquiler, 'entrada'>, r: Rubro): string[] {
  const falta: string[] = []
  const ent = a.entrada.cuartos[r.cuarto]
  if (!ent || !ent.fotos.length || !(a.entrada.firmas.dueno && a.entrada.firmas.inquilino)) falta.push('foto de entrada firmada')
  if (!r.fotos.length) falta.push('foto de salida')
  if (!r.factura && referencia(r) === null) falta.push('factura o precio de referencia')
  if (r.descripcion.trim().length < 10) falta.push('descripción')
  return falta
}
/** ¿Se puede aplicar la Regla de propuesta automática si el inquilino no responde? (6.5.1 a) */
export function reglaAplica(a: Alquiler): { aplica: boolean; motivo: string } {
  const rec = a.reclamo
  if (!a.regla?.acepta) return { aplica: false, motivo: 'El inquilino no aceptó la regla al firmar.' }
  if (!rec?.rubros?.length) return { aplica: false, motivo: 'El reclamo no tiene rubros.' }
  const sin = rec.rubros.filter(r => pruebasCompletas(a, r).length)
  if (sin.length) return { aplica: false, motivo: 'Algún rubro no tiene pruebas completas.' }
  const t = propuesta(a, rec.rubros).total
  if (t > r2(a.monto * TOPE_REGLA)) return { aplica: false, motivo: 'El total supera el 30 % del depósito.' }
  // Regla de Katherine (24/10, 9:08 p. m.): solo si el inquilino abrió al menos un aviso del reclamo (en la app o por el enlace del correo).
  if (!avisoReclamoAbierto(a)) return { aplica: false, motivo: 'El inquilino no abrió ningún aviso del reclamo.' }
  return { aplica: true, motivo: '' }
}
/** ¿El inquilino abrió algún aviso del reclamo, en la app o por el enlace del correo? */
export const avisoReclamoAbierto = (a: Pick<Alquiler, 'avisos' | 'reclamo'>) => !!primeraApertura(a)
/** Primera apertura registrada de un aviso del reclamo (día 1, 4 o 6, en la app o por el correo) o de la pantalla del reclamo (B.2 v4). */
export function primeraApertura(a: Pick<Alquiler, 'avisos' | 'reclamo'>): string | null {
  const t = (a.avisos ?? []).filter(v => v.para === 'inquilino' && v.id.startsWith('reclamo-')).flatMap(v => [v.abierto, v.abiertoCorreo])
  const todas = [...t, a.reclamo?.pantallaAbierta].filter((x): x is string => !!x).sort()
  return todas[0] ?? null
}
