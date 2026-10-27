// PR #22 · condiciones para encender C (Legal, 25/10, 3:34 a. m.; encendido-lista.md):
// (a) la llave mediadora es distinta de la de la plataforma P y está en otro secreto. Se revisa sin imprimir ningún secreto:
//     solo se comparan llaves públicas y se muestran sus últimos 4 caracteres (revisarLlaves y GET /api/tw?revisar=llaves).
// (b) cada uso de la llave mediadora queda en el historial del alquiler con el hash de la transacción (el historial lo enlaza a
//     Stellar Expert testnet: ver c-arreglos.test.tsx). Aquí: «repartir» y «devolver-automatico», las dos únicas firmas del mediador.
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, revisarLlaves, responderLlaves, hashTx, DEVUELTO_AUTO, type Entorno } from '../../../api/_lib/tw'
import { pagoFalso } from './pago-falso'
import { firmado } from './prueba-falsa'

const P = Keypair.random(), M = Keypair.random(), KD = Keypair.random(), KI = Keypair.random(), DUENO = KD.publicKey(), INQ = KI.publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(),
  LOCKUMI_TW_MEDIADOR_SECRET: M.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const sinSecretos = (x: unknown) => { const t = JSON.stringify(x); for (const s of [P.secret(), M.secret(), P.publicKey(), M.publicKey()]) expect(t).not.toContain(s) }

describe('(a) revisarLlaves: mediadora distinta de P y en otro secreto, sin imprimir secretos', () => {
  it('distintas y bien configuradas: ok, con los últimos 4 de cada llave pública', () => {
    const r = revisarLlaves(ENV)
    expect(r).toEqual({ ok: true, plataforma: '…' + P.publicKey().slice(-4), mediador: '…' + M.publicKey().slice(-4), distintas: true, publicaCoincide: true, problemas: [] })
    sinSecretos(r)
  })
  it('la misma llave en los dos secretos: no ok', () => {
    const r = revisarLlaves({ ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: P.publicKey() })
    expect(r.ok).toBe(false); expect(r.distintas).toBe(false); expect(r.problemas.join(' ')).toMatch(/misma llave/); sinSecretos(r)
  })
  it.each([
    ['falta la de la plataforma', { LOCKUMI_TW_PLATAFORMA_SECRET: undefined }, /LOCKUMI_TW_PLATAFORMA_SECRET/],
    ['falta la mediadora', { LOCKUMI_TW_MEDIADOR_SECRET: undefined }, /LOCKUMI_TW_MEDIADOR_SECRET/],
    ['falta la pública de la mediadora', { LOCKUMI_TW_MEDIADOR_PUBLICA: undefined }, /LOCKUMI_TW_MEDIADOR_PUBLICA/],
    ['llave no válida', { LOCKUMI_TW_MEDIADOR_SECRET: 'SNOVALIDA' }, /LOCKUMI_TW_MEDIADOR_SECRET/],
    ['la pública no es la de la llave mediadora', { LOCKUMI_TW_MEDIADOR_PUBLICA: Keypair.random().publicKey() }, /no coincide/],
  ])('%s: no ok', (_n, cambio, motivo) => {
    const r = revisarLlaves({ ...ENV, ...cambio } as Entorno)
    expect(r.ok).toBe(false); expect(r.problemas.join(' ')).toMatch(motivo); sinSecretos(r)
    expect(JSON.stringify(r)).not.toContain('SNOVALIDA')
  })
})

describe('(a) GET /api/tw?revisar=llaves (api/tw.ts → responderLlaves): la misma revisión desde el servidor, solo lectura', () => {
  const U = 'https://app.lockumi.com/api/tw?revisar=llaves'
  it('responde ok/distintas y los últimos 4, nunca un secreto', async () => {
    const r = responderLlaves(ENV, U)
    expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store')
    const j = await r.json(); expect(j.ok).toBe(true); expect(j.distintas).toBe(true); sinSecretos(j)
  })
  it('si son la misma llave, 409 con ok: false', async () => {
    const r = responderLlaves({ ...ENV, LOCKUMI_TW_MEDIADOR_SECRET: P.secret(), LOCKUMI_TW_MEDIADOR_PUBLICA: P.publicKey() }, U)
    expect(r.status).toBe(409); const j = await r.json(); expect(j.ok).toBe(false); sinSecretos(j)
  })
  it('otra consulta: 404', () => { expect(responderLlaves(ENV, 'https://app.lockumi.com/api/tw').status).toBe(404) })
  it('api/tw.ts lo expone por GET con process.env', async () => {
    expect((await import('../../../api/tw.ts?raw')).default as string).toMatch(/export async function GET\(req: Request\): Promise<Response> \{ return responderLlaves\(process\.env, req\.url\) \}/)
  })
})

// ── (b) cada uso de la llave mediadora en el historial, con el hash ──
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()
const partes = [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: INQ }]
const mediado = { id: ID, monto: 100, direccion: 'Calle 1', escrow_contract_id: CID, liquidacion_tx: null, estado: 'cerrado',
  resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 30, inquilino: 70 }, lk_participantes: partes }
const automatico = { ...mediado, resultado: { via: 'automatico', dueno: 0, inquilino: 100 } }
type Llamada = { url: string; metodo?: string; cuerpo?: Record<string, unknown> }
function simular(contrato: Record<string, unknown>, o: { conHash?: unknown[]; fallaEvento?: boolean } = {}) {
  const llamadas: Llamada[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, metodo: init?.method, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-inq' })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([contrato])
    if (url.includes('liquidacion_tx=is.null') && init?.method === 'PATCH') return ok([{ id: ID }])
    if (url.includes('/rest/v1/lk_eventos?') && !init?.method) return ok(url.includes('tx_hash=eq.') ? (o.conHash ?? []) : [])
    if (url.endsWith('/rest/v1/lk_eventos') && init?.method === 'POST' && o.fallaEvento) return new Response('{"message":"x"}', { status: 500 })
    { const pg = pagoFalso({ cid: CID, monto: 100, receiver: INQ, releaseSigner: P.publicKey(), disputeResolver: M.publicKey() })(url); if (pg) return pg }   // paso 22: bloqueo y estado del escrow
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS' })
    if (url.endsWith('/dispute-escrow')) return ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    if (url.endsWith('/resolve-dispute')) return ok({ unsignedTransaction: xdrDe(M.publicKey()) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}
const eventos = (ll: Llamada[]) => ll.filter(l => l.url.endsWith('/rest/v1/lk_eventos') && l.metodo === 'POST').map(l => l.cuerpo!)
const firmadaPorM = (ll: Llamada[]) => ll.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => String(l.cuerpo!.signedXdr))
  .find(x => (TransactionBuilder.fromXDR(x, Networks.TESTNET) as unknown as { source: string }).source === M.publicKey())!

describe('(b) cada firma de la llave mediadora queda en el historial con el hash de la transacción', () => {
  it.each([['repartir', mediado, /^Se pagó el reparto aceptado desde Trustless Work: 30,00 USDC de prueba al dueño y 70,00 USDC de prueba al inquilino \(cada monto menos el 0,3 % de comisión de Trustless Work\)\.$/], ['devolver-automatico', automatico, new RegExp('^' + DEVUELTO_AUTO)]] as const)(
    '%s: un evento con el hash de la transacción que firmó la mediadora', async (accion, k, texto) => {
      const s = simular(k); const x = await atender(ENV, firmado({ accion, contrato: ID }, KI), 'Bearer t', s.f)
      const tx = hashTx(firmadaPorM(s.llamadas)); expect(x.tx).toBe(tx)
      const ev = eventos(s.llamadas).filter(e => e.tx_hash === tx)
      expect(ev).toHaveLength(1); expect(String(ev[0].texto)).toMatch(texto)
    })
  it.each([['repartir', mediado], ['devolver-automatico', automatico]] as const)('%s: si no se pudo guardar el evento, responde error y deja el hash guardado', async (accion, k) => {
    const s = simular(k, { fallaEvento: true })
    await expect(atender(ENV, firmado({ accion, contrato: ID }, KI), 'Bearer t', s.f)).rejects.toMatchObject({ estado: 500, message: expect.stringMatching(/historial/) })
    const tx = hashTx(firmadaPorM(s.llamadas))
    expect(s.llamadas.some(l => l.metodo === 'PATCH' && l.cuerpo?.liquidacion_tx === tx)).toBe(true)
  })
  it.each([['repartir', mediado], ['devolver-automatico', automatico]] as const)('%s: en el reintento, si falta el evento de ese hash, lo agrega (sin volver a firmar)', async (accion, k) => {
    const h = 'b'.repeat(64)
    const a = simular({ ...k, liquidacion_tx: h })
    expect(await atender(ENV, firmado({ accion, contrato: ID }, KI), 'Bearer t', a.f)).toEqual({ tx: h, yaExistia: true })
    expect(eventos(a.llamadas).map(e => e.tx_hash)).toEqual([h]); expect(a.llamadas.some(l => l.url.includes('dispute'))).toBe(false)
    const b = simular({ ...k, liquidacion_tx: h }, { conHash: [{ texto: 'ya' }] })
    await atender(ENV, firmado({ accion, contrato: ID }, KI), 'Bearer t', b.f); expect(eventos(b.llamadas)).toHaveLength(0)
  })
})
