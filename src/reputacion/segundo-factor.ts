// Paso 19 · Segundo factor antes de «Eliminar mi cuenta» y «Descargar mis datos» (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.).
// Solo en modo servidor: el servidor manda un código de 6 números al correo verificado de la sesión (/api/codigo-correo, paso 'pedir') y,
// con el código correcto, hace la acción (paso 'confirmar'). Con la demo local sin servidor nada sale del aparato y el flujo no cambia.
import { servidor } from '../servidor/repositorio'
import { asegurarCorreo } from './verificacion'
import { SEGUNDO_FACTOR } from './textos'

// 'verificar_correo' (Legal 25/10/2026, 9:00 p. m.): confirmar el correo de un token de correo de Cavos con aud «cavos-email»
// (verificacion.ts). El código va al correo POR CONFIRMAR de la sesión, no al verificado.
// 'invitacion' (26/10/2026): el correo invitado de una invitación abierta con otra cuenta (InvitacionCodigo.tsx).
export type AccionCodigo = 'eliminar' | 'descargar' | 'verificar_correo' | 'invitacion'
export type MotivoCodigo = keyof typeof SEGUNDO_FACTOR.errores | 'accion'
const MOTIVOS = new Set<string>(Object.keys(SEGUNDO_FACTOR.errores))
/** Error del segundo factor. `motivo` elige el texto (SEGUNDO_FACTOR.errores, o el error de siempre de la acción si es 'accion'). */
export class ErrorCodigo extends Error {
  motivo: MotivoCodigo; correo?: string
  constructor(motivo: MotivoCodigo, correo?: string) { super(motivo); this.motivo = motivo; this.correo = correo }
}
const motivoDe = (c: Record<string, unknown>): MotivoCodigo => typeof c.motivo === 'string' && MOTIVOS.has(c.motivo) ? c.motivo as MotivoCodigo : c.motivo === 'accion' ? 'accion' : 'envio'

/** Pide un código para la acción. Devuelve el correo al que se mandó. Si ya se mandó uno hace menos de un minuto, lanza ErrorCodigo
 *  'minuto' con el correo (la pantalla del código se muestra igual, con ese aviso). */
export async function pedirCodigo(email: string, accion: AccionCodigo): Promise<{ correo: string }> {
  // límite 1: el servidor solo manda el código al correo verificado contra el token de Cavos ('verificar_correo': al correo por confirmar)
  if (accion !== 'verificar_correo') await asegurarCorreo(email)
  const r = await servidor.codigoCorreo({ paso: 'pedir', accion }).catch(() => null)
  if (!r) throw new ErrorCodigo('envio')
  const correo = typeof r.cuerpo.correo === 'string' ? r.cuerpo.correo : undefined
  if (!r.ok || !correo) throw new ErrorCodigo(motivoDe(r.cuerpo), correo)
  return { correo }
}
/** Confirma el código y hace la acción en el servidor. Devuelve lo que respondió la acción (fecha_limite o datos). */
export async function confirmarCodigo(accion: AccionCodigo, codigo: string, rol?: 'dueno' | 'inquilino'): Promise<Record<string, unknown>> {
  const r = await servidor.codigoCorreo({ paso: 'confirmar', accion, codigo: codigo.replace(/\s+/g, ''), ...(rol && { rol }) }).catch(() => null)
  if (!r) throw new ErrorCodigo('accion')
  if (!r.ok || r.cuerpo.hecho !== true) throw new ErrorCodigo(motivoDe(r.cuerpo))
  return r.cuerpo
}
