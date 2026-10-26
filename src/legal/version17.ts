import { FECHA_ENCENDIDO_REPUTACION } from './fecha-reputacion'
// paso16-unido · Una sola fecha para la 1.7-demo (Legal, 25/10, arreglo 4): los Términos, el Aviso de privacidad, el registro de
// cada aceptación y el contrato dicen «1.7-demo · 25 de octubre de 2026» y lo sacan de aquí. Los .md usan {{edicion}}.
export const V17 = '1.7-demo'
export const FECHA_V17 = '25 de octubre de 2026'
export const EDICION_V17 = `${V17} · ${FECHA_V17}`
// Paso 19 · Reputación (Legal, revisión del PR #26): los textos de la reputación son la 1.10-demo, con la fecha REAL de encendido.
// La fecha es esta sola constante: se fija el día en que se encienda VITE_REPUTACION (no reusar la etiqueta 1.7-demo ya publicada).
export const V_REPUTACION = '1.10-demo'
export { FECHA_ENCENDIDO_REPUTACION }   // la fecha vive en fecha-reputacion.ts (la lee la guarda de vite.config.ts)
export const EDICION_REPUTACION = `${V_REPUTACION} · ${FECHA_ENCENDIDO_REPUTACION}`
/** La edición que dicen los Términos y el Aviso: 1.10-demo con la reputación encendida. */
export const edicionVigente = () => import.meta.env.VITE_REPUTACION === '1' ? EDICION_REPUTACION : EDICION_V17

// Legal (revisión de 6e9210a, bloqueo 2): en los REGISTROS, la 1.10-demo solo la guardan las cuentas nuevas, creadas desde la pantalla
// previa (REP-01). Las cuentas anteriores —también cuando vuelven a entrar— siguen con la 1.7-demo. Se lee el almacenamiento directo
// (sin importar src/reputacion) para que el build con el interruptor apagado no cargue nada de la reputación.
/** Dónde guarda src/reputacion/consentimiento.ts el REP-01 de cada cuenta y la aceptación previa de esta sesión. */
export const claveReputacion = (email: string) => 'lockumi.reputacion.v1.' + email.trim().toLowerCase()
export const CLAVE_PREVIA_REPUTACION = 'lockumi.reputacion.previa.v2'
const leerJson = (s: () => Storage, k: string) => { try { const x = s().getItem(k); return x ? JSON.parse(x) : null } catch { return null } }
const reputacionEncendida = () => import.meta.env.VITE_REPUTACION === '1'
/** Al aceptar en el login (base: la edición de la versión aceptada; desde C, la 1.9-demo): 1.10-demo solo si en esta sesión se aceptó la pantalla previa (cuenta nueva). */
export const edicionAlAceptar = (base = EDICION_V17) => reputacionEncendida() && leerJson(() => sessionStorage, CLAVE_PREVIA_REPUTACION) ? EDICION_REPUTACION : base
/** Para los registros de una cuenta (p. ej. la Regla, 6.5.1): 1.10-demo solo si esa cuenta aceptó su perfil (REP-01). */
export const edicionDeCuenta = (email?: string, base = EDICION_V17) => reputacionEncendida() && email && leerJson(() => localStorage, claveReputacion(email))?.rep01 ? EDICION_REPUTACION : base
