// Paso 22 · La corrida diaria (/api/borrados → api/_lib/devoluciones.ts) PAGA las devoluciones sin reclamo, aunque nadie abra el
// alquiler, por el mismo camino idempotente que la app (devolverAlInquilino en api/_lib/tw.ts). Mundo simulado con estado: la base
// (bloqueo lk_tomar_pago / lk_anotar_pago_pendiente / lk_soltar_pago con la misma lógica que la migración 20261026000000), el escrow
// en Trustless Work (banderas y saldo) y Horizon. La prueba SQL de la migración está en devoluciones-sql.test.ts.
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal, StrKey } from '@stellar/stellar-sdk'
import { pagarDevoluciones, pagarRepartos } from '../../../api/_lib/devoluciones'
import { atender, hashTx, APROBADO, DEVUELTO_AUTO, liberadoTexto, SEGUNDOS_BLOQUEO_PAGO, TEXTO_REVISAR_PAGO, type Entorno } from '../../../api/_lib/tw'
import { firmado } from '../../services/__tests__/prueba-falsa'

const P = Keypair.random(), M = Keypair.random(), KI = Keypair.random(), LLAVE = 'llave-tw-' + crypto.randomUUID()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: LLAVE, LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(),
  LOCKUMI_TW_MEDIADOR_SECRET: M.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon-' + crypto.randomUUID(), SUPABASE_SERVICE_ROLE_KEY: 'servicio-' + crypto.randomUUID(), CRON_SECRET: 'cron-' + crypto.randomUUID() }
const SECRETOS = [LLAVE, P.secret(), M.secret(), ENV.SUPABASE_SERVICE_ROLE_KEY!, ENV.SUPABASE_ANON_KEY!, ENV.CRON_SECRET!]
let seq = 1
const xdrDe = (origen: string, cid: string) => new TransactionBuilder(new Account(origen, String(seq++)), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: cid, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()

type Fila = { id: string; estado: string; monto: number; direccion: string; escrow_contract_id: string | null; resultado: Record<string, unknown> | null; liquidacion_tx: string | null
  lk_participantes: { rol: string; usuario: string; direccion_stellar: string }[]; reclamo: boolean; actualizado: number
  pago_bloqueo_hasta: number | null; pago_bloqueo_token: string | null; pago_tx_pendiente: string | null; pago_intentos: number; pago_error: string | null; pago_revisar: boolean }
type Escrow = { balance: number; flags: { disputed: boolean; released: boolean; resolved: boolean }; roles: Record<string, string> }
type Op = 'dispute-escrow' | 'release-funds' | 'resolve-dispute'

function mundo() {
  let ahora = Date.parse('2026-10-27T09:00:00Z')
  const filas = new Map<string, Fila>(), escrows = new Map<string, Escrow>(), eventos: { contrato_id: string; texto: string; tx_hash: string | null }[] = []
  const porHash = new Map<string, { cid: string; op: Op }>(), exitosas = new Set<string>()
  const pedidos: { op: Op | 'send' | 'get-escrow'; cid: string }[] = []
  /** Fallas inyectadas: antes de pedir la op a TW (`pedir`), o al enviar (`enviar`: 'antes' = no entra; 'despues' = entra pero responde error). */
  const fallas: { cid: string; op: Op; donde: 'pedir' | 'enviar'; cuando?: 'antes' | 'despues'; mensaje?: string }[] = []
  const pendientes = (n: number) => [...filas.values()].filter(k => k.estado === 'cerrado' && ['automatico', 'devuelto'].includes(String(k.resultado?.via)) && k.escrow_contract_id
    && !k.liquidacion_tx && !k.pago_revisar && (k.pago_bloqueo_hasta === null || k.pago_bloqueo_hasta <= ahora) && !k.reclamo)
    .sort((a, b) => a.actualizado - b.actualizado).slice(0, Math.min(50, Math.max(1, n))).map(k => k.id)
  // 20261027120000: repartos aceptados por pagar (acuerdo, o mediación con las dos aceptaciones), con reclamo
  const repartos = (n: number) => [...filas.values()].filter(k => k.estado === 'cerrado' && (k.resultado?.via === 'acuerdo' || (k.resultado?.via === 'mediacion' && k.resultado?.cierre === 'dos_aceptan'))
    && k.escrow_contract_id && !k.liquidacion_tx && !k.pago_revisar && (k.pago_bloqueo_hasta === null || k.pago_bloqueo_hasta <= ahora))
    .sort((a, b) => a.actualizado - b.actualizado).slice(0, Math.min(50, Math.max(1, n))).map(k => k.id)

  function alquiler(o: Partial<Fila> & { aprobado?: boolean; escrow?: Partial<Escrow> } = {}) {
    const id = crypto.randomUUID(), cid = StrKey.encodeContract(Keypair.random().rawPublicKey()), inq = KI.publicKey()
    const { aprobado, escrow, ...resto } = o
    const k: Fila = { id, estado: 'cerrado', monto: 20, direccion: 'Calle 1', escrow_contract_id: cid, resultado: { via: 'automatico', dueno: 0, inquilino: 20 }, liquidacion_tx: null,
      lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: Keypair.random().publicKey() }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: inq }],
      reclamo: false, actualizado: filas.size, pago_bloqueo_hasta: null, pago_bloqueo_token: null, pago_tx_pendiente: null, pago_intentos: 0, pago_error: null, pago_revisar: false, ...resto }
    filas.set(id, k)
    escrows.set(cid, { balance: k.monto, flags: { disputed: false, released: false, resolved: false }, roles: { receiver: inq, releaseSigner: P.publicKey(), disputeResolver: M.publicKey() }, ...escrow })
    if (aprobado) eventos.push({ contrato_id: id, texto: APROBADO, tx_hash: 'f'.repeat(64) })
    return k
  }
  const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
  const f = (async (u: string | URL, init?: RequestInit) => {
    await Promise.resolve()   // deja intercalar pedidos concurrentes
    const url = decodeURIComponent(String(u)), metodo = init?.method ?? 'GET', b = init?.body ? JSON.parse(String(init.body)) : {}
    const q = (n: string) => url.match(new RegExp(`[?&]${n}=([^&]*)`))?.[1]
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-inq' })
    if (url.includes('/rest/v1/rpc/')) {
      const fn = url.split('/rpc/')[1], k = filas.get(b.p_contrato)
      if (fn === 'lk_devoluciones_pendientes') return ok(pendientes(b.p_limite ?? 5))
      if (fn === 'lk_repartos_pendientes') return ok(repartos(b.p_limite ?? 5))
      if (fn === 'lk_tomar_pago') {
        const libre = k && (pendientes(1e9).includes(k.id) || repartos(1e9).includes(k.id))
        if (libre) Object.assign(k, { pago_bloqueo_hasta: ahora + b.p_segundos * 1000, pago_bloqueo_token: b.p_token, pago_intentos: k.pago_intentos + 1 })
        return ok(!!libre)
      }
      if (fn === 'lk_anotar_pago_pendiente') {
        const vale = !!k && !k.liquidacion_tx && k.pago_bloqueo_token === b.p_token && (k.pago_bloqueo_hasta ?? 0) > ahora
        if (vale) k!.pago_tx_pendiente = b.p_tx
        return ok(vale)
      }
      if (fn === 'lk_soltar_pago') {
        if (k && k.pago_bloqueo_token === b.p_token) {
          if (!b.p_esperar) Object.assign(k, { pago_bloqueo_hasta: null, pago_bloqueo_token: null })
          k.pago_error = b.p_error ? String(b.p_error).slice(0, 300) : null; k.pago_revisar ||= !!b.p_revisar
        }
        return new Response(null, { status: 204 })
      }
      if (fn === 'lk_vencimientos' || fn.startsWith('lk_')) return ok(null)
    }
    if (url.includes('/rest/v1/lk_contratos?')) {
      const k = filas.get(q('id')!.replace('eq.', ''))!
      if (metodo === 'PATCH') { if (q('liquidacion_tx') === 'is.null' && k.liquidacion_tx) return new Response(null, { status: 204 }); Object.assign(k, b); return new Response(null, { status: 204 }) }
      if (url.includes('select=liquidacion_tx,pago_tx_pendiente')) return ok([{ liquidacion_tx: k.liquidacion_tx, pago_tx_pendiente: k.pago_tx_pendiente, pago_revisar: k.pago_revisar }])
      return ok([{ id: k.id, estado: k.estado, monto: k.monto, direccion: k.direccion, escrow_contract_id: k.escrow_contract_id, resultado: k.resultado, liquidacion_tx: k.liquidacion_tx, lk_participantes: k.lk_participantes }])
    }
    if (url.includes('/rest/v1/lk_eventos')) {
      if (metodo === 'POST') { eventos.push(b); return new Response(null, { status: 201 }) }
      const id = q('contrato_id')!.replace('eq.', ''), texto = q('texto')?.replace('eq.', ''), tx = q('tx_hash')?.replace('eq.', '')
      return ok(eventos.filter(e => e.contrato_id === id && (!texto || e.texto === texto) && (!tx || e.tx_hash === tx)))
    }
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.includes('/helper/get-escrow-by-contract-ids')) {
      const cid = q('contractIds\\[\\]')!; pedidos.push({ op: 'get-escrow', cid }); const e = escrows.get(cid)!
      return ok([{ contractId: cid, balance: e.balance, roles: e.roles, flags: { ...e.flags } }])
    }
    const m = url.match(/\/escrow\/single-release\/(dispute-escrow|release-funds|resolve-dispute)$/)
    if (m) {
      const op = m[1] as Op, cid = b.contractId; pedidos.push({ op, cid })
      const i = fallas.findIndex(x => x.cid === cid && x.op === op && x.donde === 'pedir')
      if (i >= 0) { const x = fallas.splice(i, 1)[0]; return new Response(JSON.stringify({ message: x.mensaje ?? 'caída' }), { status: 500 }) }
      const xdr = xdrDe(op === 'resolve-dispute' ? b.disputeResolver : (b.signer ?? b.releaseSigner), cid); porHash.set(hashTx(xdr), { cid, op })
      return ok({ unsignedTransaction: xdr })
    }
    if (url.endsWith('/helper/send-transaction')) {
      const h = hashTx(b.signedXdr), t = porHash.get(h)!; pedidos.push({ op: 'send', cid: t.cid })
      const e = escrows.get(t.cid)!
      const i = fallas.findIndex(x => x.cid === t.cid && x.op === t.op && x.donde === 'enviar'), falla = i >= 0 ? fallas.splice(i, 1)[0] : null
      if (falla?.cuando === 'antes') return new Response('{"message":"timeout"}', { status: 504 })
      if (exitosas.has(h)) return new Response('{"message":"tx_already_applied"}', { status: 400 })
      if (t.op === 'dispute-escrow') { if (e.flags.disputed || e.flags.released || e.flags.resolved) return new Response('{"message":"invalid state"}', { status: 400 }); e.flags.disputed = true }
      else if (t.op === 'release-funds') { if (e.flags.disputed || e.flags.released || e.flags.resolved || !e.balance) return new Response('{"message":"invalid state"}', { status: 400 }); e.flags.released = true; e.balance = 0 }
      else { if (!e.flags.disputed || e.flags.resolved) return new Response('{"message":"invalid state"}', { status: 400 }); e.flags.resolved = true; e.flags.disputed = false; e.balance = 0 }
      exitosas.add(h)
      if (falla?.cuando === 'despues') return new Response('{"message":"timeout"}', { status: 504 })
      return ok({ status: 'SUCCESS' })
    }
    if (url.startsWith('https://horizon-testnet.stellar.org/transactions/')) {
      const h = url.split('/').pop()!; return exitosas.has(h) ? ok({ hash: h, successful: true }) : new Response('{}', { status: 404 })
    }
    return new Response('no', { status: 404 })
  }) as typeof fetch
  const envios = (cid: string, op?: Op) => pedidos.filter(p => p.cid === cid && (op ? p.op === op : p.op === 'send')).length
  const escrituras = () => pedidos.filter(p => p.op !== 'get-escrow').length
  return { f, filas, escrows, eventos, fallas, pedidos, envios, escrituras, avanzar: (s: number) => { ahora += s * 1000 }, ahora: () => ahora, alquiler }
}
const correr = (w: ReturnType<typeof mundo>, env: Entorno = ENV, o: Parameters<typeof pagarDevoluciones>[1] = {}) => {
  const logs: string[] = []
  return pagarDevoluciones(env, { log: m => logs.push(m), ...o }, w.f).then(r => ({ r: r as Exclude<typeof r, { apagado: true } | { error: string }>, logs }))
}
const HEX = /^[0-9a-f]{64}$/

describe('paso 22 · la corrida diaria paga la devolución sin reclamo', () => {
  it('paga sola los casos vencidos sin reclamo: sin la aprobación → disputa + 100 % al inquilino; con ella → liberar', async () => {
    const w = mundo(), a = w.alquiler(), d = w.alquiler({ resultado: { via: 'devuelto', dueno: 0, inquilino: 20 }, aprobado: true }), x = w.alquiler({ aprobado: true })
    const { r } = await correr(w)
    expect(r.pagados.map(p => [p.contrato, p.modo])).toEqual([[a.id, 'devolver-automatico'], [d.id, 'liberar'], [x.id, 'liberar']])
    for (const k of [a, d, x]) { expect(k.liquidacion_tx).toMatch(HEX); expect(w.escrows.get(k.escrow_contract_id!)!.balance).toBe(0); expect(k.pago_bloqueo_token).toBeNull() }
    expect(w.eventos.filter(e => e.contrato_id === a.id && e.texto === DEVUELTO_AUTO)).toEqual([{ contrato_id: a.id, texto: DEVUELTO_AUTO, tx_hash: a.liquidacion_tx }])
    expect(w.eventos.filter(e => e.contrato_id === d.id && e.texto === liberadoTexto(d))).toHaveLength(1)
    expect(w.envios(a.escrow_contract_id!, 'dispute-escrow')).toBe(1); expect(w.envios(d.escrow_contract_id!, 'dispute-escrow')).toBe(0)
  })

  it('solo los casos cerrados sin reclamo y sin pagar: nada en ventana, con reclamo, mediación, acuerdo, ya pagados o sin escrow', async () => {
    const w = mundo()
    const otros = [w.alquiler({ estado: 'ventana_reclamo', resultado: null }), w.alquiler({ reclamo: true }), w.alquiler({ estado: 'reclamo', resultado: null }),
      w.alquiler({ resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 5, inquilino: 15 } }), w.alquiler({ resultado: { via: 'acuerdo', dueno: 5, inquilino: 15 } }),
      w.alquiler({ liquidacion_tx: 'a'.repeat(64) }), w.alquiler({ escrow_contract_id: null })]
    const bien = w.alquiler()
    const { r } = await correr(w)
    expect(r.pendientes).toBe(1); expect(r.pagados.map(p => p.contrato)).toEqual([bien.id])
    for (const k of otros) if (k.escrow_contract_id) expect(w.pedidos.filter(p => p.cid === k.escrow_contract_id)).toEqual([])
  })

  it('no paga dos veces: dos corridas y la app a la vez → una sola disputa y una sola resolución', async () => {
    const w = mundo(), a = w.alquiler()
    const [r1, r2, app] = await Promise.all([correr(w), correr(w), atender(ENV, firmado({ accion: 'devolver-automatico', contrato: a.id }, KI), 'Bearer t', w.f)])
    expect(w.envios(a.escrow_contract_id!, 'dispute-escrow')).toBe(1); expect(w.envios(a.escrow_contract_id!, 'resolve-dispute')).toBe(1)
    expect(w.eventos.filter(e => e.texto === DEVUELTO_AUTO)).toHaveLength(1)
    const pagos = [...r1.r.pagados, ...r2.r.pagados].length + (app.tx && !app.yaExistia ? 1 : 0)
    expect(pagos).toBe(1)
    expect(app.enCurso || app.tx === a.liquidacion_tx).toBeTruthy()   // la app nunca ve un error: «en curso» o el pago hecho
  })

  it('la app durante la corrida ve «en curso» (sin error ni texto nuevo) y después el pago ya hecho', async () => {
    const w = mundo(), a = w.alquiler()
    a.pago_bloqueo_hasta = w.ahora() + 300_000; a.pago_bloqueo_token = crypto.randomUUID()   // la corrida lo tiene tomado
    expect(await atender(ENV, firmado({ accion: 'devolver-automatico', contrato: a.id }, KI), 'Bearer t', w.f)).toEqual({ enCurso: true })
    expect(w.escrituras()).toBe(0)
    a.pago_bloqueo_hasta = null; a.pago_bloqueo_token = null
    const { r } = await correr(w); expect(r.pagados).toHaveLength(1)
    expect(await atender(ENV, firmado({ accion: 'devolver-automatico', contrato: a.id }, KI), 'Bearer t', w.f)).toEqual({ tx: a.liquidacion_tx, yaExistia: true })
  })

  it('un reintento no vuelve a pagar: la segunda corrida no pide nada a Trustless Work', async () => {
    const w = mundo(); w.alquiler(); w.alquiler({ aprobado: true })
    await correr(w); const antes = w.pedidos.length
    const { r } = await correr(w)
    expect(r).toEqual({ pendientes: 0, pagados: [], enCurso: [], yaPagados: [], revisar: [], fallidos: [], sinTiempo: 0 })
    expect(w.pedidos.length).toBe(antes)
  })

  it('un caso que falla no frena a los demás; el error queda sin secretos y la próxima corrida lo reintenta', async () => {
    const w = mundo(), a = w.alquiler(), b = w.alquiler(), c = w.alquiler({ aprobado: true })
    w.fallas.push({ cid: a.escrow_contract_id!, op: 'dispute-escrow', donde: 'pedir', mensaje: `caída con ${LLAVE} y ${P.secret()} y ${M.secret()} y eyJabc.def.ghi` })
    const { r, logs } = await correr(w)
    expect(r.pagados.map(p => p.contrato)).toEqual([b.id, c.id])
    expect(r.fallidos.map(x => x.contrato)).toEqual([a.id])
    const todo = JSON.stringify(r) + logs.join('\n') + a.pago_error
    for (const s of SECRETOS) expect(todo).not.toContain(s)
    expect(todo).not.toContain('eyJabc'); expect(a.pago_error).toContain('[secreto]')
    expect(a.liquidacion_tx).toBeNull(); expect(a.pago_bloqueo_token).toBeNull()   // no se envió nada: se suelta enseguida
    const { r: r2 } = await correr(w)
    expect(r2.pagados.map(p => p.contrato)).toEqual([a.id]); expect(w.envios(a.escrow_contract_id!, 'dispute-escrow')).toBe(2)   // el pedido caído + el bueno
    expect(w.envios(a.escrow_contract_id!)).toBe(2)   // envíos a la red: una disputa y una resolución
  })

  it('corte después de abrir la disputa: espera el bloqueo y el reintento solo resuelve (no abre otra disputa)', async () => {
    const w = mundo(), a = w.alquiler(), cid = a.escrow_contract_id!
    w.fallas.push({ cid, op: 'resolve-dispute', donde: 'pedir' })
    const { r } = await correr(w)
    expect(r.fallidos.map(x => x.contrato)).toEqual([a.id]); expect(w.escrows.get(cid)!.flags.disputed).toBe(true)
    expect(a.pago_bloqueo_hasta).toBeGreaterThan(w.ahora())   // ya se envió algo: el bloqueo se mantiene hasta que venza
    expect((await correr(w)).r.pendientes).toBe(0)
    w.avanzar(SEGUNDOS_BLOQUEO_PAGO + 1)
    const { r: r2 } = await correr(w)
    expect(r2.pagados.map(p => p.contrato)).toEqual([a.id])
    expect(w.envios(cid, 'dispute-escrow')).toBe(1); expect(w.envios(cid, 'resolve-dispute')).toBe(2)
    expect(w.pedidos.filter(p => p.cid === cid && p.op === 'send')).toHaveLength(2)
  })

  it('el pago entró pero la respuesta se perdió: el reintento lo confirma en Horizon y solo lo anota (no vuelve a pagar)', async () => {
    const w = mundo(), a = w.alquiler({ aprobado: true }), cid = a.escrow_contract_id!
    w.fallas.push({ cid, op: 'release-funds', donde: 'enviar', cuando: 'despues' })
    const { r } = await correr(w)
    expect(r.fallidos).toHaveLength(1); expect(a.liquidacion_tx).toBeNull(); expect(a.pago_tx_pendiente).toMatch(HEX)
    w.avanzar(SEGUNDOS_BLOQUEO_PAGO + 1)
    const { r: r2 } = await correr(w)
    expect(r2.pagados).toEqual([{ contrato: a.id, modo: 'liberar', tx: a.pago_tx_pendiente, recuperado: true }])
    expect(a.liquidacion_tx).toBe(a.pago_tx_pendiente); expect(w.envios(cid, 'release-funds')).toBe(1)
    expect(w.eventos.filter(e => e.contrato_id === a.id && e.tx_hash === a.liquidacion_tx)).toHaveLength(1)
  })

  it('si el escrow ya está pagado sin que tengamos la transacción, o no cuadra con el alquiler, no se paga: queda para revisar', async () => {
    const w = mundo()
    const pagado = w.alquiler({ escrow: { balance: 0, flags: { disputed: false, released: true, resolved: false } } })
    const otro = w.alquiler(); w.escrows.get(otro.escrow_contract_id!)!.roles.receiver = Keypair.random().publicKey()
    const saldo = w.alquiler(); w.escrows.get(saldo.escrow_contract_id!)!.balance = 7
    const res = w.alquiler({ aprobado: true }); w.escrows.get(res.escrow_contract_id!)!.roles.disputeResolver = Keypair.random().publicKey()   // liberar no usa al mediador
    const { r, logs } = await correr(w)
    expect(r.revisar.map(x => x.contrato).sort()).toEqual([pagado.id, otro.id, saldo.id].sort())
    expect(r.pagados.map(p => p.contrato)).toEqual([res.id])
    expect(w.pedidos.filter(p => p.op !== 'get-escrow' && p.cid !== res.escrow_contract_id)).toEqual([])
    for (const k of [pagado, otro, saldo]) { expect(k.pago_revisar).toBe(true); expect(k.liquidacion_tx).toBeNull() }
    expect(logs.join('\n')).toMatch(/para revisar/)
    expect((await correr(w)).r.pendientes).toBe(0)   // no se reintenta solo
    await expect(atender(ENV, firmado({ accion: 'devolver-automatico', contrato: otro.id }, KI), 'Bearer t', w.f)).rejects.toMatchObject({ estado: 409, message: TEXTO_REVISAR_PAGO })
  })

  it('respeta el tope por corrida y el tiempo: lo que no entra queda para la próxima', async () => {
    const w = mundo(); for (let i = 0; i < 7; i++) w.alquiler()
    const { r } = await correr(w, { ...ENV, DEVOLUCIONES_POR_CORRIDA: '3' })
    expect(r.pendientes).toBe(3); expect(r.pagados).toHaveLength(3)
    let t = 0; const reloj = () => (t += 12_000)   // cada caso «tarda» 12 s
    const { r: r2 } = await correr(w, { ...ENV, DEVOLUCIONES_SEGUNDOS: '30' }, { reloj, inicio: 0 })
    expect(r2.pendientes).toBe(4); expect(r2.pagados).toHaveLength(2); expect(r2.sinTiempo).toBe(2)
    const { r: r3 } = await correr(w); expect(r3.pagados).toHaveLength(2)
    expect([...w.filas.values()].every(k => HEX.test(k.liquidacion_tx ?? ''))).toBe(true)
    expect((await correr(w, { ...ENV, DEVOLUCIONES_POR_CORRIDA: '999' })).r.pendientes).toBe(0)
  })

  it('DEVOLUCION_CRON=0 la apaga; sin configuración o sin la migración no paga nada y lo dice sin secretos', async () => {
    const w = mundo(); w.alquiler()
    expect(await pagarDevoluciones({ ...ENV, DEVOLUCION_CRON: '0' }, {}, w.f)).toEqual({ apagado: true })
    const sin = await pagarDevoluciones({ ...ENV, TRUSTLESS_WORK_API_KEY: undefined }, {}, w.f) as { error: string }
    expect(sin.error).toMatch(/TRUSTLESS_WORK_API_KEY/)
    const sinMig = await pagarDevoluciones(ENV, { log: () => {} }, (async () => new Response('{}', { status: 404 })) as typeof fetch) as { error: string }
    expect(sinMig.error).toMatch(/20261026000000/)
    for (const s of SECRETOS) expect(JSON.stringify([sin, sinMig])).not.toContain(s)
    expect(w.escrituras()).toBe(0)
  })

  it('el bloqueo dura más que cualquier función de Vercel que pague (si pasan a Pro y suben maxDuration, revisar)', async () => {
    const { readFileSync } = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const v = JSON.parse(readFileSync('vercel.json', 'utf8')) as { functions?: Record<string, { maxDuration?: number }>; crons?: { path: string }[] }
    const max = Math.max(60, ...Object.values(v.functions ?? {}).map(x => x.maxDuration ?? 0))
    expect(SEGUNDOS_BLOQUEO_PAGO).toBeGreaterThan(max)
    expect(v.crons?.some(c => c.path === '/api/borrados')).toBe(true)
  })
})

// 27/10/2026 · b10557f9: el inquilino aceptó el reclamo, la base cerró por acuerdo y el pago falló (401). «cerrado» sin liquidacion_tx
// es «por pagar»: la corrida (o operación con /api/borrados?reparto=<id>) lo paga por el mismo camino idempotente que la app.
describe('27/10 · repartos aceptados que quedaron sin pagar', () => {
  const acuerdo = (w: ReturnType<typeof mundo>, o: Partial<Fila> = {}) => w.alquiler({ monto: 10, reclamo: true, resultado: { via: 'acuerdo', dueno: 4, inquilino: 6 }, ...o })
  const repartirApp = (w: ReturnType<typeof mundo>, id: string) => atender(ENV, firmado({ accion: 'repartir', contrato: id }, KI), 'Bearer t', w.f)
  it('la corrida paga el reparto 4/6 de un acuerdo y el de una mediación con las dos aceptaciones; guarda liquidacion_tx', async () => {
    const w = mundo(), a = acuerdo(w), m = w.alquiler({ reclamo: true, resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 5, inquilino: 15 } })
    const r = await pagarRepartos(ENV, { log: () => {} }, w.f) as Exclude<Awaited<ReturnType<typeof pagarRepartos>>, { apagado: true } | { error: string } | { pendientes: string[] }>
    expect(r.pagados.map(p => p.contrato)).toEqual([a.id, m.id])
    for (const k of [a, m]) { expect(k.liquidacion_tx).toMatch(HEX); expect(w.escrows.get(k.escrow_contract_id!)!.balance).toBe(0); expect(k.pago_bloqueo_token).toBeNull()
      expect(w.envios(k.escrow_contract_id!, 'dispute-escrow')).toBe(1); expect(w.envios(k.escrow_contract_id!, 'resolve-dispute')).toBe(1) }
    expect(w.eventos.some(e => e.contrato_id === a.id && e.tx_hash === a.liquidacion_tx && /: 3,988 USDC de prueba al dueño y 5,982 USDC de prueba al inquilino \(cada monto menos el 0,3 % de comisión de Trustless Work\)/.test(e.texto))).toBe(true)
    expect((await pagarDevoluciones(ENV, {}, w.f) as { pendientes: number }).pendientes).toBe(0)   // la corrida de devoluciones no los toca
  })
  it('la corrida de /api/borrados los paga sola (REPARTOS_CRON=0 la apaga) y no toca casos abiertos ni en mediación', async () => {
    const w = mundo(), a = acuerdo(w), abierto = w.alquiler({ estado: 'mediacion', resultado: null, reclamo: true }), sinDos = w.alquiler({ reclamo: true, resultado: { via: 'mediacion', dueno: 5, inquilino: 15 } })
    expect(await pagarRepartos({ ...ENV, REPARTOS_CRON: '0' }, {}, w.f)).toEqual({ apagado: true }); expect(w.escrituras()).toBe(0)
    const { ejecutarBorrados } = await import('../../../api/_lib/borrados')
    const r = await ejecutarBorrados(ENV as Record<string, string>, w.f)
    expect((r.repartos as { pagados: unknown[] }).pagados).toHaveLength(1); expect(a.liquidacion_tx).toMatch(HEX)
    for (const k of [abierto, sinDos]) expect(w.pedidos.filter(p => p.cid === k.escrow_contract_id)).toEqual([])
  })
  it('operación: listar no paga nada; pagar UN id paga solo ese; un id mal formado no hace nada', async () => {
    const w = mundo(), a = acuerdo(w), b = acuerdo(w)
    expect(await pagarRepartos({ ...ENV, REPARTOS_CRON: '0' }, { listar: true }, w.f)).toEqual({ pendientes: [a.id, b.id] }); expect(w.escrituras()).toBe(0)
    const r = await pagarRepartos({ ...ENV, REPARTOS_CRON: '0' }, { ids: [b.id], log: () => {} }, w.f) as { pagados: { contrato: string }[] }
    expect(r.pagados.map(p => p.contrato)).toEqual([b.id]); expect(a.liquidacion_tx).toBeNull()
    expect(await pagarRepartos(ENV, { ids: ["x' or 1=1"] }, w.f)).toEqual({ error: 'El id del alquiler no es válido.' })
  })
  it('no paga dos veces: dos corridas y la app a la vez → una disputa y una resolución; el reintento ya pagado no pide nada', async () => {
    const w = mundo(), a = acuerdo(w), cid = a.escrow_contract_id!
    const res = await Promise.allSettled([pagarRepartos(ENV, { log: () => {} }, w.f), pagarRepartos(ENV, { log: () => {} }, w.f), repartirApp(w, a.id)])
    expect(w.envios(cid, 'dispute-escrow')).toBe(1); expect(w.envios(cid, 'resolve-dispute')).toBe(1)
    const app = res[2]; if (app.status === 'rejected') expect(app.reason).toMatchObject({ estado: 409, message: 'El reparto ya se está pagando. Vuelve a abrir el alquiler en un momento.' })
    const antes = w.pedidos.length
    expect(await repartirApp(w, a.id)).toEqual({ tx: a.liquidacion_tx, yaExistia: true }); expect(w.pedidos.length).toBe(antes)
  })
  it('corte después de abrir la disputa: espera el bloqueo y el reintento solo resuelve; si la respuesta se pierde, lo confirma en Horizon', async () => {
    const w = mundo(), a = acuerdo(w), cid = a.escrow_contract_id!
    w.fallas.push({ cid, op: 'resolve-dispute', donde: 'pedir' })
    const r1 = await pagarRepartos(ENV, { log: () => {} }, w.f) as { fallidos: unknown[] }
    expect(r1.fallidos).toHaveLength(1); expect(a.liquidacion_tx).toBeNull(); expect(w.escrows.get(cid)!.flags.disputed).toBe(true)
    w.avanzar(SEGUNDOS_BLOQUEO_PAGO + 1)
    w.fallas.push({ cid, op: 'resolve-dispute', donde: 'enviar', cuando: 'despues' })
    await pagarRepartos(ENV, { log: () => {} }, w.f); expect(a.liquidacion_tx).toBeNull(); expect(a.pago_tx_pendiente).toMatch(HEX)
    w.avanzar(SEGUNDOS_BLOQUEO_PAGO + 1)
    const r3 = await pagarRepartos(ENV, { log: () => {} }, w.f) as { pagados: { recuperado?: true }[] }
    expect(r3.pagados[0].recuperado).toBe(true); expect(a.liquidacion_tx).toBe(a.pago_tx_pendiente)
    expect(w.envios(cid, 'dispute-escrow')).toBe(1); expect(w.envios(cid)).toBe(2)   // a la red: una disputa y una resolución
  })
  it('si el escrow no cuadra (otro saldo o ya pagado sin la tx) no paga: queda para revisar y la app ve el texto de siempre', async () => {
    const w = mundo(), a = acuerdo(w); w.escrows.get(a.escrow_contract_id!)!.balance = 7
    const r = await pagarRepartos(ENV, { log: () => {} }, w.f) as { revisar: { contrato: string }[] }
    expect(r.revisar.map(x => x.contrato)).toEqual([a.id]); expect(a.pago_revisar).toBe(true); expect(w.escrituras()).toBe(0)
    await expect(repartirApp(w, a.id)).rejects.toMatchObject({ estado: 409, message: TEXTO_REVISAR_PAGO })
  })
})
