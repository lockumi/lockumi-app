// Textos de los avisos (en la app y por correo) de la prueba completa. Los comparten la app (src/prueba/avisos.ts) y el servidor
// de correo (api/_lib/correo.ts): el servidor arma el correo con estos mismos textos y solo recibe datos (montos, fechas y rubros
// de la tabla de precios), nunca texto libre.
import { fechaHoraCR, fechaCR } from './plazos.js'
import { PRECIOS } from './precios.js'

export const PLANTILLAS = ['dueno-1', 'dueno-4', 'dueno-6', 'reclamo-1', 'reclamo-4', 'reclamo-6', 'reparacion-5'] as const
export type Plantilla = typeof PLANTILLAS[number]
export const TOPE_REGLA = 0.3
/** Nombre de rubro para «otro» (sin precio de referencia): no se manda texto libre por correo. */
export const OTRO_RUBRO = 'otro rubro'
export const RUBROS_VALIDOS = new Set([...PRECIOS.map(p => p.rubro), OTRO_RUBRO])
/** Datos de un aviso: montos en USDC de prueba, fechas en milisegundos. */
export interface DatosAviso {
  deposito: number; reclamado?: number; venceMs?: number; finAlquilerMs?: number
  recibido?: boolean; regla?: boolean; rubros?: string[]
}
const u = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
export const venceTexto = (fin: number) => `${fechaHoraCR(fin)}, hora de Costa Rica`
export interface Contenido { asunto: string; texto: string }

/** Frase de los días 1 y 6 del reclamo según la regla aceptada al firmar (en la app). */
export const segunRegla = (regla: boolean) => regla ? `Si no respondes, se aplicará la propuesta automática (máximo el ${TOPE_REGLA * 100} % del depósito, solo con pruebas completas).`
  : 'Si no respondes, el caso pasa a la mediación, que tiene costo (en la demo no se cobra).'
/** Asunto y texto de cada aviso. */
export function textoAviso(p: Plantilla, d: DatosAviso): Contenido {
  const vence = venceTexto(d.venceMs ?? 0)
  // LEGAL: revisado (24/10) · B.2 (frase del día 1 y del día 6 según la regla)
  const segun = segunRegla(!!d.regla)
  switch (p) {
    // LEGAL: revisado (24/10) · B.2b (en la demo, «depósito de prueba»)
    case 'dueno-1': return { asunto: 'Tienes 7 días naturales para revisar la casa y reclamar',
      texto: (d.recibido ? '' : 'Como no confirmaste «Recibí la casa», tu plazo empezó automáticamente 2 días después de la entrega registrada. ')
        + `Empezó tu plazo para revisar la casa y, si hace falta, reclamar del depósito de prueba de ${u(d.deposito)}. Vence el ${vence}. Solo se puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si todo está bien, puedes tocar «Todo bien, devolver». Si el plazo vence sin reclamo, se devuelve todo el depósito de prueba al inquilino.` }
    case 'dueno-4': return { asunto: 'Te quedan 3 días para revisar y reclamar', texto: `Te quedan 3 días para revisar y reclamar. Vence el ${vence}. Después, el depósito de prueba se devuelve completo al inquilino.` }
    case 'dueno-6': return { asunto: 'Último aviso: tu plazo para reclamar vence mañana', texto: `Último aviso: tu plazo para reclamar vence mañana, ${vence}. Si no reclamas, el depósito de prueba se devuelve completo al inquilino.` }
    // LEGAL: revisado (24/10) · B.2 (montos en USDC de prueba)
    case 'reclamo-1': return { asunto: 'Tienes un reclamo sobre tu depósito: 7 días naturales para responder',
      texto: `El dueño reclamó ${u(d.reclamado ?? 0)} de tu depósito de ${u(d.deposito)} por: ${(d.rubros ?? []).join(', ')}. Responde antes del ${vence}. ${segun}` }
    case 'reclamo-4': return { asunto: `Te quedan 3 días para responder el reclamo de ${u(d.reclamado ?? 0)}`, texto: `Te quedan 3 días para responder el reclamo de ${u(d.reclamado ?? 0)}. Vence el ${vence}.` }
    case 'reclamo-6': return { asunto: 'Último aviso: tu plazo vence mañana', texto: `Último aviso: tu plazo vence mañana, ${vence}. ${segun}${d.regla ? ' La app registra que abriste este aviso.' : ''} Siempre puedes ir a los tribunales.` }   // LEGAL: revisado (24/10) · B.2 v4, día 6
    // LEGAL: revisado (24/10) · B.3
    case 'reparacion-5': return { asunto: 'Tu alquiler termina pronto: repara lo que haga falta',
      texto: `Tu alquiler termina el ${fechaCR(d.finAlquilerMs ?? 0)}. Repara lo que haga falta antes de las fotos de salida; después se cobra con factura. Aquí están tus fotos de entrada para comparar. El desgaste normal no se cobra: ver las reglas. Después de entregar las llaves, solo puedes reparar si el dueño lo acepta.` }
  }
}
/** Botones de cada aviso (en la app y en el correo). «Todo bien, devolver» abre la confirmación; nunca devuelve con un toque. */
export function botonesAviso(p: Plantilla): { texto: string; accion: 'ver' | 'confirmar-devolver' }[] {
  // LEGAL: revisado (24/10) · B.2 y B.2b
  if (p === 'dueno-1') return [{ texto: 'Revisar y reclamar', accion: 'ver' }, { texto: 'Todo bien, devolver', accion: 'confirmar-devolver' }]
  if (p.startsWith('dueno')) return [{ texto: 'Revisar y reclamar', accion: 'ver' }]
  if (p === 'reclamo-1') return [{ texto: 'Ver el reclamo', accion: 'ver' }]
  if (p === 'reclamo-4') return [{ texto: 'Responder', accion: 'ver' }]
  if (p === 'reclamo-6') return [{ texto: 'Responder ahora', accion: 'ver' }]
  return [{ texto: 'Ver las fotos de entrada', accion: 'ver' }]
}
