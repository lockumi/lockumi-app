// Espejo de la sesión de Cavos (opción A, 26/10/2026; como lib/cavosSession.ts de Meteorito). El kit guarda el token del login
// solo en sessionStorage (`cavos-kit:token:<appId>`): en una pestaña nueva no hay token y había que volver a entrar. Aquí se
// copia a localStorage al entrar y se repone en la pestaña ANTES de que el kit lo use, solo si sigue vigente y es de la misma
// identidad guardada (`cavos-kit:identity:<appId>`). Vencido o de otra persona: se borra y se pide «Entrar de nuevo».
// El token nunca se muestra ni se manda a Lockumi: solo se mueve entre los dos almacenamientos de este navegador.
type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const ESPEJO = 'lockumi.cavos.sesion'
const MARGEN_S = 300   // tolerancia de reloj, como Meteorito
const claves = (appId: string) => ({ token: `cavos-kit:token:${appId || 'default'}`, identidad: `cavos-kit:identity:${appId || 'default'}` })

function datosJwt(t: string): { exp?: number; sub?: string } | null {
  try { const p = t.split('.')[1]; return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(p.length / 4) * 4, '='))) } catch { return null }
}
function usuarioIdentidad(local: Almacen, appId: string): string | null {
  try { const i = JSON.parse(local.getItem(claves(appId).identidad) ?? 'null') as { userId?: string } | null; return i?.userId ?? null } catch { return null }
}
const vigente = (t: string, sub: string | null, ahora: number) => { const d = datosJwt(t); return !!d && typeof d.exp === 'number' && d.exp > ahora / 1000 - MARGEN_S && !!sub && d.sub === sub }

/** Después de entrar: copia el token de la pestaña al espejo. */
export function guardarSesion(appId: string, sesion: Almacen = sessionStorage, local: Almacen = localStorage) {
  try { const t = sesion.getItem(claves(appId).token); if (t) local.setItem(ESPEJO, t) } catch { /* sin almacenamiento */ }
}
/** Antes de que el kit lea el token: si la pestaña no lo tiene, lo repone desde el espejo (vigente y de la misma identidad). */
export function reponerSesion(appId: string, sesion: Almacen = sessionStorage, local: Almacen = localStorage, ahora = Date.now()): boolean {
  try {
    const k = claves(appId), propio = sesion.getItem(k.token)
    if (propio) { if (!local.getItem(ESPEJO)) local.setItem(ESPEJO, propio); return true }
    const t = local.getItem(ESPEJO); if (!t) return false
    if (!vigente(t, usuarioIdentidad(local, appId), ahora)) { local.removeItem(ESPEJO); return false }
    sesion.setItem(k.token, t); return true
  } catch { return false }
}
/** Al salir (o al cambiar de cuenta). */
export function borrarSesion(local: Almacen = localStorage) { try { local.removeItem(ESPEJO) } catch { /* nada */ } }
