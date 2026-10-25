// Repositorio compartido: lee los alquileres de Supabase (RLS: solo los míos), los mantiene al día con Realtime
// (postgres_changes) y con un sondeo cada 8 s como respaldo, y ejecuta las acciones por RPC.
// Fuentes: https://supabase.com/docs/reference/javascript/auth-signinanonymously
//          https://supabase.com/docs/guides/realtime/postgres-changes  (respeta RLS)
//          https://supabase.com/docs/reference/javascript/storage-from-createsignedurls
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Alquiler, Foto, Rol } from '../types'
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_FOTOS, VENTANA_SEGUNDOS } from './config'
import { aAlquiler, mensajeServidor, type Filas } from './mapeo'

export class ErrorServidor extends Error {}
let cliente: Promise<SupabaseClient> | null = null
export const supabase = () => cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'lockumi.sesion-servidor' } }))

/** Sesión anónima por aparato: la identidad de Supabase que RLS usa (auth.uid()). Se vincula al alquiler al crearlo o aceptar la invitación. */
export async function sesion(): Promise<string> {
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
const urls = new Map<string, string>()
const INV = 'lockumi.invitaciones'
const invitaciones = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(INV) || '{}') } catch { return {} } }
const guardarInvitacion = (id: string, t: string) => localStorage.setItem(INV, JSON.stringify({ ...invitaciones(), [id]: t }))
export const linkInvitacion = (id: string, token: string) => `${location.origin}/#/invitacion/${id}/${token}`

export async function recargar() {
  const sb = await supabase(); yo = await sesion()
  const { data: cs, error } = await sb.from('lk_contratos').select('id, direccion, monto, inicio, fin, reglas, email_inquilino, estado, ventana_inicio, ventana_segundos, escrow_contract_id, resultado, liquidacion_tx, creado_en, actualizado_en').order('creado_en', { ascending: false })
  if (error) throw new ErrorServidor(mensajeServidor(error))
  const ids = (cs ?? []).map(c => c.id); if (!ids.length) { datos = []; cargado = true; avisar(); return }
  const de = (t: string, cols: string) => sb.from(t).select('contrato_id, ' + cols).in('contrato_id', ids)
  const [ps, as, fs, fts, rs, es] = await Promise.all([
    de('lk_participantes', 'rol, usuario, email_cavos, direccion_stellar'), de('lk_actas', 'etapa, cuartos'), de('lk_firmas', 'etapa, rol, firmado_en'),
    de('lk_fotos', 'id, etapa, cuarto, por_rol, ruta, sha256, sha256_original, tomada_en, fecha_archivo, origen, posible_galeria, subido_en'),
    de('lk_reclamos', 'monto, motivo, creado_en, respuesta'), sb.from('lk_eventos').select('contrato_id, texto, tx_hash, creado_en').in('contrato_id', ids).order('id')])
  for (const r of [ps, as, fs, fts, rs, es]) if (r.error) throw new ErrorServidor(mensajeServidor(r.error))
  type Fila = Record<string, unknown> & { contrato_id: string }
  const por = (r: { data: unknown }, id: string) => ((r.data ?? []) as Fila[]).filter(x => x.contrato_id === id)
  const faltan = ((fts.data ?? []) as unknown as { ruta: string }[]).map(f => f.ruta).filter(r => !urls.has(r))
  if (faltan.length) {
    const { data } = await sb.storage.from(BUCKET_FOTOS).createSignedUrls(faltan, 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl)
  }
  const inv = invitaciones()
  datos = (cs ?? []).map(c => {
    const a = aAlquiler({ contrato: c as Filas['contrato'], participantes: por(ps, c.id) as unknown as Filas['participantes'], actas: por(as, c.id) as unknown as Filas['actas'],
      firmas: por(fs, c.id) as unknown as Filas['firmas'], fotos: por(fts, c.id) as unknown as Filas['fotos'], reclamo: (por(rs, c.id)[0] ?? null) as unknown as Filas['reclamo'],
      eventos: por(es, c.id) as unknown as Filas['eventos'] }, yo, r => urls.get(r) ?? '')
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
export const servidor = {
  async crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string; declaracion?: string }, email: string, cuenta?: string) {
    // paso16-unido: al invitar, el servidor guarda la declaración (quién, cuándo y el texto) en la misma transacción.
    const r = await rpc<{ id: string; token: string }>(d.declaracion ? 'lk_crear_contrato_invitando' : 'lk_crear_contrato', { p_direccion: d.direccion, p_monto: d.monto, p_inicio: d.inicio, p_fin: d.fin, p_reglas: d.reglas,
      p_email_inquilino: d.inquilinoEmail, p_email_cavos: email, p_direccion_stellar: cuenta ?? null, p_ventana_segundos: VENTANA_SEGUNDOS, ...(d.declaracion && { p_declaracion: d.declaracion }) })
    guardarInvitacion(r.id, r.token); await recargar(); return { id: r.id, link: linkInvitacion(r.id, r.token) }
  },
  async nuevaInvitacion(id: string) { const t = await rpc<string>('lk_nueva_invitacion', { p_contrato: id }); guardarInvitacion(id, t); await recargar(); return linkInvitacion(id, t) },
  verInvitacion: (id: string, token: string) => rpc<{ direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; email_inquilino: string; email_dueno: string }>('lk_ver_invitacion', { p_contrato: id, p_token: token }),
  aceptarInvitacion: (id: string, token: string, email: string, cuenta?: string) => tras(rpc('lk_aceptar_invitacion', { p_contrato: id, p_token: token, p_email_cavos: email, p_direccion_stellar: cuenta ?? null })),
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
    return tras(rpc('lk_reclamar', { p_contrato: id, p_monto: monto, p_motivo: motivo }))
  },
  responder: (id: string, acepta: boolean) => tras(rpc('lk_responder_reclamo', { p_contrato: id, p_acepta: acepta })),
  cerrarSinReclamo: (id: string) => tras(rpc<boolean>('lk_cerrar_sin_reclamo', { p_contrato: id })),
  decidir: (id: string, montoDueno: number, motivo?: string) => tras(rpc('lk_decidir_mediacion', { p_contrato: id, p_monto_dueno: montoDueno, p_motivo: motivo ?? null })),
  esMediador: () => rpc<boolean>('lk_es_mediador', {}),
  registrarLiquidacion: (id: string, tx: string) => tras(rpc('lk_registrar_liquidacion', { p_contrato: id, p_tx: tx })),
}
export type Servidor = typeof servidor
export type { Rol }
