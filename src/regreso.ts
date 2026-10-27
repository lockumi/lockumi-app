// paso21 · Ruta a la que se vuelve después de entrar (hoy, solo el link de invitación #/invitacion/<id>/<token>).
// Se guarda en sessionStorage (sobrevive al viaje a Google o Apple en la misma pestaña) y, como respaldo, en localStorage por
// 30 minutos (por si el regreso llega a otra pestaña del mismo navegador). Se borra de los dos al usarla. Nunca se muestra.
const K = 'lockumi.regreso', VIGENCIA_MS = 30 * 60_000
const INVITACION = /^\/invitacion\/[0-9a-f-]{36}\/[0-9a-f]{64}$/
export const esRutaInvitacion = (r: string) => INVITACION.test(r)
/** Firmante (26/10): también el alquiler, para volver al mismo paso después de «Entrar de nuevo». */
const ALQUILER = /^\/alquiler\/[0-9A-Za-z_-]{1,64}$/
export const esRutaRegreso = (r: string) => INVITACION.test(r) || ALQUILER.test(r)
export function guardarRegreso(r: string, ahora = Date.now()) {
  if (!esRutaRegreso(r)) return
  try { sessionStorage.setItem(K, r) } catch { /* sin almacenamiento */ }
  try { localStorage.setItem(K, JSON.stringify({ r, t: ahora })) } catch { /* sin almacenamiento */ }
}
/** Devuelve la ruta guardada (o '/') y la borra. */
export function tomarRegreso(ahora = Date.now()): string {
  let s: string | null = null, l: string | null = null
  try { s = sessionStorage.getItem(K); sessionStorage.removeItem(K) } catch { /* sin almacenamiento */ }
  try { const x = JSON.parse(localStorage.getItem(K) || 'null') as { r?: string; t?: number } | null; localStorage.removeItem(K)
    if (x && typeof x.r === 'string' && typeof x.t === 'number' && ahora - x.t >= 0 && ahora - x.t < VIGENCIA_MS) l = x.r } catch { /* dato viejo */ }
  const r = s ?? l
  return r && esRutaRegreso(r) ? r : '/'
}
