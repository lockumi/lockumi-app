// Paso 11 · Cambios de Legal del 24/10 (11:51 p. m.): consentimiento guardado en el servidor, nota de botones y Privacidad 1.7-demo sin «fase».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import privacidad17 from '../privacidad-1.7.md?raw'
import { atenderCorreo, armar, validar, olvidarConsentimientos, tieneConsentimiento, NOTA_CONFIRMAR, NOTA_UN_BOTON } from '../../../api/_lib/correo'

const ORIGEN = 'https://app.lockumi.com', env = { RESEND_API_KEY: 'llave-de-prueba' }
const aviso = (plantilla: 'dueno-1' | 'reclamo-1' | 'dueno-4' | 'reparacion-5' = 'reclamo-1') => ({ tipo: 'aviso' as const, consentimiento: true, para: 'demo@lockumi.com', alquiler: 'c2351', plantilla,
  datos: { deposito: 800, reclamado: 95, venceMs: +new Date('2026-11-09T16:00:00Z'), finAlquilerMs: +new Date('2026-11-30T16:00:00Z'), regla: true, rubros: ['otro rubro'] } })
const casilla = (acepta: boolean, para = 'demo@lockumi.com') => ({ tipo: 'consentimiento' as const, para, alquiler: 'c2351', acepta })
const ok = () => vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 })) as unknown as typeof fetch
beforeEach(() => olvidarConsentimientos())

describe('servidor: guarda el consentimiento y sin él no envía nada', () => {
  it('con la memoria vacía (reinicio) no envía ningún aviso, aunque el pedido traiga la casilla', async () => {
    const f = ok()
    await expect(atenderCorreo(env, aviso(), ORIGEN, 'ip-a', f)).rejects.toMatchObject({ estado: 409 })
    await expect(atenderCorreo(env, aviso(), ORIGEN, 'ip-a', f)).rejects.toThrow(/marca otra vez la casilla/)
    expect(f).not.toHaveBeenCalled()
  })
  it('marcar la casilla guarda el consentimiento; desmarcarla lo borra; reiniciar lo borra', async () => {
    const f = ok()
    expect(await atenderCorreo(env, casilla(true, ' Demo@Lockumi.com '), ORIGEN, 'ip-b', f)).toEqual({ consentimiento: true })
    expect(tieneConsentimiento('demo@lockumi.com', 'c2351')).toBe(true)
    await expect(atenderCorreo(env, aviso(), ORIGEN, 'ip-b', f)).resolves.toMatchObject({ enviado: true })
    expect(await atenderCorreo(env, casilla(false), ORIGEN, 'ip-b', f)).toEqual({ consentimiento: false })
    await expect(atenderCorreo(env, aviso('dueno-1'), ORIGEN, 'ip-b', f)).rejects.toMatchObject({ estado: 409 })
    await atenderCorreo(env, casilla(true), ORIGEN, 'ip-b', f); olvidarConsentimientos()
    await expect(atenderCorreo(env, aviso('dueno-1'), ORIGEN, 'ip-b', f)).rejects.toMatchObject({ estado: 409 })
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('el consentimiento es por correo y por alquiler', async () => {
    const f = ok(); await atenderCorreo(env, casilla(true), ORIGEN, 'ip-c', f)
    await expect(atenderCorreo(env, { ...aviso(), alquiler: 'otro1' }, ORIGEN, 'ip-c', f)).rejects.toMatchObject({ estado: 409 })
    await expect(atenderCorreo(env, { ...aviso(), para: 'otra@lockumi.com' }, ORIGEN, 'ip-c', f)).rejects.toMatchObject({ estado: 409 })
  })
  it('pedido de casilla inválido: 400 y explica qué corregir', async () => {
    await expect(atenderCorreo(env, { tipo: 'consentimiento', para: 'x', alquiler: 'c2351', acepta: true } as never, ORIGEN, 'ip-d', ok())).rejects.toMatchObject({ estado: 400 })
    await expect(atenderCorreo(env, { tipo: 'consentimiento', para: 'demo@lockumi.com', alquiler: 'c2351' } as never, ORIGEN, 'ip-d', ok())).rejects.toMatchObject({ estado: 400 })
  })
})

describe('nota de los botones', () => {
  it('«Todo bien, devolver» solo se explica en el correo que tiene ese botón', () => {
    expect(NOTA_UN_BOTON).toBe('El botón abre la app. Desde el correo no se acepta ni se devuelve nada.')
    const d1 = armar(validar(aviso('dueno-1')), ORIGEN)
    expect(d1.html).toContain(NOTA_CONFIRMAR); expect(d1.html).not.toContain(NOTA_UN_BOTON)
    for (const p of ['reclamo-1', 'dueno-4', 'reparacion-5'] as const) {
      const c = armar(validar(aviso(p)), ORIGEN)
      expect(c.html).toContain(NOTA_UN_BOTON); expect(c.texto).toContain(NOTA_UN_BOTON)
      expect(c.html).not.toContain('Todo bien, devolver'); expect(c.texto).not.toContain('Todo bien, devolver')
    }
  })
})

describe('Privacidad 1.7-demo sin «fase»', () => {
  const t = privacidad17, l = t.split('\n')
  it('no menciona fases', () => { expect(t).not.toMatch(/fase/i) })
  it('textos de Legal, palabra por palabra', () => {
    expect(l[18]).toContain('Si simulas el alquiler en un solo aparato, **el lugar y las fotos se quedan solo en el navegador de tu aparato**; a la red solo va la huella digital SHA-256 de las fotos. Si simulas un alquiler con otra persona, las fotos reducidas se guardan en Supabase (ver abajo).')
    expect(l[20]).toContain('para mantener la sesión y, si simulas un alquiler con otra persona, un identificador de sesión anónima.')
    expect(t).toContain('\n## Alquiler simulado con otra persona\n')
    expect(t).toContain('- El personal autorizado de Lockumi y, si simulas un alquiler con otra persona, la otra parte del alquiler simulado y, si aceptas la mediación con una persona, la persona mediadora de la demo.')
    expect(t).toContain('  - **Supabase** (base de datos del perfil y, en los alquileres simulados con otra persona, de los alquileres y las fotos).')
  })
})

describe('app: la casilla avisa al servidor', () => {
  it('marcar y desmarcar mandan el consentimiento; si el servidor falla, explica qué hacer', async () => {
    const { guardarConsentimiento } = await import('../correoAvisos')
    const f = vi.fn(async () => new Response(JSON.stringify({ consentimiento: true }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    expect(await guardarConsentimiento(' demo@lockumi.com ', 'c2351', true)).toEqual({ ok: true })
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ tipo: 'consentimiento', para: 'demo@lockumi.com', alquiler: 'c2351', acepta: true })
    await guardarConsentimiento('demo@lockumi.com', 'c2351', false)
    expect(JSON.parse((f.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ acepta: false })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red') }))
    const r = await guardarConsentimiento('demo@lockumi.com', 'c2351', true)
    expect(r.ok).toBe(false); expect(!r.ok && r.error).toMatch(/vuelve a intentarlo/)
    vi.unstubAllGlobals()
  })
})
