import { describe, it, expect, vi } from 'vitest'
import { mensajeFirma, NO_FIRMANTE, opcionesRecuperacion, recuperacionActiva, URL_CONFIG_RECUPERACION } from '../billetera'

const resp = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
class Cliente { o: unknown; constructor(o: unknown) { this.o = o } }
const kit = async () => ({ SocialRecoveryClient: Cliente as never, DEFAULT_SOCIAL_RECOVERY_ATTESTATION: { pcr0: ['x'] } })
const auth = (hay: boolean) => ({ hasSocialRecoveryCredential: () => hay, consumeSocialRecoveryCredential: vi.fn(() => ({ cred: 1 })) })

describe('dispositivo no autorizado: mensaje en español', () => {
  it('traduce el error del kit', () => {
    expect(mensajeFirma(new Error('kit/stellar: this device is not an authorized signer of the wallet'))).toBe(NO_FIRMANTE)
    expect(mensajeFirma(new Error('kit/stellar: this wallet is protected by recovery. Sign in again with Google, Apple or an email code to continue.'))).toBe(NO_FIRMANTE)
    expect(NO_FIRMANTE).not.toMatch(/kit|signer|wallet/i)
  })
  it('no toca los otros mensajes', () => { expect(mensajeFirma(new Error('User rejected'))).toBe('Rechazaste la firma en la billetera.') })
})

describe('recuperación social de Cavos al conectar', () => {
  it('lee la configuración pública del panel', async () => {
    const f = vi.fn(async () => resp(200, { enabled: true }))
    expect(await recuperacionActiva(f as typeof fetch)).toBe(true)
    expect(f).toHaveBeenCalledWith(URL_CONFIG_RECUPERACION)
    expect(await recuperacionActiva((async () => resp(200, { enabled: false })) as typeof fetch)).toBe(false)
    expect(await recuperacionActiva((async () => { throw new Error('red') }) as typeof fetch)).toBe(false)
  })
  it('apagada en el panel: no cambia nada', async () => {
    const a = auth(true)
    expect(await opcionesRecuperacion(a, async () => false, kit)).toEqual({})
    expect(a.consumeSocialRecoveryCredential).not.toHaveBeenCalled()
  })
  it('activa: pasa el cliente del enclave y la credencial fresca del login (una sola vez)', async () => {
    const a = auth(true)
    const o = await opcionesRecuperacion(a, async () => true, kit) as unknown as { socialRecovery: Cliente; socialRecoveryCredential: unknown }
    expect(o.socialRecovery).toBeInstanceOf(Cliente)
    expect(o.socialRecovery.o).toMatchObject({ baseUrl: 'https://cavos.xyz', environment: 'production', attestation: { pcr0: ['x'] } })
    expect(o.socialRecoveryCredential).toEqual({ cred: 1 })
    expect(a.consumeSocialRecoveryCredential).toHaveBeenCalledTimes(1)
  })
  it('activa sin login fresco: solo el cliente', async () => {
    const o = await opcionesRecuperacion(auth(false), async () => true, kit)
    expect(Object.keys(o)).toEqual(['socialRecovery'])
  })
})
