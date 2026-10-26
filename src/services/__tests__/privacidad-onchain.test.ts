// Ley 8968: nada del alquiler ni de las personas puede ir a la cadena (es público y permanente).
import { describe, it, expect } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address } from '@stellar/stellar-sdk'
import { atender, datosOnChain, sinDatosPersonales, TEXTO_ONCHAIN, ErrorTw, type Entorno } from '../../../api/_lib/tw'

const P = Keypair.random(), DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'k', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's' }
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', ID = '0f8e2c1a-7b3d-4e5f-9a6b-1c2d3e4f5a6b'
// Datos ficticios del alquiler y de las personas (lo que hay en la base y NO debe salir).
const DIRECCION = 'Barrio Escalante, calle 33, casa 12, San José'
const PERSONALES = [DIRECCION, 'Escalante', 'calle 33', 'Ana Pérez Mora', 'ana.perez@example.com', 'Luis Rojas', 'luis@example.com', '+506 8888-1234', '88881234']
const xdr = () => new TransactionBuilder(new Account(P.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: CID, function: 'x', args: [new Address(P.publicKey()).toScVal()] })).setTimeout(60).build().toXDR()
const contrato = (estado: string, extra = {}) => ({ id: ID, estado, monto: 300, direccion: DIRECCION, email_inquilino: 'ana.perez@example.com', escrow_contract_id: null, resultado: null, liquidacion_tx: null,
  lk_participantes: [{ rol: 'dueno', usuario: 'u-d', direccion_stellar: DUENO, email_cavos: 'luis@example.com', nombre: 'Luis Rojas', telefono: '+506 8888-1234' },
    { rol: 'inquilino', usuario: 'u-i', direccion_stellar: INQ, email_cavos: 'ana.perez@example.com', nombre: 'Ana Pérez Mora', telefono: '88881234' }], ...extra })
function simular(k: Record<string, unknown>, uid: string) {
  const a: { url: string; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    a.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/auth/v1/user')) return ok({ id: uid })
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) return ok({ balances: [{ asset_code: 'USDC', asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', balance: '100' }] })
    if (url.includes('/rest/v1/lk_contratos?id=eq.') && !init?.method) return ok([k])
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 })
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS', contractId: CID })
    return ok({ unsignedTransaction: xdr() })
  }) as typeof fetch
  return { f, a }
}
const aTrustless = (a: { url: string; cuerpo?: unknown }[]) => a.filter(l => l.url.startsWith('https://dev.api.trustlesswork.com') && !l.url.endsWith('/helper/send-transaction'))

describe('privacidad on-chain', () => {
  it('el deploy solo lleva textos genéricos y un id opaco; ningún dato del alquiler', async () => {
    const { f, a } = simular(contrato('pendiente_pago'), 'u-d')
    await atender(ENV, { accion: 'desplegar', contrato: ID }, 'Bearer t', f)
    const dep = a.find(l => l.url.endsWith('/deployer/single-release'))!.cuerpo!
    expect(dep.title).toBe(TEXTO_ONCHAIN); expect(dep.description).toBe(TEXTO_ONCHAIN)
    expect(dep.engagementId).toBe(ID)
    const json = JSON.stringify(dep).toLowerCase()
    for (const d of PERSONALES) expect(json, `"${d}" llegó al payload on-chain`).not.toContain(d.toLowerCase())
    expect(json).not.toMatch(/@/)
  })
  it('la evidencia del hito tampoco lleva datos', async () => {
    const { f, a } = simular(contrato('ventana_reclamo', { escrow_contract_id: CID }), 'u-d')
    await atender(ENV, { accion: 'aprobar', contrato: ID }, 'Bearer t', f)
    const json = JSON.stringify(aTrustless(a).map(l => l.cuerpo)).toLowerCase()
    for (const d of PERSONALES) expect(json).not.toContain(d.toLowerCase())
  })
  it('el id on-chain es el uuid aleatorio, no algo derivado de datos', () => {
    expect(datosOnChain({ id: ID }).engagementId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(() => datosOnChain({ id: 'lockumi-' + DIRECCION })).toThrow(ErrorTw)
  })
  it('la barrera rechaza dirección, correos y teléfonos', () => {
    const k = { direccion: DIRECCION }
    expect(() => sinDatosPersonales([`Depósito del alquiler en ${DIRECCION}`], k)).toThrow(ErrorTw)
    expect(() => sinDatosPersonales(['Contacto ana.perez@example.com'], k)).toThrow(ErrorTw)
    expect(() => sinDatosPersonales(['Tel +506 8888-1234'], k)).toThrow(ErrorTw)
    expect(() => sinDatosPersonales([TEXTO_ONCHAIN], k)).not.toThrow()
  })
  it('la huella sha256 del acta no se confunde con un teléfono (aunque traiga 8 o más cifras seguidas)', () => {
    const huella = '1234567890' + 'a'.repeat(54)
    expect(() => sinDatosPersonales([`Acta de salida firmada por ambas partes · sha256:${huella}`], { direccion: '' })).not.toThrow()
    expect(() => sinDatosPersonales([`Acta · sha256:${huella} · Tel +506 8888-1234`], { direccion: '' })).toThrow(ErrorTw)
  })
})
