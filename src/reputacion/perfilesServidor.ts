// 27/10/2026 · Reputación con servidor: si un alquiler cuenta depende del perfil de LAS DOS partes, y el de la otra parte no está en este
// navegador. Se pregunta al servidor (lk_reputacion_de_mis_alquileres: solo alquileres propios, sin correos) y se guarda en memoria.
import { useEffect, useSyncExternalStore } from 'react'
import type { Alquiler } from '../types'
import { servidor } from '../servidor/repositorio'

export type InfoReputacion = { cuenta: boolean; desde?: string | null }
let mapa = new Map<string, InfoReputacion>(), version = 0, pedidoPara = '', listoPara = '', falloPara = ''
const oyentes = new Set<() => void>()
const avisar = () => { version++; oyentes.forEach(f => f()) }

export const infoReputacion = (id: string): InfoReputacion | undefined => mapa.get(id)
export function guardarInfoReputacion(filas: readonly { contrato_id: string; cuenta: boolean; desde: string | null }[]) {
  mapa = new Map(filas.map(f => [f.contrato_id, { cuenta: !!f.cuenta, desde: f.desde }])); avisar()
}
/** Pide al servidor la información de los alquileres cerrados de la lista (una vez por conjunto de alquileres cerrados). */
const claveDe = (todos: readonly Alquiler[]) => todos.filter(a => a.estado === 'cerrado').map(a => a.id).sort().join(',')
export async function cargarInfoReputacion(todos: readonly Alquiler[], pedir = servidor.reputacionDeMisAlquileres) {
  const clave = claveDe(todos)
  if (!clave || clave === pedidoPara) return
  pedidoPara = clave
  try { const filas = await pedir(); listoPara = clave; falloPara = ''; guardarInfoReputacion(filas) }
  catch { pedidoPara = ''; falloPara = clave; avisar() /* se reintenta en la próxima carga */ }
}
/** Si ya llegó la respuesta para estos alquileres cerrados. Sin alquileres cerrados no hay nada que esperar. Mientras no llega,
 *  «cargando»; si falló, «error» (en los dos casos no se muestra un 0). */
export const estadoInfoReputacion = (todos: readonly Alquiler[]): 'cargando' | 'listo' | 'error' => {
  const clave = claveDe(todos)
  return !clave || clave === listoPara ? 'listo' : clave === falloPara ? 'error' : 'cargando'
}
export function usePerfilesServidor(todos: readonly Alquiler[], activo: boolean) {
  useSyncExternalStore(f => { oyentes.add(f); return () => { oyentes.delete(f) } }, () => version, () => version)
  useEffect(() => { if (activo) void cargarInfoReputacion(todos) }, [todos, activo])
}
/** Solo para pruebas. */
export function _reiniciarInfoReputacion() { mapa = new Map(); pedidoPara = ''; listoPara = ''; falloPara = ''; avisar() }
