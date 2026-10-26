// PR #22 · lista de Legal, punto 5 (6.5 a): en C, cuando el dueño toca «Todo bien, devolver» y su aprobación queda en la cadena,
// el servidor cierra el caso (lk_cerrar_aprobado) y libera todo al inquilino en el mismo pedido, sin esperar el fin del plazo.
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atender, APROBADO, type Entorno } from '../../../api/_lib/tw'
import { pagoFalso } from './pago-falso'

const P = Keypair.random(), DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'k', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'servicio' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '11111111-2222-3333-4444-555555555555'
const xdrDe = (origen: string) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build().toXDR()
const k = { id: ID, monto: 20, direccion: 'Calle 1', estado: 'ventana_reclamo', escrow_contract_id: CID, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-dueno', direccion_stellar: DUENO }, { rol: 'inquilino', usuario: 'u-inq', direccion_stellar: INQ }] }

function simular(o: { cierra: boolean; liberaFalla?: boolean }) {
  const llamadas: { url: string; metodo?: string; cuerpo?: Record<string, unknown> }[] = []
  let cerrado = false   // paso 22: después de lk_cerrar_aprobado, el contrato se vuelve a leer cerrado («devuelto»)
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, metodo: init?.method, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: 'u-dueno' })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([cerrado ? { ...k, estado: 'cerrado', resultado: { via: 'devuelto', dueno: 0, inquilino: 20 } } : k])
    if (url.endsWith('/rest/v1/rpc/lk_cerrar_aprobado')) { cerrado = o.cierra; return ok(o.cierra) }
    { const pg = pagoFalso({ cid: CID, monto: 20, receiver: INQ, releaseSigner: P.publicKey(), disputeResolver: P.publicKey() })(url); if (pg) return pg }   // paso 22: bloqueo y estado del escrow
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS' })
    if (url.endsWith('release-funds')) return o.liberaFalla ? new Response('TW caído', { status: 502 }) : ok({ unsignedTransaction: xdrDe(P.publicKey()) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}
const enviar = (f: typeof fetch) => atender(ENV, { accion: 'enviar', contrato: ID, paso: 'aprobar', signedXdr: xdrDe(DUENO) }, 'Bearer t', f)

describe('«Todo bien, devolver» en C: se libera todo al inquilino al aprobar', () => {
  it('anota la aprobación, cierra con lk_cerrar_aprobado y libera con release-funds (plataforma = releaseSigner)', async () => {
    const { f, llamadas } = simular({ cierra: true })
    const r = await enviar(f)
    const i = (p: (l: typeof llamadas[number]) => boolean) => llamadas.findIndex(p)
    const aprobado = i(l => l.url.endsWith('lk_eventos') && l.cuerpo?.texto === APROBADO), cierre = i(l => l.url.endsWith('rpc/lk_cerrar_aprobado')), libera = i(l => l.url.endsWith('release-funds'))
    expect(aprobado).toBeGreaterThan(-1); expect(cierre).toBeGreaterThan(aprobado); expect(libera).toBeGreaterThan(cierre)
    expect(llamadas[cierre].cuerpo).toEqual({ p_contrato: ID })
    expect(llamadas[libera].cuerpo).toEqual({ contractId: CID, releaseSigner: P.publicKey() })
    expect(llamadas.some(l => l.metodo === 'PATCH' && typeof l.cuerpo?.liquidacion_tx === 'string' && /^[0-9a-f]{64}$/.test(String(l.cuerpo.liquidacion_tx)))).toBe(true)
    expect(r.liberacion).toMatch(/^[0-9a-f]{64}$/)
  })
  it('si el servidor no cierra (ya había reclamo o no es C), no libera', async () => {
    const { f, llamadas } = simular({ cierra: false })
    const r = await enviar(f)
    expect(llamadas.some(l => l.url.endsWith('release-funds'))).toBe(false); expect(r.liberacion).toBeUndefined()
  })
  it('si la liberación falla, la aprobación queda y el caso cerrado se libera al reintentar («liberar» acepta «devuelto»)', async () => {
    const r = await enviar(simular({ cierra: true, liberaFalla: true }).f)
    expect(r.tx).toMatch(/^[0-9a-f]{64}$/); expect(r.liberacion).toBeUndefined(); expect(String(r.errorLiberacion)).toMatch(/Vuelve a abrir el alquiler/)
    const cerrado = { ...k, estado: 'cerrado', resultado: { via: 'devuelto', dueno: 0, inquilino: 20 } }
    const { f, llamadas } = simular({ cierra: false }); const f2 = (async (u: string, init?: RequestInit) => u.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method ? new Response(JSON.stringify([cerrado]), { status: 200 }) : f(u, init)) as typeof fetch
    const l = await atender(ENV, { accion: 'liberar', contrato: ID }, 'Bearer t', f2)
    expect(l.tx).toMatch(/^[0-9a-f]{64}$/); expect(llamadas.some(x => x.url.endsWith('release-funds'))).toBe(true)
  })
})
