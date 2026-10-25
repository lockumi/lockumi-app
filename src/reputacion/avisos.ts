// Paso 19 · REP-12 (reglas 8 y 10 de legal/reputacion-textos-para-producto.md): aviso cada vez que el puntaje cambia o un alquiler pasa a
// «En revisión», y aviso cuando un hecho deja de contar por los 10 años. En la app y, con VITE_CORREOS=1, también por correo (./correo.ts).
import type { Alquiler, Rol } from '../types'
import { eventoNegativo, cuentaParaPuntaje } from './puntaje'
import { AVISO_CAMBIO, AVISO_VENCIDO, conVars } from './textos'
import type { AvisoCorreo } from './correo'

const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })
export interface Aviso { titulo: string; texto: string; nota?: string; /** Lo que va al correo (sin la dirección del lugar). */ correo?: AvisoCorreo }

/** Aviso de cambio: compara la línea pública que la persona vio la última vez con la de ahora. */
export function avisoCambio(antes: string | undefined, despues: string, alquileres: Alquiler[]): Aviso | null {
  if (antes === undefined || antes === despues) return null
  const ultimo = alquileres.filter(cuentaParaPuntaje).sort((a, b) => Date.parse(b.resultado!.fecha) - Date.parse(a.resultado!.fecha))[0]
  return { titulo: AVISO_CAMBIO.titulo, nota: AVISO_CAMBIO.nota,
    correo: ultimo ? { tipo: 'cambio', antes, despues, alquiler: ultimo.id, fechaMs: Date.parse(ultimo.resultado!.fecha) } : undefined,
    texto: conVars(AVISO_CAMBIO.texto, { antes, 'después': despues, alquiler: ultimo?.direccion ?? '', fecha: ultimo ? fechaLarga(ultimo.resultado!.fecha) : '' }) }
}
/** Hechos que bajaban el puntaje y que ya pasaron los 10 años (sin avisar todavía). */
export const hechosVencidos = (alquileres: Alquiler[], rol: Rol, ahora: number, avisados: string[]) =>
  alquileres.filter(a => cuentaParaPuntaje(a) && !avisados.includes(a.id) && eventoNegativo(a, rol, Date.parse(a.resultado!.fecha)) && !eventoNegativo(a, rol, ahora))
export const avisoVencido = (a: Alquiler, despues: string): Aviso =>
  ({ titulo: AVISO_VENCIDO.titulo, correo: { tipo: 'vencido', despues, alquiler: a.id }, texto: conVars(AVISO_VENCIDO.texto, { hecho: `el cierre del alquiler ${a.direccion}`, 'después': despues }) })

// Lo último que vio la persona, por papel.
interface Visto { linea?: string; vencidos: string[] }
const clave = (email: string, rol: Rol) => `lockumi.reputacion.avisos.v1.${rol}.` + email.trim().toLowerCase()
export function visto(email: string, rol: Rol): Visto { try { return JSON.parse(localStorage.getItem(clave(email, rol)) ?? '') } catch { return { vencidos: [] } } }
export function marcarVisto(email: string, rol: Rol, v: Visto) { try { localStorage.setItem(clave(email, rol), JSON.stringify(v)) } catch { /* sin almacenamiento */ } }
export function borrarAvisos(email: string) { for (const r of ['dueno', 'inquilino'] as Rol[]) try { localStorage.removeItem(clave(email, r)) } catch { /* nada */ } }
