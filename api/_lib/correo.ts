// Correos de la prueba completa (invitación y avisos de los días 1, 4 y 6), con Resend desde invitaciones@lockumi.com.
// El servidor NO acepta texto libre: arma el correo con los textos de api/_lib/avisos.ts y solo recibe datos validados.
// Sin dirección ni nombre del lugar, sin fotos; con un enlace a la app. RESEND_API_KEY solo vive en el servidor y nunca se devuelve.
import { PLANTILLAS, RUBROS_VALIDOS, textoAviso, botonesAviso, type Plantilla, type DatosAviso } from './avisos.js'

export class ErrorCorreo extends Error { estado: number; constructor(estado: number, m: string) { super(m); this.estado = estado } }
const exigir = (ok: unknown, estado: number, m: string): void => { if (!ok) throw new ErrorCorreo(estado, m) }
export const REMITENTE = 'Lockumi <invitaciones@lockumi.com>'
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i
const ID = /^[a-z0-9-]{2,40}$/i
const NOMBRE = /^[\p{L} .'-]{1,60}$/u
/** Orígenes permitidos para el enlace a la app: app.lockumi.com (red de prueba, paso 11), las vistas previas y la app local. */
export const origenPermitido = (o: string) => o === 'https://app.lockumi.com' || /^https:\/\/lockumi-app-demo-[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(o)

export interface PedidoCorreo { tipo: 'aviso' | 'invitacion'; para: string; /** Paso 11: la casilla «Acepto que Lockumi me envíe avisos por correo» marcada en el momento de uso. */ consentimiento?: boolean; alquiler: string; plantilla?: Plantilla; datos?: DatosAviso; rol?: 'dueno' | 'inquilino'; nombre?: string }

// LEGAL: revisado (24/10) · pie común (LEGAL-correos-2104.md, punto 3)
export const PIE = 'Lockumi · Demo en la red de prueba de Stellar, sin dinero real. Nada de lo que pasa en esta demo tiene efecto legal. Este es un aviso del servicio, no publicidad. Lockumi nunca te pedirá por correo tu contraseña, tu frase secreta ni tus claves. Esta dirección no recibe respuestas; para consultas: business.applockumi@gmail.com.'
// LEGAL: revisado (24/10) · invitación, arriba del botón
export const textoInvitacion = (nombre: string, rol: 'dueno' | 'inquilino') =>
  `Recibes este correo porque ${nombre} escribió tu correo para invitarte como ${rol === 'dueno' ? 'dueño' : 'inquilino'} a un alquiler de ejemplo en la demo de Lockumi. Usamos tu correo solo para esta invitación y para los avisos de ese alquiler. Si no quieres participar, ignora este correo: el enlace vence en 7 días. Puedes pedir que borremos tu correo cuando quieras.`

const num = (n: unknown, max = 50_000) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max
/** Valida el pedido; devuelve el pedido limpio. */
export function validar(p: PedidoCorreo): PedidoCorreo {
  exigir(p && (p.tipo === 'aviso' || p.tipo === 'invitacion'), 400, 'Pedido de correo inválido.')
  exigir(p.consentimiento === true, 400, 'Marca la casilla «Acepto que Lockumi me envíe avisos por correo» para recibir los avisos. Sin ella, los avisos siguen solo en la app.')
  exigir(typeof p.para === 'string' && EMAIL.test(p.para.trim()), 400, 'Revisa el correo: tiene que ser como nombre@correo.com.')
  exigir(typeof p.alquiler === 'string' && ID.test(p.alquiler), 400, 'Alquiler inválido.')
  if (p.tipo === 'invitacion') {
    exigir(p.rol === 'dueno' || p.rol === 'inquilino', 400, 'Papel inválido.')
    exigir(typeof p.nombre === 'string' && NOMBRE.test(p.nombre.trim()), 400, 'El nombre visible solo puede tener letras y espacios (hasta 60).')
    return { tipo: 'invitacion', consentimiento: true, para: p.para.trim(), alquiler: p.alquiler, rol: p.rol, nombre: p.nombre!.trim() }
  }
  exigir(PLANTILLAS.includes(p.plantilla as Plantilla), 400, 'Aviso inválido.')
  const d = p.datos ?? {} as DatosAviso
  exigir(num(d.deposito) && (d.reclamado === undefined || num(d.reclamado)), 400, 'Montos inválidos.')
  for (const k of ['venceMs', 'finAlquilerMs'] as const) exigir(d[k] === undefined || num(d[k], 4_102_444_800_000), 400, 'Fecha inválida.')
  exigir(d.rubros === undefined || (Array.isArray(d.rubros) && d.rubros.length <= 20 && d.rubros.every(r => RUBROS_VALIDOS.has(r))), 400, 'Rubros inválidos.')
  return { tipo: 'aviso', consentimiento: true, para: p.para.trim(), alquiler: p.alquiler, plantilla: p.plantilla, datos: { deposito: d.deposito, reclamado: d.reclamado, venceMs: d.venceMs, finAlquilerMs: d.finAlquilerMs, recibido: !!d.recibido, regla: !!d.regla, rubros: d.rubros } }
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
/** Asunto, HTML y texto plano del correo. `origen`: dirección de la app para los enlaces. */
export function armar(p: PedidoCorreo, origen: string) {
  const base = `${origen}/#/alquiler/${encodeURIComponent(p.alquiler)}`
  let asunto: string, cuerpo: string, botones: { texto: string; url: string }[]
  if (p.tipo === 'invitacion') {
    // LEGAL: revisar · asunto de la invitación (Legal no lo dio)
    asunto = 'Te invitaron a un alquiler de ejemplo en la demo de Lockumi'
    cuerpo = textoInvitacion(p.nombre!, p.rol!); botones = [{ texto: 'Abrir la demo de Lockumi', url: `${origen}/` }]
  } else {
    // LEGAL: revisado (24/10) · LEGAL-correos-2104.md, punto 3: en el correo, «depósito» pasa a «depósito de prueba»
    const c = textoAviso(p.plantilla!, p.datos!), dp = (x: string) => x.replace(/depósito(?! de prueba)/g, 'depósito de prueba')
    asunto = dp(c.asunto); cuerpo = dp(c.texto)
    botones = botonesAviso(p.plantilla!).map(b => ({ texto: b.texto, url: `${base}?aviso=${p.plantilla}&canal=correo${b.accion === 'confirmar-devolver' ? '&confirmar=devolver' : ''}` }))
  }
  // Paso 11: paleta del logo (#FF6B35, #E8531F, #FFB08A sobre crema #FFF5EE, texto café #3D2A22); nunca texto blanco sobre naranja.
  // LEGAL: revisar · nota de demo arriba del texto (pedido de Katherine: cada correo dice que es una demo sin dinero real)
  const demo = 'Demo en la red de prueba: sin dinero real.'
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#3D2A22;background:#FFF5EE;max-width:560px;margin:0 auto;padding:16px">
<p style="font-size:13px;color:#7A5446;margin:0 0 12px"><strong>${esc(demo)}</strong></p>
<h1 style="font-size:20px;margin:0 0 12px;color:#3D2A22">${esc(asunto)}</h1>
<p style="font-size:15px;line-height:1.5">${esc(cuerpo)}</p>
${botones.map(b => `<p><a href="${esc(b.url)}" style="display:inline-block;background:#FF6B35;color:#3D2A22;font-weight:bold;padding:10px 16px;border-radius:8px;border:1px solid #E8531F;text-decoration:none">${esc(b.texto)}</a></p>`).join('\n')}
${p.tipo === 'aviso' ? '<p style="font-size:13px;color:#7A5446">Los botones abren la app. «Todo bien, devolver» abre la confirmación: nunca devuelve el depósito con un solo toque.</p>' : ''}
<hr style="border:none;border-top:1px solid #FFB08A;margin:20px 0"><p style="font-size:12px;color:#7A5446;line-height:1.5">${esc(PIE)} <a href="${esc(origen)}/privacidad">Privacidad</a></p></body></html>`
  const texto = `${demo}\n\n${asunto}\n\n${cuerpo}\n\n${botones.map(b => `${b.texto}: ${b.url}`).join('\n')}\n\n${PIE} Privacidad: ${origen}/privacidad`
  return { asunto, html, texto }
}

// Límite simple en memoria por instancia (la vista previa además está protegida por Vercel).
const usos = new Map<string, number[]>()
export function limite(clave: string, max: number, ahora = Date.now()) {
  const v = (usos.get(clave) ?? []).filter(t => ahora - t < 3_600_000)
  exigir(v.length < max, 429, 'Enviamos muchos correos en poco tiempo. Espera una hora y vuelve a intentarlo; los avisos siguen en la app.')
  v.push(ahora); usos.set(clave, v)
}

export async function atenderCorreo(env: Record<string, string | undefined>, pedido: PedidoCorreo, origen: string, ip: string, f: typeof fetch = fetch) {
  const p = validar(pedido)
  exigir(origenPermitido(origen), 403, 'Los correos solo salen desde la vista previa de la prueba.')
  const llave = env.RESEND_API_KEY?.trim()
  exigir(llave, 503, 'El correo no está configurado en este servidor. Los avisos siguen en la app.')
  limite('ip:' + ip, 40); limite('para:' + p.para.toLowerCase(), 15)
  const c = armar(p, origen)
  const clave = p.tipo === 'invitacion' ? `inv:${p.alquiler}:${p.para}` : `aviso:${p.alquiler}:${p.plantilla}:${p.para}`
  const r = await f('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json', 'idempotency-key': clave.slice(0, 256) },
    body: JSON.stringify({ from: REMITENTE, to: [p.para], subject: c.asunto, html: c.html, text: c.texto }),
  })
  const j = await r.json().catch(() => ({})) as { id?: string; message?: string }
  exigir(r.ok && j.id, 502, 'No pudimos enviar el correo ahora. El aviso está en la app; puedes volver a intentarlo en unos minutos.')
  return { enviado: true, id: j.id }
}
