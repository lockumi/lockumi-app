// Pasos que dejan una transacción en la red de prueba de Stellar (testnet) y cómo se llaman en la app.
import type { PasoRed } from '../types'

export const NOMBRE_PASO: Record<PasoRed, string> = {
  trustline: 'USDC habilitado en la cuenta del inquilino', compra: 'USDC de prueba enviados al inquilino', duenoTrustline: 'USDC habilitado en la cuenta del dueño de prueba',
  escrow: 'Cuenta segura del depósito creada', deposito: 'Depósito bloqueado en la cuenta segura', evidencia: 'Evidencia del acta de salida',
  aprobacion: 'Aprobación del dueño de prueba', liberacion: 'Depósito devuelto al inquilino',
  disputa: 'Reclamo del dueño registrado en la cuenta segura', resolucion: 'Reparto del depósito',   // LEGAL: revisado (24/10)
}
export const ORDEN: PasoRed[] = ['trustline', 'compra', 'duenoTrustline', 'escrow', 'deposito', 'evidencia', 'aprobacion', 'disputa', 'resolucion', 'liberacion']
/** Hash de transacción (64 hex). Los marcadores como «ya-aprobado» no son comprobantes. */
export const esHash = (h?: string): h is string => !!h && /^[0-9a-f]{64}$/.test(h)
