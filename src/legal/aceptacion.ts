import type { AceptacionLegal, Usuario } from '../types'
import { edicionDe } from './versiones'

/** Dos aceptaciones separadas y obligatorias, cada una con su versión y fecha (ISO 8601):
 *  - terminos:   "Acepto los Términos y condiciones"            → localStorage `lockumi.terminos.aceptacion`
 *  - privacidad: consentimiento del Aviso de privacidad y de la
 *                transferencia de datos dentro y fuera de CR    → localStorage `lockumi.privacidad.consentimiento`
 *  Al entrar se copian también al usuario (`Usuario.terminos` y `Usuario.privacidad`, en `lockumi.usuario`). */
export type ClaveLegal = 'terminos' | 'privacidad'
export const K_ACEPTACION: Record<ClaveLegal, string> = { terminos: 'lockumi.terminos.aceptacion', privacidad: 'lockumi.privacidad.consentimiento' }

export const MSJ_SIN_TERMINOS = 'Para continuar, marca la casilla «Acepto los Términos y condiciones». Puedes leerlos en el enlace antes de aceptar.'
export const MSJ_SIN_PRIVACIDAD = 'Para continuar, marca también la casilla del Aviso de privacidad y la transferencia de tus datos. Puedes leer el aviso en el enlace.'

/** Errores por casilla; objeto vacío si se puede continuar. */
export function validarAceptaciones(m: { terminos: boolean; privacidad: boolean }): Partial<Record<ClaveLegal, string>> {
  const e: Partial<Record<ClaveLegal, string>> = {}
  if (!m.terminos) e.terminos = MSJ_SIN_TERMINOS
  if (!m.privacidad) e.privacidad = MSJ_SIN_PRIVACIDAD
  return e
}

/** Los errores solo aparecen al intentar continuar (validarAceptaciones al tocar "Entrar"); nunca al cargar.
 *  Al marcar una casilla desaparece su error; los de las demás se mantienen. */
export const ERRORES_INICIALES: Partial<Record<ClaveLegal, string>> = {}
export function erroresTrasCambio(e: Partial<Record<ClaveLegal, string>>, c: ClaveLegal, marcada: boolean): Partial<Record<ClaveLegal, string>> {
  if (!marcada || !e[c]) return e
  const { [c]: _quitado, ...resto } = e; void _quitado; return resto
}

export function leerAceptacion(c: ClaveLegal): AceptacionLegal | null {
  try { const s = localStorage.getItem(K_ACEPTACION[c]); const a = s ? JSON.parse(s) : null; return a && typeof a.version === 'string' && typeof a.fecha === 'string' ? a : null } catch { return null }
}
/** ¿Hay una aceptación guardada de esta versión exacta? Si Legal cambia la versión, se vuelve a pedir. */
export const aceptoVersion = (c: ClaveLegal, version: string) => leerAceptacion(c)?.version === version

export function guardarAceptacion(c: ClaveLegal, version: string, ahora = new Date()): AceptacionLegal {
  const a: AceptacionLegal = { version, fecha: ahora.toISOString(), ...(edicionDe(version) && { edicion: edicionDe(version) }) }
  localStorage.setItem(K_ACEPTACION[c], JSON.stringify(a)); return a
}
export const borrarAceptacion = (c: ClaveLegal) => localStorage.removeItem(K_ACEPTACION[c])

/** Copia las aceptaciones guardadas al usuario (modelo `Usuario`). */
export const conAceptacion = (u: Usuario): Usuario => {
  const t = leerAceptacion('terminos'), p = leerAceptacion('privacidad')
  return { ...u, ...(t && { terminos: t }), ...(p && { privacidad: p }) }
}
