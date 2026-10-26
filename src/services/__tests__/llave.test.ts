import { describe, it, expect } from 'vitest'
import { TEXTOS_LLAVE as T, debeOfrecer, posponer, ESPERA_SEGUNDA_VEZ_MS, codigoErrorLlave, mensajeLlave, navegadorPermite, resultadoAprobar, leerRegistro, guardarRegistro } from '../llave'
import { NO_FIRMANTE, esTextoNoFirmante, mensajeFirma } from '../billetera'

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('oferta de llave de acceso', () => {
  const base = { registro: null, tieneLlave: false as boolean | null, estado: 'ready', ahora: 1_000 }
  it('se ofrece al entrar si este dispositivo puede firmar y no hay llave', () => {
    expect(debeOfrecer(base)).toBe(true)
    expect(debeOfrecer({ ...base, estado: 'undeployed' })).toBe(true)
  })
  it('no se ofrece en un dispositivo sin autorizar, si ya hay llave o si no se sabe', () => {
    expect(debeOfrecer({ ...base, estado: 'needs-device-approval' })).toBe(false)
    expect(debeOfrecer({ ...base, tieneLlave: true })).toBe(false)
    expect(debeOfrecer({ ...base, tieneLlave: null })).toBe(false)
  })
  it('después de crearla no se vuelve a preguntar', () => { expect(debeOfrecer({ ...base, registro: { estado: 'creada' } })).toBe(false) })
  it('«Ahora no»: una sola vez más, y recién 3 días después', () => {
    const r1 = posponer(null, 1_000)
    expect(r1).toEqual({ estado: 'ahora-no', veces: 1, desde: 1_000 })
    expect(debeOfrecer({ ...base, registro: r1, ahora: 1_000 + ESPERA_SEGUNDA_VEZ_MS - 1 })).toBe(false)
    expect(debeOfrecer({ ...base, registro: r1, ahora: 1_000 + ESPERA_SEGUNDA_VEZ_MS })).toBe(true)
    const r2 = posponer(r1, 9e12)
    expect(r2.estado === 'ahora-no' && r2.veces).toBe(2)
    expect(debeOfrecer({ ...base, registro: r2, ahora: 9e15 })).toBe(false)
  })
  it('guarda el registro por cuenta (sin distinguir mayúsculas)', () => {
    const s = memoria()
    guardarRegistro('Ana@Ejemplo.cr', { estado: 'creada' }, s)
    expect(leerRegistro('ana@ejemplo.cr', s)).toEqual({ estado: 'creada' })
    expect(leerRegistro('otra@ejemplo.cr', s)).toBeNull()
    s.setItem('lockumi.llave.mal@ejemplo.cr', '{roto'); expect(leerRegistro('mal@ejemplo.cr', s)).toBeNull()
  })
})

describe('aprobar este dispositivo', () => {
  it('lee el resultado del connect con la llave', () => {
    expect(resultadoAprobar({ estado: 'ready', llave: true })).toBe('aprobado')
    expect(resultadoAprobar({ estado: 'undeployed' })).toBe('aprobado')
    expect(resultadoAprobar({ estado: 'needs-device-approval', llave: false })).toBe('sin-llave')
    expect(resultadoAprobar({ estado: 'needs-device-approval', llave: true })).toBe('no-abrio')
  })
  it('el error de firma lleva el botón de aprobar (también con texto agregado)', () => {
    const m = mensajeFirma(new Error('kit/stellar: this device is not an authorized signer of the wallet'))
    expect(m).toBe(NO_FIRMANTE); expect(esTextoNoFirmante(m)).toBe(true)
    expect(esTextoNoFirmante(m + ' Vuelve a tocar el botón cuando estés listo.')).toBe(true)
    expect(esTextoNoFirmante('Rechazaste la firma en la billetera.')).toBe(false)
    expect(NO_FIRMANTE).toContain('llave de acceso')
  })
  it('sin llave: una sola frase que dice qué hacer en el primer dispositivo', () => {
    expect(T.sinLlave.split(/[.!?](\s|$)/).filter(x => x.trim()).length).toBe(1)
    expect(T.sinLlave).toMatch(/abre Lockumi una vez en el dispositivo donde creaste tu cuenta/)
  })
})

describe('errores de la llave en español, cada uno con cómo arreglarlo', () => {
  it.each([
    ['kit/passkey-prf: this authenticator did not return a PRF result — PRF is unsupported here', 'no-soporta'],
    ['kit/passkey-prf: WebAuthn is only available in a browser', 'no-soporta'],
    [Object.assign(new Error('The operation either timed out or was not allowed.'), { name: 'NotAllowedError' }), 'cancelado'],
    ['kit/vault: cancelled', 'cancelado'],
    ['kit/secret: this device does not hold the wallet key. Add the passkey on the device you use to sign.', 'otro-dispositivo'],
    ['kit/secret: this device has no local key and no recovery wrap', 'sin-llave'],
    ['passkey wrap save failed: 500', 'general'],
  ])('%s → %s', (e, c) => { expect(codigoErrorLlave(typeof e === 'string' ? new Error(e) : e)).toBe(c) })
  it('ningún texto tiene palabras técnicas y todos dicen qué hacer', () => {
    for (const t of Object.values(T)) expect(t).not.toMatch(/passkey|PRF|WebAuthn|kit|vault|wallet|signer/i)
    for (const e of ['PRF is unsupported', 'cancelled', 'does not hold the wallet key', 'no recovery wrap', 'x']) expect(mensajeLlave(new Error(e))).toMatch(/vuelve a intentarlo|otra vez|crea la llave/i)
  })
})

describe('navegador sin llaves de acceso', () => {
  it('sin WebAuthn, sin contexto seguro o con PRF negado: no permite', async () => {
    expect(await navegadorPermite({})).toBe(false)
    expect(await navegadorPermite({ PublicKeyCredential: {}, isSecureContext: false })).toBe(false)
    expect(await navegadorPermite({ PublicKeyCredential: { getClientCapabilities: async () => ({ 'extension:prf': false }) } })).toBe(false)
  })
  it('con WebAuthn (o sin datos de PRF): se intenta', async () => {
    expect(await navegadorPermite({ PublicKeyCredential: {}, isSecureContext: true })).toBe(true)
    expect(await navegadorPermite({ PublicKeyCredential: { getClientCapabilities: async () => ({ 'extension:prf': true }) } })).toBe(true)
    expect(await navegadorPermite({ PublicKeyCredential: { getClientCapabilities: async () => { throw new Error('x') } } })).toBe(true)
  })
})
