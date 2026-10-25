// Paso 19 · Eliminar la cuenta (decisión de Katherine, 25/10/2026, 2:11 p. m.): gratis y completo en un máximo de 5 días hábiles
// (lunes a viernes, sin los feriados de Costa Rica). Al eliminarla, el perfil de reputación desaparece (desde el pedido deja de
// mostrarse). Con un alquiler abierto (respuesta final de Legal, REP-09): los 5 días hábiles corren desde que se cierra. Definitiva. En la demo se hace en este navegador; en el servidor, con supabase/migrations/20261025140000_reputacion.sql
// (lk_pedir_borrado_cuenta + tarea programada lk_borrar_cuentas_pedidas). Escrita, NO aplicada a producción.
import type { Alquiler, Estado } from '../types'
import { borrarTodo, leer, horaCR } from './consentimiento'
import { borrarRevisiones } from './revision'
import { borrarAvisos } from './avisos'
import { borrarCorreosEnviados } from './correo'

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

/** Alquiler abierto (Legal, respuesta final del 25/10/2026): hay un depósito guardado, un plazo para reclamar o una mediación en curso.
 *  Es decir, ya se pagó el depósito y el alquiler todavía no se cerró. */
export const ESTADOS_ABIERTOS: readonly Estado[] = ['fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion']
export const alquilerAbierto = (a: Pick<Alquiler, 'estado'>) => ESTADOS_ABIERTOS.includes(a.estado)
const mismo = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
/** Alquileres abiertos de esta persona, como dueño o como inquilino. */
export const abiertosDe = (alquileres: readonly Alquiler[], email: string) =>
  alquileres.filter(a => alquilerAbierto(a) && (mismo(a.duenoEmail, email) || mismo(a.inquilinoEmail, email)))

/** Solicitud de eliminar la cuenta. Es DEFINITIVA: no hay forma de deshacerla ni de volver a mostrar el perfil.
 *  pedido + hora: fecha y hora del pedido (hora de Costa Rica). abierto: tenía un alquiler abierto al pedirla; entonces `limite` es null
 *  hasta que se cierra el último (`cierre`), y desde ahí corren los 5 días hábiles. Mientras tanto los datos solo sirven para cerrar el
 *  alquiler: el perfil no se muestra, el puntaje no se recalcula ni se avisa, y la otra parte sigue viendo el contrato y el historial. */
export interface Solicitud { pedido: string; hora: string; abierto: boolean; limite: string | null; cierre?: string; hecho?: string
  /** Tenía perfil de reputación (REP-01) al pedirlo: sus alquileres pasados siguen contando para la otra parte (Legal, 25/10). */
  conPerfil?: boolean }
const PREFIJO = 'lockumi.borrado.v1.'
const clave = (email: string) => PREFIJO + email.trim().toLowerCase()
export function solicitudBorrado(email: string): Solicitud | null {
  try { const x = localStorage.getItem(clave(email)); return x ? JSON.parse(x) : null } catch { return null }
}
/** ¿Pidió eliminar la cuenta y espera que se cierre un alquiler abierto? */
export const esperandoCierre = (email: string) => { const s = solicitudBorrado(email); return !!s && !s.hecho && s.limite === null }
/** Pide eliminar la cuenta. Gratis, sin requisitos y definitiva. El perfil deja de mostrarse en cuanto se pide.
 *  Un segundo pedido no cambia nada del primero. */
export function pedirBorrado(email: string, ahora: string | number = Date.now(), alquileres: readonly Alquiler[] = []): Solicitud {
  const ya = solicitudBorrado(email)
  if (ya) return ya
  const pedido = typeof ahora === 'string' ? ahora : new Date(ahora).toISOString(), abierto = abiertosDe(alquileres, email).length > 0
  const s: Solicitud = { pedido, hora: horaCR(pedido), abierto, limite: abierto ? null : fechaLimiteBorrado(pedido), conPerfil: !!leer(email).rep01 }
  localStorage.setItem(clave(email), JSON.stringify(s))
  return s
}
/** Fecha de cierre del último alquiler de esta persona que estaba abierto (la fecha del resultado; si no la hay, ahora). */
function ultimoCierre(alquileres: readonly Alquiler[], email: string, ahora: number): string {
  const f = alquileres.filter(a => a.estado === 'cerrado' && (mismo(a.duenoEmail, email) || mismo(a.inquilinoEmail, email)))
    .map(a => a.resultado?.fecha ?? '').filter(x => Number.isFinite(Date.parse(x))).sort((x, y) => Date.parse(y) - Date.parse(x))
  return f[0] ?? new Date(ahora).toISOString()
}
/** Tarea programada de la demo (al abrir la app): borra los datos de reputación de cada pedido pendiente. Devuelve las cuentas borradas.
 *  A quien pidió con un alquiler abierto solo lo borra cuando ya no le queda ninguno abierto (sin la lista de alquileres, no lo borra).
 *  Nunca toca los alquileres: la otra parte sigue viendo el contrato y el historial. */
export function ejecutarBorrados(ahora = Date.now(), alquileres?: readonly Alquiler[]): string[] {
  const hechos: string[] = []
  const claves: string[] = []
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(PREFIJO)) claves.push(k) } } catch { return [] }
  for (const k of claves) {
    const email = k.slice(PREFIJO.length); let s = solicitudBorrado(email)
    if (!s || s.hecho) continue
    if (s.limite === null) {
      if (!alquileres || abiertosDe(alquileres, email).length) continue
      const cierre = ultimoCierre(alquileres, email, ahora)
      s = { ...s, cierre, limite: fechaLimiteBorrado(cierre) }
    }
    borrarTodo(email); borrarRevisiones(email); borrarAvisos(email); borrarCorreosEnviados(email)
    localStorage.setItem(k, JSON.stringify({ ...s, hecho: new Date(ahora).toISOString() }))
    hechos.push(email)
  }
  return hechos
}
/** Legal (25/10): ¿tiene (o tenía, si pidió eliminar su cuenta) perfil de reputación? Las cuentas anteriores a la 1.10-demo no. */
export const tienePerfilReputacion = (email: string) => !!leer(email).rep01 || !!solicitudBorrado(email)?.conPerfil
/** El perfil existe si la persona aceptó REP-01 y no pidió eliminar su cuenta. Si no: «Este perfil ya no está disponible» (REP-09). */
export const perfilDisponible = (email: string) => !solicitudBorrado(email) && !!leer(email).rep01
