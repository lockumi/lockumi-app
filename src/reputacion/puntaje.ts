// Paso 19 · Reputación: cálculo del puntaje según la sección C.3 de legal/reputacion-textos.md, como funciones puras (sin navegador,
// sin almacén). Decisiones de Katherine (25/10/2026):
//  - Solo cuenta en contra un reclamo que terminó con un DESCUENTO del depósito (aceptado por el inquilino, por la Regla 6.5.1 o por
//    acuerdo en la mediación), en proporción a lo descontado. El descuento lo paga el inquilino: al dueño no le baja.
//  - Sin otro plazo de conservación: se usan todos los alquileres cerrados que sigan en la app (se borran solo al borrar la cuenta).
//    Única excepción, que impone la ley y no Lockumi (Ley 8968, art. 6.1; legal/reputacion-textos.md, sección E, medida a): un descuento
//    del depósito deja de contar 10 años después de que ocurrió.
//  - Nunca un ranking: la vitrina se ordena por cantón y precio; el puntaje no cambia el orden.
import type { Acta, Alquiler, Rol } from '../types'

/** El puntaje se muestra desde el 3.er alquiler cerrado (antes: «Nuevo en Lockumi»). */
export const MINIMO_PARA_PUNTAJE = 3
/** Vitrinas por cantón solo con 10 personas o más; si no, por provincia. Nunca un área menor que el cantón. */
export const MINIMO_POR_CANTON = 10
/** Debajo de este puntaje, el perfil se ve igual que el de quien eligió no mostrar su puntaje. */
export const PUNTAJE_MINIMO_VISIBLE = 3
const DIA = 86_400_000
/** Ley 8968, art. 6.1: un descuento del depósito deja de contar 10 años después de que ocurrió. */
export const TOPE_LEGAL_DIAS = 3653

export interface Puntaje { cerrados: number; valor: number | null; enRevision: boolean }

/** ¿Cuenta este alquiler? Solo los cerrados en la app con resultado; las simulaciones y mediaciones simuladas no cuentan. */
export const cuentaParaPuntaje = (a: Alquiler): boolean => a.estado === 'cerrado' && !!a.resultado && a.resultado.via !== 'simulacion'

/** Parte del depósito que se descontó (0 a 1). 0 si el reclamo se cerró sin descontar nada o si no hubo reclamo. */
export function fraccionDescontada(a: Alquiler, ahora = Date.now()): number {
  const r = a.resultado
  if (!r || !cuentaParaPuntaje(a)) return 0
  if (ahora - Date.parse(r.fecha) > TOPE_LEGAL_DIAS * DIA) return 0
  if (r.via !== 'acuerdo' && r.via !== 'propuesta' && r.via !== 'mediacion') return 0
  const dueno = Math.max(0, Number(r.dueno) || 0), inquilino = Math.max(0, Number(r.inquilino) || 0), total = dueno + inquilino
  return total > 0 ? Math.min(1, dueno / total) : 0
}

/** Valor de un alquiler cerrado (0 a 5). Cada uno vale 5,0; para el inquilino baja en proporción a lo descontado. */
export const valorDelAlquiler = (a: Alquiler, rol: Rol, ahora = Date.now()): number => rol === 'inquilino' ? 5 * (1 - fraccionDescontada(a, ahora)) : 5

const redondear1 = (x: number) => Math.round(x * 10 + 1e-9) / 10

/** Puntaje de una persona en un papel, con sus alquileres de ese papel. */
export function calcularPuntaje(alquileres: Alquiler[], rol: Rol, ahora = Date.now()): Puntaje {
  const cerrados = alquileres.filter(cuentaParaPuntaje)
  const enRevision = alquileres.some(a => a.estado === 'reclamo' || a.estado === 'mediacion')
  const valor = cerrados.length >= MINIMO_PARA_PUNTAJE
    ? Math.max(0, Math.min(5, redondear1(cerrados.reduce((s, a) => s + valorDelAlquiler(a, rol, ahora), 0) / cerrados.length))) : null
  return { cerrados: cerrados.length, valor, enRevision }
}

export const formatoPuntaje = (v: number) => v.toFixed(1).replace('.', ',')
export const alquileresCerrados = (n: number) => n === 1 ? '1 alquiler cerrado' : `${n} alquileres cerrados`

/** Línea pública del perfil o de la tarjeta. Nunca dice nada negativo: un puntaje bajo se ve igual que uno oculto. */
export function lineaPublica(p: Puntaje, mostrarPuntaje: boolean): string {
  if (p.cerrados < MINIMO_PARA_PUNTAJE) return `Nuevo en Lockumi · ${alquileresCerrados(p.cerrados)}`
  if (p.enRevision) return 'En revisión'
  if (!mostrarPuntaje || p.valor === null || p.valor < PUNTAJE_MINIMO_VISIBLE) return `${p.cerrados} alquileres cerrados en Lockumi`
  return `${formatoPuntaje(p.valor)} de 5`
}
/** ¿Se puede mostrar el número del puntaje (anillo)? Mismas reglas que lineaPublica. */
export const puntajeVisible = (p: Puntaje, mostrarPuntaje: boolean) =>
  mostrarPuntaje && !p.enRevision && p.cerrados >= MINIMO_PARA_PUNTAJE && p.valor !== null && p.valor >= PUNTAJE_MINIMO_VISIBLE

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

/** Llave Lockumi (C.7): 10 o más alquileres cerrados, puntaje de 4,8 o más, ningún descuento del depósito en los últimos 12 meses y
 *  fotos de entrada y salida completas en todos sus alquileres cerrados. */
export function tieneLlave(alquileres: Alquiler[], rol: Rol, ahora: number): boolean {
  const cerrados = alquileres.filter(cuentaParaPuntaje), p = calcularPuntaje(alquileres, rol, ahora)
  if (cerrados.length < 10 || p.valor === null || p.valor < 4.8) return false
  const reciente = (a: Alquiler) => ahora - Date.parse(a.resultado!.fecha) <= 365 * DIA
  if (cerrados.some(a => reciente(a) && fraccionDescontada(a, ahora) > 0)) return false
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
