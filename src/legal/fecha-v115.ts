// Legal (26/10/2026) · Fecha de la 1.15-demo (Legal, revisión de 89779b8: firma al entrar, 5.5 b) con el USDC de prueba de Lockumi para Cavos, sin el exchange). Archivo aparte, sin import.meta, para que vite.config.ts la lea. Se escribe EL DÍA DE LA PUBLICACIÓN, justo antes del merge, con
//   node scripts/fecha-1-15.mjs            (fecha de hoy en Costa Rica)   ·   node scripts/fecha-1-15.mjs "27 de octubre de 2026"
// Mientras diga «[», el build de PRODUCCIÓN con VITE_REPUTACION=1 falla (src/legal/encendido.ts): nunca se publica sin fecha.
export const FECHA_V115 = '26 de octubre de 2026'
