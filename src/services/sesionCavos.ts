// Espejo de la sesión de Cavos (opción A, 26/10/2026; como lib/cavosSession.ts de Meteorito). El kit guarda el token del login
// solo en sessionStorage (`cavos-kit:token:<appId>`): en una pestaña nueva no hay token y había que volver a entrar. Aquí se
// copia a localStorage al entrar y se repone en la pestaña ANTES de que el kit lo use, solo si sigue vigente y es de la misma
// identidad guardada (`cavos-kit:identity:<appId>`). Vencido o de otra persona: se borra y se pide «Entrar de nuevo».
// El token nunca se muestra ni se manda a Lockumi: solo se mueve entre los dos almacenamientos de este navegador.
type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const ESPEJO = 'lockumi.cavos.sesion'
const ENVIADOS = 'lockumi.cavos.token-enviado'   // huellas (SHA-256 cortado) de tokens que ya fueron al servidor; nunca el token
const MARGEN_S = 300   // tolerancia de reloj, como Meteorito
const claves = (appId: string) => ({ token: `cavos-kit:token:${appId || 'default'}`, identidad: `cavos-kit:identity:${appId || 'default'}` })

function datosJwt(t: string): { exp?: number; sub?: string; iat?: number } | null {
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
/** Al salir (o al cambiar de cuenta). También olvida el «Revisa tu correo» pendiente de este aparato. */
export function borrarSesion(local: Almacen = localStorage) { try { local.removeItem(ESPEJO); local.removeItem(PENDIENTE); local.removeItem(ENVIADOS) } catch { /* nada */ } }

// Volver con el código del correo todavía por confirmar (27/10/2026, PR #60). El servidor exige un token de Cavos de 5 minutos como máximo
// (api/_lib/cavos-token.ts: EDAD_MAXIMA, como el enclave) y lo gasta una sola vez; el kit no renueva el token en silencio. Quien deja la
// pantalla «Revisa tu correo» sin escribir el código (cierra la pestaña, el código llega tarde) y vuelve con su llave de acceso trae el
// token de hace rato: el servidor lo rechaza (403 «Sal de Lockumi…»), el correo nunca queda confirmado y la app no vuelve a pedir el código.
// El servidor sí recuerda el correo por confirmar 1 hora (lk_correo_pendiente), y «Reenviar código» ya funciona sin token. Por eso la app
// guarda aquí SOLO el correo por confirmar (no el token ni el código) y, al volver con un token que ya no sirve, muestra de nuevo la misma
// pantalla «Revisa tu correo». No verifica nada: el correo solo queda verificado con el código correcto (/api/codigo-correo).
const PENDIENTE = 'lockumi.correo-por-confirmar'
export const VIDA_PENDIENTE_MS = 55 * 60_000   // el servidor lo guarda 1 hora; 5 minutos menos para no mostrar una pantalla que ya no sirve
/** Máximo que la app deja pasar antes de NO mandar un token: el servidor lo rechaza con más de 5 minutos (+60 s de margen del reloj). */
export const EDAD_MAXIMA_TOKEN_S = 360
/** ¿Este token ya no le sirve al servidor (emitido hace más de 6 minutos o vencido)? Un token que no es un JWT: false (decide el servidor). */
export function tokenYaNoSirve(t: string, ahora = Date.now()): boolean {
  const d = datosJwt(t); if (!d) return false
  const s = ahora / 1000
  return (typeof d.iat === 'number' && s - d.iat > EDAD_MAXIMA_TOKEN_S) || (typeof d.exp === 'number' && d.exp + 60 < s)
}
export function guardarPorConfirmar(c: string, correo: string, ahora = Date.now(), local: Almacen = localStorage) {
  try { local.setItem(PENDIENTE, JSON.stringify({ c, correo, hasta: ahora + VIDA_PENDIENTE_MS })) } catch { /* sin almacenamiento */ }
}
/** El correo por confirmar guardado para la cuenta `c` (null si no hay, es de otra cuenta o ya pasó la hora del servidor). */
export function leerPorConfirmar(c: string, ahora = Date.now(), local: Almacen = localStorage): { c: string; correo: string } | null {
  try {
    const g = JSON.parse(local.getItem(PENDIENTE) ?? 'null') as { c?: unknown; correo?: unknown; hasta?: unknown } | null
    if (!g || typeof g.c !== 'string' || typeof g.correo !== 'string' || typeof g.hasta !== 'number') return null
    if (g.hasta <= ahora) { local.removeItem(PENDIENTE); return null }
    return g.c === c ? { c: g.c, correo: g.correo } : null
  } catch { return null }
}
export function borrarPorConfirmar(local: Almacen = localStorage) { try { local.removeItem(PENDIENTE) } catch { /* nada */ } }

// Recargar la página después de confirmar el correo (27/10/2026, PR #60, prueba real del inquilino): la app vuelve a cargar con el mismo token de Cavos
// (el espejo de arriba, de menos de 6 minutos), y como la lista de «tokens ya enviados» vivía solo en memoria, lo mandaba OTRA vez a
// /api/verificar-correo: el servidor ya lo gastó (un solo uso) y respondía 403 «Sal de Lockumi…» (la app lo ignora, pero gasta el límite de 5 intentos
// por sesión y 10 minutos). Aquí se recuerda en este navegador una huella del token ya enviado (no el token) por lo que le queda de vida al servidor.
export const VIDA_ENVIADO_MS = 7 * 60_000   // 6 minutos que acepta el servidor + 1 de margen
/** Huella corta (SHA-256) de un token para recordar que ya se mandó. null si el navegador no tiene crypto.subtle (entonces no se recuerda nada). */
export async function huellaToken(t: string): Promise<string | null> {
  try {
    const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
    return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch { return null }
}
function leerEnviados(ahora: number, local: Almacen): { h: string; hasta: number }[] {
  try {
    const a = JSON.parse(local.getItem(ENVIADOS) ?? '[]') as unknown
    return Array.isArray(a) ? a.filter((x): x is { h: string; hasta: number } => !!x && typeof (x as { h?: unknown }).h === 'string' && typeof (x as { hasta?: unknown }).hasta === 'number' && (x as { hasta: number }).hasta > ahora) : []
  } catch { return [] }
}
export function tokenYaEnviado(h: string, ahora = Date.now(), local: Almacen = localStorage): boolean { return leerEnviados(ahora, local).some(x => x.h === h) }
export function guardarTokenEnviado(h: string, ahora = Date.now(), local: Almacen = localStorage) {
  try { local.setItem(ENVIADOS, JSON.stringify([...leerEnviados(ahora, local).filter(x => x.h !== h), { h, hasta: ahora + VIDA_ENVIADO_MS }].slice(-5))) } catch { /* sin almacenamiento */ }
}
