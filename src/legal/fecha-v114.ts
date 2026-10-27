// Legal (26/10/2026) · Fecha de la 1.14-demo (activación de la cuenta por Lockumi, llave de acceso obligatoria, depósito de dos personas con USDC
// de prueba de Lockumi). Archivo aparte, sin import.meta, para que vite.config.ts la lea. Se escribe EL DÍA DE LA PUBLICACIÓN, justo antes del merge, con
//   node scripts/fecha-1-14.mjs            (fecha de hoy en Costa Rica)   ·   node scripts/fecha-1-14.mjs "27 de octubre de 2026"
// Mientras diga «[», el build de PRODUCCIÓN con VITE_REPUTACION=1 falla (src/legal/encendido.ts): nunca se publica sin fecha.
export const FECHA_V114 = '26 de octubre de 2026'
