// Legal (PR #33, 25/10/2026, 11:33 p. m.) · Fecha de la 1.11-demo (edición de la cuenta con la reputación). Archivo aparte, sin
// import.meta, para que vite.config.ts la lea. Se escribe EL DÍA DE LA PUBLICACIÓN, justo antes del merge, con
//   node scripts/fecha-1-11.mjs            (fecha de hoy en Costa Rica)   ·   node scripts/fecha-1-11.mjs "27 de octubre de 2026"
// Mientras diga «[», el build de PRODUCCIÓN con VITE_REPUTACION=1 falla (src/legal/encendido.ts): nunca se publica sin fecha.
export const FECHA_V111 = '26 de octubre de 2026'
