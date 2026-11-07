// Ayuda mínima. Las respuestas son textos que ya están en la app. El conjunto de esta pantalla queda pendiente de revisión legal antes de producción.
import { NOTA_TITULO } from './Login'
import { PASOS_RECORRIDO } from '../recorrido'

export const NOTA_AYUDA = 'Pendiente de revisión legal antes de producción. Las respuestas copian textos que ya están en la app y enlazan los documentos vigentes.'

export type TemaAyuda = 'deposito' | 'fotos' | 'reclamos' | 'mediacion'
export interface PreguntaAyuda { id: string; temas: TemaAyuda[]; pregunta: string; respuesta: string; enlace: { href: string; texto: string } }

export const TEMAS: { id: TemaAyuda; texto: string }[] = [
  { id: 'deposito', texto: 'Depósito' },
  { id: 'fotos', texto: 'Fotos' },
  { id: 'reclamos', texto: 'Reclamos' },
  { id: 'mediacion', texto: 'Mediación' },
]

const paso = (i: number) => PASOS_RECORRIDO[i].texto

/** Párrafo ya publicado en RendimientoB13 (src/prueba/SuscripcionPC.tsx), sin tasas ni montos. */
export const RESPUESTA_RENDIMIENTO = 'Lockumi está estudiando, sin fecha, una función opcional para el depósito. No está disponible en la demo ni en ningún otro lugar, y no se puede contratar. Esto no es una oferta ni una invitación a invertir. Si algún día existiera, el resultado sería variable, no garantizado, y podría haber pérdidas. Su lanzamiento depende de una revisión legal y regulatoria. Solo funcionaría si el dueño y el inquilino la aceptan cada uno por separado.'

export const PREGUNTAS: PreguntaAyuda[] = [
  { id: 'seguro', temas: ['deposito'], pregunta: '¿Lockumi es un seguro?', respuesta: NOTA_TITULO, enlace: { href: '/terminos', texto: 'Términos y condiciones' } },
  { id: 'guarda', temas: ['deposito'], pregunta: '¿Quién guarda el depósito?', respuesta: paso(0), enlace: { href: '/terminos', texto: 'Términos y condiciones' } },
  { id: 'rendimiento', temas: ['deposito'], pregunta: '¿El rendimiento está garantizado?', respuesta: RESPUESTA_RENDIMIENTO, enlace: { href: '#/terminos', texto: 'cláusula 10 de los Términos' } },
  { id: 'fotos', temas: ['fotos'], pregunta: '¿Cómo quedan las fotos?', respuesta: paso(3), enlace: { href: '/terminos', texto: 'Términos y condiciones' } },
  { id: 'acuerdo', temas: ['reclamos', 'mediacion'], pregunta: '¿Qué pasa si no hay acuerdo?', respuesta: paso(5), enlace: { href: '/terminos', texto: 'Términos y condiciones' } },
]

export function preguntasVisibles(filtro: TemaAyuda | null) {
  return PREGUNTAS.filter(p => filtro === null || p.temas.includes(filtro))
}
