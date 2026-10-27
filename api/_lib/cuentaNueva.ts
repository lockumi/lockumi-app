// Cuenta nueva para quien perdió la llave de su billetera Cavos (solo testnet). La billetera nueva la crea la persona en su
// navegador (con clave de acceso/passkey); aquí el servidor, ya con su sesión leída, la asigna a su misma cuenta Lockumi:
//  1) lk_cuenta_nueva (migración 20261026200000): guarda la cuenta vieja en el historial (no se borra), sube el número de cuenta y pasa
//     a la nueva los alquileres que todavía no tienen cuenta segura (escrow).
//  2) Alquileres con cuenta segura y saldo 0 (sin depósito): se cambian los roles en Trustless Work (update-escrow, firma la plataforma),
//     se confirma en la red y recién entonces se pasan en la base (lk_asignar_cuenta).
//  3) Alquileres con depósito (saldo > 0, reclamo abierto o cerrados): NO se tocan; se cuentan para el reporte.
// Fuente: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/update-escrow-properties
import { tw, sinFirmar, enviar, rest, exigir, firmarComoPlataforma, leerEscrowTw, ErrorTw, type Config } from './tw.js'
import { USDC } from './red.js'

const G = /^G[A-Z2-7]{55}$/
type Fila = { contrato_id: string; rol: 'dueno' | 'inquilino'; direccion_stellar: string | null; lk_contratos: { id: string; estado: string; escrow_contract_id: string | null; liquidacion_tx: string | null } }
export interface ResumenCuentaNueva { generacion: number; sinEscrow: number; rolesActualizados: number; conDeposito: number; fallidos: number }

/** Cuerpo de update-escrow: lo que ya tiene la cuenta segura (leído de la red) con SOLO la cuenta de esta persona cambiada. */
export function cuerpoActualizar(c: Pick<Config, 'plataforma'>, id: string, e: Record<string, unknown>, rol: 'dueno' | 'inquilino', nueva: string) {
  const P = c.plataforma.publicKey(), r = (e.roles ?? {}) as Record<string, string>
  const roles = { approver: r.approver, serviceProvider: r.serviceProvider, platformAddress: r.platformAddress, releaseSigner: r.releaseSigner, disputeResolver: r.disputeResolver, receiver: r.receiver,
    ...(rol === 'dueno' ? { approver: nueva } : { receiver: nueva }) }
  const ms = (Array.isArray(e.milestones) ? e.milestones : []) as { description: string; status?: string; evidence?: string }[]
  return { signer: P, contractId: id, isActive: true, escrow: { signer: P, engagementId: e.engagementId, title: e.title, description: e.description, roles, amount: Number(e.amount), platformFee: Number(e.platformFee ?? 0),
    milestones: ms.map(m => ({ description: m.description, status: m.status ?? 'pending', ...(m.evidence && { evidence: m.evidence }) })), flags: { disputed: false, released: false, resolved: false }, trustline: { address: USDC.issuer, symbol: USDC.code } } }
}

export async function cuentaNueva(c: Config, uid: string, nueva: string, f: typeof fetch = fetch): Promise<ResumenCuentaNueva> {
  exigir(G.test(nueva) && nueva !== c.plataforma.publicKey() && nueva !== c.mediador, 400, 'La cuenta no es válida.')
  const lista = await rest(c, `lk_participantes?usuario=eq.${uid}&select=contrato_id,rol,direccion_stellar,lk_contratos(id,estado,escrow_contract_id,liquidacion_tx)`, {}, f)
  const filas = lista.ok ? await lista.json() as Fila[] : []
  exigir(lista.ok, 502, 'No pudimos leer tus alquileres.')
  // La otra parte de un alquiler no puede quedar con la misma cuenta que esta persona.
  const otras = await rest(c, `lk_participantes?usuario=neq.${uid}&direccion_stellar=eq.${nueva}&select=contrato_id`, {}, f)
  exigir(otras.ok && (await otras.json() as unknown[]).length === 0, 409, 'Esa cuenta ya la usa otra persona.')
  const r = await rest(c, 'rpc/lk_cuenta_nueva', { method: 'POST', body: JSON.stringify({ p_usuario: uid, p_direccion: nueva }) }, f)
  exigir(r.ok, 502, 'No pudimos guardar tu cuenta nueva.')
  const { generacion, sin_escrow } = await r.json() as { generacion: number; sin_escrow: number }
  const res: ResumenCuentaNueva = { generacion, sinEscrow: sin_escrow, rolesActualizados: 0, conDeposito: 0, fallidos: 0 }
  for (const x of filas) {
    const k = x.lk_contratos
    if (!k || x.direccion_stellar === nueva || !k.escrow_contract_id) continue   // sin escrow: ya lo pasó lk_cuenta_nueva (o nunca tuvo cuenta)
    if (!['firmas', 'pendiente_pago'].includes(k.estado) || k.liquidacion_tx) { res.conDeposito++; continue }
    try {
      const e = await leerEscrowTw(c, k.escrow_contract_id, f) as Record<string, unknown> & Awaited<ReturnType<typeof leerEscrowTw>>
      const saldo = e.balance === undefined || e.balance === null || e.balance === '' ? NaN : Number(e.balance)
      if (!(saldo === 0 && !e.flags?.released && !e.flags?.disputed)) { res.conDeposito++; continue }
      const j = await tw(c, '/escrow/single-release/update-escrow', cuerpoActualizar(c, k.escrow_contract_id, e, x.rol, nueva), f, 'PUT')
      await enviar(c, firmarComoPlataforma(c, sinFirmar(j)), f)
      const a = await rest(c, 'rpc/lk_asignar_cuenta', { method: 'POST', body: JSON.stringify({ p_contrato: k.id, p_usuario: uid, p_direccion: nueva }) }, f)
      if (!a.ok) throw new ErrorTw(502, 'No se pudo guardar la cuenta nueva.')
      res.rolesActualizados++
    } catch (err) { res.fallidos++; console.error('cuenta-nueva', k.id, err instanceof Error ? err.message.slice(0, 160) : 'error') }
  }
  return res
}
