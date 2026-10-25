// Plazos de la prueba completa (Términos 1.7-demo, cláusula 6.5): 7 días naturales y, si el día 7 cae en domingo o en un
// feriado de ley de Costa Rica, el plazo termina el siguiente día hábil. Hora de Costa Rica (UTC-6 todo el año, sin horario de verano).
//
// Feriados: Código de Trabajo de Costa Rica, art. 148 (reformado por la Ley 10050 del 25/10/2021):
//   http://www.pgrweb.go.cr/DOCS/NORMAS/1/NOVIGEN/L/1940-1949/1940-1944/1943/1F6D/149416.HTML
//   1 ene, 11 abr, Jueves y Viernes Santos, 1 may, 25 jul, 2 ago, 15 ago, 31 ago, 15 set, 1 dic y 25 dic
//   (2 y 31 ago y 1 dic son feriados «de pago no obligatorio», pero son feriados).
// Calendario del MTSS 2026 (sin traslados ese año): https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2026.pdf
// Consultado el 24/10/2026. Si una ley traslada un feriado a otro día (como en 2020–2024), hay que agregarlo en TRASLADOS.
export const DIA_MS = 86_400_000
const CR = -6 * 3_600_000   // UTC-6

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher), como [mes 1-12, día]. */
export function pascua(y: number): [number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1]
}
const FIJOS: [number, number, string][] = [
  [1, 1, 'Año Nuevo'], [4, 11, 'Juan Santamaría'], [5, 1, 'Día del Trabajador'], [7, 25, 'Anexión del Partido de Nicoya'],
  [8, 2, 'Virgen de los Ángeles'], [8, 15, 'Día de la Madre'], [8, 31, 'Día de la Persona Negra'], [9, 15, 'Independencia'],
  [12, 1, 'Abolición del Ejército'], [12, 25, 'Navidad'],
]
/** Traslados por ley (aaaa-mm-dd original → aaaa-mm-dd de disfrute). Vacío: 2026 no tiene traslados (MTSS). */
export const TRASLADOS: Record<string, string> = {}
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Feriados de ley de un año: { 'aaaa-mm-dd': nombre }. */
export function feriados(y: number): Record<string, string> {
  const r: Record<string, string> = {}
  for (const [m, d, n] of FIJOS) r[iso(y, m, d)] = n
  const [pm, pd] = pascua(y); const p = Date.UTC(y, pm - 1, pd)
  for (const [k, n] of [[-3, 'Jueves Santo'], [-2, 'Viernes Santo']] as const) { const t = new Date(p + k * DIA_MS); r[iso(y, t.getUTCMonth() + 1, t.getUTCDate())] = n }
  for (const [de, a] of Object.entries(TRASLADOS)) if (r[de]) { r[a] = r[de]; delete r[de] }
  return r
}
/** Fecha local de Costa Rica (aaaa-mm-dd) y día de la semana (0 = domingo) de un instante. */
export function diaCR(t: number): { fecha: string; semana: number } {
  const x = new Date(t + CR)
  return { fecha: iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()), semana: x.getUTCDay() }
}
export const esFeriado = (t: number) => { const { fecha } = diaCR(t); return feriados(Number(fecha.slice(0, 4)))[fecha] ?? null }

export interface Vencimiento { fin: number; movido: null | 'domingo' | 'feriado'; feriado?: string }
/** Fin de un plazo de `dias` días naturales desde `inicio`. Si el último día cae en domingo o feriado, pasa al siguiente día hábil
 *  (misma hora). Solo para plazos en días enteros: con plazos cortos de la red de prueba (minutos u horas) no se mueve. */
export function vencimiento(inicio: number, ms: number): Vencimiento {
  let fin = inicio + ms
  if (ms % DIA_MS !== 0) return { fin, movido: null }
  const { semana } = diaCR(fin), f = esFeriado(fin)
  const movido = semana === 0 ? 'domingo' : f ? 'feriado' : null
  if (!movido) return { fin, movido: null }
  let n = 0
  while (diaCR(fin).semana === 0 || esFeriado(fin)) { fin += DIA_MS; if (++n > 10) break }
  return { fin, movido, ...(f && { feriado: f }) }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
/** «16 nov 2027, 10:00» en hora de Costa Rica (siempre, sin importar la zona del aparato). */
export function fechaHoraCR(t: number): string {
  const x = new Date(t + CR)
  return `${x.getUTCDate()} ${MESES[x.getUTCMonth()]} ${x.getUTCFullYear()}, ${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`
}
/** «16 nov 2027» en hora de Costa Rica. */
export const fechaCR = (t: number) => fechaHoraCR(t).split(',')[0]
/** Suma `n` días hábiles (lunes a viernes, sin feriados de ley) a `t`, a la misma hora. Mediación Lockumi (demo): 3 días hábiles. */
export function sumarHabiles(t: number, n: number): number {
  let x = t, k = 0
  while (k < n) { x += DIA_MS; const { semana } = diaCR(x); if (semana !== 0 && semana !== 6 && !esFeriado(x)) k++ }
  return x
}
