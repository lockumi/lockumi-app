// Paso 19 · Reputación: cálculo del puntaje según la sección C.3 de legal/reputacion-textos.md, como funciones puras (sin navegador,
// sin almacén). Decisiones de Katherine (25/10/2026):
//  - Inquilino: solo le baja un reclamo que terminó con un DESCUENTO del depósito (aceptado por el inquilino, por la Regla 6.5.1 o por
//    acuerdo en la mediación), en proporción a lo descontado.
//  - Dueño (decisión del 25/10/2026, 2:10 p. m.): solo le baja un reclamo INDEBIDO: terminó en la mediación o en un acuerdo
//    devolviendo al inquilino todo o casi todo lo reclamado (UMBRAL_CASI_TODO). Un descuento justo no le baja.
//  - Sin otro plazo de conservación: se usan todos los alquileres cerrados que sigan en la app (se borran solo al borrar la cuenta).
//    Lo negativo (un descuento o un reclamo indebido) deja de contar y se borra 10 años después de que ocurrió (Ley 8968, art. 6.1;
//    decisión de Katherine del 25/10/2026).
//  - Nunca un ranking: la vitrina se ordena por cantón y precio; el puntaje no cambia el orden.
import type { Acta, Alquiler, Rol } from '../types'

/** El puntaje se muestra desde el 3.er alquiler cerrado (antes: «Nuevo en Lockumi»). */
export const MINIMO_PARA_PUNTAJE = 3
/** Vitrinas por cantón solo con 10 personas o más; si no, por provincia. Nunca un área menor que el cantón. */
export const MINIMO_POR_CANTON = 10
const DIA = 86_400_000
/** Ley 8968, art. 6.1: lo negativo deja de contar 10 años después de que ocurrió. */
export const TOPE_LEGAL_DIAS = 3653
/** Regla 1 de legal/reputacion-textos-para-producto.md (aprobada): un alquiler del dueño baja solo si se devolvió al inquilino el 90 % o
 *  más de lo reclamado. Base: el monto reclamado (no el depósito), antes del 0,3 % de Trustless Work. LEGAL: revisado (25/10) */
export const UMBRAL_CASI_TODO = 0.9
const vigente = (fecha: string, ahora: number) => ahora - Date.parse(fecha) <= TOPE_LEGAL_DIAS * DIA

export interface Puntaje { cerrados: number; valor: number | null; enRevision: boolean }

/** ¿Cuenta este alquiler? Solo los cerrados en la app con resultado; las simulaciones y mediaciones simuladas no cuentan. */
export const cuentaParaPuntaje = (a: Alquiler): boolean => a.estado === 'cerrado' && !!a.resultado && a.resultado.via !== 'simulacion'

const igual = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
/** Legal (ronda del 25/10): los alquileres de esta persona en este papel que entran en su reputación. Un alquiler cuenta solo si LAS
 *  DOS partes tienen perfil (`conPerfil`); uno entre una cuenta anterior a la 1.10-demo y una nueva no cuenta para ninguna de las dos. */
// Legal (Términos 1.13-demo, 15.1): las cuentas que no tenían perfil reciben uno al aceptar esa versión, y sus alquileres cerrados antes
// de eso no se publican ni cuentan: con `desde` (fecha de la aceptación del perfil de cada parte), un alquiler cerrado antes no cuenta.
export const alquileresDeReputacion = (xs: readonly Alquiler[], email: string, rol: 'dueno' | 'inquilino', conPerfil: (email: string) => boolean,
  desde: (email: string) => string | undefined = () => undefined): Alquiler[] =>
  xs.filter(a => igual(rol === 'dueno' ? a.duenoEmail : a.inquilinoEmail, email) && !!a.duenoEmail && !!a.inquilinoEmail && conPerfil(a.duenoEmail) && conPerfil(a.inquilinoEmail)
    && !cerradoAntes(a, desde(a.duenoEmail)) && !cerradoAntes(a, desde(a.inquilinoEmail)))
/** Con servidor (27/10): el perfil de la OTRA parte no está en este navegador; el servidor dice por alquiler si cuenta y desde cuándo
 *  (lk_reputacion_de_mis_alquileres). Misma regla que arriba: las dos partes con perfil y cerrado después de la aceptación más tardía. */
export const alquileresDeReputacionServidor = (xs: readonly Alquiler[], email: string, rol: 'dueno' | 'inquilino',
  info: (id: string) => { cuenta: boolean; desde?: string | null } | undefined): Alquiler[] =>
  xs.filter(a => { const i = info(a.id); return igual(rol === 'dueno' ? a.duenoEmail : a.inquilinoEmail, email) && !!i?.cuenta && !cerradoAntes(a, i.desde ?? undefined) })
const cerradoAntes = (a: Alquiler, desde?: string) => !!desde && !!a.resultado?.fecha && Date.parse(a.resultado.fecha) < Date.parse(desde)

/** Parte del depósito que se descontó (0 a 1). 0 si el reclamo se cerró sin descontar nada o si no hubo reclamo. */
export function fraccionDescontada(a: Alquiler, ahora = Date.now()): number {
  const r = a.resultado
  if (!r || !cuentaParaPuntaje(a)) return 0
  if (!vigente(r.fecha, ahora)) return 0
  if (r.via !== 'acuerdo' && r.via !== 'propuesta' && r.via !== 'mediacion') return 0
  const dueno = Math.max(0, Number(r.dueno) || 0), inquilino = Math.max(0, Number(r.inquilino) || 0), total = dueno + inquilino
  return total > 0 ? Math.min(1, dueno / total) : 0
}

/** Parte del depósito que se quedó el dueño, en dinero del depósito (corrige la comisión de la red con la proporción). */
const alDuenoEnDeposito = (a: Alquiler) => { const r = a.resultado!, d = Math.max(0, Number(r.dueno) || 0), i = Math.max(0, Number(r.inquilino) || 0)
  return d + i > 0 ? a.monto * d / (d + i) : 0 }
/** Parte de lo reclamado que se devolvió al inquilino (0 a 1). Solo si hubo reclamo y terminó en la mediación o en un acuerdo. */
export function fraccionReclamoDevuelta(a: Alquiler): number {
  const r = a.resultado, reclamado = Number(a.reclamo?.monto) || 0
  if (!r || !cuentaParaPuntaje(a) || reclamado <= 0 || (r.via !== 'mediacion' && r.via !== 'acuerdo')) return 0
  return Math.max(0, Math.min(1, 1 - alDuenoEnDeposito(a) / reclamado))
}
/** Reclamo indebido: se devolvió al inquilino todo o casi todo lo reclamado, y pasó hace menos de 10 años. */
export const reclamoIndebido = (a: Alquiler, ahora = Date.now()) =>
  fraccionReclamoDevuelta(a) >= UMBRAL_CASI_TODO - 1e-9 && fraccionReclamoDevuelta(a) > 0 && vigente(a.resultado!.fecha, ahora)
/** ¿Este alquiler le baja a esta persona? Inquilino: un descuento. Dueño: un reclamo indebido. */
export const eventoNegativo = (a: Alquiler, rol: Rol, ahora = Date.now()) => rol === 'inquilino' ? fraccionDescontada(a, ahora) > 0 : reclamoIndebido(a, ahora)

/** Valor de un alquiler cerrado (0 a 5). Cada uno vale 5,0. Inquilino: baja en proporción a lo descontado del depósito.
 *  Dueño: con un reclamo indebido, baja en proporción a lo reclamado y devuelto, sobre el depósito (regla 2). */
export function valorDelAlquiler(a: Alquiler, rol: Rol, ahora = Date.now()): number {
  if (rol === 'inquilino') return 5 * (1 - fraccionDescontada(a, ahora))
  if (!reclamoIndebido(a, ahora) || !(a.monto > 0)) return 5
  const devuelto = (Number(a.reclamo!.monto) || 0) - alDuenoEnDeposito(a)
  return 5 * (1 - Math.max(0, Math.min(1, devuelto / a.monto)))
}

const redondear1 = (x: number) => Math.round(x * 10 + 1e-9) / 10

/** Puntaje de una persona en un papel, con sus alquileres de ese papel. */
/** `revision`: alquileres con una revisión pedida (REP-11): no cuentan y el puntaje dice «En revisión» (regla 7). */
export function calcularPuntaje(alquileres: Alquiler[], rol: Rol, ahora = Date.now(), revision: Set<string> = new Set()): Puntaje {
  const cerrados = alquileres.filter(a => cuentaParaPuntaje(a) && !revision.has(a.id))
  const enRevision = alquileres.some(a => a.estado === 'reclamo' || a.estado === 'mediacion' || revision.has(a.id))
  const valor = cerrados.length >= MINIMO_PARA_PUNTAJE
    ? Math.max(0, Math.min(5, redondear1(cerrados.reduce((s, a) => s + valorDelAlquiler(a, rol, ahora), 0) / cerrados.length))) : null
  return { cerrados: cerrados.length, valor, enRevision }
}

export const formatoPuntaje = (v: number) => v.toFixed(1).replace('.', ',')
export const alquileresCerrados = (n: number) => n === 1 ? '1 alquiler cerrado' : `${n} alquileres cerrados`

/** ¿Se muestra el número? Siempre desde el 3.er alquiler cerrado, alto o bajo, sin opción para ocultarlo (regla 4), salvo
 *  «En revisión» mientras haya un reclamo abierto o una revisión pedida (regla 7). */
export const puntajeVisible = (p: Puntaje) => !p.enRevision && p.cerrados >= MINIMO_PARA_PUNTAJE && p.valor !== null
/** Línea pública del perfil o de la tarjeta. Con 0 a 2 alquileres cerrados, el estado neutro «Nuevo en Lockumi» (C.3, C.9). */
export function lineaPublica(p: Puntaje): string {
  if (p.cerrados < MINIMO_PARA_PUNTAJE) return `Nuevo en Lockumi · ${alquileresCerrados(p.cerrados)}`
  if (p.enRevision || p.valor === null) return 'En revisión'
  return `${formatoPuntaje(p.valor)} de 5`
}

export type Insignia = 'contrato' | 'deposito' | 'fotos-entrada' | 'fotos-salida' | 'devolvio' | 'recibio'
const conFotos = (x?: Acta) => !!x && x.cuartos.length > 0 && x.cuartos.every(c => c.fotos.length > 0)
/** Insignias (C.7): solo las que salen de hechos registrados en la app. No hay insignias negativas, grises ni huecos. */
export function insignias(alquileres: Alquiler[], rol: Rol): Insignia[] {
  const hay = (f: (a: Alquiler) => boolean) => alquileres.some(f)
  const sinDescuento = (a: Alquiler) => cuentaParaPuntaje(a) && fraccionDescontada(a) === 0
  const r: Insignia[] = []
  if (hay(a => !!a.contrato.firmas[rol])) r.push('contrato')
  if (hay(a => !!a.pago)) r.push('deposito')
  if (hay(a => conFotos(a.entrada))) r.push('fotos-entrada')
  if (hay(a => conFotos(a.salida))) r.push('fotos-salida')
  if (hay(sinDescuento)) r.push(rol === 'dueno' ? 'devolvio' : 'recibio')
  return r
}

/** Llave Lockumi (C.7): 10 o más alquileres cerrados, puntaje de 4,8 o más, nada negativo en los últimos 12 meses (inquilino: ningún
 *  descuento del depósito; dueño: ningún reclamo indebido) y fotos de entrada y salida completas en todos sus alquileres cerrados. */
export function tieneLlave(alquileres: Alquiler[], rol: Rol, ahora: number): boolean {
  const cerrados = alquileres.filter(cuentaParaPuntaje), p = calcularPuntaje(alquileres, rol, ahora)
  if (cerrados.length < 10 || p.valor === null || p.valor < 4.8) return false
  const reciente = (a: Alquiler) => ahora - Date.parse(a.resultado!.fecha) <= 365 * DIA
  if (cerrados.some(a => reciente(a) && eventoNegativo(a, rol, ahora))) return false
  return cerrados.every(a => conFotos(a.entrada) && conFotos(a.salida))
}

/** Zona de una vitrina: el cantón si tiene 10 personas o más; si no, la provincia. */
export const zonaVitrina = (canton: string, provincia: string, personas: number) => personas >= MINIMO_POR_CANTON ? canton : `${provincia} (provincia)`

/** Orden de la vitrina: por cantón y precio (nunca por puntaje). Una de cada tres tarjetas es un Espacio para nuevos (0 a 2 alquileres). */
export function ordenarVitrina<T extends { canton: string; precio: number; cerrados: number }>(tarjetas: T[]): T[] {
  const orden = (a: T, b: T) => a.canton.localeCompare(b.canton, 'es') || a.precio - b.precio
  const nuevos = tarjetas.filter(t => t.cerrados < MINIMO_PARA_PUNTAJE).sort(orden), destacados = tarjetas.filter(t => t.cerrados >= MINIMO_PARA_PUNTAJE).sort(orden)
  const r: T[] = []
  while (nuevos.length || destacados.length) {
    if ((r.length + 1) % 3 === 0 && nuevos.length) r.push(nuevos.shift()!)
    else if (destacados.length) r.push(destacados.shift()!)
    else r.push(nuevos.shift()!)
  }
  return r
}
