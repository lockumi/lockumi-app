// Paso 19 · Registro de consentimientos de la reputación (C.1 y C.8 de legal/reputacion-textos.md).
// Cuatro opciones independientes por papel (perfil público, Destacados, Nuevos en Lockumi y Mostrar mi puntaje), todas apagadas.
// Se guarda la versión, la fecha y el texto aceptado. No hay «Dejar de mostrar» (decisión de Katherine del 25/10/2026, 2:11 p. m.):
// el perfil queda fijo y visible y solo desaparece cuando la persona elimina su cuenta (borrado.ts). En la demo, se guarda en este navegador;
// en el servidor, la tabla de supabase/migrations/20261025140000_reputacion.sql (escrita, no aplicada).
import { useSyncExternalStore } from 'react'
import type { Rol } from '../types'
import { provinciaDe } from './cantones'
import { UI } from './textos'

export const VERSION_TEXTOS = 'reputacion-1.0-demo · 25 de octubre de 2026'
export type Opcion = 'perfil' | 'destacados' | 'nuevos' | 'puntaje'
export interface Registro { version: string; fecha: string; texto: string[] }
export interface EstadoReputacion { nombre?: string; canton?: string; roles: Record<Rol, Partial<Record<Opcion, Registro>>> }

const clave = (email: string) => 'lockumi.reputacion.v1.' + email.trim().toLowerCase()
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

/** Marca una casilla. Destacados, Nuevos y el puntaje necesitan el perfil público activo (C.1: «No se puede marcar (b) ni (n) sin (a)»). */
export function aceptar(email: string, rol: Rol, o: Opcion, texto: string[], fecha = new Date().toISOString()) {
  const s = leer(email)
  if (o !== 'perfil' && !activa(s, rol, 'perfil')) throw new Error('Primero haz público tu perfil.')
  escribir(email, { ...s, roles: { ...s.roles, [rol]: { ...s.roles[rol], [o]: { version: VERSION_TEXTOS, fecha, texto } } } })
}
/** Solo al eliminar la cuenta (borrado.ts): borra el perfil, las opciones y el registro de esta cuenta. */
export function borrarTodo(email: string) { try { localStorage.removeItem(clave(email)) } catch { /* nada que borrar */ } cache.delete(email); subs.forEach(f => f()) }

export const useReputacion = (email: string) => useSyncExternalStore(f => { subs.add(f); addEventListener('storage', f); return () => { subs.delete(f); removeEventListener('storage', f) } },
  () => leer(email), () => leer(email))

export function validarNombre(n: string): string | null {
  const t = n.trim().replace(/\s+/g, ' ')
  if (!t) return UI.errNombre
  if (t.length > 30) return UI.errNombreLargo
  return /^\p{L}[\p{L}'-]*( \p{L}[\p{L}'-]*)* \p{L}\.?$/u.test(t) ? null : UI.errNombreLargo
}
export const validarCanton = (c: string): string | null => c && provinciaDe(c) ? null : UI.errCanton
