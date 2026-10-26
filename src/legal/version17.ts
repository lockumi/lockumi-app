import { FECHA_ENCENDIDO_REPUTACION } from './fecha-reputacion'
import { FECHA_V111 } from './fecha-v111'
import { FECHA_V112 } from './fecha-v112'
import { FECHA_V113 } from './fecha-v113'
// paso16-unido · Una sola fecha para la 1.7-demo (Legal, 25/10, arreglo 4): los Términos, el Aviso de privacidad, el registro de
// cada aceptación y el contrato dicen «1.7-demo · 25 de octubre de 2026» y lo sacan de aquí. Los .md usan {{edicion}}.
export const V17 = '1.7-demo'
export const FECHA_V17 = '25 de octubre de 2026'
export const EDICION_V17 = `${V17} · ${FECHA_V17}`
// Paso 19 · Reputación (Legal, revisión del PR #26): los textos de la reputación fueron la 1.10-demo, con la fecha REAL de encendido
// (FECHA_ENCENDIDO_REPUTACION, 25/10/2026). La 1.10-demo ya está publicada: queda archivada tal cual en /terminos-1-10 y /privacidad-1-10
// (documentos.ts, textos de src/legal/archivo/8790b52/).
export const V110 = '1.10-demo'
export { FECHA_ENCENDIDO_REPUTACION }   // la fecha vive en fecha-reputacion.ts (la lee la guarda de vite.config.ts)
export const EDICION_V110 = `${V110} · ${FECHA_ENCENDIDO_REPUTACION}`
// Legal (PR #33, 25/10/2026, 11:33 p. m.): la edición de la cuenta pasa a la 1.11-demo (ronda 1.10: nombre visible, código de 6 números,
// «cierre del alquiler»), con la fecha del día de la publicación (fecha-v111.ts). Sin volver a aceptar: quien tiene la 1.10-demo sigue
// igual (no hay tarjetas de cambio de versión) y los registros nuevos se guardan con la 1.11-demo.
// La 1.11-demo ya está publicada (master 04e4424, 26/10/2026): queda archivada tal cual en /terminos-1-11 y /privacidad-1-11
// (documentos.ts, textos de src/legal/archivo/04e4424/).
export const V111 = '1.11-demo'
export { FECHA_V111 }
export const EDICION_V111 = `${V111} · ${FECHA_V111}`
// Legal (revisión de c97585b, 26/10/2026): la edición de la cuenta pasa a la 1.12-demo (eliminar y ocultar un alquiler: Privacidad
// «Cuánto tiempo los guardamos» y la invitación; Términos 5.7 y 15.7), con la fecha del día de la publicación (fecha-v112.ts).
// Sin volver a aceptar, igual que la 1.11-demo.
// La 1.12-demo ya está publicada (master 4dfa5ae, 26/10/2026): queda archivada tal cual en /terminos-1-12 y /privacidad-1-12
// (documentos.ts, textos de src/legal/archivo/4dfa5ae/).
export const V112 = '1.12-demo'
export { FECHA_V112 }
export const EDICION_V112 = `${V112} · ${FECHA_V112}`
// Legal (26/10/2026, 1:15 a. m., plan de Katherine): sin la pantalla aparte de REP-01. El perfil se acepta con la casilla de los Términos
// 1.13-demo («…incluido mi perfil de reputación público»); Términos 15.1 y Privacidad «Perfil de reputación». Sin volver a aceptar.
export const V_REPUTACION = '1.13-demo'
export { FECHA_V113 }
export const EDICION_REPUTACION = `${V_REPUTACION} · ${FECHA_V113}`
/** La edición que dicen los Términos y el Aviso: la 1.13-demo con la reputación encendida. */
export const edicionVigente = () => import.meta.env.VITE_REPUTACION === '1' ? EDICION_REPUTACION : EDICION_V17

// Legal (revisión de 6e9210a, bloqueo 2), hasta la 1.12-demo: la edición de la cuenta solo la guardaba quien aceptó la pantalla previa (REP-01).
// Desde la 1.13-demo (26/10/2026) no hay pantalla previa: el perfil se acepta con la casilla de los Términos, así que al aceptar en la
// pantalla de inicio con la reputación encendida se guarda la edición 1.13-demo. Se lee el almacenamiento directo (sin importar
// src/reputacion) para que el build con el interruptor apagado no cargue nada de la reputación.
/** Dónde guarda src/reputacion/consentimiento.ts el perfil (REP-01) de cada cuenta. */
export const claveReputacion = (email: string) => 'lockumi.reputacion.v1.' + email.trim().toLowerCase()
const leerJson = (s: () => Storage, k: string) => { try { const x = s().getItem(k); return x ? JSON.parse(x) : null } catch { return null } }
const reputacionEncendida = () => import.meta.env.VITE_REPUTACION === '1'
/** Al aceptar en la pantalla de inicio (base: la edición de la versión aceptada; desde C, la 1.9-demo): con la reputación, la 1.13-demo. */
export const edicionAlAceptar = (base = EDICION_V17) => reputacionEncendida() ? EDICION_REPUTACION : base
/** Para los registros de una cuenta (p. ej. la Regla, 6.5.1): la edición de la cuenta (1.12-demo) solo si esa cuenta aceptó su perfil (REP-01). */
export const edicionDeCuenta = (email?: string, base = EDICION_V17) => reputacionEncendida() && email && leerJson(() => localStorage, claveReputacion(email))?.rep01 ? EDICION_REPUTACION : base
