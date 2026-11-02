// Escrow del depósito detrás de una sola interfaz:
// - real: Trustless Work en Stellar TESTNET por /api/solo (services/solo.ts). El servidor firma por el dueño de prueba rotulado,
//   por el inquilino de prueba (cuenta custodiada por Lockumi) y por la plataforma; la persona mediadora es simulada, pero su
//   decisión es una transacción real (resolve_dispute).
// - simulado: demo local sin red (sin VITE_TRUSTLESS=1).
// Cada método recibe el alquiler RECIÉN LEÍDO y salta lo que ya quedó registrado en a.red.txs: si un paso falla a la mitad,
// al reintentar no se repite lo hecho. `guardar` anota cada transacción apenas termina.
import type { Alquiler, PasoRed, RedPrueba } from '../types'
import { escrowReal } from '../servidor/config'
import * as solo from './solo'
import { TOPE_USDC, montoValido, MENSAJE_RECARGA } from '../../api/_lib/red'
import { netoTW, netoTrustless } from '../../api/_lib/centimos'
import * as propia from './cuentaPropia'

export type Txs = Partial<Record<PasoRed, string>>
export type Guardar = (txs: Txs, red?: Partial<RedPrueba>) => void
export type Avance = (texto: string) => void
export interface EscrowService {
  real: boolean
  /** Crea la cuenta segura y bloquea el depósito. */
  depositar(a: Alquiler, guardar: Guardar, avance: Avance): Promise<void>
  /** Sin reclamos: el dueño (de prueba) aprueba y Lockumi devuelve el depósito al inquilino. */
  devolver(a: Alquiler, guardar: Guardar, avance: Avance): Promise<{ inquilino: number }>
  /** El dueño abre un reclamo: el depósito queda en disputa. */
  disputar(a: Alquiler, guardar: Guardar, avance: Avance): Promise<void>
  /** Reparto final del reclamo (acuerdo entre las partes o decisión de la persona mediadora). */
  resolver(a: Alquiler, alDueno: number, guardar: Guardar, avance: Avance): Promise<{ dueno: number; inquilino: number }>
}

// ── Monto que va a la cuenta segura ──
// El monto del alquiler. Tope de TOPE_USDC solo con los USDC de prueba que da Lockumi (tesorería); con USDC de la propia cuenta
// el límite es el saldo real (lo revisa el servidor en Horizon) y el máximo de la app.
export const usaCuentaPropia = (a: Pick<Alquiler, 'red'>) => a.red?.inquilinoPrueba === false && !!a.red.inquilino
export const TOPE_DEPOSITO = (a: Pick<Alquiler, 'red'>): number | null => !escrowReal ? null : usaCuentaPropia(a) ? null : TOPE_USDC
export const montoDeposito = (a: Pick<Alquiler, 'monto'>) => a.monto
export const montoPermitido = (m: number, tope: number | null) => !escrowReal ? m > 0 : tope === null ? montoValido(m) : montoValido(m, tope)
/** Comisión de Trustless Work al devolver o repartir (0,3 %). */
export const COMISION = 0.003
export const COMISION_TEXTO = '0,3 %'
const r7 = (n: number) => Math.round(n * 1e7) / 1e7
/** Lo que llega de un monto liberado: exacto, como el contrato de Trustless Work (api/_lib/centimos.ts). Sin red (simulado), sin comisión. */
export const neto = (n: number) => escrowReal ? netoTW(n) : n

/** Mensajes técnicos del servidor (Trustless Work, Horizon, códigos HTTP) → instrucción clara para la persona. */
function claro(e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e)
  console.warn('[Lockumi] paso en la red de prueba:', m)
  if (/Trustless Work|Horizon|respondió \d{3}|rechazó la operación|no aceptó la transacción|bad_?seq/i.test(m))
    return new solo.ErrorSolo('La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.') // LEGAL: revisado A12 (24/10)
  return e instanceof Error ? e : new Error(m)
}
const yaHecho = (e: unknown, re: RegExp) => e instanceof Error && re.test(e.message)

/** Cuenta propia: el servidor arma el depósito para la dirección de la persona, su billetera lo firma y se envía. */
async function depositarPropio(a: Alquiler, monto: number, guardar: Guardar, avance: Avance) {
  const red = a.red!, g = red.inquilino!, firma = red.firma ?? 'cavos'
  try {
    let escrow = red.escrow
    if (!escrow) {
      avance('Revisando tu saldo…')
      const s = await propia.saldoPropio(g) ?? 0
      if (s < monto) throw new solo.ErrorSolo(solo.mensajeSaldoAlPagar(s, monto))
      avance('Preparando al dueño de prueba…')
      const d = await solo.prepararDueno(a.id); guardar({ duenoTrustline: d.trustlineTx ?? undefined }, { dueno: d.dueno })
      avance('Creando la cuenta segura del depósito…')
      const e = await solo.desplegar(a.id, g, monto, 'propia'); escrow = e.escrow; guardar({ escrow: e.tx }, { escrow, permiso: e.permiso })
    }
    let xdr: string
    try { xdr = (await solo.fondearPropio(escrow, g)).unsignedXdr }
    catch (x) { if (yaHecho(x, /ya se pagó/)) { guardar({ deposito: 'ya-pagado' }); return } throw x }
    avance(`Confirma el depósito en ${propia.NOMBRE_FIRMA[firma]}…`)
    const firmada = await propia.firmar(firma, xdr, g)
    avance('Guardando el depósito en la cuenta segura…')
    try { guardar({ deposito: (await solo.enviarDeposito(escrow, firmada)).tx }) }
    catch (x) { if (yaHecho(x, /ya se pagó/)) guardar({ deposito: 'ya-pagado' }); else throw x }
  } catch (x) { throw claro(x) }
}

/** Texto si la tesorería no pudo recargar la cuenta de prueba (lo aprobó Katherine el 20/10/2026). Lo comparten cliente y servidor. */
export { MENSAJE_RECARGA }
/** Recarga la cuenta de prueba hasta `monto`. Si falla, un solo mensaje claro (salvo el de «muchas solicitudes», que ya dice cuánto esperar). */
export async function recargarCuentaPrueba(monto: number) {
  try { return await solo.prepararCuentaPrueba(monto) }
  catch (e) { throw new solo.ErrorSolo(e instanceof Error && /muchas solicitudes/i.test(e.message) ? e.message : MENSAJE_RECARGA) }
}

const real: EscrowService = {
  real: true,
  async depositar(a, guardar, avance) {
    const red = a.red ?? { txs: {} }; if (red.txs.deposito) return
    const monto = montoDeposito(a), tope = TOPE_DEPOSITO(a)
    if (!montoPermitido(monto, tope)) throw new solo.ErrorSolo(tope === null ? `El depósito de prueba es de máximo ${solo.MONTO_MAX_USDC.toLocaleString('es-CR')} USDC.`
      : `Con «Obtener USDC de prueba» el depósito es de máximo ${tope} USDC de prueba. Para un monto mayor, usa USDC de prueba de tu propia cuenta.`)
    if (usaCuentaPropia(a)) return depositarPropio(a, monto, guardar, avance)
    try {
      let g = red.inquilino ?? solo.cuentaPruebaGuardada() ?? ''
      let escrow = red.escrow
      // Siempre, antes de crear la cuenta segura: Lockumi completa la cuenta de prueba hasta el monto del depósito (aunque ya
      // exista y haya gastado su USDC en otro alquiler). Es idempotente: si ya tiene el monto, no se envía nada.
      // También sirve para reintentar un alquiler que guardó una cuenta en 0. El servidor sigue revisando el saldo al crear la cuenta segura.
      if (!escrow) {
        avance('Poniendo USDC de prueba en tu cuenta de prueba…')
        const c = await recargarCuentaPrueba(monto); g = c.g
        guardar({ trustline: c.txs.trustline, compra: c.txs.compra }, { inquilino: g, inquilinoPrueba: true })
      }
      if (!escrow) {
        avance('Preparando al dueño de prueba…')
        const d = await solo.prepararDueno(a.id); guardar({ duenoTrustline: d.trustlineTx ?? undefined }, { dueno: d.dueno, inquilino: g, inquilinoPrueba: true })
        avance('Creando la cuenta segura del depósito…')
        // Con «origen: lockumi» el servidor vuelve a completar la cuenta de prueba justo antes de revisar el saldo (no se envía nada si ya alcanza).
        const e = await solo.desplegar(a.id, g, monto, 'lockumi'); escrow = e.escrow
        guardar({ trustline: e.trustlineTx ?? undefined, compra: e.compraTx ?? undefined, escrow: e.tx }, { escrow, permiso: e.permiso })
      }
      avance('Guardando el depósito en la cuenta segura…')
      try { const f = await solo.fondearPrueba(escrow); guardar({ compra: f.compraTx ?? undefined, deposito: f.tx }) }
      catch (x) { if (yaHecho(x, /ya se pagó/)) guardar({ deposito: 'ya-pagado' }); else throw x }
    } catch (x) { throw claro(x) }
  },
  async devolver(a, guardar, avance) {
    const red = a.red ?? { txs: {} }; const escrow = red.escrow
    if (!escrow) throw new solo.ErrorSolo('Este alquiler no tiene cuenta segura en la red de prueba.')
    try {
      if (!red.txs.aprobacion) {
        avance('El dueño de prueba está aprobando la devolución…')
        const h = await solo.huellaActa((a.salida?.cuartos ?? []).flatMap(c => c.fotos.map(f => f.huella ?? '')))
        const r = await solo.aprobar(escrow, h)
        guardar({ evidencia: r.evidenciaTx ?? undefined, aprobacion: r.aprobacionTx ?? (r.yaAprobado ? 'ya-aprobado' : undefined) })
      }
      if (!red.txs.liberacion) {
        avance('Devolviendo el depósito al inquilino…')
        try { guardar({ liberacion: (await solo.liberar(escrow)).tx }) }
        catch (x) { if (yaHecho(x, /ya se devolvió/)) guardar({ liberacion: 'ya-devuelto' }); else throw x }
      }
    } catch (x) { throw claro(x) }
    return { inquilino: neto(montoDeposito(a)) }
  },
  async disputar(a, guardar, avance) {
    const red = a.red ?? { txs: {} }; if (red.txs.disputa) return
    if (!red.escrow) throw new solo.ErrorSolo('Este alquiler no tiene cuenta segura en la red de prueba.')
    avance('Registrando el reclamo en la cuenta segura…')
    try { const r = await solo.disputar(red.escrow, solo.autorizacion(red)); guardar({ disputa: r.tx ?? 'ya-disputado' }) } catch (x) { throw claro(x) }
  },
  async resolver(a, alDueno, guardar, avance) {
    // Repartos de la fase 1: el dueño recibe entre 0 y lo reclamado, y lo reclamado no supera el depósito (el servidor lo vuelve a revisar).
    const red = a.red ?? { txs: {} }; const m = montoDeposito(a), reclamado = r7(Math.min(a.reclamo?.monto ?? m, m)), d = r7(Math.min(Math.max(alDueno, 0), reclamado))
    if (!red.txs.resolucion) {
      if (!red.escrow) throw new solo.ErrorSolo('Este alquiler no tiene cuenta segura en la red de prueba.')
      avance('Repartiendo el depósito en la red de prueba…')
      try { const r = await solo.resolver(red.escrow, d, reclamado, solo.autorizacion(red)); guardar({ resolucion: r.tx ?? 'ya-resuelto' }) } catch (x) { throw claro(x) }
    }
    if (!escrowReal) return { dueno: d, inquilino: r7(m - d) }
    const [dueno, inquilino] = netoTrustless(d, r7(m - d)).llegan   // la comisión se reparte como en el contrato (resolve_dispute)
    return { dueno, inquilino }
  },
}

const simulado: EscrowService = {
  real: false,
  async depositar(a, guardar) { guardar({}, { escrow: a.red?.escrow ?? 'sim-' + a.id }) },
  async devolver(a) { return { inquilino: a.monto } },
  async disputar() {},
  async resolver(a, alDueno) { return { dueno: alDueno, inquilino: a.monto - alDueno } },
}

export const escrow: EscrowService = escrowReal ? real : simulado
