// Lógica del flujo del alquiler (pura, con pruebas en __tests__/flujo.test.ts).
import type { Alquiler, Estado, Rol } from './types'

/** Plazo de reclamos del alquiler (por omisión 7 días). */
export const plazoMs = (a: Pick<Alquiler, 'ventanaSegundos'>) => (a.ventanaSegundos ?? 604800) * 1000
/** "7 días", "1 día", "2 horas", "5 minutos": el plazo real del contrato (en la prueba de testnet puede ser corto). */
export function textoPlazo(a: Pick<Alquiler, 'ventanaSegundos'>) {
  const s = plazoMs(a) / 1000, n = (x: number, u: string, us: string) => `${x} ${x === 1 ? u : us}`
  return s >= 86400 && s % 86400 === 0 ? n(s / 86400, 'día', 'días') : s >= 3600 && s % 3600 === 0 ? n(s / 3600, 'hora', 'horas') : n(Math.max(1, Math.round(s / 60)), 'minuto', 'minutos')
}

export const otro = (r: Rol): Rol => r === 'dueno' ? 'inquilino' : 'dueno'
export const NOMBRE: Record<Rol, string> = { dueno: 'dueño', inquilino: 'inquilino' }

/** Las 8 etapas que ven las dos personas. */
export const ETAPAS = ['Contrato', 'Firmas', 'Depósito', 'Fotos de entrada', 'Alquiler en curso', 'Fotos de salida', '7 días para reclamos', 'Devolución o mediador'] as const
const ETAPA_DE: Record<Estado, number> = { firmas: 1, pendiente_pago: 2, fotos_entrada: 3, en_curso: 4, salida: 5, ventana_reclamo: 6, reclamo: 7, mediacion: 7, cerrado: 7 }
/** Índice 0..7 de la etapa actual. "Contrato" (0) queda hecho al crear el alquiler. */
export const etapaDe = (a: Pick<Alquiler, 'estado'>) => ETAPA_DE[a.estado]
export const pasoTexto = (a: Pick<Alquiler, 'estado'>) => `Paso ${etapaDe(a) + 1} de ${ETAPAS.length}`

export type Firmas = Partial<Record<Rol, string>>
export class ErrorFirma extends Error {}
/** Firma de `actor`. Nadie puede firmar por la otra persona ni firmar dos veces. */
export function firmar(f: Firmas, actor: Rol, por: Rol, cuando: string): Firmas {
  if (actor !== por) throw new ErrorFirma('Solo puedes firmar por ti.')
  if (f[actor]) throw new ErrorFirma('Ya firmaste.')
  return { ...f, [actor]: cuando }
}
export const ambos = (f: Firmas) => Boolean(f.dueno && f.inquilino)
export type EstadoFirma = 'te-toca' | 'esperando' | 'listo'
export function estadoFirma(f: Firmas, yo: Rol): { tipo: EstadoFirma; texto: string } {
  if (ambos(f)) return { tipo: 'listo', texto: 'Firmado por los dos' }
  if (f[yo]) return { tipo: 'esperando', texto: `Firmaste ✓ · Esperando la firma del ${NOMBRE[otro(yo)]}` }
  return { tipo: 'te-toca', texto: 'Te toca firmar' }
}

/** Red de prueba en un solo aparato: una línea con qué pasa ahora y quién lo hace (tú eres el inquilino). */
export function ahoraPrueba(a: Alquiler): string {
  const c = a.contrato.firmas, e = a.entrada.firmas, s = a.salida?.firmas ?? {}
  const dueno = (t: string) => `Ahora le toca al dueño de prueba: ${t} (lo hace solo, en unos segundos).`
  switch (a.estado) {
    case 'firmas': return c.inquilino ? dueno('firmar el contrato') : 'Ahora te toca: leer el contrato y firmarlo.'
    case 'pendiente_pago': return 'Ahora te toca: pagar el depósito.'
    case 'fotos_entrada': return e.inquilino ? dueno('confirmar las fotos de entrada') : 'Ahora te toca: tomar las fotos de entrada y confirmarlas.'
    case 'en_curso': return 'Ahora te toca: cuando entregues el lugar, empezar las fotos de salida.'
    case 'salida': return s.inquilino ? dueno('confirmar las fotos de salida') : 'Ahora te toca: tomar las fotos de salida y confirmarlas.'
    case 'ventana_reclamo': return `Ahora: corren los ${textoPlazo(a)} para reclamos. Puedes adelantar el plazo o hacer un reclamo en nombre del dueño de prueba.`   // LEGAL: revisado (24/10) · {plazo} real
    case 'reclamo': return 'Ahora te toca: responder el reclamo del dueño de prueba.'
    case 'mediacion': return 'Ahora toca la mediación (simulada). En esta prueba, el reparto lo decides tú con el botón de abajo.' // LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide
    case 'cerrado': return 'Listo: el alquiler terminó. No tienes nada pendiente.'
  }
}

/** Qué te toca a ti, qué le toca a la otra persona y qué sigue, en palabras simples. */
export function turno(a: Alquiler, yo: Rol): { tu: string; otra: string; sigue: string } {
  const o = NOMBRE[otro(yo)]
  const c = a.contrato.firmas, e = a.entrada.firmas, s = a.salida?.firmas ?? {}
  switch (a.estado) {
    case 'firmas': return {
      tu: c[yo] ? 'Ya firmaste el contrato.' : 'Lee el contrato y fírmalo.',
      otra: c[otro(yo)] ? `El ${o} ya firmó.` : `El ${o} tiene que firmar.`,
      sigue: 'Cuando firmen los dos, el inquilino paga el depósito.' }
    case 'pendiente_pago': return yo === 'inquilino'
      ? { tu: 'Paga el depósito.', otra: 'El dueño espera tu pago.', sigue: 'Después, toman juntos las fotos de entrada.' }
      : { tu: 'No tienes que hacer nada por ahora.', otra: 'El inquilino tiene que pagar el depósito.', sigue: 'Después, toman juntos las fotos de entrada.' }
    case 'fotos_entrada': return {
      tu: e[yo] ? 'Ya confirmaste las fotos de entrada.' : 'Toma fotos de cada espacio y confirma.',
      otra: e[otro(yo)] ? `El ${o} ya confirmó.` : `El ${o} también tiene que revisar y confirmar.`,
      sigue: 'Cuando confirmen los dos, empieza el alquiler.' }
    case 'en_curso': return {
      tu: 'Disfruta el alquiler. El depósito está guardado.', otra: `El ${o} no tiene nada pendiente.`,
      sigue: 'Al terminar, toman juntos las fotos de salida.' }
    case 'salida': return {
      tu: s[yo] ? 'Ya confirmaste las fotos de salida.' : 'Toma fotos de cada espacio y confirma.',
      otra: s[otro(yo)] ? `El ${o} ya confirmó.` : `El ${o} también tiene que revisar y confirmar.`,
      sigue: `Después hay ${textoPlazo(a)} para reclamos. Si no hay reclamo, después de ese plazo el depósito se devuelve al inquilino.` }   // LEGAL: revisado (24/10)
    case 'ventana_reclamo': return yo === 'dueno'
      ? { tu: 'Si encontraste un daño, puedes reclamar. Si todo está bien, no hagas nada.', otra: 'El inquilino espera.', sigue: `Si no reclamas, después de ${textoPlazo(a)} el depósito se devuelve al inquilino.` }   // LEGAL: revisado (24/10)
      : { tu: 'No tienes que hacer nada.', otra: 'El dueño puede reclamar si encontró un daño.', sigue: `Si no hay reclamo, después de ${textoPlazo(a)} se te devuelve el depósito.` }   // LEGAL: revisado (24/10)
    case 'reclamo': return yo === 'inquilino'
      ? { tu: 'Responde el reclamo: acéptalo o recházalo.', otra: 'El dueño espera tu respuesta.', sigue: 'Si lo rechazas, una persona mediadora les ayuda a buscar un acuerdo.' } // LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide
      : { tu: 'No tienes que hacer nada por ahora.', otra: 'El inquilino tiene que responder tu reclamo.', sigue: 'Si lo rechaza, una persona mediadora les ayuda a buscar un acuerdo.' } // LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide
    case 'mediacion': return { tu: 'No tienes que hacer nada.', otra: 'Una persona mediadora está revisando las fotos.', sigue: 'La persona mediadora les ayuda a acordar cómo se reparte el depósito.' } // LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide
    case 'cerrado': return { tu: 'Listo. No tienes nada pendiente.', otra: 'Listo.', sigue: 'El alquiler terminó.' }
  }
}
