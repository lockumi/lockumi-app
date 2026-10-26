// Paso 19 · REP-11 «Corregir o pedir revisión» y regla 7 de legal/reputacion-textos-para-producto.md: acuse al instante con fecha y hora,
// el puntaje público dice «En revisión» y ese alquiler no cuenta; respuesta en un máximo de 5 días hábiles; corrección el mismo día si procede.
// En la demo se guarda en este navegador; en el servidor, la tabla lk_reputacion_revisiones (migración escrita, no aplicada).
import type { Rol } from '../types'
import { fechaLimiteBorrado } from './borrado'
import { horaCR } from './consentimiento'
import { UI } from './textos'

export const NOTA_MAX = 300   // REP-11, derecho de respuesta
export interface Revision { id: string; alquilerId: string; rol: Rol; texto: string; nota?: string; fecha: string; hora: string; limite: string; resuelta?: string }
const clave = (email: string) => 'lockumi.reputacion.revisiones.v1.' + email.trim().toLowerCase()

export function revisiones(email: string): Revision[] { try { return JSON.parse(localStorage.getItem(clave(email)) ?? '[]') } catch { return [] } }
/** Alquileres de este papel con una revisión pedida y sin resolver. */
export const enRevisionIds = (email: string, rol: Rol) => new Set(revisiones(email).filter(r => r.rol === rol && !r.resuelta).map(r => r.alquilerId))

/** Cada error dice cómo arreglarlo. */
export function validarRevision(x: { alquilerId: string; texto: string; nota?: string }): string | null {
  if (!x.alquilerId) return UI.errRevAlquiler
  if (!x.texto.trim()) return UI.errRevTexto
  if ((x.nota ?? '').length > NOTA_MAX) return UI.errRevNota
  return null
}
/** Pide la revisión: acuse con fecha y hora; plazo de respuesta de 5 días hábiles (los mismos días hábiles de Costa Rica que el borrado). */
export function pedirRevision(email: string, x: { alquilerId: string; rol: Rol; texto: string; nota?: string }, ahora: string | number = Date.now()): Revision {
  const err = validarRevision(x); if (err) throw new Error(err)
  const fecha = typeof ahora === 'string' ? ahora : new Date(ahora).toISOString()
  const r: Revision = { id: `${Date.parse(fecha)}-${x.alquilerId}`, alquilerId: x.alquilerId, rol: x.rol, texto: x.texto.trim(), ...(x.nota?.trim() ? { nota: x.nota.trim() } : {}),
    fecha, hora: horaCR(fecha), limite: fechaLimiteBorrado(fecha) }
  localStorage.setItem(clave(email), JSON.stringify([...revisiones(email), r]))
  return r
}
export function borrarRevisiones(email: string) { try { localStorage.removeItem(clave(email)) } catch { /* nada */ } }
