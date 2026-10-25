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
export type Contrato = { id: string; estado: string; monto: number; direccion: string; escrow_contract_id: string | null; resultado: { via?: string; dueno?: number; inquilino?: number } | null; liquidacion_tx: string | null; lk_participantes: Part[] }
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
export const DEVUELTO_AUTO = 'Devolución automática: la cuenta que resuelve disputas entregó el 100 % del depósito al inquilino'
/** Paso 7 (Términos 1.7-demo 4.2 e): en la devolución automática el reparto es SIEMPRE el 100 % al inquilino. No recibe montos ni
 *  destinatarios, así que no se le puede pedir otro reparto. TW exige que la suma sea el saldo del escrow (Resolve Dispute). */
export function repartoAutomatico(k: Contrato): { address: string; amount: number }[] {
  return [{ address: cuenta(k, 'inquilino'), amount: Number(k.monto) }]
}
async function aprobadoPorDueno(c: Config, id: string, f = fetch) {
  const r = await rest(c, `lk_eventos?contrato_id=eq.${id}&texto=eq.${encodeURIComponent(APROBADO)}&select=texto`, {}, f)
  return r.ok ? ((await r.json().catch(() => [])) as unknown[]).length > 0 : false
}

// ── Acciones (permitidas y nada más) ──
export type Pedido =
  | { accion: 'desplegar'; contrato: string }
  | { accion: 'fondear'; contrato: string }
  | { accion: 'aprobar'; contrato: string }
  | { accion: 'enviar'; contrato: string; paso: 'fondear' | 'aprobar'; signedXdr: string }
  | { accion: 'liberar'; contrato: string }
  | { accion: 'devolver-automatico'; contrato: string }

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
      if (p.paso === 'aprobar') await anotar(c, k.id, {}, APROBADO, tx, f)
      return { tx, estado: r.status ?? null }
    }
    case 'liberar': {     // tras cerrar sin reclamo: la plataforma (releaseSigner) libera el 100 % al inquilino (receiver)
      exigir(k.estado === 'cerrado' && k.resultado?.via === 'automatico' && !!k.escrow_contract_id, 409, 'Solo se libera así un contrato cerrado sin reclamo.')
      if (k.liquidacion_tx) return { tx: k.liquidacion_tx, yaExistia: true }
      const j = await tw(c, '/escrow/single-release/release-funds', { contractId: k.escrow_contract_id, releaseSigner: P }, f)
      const firmada = firmarComoPlataforma(c, sinFirmar(j)); await enviar(c, firmada, f)
      const tx = hashTx(firmada)
      await anotar(c, k.id, { liquidacion_tx: tx }, `Se liberó el depósito al inquilino desde Trustless Work (${k.monto} USDC menos la comisión de 0,3 % de Trustless Work)`, tx, f)
      return { tx }
    }
    case 'devolver-automatico': { // paso 7, opción 1: venció el plazo sin reclamo y sin aprobación del dueño
      exigir(k.estado === 'cerrado' && k.resultado?.via === 'automatico' && !!k.escrow_contract_id, 409, 'La devolución automática solo corre cuando vence el plazo del dueño sin reclamo.')
      if (k.liquidacion_tx) return { tx: k.liquidacion_tx, yaExistia: true }
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
      await anotar(c, k.id, { liquidacion_tx: tx }, DEVUELTO_AUTO, tx, f)
      return { tx, disputaTx: hashTx(abierta) }
    }
  }
  throw new ErrorTw(400, 'Acción no permitida.')
}
