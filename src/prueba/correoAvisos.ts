// Paso 11 · Avisos por correo (Resend) con consentimiento en el momento de uso. Solo con la prueba completa.
// Sin la casilla marcada no se envía nada; los avisos siguen en la app. El servidor vuelve a exigir la casilla (api/_lib/correo.ts).
import type { Plantilla, DatosAviso } from '../../api/_lib/avisos'

// LEGAL: revisar · casilla de consentimiento (sin marcar al empezar)
export const CASILLA_CORREO = 'Acepto que Lockumi me envíe avisos por correo'
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i
export const puedeEnviarAvisos = (correo: string, acepta: boolean) => acepta && EMAIL.test(correo.trim())

type Pedido = { tipo: 'aviso'; plantilla: Plantilla; datos: DatosAviso } | { tipo: 'invitacion'; rol: 'dueno' | 'inquilino'; nombre: string }
/** Envía un correo por /api/correo. Devuelve un mensaje que explica qué hacer si falla. */
export async function enviarCorreo(para: string, alquiler: string, acepta: boolean, p: Pedido): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!puedeEnviarAvisos(para, acepta)) return { ok: false, error: 'Escribe un correo como nombre@correo.com y marca la casilla para recibir los avisos.' }
  try {
    const r = await fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...p, para: para.trim(), alquiler, consentimiento: true }) })
    const j = await r.json().catch(() => ({})) as { error?: string }
    return r.ok ? { ok: true } : { ok: false, error: j.error ?? 'No pudimos enviar el correo ahora. Los avisos siguen en la app; vuelve a intentarlo en unos minutos.' }
  } catch { return { ok: false, error: 'Sin conexión: revisa tu internet y vuelve a intentarlo. Los avisos siguen en la app.' } }
}
