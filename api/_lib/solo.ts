// Fase 1 · modo de una sola persona, REAL en Stellar testnet y SIN base de datos.
// - Inquilino: la billetera Cavos de quien prueba (firma el depósito con signXdr), o, como respaldo rotulado,
//   una cuenta de prueba que custodia el servidor (derivada de LOCKUMI_DEMO_SEED + un token aleatorio del navegador).
// - Dueño: cuenta de prueba que custodia el servidor, derivada de LOCKUMI_DEMO_SEED + id del contrato + rol.
// - Plataforma (GCTL…): crea el escrow, deja la evidencia y libera.
// Las llaves solo existen aquí (se derivan en memoria de variables del servidor); el navegador solo recibe claves públicas y hashes.
// Sin estado propio: cada acción se valida contra el escrow que reporta Trustless Work con validateOnChain=true.
import { Keypair, Networks, TransactionBuilder, Operation, Asset, Address, Account, xdr, hash, type Transaction } from '@stellar/stellar-sdk'
import { ErrorTw, leerTx, hashTx, datosOnChain, sinDatosPersonales, EVIDENCIA_ONCHAIN } from './tw.js'
import { PASSPHRASE_TESTNET, HORIZON_TESTNET, FRIENDBOT, TW_TESTNET, USDC, TOPE_USDC, MONTO_MAX_USDC, adelantoPermitido, MAX_XLM_COMPRA, montoValido, mensajeSaldoAlPagar, mensajeSaldoVersionVieja, MENSAJE_RECARGA, exigirTestnet } from './red.js'

export type Entorno = Record<string, string | undefined>
const G = /^G[A-Z2-7]{55}$/, C = /^C[A-Z2-7]{55}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, TOKEN = /^[0-9a-f]{64}$/, HUELLA = /^[0-9a-f]{64}$/
const exigir = (ok: unknown, estado: number, m: string): void => { if (!ok) throw new ErrorTw(estado, m) }
const MAX_TXT = MONTO_MAX_USDC.toLocaleString('es-CR')

export function configSolo(e: Entorno) {
  const base = (e.TRUSTLESS_WORK_BASE_URL || TW_TESTNET).replace(/\/$/, '')
  const passphrase = e.STELLAR_NETWORK_PASSPHRASE || PASSPHRASE_TESTNET
  const horizon = (e.HORIZON_URL || HORIZON_TESTNET).replace(/\/$/, '')
  try { exigirTestnet(passphrase, base, horizon) } catch (x) { throw new ErrorTw(500, (x as Error).message) }
  if (base !== TW_TESTNET) throw new ErrorTw(500, 'Este proxy solo trabaja con la API de testnet de Trustless Work.')
  if (Networks.TESTNET !== PASSPHRASE_TESTNET) throw new ErrorTw(500, 'Passphrase de testnet inesperado.')
  const falta = ['TRUSTLESS_WORK_API_KEY', 'LOCKUMI_TW_PLATAFORMA_SECRET', 'LOCKUMI_DEMO_SEED'].filter(k => !e[k]?.trim())
  if (falta.length) throw new ErrorTw(503, 'Falta configurar en el servidor: ' + falta.join(', '))
  const seed = e.LOCKUMI_DEMO_SEED!.trim()
  if (seed.length < 32) throw new ErrorTw(500, 'LOCKUMI_DEMO_SEED es demasiado corta.')
  const plataforma = Keypair.fromSecret(e.LOCKUMI_TW_PLATAFORMA_SECRET!.trim())
  // Modo de dos personas (LOCKUMI_DOS_PERSONAS=1): la cuenta de la persona mediadora resuelve los reclamos (disputeResolver), como en
  // api/_lib/tw.ts. Sin el interruptor, todo sigue igual que hoy: la plataforma es también la que resuelve.
  let resolvedor = plataforma
  if (e.LOCKUMI_DOS_PERSONAS === '1') {
    const pub = e.LOCKUMI_TW_MEDIADOR_PUBLICA?.trim(), sec = e.LOCKUMI_TW_MEDIADOR_SECRET?.trim()
    if (!pub || !G.test(pub)) throw new ErrorTw(503, 'Falta configurar en el servidor: LOCKUMI_TW_MEDIADOR_PUBLICA (cuenta G de la persona mediadora).')
    if (!sec) throw new ErrorTw(503, 'Falta configurar en el servidor: LOCKUMI_TW_MEDIADOR_SECRET (la llave de esa misma cuenta).')
    resolvedor = Keypair.fromSecret(sec)
    if (resolvedor.publicKey() !== pub) throw new ErrorTw(500, 'La llave de la cuenta que resuelve disputas no coincide con LOCKUMI_TW_MEDIADOR_PUBLICA.')
  }
  return { base, horizon, passphrase, llave: e.TRUSTLESS_WORK_API_KEY!.trim(), seed, plataforma, P: plataforma.publicKey(), resolvedor, R: resolvedor.publicKey() }
}
export type ConfigSolo = ReturnType<typeof configSolo>

/** HMAC-SHA256 (RFC 2104) con el sha256 de stellar-sdk: sin dependencias de Node, para que también lo prueben los tests del cliente. */
export function hmacSha256(clave: Uint8Array, mensaje: Uint8Array): Uint8Array {
  const B = 64, k = new Uint8Array(B); k.set(clave.length > B ? new Uint8Array(hash(clave as never)) : clave)
  const ipad = k.map(b => b ^ 0x36), opad = k.map(b => b ^ 0x5c)
  const interno = new Uint8Array(hash(new Uint8Array([...ipad, ...mensaje]) as never))
  return new Uint8Array(hash(new Uint8Array([...opad, ...interno]) as never))
}
const utf8 = (s: string) => new TextEncoder().encode(s)
/** Llave de una cuenta de prueba: HMAC-SHA256(LOCKUMI_DEMO_SEED, contexto) como semilla ed25519. Nunca sale del servidor. */
export const derivar = (c: Pick<ConfigSolo, 'seed'>, contexto: string) =>
  Keypair.fromRawEd25519Seed(hmacSha256(utf8(c.seed), utf8('lockumi-testnet-v1|' + contexto)) as never)
export const duenoDe = (c: Pick<ConfigSolo, 'seed'>, contrato: string) => derivar(c, 'dueno|' + contrato)
export const inquilinoPruebaDe = (c: Pick<ConfigSolo, 'seed'>, token: string) => derivar(c, 'inquilino|' + token)
const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
/** Permiso del aparato que creó la cuenta segura (modelo de un aparato de la fase 1): HMAC-SHA256(semilla, escrow). Lo devuelve
 *  «desplegar» y el navegador lo guarda con el alquiler. Sin la semilla nadie lo puede calcular. No es una llave: no firma nada. */
export const permisoDe = (c: Pick<ConfigSolo, 'seed'>, escrow: string) => hex(hmacSha256(utf8(c.seed), utf8('lockumi-solo-permiso-v1|' + escrow)))
/** Comparación en tiempo constante (mismo largo). */
const iguales = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
/** Legal (25/10, 1:24 a. m.): abrir el reclamo y repartir solo los pide el aparato que creó el depósito. Prueba: el permiso de
 *  «desplegar» o, en depósitos con «USDC de prueba de Lockumi», el token de la cuenta de prueba que recibe el depósito.
 *  Depósitos viejos con cuenta propia (sin permiso guardado) no tienen cómo probarlo y se rechazan con un mensaje claro. */
export function exigirAutorizado(c: ConfigSolo, e: Escrow, p: { permiso?: unknown; token?: unknown }) {
  const porPermiso = typeof p.permiso === 'string' && TOKEN.test(p.permiso) && iguales(p.permiso, permisoDe(c, e.contractId))
  const porToken = typeof p.token === 'string' && TOKEN.test(p.token) && inquilinoPruebaDe(c, p.token).publicKey() === e.roles.receiver
  exigir(porPermiso || porToken, 403, 'Solo el navegador donde se creó este depósito puede abrir el reclamo o repartirlo. Ábrelo desde ese navegador.')
}

// ── Límite de frecuencia por IP (en memoria) ──
// Límite conocido: vive en la memoria de cada instancia de la función de Vercel; se reinicia en cada arranque en frío y no se
// comparte entre instancias. Frena el abuso casual, no un ataque distribuido (para eso haría falta un almacén compartido).
const LIMITES = { general: { n: 60, ventanaMs: 10 * 60_000 }, costosa: { n: 12, ventanaMs: 60 * 60_000 } } as const
const COSTOSAS = new Set(['desplegar', 'cuenta-prueba', 'fondear-prueba'])
const visitas = new Map<string, number[]>()
export function limitar(ip: string, accion: string, ahora = Date.now()) {
  for (const [tipo, l] of Object.entries(LIMITES) as [keyof typeof LIMITES, { n: number; ventanaMs: number }][]) {
    if (tipo === 'costosa' && !COSTOSAS.has(accion)) continue
    const k = tipo + '|' + ip, v = (visitas.get(k) ?? []).filter(t => ahora - t < l.ventanaMs)
    if (v.length >= l.n) throw new ErrorTw(429, `Hiciste muchas solicitudes seguidas. Espera ${Math.ceil(l.ventanaMs / 60_000)} minutos y vuelve a intentarlo.`)
    v.push(ahora); visitas.set(k, v)
  }
  if (visitas.size > 5000) visitas.clear()
}
export const reiniciarLimites = () => visitas.clear()

// ── Trustless Work ──
async function tw<T = Record<string, unknown>>(c: ConfigSolo, ruta: string, cuerpo: unknown, f: typeof fetch, metodo = 'POST'): Promise<T> {
  const r = await f(c.base + ruta, { method: metodo, headers: { 'content-type': 'application/json', 'x-api-key': c.llave }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  const t = await r.text(); let j: Record<string, unknown> = {}; try { j = JSON.parse(t) } catch { /* texto */ }
  if (!r.ok) throw new ErrorTw(r.status === 429 ? 429 : 502, `Trustless Work ${ruta.split('?')[0]} respondió ${r.status}: ${String(j.message ?? t).split(c.llave).join('[llave]').slice(0, 300)}`)
  return (Array.isArray(j) ? j : j) as T
}
const sinFirmar = (j: Record<string, unknown>) => {
  const x = j.unsignedTransaction ?? j.unsignedXdr
  if (typeof x !== 'string') throw new ErrorTw(502, 'Trustless Work no devolvió la transacción sin firmar.'); return x
}
async function enviarTw(c: ConfigSolo, signedXdr: string, f: typeof fetch) {
  try {
    const r = await tw(c, '/helper/send-transaction', { signedXdr }, f)
    if (r.status && r.status !== 'SUCCESS') throw new ErrorTw(502, 'La red de prueba no aceptó la transacción: ' + JSON.stringify(r).slice(0, 200))
    return { r, tx: hashTx(signedXdr) }
  } catch (e) { return { r: await desenlace(c, signedXdr, e, f), tx: hashTx(signedXdr) } }
}
/** El envío falló o se agotó el tiempo (con dos transacciones a la vez de la misma cuenta, la segunda suele quedar así).
 *  Se mira en Horizon qué pasó con ESA transacción: si entró, es éxito; si su secuencia ya la usó otra, se marca tx_bad_seq
 *  para que conReintento la vuelva a pedir y firmar; si no se sabe, se devuelve el error (no se reenvía a ciegas). */
async function desenlace(c: ConfigSolo, signedXdr: string, e: unknown, f: typeof fetch): Promise<Record<string, unknown>> {
  const m = e instanceof Error ? e.message : String(e)
  if (!/timed? ?out|timeout|bad_?seq|try_again_later|duplicate/i.test(m)) throw e
  const t = leerTx(signedXdr), h = hashTx(signedXdr)
  for (let i = 0; i < 4; i++) {
    const r = await f(`${c.horizon}/transactions/${h}`)
    if (r.ok) { const j = await r.json() as { successful?: boolean }; if (j.successful) return { status: 'SUCCESS', recuperada: true }; throw new ErrorTw(502, 'La red de prueba rechazó la transacción.') }
    const a = await cuenta(c, t.source, f)
    if (a && BigInt(a.sequence) >= BigInt(t.sequence)) throw new ErrorTw(409, 'tx_bad_seq: otra transacción de la misma cuenta entró antes.')
    await espera(2000)
  }
  throw e
}
// ── Una transacción a la vez por cuenta (en esta instancia del servidor): evita choques de secuencia antes de que pasen. ──
const filas = new Map<string, Promise<unknown>>()
export function enFila<T>(cuentaG: string, f: () => Promise<T>): Promise<T> {
  const antes = filas.get(cuentaG) ?? Promise.resolve()
  const p = antes.catch(() => {}).then(f)
  const cola = p.catch(() => {}); filas.set(cuentaG, cola); void cola.then(() => { if (filas.get(cuentaG) === cola) filas.delete(cuentaG) })
  return p
}

export interface Escrow {
  contractId: string; signer: string; engagementId: string; title: string; amount: number; balance: number
  roles: Record<'approver' | 'serviceProvider' | 'platformAddress' | 'releaseSigner' | 'disputeResolver' | 'receiver', string>
  trustline: { address: string }; milestones: { status: string; approved: boolean; evidence?: string }[]
  flags: { disputed: boolean; released: boolean; resolved: boolean }; inconsistencies?: { inconsistencyFound: boolean }
}
export async function leerEscrow(c: ConfigSolo, id: string, f: typeof fetch): Promise<Escrow> {
  exigir(C.test(id), 400, 'La cuenta segura del depósito no es válida.')
  const j = await tw<unknown>(c, `/helper/get-escrow-by-contract-ids?contractIds[]=${id}&validateOnChain=true`, undefined, f, 'GET')
  const e = (Array.isArray(j) ? j[0] : j) as Escrow | undefined
  exigir(e && e.contractId === id, 404, 'No encontramos la cuenta segura del depósito en la red de prueba.')
  return e!
}
/** El escrow lo creó Lockumi para este modo: plataforma GCTL…, dueño derivado del id del contrato, tope y USDC de prueba. */
export function validarEscrow(c: ConfigSolo, e: Escrow, receiver?: string) {
  exigir(UUID.test(e.engagementId), 403, 'Esta cuenta segura no es de Lockumi.')
  exigir(e.signer === c.P && e.roles.platformAddress === c.P && e.roles.releaseSigner === c.P && e.roles.serviceProvider === c.P, 403, 'Esta cuenta segura no es de Lockumi.')
  exigir(e.roles.approver === duenoDe(c, e.engagementId).publicKey(), 403, 'El dueño de esta cuenta segura no es el dueño de prueba de Lockumi.')
  exigir(e.trustline?.address === USDC.issuer, 403, 'Esta cuenta segura no usa USDC de prueba.')
  exigir(montoValido(Number(e.amount)), 403, `El monto supera el máximo de ${MAX_TXT} USDC de prueba.`)
  exigir(!e.inconsistencies?.inconsistencyFound, 409, 'Los datos de la cuenta segura no coinciden con la red. Espera unos segundos y vuelve a intentarlo.')
  if (receiver !== undefined) exigir(e.roles.receiver === receiver, 403, 'El depósito tiene que salir de la cuenta que lo recibe de vuelta.')
}
/** Cuenta que firma el reparto: la que el escrow nombra como disputeResolver (la persona mediadora o, en depósitos de antes
 *  de LOCKUMI_DOS_PERSONAS=1, la plataforma). Si no es ninguna de las dos cuentas del servidor, no se puede repartir. */
export function resolvedorDe(c: ConfigSolo, e: Pick<Escrow, 'roles'>): Keypair {
  const r = e.roles.disputeResolver
  if (r === c.R) return c.resolvedor
  if (r === c.P) return c.plataforma
  throw new ErrorTw(403, 'Esta cuenta segura no es de Lockumi.')
}
/** Única llamada a contrato permitida en una transacción: contrato y método esperados. */
export function exigirLlamada(t: Transaction, contrato: string | null, metodos: string[]) {
  exigir(t.operations.length === 1 && t.operations[0].type === 'invokeHostFunction', 400, 'Transacción inesperada.')
  const fn = (t.operations[0] as unknown as { func: xdr.HostFunction }).func
  exigir(fn.switch() === xdr.HostFunctionType.hostFunctionTypeInvokeContract(), 400, 'Transacción inesperada.')
  const ic = fn.invokeContract()
  if (contrato) exigir(Address.fromScAddress(ic.contractAddress()).toString() === contrato, 400, 'La transacción no es de esta cuenta segura.')
  exigir(metodos.includes(ic.functionName().toString()), 400, 'Transacción inesperada: ' + ic.functionName().toString())
}
function firmarComo(k: Keypair, x: string, contrato: string | null, metodos: string[]) {
  const t = leerTx(x)
  exigir(t.networkPassphrase === PASSPHRASE_TESTNET, 400, 'Solo red de prueba.')
  exigir(t.source === k.publicKey(), 502, 'La transacción no sale de la cuenta esperada.')
  exigirLlamada(t, contrato, metodos)
  t.sign(k); return t.toXDR()
}

// ── Horizon / Friendbot (cuentas de prueba del servidor) ──
type Cuenta = { id: string; sequence: string; balances: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[] }
async function cuenta(c: ConfigSolo, g: string, f: typeof fetch): Promise<Cuenta | null> {
  const r = await f(`${c.horizon}/accounts/${g}`); if (r.status === 404) return null
  if (!r.ok) throw new ErrorTw(502, 'La red de prueba no respondió (Horizon ' + r.status + '). Intenta de nuevo en un minuto.')
  return r.json() as Promise<Cuenta>
}
const usdcDe = (a: Cuenta | null) => a?.balances.find(b => b.asset_code === USDC.code && b.asset_issuer === USDC.issuer)?.balance ?? null
async function friendbot(g: string, f: typeof fetch) {
  const r = await f(`${FRIENDBOT}/?addr=${g}`)
  if (!r.ok && !(r.status === 400 && /already|exist/i.test(await r.text()))) throw new ErrorTw(502, 'Friendbot (XLM de prueba gratis) no respondió. Intenta de nuevo en un minuto.')
}
async function enviarHorizon(c: ConfigSolo, t: Transaction, f: typeof fetch) {
  const r = await f(`${c.horizon}/transactions`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'tx=' + encodeURIComponent(t.toXDR()) })
  const j = await r.json().catch(() => ({})) as { hash?: string; extras?: { result_codes?: unknown } }
  if (!r.ok || !j.hash) throw new ErrorTw(502, 'La red de prueba rechazó la operación: ' + JSON.stringify(j.extras?.result_codes ?? r.status).slice(0, 160))
  return j.hash
}
const tb = (a: Cuenta) => new TransactionBuilder(new Account(a.id, a.sequence), { fee: '1000', networkPassphrase: PASSPHRASE_TESTNET })
/** Crea la cuenta (Friendbot) y abre la trustline de USDC si faltan. Devuelve el hash de la trustline si la abrió. */
async function prepararCuenta(c: ConfigSolo, k: Keypair, f: typeof fetch) {
  let a = await cuenta(c, k.publicKey(), f)
  if (!a) { await friendbot(k.publicKey(), f); a = await cuenta(c, k.publicKey(), f) }
  exigir(a, 502, 'No pudimos activar la cuenta de prueba. Intenta de nuevo en un minuto.')
  if (usdcDe(a) !== null) return { a: a!, trustline: null as string | null }
  const trustline = await conReintento(() => enFila(k.publicKey(), async () => {
    const a2 = (await cuenta(c, k.publicKey(), f))!; if (usdcDe(a2) !== null) return null   // otra solicitud ya la abrió
    const t = tb(a2).addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) })).setTimeout(60).build(); t.sign(k)
    return enviarHorizon(c, t, f)
  }))
  return { a: a!, trustline }
}

/** La plataforma (tesorería) envía USDC de prueba; con secuencia fresca en cada intento. */
const pagarDesdeTesoreria = (c: ConfigSolo, destino: string, monto: number, f: typeof fetch) => conReintento(() => enFila(c.P, async () => {
  const t = tb((await cuenta(c, c.P, f))!).addOperation(Operation.payment({ destination: destino, asset: new Asset(USDC.code, USDC.issuer), amount: monto.toFixed(7) })).setTimeout(60).build()
  t.sign(c.plataforma); return enviarHorizon(c, t, f)
}))
/** Pide a Trustless Work la transacción, la firma la cuenta del servidor y la envía; reintenta si la secuencia quedó vieja. */
const firmarYEnviar = (c: ConfigSolo, k: Keypair, ruta: string, cuerpo: unknown, escrow: string, metodos: string[], f: typeof fetch) =>
  conReintento(() => enFila(k.publicKey(), async () => (await enviarTw(c, firmarComo(k, sinFirmar(await tw(c, ruta, cuerpo, f)), escrow, metodos), f)).tx))

/** Cuenta de prueba de Lockumi: la activa (Friendbot + trustline) y la completa hasta `objetivo` USDC de prueba (nunca más del tope de 20).
 *  Primero desde la tesorería (plataforma); si a la tesorería no le alcanza, la cuenta compra en el DEX de testnet con su XLM de Friendbot. */
async function completarPrueba(c: ConfigSolo, k: Keypair, objetivo: number, f: typeof fetch) {
  const { trustline } = await prepararCuenta(c, k, f)
  const a = (await cuenta(c, k.publicKey(), f))!
  const falta = Math.round((objetivo - Number(usdcDe(a) ?? 0)) * 1e7) / 1e7; let compra: string | null = null, via: 'tesoreria' | 'dex' | null = null
  if (falta > 0) {
    const tes = await cuenta(c, c.P, f)
    if (Number(usdcDe(tes) ?? 0) >= falta) {   // tesorería: la plataforma envía el USDC de prueba que falta
      compra = await pagarDesdeTesoreria(c, k.publicKey(), falta, f); via = 'tesoreria'
    } else {                                    // respaldo: la cuenta de prueba compra en el DEX de testnet con su XLM de Friendbot
      const t = tb(a).addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: String(MAX_XLM_COMPRA), destination: k.publicKey(),
        destAsset: new Asset(USDC.code, USDC.issuer), destAmount: falta.toFixed(7), path: [] })).setTimeout(60).build(); t.sign(k)
      compra = await enviarHorizon(c, t, f); via = 'dex'
    }
  }
  return { trustline, compra, via, usdc: usdcDe(await cuenta(c, k.publicKey(), f)) }
}

// ── Acciones permitidas ──
export type PedidoSolo =
  | { accion: 'dueno'; contrato: string }
  | { accion: 'cuenta-prueba'; token: string; monto?: number }
  // origen: 'lockumi' (USDC de prueba de Lockumi, con el token de la cuenta de prueba) o 'propia'. Sin origen = pestaña con una versión vieja de la app.
  | { accion: 'desplegar'; contrato: string; inquilino: string; monto: number; origen?: 'lockumi' | 'propia'; token?: string }
  | { accion: 'fondear'; escrow: string; inquilino: string }
  | { accion: 'enviar-deposito'; escrow: string; signedXdr: string }
  | { accion: 'fondear-prueba'; escrow: string; token: string }
  | { accion: 'aprobar'; escrow: string; huella?: string }
  | { accion: 'liberar'; escrow: string }
  | { accion: 'disputar'; escrow: string; permiso?: string; token?: string }
  | { accion: 'resolver'; escrow: string; alDueno: number; reclamado: number; permiso?: string; token?: string }
export const ACCIONES = ['dueno', 'cuenta-prueba', 'desplegar', 'fondear', 'enviar-deposito', 'fondear-prueba', 'aprobar', 'liberar', 'disputar', 'resolver'] as const

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))
/** Número de secuencia viejo (tx_bad_seq / txBadSeq): otra transacción de la misma cuenta entró antes. */
export const esSecuenciaVieja = (e: unknown) => /bad_?seq/i.test(e instanceof Error ? e.message : String(e))
/** Concurrencia: reintenta una transacción firmada por el servidor si la secuencia quedó vieja. Cada intento vuelve a pedir la
 *  transacción (Trustless Work u Horizon cargan la cuenta de nuevo), la firma otra vez y la envía. Espera corta y acotada. */
export async function conReintento<T>(f: () => Promise<T>, ms = 400, intentos = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try { return await f() } catch (e) {
      if (i >= intentos || !esSecuenciaVieja(e)) throw e
      await espera(ms * i + Math.floor(Math.random() * ms))
    }
  }
}
async function leerHasta(c: ConfigSolo, id: string, ok: (e: Escrow) => boolean, f: typeof fetch, intentos = 6, ms = 1500) {
  let e = await leerEscrow(c, id, f)
  for (let i = 1; i < intentos && !ok(e); i++) { await espera(ms); e = await leerEscrow(c, id, f) }
  return e
}
const fondeado = (e: Escrow) => Number(e.balance) >= Number(e.amount)

export async function atenderSolo(env: Entorno, p: PedidoSolo, ip: string, f: typeof fetch = fetch, opciones = { espera: 1500 }): Promise<Record<string, unknown>> {
  exigir(p && typeof p === 'object' && (ACCIONES as readonly string[]).includes((p as { accion: string }).accion), 400, 'Acción no permitida.')
  const c = configSolo(env)
  limitar(ip, p.accion)
  switch (p.accion) {
    case 'dueno': {   // cuenta del dueño de prueba: Friendbot + trustline de USDC (TW exige que el approver tenga trustline)
      exigir(UUID.test(p.contrato), 400, 'Contrato inválido.')
      const k = duenoDe(c, p.contrato); const { trustline } = await prepararCuenta(c, k, f)
      return { dueno: k.publicKey(), trustlineTx: trustline }
    }
    case 'cuenta-prueba': {   // inquilino de prueba custodiado por el servidor: Friendbot + trustline + USDC desde la tesorería (plataforma)
      exigir(TOKEN.test(p.token), 400, 'Falta el identificador de la cuenta de prueba.')
      const objetivo = p.monto === undefined ? TOPE_USDC : p.monto
      exigir(montoValido(objetivo, TOPE_USDC), 400, `Puedes pedir hasta ${TOPE_USDC} USDC de prueba.`)
      const k = inquilinoPruebaDe(c, p.token), r = await completarPrueba(c, k, objetivo, f)
      return { inquilino: k.publicKey(), trustlineTx: r.trustline, compraTx: r.compra, via: r.via, usdc: r.usdc }
    }
    case 'desplegar': {   // la plataforma crea el escrow; textos fijos y el uuid del contrato (sin datos personales)
      exigir(UUID.test(p.contrato), 400, 'Contrato inválido.')
      exigir(G.test(p.inquilino), 400, 'La cuenta del inquilino no es válida.')
      // Sin tope de 20: con USDC de prueba propios el límite es el saldo real de la cuenta (Horizon) y el máximo de la app.
      // El tope de 20 de los USDC que da Lockumi se revisa en cuenta-prueba y fondear-prueba (los únicos pasos que usan la tesorería).
      exigir(montoValido(p.monto), 400, `El depósito de prueba tiene que ser mayor que 0 y como máximo ${MAX_TXT} USDC.`)
      const dueno = duenoDe(c, p.contrato).publicKey()
      exigir(new Set([p.inquilino, dueno, c.P]).size === 3, 400, 'La cuenta del inquilino no puede ser la del dueño ni la de Lockumi.')
      exigir(p.origen === undefined || p.origen === 'lockumi' || p.origen === 'propia', 400, 'Acción no permitida.')
      // Ruta «USDC de prueba de Lockumi»: el servidor mismo completa la cuenta de prueba hasta el monto justo antes de revisar el saldo,
      // así no depende de que el navegador haya recargado antes (pestañas abiertas con una versión vieja, reintentos, cuenta ya usada en 0).
      let recarga: Awaited<ReturnType<typeof completarPrueba>> | null = null
      if (p.origen === 'lockumi') {
        exigir(typeof p.token === 'string' && TOKEN.test(p.token), 400, 'Falta el identificador de la cuenta de prueba. Recarga la página y vuelve a tocar «Pagar».')
        const k = inquilinoPruebaDe(c, p.token!)
        exigir(k.publicKey() === p.inquilino, 400, 'La cuenta de prueba no coincide con este navegador. Recarga la página y vuelve a tocar «Pagar».')
        exigir(montoValido(p.monto, TOPE_USDC), 403, `Con «USDC de prueba de Lockumi» el depósito es de máximo ${TOPE_USDC} USDC de prueba. Para un monto mayor, usa USDC de prueba de tu propia cuenta.`)
        try { recarga = await completarPrueba(c, k, p.monto, f) } catch { throw new ErrorTw(503, MENSAJE_RECARGA) }
      }
      const inq = await cuenta(c, p.inquilino, f)
      exigir(inq, 409, 'Tu cuenta todavía no existe en la red de prueba. Toca "Obtener USDC de prueba" primero.')
      exigir(usdcDe(inq) !== null, 409, 'Tu cuenta todavía no tiene USDC habilitado. Toca "Obtener USDC de prueba" primero.')
      // Chequeo de saldo del servidor (se mantiene). Sin «origen», la pestaña tiene una versión de la app anterior a la recarga automática.
      const tiene = Number(usdcDe(inq))
      exigir(tiene >= p.monto, 409, p.origen === 'lockumi' ? MENSAJE_RECARGA : p.origen === 'propia' ? mensajeSaldoAlPagar(tiene, p.monto) : mensajeSaldoVersionVieja(tiene, p.monto))
      await prepararCuenta(c, duenoDe(c, p.contrato), f)
      const pub = datosOnChain({ id: p.contrato })
      sinDatosPersonales([pub.title, pub.description, ...pub.milestones.map(m => m.description)], { direccion: '' })
      const { r, tx } = await conReintento(() => enFila(c.P, async () => {
        const j = await tw(c, '/deployer/single-release', {
          signer: c.P, ...pub,
          roles: { approver: dueno, serviceProvider: c.P, platformAddress: c.P, releaseSigner: c.P, disputeResolver: c.R, receiver: p.inquilino },
          amount: p.monto, platformFee: 0, trustline: { address: USDC.issuer, symbol: USDC.code },
        }, f)
        const t = leerTx(sinFirmar(j)); exigir(t.source === c.P, 502, 'La transacción no es de la cuenta de la plataforma.')
        exigir(t.operations.length === 1 && t.operations[0].type === 'invokeHostFunction', 502, 'Transacción inesperada.')
        t.sign(c.plataforma)
        return enviarTw(c, t.toXDR(), f)
      }))
      const id = String(r.contractId ?? (r.escrow as { contractId?: string } | undefined)?.contractId ?? '')
      exigir(C.test(id), 502, r.recuperada ? 'La cuenta segura se creó, pero la red de prueba tardó en responder. Vuelve a tocar el botón.' : 'Trustless Work no devolvió la cuenta segura del depósito.')
      return { escrow: id, tx, dueno, permiso: permisoDe(c, id), ...(recarga && { trustlineTx: recarga.trustline, compraTx: recarga.compra }) }
    }
    case 'fondear': {     // XDR del depósito para que el inquilino la firme con su billetera
      exigir(G.test(p.inquilino), 400, 'La cuenta del inquilino no es válida.')
      const e = await leerHasta(c, p.escrow, x => x.contractId === p.escrow, f, 1); validarEscrow(c, e, p.inquilino)
      exigir(!fondeado(e) && !e.flags.released && !e.flags.disputed, 409, 'Este depósito ya se pagó.')
      const inq = await cuenta(c, p.inquilino, f), tiene = Number(usdcDe(inq) ?? 0)
      exigir(tiene >= Number(e.amount), 409, mensajeSaldoAlPagar(tiene, Number(e.amount)))
      const j = await tw(c, '/escrow/single-release/fund-escrow', { contractId: p.escrow, signer: p.inquilino, amount: Number(e.amount) }, f)
      const x = sinFirmar(j), t = leerTx(x)
      exigir(t.source === p.inquilino, 502, 'La transacción del depósito no sale de tu cuenta.'); exigirLlamada(t, p.escrow, ['fund_escrow'])
      return { unsignedXdr: x }
    }
    case 'enviar-deposito': {   // solo reenvía el depósito firmado por el receiver de ESTE escrow
      exigir(typeof p.signedXdr === 'string' && p.signedXdr.length < 20000, 400, 'Transacción inválida.')
      const t = leerTx(p.signedXdr)
      const e = await leerEscrow(c, p.escrow, f); validarEscrow(c, e, t.source)
      exigir(t.signatures.length > 0, 400, 'Falta la firma de tu billetera.')
      exigirLlamada(t, p.escrow, ['fund_escrow'])
      exigir(!fondeado(e), 409, 'Este depósito ya se pagó.')
      return { tx: (await enviarTw(c, p.signedXdr, f)).tx }
    }
    case 'fondear-prueba': {    // respaldo: el servidor firma el depósito con la cuenta de inquilino de prueba
      exigir(TOKEN.test(p.token), 400, 'Falta el identificador de la cuenta de prueba.')
      const k = inquilinoPruebaDe(c, p.token)
      const e = await leerEscrow(c, p.escrow, f); validarEscrow(c, e, k.publicKey())
      exigir(!fondeado(e) && !e.flags.released, 409, 'Este depósito ya se pagó.')
      exigir(montoValido(Number(e.amount), TOPE_USDC), 403, `Con «Obtener USDC de prueba» el depósito es de máximo ${TOPE_USDC} USDC de prueba. Para un monto mayor, usa USDC de prueba de tu propia cuenta.`)
      // Si al inquilino de prueba le falta USDC (por ejemplo, dos depósitos a la vez), la tesorería completa lo que falta (nunca más del tope).
      const inq = await cuenta(c, k.publicKey(), f); exigir(inq && usdcDe(inq) !== null, 409, 'La cuenta de prueba todavía no está lista. Vuelve a tocar el botón.')
      const falta = Math.round((Number(e.amount) - Number(usdcDe(inq))) * 1e7) / 1e7
      const compraTx = falta > 0 ? await pagarDesdeTesoreria(c, k.publicKey(), falta, f) : null
      return { tx: await firmarYEnviar(c, k, '/escrow/single-release/fund-escrow', { contractId: p.escrow, signer: k.publicKey(), amount: Number(e.amount) }, p.escrow, ['fund_escrow'], f), compraTx }
    }
    case 'aprobar': {     // evidencia (plataforma) + aprobación (dueño de prueba). Solo con el depósito completo en el escrow.
      // Con «Solo red de prueba: adelantar el plazo» llega antes de los 7 días: solo en testnet (además de exigirTestnet en configSolo).
      exigir(adelantoPermitido(c.passphrase), 403, 'Devolver antes del plazo solo se puede en la red de prueba.')
      exigir(p.huella === undefined || HUELLA.test(p.huella), 400, 'La huella del acta no es válida.')
      const e = await leerHasta(c, p.escrow, fondeado, f, 6, opciones.espera); validarEscrow(c, e)
      exigir(fondeado(e), 409, 'La cuenta segura todavía no tiene el depósito completo. Espera unos segundos y vuelve a intentarlo.')
      exigir(!e.flags.released && !e.flags.disputed, 409, 'Este depósito ya se cerró.')
      const h = e.milestones[0]; exigir(h, 502, 'La cuenta segura no tiene el hito de entrega.')
      if (h.approved) return { yaAprobado: true }
      let evidenciaTx: string | null = null
      if (h.status !== 'Completed') {
        const evidencia = EVIDENCIA_ONCHAIN + (p.huella ? ` · sha256:${p.huella}` : '')
        sinDatosPersonales([evidencia], { direccion: '' })
        evidenciaTx = await firmarYEnviar(c, c.plataforma, '/escrow/single-release/change-milestone-status', { contractId: p.escrow, milestoneIndex: '0', newStatus: 'Completed', newEvidence: evidencia, serviceProvider: c.P }, p.escrow, ['change_milestone_status'], f)
      }
      const dueno = duenoDe(c, e.engagementId)
      const aprobacionTx = await firmarYEnviar(c, dueno, '/escrow/single-release/approve-milestone', { contractId: p.escrow, milestoneIndex: '0', approver: dueno.publicKey() }, p.escrow, ['approve_milestone'], f)
      return { evidenciaTx, aprobacionTx }
    }
    case 'liberar': {     // solo después de la aprobación del dueño en la cadena: la plataforma libera al receiver (inquilino)
      // Con «Solo red de prueba: adelantar el plazo» llega antes de los 7 días: solo en testnet (además de exigirTestnet en configSolo).
      exigir(adelantoPermitido(c.passphrase), 403, 'Devolver antes del plazo solo se puede en la red de prueba.')
      const e = await leerHasta(c, p.escrow, x => !!x.milestones[0]?.approved, f, 6, opciones.espera); validarEscrow(c, e)
      exigir(!e.flags.released, 409, 'Este depósito ya se devolvió.')
      exigir(!e.flags.disputed, 409, 'Este depósito tiene un reclamo abierto.')
      exigir(e.milestones[0]?.approved, 409, 'Primero el dueño tiene que aprobar la devolución.')
      exigir(Number(e.balance) > 0, 409, 'La cuenta segura no tiene saldo.')
      return { tx: await firmarYEnviar(c, c.plataforma, '/escrow/single-release/release-funds', { contractId: p.escrow, releaseSigner: c.P }, p.escrow, ['release_funds'], f), receiver: e.roles.receiver }
    }
    case 'disputar': {    // el dueño de prueba abre el reclamo en la cadena (dispute_escrow), firmado por el servidor
      const e = await leerHasta(c, p.escrow, fondeado, f, 6, opciones.espera); validarEscrow(c, e); exigirAutorizado(c, e, p)
      if (e.flags.disputed) return { yaDisputado: true }
      exigir(fondeado(e), 409, 'La cuenta segura todavía no tiene el depósito completo. Espera unos segundos y vuelve a intentarlo.')
      exigir(!e.flags.released && !e.flags.resolved, 409, 'Este depósito ya se cerró.')
      const dueno = duenoDe(c, e.engagementId)
      return { tx: await firmarYEnviar(c, dueno, '/escrow/single-release/dispute-escrow', { contractId: p.escrow, signer: dueno.publicKey() }, p.escrow, ['dispute_escrow'], f) }
    }
    case 'resolver': {    // reparto del reclamo (acuerdo o persona mediadora): resolve_dispute firmado por el disputeResolver del escrow (resolvedorDe)
      const e = await leerHasta(c, p.escrow, x => x.flags.disputed || x.flags.resolved, f, 6, opciones.espera); validarEscrow(c, e); exigirAutorizado(c, e, p)
      if (e.flags.resolved) return { yaResuelto: true }
      exigir(e.flags.disputed, 409, 'Este depósito no tiene un reclamo abierto.')
      const saldo = Number(e.balance), monto7 = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && Math.round(x * 1e7) === x * 1e7
      // Repartos de la fase 1 (Términos 1.7-demo 6.3 e y f, 6.6 y 6.7; repartoValido en src/prueba/mediacion.ts): lo reclamado es
      // mayor que 0 y no supera el depósito, y el dueño recibe entre 0 y lo reclamado. El inquilino recibe el resto.
      exigir(monto7(p.reclamado) && p.reclamado > 0 && p.reclamado <= saldo, 400, `El monto reclamado tiene que ser mayor que 0 y de ${saldo} USDC de prueba o menos. Recarga la página y vuelve a intentarlo.`)
      exigir(monto7(p.alDueno) && p.alDueno >= 0, 400, `El monto para el dueño tiene que estar entre 0 y ${p.reclamado} USDC de prueba.`)
      exigir(p.alDueno <= p.reclamado, 400, `El dueño no puede recibir más de lo que reclamó (${p.reclamado} USDC de prueba).`)
      const alInquilino = Math.round((saldo - p.alDueno) * 1e7) / 1e7
      const distributions = [{ address: e.roles.approver, amount: p.alDueno }, { address: e.roles.receiver, amount: alInquilino }].filter(d => d.amount > 0)
      // Firma quien el escrow nombra como disputeResolver, no la configuración de hoy: los depósitos creados antes de
      // LOCKUMI_DOS_PERSONAS=1 nombran a la plataforma (con la mediadora, el contrato respondía Error #12 y la app mostraba el error de red).
      const k = resolvedorDe(c, e)
      const tx = await firmarYEnviar(c, k, '/escrow/single-release/resolve-dispute', { contractId: p.escrow, disputeResolver: k.publicKey(), distributions }, p.escrow, ['resolve_dispute'], f)
      return { tx, alDueno: p.alDueno, alInquilino }
    }
  }
}
