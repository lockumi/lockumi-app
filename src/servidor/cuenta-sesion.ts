// Una sesión anónima de Supabase por CUENTA, no por navegador (26/10/2026, Katherine): la sesión queda atada al correo de la cuenta
// con la que se entró (lockumi.sesion-correo). Si se entra con otra cuenta (otro correo) o se sale, esa sesión se termina (signOut y se
// borra lockumi.sesion-servidor) y la próxima es nueva; el servidor le trae los alquileres del correo verificado por Cavos
// (lk_vincular_alquileres). Así la lista y el rol («Eres dueño» / «Eres inquilino») salen siempre de la cuenta actual y nunca se
// mezclan con los de la cuenta anterior. Una sesión vieja sin correo guardado se trata como de otra cuenta (se termina una vez).
export const K_SESION = 'lockumi.sesion-servidor', K_CORREO = 'lockumi.sesion-correo'
const normalizar = (c: string) => c.trim().toLowerCase()
type Deps = { storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; salir: () => Promise<unknown> }

/** Ata la sesión a la cuenta `correo`. true si terminó la sesión de otra cuenta (la próxima llamada al servidor abre una nueva). */
export async function usarCuentaCon(correo: string, d: Deps): Promise<boolean> {
  const c = normalizar(correo); if (!c) return false
  const otra = !!d.storage.getItem(K_SESION) && d.storage.getItem(K_CORREO) !== c
  if (otra) { await d.salir().catch(() => {}); d.storage.removeItem(K_SESION) }
  d.storage.setItem(K_CORREO, c)
  return otra
}
/** Al salir de la cuenta: termina la sesión anónima y olvida su correo. */
export async function salirCon(d: Deps): Promise<void> {
  if (d.storage.getItem(K_SESION)) await d.salir().catch(() => {})
  d.storage.removeItem(K_SESION); d.storage.removeItem(K_CORREO)
}
/** Otra pestaña entró con otra cuenta (evento storage de lockumi.sesion-correo): esta pestaña ya no es de la cuenta que muestra. */
export const otraPestanaCambio = (clave: string | null, nuevo: string | null, correo: string) =>
  clave === K_CORREO && nuevo !== null && nuevo !== normalizar(correo)
