// Prueba de billetera (opción A, 26/10/2026): texto que la persona firma con Cavos (signMessage, sin transacción ni fondos)
// antes de cada acción que mueve la cuenta segura. Lo arman igual el cliente (services/billetera.ts) y el servidor
// (api/_lib/prueba-cavos.ts). Como proofMessage de Meteorito (api/_lib/auth.ts), con nonce de un solo uso.
export const ACCIONES_CON_PRUEBA = ['pagar', 'aprobar', 'repartir', 'liberar', 'devolver-automatico', 'activar-cuenta'] as const
export type AccionPrueba = typeof ACCIONES_CON_PRUEBA[number]
/** Lo que manda el cliente. `firma` en base64; `clave` = la llave que firmó (la dirección o una firmante de esa cuenta). */
export interface Prueba { direccion: string; clave: string; firma: string; nonce: string; ts: number }
export const mensajePrueba = (accion: AccionPrueba, contrato: string, direccion: string, nonce: string, ts: number) =>
  `lockumi:${accion}:${contrato}:${direccion}:${nonce}:${ts}`
// LEGAL: pendiente (texto nuevo, 26/10/2026)
/** Error en pantalla cuando el servidor no acepta la prueba (falta, vencida, de otra cuenta o ya usada). */
export const SIN_PRUEBA = 'No pudimos confirmar tu firma. Vuelve a tocar el botón.'
