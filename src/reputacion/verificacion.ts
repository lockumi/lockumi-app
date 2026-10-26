// Paso 19 · ronda 25/10/2026, 4:22–4:23 p. m. (modo servidor; con la demo local sin servidor nada cambia).
// · Límite 1 (Legal: bloqueante): el servidor solo acepta un correo que verificó contra el token de Cavos (api/verificar-correo.ts).
//   La app NO cambia el login: solo lee el token que el kit de Cavos ya guarda (authCavos() → getAuthToken()) y lo manda con su sesión
//   de Supabase. Sin token (p. ej. una pestaña nueva) no manda nada: el servidor decide con lo que ya verificó y, si no, rechaza.
// · Límite 5: eliminar la cuenta manda el pedido al servidor (lk_pedir_borrado_cuenta con el correo de la sesión de Cavos), desde el
//   25/10 (5:04 p. m.) con el código del correo (segundo-factor.ts, /api/codigo-correo).
// · Límite 4: la pantalla previa de REP-01 en otro aparato se decide con lk_necesita_rep01 (por el correo verificado).
import type { Alquiler } from '../types'
import { conServidor } from '../servidor/config'
import { servidor, usarCuenta } from '../servidor/repositorio'
import { authCavos } from '../services/auth'
import { pedirBorrado, ejecutarBorrados } from './borrado'
import { confirmarCodigo, pedirCodigo, ErrorCodigo, type MotivoCodigo } from './segundo-factor'

const normalizar = (c: string) => c.trim().toLowerCase()
/** El último correo verificado en esta carga de la app. El servidor lee solo por el correo verificado ACTIVO de la sesión (el último
 *  que verificó; Legal, 25/10/2026, 4:41 p. m.), así que si la persona del aparato cambia, se vuelve a verificar. */
let activo: { c: string; p: Promise<boolean> } | null = null
/** Tokens ya enviados en esta carga: el servidor usa cada token UNA sola vez (Legal, 4:45 p. m.), así que no se reenvían (no gastan el
 *  límite de intentos). Con un token ya usado, el servidor decide con lo que ya verificó; cambiar de persona = volver a entrar = token nuevo. */
const enviados = new Set<string>()
/** Legal 25/10/2026, 9:00 p. m.: con el token de correo de Cavos (aud «cavos-email», la misma para todas las apps de Cavos) el servidor
 *  NO verifica el correo solo con el token: lo deja por confirmar y manda el código de 6 números de Lockumi a ese correo. Mientras
 *  tanto, la app muestra «Revisa tu correo» (Pantallas.tsx, ConfirmarCorreo). motivo: el aviso si no salió un código nuevo. */
export type PorConfirmar = { c: string; correo: string; motivo?: MotivoCodigo }
let porConfirmar: PorConfirmar | null = null
const oyentes = new Set<() => void>()
const avisar = () => { for (const f of oyentes) f() }
export const correoPorConfirmar = () => porConfirmar
export function oirPorConfirmar(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f) } }
const MOTIVOS_AVISO = new Set(['minuto', 'hora', 'envio'])
/** Verifica una vez por correo activo (y por carga de la app). Nunca lanza: si no se pudo, el servidor rechaza después con un texto que
 *  dice cómo seguir («Sal de Lockumi, vuelve a entrar con tu correo…»). */
export function asegurarCorreo(email: string): Promise<boolean> {
  const c = normalizar(email)
  if (!conServidor) return Promise.resolve(true)
  if (activo?.c === c) return activo.p
  const p = (async () => {
    await usarCuenta(c)   // la sesión de otra cuenta se termina antes de verificar (cuenta-sesion.ts)
    const token = (await authCavos())?.getAuthToken()
    if (!token || enviados.has(token)) return false
    enviados.add(token)
    const r = await servidor.verificarCorreo(token)
    if (r.codigo) {   // falta el código del correo: no está verificado todavía
      if (normalizar(r.correo) === c) { porConfirmar = { c, correo: r.correo, ...(r.motivo && MOTIVOS_AVISO.has(r.motivo) && { motivo: r.motivo as MotivoCodigo }) }; avisar() }
      return false
    }
    // Alquileres traídos de otro navegador (20261026060000): conecta el servidor a las pantallas abiertas para que «Tus alquileres» los muestre.
    if (r.vinculados) void import('../store').then(m => m.activarServidor()).catch(() => {})
    return normalizar(r.correo) === c
  })().catch(() => false)
  const yo = { c, p }
  activo = yo
  p.then(ok => { if (!ok && activo === yo) activo = null })   // se reintenta la próxima vez (p. ej. después de volver a entrar)
  return p
}

/** «Revisa tu correo» (verificar_correo): con el código correcto el servidor registra el correo como verificado. Lanza ErrorCodigo. */
export async function confirmarCorreoConCodigo(codigo: string) {
  const p = porConfirmar
  if (!p) throw new ErrorCodigo('correo')
  const r = await confirmarCodigo('verificar_correo', codigo)
  if (normalizar(String(r.correo ?? '')) !== p.c) throw new ErrorCodigo('correo')
  activo = { c: p.c, p: Promise.resolve(true) }; porConfirmar = null; avisar()
}
/** «Reenviar código» de «Revisa tu correo»: otro código al correo por confirmar (mismos límites: 1 por minuto y 5 por hora). */
export async function reenviarCodigoCorreo() {
  const p = porConfirmar
  if (!p) throw new ErrorCodigo('correo')
  const r = await pedirCodigo(p.c, 'verificar_correo')
  porConfirmar = { c: p.c, correo: r.correo }; avisar()
}

/** Límite 5: en modo servidor, primero el pedido en el servidor; si falla, no se borra nada en este aparato (se puede reintentar).
 *  Segundo factor (Legal 25/10, 5:04 p. m.): en modo servidor el pedido va con el código del correo (/api/codigo-correo); sin código no se
 *  borra nada. En la demo local sin servidor, igual que antes. */
export async function eliminarCuenta(email: string, todos: readonly Alquiler[], ahora = Date.now(), codigo?: string) {
  if (conServidor) { if (!codigo) throw new ErrorCodigo('codigo'); await confirmarCodigo('eliminar', codigo) }
  pedirBorrado(email, ahora, todos); ejecutarBorrados(ahora, todos)
}

/** Límite 4: ¿la persona todavía tiene que aceptar REP-01? null sin servidor (decide lo local). */
export async function necesitaRep01EnServidor(email: string): Promise<boolean | null> {
  if (!conServidor) return null
  await asegurarCorreo(email)
  return await servidor.necesitaRep01(email)
}
export type EstadoServidor = boolean | null | 'cargando' | 'error'
/** local: lo que dice este aparato (sin REP-01 y sin alquileres). servidor: null (sin servidor), 'cargando', 'error' o su respuesta.
 *  Si el servidor falla, se muestra la pantalla previa (nunca se salta por un error). */
export function decidirPrevia(local: boolean, servidor: EstadoServidor): boolean | 'cargando' {
  if (!local) return false
  if (servidor === null || servidor === 'error') return true
  return servidor
}
