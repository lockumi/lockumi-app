// Paso 19 · Registro de consentimientos de la reputación (legal/reputacion-textos-para-producto.md, regla 5, REP-01 y REP-06).
// Una sola aceptación (REP-01), en una pantalla previa a crear la cuenta y aparte de los Términos, con versión, fecha, hora y texto
// (Ley 8968). Antes de tener cuenta se guarda en este navegador y se pasa a la cuenta al entrar. Las vitrinas (Destacados y Nuevos en
// Lockumi) son casillas opcionales por papel. No hay «Dejar de mostrar» ni «Mostrar mi puntaje»:
// el perfil queda fijo y visible y solo desaparece cuando la persona elimina su cuenta (borrado.ts). En la demo, se guarda en este navegador;
// en el servidor, la tabla de supabase/migrations/20261025140000_reputacion.sql (escrita, no aplicada).
import { useSyncExternalStore } from 'react'
import type { Rol } from '../types'
import { provinciaDe } from './cantones'
import { UI } from './textos'
import { EDICION_REPUTACION } from '../legal/version17'

/** Versión de los textos (Legal, revisión del PR #26): «{versión} · {fecha}» = 1.10-demo y la fecha real de encendido (version17.ts). */
export const VERSION_TEXTOS = EDICION_REPUTACION
export type Opcion = 'destacados' | 'nuevos'
const OPCIONES: Opcion[] = ['destacados', 'nuevos']
export interface Registro { version: string; fecha: string; hora?: string; texto: string[] }
export interface EstadoReputacion { nombre?: string; canton?: string; rep01?: Registro; roles: Record<Rol, Partial<Record<Opcion, Registro>>> }
/** Hora de Costa Rica (UTC−6 todo el año), «HH:MM». */
export const horaCR = (iso: string) => new Date(Date.parse(iso) - 6 * 3600_000).toISOString().slice(11, 16)
const registro = (texto: string[], fecha: string): Registro => ({ version: VERSION_TEXTOS, fecha, hora: horaCR(fecha), texto })

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

/** Marca una vitrina (REP-06, opcional). Necesita REP-01. No hay «Mostrar mi puntaje»: se muestra siempre desde el 3.er alquiler. */
export function aceptar(email: string, rol: Rol, o: Opcion, texto: string[], fecha = new Date().toISOString()) {
  const s = leer(email)
  if (!OPCIONES.includes(o)) throw new Error('Esa opción no existe.')
  if (!s.rep01) throw new Error('Primero acepta tu perfil de reputación.')
  escribir(email, { ...s, roles: { ...s.roles, [rol]: { ...s.roles[rol], [o]: registro(texto, fecha) } } })
}
/** REP-01 y REP-01b aceptadas por una cuenta que ya existe (cuentas 1.7-demo). */
export function aceptarRep01(email: string, texto: string[], fecha = new Date().toISOString()) {
  const s = leer(email); if (s.rep01) return
  escribir(email, { ...s, rep01: registro(texto, fecha) })
}
export const aceptoRep01 = (email: string) => !!leer(email).rep01
/** Perfil creado: REP-01, nombre visible y cantón. */
export const perfilCompleto = (email: string) => { const s = leer(email); return !!s.rep01 && !!s.nombre && !!s.canton }

// ——— Antes de crear la cuenta (pantalla previa al login, sin tocar el login) ———
// Legal (revisión del PR #26, regla 2): la aceptación previa vive solo en esta sesión del navegador (sessionStorage) y pasa solo a una
// cuenta recién creada: sin REP-01 y sin alquileres. Una cuenta con historial ve REP-13 y acepta REP-01 con la casilla de la 1.10-demo.
const PREVIA = 'lockumi.reputacion.previa.v2', ENTRAR = 'lockumi.reputacion.entrar.v1'
const sesion = () => { try { return sessionStorage } catch { return null } }
export function previa(): Registro | null { try { const x = sesion()?.getItem(PREVIA); return x ? JSON.parse(x) : null } catch { return null } }
export function aceptarPrevia(texto: string[], fecha = new Date().toISOString()) {
  const s = sesion(); if (!s) throw new Error(UI.errGuardar)
  s.setItem(PREVIA, JSON.stringify(registro(texto, fecha))); subs.forEach(f => f())
}
/** «Ya tengo cuenta: entrar»: abre el login de siempre sin registrar ninguna aceptación (Legal, regla 1). Dura hasta entrar. */
export function entrarSinAceptar() { try { sesion()?.setItem(ENTRAR, '1') } catch { /* sin almacenamiento: se queda en la pantalla */ } subs.forEach(f => f()) }
/** Al entrar a la cuenta se olvida: si sale, vuelve a ver la pantalla previa. */
export const olvidarEntrar = () => { try { sesion()?.removeItem(ENTRAR) } catch { /* nada */ } }
export const quiereEntrar = () => { try { return sesion()?.getItem(ENTRAR) === '1' } catch { return false } }
/** Al entrar: la aceptación previa de ESTA sesión pasa a la cuenta solo si es nueva (`cuentaNueva`: sin REP-01 ni alquileres). Se borra igual. */
export function vincularPrevia(email: string, cuentaNueva: boolean) {
  const p = previa(); if (!p) return
  const s = leer(email); if (cuentaNueva && !s.rep01) escribir(email, { ...s, rep01: p })
  try { sesion()?.removeItem(PREVIA) } catch { /* nada */ }
  subs.forEach(f => f())
}
/** Solo al eliminar la cuenta (borrado.ts): borra el perfil, las opciones y el registro de esta cuenta. */
export function borrarTodo(email: string) { try { localStorage.removeItem(clave(email)) } catch { /* nada que borrar */ } cache.delete(email); subs.forEach(f => f()) }

export const useReputacion = (email: string) => useSyncExternalStore(f => { subs.add(f); addEventListener('storage', f); return () => { subs.delete(f); removeEventListener('storage', f) } },
  () => leer(email), () => leer(email))

export function validarNombre(n: string): string | null {
  const t = n.trim().replace(/\s+/g, ' ')
  if (!t) return UI.errNombre
  if (t.length > 30) return UI.errNombreLargo
  // Legal (revisión del PR #26): un nombre y la inicial del apellido («Laura V.»); «Laura Vargas R.» no.
  return /^\p{L}[\p{L}'-]* \p{L}\.?$/u.test(t) ? null : UI.errNombre
}
export const validarCanton = (c: string): string | null => c && provinciaDe(c) ? null : UI.errCanton
