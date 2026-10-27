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
const acciones = (llamadas: { url: string }[]) => llamadas.map(l => l.url).filter(u => /dispute-escrow|resolve-dispute|send-transaction/.test(u)).map(u => u.split('/').pop())

function simular(contrato: Record<string, unknown>, o: { eventos?: { texto: string }[]; bloqueo?: boolean; fallaResolver?: boolean } = {}) {
  const { eventos = [], bloqueo = true, fallaResolver = false } = o
  const llamadas: { url: string; metodo?: string; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, metodo: init?.method, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-inq' })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    // Bloqueo: PATCH condicionado a liquidacion_tx vacío; devuelve la fila si lo tomó, [] si otro ya lo tiene.
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && url.includes('liquidacion_tx=is.null') && init?.method === 'PATCH') return ok(bloqueo ? [{ id: ID }] : [])
    if (url.includes('/rest/v1/lk_eventos?') && !init?.method) { const t = new URL(url).searchParams.get('texto'); return ok(t ? eventos.filter(e => 'eq.' + e.texto === t) : eventos) }
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
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
    expect(llamadas.some(l => l.url.includes('dispute') || l.metodo === 'PATCH')).toBe(false)
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
  it('si falla al resolver, suelta el bloqueo y el reintento no abre otra disputa (ya consta la abierta)', async () => {
    const a = repartir(mediado, { fallaResolver: true })
    await expect(a.r).rejects.toMatchObject({ estado: 502 })
    expect(a.llamadas.some(l => l.metodo === 'PATCH' && l.cuerpo && 'liquidacion_tx' in l.cuerpo && l.cuerpo.liquidacion_tx === null)).toBe(true)
    const b = repartir(mediado, { eventos: [{ texto: REPARTO_DISPUTA }] }); await b.r
    expect(acciones(b.llamadas)).toEqual(['resolve-dispute', 'send-transaction'])
  })
  it('un caso con la disputa abierta con el texto de antes (sin «red de prueba») tampoco abre otra al reintentar', async () => {
    const b = repartir(mediado, { eventos: [{ texto: 'Se abrió la disputa en Trustless Work para pagar el reparto aceptado' }] }); await b.r
    expect(acciones(b.llamadas)).toEqual(['resolve-dispute', 'send-transaction'])
  })
  it('sin la cuenta mediadora no abre ninguna disputa', async () => {
    const s = simular(mediado)
    await expect(atender({ ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: undefined, LOCKUMI_TW_MEDIADOR_PUBLICA: undefined }, firmado({ accion: 'repartir', contrato: ID }, KI), 'Bearer t', s.f)).rejects.toMatchObject({ estado: 503 })
    expect(s.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
  })
})
