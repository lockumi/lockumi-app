// Paso 19 · ronda 25/10/2026, 4:22–4:23 p. m. (modo servidor; con la demo local sin servidor nada cambia).
// · Límite 1 (Legal: bloqueante): el servidor solo acepta un correo que verificó contra el token de Cavos (api/verificar-correo.ts).
//   La app NO cambia el login: solo lee el token que el kit de Cavos ya guarda (authCavos() → getAuthToken()) y lo manda con su sesión
//   de Supabase. Sin token (p. ej. una pestaña nueva) no manda nada: el servidor decide con lo que ya verificó y, si no, rechaza.
// · Límite 5: eliminar la cuenta manda el pedido al servidor (lk_pedir_borrado_cuenta con el correo de la sesión de Cavos).
// · Límite 4: la pantalla previa de REP-01 en otro aparato se decide con lk_necesita_rep01 (por el correo verificado).
import type { Alquiler } from '../types'
import { conServidor } from '../servidor/config'
import { servidor } from '../servidor/repositorio'
import { authCavos } from '../services/auth'
import { pedirBorrado, ejecutarBorrados } from './borrado'

const normalizar = (c: string) => c.trim().toLowerCase()
const verificados = new Map<string, Promise<boolean>>()
/** Verifica una vez por correo (y por carga de la app). Nunca lanza: si no se pudo, el servidor rechaza después con un texto que dice
 *  cómo seguir («Sal de Lockumi, vuelve a entrar con tu correo…»). */
export function asegurarCorreo(email: string): Promise<boolean> {
  const c = normalizar(email)
  if (!conServidor) return Promise.resolve(true)
  let p = verificados.get(c)
  if (!p) {
    p = (async () => {
      const token = (await authCavos())?.getAuthToken()
      if (!token) return false
      const r = await servidor.verificarCorreo(token)
      return normalizar(r.correo) === c
    })().catch(() => false)
    p.then(ok => { if (!ok) verificados.delete(c) })   // se reintenta la próxima vez (p. ej. después de volver a entrar)
    verificados.set(c, p)
  }
  return p
}

/** Límite 5: en modo servidor, primero el pedido en el servidor; si falla, no se borra nada en este aparato (se puede reintentar). */
export async function eliminarCuenta(email: string, todos: readonly Alquiler[], ahora = Date.now()) {
  if (conServidor) { await asegurarCorreo(email); await servidor.pedirBorradoCuenta(email) }
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
