// Perfil mínimo (aprobado por Katherine el 06/11/2026, 20:38 CR). Solo datos que la sesión y los alquileres ya tienen.
import type { Alquiler, Rol, Usuario } from '../types'

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const s = partes.map(p => p[0]!.toUpperCase()).join('')
  return s || '?'
}

/** Rol real en un alquiler. Sin `miRol` y sin coincidir el correo, no se inventa «dueño». */
export function rolesEn(a: Pick<Alquiler, 'duenoEmail' | 'inquilinoEmail' | 'miRol'>, email: string): Rol[] {
  if (a.miRol) return [a.miRol]
  const e = email.trim().toLowerCase()
  const r: Rol[] = []
  if (a.duenoEmail.toLowerCase() === e) r.push('dueno')
  if (a.inquilinoEmail.toLowerCase() === e) r.push('inquilino')
  return r
}

export function rolesDeCuenta(alquileres: Pick<Alquiler, 'duenoEmail' | 'inquilinoEmail' | 'miRol'>[], email: string): Rol[] {
  const s = new Set<Rol>()
  for (const a of alquileres) for (const r of rolesEn(a, email)) s.add(r)
  return (['dueno', 'inquilino'] as const).filter(r => s.has(r))
}

export const METODO: Record<Usuario['metodo'], string> = { correo: 'Correo', google: 'Google', apple: 'Apple' }
