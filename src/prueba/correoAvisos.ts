// Paso 11 · Avisos por correo (Resend) con consentimiento en el momento de uso. Solo con la prueba completa.
// Sin la casilla marcada no se envía nada; los avisos siguen en la app. El servidor vuelve a exigir la casilla (api/_lib/correo.ts).
import type { Plantilla, DatosAviso } from '../../api/_lib/avisos'
import type { Alquiler, Rol } from '../types'

// LEGAL: revisado (25/10, lista de Legal) · casilla de consentimiento (sin marcar al empezar)
export const CASILLA_CORREO = 'Acepto que Lockumi me envíe avisos por correo'
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i
export const puedeEnviarAvisos = (correo: string, acepta: boolean) => acepta && EMAIL.test(correo.trim())

type Pedido = { tipo: 'aviso'; plantilla: Plantilla; datos: DatosAviso } | { tipo: 'invitacion'; rol: 'dueno' | 'inquilino'; nombre: string; token?: string }
/** Envía un correo por /api/correo. Devuelve un mensaje que explica qué hacer si falla. */
export async function enviarCorreo(para: string, alquiler: string, acepta: boolean, p: Pedido): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!puedeEnviarAvisos(para, acepta)) return { ok: false, error: 'Escribe un correo como nombre@correo.com y marca la casilla para recibir los avisos.' }
  try {
    const r = await fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...p, para: para.trim(), alquiler, consentimiento: true }) })
    const j = await r.json().catch(() => ({})) as { error?: string }
    return r.ok ? { ok: true } : { ok: false, error: j.error ?? 'No pudimos enviar el correo ahora. Los avisos siguen en la app; vuelve a intentarlo en unos minutos.' }
  } catch { return { ok: false, error: 'Sin conexión: revisa tu internet y vuelve a intentarlo. Los avisos siguen en la app.' } }
}

/** Avisos de este papel ya entregados en la app y todavía no enviados por correo. Sin correo guardado (casilla desmarcada), ninguno. */
export function avisosPorEnviar(a: Alquiler, rol: Rol) {
  if (!a.correos?.[rol]) return []
  const hechos = new Set(a.correosEnviados?.[rol] ?? [])
  return (a.avisos ?? []).filter(v => v.para === rol && typeof v.dia === 'number' && v.entregado && !hechos.has(v.id))
}
/** Desmarcar la casilla: se borra el correo de ese papel y no se envía nada más. */
export function desactivarCorreo(x: Alquiler, rol: Rol) {
  if (x.correos) { const c = { ...x.correos }; delete c[rol]; x.correos = c }
}
/** Guarda en el servidor la casilla marcada (acepta) o la borra (desmarcada). Sin consentimiento guardado, el servidor no envía avisos. */
export async function guardarConsentimiento(para: string, alquiler: string, acepta: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tipo: 'consentimiento', para: para.trim(), alquiler, acepta }) })
    const j = await r.json().catch(() => ({})) as { error?: string }
    return r.ok ? { ok: true } : { ok: false, error: j.error ?? 'No pudimos guardar la casilla. Los avisos siguen en la app; vuelve a intentarlo en unos minutos.' }
  } catch { return { ok: false, error: 'Sin conexión: revisa tu internet y vuelve a intentarlo. Los avisos siguen en la app.' } }
}
