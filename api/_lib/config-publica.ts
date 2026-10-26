// Configuración PÚBLICA para el navegador (GET /api/config). Solo banderas sí/no derivadas de variables del servidor; nunca
// devuelve el valor de ninguna variable ni nombres de llaves. Paso 22 (Legal 26/10): la línea «Plazo de devolución» dice «solo»
// únicamente si la corrida de cada hora paga las devoluciones (DEVOLUCION_CRON distinto de «0»).
export type EntornoPublico = { DEVOLUCION_CRON?: string }
export const devolucionAutomaticaEncendida = (env: EntornoPublico) => env.DEVOLUCION_CRON?.trim() !== '0'
export const configPublica = (env: EntornoPublico) => ({ devolucionAutomatica: devolucionAutomaticaEncendida(env) })
