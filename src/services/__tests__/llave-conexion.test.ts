import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ connect: vi.fn(), enroll: vi.fn(async () => {}), attach: vi.fn(), estado: 'ready', restore: false }))
vi.mock('../auth', () => ({
  modoReal: true, APP_ID: 'app-prueba',
  CAVOS_BILLETERA: { chains: ['stellar'], defaultChain: 'stellar', network: 'testnet', environment: 'production', appSalt: 'lockumi' },
  authCavos: async () => ({ getAuthToken: () => 'tok', restoreIdentity: () => ({ userId: 'u-1', email: 'ana@ejemplo.cr' }), hasSocialRecoveryCredential: () => false, consumeSocialRecoveryCredential: () => undefined }),
}))
vi.mock('@cavos/kit', () => ({
  Cavos: { connect: h.connect },
  PasskeyPrf: class { o: unknown; constructor(o: unknown) { this.o = o } },
  VaultClient: { attach: h.attach },
}))
import { conectarBilletera, olvidarBilletera, consultarLlave, crearLlave, aprobarConLlave } from '../billetera'

beforeEach(() => {
  olvidarBilletera(); h.connect.mockReset(); h.enroll.mockClear(); h.attach.mockReset().mockReturnValue({ enrollPasskey: h.enroll })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false }))))
  h.connect.mockImplementation(async () => ({ wallet: () => ({ address: 'GPRUEBA', status: h.estado, passkeyRestore: h.restore }) }))
})

describe('conexión con la llave de acceso', () => {
  it('las conexiones automáticas nunca piden la llave', async () => {
    await conectarBilletera()
    expect(h.connect.mock.calls[0][0]).not.toHaveProperty('passkeyPrf')
    expect(h.connect.mock.calls[0][0]).toMatchObject({ vault: true, appId: 'app-prueba', appSalt: 'lockumi' })
  })
  it('consultarLlave conecta con la llave y lee si la cuenta tiene una', async () => {
    h.restore = true; expect(await consultarLlave()).toBe(true)
    expect(h.connect.mock.calls[0][0]).toHaveProperty('passkeyPrf')
    h.restore = false; expect(await consultarLlave()).toBe(false)
    h.estado = 'needs-device-approval'; expect(await consultarLlave()).toBeNull(); h.estado = 'ready'
  })
  it('crearLlave agrega la llave en el vault con la cuenta y el token del login', async () => {
    await crearLlave()
    expect(h.attach).toHaveBeenCalledWith({ appId: 'app-prueba' })
    expect(h.enroll).toHaveBeenCalledWith({ userId: 'u-1', userName: 'ana@ejemplo.cr', appSalt: 'lockumi', environment: 'production', authToken: 'tok' })
  })
  it('aprobarConLlave vuelve a conectar con la llave y deja la conexión nueva', async () => {
    await conectarBilletera(); h.estado = 'ready'; h.restore = true
    const b = await aprobarConLlave()
    expect(b).toEqual({ direccion: 'GPRUEBA', estado: 'ready', llave: true })
    expect(h.connect).toHaveBeenCalledTimes(2); expect(h.connect.mock.calls[1][0]).toHaveProperty('passkeyPrf')
    await conectarBilletera(); expect(h.connect).toHaveBeenCalledTimes(2)
  })
})
