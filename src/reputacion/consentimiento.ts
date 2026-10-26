// Paso 19 · Registro de consentimientos de la reputación (legal/reputacion-textos-para-producto.md, regla 5, REP-01 y REP-06).
// Una sola aceptación del perfil (REP-01), con versión, fecha, hora y texto (Ley 8968). Desde la 1.13-demo (Legal, 26/10/2026) no hay
// pantalla aparte: se acepta con la casilla de los Términos 1.13-demo en la pantalla de inicio (al entrar se registra aquí con la fecha
// y hora de esa aceptación) o, para una cuenta sin perfil, con la misma casilla dentro de «Crear alquiler» o de la invitación. Las vitrinas (Destacados y Nuevos en
// Lockumi) son casillas opcionales por papel. No hay «Dejar de mostrar» ni «Mostrar mi puntaje»:
// el perfil queda fijo y visible y solo desaparece cuando la persona elimina su cuenta (borrado.ts). En la demo, se guarda en este navegador;
// en el servidor, la tabla de supabase/migrations/20261025140000_reputacion.sql (escrita, no aplicada).
import { useSyncExternalStore } from 'react'
import type { Alquiler, Rol } from '../types'
import { provinciaDe } from './cantones'
import { UI } from './textos'
import { EDICION_REPUTACION, claveReputacion } from '../legal/version17'

/** Versión de los textos (Legal, revisión del PR #26): «{versión} · {fecha}» = 1.10-demo y la fecha real de encendido (version17.ts). */
export const VERSION_TEXTOS = EDICION_REPUTACION
export type Opcion = 'destacados' | 'nuevos'
const OPCIONES: Opcion[] = ['destacados', 'nuevos']
export interface Registro { version: string; fecha: string; hora?: string; texto: string[] }
export interface EstadoReputacion { nombre?: string; canton?: string; rep01?: Registro; roles: Record<Rol, Partial<Record<Opcion, Registro>>> }
/** Hora de Costa Rica (UTC−6 todo el año), en 12 horas como pide Legal: «3:21 p. m.», «10:05 a. m.», «12:00 p. m.». */
export function horaCR(iso: string) {
  const d = new Date(Date.parse(iso) - 6 * 3600_000), h = d.getUTCHours()
  // Espacios que no se cortan (U+00A0): «3:21 p. m.» nunca se parte en dos líneas.
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}\u00a0${h < 12 ? 'a.\u00a0m.' : 'p.\u00a0m.'}`
}
const registro = (texto: string[], fecha: string): Registro => ({ version: VERSION_TEXTOS, fecha, hora: horaCR(fecha), texto })

const clave = claveReputacion
const vacio = (): EstadoReputacion => ({ roles: { dueno: {}, inquilino: {} } })
const subs = new Set<() => void>()
const cache = new Map<string, { raw: string | null; v: EstadoReputacion }>()

export function leer(email: string): EstadoReputacion {
  let raw: string | null = null
  try { raw = localStorage.getItem(clave(email)) } catch { /* sin almacenamiento */ }
  const c = cache.get(email)
  if (c && c.raw === raw) return c.v
  let v = vacio()
  try { if (raw) { const x = JSON.parse(raw); v = { ...x, roles: { dueno: x.roles?.dueno ?? {}, inquilino: x.roles?.inquilino ?? {} } } } } catch { /* dato dañado: se empieza de cero */ }
  cache.set(email, { raw, v }); return v
}
function escribir(email: string, v: EstadoReputacion) {
  try { localStorage.setItem(clave(email), JSON.stringify(v)) } catch { throw new Error(UI.errGuardar) }
  subs.forEach(f => f())
}
export const activa = (s: EstadoReputacion, rol: Rol, o: Opcion) => !!s.roles[rol][o]

export function guardarDatos(email: string, nombre: string, canton: string) { escribir(email, { ...leer(email), nombre: nombre.trim().replace(/\s+/g, ' '), canton }) }

/** Marca una vitrina (REP-06, opcional). Necesita REP-01. No hay «Mostrar mi puntaje»: se muestra siempre desde el 3.er alquiler. */
export function aceptar(email: string, rol: Rol, o: Opcion, texto: string[], fecha = new Date().toISOString()) {
  const s = leer(email)
  if (!OPCIONES.includes(o)) throw new Error('Esa opción no existe.')
  if (!s.rep01) throw new Error('Primero acepta tu perfil de reputación.')
  escribir(email, { ...s, roles: { ...s.roles, [rol]: { ...s.roles[rol], [o]: registro(texto, fecha) } } })
}
/** El perfil (REP-01) aceptado con la casilla de los Términos 1.13-demo: en la pantalla de inicio o dentro de crear/unirse. */
export function aceptarRep01(email: string, texto: string[], fecha = new Date().toISOString()) {
  const s = leer(email); if (s.rep01) return
  escribir(email, { ...s, rep01: registro(texto, fecha) })
}
export const aceptoRep01 = (email: string) => !!leer(email).rep01
/** Perfil creado: REP-01, nombre visible y cantón. */
export const perfilCompleto = (email: string) => { const s = leer(email); return !!s.rep01 && !!s.nombre && !!s.canton }

/** Legal (respuesta a 6c71866, punto 2, 3:47 p. m.): las sesiones del servidor son anónimas por aparato y no tienen fecha de creación de la
 *  cuenta, así que la regla es: SIN REP-01 y SIN alquileres → al crear o unirse a un alquiler, la casilla de los Términos 1.13-demo. Una
 *  cuenta anterior con alquileres no tiene perfil y no ve nada nuevo. En el servidor: lk_sin_perfil_ni_alquileres (migración). */
export function sinPerfilNiAlquileres(email: string, alquileres: readonly Alquiler[]): boolean {
  if (leer(email).rep01) return false
  const m = email.trim().toLowerCase()
  return !alquileres.some(a => [a.duenoEmail, a.inquilinoEmail].some(c => c?.trim().toLowerCase() === m))
}
/** Solo al eliminar la cuenta (borrado.ts): borra el perfil, las opciones y el registro de esta cuenta. */
export function borrarTodo(email: string) { try { localStorage.removeItem(clave(email)) } catch { /* nada que borrar */ } cache.delete(email); subs.forEach(f => f()) }

export const useReputacion = (email: string) => useSyncExternalStore(f => { subs.add(f); addEventListener('storage', f); return () => { subs.delete(f); removeEventListener('storage', f) } },
  () => leer(email), () => leer(email))

export function validarNombre(n: string): string | null {
  const t = n.trim().replace(/\s+/g, ' ')
  if (!t) return UI.errNombre
  if (t.length > 30) return UI.errNombreLargo
  // Legal (revisión del PR #26 y ronda del 25/10): el nombre (también compuesto, «Ana María V.») y SOLO la inicial del apellido;
  // nunca un apellido completo al final («Ana María Vargas» no). Hasta dos palabras antes de la inicial, y la inicial lleva punto
  // («Ana R» no; «Ana R.» sí) (Legal, respuesta a 6c71866).
  return /^\p{L}[\p{L}'-]*(?: \p{L}[\p{L}'-]+)? \p{L}\.$/u.test(t) ? null : UI.errNombre
}
export const validarCanton = (c: string): string | null => c && provinciaDe(c) ? null : UI.errCanton
