// Centro de avisos mínimo: solo avisos que el alquiler ya guardó, del rol de esta persona.
import type { Alquiler, Aviso } from '../types'
import { ahoraDe, store } from '../store'
import { abrirAviso } from '../prueba/dueno'
import { rolesEn } from './perfil-datos'

export interface AvisoVisible { alquilerId: string; direccion: string; aviso: Aviso }

export function avisosVisibles(alquileres: Pick<Alquiler, 'id' | 'direccion' | 'duenoEmail' | 'inquilinoEmail' | 'miRol' | 'avisos'>[], email: string): AvisoVisible[] {
  const lista: AvisoVisible[] = []
  for (const a of alquileres) {
    const roles = rolesEn(a, email)
    for (const aviso of a.avisos ?? []) if (roles.includes(aviso.para)) lista.push({ alquilerId: a.id, direccion: a.direccion, aviso })
  }
  return lista.sort((x, y) => y.aviso.entregado.localeCompare(x.aviso.entregado))
}

/** Marca abierto con el mismo registro de la app y devuelve la ruta del alquiler. No crea avisos ni envía correo. */
export function marcarAvisoAbierto(alquilerId: string, avisoId: string): string {
  store.cambiar(alquilerId, x => abrirAviso(x, avisoId, 'app', ahoraDe(x)))
  return '#/alquiler/' + alquilerId
}
