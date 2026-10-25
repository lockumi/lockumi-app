// Paso 19 · Eliminar la cuenta (decisión de Katherine, 25/10/2026, 2:11 p. m.): gratis y completo en un máximo de 5 días hábiles
// (lunes a viernes, sin los feriados de Costa Rica). Al eliminarla, el perfil de reputación desaparece (desde el pedido deja de
// mostrarse). En la demo se hace en este navegador; en el servidor, con supabase/migrations/20261025140000_reputacion.sql
// (lk_pedir_borrado_cuenta + tarea programada lk_borrar_cuentas_pedidas). Escrita, NO aplicada a producción.
import { borrarTodo } from './consentimiento'
import { leer, activa } from './consentimiento'

export const DIAS_HABILES_BORRADO = 5
const CR = -6 * 3_600_000   // Costa Rica no usa horario de verano: UTC−6 todo el año
const DIA = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function pascua(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(y, mes - 1, dia))
}
/** Feriados de Costa Rica (Código de Trabajo, art. 148; calendario del MTSS para 2026: ninguno se traslada).
 *  Incluye los de pago no obligatorio (2/8, 31/8 y 1/12): también son feriados y no se cuentan como hábiles. */
export function feriadosCR(y: number): Set<string> {
  const p = pascua(y).getTime()
  const fijos = ['01-01', '04-11', '05-01', '07-25', '08-02', '08-15', '08-31', '09-15', '12-01', '12-25'].map(md => `${y}-${md}`)
  return new Set([...fijos, iso(new Date(p - 3 * DIA)), iso(new Date(p - 2 * DIA))])
}
/** ¿Es hábil este día (AAAA-MM-DD)? Lunes a viernes y no feriado. */
export function esDiaHabilCR(dia: string): boolean {
  const d = new Date(dia + 'T00:00:00Z'), s = d.getUTCDay()
  return s !== 0 && s !== 6 && !feriadosCR(d.getUTCFullYear()).has(dia)
}
/** Fecha límite: final del 5.º día hábil después del día del pedido, en hora de Costa Rica (el día del pedido no cuenta). */
export function fechaLimiteBorrado(pedido: string | number, dias = DIAS_HABILES_BORRADO): string {
  let d = new Date(new Date(pedido).getTime() + CR), n = 0
  d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  while (n < dias) { d = new Date(d.getTime() + DIA); if (esDiaHabilCR(iso(d))) n++ }
  return new Date(d.getTime() + DIA - 1 - CR).toISOString()
}

export interface Solicitud { pedido: string; limite: string; hecho?: string }
const PREFIJO = 'lockumi.borrado.v1.'
const clave = (email: string) => PREFIJO + email.trim().toLowerCase()
export function solicitudBorrado(email: string): Solicitud | null {
  try { const x = localStorage.getItem(clave(email)); return x ? JSON.parse(x) : null } catch { return null }
}
/** Pide eliminar la cuenta. Gratis, sin requisitos. Un segundo pedido no cambia el plazo del primero. */
export function pedirBorrado(email: string, ahora: string | number = Date.now()): Solicitud {
  const ya = solicitudBorrado(email)
  if (ya) return ya
  const s: Solicitud = { pedido: typeof ahora === 'string' ? ahora : new Date(ahora).toISOString(), limite: fechaLimiteBorrado(ahora) }
  localStorage.setItem(clave(email), JSON.stringify(s))
  return s
}
/** Tarea programada de la demo (al abrir la app): borra los datos de reputación de cada pedido pendiente. Devuelve las cuentas borradas. */
export function ejecutarBorrados(ahora = Date.now()): string[] {
  const hechos: string[] = []
  const claves: string[] = []
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(PREFIJO)) claves.push(k) } } catch { return [] }
  for (const k of claves) {
    const email = k.slice(PREFIJO.length), s = solicitudBorrado(email)
    if (!s || s.hecho) continue
    borrarTodo(email)
    localStorage.setItem(k, JSON.stringify({ ...s, hecho: new Date(ahora).toISOString() }))
    hechos.push(email)
  }
  return hechos
}
/** El perfil existe si la persona lo hizo público y no pidió eliminar su cuenta. */
export const perfilDisponible = (email: string) => !solicitudBorrado(email) && (activa(leer(email), 'dueno', 'perfil') || activa(leer(email), 'inquilino', 'perfil'))
