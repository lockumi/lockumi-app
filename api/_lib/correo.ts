// Correos de la prueba completa (invitación y avisos de los días 1, 4 y 6), con Resend desde invitaciones@lockumi.com.
// El servidor NO acepta texto libre: arma el correo con los textos de api/_lib/avisos.ts y solo recibe datos validados.
// Sin dirección ni nombre del lugar, sin fotos; con un enlace a la app. RESEND_API_KEY solo vive en el servidor y nunca se devuelve.
import { PLANTILLAS, RUBROS_VALIDOS, textoAviso, botonesAviso, segunRegla, type Plantilla, type DatosAviso } from './avisos.js'

export class ErrorCorreo extends Error { estado: number; constructor(estado: number, m: string) { super(m); this.estado = estado } }
const exigir = (ok: unknown, estado: number, m: string): void => { if (!ok) throw new ErrorCorreo(estado, m) }
import { servicio, rpc, correoAviso } from './supabase.js'
export const REMITENTE = 'Lockumi <invitaciones@lockumi.com>'
const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i
const ID = /^[a-z0-9-]{2,40}$/i
const NOMBRE = /^[\p{L} .'-]{1,60}$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, TOKEN_INV = /^[0-9a-f]{64}$/
/** paso21: dirección del botón del correo de invitación. Con el token, abre la invitación de ESE alquiler (la app guarda la ruta
 *  mientras la persona inicia sesión y vuelve ahí). Sin token (pedido de una versión anterior de la app), la app. */
export const enlaceInvitacion = (origen: string, alquiler: string, token?: string) => token ? `${origen}/#/invitacion/${alquiler}/${token}` : `${origen}/`
/** Orígenes permitidos para el enlace a la app: app.lockumi.com (red de prueba, paso 11), las vistas previas y la app local. */
export const origenPermitido = (o: string) => o === 'https://app.lockumi.com' || /^https:\/\/lockumi-app-demo-[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(o)

export interface PedidoCorreo { tipo: 'aviso' | 'invitacion' | 'consentimiento' | 'reputacion'; para: string; /** Solo en tipo 'consentimiento': casilla marcada (true) o desmarcada (false). */ acepta?: boolean; /** Paso 11: la casilla «Acepto que Lockumi me envíe avisos por correo» marcada en el momento de uso. */ consentimiento?: boolean; alquiler: string; plantilla?: Plantilla; datos?: DatosAviso; rol?: 'dueno' | 'inquilino'; nombre?: string; /** paso21: token del link de invitación (64 hex). El botón del correo abre ESA invitación (#/invitacion/<alquiler>/<token>). */ token?: string
  /** Solo en tipo 'reputacion' (paso 19, REP-12): qué aviso, las líneas públicas del puntaje y la fecha de cierre. */ aviso?: 'cambio' | 'vencido'; antes?: string; despues?: string; fechaMs?: number }

// Todos los textos de los correos viven en api/_lib/textos-correos.ts (lista en docs/correos-c.md).
import { PIE, PIE_BAJA, RECLAMO_CON_REGLA, RECLAMO_SIN_REGLA, NOTA_CONFIRMAR, NOTA_UN_BOTON, textoInvitacion, ASUNTO_INVITACION, BOTON_INVITACION, DEMO } from './textos-correos.js'
export { PIE, PIE_BAJA, RECLAMO_CON_REGLA, RECLAMO_SIN_REGLA, NOTA_CONFIRMAR, NOTA_UN_BOTON, textoInvitacion }

// Consentimiento (Legal 24/10, 11:51 p. m.): el servidor guarda la casilla MARCADA, no la baja, y sin consentimiento guardado no envía
// ningún aviso. Marcar la casilla lo guarda; desmarcarla lo borra. Hoy vive en memoria por instancia (la red de prueba no tiene base
// de datos): si la instancia se reinicia, no se envía nada hasta volver a marcar la casilla. Antes del paso 16 pasa a Supabase.
const consentimientos = new Set<string>()
const claveConsentimiento = (para: string, alquiler: string) => `${para.trim().toLowerCase()}|${alquiler}`
export function registrarConsentimiento(p: { tipo?: string; para?: unknown; alquiler?: unknown; acepta?: unknown }) {
  exigir(p && p.tipo === 'consentimiento' && typeof p.para === 'string' && EMAIL.test(p.para.trim()) && typeof p.alquiler === 'string' && ID.test(p.alquiler) && typeof p.acepta === 'boolean',
    400, 'No pudimos guardar la casilla: revisa el correo (nombre@correo.com) y vuelve a marcarla.')
  const k = claveConsentimiento(p.para as string, p.alquiler as string)
  if (p.acepta) consentimientos.add(k); else consentimientos.delete(k)
  return { consentimiento: p.acepta as boolean }
}
export const tieneConsentimiento = (para: string, alquiler: string) => consentimientos.has(claveConsentimiento(para, alquiler))
/** Solo para pruebas: simula un reinicio del servidor (memoria vacía). */
export const olvidarConsentimientos = () => consentimientos.clear()

// paso16-unido (Legal, 25/10, arreglo 5): un solo correo de invitación por alquiler, sin recordatorios. Con Supabase (clave de
// servicio) se registra en lk_correos_invitacion, que además exige la declaración de quien invita y que el correo sea el escrito
// en el alquiler. Sin Supabase, en memoria (y la clave de idempotencia de Resend es por alquiler).
const invitacionesEnviadas = new Set<string>()
export const olvidarInvitaciones = () => invitacionesEnviadas.clear()
const YA_INVITADO = 'Ya enviamos el correo de invitación de este alquiler. No enviamos recordatorios.'
async function registrarInvitacion(env: Record<string, string | undefined>, p: PedidoCorreo, f: typeof fetch) {
  const s = servicio(env)
  if (s) {
    let ok = false
    try { ok = await rpc<boolean>(s, 'lk_registrar_correo_invitacion', { p_contrato: p.alquiler, p_para: p.para }, f) } catch { throw new ErrorCorreo(502, 'No pudimos enviar el correo ahora. Comparte el enlace para unirse desde la app.') }
    exigir(ok, 409, YA_INVITADO); return
  }
  exigir(!invitacionesEnviadas.has(p.alquiler), 409, YA_INVITADO)
  invitacionesEnviadas.add(p.alquiler)
}
/** Si Resend no aceptó el correo (p. ej. cuota diaria agotada), la invitación NO cuenta como enviada: se borra el registro para que
 *  un nuevo intento pueda salir (26/10: el registro quedaba y la invitación se perdía para siempre). Sin cambios visibles. */
async function anularInvitacion(env: Record<string, string | undefined>, p: PedidoCorreo, f: typeof fetch) {
  invitacionesEnviadas.delete(p.alquiler)
  const s = servicio(env); if (!s) return
  try {
    await f(`${s.url}/rest/v1/lk_correos_invitacion?contrato_id=eq.${encodeURIComponent(p.alquiler)}`, { method: 'DELETE', headers: { apikey: s.llave, authorization: `Bearer ${s.llave}` } })
  } catch { /* sin conexión: queda registrado, como antes */ }
}

// Paso 19 · REP-12 por correo (decisión del 25/10, 2:57 p. m.; solo con VITE_CORREOS=1 en la app). Mismos textos que en la app
// (src/reputacion/textos.ts, AVISO_CAMBIO y AVISO_VENCIDO; una prueba revisa que sean iguales). Sin dirección del lugar: el alquiler va
// como «n.º» y los 8 primeros caracteres de su código (LEGAL: revisado, 25/10). Es un aviso que Legal exige (regla 8), así que no pide casilla
// (LEGAL: revisado, 25/10). Solo acepta las líneas públicas del puntaje, nunca texto libre.
export const REP12 = {
  cambio: { titulo: 'Tu puntaje cambió', texto: 'Tu puntaje pasó de {antes} a {después} por el cierre del alquiler {alquiler} el {fecha}.',
    nota: 'Si crees que hay un error, pide una revisión: mientras la revisamos, tu puntaje dice «En revisión».' },
  vencido: { titulo: 'Un hecho dejó de contar en tu puntaje', texto: 'Pasaron 10 años desde {hecho} y lo borramos de tu reputación. Tu puntaje ahora es {después}.' },
  porque: 'Ver por qué', revision: 'Pedir revisión',
}
const LINEA = /^(?:[0-5],\d de 5|En revisión|Nuevo en Lockumi · (?:1 alquiler cerrado|\d{1,3} alquileres cerrados))$/
const AVISO_REP = 'Aviso de puntaje inválido. El aviso sigue en la app; vuelve a abrirla para reintentarlo.'
const fechaCR = (ms: number) => new Date(ms).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })
const vars = (t: string, v: Record<string, string>) => t.replace(/\{([^}]+)\}/g, (_, k: string) => v[k] ?? '')
function validarReputacion(p: PedidoCorreo): PedidoCorreo {
  exigir(typeof p.para === 'string' && EMAIL.test(p.para.trim()), 400, 'Revisa el correo: tiene que ser como nombre@correo.com.')
  exigir(typeof p.alquiler === 'string' && ID.test(p.alquiler), 400, AVISO_REP)
  exigir((p.aviso === 'cambio' || p.aviso === 'vencido') && typeof p.despues === 'string' && LINEA.test(p.despues), 400, AVISO_REP)
  if (p.aviso === 'cambio') exigir(typeof p.antes === 'string' && LINEA.test(p.antes) && num(p.fechaMs, 4_102_444_800_000), 400, AVISO_REP)
  return { tipo: 'reputacion', para: p.para.trim(), alquiler: p.alquiler, aviso: p.aviso, despues: p.despues, ...(p.aviso === 'cambio' ? { antes: p.antes, fechaMs: p.fechaMs } : {}) }
}

// paso21: con Supabase (clave de servicio), el token del correo tiene que ser el link vigente de ese alquiler (se compara su huella
// con lk_contratos.invitacion_hash). Así el correo nunca lleva un link que no sirve. Sin Supabase, solo se revisa el formato.
const SIN_LINK = 'El link de esta invitación ya no sirve. Toca «Crear un link nuevo (el anterior deja de servir)» en el alquiler y compártelo.'
async function exigirTokenVigente(env: Record<string, string | undefined>, alquiler: string, token: string, f: typeof fetch) {
  const s = servicio(env); if (!s) return
  let hash: string | null | undefined
  try {
    const r = await f(`${s.url}/rest/v1/lk_contratos?id=eq.${encodeURIComponent(alquiler)}&select=invitacion_hash`, { headers: { apikey: s.llave, authorization: `Bearer ${s.llave}` } })
    if (!r.ok) throw new Error(String(r.status))
    hash = ((await r.json()) as { invitacion_hash: string | null }[])[0]?.invitacion_hash
  } catch { throw new ErrorCorreo(502, 'No pudimos enviar el correo ahora. Comparte el enlace para unirse desde la app.') }
  const huella = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2, '0')).join('')
  exigir(hash && hash === huella, 409, SIN_LINK)
}

const num = (n: unknown, max = 50_000) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max
/** Valida el pedido; devuelve el pedido limpio. */
export function validar(p: PedidoCorreo): PedidoCorreo {
  if (p?.tipo === 'reputacion') return validarReputacion(p)
  exigir(p && (p.tipo === 'aviso' || p.tipo === 'invitacion'), 400, 'Pedido de correo inválido.')
  exigir(p.consentimiento === true, 400, 'Marca la casilla «Acepto que Lockumi me envíe avisos por correo» para recibir los avisos. Sin ella, los avisos siguen solo en la app.')
  exigir(typeof p.para === 'string' && EMAIL.test(p.para.trim()), 400, 'Revisa el correo: tiene que ser como nombre@correo.com.')
  exigir(typeof p.alquiler === 'string' && ID.test(p.alquiler), 400, 'Alquiler inválido.')
  if (p.tipo === 'invitacion') {
    exigir(p.rol === 'dueno' || p.rol === 'inquilino', 400, 'Papel inválido.')
    exigir(typeof p.nombre === 'string' && NOMBRE.test(p.nombre.trim()), 400, 'El nombre visible solo puede tener letras y espacios (hasta 60).')
    exigir(p.token === undefined || (typeof p.token === 'string' && TOKEN_INV.test(p.token) && UUID.test(p.alquiler)), 400, 'El enlace de la invitación no es válido. Toca «Crear un link nuevo (el anterior deja de servir)» en el alquiler y vuelve a invitar.')
    return { tipo: 'invitacion', consentimiento: true, para: p.para.trim(), alquiler: p.alquiler, rol: p.rol, nombre: p.nombre!.trim(), ...(p.token && { token: p.token }) }
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
  if (p.tipo === 'reputacion') {
    const alquiler = `n.º ${p.alquiler.slice(0, 8)}`
    if (p.aviso === 'cambio') { asunto = REP12.cambio.titulo
      cuerpo = vars(REP12.cambio.texto, { antes: p.antes!, 'después': p.despues!, alquiler, fecha: fechaCR(p.fechaMs!) }) + ' ' + REP12.cambio.nota }
    else { asunto = REP12.vencido.titulo; cuerpo = vars(REP12.vencido.texto, { hecho: `el cierre del alquiler ${alquiler}`, 'después': p.despues! }) }
    botones = [{ texto: REP12.porque, url: `${origen}/#/perfil/calculo` }, { texto: REP12.revision, url: `${origen}/#/perfil/revision` }]
  } else if (p.tipo === 'invitacion') {
    asunto = ASUNTO_INVITACION
    cuerpo = textoInvitacion(p.nombre!, p.rol!); botones = [{ texto: BOTON_INVITACION, url: enlaceInvitacion(origen, p.alquiler, p.token) }]
  } else {
    // LEGAL: revisado (24/10) · LEGAL-correos-2104.md, punto 3: en el correo, «depósito» pasa a «depósito de prueba»
    const c = textoAviso(p.plantilla!, p.datos!), dp = (x: string) => x.replace(/depósito(?! de prueba)/g, 'depósito de prueba')
    // Reclamo (día 1): la frase final depende de lo registrado al firmar (Legal 24/10, 11:29 p. m.).
    const texto = p.plantilla === 'reclamo-1' ? c.texto.replace(segunRegla(!!p.datos!.regla), p.datos!.regla ? RECLAMO_CON_REGLA : RECLAMO_SIN_REGLA) : c.texto
    asunto = dp(c.asunto); cuerpo = dp(texto)
    botones = botonesAviso(p.plantilla!).map(b => ({ texto: b.texto, url: `${base}?aviso=${p.plantilla}&canal=correo${b.accion === 'confirmar-devolver' ? '&confirmar=devolver' : ''}` }))
  }
  // Paso 11: paleta del logo (#FF6B35, #E8531F, #FFB08A sobre crema #FFF5EE, texto café #3D2A22); nunca texto blanco sobre naranja.
  const demo = DEMO
  const nota = p.tipo !== 'aviso' ? '' : botonesAviso(p.plantilla!).some(b => b.accion === 'confirmar-devolver') ? NOTA_CONFIRMAR : NOTA_UN_BOTON
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#3D2A22;background:#FFF5EE;max-width:560px;margin:0 auto;padding:16px">
<p style="font-size:13px;color:#7A5446;margin:0 0 12px"><strong>${esc(demo)}</strong></p>
<h1 style="font-size:20px;margin:0 0 12px;color:#3D2A22">${esc(asunto)}</h1>
<p style="font-size:15px;line-height:1.5">${esc(cuerpo)}</p>
${botones.map(b => `<p><a href="${esc(b.url)}" style="display:inline-block;background:#FF6B35;color:#3D2A22;font-weight:bold;padding:10px 16px;border-radius:8px;border:1px solid #E8531F;text-decoration:none">${esc(b.texto)}</a></p>`).join('\n')}
${p.tipo === 'aviso' ? `<p style="font-size:13px;color:#7A5446">${esc(nota)}</p>\n<p style="font-size:13px;color:#3D2A22">${esc(PIE_BAJA)}</p>` : ''}
<hr style="border:none;border-top:1px solid #FFB08A;margin:20px 0"><p style="font-size:12px;color:#7A5446;line-height:1.5">${esc(PIE)} <a href="${esc(origen)}/privacidad" style="color:#E8531F">Privacidad</a></p></body></html>`
  const texto = `${demo}\n\n${asunto}\n\n${cuerpo}\n\n${botones.map(b => `${b.texto}: ${b.url}`).join('\n')}\n\n${p.tipo === 'aviso' ? nota + '\n\n' + PIE_BAJA + '\n\n' : ''}${PIE} Privacidad: ${origen}/privacidad`
  return { asunto, html, texto }
}

// Límite simple en memoria por instancia (la vista previa además está protegida por Vercel).
const usos = new Map<string, number[]>()
export function limite(clave: string, max: number, ahora = Date.now()) {
  const v = (usos.get(clave) ?? []).filter(t => ahora - t < 3_600_000)
  exigir(v.length < max, 429, 'Enviamos muchos correos en poco tiempo. Espera una hora y vuelve a intentarlo; los avisos siguen en la app.')
  v.push(ahora); usos.set(clave, v)
}

export async function atenderCorreo(env: Record<string, string | undefined>, pedido: PedidoCorreo, origen: string, ip: string, f: typeof fetch = fetch): Promise<{ enviado: true; id?: string } | { consentimiento: boolean }> {
  exigir(origenPermitido(origen), 403, 'Los correos solo salen desde la vista previa de la prueba.')
  if (pedido?.tipo === 'consentimiento') return registrarConsentimiento(pedido)
  const p = validar(pedido)
  exigir(p.tipo !== 'aviso' || tieneConsentimiento(p.para, p.alquiler), 409, 'No tenemos guardada tu casilla de avisos por correo para este alquiler, así que no te enviamos nada. Si quieres recibirlos, marca otra vez la casilla en la app; los avisos siguen en la app.')
  const llave = env.RESEND_API_KEY?.trim()
  exigir(llave, 503, 'El correo no está configurado en este servidor. Los avisos siguen en la app.')
  limite('ip:' + ip, 40); limite('para:' + p.para.toLowerCase(), 15)
  if (p.tipo === 'invitacion' && p.token) await exigirTokenVigente(env, p.alquiler, p.token, f)
  if (p.tipo === 'invitacion') await registrarInvitacion(env, p, f)
  const c = armar(p, origen)
  const clave = p.tipo === 'invitacion' ? `inv:${p.alquiler}` : p.tipo === 'reputacion' ? `rep:${p.para.toLowerCase()}:${p.aviso}:${p.alquiler}:${p.despues}` : `aviso:${p.alquiler}:${p.plantilla}:${p.para}`
  const r = await f('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json', 'idempotency-key': clave.slice(0, 256) },
    // Apple con correo oculto: el aviso va al correo real guardado (20261026080000); la casilla y los límites siguen con el de la cuenta.
    body: JSON.stringify({ from: REMITENTE, to: [await correoAviso(servicio(env), p.para, f)], subject: c.asunto, html: c.html, text: c.texto }),
  })
  const j = await r.json().catch(() => ({})) as { id?: string; message?: string }
  if (!(r.ok && j.id)) {
    // Solo el estado y el nombre del error de Resend (p. ej. 429 daily_quota_exceeded): nunca la llave ni el correo de la persona.
    console.error('correo resend', p.tipo, r.status, (j as { name?: string }).name ?? '')
    if (p.tipo === 'invitacion') await anularInvitacion(env, p, f)
  }
  exigir(r.ok && j.id, 502, 'No pudimos enviar el correo ahora. El aviso está en la app; puedes volver a intentarlo en unos minutos.')
  return { enviado: true, id: j.id }
}
