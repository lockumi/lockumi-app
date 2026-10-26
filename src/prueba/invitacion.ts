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
const claveCorreo = (alquiler: string) => 'lk:invitacion-correo:' + alquiler
export const EVENTO_CORREO_INVITACION = 'lk-invitacion-correo'
/** paso21: correo al que SÍ salió la invitación desde este aparato (o null). La tarjeta del dueño lo usa para su mensaje. */
export const correoInvitacionEnviado = (alquiler: string): string | null => { try { return localStorage.getItem(claveCorreo(alquiler)) } catch { return null } }
/** Eliminar un alquiler: borra la marca de envío y el correo al que salió la invitación desde este aparato. */
export const olvidarInvitacionEnviada = (alquiler: string) => { try { localStorage.removeItem(clave(alquiler)); localStorage.removeItem(claveCorreo(alquiler)) } catch { /* sin almacenamiento */ } }
/** Token del link de invitación (…/#/invitacion/<id>/<token>), o undefined. */
export const tokenDeLink = (link?: string) => link?.match(/\/#\/invitacion\/[0-9a-f-]{36}\/([0-9a-f]{64})$/)?.[1]
/** Envía el correo de invitación una sola vez por alquiler (solo con VITE_CORREOS=1). El servidor también lo exige.
 *  paso21: con `token`, el botón del correo abre ESA invitación (antes abría la app sin el link y la persona no veía nada). */
export async function enviarInvitacionUnaVez(alquiler: string, para: string, nombre: string, token?: string) {
  if (!correosActivos() || localStorage.getItem(clave(alquiler))) return false
  localStorage.setItem(clave(alquiler), new Date().toISOString())
  const r = await enviarCorreo(para, alquiler, true, { tipo: 'invitacion', rol: 'inquilino', nombre, ...(token && { token }) })
  if (r.ok) { localStorage.setItem(claveCorreo(alquiler), para); if (typeof dispatchEvent === 'function') dispatchEvent(new Event(EVENTO_CORREO_INVITACION)) }
  return r.ok
}

// LEGAL: textos literales de Legal (25/10, 10:10 p. m., paso21) · tarjeta del dueño después de invitar
export const textoEnlaceEnviado = (c: string) => `Te enviamos el enlace a ${c}. La persona invitada tiene que entrar con ese correo. Si quieres, también puedes copiarlo y compartirlo por WhatsApp.`
/** Botón para compartir el link por WhatsApp (abre WhatsApp con el link escrito; la persona elige a quién). Texto pendiente de revisión de Legal. */
export const BOTON_WHATSAPP = 'Compartir por WhatsApp'
export const enlaceWhatsApp = (link: string) => 'https://wa.me/?text=' + encodeURIComponent(link)
// LEGAL: texto literal de Legal (25/10, 10:10 p. m., paso21) · la invitación es para otro correo. El mismo texto lo da el servidor (20261025230000).
/** 26/10/2026 (Katherine): con otra cuenta (p. ej. Apple), en lugar de TEXTO_OTRO_CORREO se ve a qué correo se envió (oculto) y el botón
 *  para pedir el código de 6 números a ese correo (src/reputacion/InvitacionCodigo.tsx). Oculto: la primera letra, ••• y @dominio. */
export const correoOculto = (c: string) => { const [n = '', d = ''] = c.trim().toLowerCase().split('@'); return `${n.slice(0, 1)}•••@${d}` }
export const textoInvitacionEnviada = (c: string) => `Esta invitación se envió a ${correoOculto(c)}`
export const BOTON_CODIGO_INVITACION = 'Enviarme un código a ese correo'
export const TEXTO_OTRO_CORREO = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
// LEGAL: textos literales aprobados por Legal (25/10, 10:15 p. m., paso21) · pantalla de la persona invitada sin sesión, corta:
// título y subtítulo (sin nombre del dueño ni «firmar»). El título es el mismo de la pantalla de la invitación con sesión.
export const TITULO_INVITACION = 'Te invitaron a un alquiler'
export const SUBTITULO_INVITADO_SIN_SESION = 'Inicia sesión para verlo'
/** Título del plegable de las reglas en la invitación (Katherine/Legal 25/10, 10:15 p. m.): dice qué contiene; el texto de adentro no cambia. */
export const TITULO_PLEGABLE_REGLAS = 'Reglas del alquiler'
