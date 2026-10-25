// Paso 16 · Consentimiento en el momento de usar cada función (no hay pantalla de volver a aceptar). Queda en el alquiler:
// quién, qué texto, con qué versión de los Términos y cuándo. Mediación: casilla de la B.7. Correos: gancho para el paso 11.
import type { Alquiler, Consentimiento, Rol } from '../types'
import { versionAlquiler } from './version'

// LEGAL: revisado (24/10) · B.7, casilla (sin marcar por defecto)
export const CASILLA_MEDIACION = 'Entiendo esto y quiero usar la Mediación Lockumi (demo).'

export function registrarConsentimiento(x: Alquiler, tipo: Consentimiento['tipo'], rol: Rol, texto: string, ahora: number): Consentimiento {
  const c: Consentimiento = { tipo, cuenta: rol === 'dueno' ? x.duenoEmail : x.inquilinoEmail, rol, alquiler: x.id, version: versionAlquiler(x), texto, fecha: new Date(ahora).toISOString() }
  ;(x.consentimientos ??= []).push(c); return c
}
/** Gancho para el paso 11 (correos de los avisos): llamarlo cuando quien prueba marque su casilla del correo. */
export const consentimientoCorreo = (x: Alquiler, rol: Rol, texto: string, ahora: number) => registrarConsentimiento(x, 'correo', rol, texto, ahora)
