// paso16-unido · Invitaciones en el modo de dos personas (Legal, 25/10, arreglo 5). Privacidad 1.7-demo: «Al invitarla, declaras
// que esa persona sabe que la invitas (y que acepta recibir el correo de Lockumi).» y «Le enviamos un solo correo de invitación,
// sin recordatorios.» La declaración se guarda en el servidor (quién, cuándo y el texto exacto: lk_crear_contrato_invitando).
import { correosActivos } from './interruptor'
import { enviarCorreo } from './correoAvisos'
import { NOMBRE_INVITACION } from '../../api/_lib/textos-correos'

// LEGAL: revisado (25/10, lista de Legal) · casilla de la declaración (texto propio, igual que la Privacidad 1.7-demo)
export const declaracionInvitacion = () => correosActivos()
  ? 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
  : 'Declaro que esta persona sabe que la invito.'

const NOMBRE = /^[\p{L} .'-]{1,60}$/u
/** Nombre visible para el correo (el servidor solo acepta letras y espacios). Sin nombre: «el dueño», en minúscula porque va a mitad de la frase. */
export const nombreInvitacion = (nombre?: string) => nombre && NOMBRE.test(nombre.trim()) ? nombre.trim() : NOMBRE_INVITACION

const clave = (alquiler: string) => 'lk:invitacion-enviada:' + alquiler
/** Envía el correo de invitación una sola vez por alquiler (solo con VITE_CORREOS=1). El servidor también lo exige. */
export async function enviarInvitacionUnaVez(alquiler: string, para: string, nombre: string) {
  if (!correosActivos() || localStorage.getItem(clave(alquiler))) return false
  localStorage.setItem(clave(alquiler), new Date().toISOString())
  const r = await enviarCorreo(para, alquiler, true, { tipo: 'invitacion', rol: 'inquilino', nombre })
  return r.ok
}
