// Núcleo del proxy de Trustless Work (solo servidor). La llave TRUSTLESS_WORK_API_KEY y las claves de las cuentas de la
// plataforma viven aquí y nunca llegan al navegador. Solo Stellar TESTNET.
// Fuentes (API REST v1): https://docs.trustlesswork.com/trustless-work/api-rest/introduction
//   deploy   https://docs.trustlesswork.com/trustless-work/api-rest/deploy/initialize-escrow
//   payload  https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/types/payloads/deploy
//   fund     https://docs.trustlesswork.com/trustless-work/api-rest/deploy/fund-escrow
//   release  https://docs.trustlesswork.com/trustless-work/api-rest/deploy/release-funds
//   send     https://docs.trustlesswork.com/trustless-work/api-rest/helpers/send-transaction
//   esquemas https://dev.api.trustlesswork.com/docs  (approve-milestone, change-milestone-status)
import { Keypair, Networks, TransactionBuilder, FeeBumpTransaction, type Transaction } from '@stellar/stellar-sdk'

export type Entorno = Record<string, string | undefined>
export class ErrorTw extends Error { estado: number; constructor(estado: number, m: string) { super(m); this.estado = estado } }
const G = /^G[A-Z2-7]{55}$/, C = /^C[A-Z2-7]{55}$/
export const USDC_TESTNET = { emisor: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', contrato: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA' }

export function configuracion(e: Entorno) {
  const base = (e.TRUSTLESS_WORK_BASE_URL || 'https://dev.api.trustlesswork.com').replace(/\/$/, '')
  if (base !== 'https://dev.api.trustlesswork.com') throw new ErrorTw(500, 'Este proxy solo trabaja con la API de testnet de Trustless Work.')
  const falta = ['TRUSTLESS_WORK_API_KEY', 'LOCKUMI_TW_PLATAFORMA_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !e[k]?.trim())
  if (falta.length) throw new ErrorTw(503, 'Falta configurar en el servidor: ' + falta.join(', '))
  const plataforma = Keypair.fromSecret(e.LOCKUMI_TW_PLATAFORMA_SECRET!.trim())
  // Mediador (disputeResolver): por defecto la misma cuenta de la plataforma. TW v1 lo acepta (probado en testnet el 16/10/2026).
  const mediador = e.LOCKUMI_TW_MEDIADOR_PUBLICA?.trim() || plataforma.publicKey()
  if (!G.test(mediador)) throw new ErrorTw(500, 'LOCKUMI_TW_MEDIADOR_PUBLICA no es una cuenta G válida.')
  // Paso 7 (opción 1): la cuenta que resuelve disputas firma solo la devolución automática del 100 % al inquilino. Su llave vive
  // solo en el servidor (LOCKUMI_TW_MEDIADOR_SECRET) y tiene que ser la de LOCKUMI_TW_MEDIADOR_PUBLICA.
  const sm = e.LOCKUMI_TW_MEDIADOR_SECRET?.trim()
  const mediadorFirma = sm ? Keypair.fromSecret(sm) : null
  if (mediadorFirma && mediadorFirma.publicKey() !== mediador) throw new ErrorTw(500, 'La llave de la cuenta que resuelve disputas no coincide con LOCKUMI_TW_MEDIADOR_PUBLICA.')
  // TW espera el EMISOR del activo (G…); con el contrato C… responde "Issuer is invalid" (probado en testnet).
  const trustline = (e.TRUSTLESS_WORK_TRUSTLINE || USDC_TESTNET.emisor).trim()
  return { base, llave: e.TRUSTLESS_WORK_API_KEY!.trim(), plataforma, mediador, mediadorFirma, trustline,
    supa: { url: e.SUPABASE_URL!.replace(/\/$/, ''), anon: e.SUPABASE_ANON_KEY!, servicio: e.SUPABASE_SERVICE_ROLE_KEY! } }
}
type Config = ReturnType<typeof configuracion>

/** PR #22 · condición (a) para encender C (encendido-lista.md): la llave mediadora es distinta de la de la plataforma P y está en
 *  otro secreto. Solo compara llaves PÚBLICAS y muestra sus últimos 4 caracteres: nunca devuelve ni imprime un secreto. */
export function revisarLlaves(e: Entorno) {
  const problemas: string[] = []
  const publica = (nombre: string) => {
    const s = e[nombre]?.trim(); if (!s) { problemas.push(`Falta ${nombre}.`); return null }
    try { return Keypair.fromSecret(s).publicKey() } catch { problemas.push(`${nombre} no es una llave válida.`); return null }
  }
  const p = publica('LOCKUMI_TW_PLATAFORMA_SECRET'), m = publica('LOCKUMI_TW_MEDIADOR_SECRET')
  const declarada = e.LOCKUMI_TW_MEDIADOR_PUBLICA?.trim()
  if (!declarada) problemas.push('Falta LOCKUMI_TW_MEDIADOR_PUBLICA.')
  const distintas = p && m ? p !== m : null
  if (distintas === false) problemas.push('La cuenta mediadora y la de la plataforma son la misma llave: tienen que ser distintas y estar en secretos separados.')
  const publicaCoincide = m && declarada ? m === declarada : null
  if (publicaCoincide === false) problemas.push('LOCKUMI_TW_MEDIADOR_PUBLICA no coincide con la llave mediadora.')
  const ult = (g: string | null) => g ? '…' + g.slice(-4) : null
  return { ok: problemas.length === 0, plataforma: ult(p), mediador: ult(m), distintas, publicaCoincide, problemas }
}
/** GET /api/tw?revisar=llaves (solo lectura): 200 si está lista, 409 si no; nunca un secreto. */
export function responderLlaves(e: Entorno, url: string): Response {
  // LEGAL: revisado (25/10, 4:56 a. m., Legal) · error 9 (no se ve en la app: solo operación)
  if (new URL(url).searchParams.get('revisar') !== 'llaves') return Response.json({ error: 'No encontrado.' }, { status: 404 })
  const r = revisarLlaves(e)
  return Response.json(r, { status: r.ok ? 200 : 409, headers: { 'cache-control': 'no-store' } })
}

// ── Trustless Work ──
async function tw<T = Record<string, unknown>>(c: Config, ruta: string, cuerpo: unknown, f = fetch): Promise<T> {
  const r = await f(c.base + ruta, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': c.llave }, body: JSON.stringify(cuerpo) })
  const t = await r.text(); let j: Record<string, unknown> = {}; try { j = JSON.parse(t) } catch { /* texto */ }
  if (!r.ok) throw new ErrorTw(r.status === 429 ? 429 : 502, `Trustless Work ${ruta} respondió ${r.status}: ${String(j.message ?? t).slice(0, 300)}`)
  return j as T
}
const sinFirmar = (j: Record<string, unknown>) => {
  const x = j.unsignedTransaction ?? j.unsignedXdr
  if (typeof x !== 'string') throw new ErrorTw(502, 'Trustless Work no devolvió la transacción sin firmar.'); return x
}
export const leerTx = (xdr: string): Transaction => {
  const t = TransactionBuilder.fromXDR(xdr, Networks.TESTNET)
  if (t instanceof FeeBumpTransaction) throw new ErrorTw(400, 'No se aceptan transacciones fee-bump.'); return t
}
export const hashTx = (xdr: string) => Array.from(leerTx(xdr).hash() as Uint8Array, b => b.toString(16).padStart(2, '0')).join('')
/** La plataforma solo firma transacciones de contrato cuyo origen es ella misma (lo que arma TW para el releaseSigner, etc.). */
export function firmarComoPlataforma(c: Config, xdr: string) {
  const t = leerTx(xdr)
  if (t.source !== c.plataforma.publicKey()) throw new ErrorTw(502, 'La transacción no es de la cuenta de la plataforma.')
  if (!t.operations.length || t.operations.some(o => o.type !== 'invokeHostFunction')) throw new ErrorTw(502, 'La plataforma solo firma llamadas a contratos.')
  t.sign(c.plataforma); return t.toXDR()
}
/** Paso 7: la cuenta que resuelve disputas solo firma llamadas a contratos que salen de ella (resolve-dispute que arma TW). */
export function firmarComoMediador(c: Config, xdr: string) {
  const t = leerTx(xdr)
  if (!c.mediadorFirma || t.source !== c.mediadorFirma.publicKey()) throw new ErrorTw(502, 'La transacción no es de la cuenta que resuelve disputas.')
  if (!t.operations.length || t.operations.some(o => o.type !== 'invokeHostFunction')) throw new ErrorTw(502, 'La cuenta que resuelve disputas solo firma llamadas a contratos.')
  t.sign(c.mediadorFirma); return t.toXDR()
}
const enviar = (c: Config, signedXdr: string, f = fetch) => tw(c, '/helper/send-transaction', { signedXdr }, f)

// ── Supabase (lectura con service role; la identidad sale del token de sesión del usuario) ──
export async function usuario(c: Config, bearer: string | null, f = fetch) {
  if (!bearer) throw new ErrorTw(401, 'Falta la sesión.')
  const r = await f(c.supa.url + '/auth/v1/user', { headers: { apikey: c.supa.anon, authorization: bearer } })
  if (!r.ok) throw new ErrorTw(401, 'La sesión no es válida.')
  return ((await r.json()) as { id: string }).id
}
type Part = { rol: 'dueno' | 'inquilino'; usuario: string; direccion_stellar: string | null }
export type Contrato = { id: string; estado: string; monto: number; direccion: string; escrow_contract_id: string | null; resultado: { via?: string; cierre?: string; dueno?: number; inquilino?: number } | null; liquidacion_tx: string | null; lk_participantes: Part[] }
const rest = (c: Config, ruta: string, init: RequestInit = {}, f = fetch) => f(`${c.supa.url}/rest/v1/${ruta}`, { ...init,
  headers: { apikey: c.supa.servicio, authorization: 'Bearer ' + c.supa.servicio, 'content-type': 'application/json', ...init.headers } })
export async function contrato(c: Config, id: string, f = fetch): Promise<Contrato> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ErrorTw(400, 'Contrato inválido.')
  const r = await rest(c, `lk_contratos?id=eq.${id}&select=id,estado,monto,direccion,escrow_contract_id,resultado,liquidacion_tx,lk_participantes(rol,usuario,direccion_stellar)`, {}, f)
  const [x] = r.ok ? await r.json() as Contrato[] : []
  if (!x) throw new ErrorTw(404, 'No encontramos el contrato.'); return x
}
async function anotar(c: Config, id: string, cambios: Record<string, unknown>, texto: string, tx: string | null, f = fetch) {
  if (Object.keys(cambios).length) {
    const r = await rest(c, `lk_contratos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }, f)
    if (!r.ok) throw new ErrorTw(500, 'No se pudo guardar en el servidor: ' + (await r.text()).slice(0, 200))
  }
  await rest(c, 'lk_eventos', { method: 'POST', body: JSON.stringify({ contrato_id: id, texto, tx_hash: tx }) }, f)
}
/** PR #22 · condición (b): cada firma de la llave mediadora queda en el historial con el hash de la transacción (el historial la
 *  enlaza a Stellar Expert testnet). Guarda primero el evento y después el hash en el contrato; si algo falla, avisa (el reintento
 *  no vuelve a firmar y agrega el evento que falte: asegurarEventoMediador). */
async function anotarMediador(c: Config, id: string, texto: string, tx: string, f = fetch) {
  const ev = await rest(c, 'lk_eventos', { method: 'POST', body: JSON.stringify({ contrato_id: id, texto, tx_hash: tx }) }, f)
  const k = await rest(c, `lk_contratos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ liquidacion_tx: tx }) }, f)
  if (!ev.ok || !k.ok) throw new ErrorTw(500, `El pago se hizo en la red de prueba (${tx}), pero no se pudo guardar en el historial. Vuelve a abrir el alquiler.`)
}
async function asegurarEventoMediador(c: Config, id: string, texto: string, tx: string, f = fetch) {
  const r = await rest(c, `lk_eventos?contrato_id=eq.${id}&tx_hash=eq.${tx}&select=texto`, {}, f)
  if (r.ok && ((await r.json().catch(() => [])) as unknown[]).length > 0) return
  const ev = await rest(c, 'lk_eventos', { method: 'POST', body: JSON.stringify({ contrato_id: id, texto, tx_hash: tx }) }, f)
  if (!ev.ok) throw new ErrorTw(500, `El pago ya se hizo en la red de prueba (${tx}), pero no se pudo guardar en el historial. Vuelve a abrir el alquiler.`)
}
const rolDe = (k: Contrato, uid: string) => k.lk_participantes.find(p => p.usuario === uid)?.rol ?? null
const cuenta = (k: Contrato, rol: Part['rol']) => {
  const g = k.lk_participantes.find(p => p.rol === rol)?.direccion_stellar
  if (!g || !G.test(g)) throw new ErrorTw(409, `Falta la cuenta Stellar del ${rol === 'dueno' ? 'dueño' : 'inquilino'}.`); return g
}
const exigir = (ok: boolean, estado: number, m: string) => { if (!ok) throw new ErrorTw(estado, m) }

// ── Privacidad on-chain (Ley 8968) ──
// Todo lo que va en el deploy queda público y permanente en Stellar. Solo textos fijos y un ID opaco:
// nunca la dirección del inmueble, nombres, correos ni teléfonos.
export const TEXTO_ONCHAIN = 'Depósito de alquiler Lockumi'
export const EVIDENCIA_ONCHAIN = 'Acta de salida firmada por ambas partes'
export const HITO_ONCHAIN = 'Entrega del inmueble sin daños: acta de salida firmada por ambas partes'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** engagementId = id del contrato (uuid aleatorio de gen_random_uuid() en la base; no se deriva de datos personales). */
export function datosOnChain(k: Pick<Contrato, 'id'>) {
  if (!UUID.test(k.id)) throw new ErrorTw(400, 'Contrato inválido.')
  return { engagementId: k.id.toLowerCase(), title: TEXTO_ONCHAIN, description: TEXTO_ONCHAIN, milestones: [{ description: HITO_ONCHAIN }] }
}
const CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/, TELEFONO = /(\+?\d[\d\s().-]{6,}\d)/
/** Última barrera: si algún texto que va a la cadena trae datos del alquiler o de las personas, no se despliega. */
export function sinDatosPersonales(textos: string[], k: Pick<Contrato, 'direccion'>) {
  const dir = (k.direccion ?? '').trim().toLowerCase()
  for (const t of textos) {
    const x = t.toLowerCase()
    if ((dir && x.includes(dir)) || CORREO.test(t) || TELEFONO.test(t)) throw new ErrorTw(500, 'Un texto para la cadena contiene datos personales; no se despliega.')
  }
}

export const APROBADO = 'El dueño aprobó en la cadena devolver el depósito completo'
// Legal 25/10 5:09 p. m. (punto 7): «de prueba» en los textos del historial
export const DEVUELTO_AUTO = 'Devolución automática: la cuenta que resuelve disputas entregó el 100 % del depósito de prueba al inquilino'
/** Paso 7 (Términos 1.7-demo 4.2 e): en la devolución automática el reparto es SIEMPRE el 100 % al inquilino. No recibe montos ni
 *  destinatarios, así que no se le puede pedir otro reparto. TW exige que la suma sea el saldo del escrow (Resolve Dispute). */
export function repartoAutomatico(k: Contrato): { address: string; amount: number }[] {
  return [{ address: cuenta(k, 'inquilino'), amount: Number(k.monto) }]
}
/** PR #22 · cierres de dos personas que se pagan con «repartir»: acuerdo (el inquilino aceptó) y mediación con las dos aceptaciones.
 *  Nunca la Regla 6.5.1 (Legal, 25/10, 1:50 a. m., opción 1) ni un caso abierto. */
export const REPARTO_DISPUTA = 'Se abrió la disputa en Trustless Work (red de prueba) para pagar el reparto aceptado'
/** El texto de antes (casos que abrieron la disputa antes del cambio): un reintento no vuelve a abrirla. */
const REPARTO_DISPUTA_ANTES = 'Se abrió la disputa en Trustless Work para pagar el reparto aceptado'
const centavos = (x: unknown) => Math.round(Number(x) * 100)
const dosDecimales = (x: unknown) => (Math.round(Number(x) * 100) / 100).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const textoReparto = (k: Contrato) => { const r = k.resultado!; return `Se pagó el reparto aceptado desde Trustless Work: ${dosDecimales(r.dueno)} USDC de prueba al dueño y ${dosDecimales(r.inquilino)} USDC de prueba al inquilino (cada monto menos el 0,3 % de comisión de Trustless Work).` }
function cierreAceptado(k: Contrato) {
  const r = k.resultado
  if (k.estado !== 'cerrado' || !r) return false
  if (!(r.via === 'acuerdo' || (r.via === 'mediacion' && r.cierre === 'dos_aceptan'))) return false
  const d = centavos(r.dueno), i = centavos(r.inquilino)
  return Number.isFinite(d) && Number.isFinite(i) && d >= 0 && i >= 0 && d + i === centavos(k.monto)
}
/** Reparto aceptado por las dos partes (sale de la base, nunca del navegador). Sin líneas en 0; la suma es todo el depósito. */
export function repartoAceptado(k: Contrato): { address: string; amount: number }[] {
  const r = k.resultado!
  return [{ address: cuenta(k, 'dueno'), amount: centavos(r.dueno) / 100 }, { address: cuenta(k, 'inquilino'), amount: centavos(r.inquilino) / 100 }].filter(x => x.amount > 0)
}
async function hayEvento(c: Config, id: string, texto: string, f = fetch) {
  const r = await rest(c, `lk_eventos?contrato_id=eq.${id}&texto=eq.${encodeURIComponent(texto)}&select=texto`, {}, f)
  return r.ok ? ((await r.json().catch(() => [])) as unknown[]).length > 0 : false
}
/** Bloqueo: solo un pedido a la vez toma el caso (liquidacion_tx vacío → 'en-curso'). */
async function tomar(c: Config, id: string, f = fetch) {
  const r = await rest(c, `lk_contratos?id=eq.${id}&liquidacion_tx=is.null`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ liquidacion_tx: EN_CURSO }) }, f)
  return r.ok && ((await r.json().catch(() => [])) as unknown[]).length === 1
}
const EN_CURSO = 'en-curso'
const soltar = (c: Config, id: string, f = fetch) => rest(c, `lk_contratos?id=eq.${id}&liquidacion_tx=eq.${EN_CURSO}`, { method: 'PATCH', body: JSON.stringify({ liquidacion_tx: null }) }, f)

async function aprobadoPorDueno(c: Config, id: string, f = fetch) {
  const r = await rest(c, `lk_eventos?contrato_id=eq.${id}&texto=eq.${encodeURIComponent(APROBADO)}&select=texto`, {}, f)
  return r.ok ? ((await r.json().catch(() => [])) as unknown[]).length > 0 : false
}

/** release-funds firmado por la plataforma (releaseSigner): el 100 % al inquilino (receiver), menos la comisión de Trustless Work. */
async function liberarTodo(c: Config, k: Contrato, f = fetch) {
  const j = await tw(c, '/escrow/single-release/release-funds', { contractId: k.escrow_contract_id, releaseSigner: c.plataforma.publicKey() }, f)
  const firmada = firmarComoPlataforma(c, sinFirmar(j)); await enviar(c, firmada, f)
  const tx = hashTx(firmada)
  await anotar(c, k.id, { liquidacion_tx: tx }, `Se liberó el depósito al inquilino desde Trustless Work (${k.monto} USDC de prueba menos la comisión de 0,3 % de Trustless Work)`, tx, f)
  return tx
}
/** lk_cerrar_aprobado (service_role): true si cerró el caso por la aprobación del dueño. */
async function cerrarAprobado(c: Config, id: string, f = fetch) {
  const r = await rest(c, 'rpc/lk_cerrar_aprobado', { method: 'POST', body: JSON.stringify({ p_contrato: id }) }, f)
  return r.ok && (await r.json().catch(() => false)) === true
}

// ── Acciones (permitidas y nada más) ──
export type Pedido =
  | { accion: 'desplegar'; contrato: string }
  | { accion: 'fondear'; contrato: string }
  | { accion: 'aprobar'; contrato: string }
  | { accion: 'enviar'; contrato: string; paso: 'fondear' | 'aprobar'; signedXdr: string }
  | { accion: 'liberar'; contrato: string }
  | { accion: 'devolver-automatico'; contrato: string }
  | { accion: 'repartir'; contrato: string }

export async function atender(e: Entorno, p: Pedido, bearer: string | null, f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const c = configuracion(e)
  const uid = await usuario(c, bearer, f)
  const k = await contrato(c, p.contrato, f)
  const rol = rolDe(k, uid); exigir(rol !== null, 403, 'No participas en este contrato.')
  const P = c.plataforma.publicKey()
  switch (p.accion) {
    case 'desplegar': {   // la plataforma despliega; los roles salen de la base, no del navegador
      exigir(k.estado === 'pendiente_pago', 409, 'El contrato no está esperando el depósito.')
      if (k.escrow_contract_id) return { contractId: k.escrow_contract_id, yaExistia: true }
      const inquilino = cuenta(k, 'inquilino'), dueno = cuenta(k, 'dueno')
      exigir(new Set([inquilino, dueno, P]).size === 3, 409, 'Las cuentas del dueño, el inquilino y la plataforma tienen que ser distintas.')
      // TW valida que approver, receiver y platformAddress existan y tengan trustline de USDC; si no, responde 400 con el motivo.
      const pub = datosOnChain(k)
      sinDatosPersonales([pub.title, pub.description, ...pub.milestones.map(m => m.description)], k)
      const j = await tw(c, '/deployer/single-release', {
        signer: P, ...pub,
        roles: { approver: dueno, serviceProvider: P, platformAddress: P, releaseSigner: P, disputeResolver: c.mediador, receiver: inquilino },
        amount: Number(k.monto), platformFee: 0,
        trustline: { address: c.trustline, symbol: 'USDC' },
      }, f)
      const firmada = firmarComoPlataforma(c, sinFirmar(j))
      const r = await enviar(c, firmada, f)
      const id = String(r.contractId ?? (r.escrow as { contractId?: string } | undefined)?.contractId ?? '')
      exigir(C.test(id), 502, 'Trustless Work no devolvió el contractId del escrow.')
      const tx = hashTx(firmada)
      await anotar(c, k.id, { escrow_contract_id: id }, 'Se creó la cuenta segura del depósito en Trustless Work', tx, f)
      return { contractId: id, tx }
    }
    case 'fondear': {     // XDR para que el inquilino la firme con su billetera de Cavos
      exigir(rol === 'inquilino', 403, 'Solo el inquilino paga el depósito.')
      exigir(k.estado === 'pendiente_pago' && !!k.escrow_contract_id, 409, 'Primero hay que crear la cuenta segura del depósito.')
      const j = await tw(c, '/escrow/single-release/fund-escrow', { contractId: k.escrow_contract_id, signer: cuenta(k, 'inquilino'), amount: Number(k.monto) }, f)
      return { unsignedXdr: sinFirmar(j) }
    }
    case 'aprobar': {     // la plataforma deja la evidencia (serviceProvider) y el dueño aprueba la devolución
      exigir(rol === 'dueno', 403, 'Solo el dueño aprueba la devolución.')
      exigir(k.estado === 'ventana_reclamo' && !!k.escrow_contract_id, 409, 'La devolución se aprueba durante el plazo de reclamo, después del acta de salida.')
      const cambio = await tw(c, '/escrow/single-release/change-milestone-status', { contractId: k.escrow_contract_id, milestoneIndex: '0',
        newStatus: 'Completed', newEvidence: EVIDENCIA_ONCHAIN, serviceProvider: P }, f)
      const tx = firmarComoPlataforma(c, sinFirmar(cambio)); await enviar(c, tx, f)
      const j = await tw(c, '/escrow/single-release/approve-milestone', { contractId: k.escrow_contract_id, milestoneIndex: '0', approver: cuenta(k, 'dueno') }, f)
      return { unsignedXdr: sinFirmar(j), evidenciaTx: hashTx(tx) }
    }
    case 'enviar': {      // solo reenvía transacciones del propio participante, del paso que le toca
      const quien = p.paso === 'fondear' ? 'inquilino' : 'dueno'
      exigir(rol === quien, 403, 'Esta firma no te corresponde.')
      const t = leerTx(p.signedXdr)
      exigir(t.source === cuenta(k, quien), 400, 'La transacción no sale de tu cuenta.')
      exigir(t.operations.length === 1 && t.operations[0].type === 'invokeHostFunction', 400, 'Transacción inesperada.')
      const r = await enviar(c, p.signedXdr, f), tx = hashTx(p.signedXdr)
      if (p.paso !== 'aprobar') return { tx, estado: r.status ?? null }
      await anotar(c, k.id, {}, APROBADO, tx, f)
      // PR #22 (lista de Legal, punto 5; Términos 6.5 a): «Todo bien, devolver» libera todo al inquilino ahora, no al final del
      // plazo. El servidor cierra el caso (lk_cerrar_aprobado: sin reclamo y con la aprobación anotada) y la plataforma
      // (releaseSigner) libera en el mismo pedido. Si la red falla, el caso queda cerrado y la app reintenta con «liberar».
      if (!(await cerrarAprobado(c, k.id, f))) return { tx, estado: r.status ?? null }
      try { return { tx, estado: r.status ?? null, liberacion: await liberarTodo(c, k, f) } }
      // LEGAL: revisado (25/10, 4:56 a. m., Legal) · error 8 (no se ve en la app: muestra «Volver a intentar la devolución»)
      catch { return { tx, estado: r.status ?? null, errorLiberacion: 'La aprobación quedó en la red de prueba, pero todavía no se pudo entregar el depósito. Vuelve a abrir el alquiler para reintentarlo.' } }
    }
    case 'liberar': {     // tras cerrar sin reclamo: la plataforma (releaseSigner) libera el 100 % al inquilino (receiver)
      // «devuelto»: el dueño aprobó en C y el servidor cerró al instante (lk_cerrar_aprobado); es el reintento si la red falló.
      exigir(k.estado === 'cerrado' && (k.resultado?.via === 'automatico' || k.resultado?.via === 'devuelto') && !!k.escrow_contract_id, 409, 'Solo se libera así un contrato cerrado sin reclamo.')
      if (k.liquidacion_tx) return { tx: k.liquidacion_tx, yaExistia: true }
      return { tx: await liberarTodo(c, k, f) }
    }
    case 'devolver-automatico': { // paso 7, opción 1: venció el plazo sin reclamo y sin aprobación del dueño
      exigir(k.estado === 'cerrado' && k.resultado?.via === 'automatico' && !!k.escrow_contract_id, 409, 'La devolución automática solo corre cuando vence el plazo del dueño sin reclamo.')
      if (k.liquidacion_tx) { await asegurarEventoMediador(c, k.id, DEVUELTO_AUTO, k.liquidacion_tx, f); return { tx: k.liquidacion_tx, yaExistia: true } }
      exigir(!(await aprobadoPorDueno(c, k.id, f)), 409, 'El dueño ya aprobó la devolución: se libera sin disputa. Vuelve a abrir el alquiler.')
      exigir(!!c.mediadorFirma, 503, 'Falta configurar en el servidor la cuenta que resuelve disputas. Escríbenos a business.applockumi@gmail.com.')
      // Trustless Work: quien resuelve no puede abrir la disputa (Dispute Escrow), así que tienen que ser cuentas distintas.
      exigir(c.mediador !== P, 409, 'La cuenta que resuelve disputas tiene que ser distinta de la de Lockumi que abre la disputa.')
      const reparto = repartoAutomatico(k)
      const d = await tw(c, '/escrow/single-release/dispute-escrow', { contractId: k.escrow_contract_id, signer: P }, f)
      const abierta = firmarComoPlataforma(c, sinFirmar(d)); await enviar(c, abierta, f)
      const j = await tw(c, '/escrow/single-release/resolve-dispute', { contractId: k.escrow_contract_id, disputeResolver: c.mediador, distributions: reparto }, f)
      const firmada = firmarComoMediador(c, sinFirmar(j)); await enviar(c, firmada, f)
      const tx = hashTx(firmada)
      await anotarMediador(c, k.id, DEVUELTO_AUTO, tx, f)
      return { tx, disputaTx: hashTx(abierta) }
    }
    case 'repartir': {    // PR #22: acuerdo o mediación con las dos aceptaciones → disputa (plataforma) + resolución (cuenta mediadora)
      if (k.liquidacion_tx && k.liquidacion_tx !== EN_CURSO && cierreAceptado(k)) {
        await asegurarEventoMediador(c, k.id, textoReparto(k), k.liquidacion_tx, f); return { tx: k.liquidacion_tx, yaExistia: true } }
      exigir(cierreAceptado(k) && !!k.escrow_contract_id, 409, 'Solo se reparte así un caso cerrado por el servidor con acuerdo o con las dos aceptaciones.')
      exigir(k.liquidacion_tx !== EN_CURSO, 409, 'El reparto ya se está pagando. Vuelve a abrir el alquiler en un momento.')
      exigir(!!c.mediadorFirma, 503, 'Falta configurar en el servidor la cuenta que resuelve disputas. Escríbenos a business.applockumi@gmail.com.')
      exigir(c.mediador !== P, 409, 'La cuenta que resuelve disputas tiene que ser distinta de la de Lockumi que abre la disputa.')
      const reparto = repartoAceptado(k)
      exigir(await tomar(c, k.id, f), 409, 'El reparto ya se está pagando. Vuelve a abrir el alquiler en un momento.')
      let disputaTx: string | null = null
      try {
        if (!(await hayEvento(c, k.id, REPARTO_DISPUTA, f)) && !(await hayEvento(c, k.id, REPARTO_DISPUTA_ANTES, f))) {   // en un reintento la disputa ya está abierta
          const d = await tw(c, '/escrow/single-release/dispute-escrow', { contractId: k.escrow_contract_id, signer: P }, f)
          const abierta = firmarComoPlataforma(c, sinFirmar(d)); await enviar(c, abierta, f)
          disputaTx = hashTx(abierta); await anotar(c, k.id, {}, REPARTO_DISPUTA, disputaTx, f)
        }
        const j = await tw(c, '/escrow/single-release/resolve-dispute', { contractId: k.escrow_contract_id, disputeResolver: c.mediador, distributions: reparto }, f)
        const firmada = firmarComoMediador(c, sinFirmar(j)); await enviar(c, firmada, f)
        const tx = hashTx(firmada)
        await anotarMediador(c, k.id, textoReparto(k), tx, f)
        return { tx, disputaTx }
      } catch (e) { await soltar(c, k.id, f).catch(() => {}); throw e }
    }
  }
  throw new ErrorTw(400, 'Acción no permitida.')
}
