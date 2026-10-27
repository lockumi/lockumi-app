import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ connect: vi.fn(), sign: vi.fn(), estado: 'ready', token: 'tok' as string | null }))
vi.mock('../auth', () => ({
  modoReal: true, APP_ID: 'app-prueba',
  CAVOS_BILLETERA: { chains: ['stellar'], defaultChain: 'stellar', network: 'testnet', environment: 'production', appSalt: 'lockumi' },
  authCavos: async () => ({ getAuthToken: () => h.token, restoreIdentity: () => ({ userId: 'u-1', email: 'ana.prueba@ejemplo.cr' }), hasSocialRecoveryCredential: () => false, consumeSocialRecoveryCredential: () => undefined }),
}))
vi.mock('@cavos/kit', () => ({ Cavos: { connect: h.connect }, PasskeyPrf: class {} }))
import { probarFirma, haySesionFirma, olvidarBilletera, mensajeFirma, ErrorBilletera } from '../billetera'
import { SIN_SESION, clasificarFirma, leerFirmante, recordarFirmante, MENSAJE_PRUEBA } from '../firmante'
import { guardarRegreso, tomarRegreso } from '../../regreso'

const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }
beforeEach(() => {
  olvidarBilletera(); h.connect.mockReset(); h.sign.mockReset().mockResolvedValue({ signature: new Uint8Array(64) }); h.estado = 'ready'; h.token = 'tok'
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false }))))
  vi.stubGlobal('localStorage', mem()); vi.stubGlobal('sessionStorage', mem())
  h.connect.mockImplementation(async () => ({ wallet: () => ({ address: 'GPRUEBA', status: h.estado, signMessage: h.sign }) }))
})

describe('puerta al entrar: firma de prueba', () => {
  it('firma «lockumi-login» una vez y deja entrar', async () => {
    expect(await probarFirma()).toBe('puede')
    expect(h.sign).toHaveBeenCalledWith(MENSAJE_PRUEBA); expect(MENSAJE_PRUEBA).toBe('lockumi-login')
    expect(h.connect).toHaveBeenCalledTimes(1); expect(h.connect.mock.calls[0][0]).not.toHaveProperty('passkeyPrf')
  })
  it('cuenta sin desplegar también puede (la firma es gratis)', async () => { h.estado = 'undeployed'; expect(await probarFirma()).toBe('puede') })
  it('needs-device-approval: no entra, sin intentar firmar', async () => {
    h.estado = 'needs-device-approval'; expect(await probarFirma()).toBe('no-firmante'); expect(h.sign).not.toHaveBeenCalled()
  })
  it('si la firma falla, no se reintenta ni se vuelve a conectar (nada que pueda borrar la llave local)', async () => {
    h.sign.mockRejectedValue(new Error('kit/stellar: this device is not an authorized signer of the wallet'))
    expect(await probarFirma()).toBe('no-firmante')
    h.sign.mockRejectedValue(new Error('network down')); olvidarBilletera()
    expect(await probarFirma()).toBe('error')
    expect(h.connect).toHaveBeenCalledTimes(2); expect(h.sign).toHaveBeenCalledTimes(2)
    for (const c of h.connect.mock.calls) expect(c[0]).not.toHaveProperty('passkeyPrf')
  })
  it('sin token en esta pestaña: pide volver a entrar, sin conectar', async () => {
    h.token = null; expect(await probarFirma()).toBe('sin-sesion'); expect(h.connect).not.toHaveBeenCalled()
    expect(await haySesionFirma()).toBe(false); h.token = 'tok'; expect(await haySesionFirma()).toBe(true)
  })
  it('registro que rechaza el token vencido = sesión perdida', () => {
    expect(clasificarFirma(new Error('kit/registry: registry lookup failed: 401'))).toBe('sin-sesion')
    expect(clasificarFirma(new Error('algo raro'))).toBe('error')
  })
})

describe('recordar el estado, nunca la firma', () => {
  it('solo guarda si o no por correo', async () => {
    const s = mem(); recordarFirmante('Ana.Prueba@ejemplo.cr', true, s)
    expect([...s.m.entries()]).toEqual([['lockumi.firmante.ana.prueba@ejemplo.cr', 'si']])
    expect(leerFirmante('ana.prueba@ejemplo.cr', s)).toBe('si'); recordarFirmante('ana.prueba@ejemplo.cr', false, s); expect(leerFirmante('ana.prueba@ejemplo.cr', s)).toBe('no')
    await probarFirma(); expect((localStorage as unknown as { m: Map<string, string> }).m.size).toBe(0)
  })
})

describe('sesión perdida a mitad del pago', () => {
  it('el texto técnico del token pasa a uno claro con cómo seguir', () => {
    expect(mensajeFirma(new ErrorBilletera('sin-token', 'La sesión de Cavos no tiene token en esta pestaña'))).toBe(SIN_SESION)
    expect(mensajeFirma(new Error('registry lookup skipped: no login token'))).toBe(SIN_SESION)
    expect(SIN_SESION).not.toMatch(/token|Cavos|kit|registry/i)
  })
  it('después de entrar de nuevo vuelve al mismo alquiler', () => {
    guardarRegreso('/alquiler/abc-123', 0); expect(tomarRegreso(1000)).toBe('/alquiler/abc-123')
    guardarRegreso('/crear', 0); expect(tomarRegreso(1000)).toBe('/')
  })
})
