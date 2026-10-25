// Paso 19 · Segundo factor antes de «Eliminar mi cuenta» y «Descargar mis datos» (diseño aprobado por Legal el 25/10/2026 a las
// 5:04 p. m. y por Katherine a las 5:29 p. m., hora de Costa Rica; imágenes en prueba-completa/capturas/paso19-reputacion/segundo-factor/).
// Por qué: Lockumi no tiene un aud propio con Cavos (docs/reputacion.md), así que el servidor manda un código al correo verificado ACTIVO
// de la sesión (lk_correo_activo) y solo con ese código borra o descarga.
//   · 6 números al azar (crypto.getRandomValues, sin sesgo). NUNCA se guarda el código: solo HMAC-SHA256(LOCKUMI_CODIGO_PEPPER, sal|usuario|correo|acción|código)
//     con una sal al azar por código. El pepper vive solo en Vercel (no en la base).
//   · Vale 10 minutos, 5 intentos, un solo uso, ligado a la acción (eliminar o descargar), a la sesión y al correo (sección 7 de la migración).
//   · «Reenviar código»: como mucho 1 por minuto y 5 por hora por correo (lk_codigo_nuevo).
//   · Comparación en tiempo constante: crypto.subtle.verify('HMAC', …) recalcula el HMAC y lo compara en tiempo constante (Node lo hace
//     con CRYPTO_memcmp); nunca se comparan huellas con === ni en SQL ni en la app.
//   · La acción la hace ESTE servidor, con la sesión de la persona, justo después de confirmar el código; lk_pedir_borrado_cuenta y
//     lk_mis_datos_reputacion además rechazan sin un código confirmado (lk_usar_codigo), aunque la app las llame directo.
// Correo: aviso del servicio (sin casilla ni contenido comercial), con el pie de siempre (PIE, el mismo de REP-12), por Resend.
import { servicio, rpc } from './supabase.js'
import { PIE, REMITENTE, origenPermitido } from './correo.js'

type Env = Record<string, string | undefined>
export type Accion = 'eliminar' | 'descargar'
export const ACCIONES: readonly Accion[] = ['eliminar', 'descargar']
export const MINUTOS_VALIDO = 10
export const INTENTOS = 5

// LEGAL: revisado (25/10, 5:04 p. m.) · textos literales de Legal (correo del código)
export const asuntoCodigo = (codigo: string) => `Tu código de Lockumi: ${codigo}`
export const PARA_QUE: Record<Accion, string> = { eliminar: 'eliminar tu cuenta', descargar: 'descargar tus datos' }
export const cuerpoCodigo = (accion: Accion) =>
  `Escribe este código en Lockumi para ${PARA_QUE[accion]}. Vale 10 minutos. No lo compartas con nadie: Lockumi nunca te lo va a pedir por otro medio. Si no lo pediste, ignora este correo; sin el código no se hace nada.`

// Errores (se muestran en la app tal cual; cada uno dice cómo seguir, sin palabras técnicas).
export const ERRORES = {
  // LEGAL: revisado (25/10, 5:04 p. m.) · texto literal de Legal (diseño aprobado, pantalla «Si el código falla»)
  codigo: 'Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».',
  // LEGAL: revisado (25/10, 5:04 p. m.) · texto literal de Legal (reenvío antes de un minuto)
  minuto: 'Ya te enviamos un código. Espera un minuto antes de pedir otro.',
  // LEGAL: revisar · segundo factor 25/10 5:29 · texto propio (más de 5 códigos en una hora)
  hora: 'Ya te enviamos 5 códigos en la última hora. Espera una hora y vuelve a tocar «Reenviar código».',
  // LEGAL: revisar · segundo factor 25/10 5:29 · texto propio (el correo no salió)
  envio: 'No pudimos enviarte el código. Revisa tu conexión y vuelve a intentarlo en un minuto.',
  // LEGAL: revisado (25/10) · mismo texto del servidor que lk_correo_de_sesion (la sesión no tiene un correo verificado)
  correo: 'Ese correo no es el de tu cuenta en este aparato. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.',
} as const
export type Motivo = keyof typeof ERRORES | 'accion'

// Web Crypto (globalThis.crypto: Node 20+ y Vercel), sin depender de los tipos de node en el resto del proyecto.
const te = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('')
const llaveHmac = (pepper: string) => crypto.subtle.importKey('raw', te.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
const mensaje = (sal: string, usuario: string, correo: string, accion: Accion, codigo: string) => te.encode(`${sal}|${usuario}|${correo}|${accion}|${codigo}`)
/** huella = HMAC-SHA256(pepper, sal|usuario|correo|acción|código), en hex (64). Es lo único que se guarda. */
export async function huellaCodigo(pepper: string, sal: string, usuario: string, correo: string, accion: Accion, codigo: string) {
  return hex(await crypto.subtle.sign('HMAC', await llaveHmac(pepper), mensaje(sal, usuario, correo, accion, codigo)))
}
/** ¿El código escrito da la huella guardada? crypto.subtle.verify recalcula el HMAC y lo compara en tiempo constante. */
export async function mismaHuella(pepper: string, huella: string, sal: string, usuario: string, correo: string, accion: Accion, codigo: string) {
  if (!/^[0-9a-f]{64}$/.test(String(huella))) return false
  const firma = new Uint8Array(32); for (let i = 0; i < 32; i++) firma[i] = parseInt(huella.slice(i * 2, i * 2 + 2), 16)
  return crypto.subtle.verify('HMAC', await llaveHmac(pepper), firma, mensaje(sal, usuario, correo, accion, codigo))
}
/** 6 números al azar, sin sesgo (4 294 000 000 es múltiplo de 1 000 000: se descarta lo que queda arriba). */
export function codigoAlAzar() {
  const b = new Uint32Array(1)
  do crypto.getRandomValues(b); while (b[0]! >= 4_294_000_000)
  return String(b[0]! % 1_000_000).padStart(6, '0')
}
const salAlAzar = () => hex(crypto.getRandomValues(new Uint8Array(16)))
const pepperDe = (env: Env) => { const p = env.LOCKUMI_CODIGO_PEPPER?.trim(); return p && p.length >= 32 ? p : null }

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
/** Asunto, HTML y texto del correo del código. Mismo formato que REP-12 (aviso del servicio): nota de demo, título, texto y el pie de
 *  siempre. Sin botones ni enlaces para hacer nada (solo «Privacidad» del pie), sin casilla, sin contenido comercial. */
export function armarCodigo(codigo: string, accion: Accion, origen: string) {
  const asunto = asuntoCodigo(codigo), cuerpo = cuerpoCodigo(accion), demo = 'Demo en la red de prueba: sin dinero real.'
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#3D2A22;background:#FFF5EE;max-width:560px;margin:0 auto;padding:16px">
<p style="font-size:13px;color:#7A5446;margin:0 0 12px"><strong>${esc(demo)}</strong></p>
<h1 style="font-size:20px;margin:0 0 12px;color:#3D2A22">${esc(asunto)}</h1>
<p style="font-size:15px;line-height:1.5">${esc(cuerpo)}</p>
<hr style="border:none;border-top:1px solid #FFB08A;margin:20px 0"><p style="font-size:12px;color:#7A5446;line-height:1.5">${esc(PIE)} <a href="${esc(origen)}/privacidad" style="color:#E8531F">Privacidad</a></p></body></html>`
  const texto = `${demo}\n\n${asunto}\n\n${cuerpo}\n\n${PIE} Privacidad: ${origen}/privacidad`
  return { asunto, html, texto }
}

type Respuesta = { estado: number; cuerpo: Record<string, unknown> }
// 'accion' (pedido mal armado o la acción falló): sin texto propio; la app muestra el error de siempre de esa acción (UI.errBorrado o UI.errDescarga).
const error = (estado: number, motivo: Motivo): Respuesta => ({ estado, cuerpo: motivo === 'accion' ? { motivo } : { error: ERRORES[motivo], motivo } })

/** POST /api/codigo-correo. Cuerpo: { paso: 'pedir' | 'confirmar', accion: 'eliminar' | 'descargar', codigo?, rol? }. Sesión de Supabase
 *  en Authorization (Bearer). origen: encabezado Origin (solo para el enlace «Privacidad» del pie). */
export async function atenderCodigo(env: Env, bearer: string | null, body: unknown, origen: string | null, f: typeof fetch = fetch): Promise<Respuesta> {
  const s = servicio(env), anon = (env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim(), pepper = pepperDe(env), llave = env.RESEND_API_KEY?.trim()
  // Cierre por defecto: sin base, sin pepper o sin Resend no se manda ni se acepta ningún código (y por lo tanto no se borra ni se descarga).
  if (!s || !anon || !pepper || !llave) return error(503, 'envio')
  const b = (body ?? {}) as { paso?: unknown; accion?: unknown; codigo?: unknown; rol?: unknown }
  const accion = b.accion as Accion
  if (!ACCIONES.includes(accion) || (b.paso !== 'pedir' && b.paso !== 'confirmar')) return error(400, 'accion')
  if (!bearer || !/^Bearer \S+$/.test(bearer)) return error(401, 'correo')
  const r = await f(`${s.url}/auth/v1/user`, { headers: { apikey: anon, authorization: bearer } }).catch(() => null)
  const uid = r?.ok ? ((await r.json()) as { id?: string }).id : undefined
  if (!uid) return error(401, 'correo')

  if (b.paso === 'pedir') {
    let correo: string | null
    try { correo = await rpc<string | null>(s, 'lk_codigo_para', { p_usuario: uid }, f) } catch { return error(503, 'envio') }
    if (!correo) return error(403, 'correo')
    const codigo = codigoAlAzar(), sal = salAlAzar()
    let g: { id?: number; error?: 'correo' | 'minuto' | 'hora' }
    try { g = await rpc(s, 'lk_codigo_nuevo', { p_usuario: uid, p_correo: correo, p_accion: accion, p_huella: await huellaCodigo(pepper, sal, uid, correo, accion, codigo), p_sal: sal }, f) }
    catch { return error(503, 'envio') }
    if (g.error === 'minuto' || g.error === 'hora') { const r = error(429, g.error); return { ...r, cuerpo: { ...r.cuerpo, correo } } }
    if (g.error || typeof g.id !== 'number') return error(403, 'correo')
    const o = origen && origenPermitido(origen) ? origen : 'https://app.lockumi.com'
    const c = armarCodigo(codigo, accion, o)
    const e = await f('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json', 'idempotency-key': `codigo:${g.id}:${sal}` },
      body: JSON.stringify({ from: REMITENTE, to: [correo], subject: c.asunto, html: c.html, text: c.texto }),
    }).catch(() => null)
    const j = e ? await e.json().catch(() => ({})) as { id?: string } : {}
    if (!e?.ok || !j.id) {
      console.warn('codigo-correo', 'no salió el correo')   // nunca el código ni la llave
      await rpc(s, 'lk_codigo_borrar', { p_id: g.id }, f).catch(() => null)
      return error(502, 'envio')
    }
    return { estado: 200, cuerpo: { enviado: true, correo } }
  }

  // paso === 'confirmar'
  const codigo = typeof b.codigo === 'string' ? b.codigo.replace(/\s+/g, '') : ''
  if (!/^\d{6}$/.test(codigo)) return error(400, 'codigo')
  let t: { id: number; huella: string; sal: string; correo: string } | null
  try { t = await rpc(s, 'lk_codigo_intento', { p_usuario: uid, p_accion: accion }, f) } catch { return error(503, 'envio') }
  if (!t) return error(403, 'codigo')   // vencido, usado, anulado, con 5 intentos o sin código
  if (!await mismaHuella(pepper, t.huella, t.sal, uid, t.correo, accion, codigo)) return error(403, 'codigo')
  let ok: boolean
  try { ok = await rpc<boolean>(s, 'lk_codigo_confirmar', { p_id: t.id }, f) === true } catch { return error(503, 'envio') }
  if (!ok) return error(403, 'codigo')
  // La acción, con la sesión de la persona (auth.uid()): la función usa el código confirmado (un solo uso).
  const rol = b.rol === 'dueno' || b.rol === 'inquilino' ? b.rol : null
  const [fn, args] = accion === 'eliminar' ? ['lk_pedir_borrado_cuenta', { p_correo: t.correo }] : ['lk_mis_datos_reputacion', { p_correo: t.correo, p_rol: rol }]
  const a = await f(`${s.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: anon, authorization: bearer, 'content-type': 'application/json' }, body: JSON.stringify(args) }).catch(() => null)
  if (!a?.ok) { console.warn('codigo-correo', `${fn} respondió ${a?.status ?? 'sin respuesta'}`); return error(502, 'accion') }
  const dato = await a.json().catch(() => null)
  return { estado: 200, cuerpo: accion === 'eliminar' ? { hecho: true, fecha_limite: dato } : { hecho: true, datos: dato } }
}
