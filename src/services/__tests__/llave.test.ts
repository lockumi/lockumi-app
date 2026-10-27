// Llave de acceso obligatoria al crear la cuenta (secureStep 'required'): módulo reutilizable src/services/llave.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ connect: vi.fn(), enroll: vi.fn(async () => {}), attach: vi.fn(), estado: 'ready', restore: false, sign: vi.fn(), nueva: false }))
vi.mock('../auth', () => ({
  modoReal: true, APP_ID: 'app-prueba',
  CAVOS_BILLETERA: { chains: ['stellar'], defaultChain: 'stellar', network: 'testnet', environment: 'production', appSalt: 'lockumi' },
  authCavos: async () => ({ getAuthToken: () => 'tok', restoreIdentity: () => ({ userId: 'u-1', email: 'ana@ejemplo.cr' }), hasSocialRecoveryCredential: () => false, consumeSocialRecoveryCredential: () => undefined }),
}))
vi.mock('@cavos/kit', () => ({ Cavos: { connect: h.connect }, PasskeyPrf: class { o: unknown; constructor(o: unknown) { this.o = o } }, VaultClient: { attach: h.attach } }))
import { conectarBilletera, olvidarBilletera, NO_FIRMANTE, esTextoNoFirmante, mensajeFirma } from '../billetera'
import { SECURE_STEP, TEXTOS_LLAVE as T, leerRegistro, guardarRegistro, posponer, ESPERA_SEGUNDA_VEZ_MS, decidirLlave, marcarNueva, asegurarLlave, recuperarConLlave, consultarLlave, crearLlave, aprobarConLlave, probarCuenta,
  codigoErrorLlave, mensajeLlave, navegadorPermite, resultadoAprobar, llaveRegistrada, registrarLlave } from '../llave'
const NUEVA = { isNewAccount: true }

const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }
beforeEach(() => {
  olvidarBilletera(); h.connect.mockReset(); h.enroll.mockReset().mockResolvedValue(undefined); h.attach.mockReset().mockReturnValue({ enrollPasskey: h.enroll })
  h.estado = 'ready'; h.restore = false; h.nueva = false; h.sign.mockReset().mockResolvedValue({ signature: new Uint8Array(64) })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false }))))
  vi.stubGlobal('localStorage', mem()); vi.stubGlobal('sessionStorage', mem())
  vi.stubGlobal('PublicKeyCredential', {}); vi.stubGlobal('isSecureContext', true)
  h.connect.mockImplementation(async () => ({ wallet: () => ({ address: 'GPRUEBA', status: h.estado, passkeyRestore: h.restore, signMessage: h.sign, ...h.nueva ? NUEVA : {} }) }))
})

describe('cuenta NUEVA: llave obligatoria (secureStep required)', () => {
  it('obligatoria para cuentas nuevas, opcional para las que ya existían', () => { expect(SECURE_STEP).toEqual({ nueva: 'required', existente: 'optional' }) })
  it('Cavos crea la billetera en esta conexión (isNewAccount): se anota como nueva, aunque se cierre la pestaña', async () => {
    h.nueva = true; await conectarBilletera(); expect(leerRegistro('ana@ejemplo.cr')).toEqual({ estado: 'nueva' })
    olvidarBilletera(); h.nueva = false; h.connect.mockClear()   // otra entrada: el kit ya no dice «nueva», pero la anotación sigue
    expect(await probarCuenta('ana@ejemplo.cr')).toBe('sin-llave')
  })
  it('cuenta nueva (sin llave): la puerta pide crearla y no deja entrar', async () => {
    h.nueva = true
    expect(await probarCuenta('ana@ejemplo.cr')).toBe('sin-llave')
    expect(h.connect.mock.calls[0][0]).not.toHaveProperty('passkeyPrf')   // la firma de prueba no abre la ventana de la llave
    expect(h.connect.mock.calls[1][0]).toHaveProperty('passkeyPrf')       // solo averigua si hay llave
  })
  it('cuenta que ya existía (la billetera ya estaba en Cavos) y sin llave: se ofrece, no se obliga', async () => {
    expect(await probarCuenta('ana@ejemplo.cr')).toBe('oferta-llave'); expect(leerRegistro('ana@ejemplo.cr')).toBeNull()
  })
  it('crear la llave: la guarda en el vault con la cuenta y el token del login, y la siguiente entrada pasa', async () => {
    expect(await asegurarLlave('ana@ejemplo.cr')).toEqual({ ok: true })
    expect(h.attach).toHaveBeenCalledWith({ appId: 'app-prueba' })
    expect(h.enroll).toHaveBeenCalledWith({ userId: 'u-1', userName: 'ana@ejemplo.cr', appSalt: 'lockumi', environment: 'production', authToken: 'tok' })
    expect(llaveRegistrada('ana@ejemplo.cr')).toBe(true); h.connect.mockClear()
    expect(await probarCuenta('ana@ejemplo.cr')).toBe('puede'); expect(h.connect).not.toHaveBeenCalled() // reusa la conexión, sin preguntar por la llave
  })
  it('cuenta que ya tiene llave: entra y se recuerda', async () => {
    h.restore = true; expect(await probarCuenta('ana@ejemplo.cr')).toBe('puede'); expect(llaveRegistrada('ana@ejemplo.cr')).toBe(true)
  })
  it('si no se puede saber (red): cuenta existente entra; cuenta nueva no entra sin llave (error para reintentar)', async () => {
    h.connect.mockImplementationOnce(async () => ({ wallet: () => ({ address: 'GPRUEBA', status: 'ready', signMessage: h.sign }) }))
      .mockRejectedValueOnce(new Error('network down'))
    expect(await probarCuenta('vieja@ejemplo.cr')).toBe('puede'); olvidarBilletera(); marcarNueva('ana@ejemplo.cr')
    h.connect.mockImplementationOnce(async () => ({ wallet: () => ({ address: 'GPRUEBA', status: 'ready', signMessage: h.sign }) }))
      .mockRejectedValueOnce(new Error('network down'))
    expect(await probarCuenta('ana@ejemplo.cr')).toBe('error')
  })
  it('dispositivo sin la llave de la cuenta: no pregunta por la llave, queda en no-firmante', async () => {
    h.estado = 'needs-device-approval'; expect(await probarCuenta('ana@ejemplo.cr')).toBe('no-firmante'); expect(h.connect).toHaveBeenCalledTimes(1)
  })
  it('navegador sin llaves de acceso: texto corto que dice qué navegador usar, sin tocar Cavos', async () => {
    vi.stubGlobal('PublicKeyCredential', undefined)
    expect(await asegurarLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.noSoporta }); expect(h.enroll).not.toHaveBeenCalled()
    expect(await recuperarConLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.noSoporta })
  })
  it('crear que falla o se cancela: el mensaje dice cómo resolverlo', async () => {
    h.enroll.mockRejectedValue(Object.assign(new Error('The operation either timed out or was not allowed.'), { name: 'NotAllowedError' }))
    expect(await asegurarLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.cancelado }); expect(llaveRegistrada('ana@ejemplo.cr')).toBe(false)
  })
})

describe('dispositivo nuevo: recuperar con la llave de acceso', () => {
  it('con llave: vuelve a conectar con la llave, deja esa conexión y no se pregunta más', async () => {
    h.estado = 'needs-device-approval'; await conectarBilletera(); h.estado = 'ready'; h.restore = true
    expect(await recuperarConLlave('ana@ejemplo.cr')).toEqual({ ok: true })
    expect(h.connect).toHaveBeenCalledTimes(2); expect(h.connect.mock.calls[1][0]).toHaveProperty('passkeyPrf')
    await conectarBilletera(); expect(h.connect).toHaveBeenCalledTimes(2); expect(llaveRegistrada('ana@ejemplo.cr')).toBe(true)
  })
  it('la cuenta no tiene llave: dice dónde crearla', async () => {
    h.estado = 'needs-device-approval'; h.restore = false
    expect(await recuperarConLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.sinLlave })
  })
  it('hay llave pero no se abrió: «toca el botón otra vez»', async () => {
    h.estado = 'needs-device-approval'; h.restore = true
    expect(await recuperarConLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.noAbrio }); expect(llaveRegistrada('ana@ejemplo.cr')).toBe(false)
  })
  it('error del kit: mensaje claro, sin texto técnico', async () => {
    h.connect.mockRejectedValue(new Error('kit/passkey-prf: this authenticator did not return a PRF result — PRF is unsupported here'))
    expect(await recuperarConLlave('ana@ejemplo.cr')).toEqual({ ok: false, mensaje: T.noSoporta })
  })
  it('consultar, crear y aprobar sueltos (para otros flujos)', async () => {
    h.restore = true; expect(await consultarLlave()).toBe(true); h.restore = false; expect(await consultarLlave()).toBe(false)
    h.estado = 'needs-device-approval'; expect(await consultarLlave()).toBeNull(); h.estado = 'ready'
    await crearLlave(); expect(h.enroll).toHaveBeenCalledTimes(1)
    expect((await aprobarConLlave()).estado).toBe('ready')
  })
})

describe('errores y textos', () => {
  it.each([
    ['kit/passkey-prf: this authenticator did not return a PRF result — PRF is unsupported here', 'no-soporta'],
    ['kit/passkey-prf: WebAuthn is only available in a browser', 'no-soporta'],
    [Object.assign(new Error('The operation either timed out or was not allowed.'), { name: 'NotAllowedError' }), 'cancelado'],
    ['kit/vault: cancelled', 'cancelado'],
    ['kit/secret: this device does not hold the wallet key. Add the passkey on the device you use to sign.', 'otro-dispositivo'],
    ['kit/secret: this device has no local key and no recovery wrap', 'sin-llave'],
    ['no login token', 'sin-sesion'],
    ['passkey wrap save failed: 500', 'general'],
  ])('%s → %s', (e, c) => { expect(codigoErrorLlave(typeof e === 'string' ? new Error(e) : e)).toBe(c) })
  it('cada error dice qué hacer', () => {
    for (const e of ['PRF is unsupported', 'cancelled', 'does not hold the wallet key', 'no recovery wrap', 'no login token', 'x']) expect(mensajeLlave(new Error(e))).toMatch(/usa chrome|otra vez|créala|dispositivo|sal, vuelve|vuelve a intentarlo/i)
  })
  it('lee el resultado del connect con la llave', () => {
    expect(resultadoAprobar({ estado: 'ready', llave: true })).toBe('aprobado')
    expect(resultadoAprobar({ estado: 'needs-device-approval', llave: false })).toBe('sin-llave')
    expect(resultadoAprobar({ estado: 'needs-device-approval', llave: true })).toBe('no-abrio')
  })
  it('el error de firma a mitad de una acción manda a la llave de acceso', () => {
    const m = mensajeFirma(new Error('kit/stellar: this device is not an authorized signer of the wallet'))
    expect(m).toBe(NO_FIRMANTE); expect(esTextoNoFirmante(m)).toBe(true); expect(NO_FIRMANTE).toContain('llave de acceso')
  })
  it('navegador: sin WebAuthn, sin contexto seguro o con PRF negado no permite; con WebAuthn se intenta', async () => {
    expect(await navegadorPermite({})).toBe(false)
    expect(await navegadorPermite({ PublicKeyCredential: {}, isSecureContext: false })).toBe(false)
    expect(await navegadorPermite({ PublicKeyCredential: { getClientCapabilities: async () => ({ 'extension:prf': false }) } })).toBe(false)
    expect(await navegadorPermite({ PublicKeyCredential: {}, isSecureContext: true })).toBe(true)
    expect(await navegadorPermite({ PublicKeyCredential: { getClientCapabilities: async () => { throw new Error('x') } } })).toBe(true)
  })
  it('solo se guarda el estado por correo (creada, nueva o ahora-no), nunca la llave', () => {
    const s = mem(); registrarLlave('Ana@Ejemplo.cr', s)
    expect([...s.m.entries()]).toEqual([['lockumi.llave.ana@ejemplo.cr', '{"estado":"creada"}']]); expect(llaveRegistrada('ana@ejemplo.cr', s)).toBe(true); expect(llaveRegistrada('otra@ejemplo.cr', s)).toBe(false)
    s.setItem('lockumi.llave.mal@ejemplo.cr', '{roto'); expect(leerRegistro('mal@ejemplo.cr', s)).toBeNull()
    s.setItem('lockumi.llave.viejo@ejemplo.cr', 'creada'); expect(leerRegistro('viejo@ejemplo.cr', s)).toEqual({ estado: 'creada' })
  })
  it('marcarNueva no pisa un registro que ya existe', () => {
    const s = mem(); marcarNueva('a@ejemplo.cr', s); expect(leerRegistro('a@ejemplo.cr', s)).toEqual({ estado: 'nueva' })
    registrarLlave('a@ejemplo.cr', s); marcarNueva('a@ejemplo.cr', s); expect(leerRegistro('a@ejemplo.cr', s)).toEqual({ estado: 'creada' })
    guardarRegistro('b@ejemplo.cr', posponer(null, 1), s); marcarNueva('b@ejemplo.cr', s); expect(leerRegistro('b@ejemplo.cr', s)?.estado).toBe('ahora-no')
  })
})

describe('quién ve qué: obligatoria, oferta o nada', () => {
  const base = { registro: null, tieneLlave: false as boolean | null, ahora: 1_000 }
  it('cuenta nueva sin llave: obligatoria, sin «Ahora no»; si no se sabe: error (no entra)', () => {
    expect(decidirLlave({ ...base, registro: { estado: 'nueva' } })).toBe('obligatoria')
    expect(decidirLlave({ ...base, registro: { estado: 'nueva' }, tieneLlave: null })).toBe('error')
  })
  it('cuenta que ya existía sin llave: oferta; si no se sabe, sigue', () => {
    expect(decidirLlave(base)).toBe('oferta'); expect(decidirLlave({ ...base, tieneLlave: null })).toBe('seguir')
  })
  it('con llave (o ya creada): no se pide nada, ni a las nuevas', () => {
    expect(decidirLlave({ ...base, tieneLlave: true })).toBe('tiene'); expect(decidirLlave({ ...base, registro: { estado: 'nueva' }, tieneLlave: true })).toBe('tiene')
    expect(decidirLlave({ ...base, registro: { estado: 'creada' } })).toBe('tiene')
  })
  it('«Ahora no»: una sola vez más, y recién 3 días después', () => {
    const r1 = posponer(null, 1_000)
    expect(r1).toEqual({ estado: 'ahora-no', veces: 1, desde: 1_000 })
    expect(decidirLlave({ ...base, registro: r1, ahora: 1_000 + ESPERA_SEGUNDA_VEZ_MS - 1 })).toBe('seguir')
    expect(decidirLlave({ ...base, registro: r1, ahora: 1_000 + ESPERA_SEGUNDA_VEZ_MS })).toBe('oferta')
    const r2 = posponer(r1, 9e12); expect(r2.estado === 'ahora-no' && r2.veces).toBe(2)
    expect(decidirLlave({ ...base, registro: r2, ahora: 9e15 })).toBe('seguir')
  })
  it('el texto de la oferta es corto y sin palabras técnicas', () => {
    for (const t of [T.ofertaTitulo, T.oferta, T.ahoraNo]) { expect(t.length).toBeLessThan(90); expect(t).not.toMatch(/passkey|PRF|WebAuthn|kit|vault|wallet|signer/i) }
  })
})
