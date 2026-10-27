// PR #22 · /api/tw «repartir»: pago en la red de prueba de los cierres de dos personas por acuerdo (el inquilino aceptó el reclamo)
// y por mediación con las dos aceptaciones. Mismo flujo single-release que la devolución automática: la plataforma abre la disputa
// y la cuenta que resuelve disputas (LOCKUMI_TW_MEDIADOR_*) la resuelve con el reparto aceptado. Trustless Work cobra su comisión
// de 0,3 % también al resolver. Nunca con la Regla 6.5.1 (Legal, 25/10, 1:50 a. m., opción 1) ni con un caso que el servidor no cerró.
// Fuente: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/resolving-disputes
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, repartoAceptado, REPARTO_DISPUTA, type Entorno } from '../../../api/_lib/tw'
import { firmado } from './prueba-falsa'

const P = Keypair.random(), M = Keypair.random(), KD = Keypair.random(), KI = Keypair.random(), DUENO = KD.publicKey(), INQ = KI.publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(),
  LOCKUMI_TW_MEDIADOR_SECRET: M.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()
const partes = [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: INQ }]
const mediado = { id: ID, monto: 100, direccion: 'Calle 1', escrow_contract_id: CID, liquidacion_tx: null, estado: 'cerrado',
  resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 30, inquilino: 70 }, lk_participantes: partes }
const acordado = { ...mediado, resultado: { via: 'acuerdo', dueno: 40, inquilino: 60 } }
const MED = '99999999-8888-4777-8666-555555555555', OTRO = '99999999-8888-4777-8666-444444444444'
const acciones = (llamadas: { url: string }[]) => llamadas.map(l => l.url).filter(u => /dispute-escrow|resolve-dispute|send-transaction/.test(u)).map(u => u.split('/').pop())

// 27/10/2026: el bloqueo es el del paso 22 (lk_tomar_pago con vencimiento, migración 20261027120000) y antes de pagar se lee el
// escrow en Trustless Work: si la disputa ya está abierta en la cadena, el reintento solo resuelve.
function simular(contrato: Record<string, unknown>, o: { eventos?: { texto: string }[]; bloqueo?: boolean; fallaResolver?: boolean; disputado?: boolean; mediadores?: string[]; uid?: string } = {}) {
  const { eventos = [], bloqueo = true, fallaResolver = false, disputado = false, mediadores = [], uid = 'u-inq' } = o
  const llamadas: { url: string; metodo?: string; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, metodo: init?.method, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.includes('/rest/v1/lk_mediadores?')) return ok(mediadores.filter(m => url.includes('usuario=eq.' + m)).map(usuario => ({ usuario })))
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && url.includes('select=liquidacion_tx,pago_tx_pendiente')) return ok([{ liquidacion_tx: null, pago_tx_pendiente: null, pago_revisar: false }])
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    if (url.endsWith('/rpc/lk_tomar_pago')) return ok(bloqueo)
    if (url.endsWith('/rpc/lk_anotar_pago_pendiente')) return ok(true)
    if (url.includes('/rest/v1/lk_eventos?') && !init?.method) { const t = new URL(url).searchParams.get('texto'); return ok(t ? eventos.filter(e => 'eq.' + e.texto === t) : eventos) }
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.includes('/helper/get-escrow-by-contract-ids')) return ok([{ contractId: CID, balance: contrato.monto, roles: { receiver: INQ, releaseSigner: P.publicKey(), disputeResolver: M.publicKey() }, flags: { disputed: disputado, released: false, resolved: false } }])
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS' })
    if (url.endsWith('/dispute-escrow')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('/resolve-dispute')) return fallaResolver ? new Response('{"message":"x"}', { status: 500 }) : ok({ unsignedTransaction: xdrDe(M.publicKey()) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}
const repartir = (k: Record<string, unknown>, o?: Parameters<typeof simular>[1]) => { const s = simular(k, o); return { ...s, r: atender(ENV, firmado({ accion: 'repartir', contrato: ID }, KI), 'Bearer t', s.f) } }

describe('/api/tw «repartir» · pago en la red de los cierres de dos personas', () => {
  it('mediación con las dos aceptaciones: la plataforma abre la disputa y la cuenta mediadora resuelve con el reparto aceptado', async () => {
    const { r, llamadas } = repartir(mediado)
    const x = await r
    expect(x.tx).toMatch(/^[0-9a-f]{64}$/); expect(x.disputaTx).toMatch(/^[0-9a-f]{64}$/)
    expect(llamadas.find(l => l.url.endsWith('/escrow/single-release/dispute-escrow'))!.cuerpo).toEqual({ contractId: CID, signer: P.publicKey() })
    expect(llamadas.find(l => l.url.endsWith('/escrow/single-release/resolve-dispute'))!.cuerpo).toEqual({ contractId: CID, disputeResolver: M.publicKey(),
      distributions: [{ address: DUENO, amount: 30 }, { address: INQ, amount: 70 }] })
    expect(acciones(llamadas)).toEqual(['dispute-escrow', 'send-transaction', 'resolve-dispute', 'send-transaction'])
    const enviadas = llamadas.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => TransactionBuilder.fromXDR(String(l.cuerpo!.signedXdr), Networks.TESTNET))
    expect(enviadas.map(t => (t as unknown as { source: string }).source)).toEqual([P.publicKey(), M.publicKey()])
    // Guarda el hash en liquidacion_tx y deja el evento con la comisión de 0,3 % al resolver.
    const guardado = llamadas.find(l => l.metodo === 'PATCH' && l.cuerpo?.liquidacion_tx === x.tx); expect(guardado).toBeTruthy()
    const ev = llamadas.filter(l => l.url.endsWith('/rest/v1/lk_eventos') && l.metodo === 'POST').map(l => String(l.cuerpo!.texto))
    expect(ev).toContain(REPARTO_DISPUTA)
    expect(ev.some(t => /30,00 USDC de prueba al dueño y 70,00 USDC de prueba al inquilino.*0,3 %/.test(t))).toBe(true)
    expect(JSON.stringify(x)).not.toContain(M.secret())
  })
  it('acuerdo (el inquilino aceptó el reclamo): mismo flujo con su reparto', async () => {
    const { r, llamadas } = repartir(acordado); await r
    expect(llamadas.find(l => l.url.endsWith('/resolve-dispute'))!.cuerpo!.distributions).toEqual([{ address: DUENO, amount: 40 }, { address: INQ, amount: 60 }])
  })
  it('una parte con 0 no va en los repartos (Trustless Work exige montos positivos); la suma es todo el depósito', () => {
    expect(repartoAceptado({ ...mediado, resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 0, inquilino: 100 } } as never)).toEqual([{ address: INQ, amount: 100 }])
    expect(repartoAceptado({ ...acordado, resultado: { via: 'acuerdo', dueno: 100, inquilino: 0 } } as never)).toEqual([{ address: DUENO, amount: 100 }])
  })
  it.each([
    ['Regla 6.5.1 (opción 1 de Legal)', { ...mediado, resultado: { via: 'regla_651', dueno: 30, inquilino: 70 } }],
    ['mediación sin las dos aceptaciones', { ...mediado, resultado: { via: 'mediacion', dueno: 30, inquilino: 70 } }],
    ['cierre automático (va por «devolver-automatico» o «liberar»)', { ...mediado, resultado: { via: 'automatico', dueno: 0, inquilino: 100 } }],
    ['caso en mediación', { ...mediado, estado: 'mediacion', resultado: null }],
    ['caso en reclamo', { ...mediado, estado: 'reclamo', resultado: null }],
    ['reparto que no suma el depósito', { ...mediado, resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 30, inquilino: 80 } }],
    ['monto negativo', { ...acordado, resultado: { via: 'acuerdo', dueno: -1, inquilino: 101 } }],
    ['sin cuenta segura', { ...mediado, escrow_contract_id: null }],
  ])('no paga si no lo cerró el servidor por acuerdo o con las dos aceptaciones: %s', async (_n, k) => {
    const { r, llamadas } = repartir(k)
    await expect(r).rejects.toMatchObject({ estado: 409 })
    expect(llamadas.some(l => l.url.includes('dispute') || l.metodo === 'PATCH' || l.url.includes('lk_tomar_pago'))).toBe(false)
  })
  it('idempotente: con el hash guardado no repite; si otro pedido tiene el bloqueo, no abre otra disputa', async () => {
    const a = repartir({ ...mediado, liquidacion_tx: 'a'.repeat(64) })
    expect(await a.r).toEqual({ tx: 'a'.repeat(64), yaExistia: true })
    expect(a.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
    const b = repartir({ ...mediado, liquidacion_tx: 'en-curso' })
    await expect(b.r).rejects.toMatchObject({ estado: 409 }); expect(b.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
    const c = repartir(mediado, { bloqueo: false })
    await expect(c.r).rejects.toMatchObject({ estado: 409 }); expect(c.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
  })
  it('si falla al resolver, suelta el bloqueo y el reintento no abre otra disputa (la cadena dice que ya está abierta)', async () => {
    const a = repartir(mediado, { fallaResolver: true })
    await expect(a.r).rejects.toMatchObject({ estado: 502 })
    const soltar = a.llamadas.find(l => l.url.endsWith('/rpc/lk_soltar_pago'))!.cuerpo!
    expect(soltar).toMatchObject({ p_contrato: ID, p_revisar: false, p_esperar: true })   // ya se envió la disputa: espera que venza el bloqueo
    expect(a.llamadas.some(l => l.metodo === 'PATCH' && l.cuerpo && 'liquidacion_tx' in l.cuerpo)).toBe(false)   // sigue «por pagar»
    const b = repartir(mediado, { disputado: true, eventos: [{ texto: REPARTO_DISPUTA }] }); await b.r
    expect(acciones(b.llamadas)).toEqual(['resolve-dispute', 'send-transaction'])
  })
  it('guarda el hash firmado ANTES de enviar la resolución (si la respuesta se pierde, el reintento lo confirma en Horizon)', async () => {
    const { r, llamadas } = repartir(acordado); const x = await r
    const i = llamadas.findIndex(l => l.url.endsWith('/rpc/lk_anotar_pago_pendiente')), envio = llamadas.map((l, n) => [l, n] as const).filter(([l]) => l.url.endsWith('/send-transaction'))[1][1]
    expect(llamadas[i].cuerpo!.p_tx).toBe(x.tx); expect(i).toBeLessThan(envio)
  })
  it('un caso con la disputa abierta con el texto de antes (sin «red de prueba») no duplica el evento al reintentar', async () => {
    const b = repartir(mediado, { disputado: true, eventos: [{ texto: 'Se abrió la disputa en Trustless Work para pagar el reparto aceptado' }] }); await b.r
    expect(acciones(b.llamadas)).toEqual(['resolve-dispute', 'send-transaction'])
  })
  it('27/10 · la persona mediadora (lk_mediadores, no es parte) paga el reparto de la mediación con la llave mediadora, sin prueba de billetera', async () => {
    const s = simular(mediado, { uid: MED, mediadores: [MED] })
    const x = await atender(ENV, { accion: 'repartir', contrato: ID }, 'Bearer t', s.f)
    expect(x.tx).toMatch(/^[0-9a-f]{64}$/); expect(acciones(s.llamadas)).toEqual(['dispute-escrow', 'send-transaction', 'resolve-dispute', 'send-transaction'])
    expect(s.llamadas.some(l => l.url.includes('lk_pruebas_cavos'))).toBe(false)
  })
  it('27/10 · la persona mediadora no paga un acuerdo ni un caso abierto; alguien que no es parte ni mediadora recibe 403', async () => {
    for (const k of [acordado, { ...mediado, estado: 'mediacion', resultado: null }]) {
      const s = simular(k, { uid: MED, mediadores: [MED] })
      await expect(atender(ENV, { accion: 'repartir', contrato: ID }, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 409 })
      expect(s.llamadas.some(l => l.url.includes('dispute') || l.url.includes('lk_tomar_pago'))).toBe(false)
    }
    const s = simular(mediado, { uid: OTRO, mediadores: [MED] })
    await expect(atender(ENV, { accion: 'repartir', contrato: ID }, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 403, message: 'No participas en este contrato.' })
    const t = simular(mediado, { uid: MED, mediadores: [MED] })   // y la mediadora no puede pedir otras acciones
    await expect(atender(ENV, { accion: 'liberar', contrato: ID } as never, 'Bearer t', t.f)).rejects.toMatchObject({ estado: 403 })
  })
  it('b10557f9 · sin la prueba de billetera (la pestaña sin sesión de Cavos) el inquilino recibe 401 y no se pide nada a Trustless Work', async () => {
    const s = simular(acordado)
    await expect(atender(ENV, { accion: 'repartir', contrato: ID }, 'Bearer t', s.f)).rejects.toMatchObject({ estado: 401 })
    expect(s.llamadas.some(l => l.url.includes('dispute') || l.url.includes('lk_tomar_pago'))).toBe(false)
  })
  it('sin la cuenta mediadora no abre ninguna disputa', async () => {
    const s = simular(mediado)
    await expect(atender({ ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: undefined, LOCKUMI_TW_MEDIADOR_PUBLICA: undefined }, firmado({ accion: 'repartir', contrato: ID }, KI), 'Bearer t', s.f)).rejects.toMatchObject({ estado: 503 })
    expect(s.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
  })
})
