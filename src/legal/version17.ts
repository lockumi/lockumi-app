// paso16-unido · Una sola fecha para la 1.7-demo (Legal, 25/10, arreglo 4): los Términos, el Aviso de privacidad, el registro de
// cada aceptación y el contrato dicen «1.7-demo · 25 de octubre de 2026» y lo sacan de aquí. Los .md usan {{edicion}}.
export const V17 = '1.7-demo'
export const FECHA_V17 = '25 de octubre de 2026'
export const EDICION_V17 = `${V17} · ${FECHA_V17}`
// Paso 19 · Reputación (Legal, revisión del PR #26): los textos de la reputación son la 1.10-demo, con la fecha REAL de encendido.
// La fecha es esta sola constante: se fija el día en que se encienda VITE_REPUTACION (no reusar la etiqueta 1.7-demo ya publicada).
export const V_REPUTACION = '1.10-demo'
export const FECHA_ENCENDIDO_REPUTACION = '[fecha de encendido]'
export const EDICION_REPUTACION = `${V_REPUTACION} · ${FECHA_ENCENDIDO_REPUTACION}`
/** La edición que dicen los Términos y el Aviso, y que se guarda al aceptarlos: 1.10-demo con la reputación encendida. */
export const edicionVigente = () => import.meta.env.VITE_REPUTACION === '1' ? EDICION_REPUTACION : EDICION_V17
