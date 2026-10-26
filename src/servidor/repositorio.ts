// Repositorio compartido: lee los alquileres de Supabase (RLS: solo los míos), los mantiene al día con Realtime
// (postgres_changes) y con un sondeo cada 8 s como respaldo, y ejecuta las acciones por RPC.
// Fuentes: https://supabase.com/docs/reference/javascript/auth-signinanonymously
//          https://supabase.com/docs/guides/realtime/postgres-changes  (respeta RLS)
//          https://supabase.com/docs/reference/javascript/storage-from-createsignedurls
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Alquiler, Foto, Rol } from '../types'
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_FOTOS, VENTANA_SEGUNDOS, dosPersonas } from './config'
import { linkInvitacion } from './origen'
import { aAlquiler, mensajeServidor, type Filas } from './mapeo'
import type { Aceptacion } from './aceptaciones'
import { usarCuentaCon, salirCon, K_SESION } from './cuenta-sesion'

export class ErrorServidor extends Error {}
let cliente: Promise<SupabaseClient> | null = null
export const supabase = () => cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: K_SESION } }))

/** Sesión anónima por aparato: la identidad de Supabase que RLS usa (auth.uid()). Se vincula al alquiler al crearlo o aceptar la invitación. */
export async function sesion(): Promise<string> {
  if (cambio) await cambio.p
  const sb = await supabase()
  const { data } = await sb.auth.getSession()
  if (data.session) return data.session.user.id
  const r = await sb.auth.signInAnonymously(); if (r.error || !r.data.user) throw new ErrorServidor(mensajeServidor(r.error))
  return r.data.user.id
}
/** Token de la sesión de Supabase, para que /api/tw sepa quién llama. */
export async function tokenSesion(): Promise<string> {
  await sesion(); const { data } = await (await supabase()).auth.getSession()
  if (!data.session) throw new ErrorServidor('No hay sesión.'); return data.session.access_token
}
const rpc = async <T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> => {
  await sesion(); const { data, error } = await (await supabase()).rpc(fn, args)
  if (error) throw new ErrorServidor(mensajeServidor(error)); return data as T
}

// ── Caché y suscripción ──
let datos: Alquiler[] = []; let yo = ''; let cargado = false
const subs = new Set<() => void>(); const avisar = () => subs.forEach(f => f())
// Cuenta de esta sesión (cuenta-sesion.ts): al cambiar de cuenta o salir, la lista de la cuenta anterior se borra de inmediato.
let cambio: { c: string; p: Promise<boolean> } | null = null
const deps = { get storage() { return localStorage }, salir: async () => (await supabase()).auth.signOut() }
const vaciar = () => { datos = []; yo = ''; cargado = false; avisar() }
/** Llamar con el correo de la cuenta que entró (al entrar y al cargar la app). Si la sesión era de otra cuenta, la termina. */
export function usarCuenta(correo: string): Promise<boolean> {
  const c = correo.trim().toLowerCase()
  if (cambio?.c === c) return cambio.p
  const p = usarCuentaCon(c, deps).then(otra => { if (otra) { vaciar(); if (subs.size) void recargar().catch(() => { cargado = true; avisar() }) } return otra }).catch(() => false)
  cambio = { c, p }; return p
}
/** Al salir: termina la sesión anónima de esta cuenta y borra su lista. */
export async function salirDeCuenta() { cambio = null; await salirCon(deps).catch(() => {}); vaciar() }
const urls = new Map<string, string>()
const INV = 'lockumi.invitaciones'
const invitaciones = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(INV) || '{}') } catch { return {} } }
const guardarInvitacion = (id: string, t: string) => localStorage.setItem(INV, JSON.stringify({ ...invitaciones(), [id]: t }))
/** Eliminar un alquiler: borra su link de invitación guardado en este aparato y lo quita de la caché. */
export function olvidarInvitacion(id: string) { try { const m = invitaciones(); if (id in m) { delete m[id]; localStorage.setItem(INV, JSON.stringify(m)) } } catch { /* sin almacenamiento */ } datos = datos.filter(a => a.id !== id); avisar() }
export { linkInvitacion }

export async function recargar() {
  const sb = await supabase(); yo = await sesion()
  const { data: cs, error } = await sb.from('lk_contratos').select('id, direccion, monto, inicio, fin, reglas, email_inquilino, estado, ventana_inicio, ventana_segundos, escrow_contract_id, resultado, liquidacion_tx, creado_en, actualizado_en').order('creado_en', { ascending: false })
  if (error) throw new ErrorServidor(mensajeServidor(error))
  const ids = (cs ?? []).map(c => c.id); if (!ids.length) { datos = []; cargado = true; avisar(); return }
  const de = (t: string, cols: string) => sb.from(t).select('contrato_id, ' + cols).in('contrato_id', ids)
  const [ps, as, fs, fts, rs, es] = await Promise.all([
    de('lk_participantes', 'rol, usuario, email_cavos, direccion_stellar'), de('lk_actas', 'etapa, cuartos'), de('lk_firmas', 'etapa, rol, firmado_en'),
    de('lk_fotos', 'id, etapa, cuarto, por_rol, ruta, sha256, sha256_original, tomada_en, fecha_archivo, origen, posible_galeria, subido_en'),
    de('lk_reclamos', 'monto, motivo, creado_en, respuesta, respondido_en'), sb.from('lk_eventos').select('contrato_id, texto, tx_hash, creado_en').in('contrato_id', ids).order('id')])
  for (const r of [ps, as, fs, fts, rs, es]) if (r.error) throw new ErrorServidor(mensajeServidor(r.error))
  // Escenario C (20261025050000): versión de los Términos por alquiler. Sin la migración, la consulta falla y todo sigue como antes.
  const [tv, at, en] = dosPersonas ? await Promise.all([sb.from('lk_contratos').select('id, terminos_version').in('id', ids), de('lk_aceptaciones_terminos', 'rol, aceptado_en'),
    sb.from('lk_contratos').select('id, entregado_en').in('id', ids)]) : [] // 20261025060000: sin la migración, falla y no se usa
  const entregaDe = (id: string) => en && !en.error ? ((en.data ?? []) as { id: string; entregado_en: string | null }[]).find(x => x.id === id)?.entregado_en ?? null : null
  // Escenario C (20261025090000): mi casilla de avisos por correo, guardada en el servidor (RLS: solo la mía). Sin la migración, no se usa.
  const cc = dosPersonas ? await sb.from('lk_correos_consentimiento').select('contrato_id, rol, para').in('contrato_id', ids) : null
  const casillas = cc && !cc.error ? (cc.data ?? []) as { contrato_id: string; rol: Rol; para: string }[] : []
  // PROTOTIPO eliminar-alquiler (20261026010000, sin aplicar): los que oculté de MI lista. Sin la migración, falla y no se usa.
  const oc = dosPersonas ? await sb.from('lk_ocultos').select('contrato_id').in('contrato_id', ids) : null
  const ocultos = new Set(oc && !oc.error ? ((oc.data ?? []) as { contrato_id: string }[]).map(x => x.contrato_id) : [])
  const conTerminos = !!tv && !!at && !tv.error && !at.error
  const terminosDe = (id: string): Filas['terminos'] => conTerminos ? { version: ((tv.data ?? []) as { id: string; terminos_version: string | null }[]).find(x => x.id === id)?.terminos_version ?? null,
    aceptaciones: por(at, id) as unknown as NonNullable<Filas['terminos']>['aceptaciones'] } : null
  type Fila = Record<string, unknown> & { contrato_id: string }
  const por = (r: { data: unknown }, id: string) => ((r.data ?? []) as Fila[]).filter(x => x.contrato_id === id)
  const faltan = ((fts.data ?? []) as unknown as { ruta: string }[]).map(f => f.ruta).filter(r => !urls.has(r))
  if (faltan.length) {
    const { data } = await sb.storage.from(BUCKET_FOTOS).createSignedUrls(faltan, 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl)
  }
  const inv = invitaciones()
  datos = (cs ?? []).map(c => {
    const a = aAlquiler({ contrato: { ...c, entregado_en: entregaDe(c.id) } as Filas['contrato'], participantes: por(ps, c.id) as unknown as Filas['participantes'], actas: por(as, c.id) as unknown as Filas['actas'],
      firmas: por(fs, c.id) as unknown as Filas['firmas'], fotos: por(fts, c.id) as unknown as Filas['fotos'], reclamo: (por(rs, c.id)[0] ?? null) as unknown as Filas['reclamo'],
      eventos: por(es, c.id) as unknown as Filas['eventos'], terminos: terminosDe(c.id) }, yo, r => urls.get(r) ?? '')
    const mias = casillas.filter(x => x.contrato_id === c.id)
    if (mias.length) a.correos = Object.fromEntries(mias.map(x => [x.rol, x.para]))
    if (ocultos.has(a.id)) a.ocultoParaMi = true
    if (a.miRol === 'dueno' && !a.inquilinoUnido && inv[a.id]) a.invitacion = linkInvitacion(a.id, inv[a.id])
    return a
  })
  cargado = true; avisar()
}

let canal: RealtimeChannel | null = null; let sondeo: ReturnType<typeof setInterval> | null = null; let pendiente: ReturnType<typeof setTimeout> | null = null
const pronto = () => { if (pendiente) clearTimeout(pendiente); pendiente = setTimeout(() => { void recargar().catch(() => {}) }, 250) }
async function conectarTiempoReal() {
  const sb = await supabase(); await sesion()
  canal = sb.channel('lk-cambios')
  for (const t of ['lk_contratos', 'lk_participantes', 'lk_actas', 'lk_firmas', 'lk_fotos', 'lk_reclamos', 'lk_eventos'])
    canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, pronto)
  canal.subscribe()
  sondeo = setInterval(() => { if (document.visibilityState === 'visible') pronto() }, 8000)
}
export const repositorio = {
  todos: () => datos,
  obtener: (id: string) => datos.find(a => a.id === id),
  cargado: () => cargado,
  subscribe(f: () => void) {
    subs.add(f)
    if (subs.size === 1) { void recargar().catch(() => { cargado = true; avisar() }); void conectarTiempoReal().catch(() => {}) }
    return () => { subs.delete(f); if (!subs.size) { void canal?.unsubscribe(); canal = null; if (sondeo) clearInterval(sondeo) } }
  },
}

// ── Fotos: se sube la versión reducida al bucket privado y se registra con su huella y hora ──
const sha256 = async (b: Blob) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()))].map(x => x.toString(16).padStart(2, '0')).join('')
async function subirFoto(id: string, etapa: 'entrada' | 'salida' | 'reclamo', cuarto: number | null, f: Foto) {
  const blob = await (await fetch(f.src)).blob()
  const ruta = `${id}/${etapa}/${crypto.randomUUID()}.jpg`
  const sb = await supabase()
  const { error } = await sb.storage.from(BUCKET_FOTOS).upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new ErrorServidor('No pudimos subir la foto. Revisa tu conexión e intenta de nuevo.')
  urls.set(ruta, f.src)
  await rpc('lk_registrar_foto', { p_contrato: id, p_etapa: etapa, p_cuarto: cuarto, p_ruta: ruta, p_sha256: await sha256(blob), p_tomada_en: new Date(f.tomadaEn ?? Date.now()).toISOString(),
    p_fecha_archivo: f.fechaArchivo ? new Date(f.fechaArchivo).toISOString() : null, p_origen: f.origen === 'archivo' ? 'archivo' : 'camara', p_posible_galeria: Boolean(f.posibleGaleria), p_sha256_original: f.huella ?? null })
}

const tras = async <T>(p: Promise<T>) => { const r = await p; await recargar(); return r }
/** Escenario C (docs/correos-c.md): después de un paso, se le pide al servidor que envíe los correos que tocan de ESE alquiler.
 *  El navegador no elige textos ni destinatarios; si el servidor tiene los correos apagados, no pasa nada. Nunca frena la app. */
// Después de cada paso: el servidor revisa el plazo de la mediación (siempre, Legal 25/10 punto 3) y, solo con CORREOS_C=1, envía los correos.
export function avisarCorreos(id: string) {
  if (!dosPersonas) return
  void tokenSesion().then(t => fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ tipo: 'avisos', alquiler: id }) })).catch(() => {})
}
const yAvisar = async <T>(id: string, p: Promise<T>) => { const r = await tras(p); avisarCorreos(id); return r }
export const servidor = {
  async crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string; declaracion?: string; terminosVersion?: string }, email: string, cuenta?: string) {
    // paso16-unido: al invitar, el servidor guarda la declaración (quién, cuándo y el texto) en la misma transacción.
    const r = await rpc<{ id: string; token: string }>(d.declaracion ? (d.terminosVersion ? 'lk_crear_contrato_con_terminos' : 'lk_crear_contrato_invitando') : 'lk_crear_contrato', { p_direccion: d.direccion, p_monto: d.monto, p_inicio: d.inicio, p_fin: d.fin, p_reglas: d.reglas,
      p_email_inquilino: d.inquilinoEmail, p_email_cavos: email, p_direccion_stellar: cuenta ?? null, p_ventana_segundos: VENTANA_SEGUNDOS, ...(d.declaracion && { p_declaracion: d.declaracion }), ...(d.declaracion && d.terminosVersion && { p_terminos_version: d.terminosVersion }) })
    guardarInvitacion(r.id, r.token); await recargar(); return { id: r.id, link: linkInvitacion(r.id, r.token) }
  },
  async nuevaInvitacion(id: string) { const t = await rpc<string>('lk_nueva_invitacion', { p_contrato: id }); guardarInvitacion(id, t); await recargar(); return linkInvitacion(id, t) },
  verInvitacion: (id: string, token: string) => rpc<{ direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; email_inquilino: string; email_dueno: string; es_dueno?: boolean }>('lk_ver_invitacion', { p_contrato: id, p_token: token }),
  /** Escenario C: con `terminosVersion`, el inquilino se une aceptando esa versión de los Términos y el Aviso de privacidad (queda quién y cuándo). */
  aceptarInvitacion: (id: string, token: string, email: string, cuenta?: string, terminosVersion?: string) => tras(terminosVersion
    ? rpc('lk_aceptar_invitacion_con_terminos', { p_contrato: id, p_token: token, p_email_cavos: email, p_terminos_version: terminosVersion, p_direccion_stellar: cuenta ?? null })
    : rpc('lk_aceptar_invitacion', { p_contrato: id, p_token: token, p_email_cavos: email, p_direccion_stellar: cuenta ?? null })),
  // Paso 19 · reputación por la persona (Legal, 25/10/2026): el correo es el de la sesión de Cavos (el mismo que p_email_cavos).
  aceptarReputacion: (email: string, version: string, texto: string[]) => rpc<boolean>('lk_aceptar_reputacion', { p_correo: email, p_version: version, p_texto: texto }),
  // Ronda 25/10, 4:22–4:23 p. m.: límite 5 (eliminar en el servidor), límite 4 (REP-01 por el correo) y límite 1 (correo verificado).
  // Segundo factor (Legal 25/10, 5:04 p. m.): «Eliminar mi cuenta» y «Descargar mis datos» ya no llaman a lk_pedir_borrado_cuenta ni a
  // lk_mis_datos_reputacion directo: van por /api/codigo-correo, que manda el código al correo y, con el código correcto, hace la acción.
  async codigoCorreo(cuerpo: { paso: 'pedir' | 'confirmar'; accion: 'eliminar' | 'descargar' | 'verificar_correo' | 'invitacion' | 'correo_real'; codigo?: string; correo?: string; rol?: 'dueno' | 'inquilino'
    contrato?: string; token?: string; terminos_version?: string; direccion?: string }) {
    const r = await fetch('/api/codigo-correo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await tokenSesion()}` },
      body: JSON.stringify(cuerpo) })
    return { ok: r.ok, estado: r.status, cuerpo: await r.json().catch(() => ({})) as Record<string, unknown> }
  },
  /** Apple con correo oculto: ¿esta cuenta ya guardó su correo real para avisos? (20261026080000; no devuelve correos) */
  tengoCorreoReal: () => rpc<boolean>('lk_tengo_correo_real', {}),
  necesitaRep01: (email: string) => rpc<boolean>('lk_necesita_rep01', { p_correo: email }),
  /** Manda el token que el kit de Cavos ya guarda (getAuthToken(); el login no cambia) a /api/verificar-correo con la sesión de Supabase.
   *  codigo: true (403, Legal 25/10 9:00 p. m.) = token de correo con aud «cavos-email»: el correo queda por confirmar con el código de
   *  6 números que Lockumi mandó (motivo: 'minuto' | 'hora' | 'envio' si no salió uno nuevo). */
  async verificarCorreo(tokenCavos: string): Promise<{ correo: string; codigo?: boolean; motivo?: string; vinculados?: number }> {
    const r = await fetch('/api/verificar-correo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await tokenSesion()}` },
      body: JSON.stringify({ token: tokenCavos }) })
    const j = await r.json().catch(() => ({})) as { correo?: string; error?: string; codigo?: boolean; motivo?: string; vinculados?: number }
    if (j.codigo === true && j.correo) return { correo: j.correo, codigo: true, ...(typeof j.motivo === 'string' && { motivo: j.motivo }) }   // 403: falta el código
    if (!r.ok || !j.correo) throw new ErrorServidor(j.error ?? 'No pudimos confirmar el correo de tu cuenta.')
    // El servidor trajo a esta sesión los alquileres de este correo (otro navegador o dispositivo): se cargan sin aviso.
    if (typeof j.vinculados === 'number' && j.vinculados > 0) { await recargar().catch(() => {}); return { correo: j.correo, vinculados: j.vinculados } }
    return { correo: j.correo }
  },
  actualizarCuenta: (id: string, cuenta: string) => tras(rpc('lk_actualizar_direccion', { p_contrato: id, p_direccion_stellar: cuenta })),
  firmar: (id: string, etapa: 'contrato' | 'entrada' | 'salida') => tras(rpc<string>('lk_firmar', { p_contrato: id, p_etapa: etapa })),
  marcar: (id: string, etapa: 'entrada' | 'salida', cuarto: number, item: number, estado: 'bien' | 'detalle') => tras(rpc('lk_editar_item', { p_contrato: id, p_etapa: etapa, p_cuarto: cuarto, p_item: item, p_estado: estado })),
  nota: (id: string, etapa: 'entrada' | 'salida', cuarto: number, nota: string) => tras(rpc('lk_editar_item', { p_contrato: id, p_etapa: etapa, p_cuarto: cuarto, p_item: null, p_estado: null, p_nota: nota })),
  agregarFoto: (id: string, etapa: 'entrada' | 'salida' | 'reclamo', cuarto: number | null, f: Foto) => tras(subirFoto(id, etapa, cuarto, f)),
  registrarEscrow: (id: string, contractId: string, tx: string) => tras(rpc('lk_registrar_escrow', { p_contrato: id, p_contract_id: contractId, p_tx: tx })),
  registrarPago: (id: string, tx: string | null) => tras(rpc('lk_registrar_pago', { p_contrato: id, p_tx: tx })),
  iniciarSalida: (id: string) => tras(rpc('lk_iniciar_salida', { p_contrato: id })),
  async reclamar(id: string, monto: number, motivo: string, fotos: Foto[]) {
    for (const f of fotos) await subirFoto(id, 'reclamo', null, f)
    return yAvisar(id, rpc('lk_reclamar', { p_contrato: id, p_monto: monto, p_motivo: motivo }))
  },
  responder: (id: string, acepta: boolean) => yAvisar(id, rpc('lk_responder_reclamo', { p_contrato: id, p_acepta: acepta })),
  cerrarSinReclamo: (id: string) => tras(rpc<boolean>('lk_cerrar_sin_reclamo', { p_contrato: id })),
  decidir: (id: string, montoDueno: number, motivo?: string) => yAvisar(id, rpc('lk_decidir_mediacion', { p_contrato: id, p_monto_dueno: montoDueno, p_motivo: motivo ?? null })),
  // B2 (escenario C): cada parte acepta un reparto; lk_decidir_mediacion solo cierra con las dos aceptaciones del mismo monto.
  aceptarAcuerdo: (id: string, montoDueno: number) => tras(rpc('lk_aceptar_acuerdo_mediacion', { p_contrato: id, p_monto_dueno: montoDueno })),
  /** 6.5 b: el inquilino abrió el aviso o la pantalla del reclamo (solo cuenta la primera vez). */
  abrirAvisoReclamo: (id: string) => tras(rpc('lk_abrir_aviso_reclamo', { p_contrato: id })),
  // 20261025060000 (C): «Recibí la casa» empieza el plazo del dueño en el servidor (art. 148 del Código de Trabajo para los feriados).
  recibirCasa: (id: string) => yAvisar(id, rpc('lk_recibi_casa', { p_contrato: id })),
  /** 6.5 c: vencido el plazo del inquilino sin respuesta, el servidor pasa el caso a la mediación (en dos personas la 6.5.1 no se aplica sola). */
  aplicarSilencio: (id: string) => yAvisar(id, rpc<'mediacion' | null>('lk_aplicar_silencio', { p_contrato: id })),
  /** PR #22: lo que aceptó cada parte en la mediación (RLS: solo los participantes del alquiler). */
  async aceptaciones(id: string): Promise<Aceptacion[]> {
    await sesion(); const { data, error } = await (await supabase()).from('lk_aceptaciones_mediacion').select('rol, monto_dueno, aceptado_en').eq('contrato_id', id)
    if (error) throw new ErrorServidor(mensajeServidor(error))
    return ((data ?? []) as { rol: Rol; monto_dueno: string | number; aceptado_en: string }[]).map(f => ({ rol: f.rol, montoDueno: Number(f.monto_dueno), fecha: f.aceptado_en }))
  },
  esMediador: () => rpc<boolean>('lk_es_mediador', {}),
  /** Escenario C: la casilla «Acepto que Lockumi me envíe avisos por correo» se guarda en el servidor (quién, cuándo y el texto).
   *  Desmarcarla la borra y el servidor deja de enviar. El papel sale de la sesión, no del navegador. */
  guardarCasillaCorreo: (id: string, para: string, acepta: boolean, texto: string) => yAvisar(id, rpc('lk_guardar_consentimiento_correo', { p_contrato: id, p_para: para, p_acepta: acepta, p_texto: texto })),
  // PROTOTIPO eliminar-alquiler: el servidor revisa las reglas (dueño, sin la otra persona, sin depósito) y solo toca filas propias.
  eliminarAlquiler: (id: string) => tras(rpc('lk_eliminar_alquiler', { p_contrato: id })),
  /** 26/10: con la otra persona ya unida o con la cuenta segura creada, el servidor lee el saldo en la red y elimina solo si es 0. */
  async eliminarSinDeposito(id: string) {
    const r = await fetch('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await tokenSesion() }, body: JSON.stringify({ accion: 'eliminar', contrato: id }) })
    const j = await r.json().catch(() => ({})) as { error?: string }
    if (!r.ok) throw new ErrorServidor(j.error ?? 'No pudimos eliminarlo.')
    await recargar()
  },
  ocultarAlquiler: (id: string, ocultar: boolean) => tras(rpc('lk_ocultar_alquiler', { p_contrato: id, p_ocultar: ocultar })),
  reiniciarMiDemo: () => tras(rpc<{ eliminados: number; ocultos: number; quedan: number; ids?: string[] }>('lk_reiniciar_mi_demo', {})),
  registrarLiquidacion: (id: string, tx: string) => yAvisar(id, rpc('lk_registrar_liquidacion', { p_contrato: id, p_tx: tx })),
}
export type Servidor = typeof servidor
export type { Rol }
