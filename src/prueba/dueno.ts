// Flujo del dueño de la prueba completa (Términos 1.7-demo, 6.5 a; B.2b, B.4, B.9). Funciones puras sobre una copia del alquiler
// (se usan dentro de store.cambiar). El reloj es el de la demo: hora real + días simulados (store.ahoraDe).
import type { Alquiler, Aviso } from '../types'
import { DIA_MS, fechaHoraCR } from '../../api/_lib/plazos'
import { textoPlazo } from '../flujo'
import { debidos, plazoDueno, plazoInquilino, contenido } from './avisos'

export const AUTO_INICIO_MS = 2 * DIA_MS
const iso = (t: number) => new Date(t).toISOString()

/** Fotos de salida confirmadas por los dos: queda registrada la entrega. El plazo del dueño todavía no corre. */
export function registrarEntrega(x: Alquiler, cuando: string) {
  x.estado = 'ventana_reclamo'; x.entrega = cuando; delete x.ventanaInicio
  // LEGAL: revisar · historial
  x.historial.push({ fecha: cuando, texto: 'Fotos de salida confirmadas. Quedó registrada la entrega de la casa' })
}
/** Cuándo empieza solo el plazo del dueño si no toca «Recibí la casa»: 2 días después de la entrega registrada. */
export const inicioAuto = (a: Pick<Alquiler, 'entrega'>) => a.entrega ? +new Date(a.entrega) + AUTO_INICIO_MS : null

/** «Recibí la casa»: empiezan los 7 días naturales del dueño (una sola vez). */
export function recibirCasa(x: Alquiler, ahora: number) {
  if (x.estado !== 'ventana_reclamo' || x.ventanaInicio || x.reclamo) return
  x.recibido = x.ventanaInicio = iso(ahora)
  // LEGAL: revisar · historial
  x.historial.push({ fecha: x.ventanaInicio, texto: `El dueño tocó «Recibí la casa». Empiezan sus ${textoPlazo(x)} naturales para reclamar` })
}
export const finVentana = (a: Alquiler) => plazoDueno(a)?.fin ?? null
export const vencido = (a: Alquiler, ahora: number) => { const f = finVentana(a); return f !== null && ahora >= f }

/** Pone al día el alquiler con el reloj de la demo: inicio automático del plazo y avisos que ya tocan. Devuelve si cambió algo. */
export function sincronizar(x: Alquiler, ahora: number, real = Date.now()): boolean {
  let cambio = false
  const auto = inicioAuto(x)
  if (x.estado === 'ventana_reclamo' && !x.ventanaInicio && !x.reclamo && auto !== null && ahora >= auto) {
    x.ventanaInicio = iso(auto); cambio = true
    // LEGAL: revisar · historial
    x.historial.push({ fecha: x.ventanaInicio, texto: 'El plazo del dueño para reclamar empezó automáticamente 2 días después de la entrega' })
  }
  for (const d of debidos(x, ahora)) {
    const c = contenido(x, d.id)
    const v: Aviso = { id: d.id, para: d.para, dia: d.dia, asunto: c.asunto, texto: c.texto, entregado: iso(d.hora), entregadoReal: iso(real) }
    ;(x.avisos ??= []).push(v); cambio = true
    if (d.id === 'reclamo-1' && x.reclamo && !x.reclamo.entregado) x.reclamo.entregado = v.entregado
    // LEGAL: revisar · historial
    x.historial.push({ fecha: v.entregado, texto: `Aviso en la app al ${d.para === 'dueno' ? 'dueño' : 'inquilino'}: ${c.asunto}` })
  }
  return cambio
}
/** ¿Hay algo que poner al día? (para no escribir en el almacenamiento si no hace falta). */
export const pendiente = (a: Alquiler, ahora: number) => sincronizar(structuredClone(a), ahora)

/** Apertura de un aviso: en la app o por el enlace del correo. Se guarda la primera vez, con la hora de la demo. */
export function abrirAviso(x: Alquiler, id: string, canal: 'app' | 'correo', ahora: number) {
  const v = x.avisos?.find(a => a.id === id); if (!v) return
  if (canal === 'app') v.abierto ??= iso(ahora); else v.abiertoCorreo ??= iso(ahora)
}
/** Simulador de días (solo red de prueba): adelanta el reloj de la demo de este alquiler. */
export function simularDias(x: Alquiler, n: number) { x.diasSimulados += n }

// LEGAL: revisado (24/10) · B.9
export function textoContador(rol: 'dueno' | 'inquilino', a: Alquiler, ahora: number): string {
  const p = rol === 'dueno' ? plazoDueno(a) : plazoInquilino(a); if (!p) return ''
  const resta = Math.max(0, p.fin - ahora), dias = Math.floor(resta / DIA_MS), horas = Math.floor(resta % DIA_MS / 3_600_000)
  const [f, h] = fechaHoraCR(p.fin).split(', ')
  return `Te quedan ${dias} días y ${horas} horas para ${rol === 'dueno' ? 'reclamar' : 'responder'} (vence el ${f}, ${h}, hora de Costa Rica).`
    + (p.movido ? ` (se movió al siguiente día hábil porque el día 7 cae en ${p.movido})` : '')
}
// LEGAL: revisado (24/10) · B.4
export const textoRecibir = (a: Alquiler) => `¿Recibiste la casa? Tus 7 días naturales para reclamar empiezan cuando toques «Recibí la casa». Si no lo tocas, empiezan solos el ${fechaHoraCR(inicioAuto(a) ?? 0)}, hora de Costa Rica. Si el día 7 cae en domingo o en feriado, tu plazo termina el siguiente día hábil. Te avisamos en la app los días 1, 4 y 6. Toma las fotos de salida en la app: se guardan con la fecha y la hora.`
export const CONFIRMAR_DEVOLVER = 'Se devolverá todo el depósito al inquilino ahora. Después de esto no podrás reclamar en la app. Fuera de la app, conservas tus derechos según la ley.'
// LEGAL: revisado (24/10) · C, nota de la fase 1: el dueño es una cuenta de prueba, los botones dicen «Simular: …»
export const botonRecibir = (simulado: boolean) => simulado ? 'Simular: el dueño recibe la casa' : 'Recibí la casa'
// LEGAL: revisar · mismo criterio de la nota de la fase 1
export const botonDevolver = (simulado: boolean) => simulado ? 'Simular: el dueño toca «Todo bien, devolver el depósito»' : 'Todo bien, devolver el depósito'
