// Paso 19 · La fecha REAL de encendido de la reputación (1.10-demo). Archivo aparte, sin import.meta, para que vite.config.ts la lea
// y el build de producción falle si se enciende VITE_REPUTACION con la fecha de borrador (src/legal/encendido.ts).
// El día del encendido se escribe aquí con el formato de Legal: «2 de noviembre de 2026».
export const FECHA_ENCENDIDO_REPUTACION = '25 de octubre de 2026'
