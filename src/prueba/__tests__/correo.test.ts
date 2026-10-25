import { describe, it, expect, vi } from 'vitest'
import { atenderCorreo, validar, armar, origenPermitido, PIE, REMITENTE, ErrorCorreo, limite } from '../../../api/_lib/correo'
import { textoAviso, botonesAviso, PLANTILLAS } from '../../../api/_lib/avisos'

const ORIGEN = 'https://lockumi-app-demo-git-prueba-completa-businessapplockumi-4427.vercel.app'
const aviso = (x = {}) => ({ tipo: 'aviso' as const, consentimiento: true, para: 'demo@lockumi.com', alquiler: 'a1b2', plantilla: 'dueno-1' as const, datos: { deposito: 20, venceMs: +new Date('2026-11-09T16:00:00Z'), recibido: false }, ...x })
const ok = () => vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 })) as unknown as typeof fetch

describe('correo de avisos (Resend)', () => {
  it('textos de los avisos: días 1, 4 y 6 con «depósito de prueba» y hora de Costa Rica', () => {
    const d1 = textoAviso('dueno-1', { deposito: 20, venceMs: +new Date('2026-11-09T16:00:00Z'), recibido: false })
    expect(d1.asunto).toBe('Tienes 7 días naturales para revisar la casa y reclamar')
    expect(d1.texto).toMatch(/^Como no confirmaste «Recibí la casa», tu plazo empezó automáticamente 2 días después de la entrega registrada\./)
    expect(d1.texto).toContain('depósito de prueba de 20 USDC de prueba. Vence el 9 nov 2026, 10:00, hora de Costa Rica.')
    const r6 = textoAviso('reclamo-6', { deposito: 20, reclamado: 5, venceMs: 0, regla: true })
    expect(r6.texto).toContain('La app registra que abriste este aviso.')
    expect(textoAviso('reclamo-6', { deposito: 20, reclamado: 5, venceMs: 0, regla: false }).texto).toContain('que tiene costo (en la demo no se cobra)')
    for (const p of PLANTILLAS) expect(textoAviso(p, { deposito: 1 }).asunto.length).toBeGreaterThan(5)
  })
  it('el botón «Todo bien, devolver» del correo solo abre la confirmación en la app', () => {
    expect(botonesAviso('dueno-1').map(b => b.accion)).toEqual(['ver', 'confirmar-devolver'])
    const c = armar(validar(aviso()), ORIGEN)
    expect(c.html).toContain(`${ORIGEN}/#/alquiler/a1b2?aviso=dueno-1&amp;canal=correo&amp;confirmar=devolver`)
    expect(c.texto).toContain(PIE); expect(c.texto).toContain('Demo en la red de prueba: sin dinero real.')
  })
  it('no acepta texto libre ni rubros fuera de la tabla, ni correos inválidos', () => {
    expect(() => validar(aviso({ datos: { deposito: 1, rubros: ['<script>'] } }))).toThrow('Rubros inválidos.')
    expect(() => validar(aviso({ para: 'no es correo' }))).toThrow(/nombre@correo.com/)
    expect(() => validar(aviso({ plantilla: 'otra' }))).toThrow('Aviso inválido.')
    expect(() => validar({ tipo: 'invitacion', consentimiento: true, para: 'demo@lockumi.com', alquiler: 'a1', rol: 'dueno', nombre: '<b>x</b>' })).toThrow(/letras y espacios/)
    const v = validar(aviso({ datos: { deposito: 1, extra: 'x' } as never })) as unknown as { datos: Record<string, unknown> }
    expect(v.datos.extra).toBeUndefined()
  })
  it('envía con Resend desde invitaciones@lockumi.com, con clave de idempotencia; nunca devuelve la llave', async () => {
    const f = ok()
    const r = await atenderCorreo({ RESEND_API_KEY: 'llave-de-prueba' }, aviso(), ORIGEN, '1.1.1.1', f)
    expect(r).toEqual({ enviado: true, id: 'em_1' })
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(String(init.body)); expect(body.from).toBe(REMITENTE); expect(body.to).toEqual(['demo@lockumi.com'])
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe('aviso:a1b2:dueno-1:demo@lockumi.com')
    expect(JSON.stringify(r)).not.toContain('llave-de-prueba')
  })
  it('sin RESEND_API_KEY explica que el aviso sigue en la app; origen desconocido no envía', async () => {
    await expect(atenderCorreo({}, aviso(), ORIGEN, '1.1.1.2', ok())).rejects.toThrow('Los avisos siguen en la app.')
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, aviso(), 'https://otra.com', '1.1.1.3', ok())).rejects.toBeInstanceOf(ErrorCorreo)
    expect(origenPermitido('https://app.lockumi.com.otra.com')).toBe(false)
  })
  it('si Resend falla, el mensaje dice qué hacer', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 500 })) as unknown as typeof fetch
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, aviso(), ORIGEN, '1.1.1.4', f)).rejects.toThrow('puedes volver a intentarlo en unos minutos')
  })
  it('límite por hora', () => {
    for (let i = 0; i < 3; i++) limite('t', 3, 1000)
    expect(() => limite('t', 3, 1000)).toThrow('Espera una hora')
    expect(() => limite('t', 3, 1000 + 3_600_001)).not.toThrow()
  })
})

describe('paso 11 · correos reales', () => {
  it('sale también desde app.lockumi.com (producción, red de prueba)', () => {
    expect(origenPermitido('https://app.lockumi.com')).toBe(true)
    expect(origenPermitido('http://app.lockumi.com')).toBe(false)
  })
  it('sin la casilla «Acepto que Lockumi me envíe avisos por correo» no se envía nada', async () => {
    const f = ok()
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, aviso({ consentimiento: false }), ORIGEN, '1.1.1.9', f)).rejects.toThrow(/Marca la casilla/)
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, { ...aviso(), consentimiento: undefined }, ORIGEN, '1.1.1.9', f)).rejects.toThrow(/Marca la casilla/)
    expect(f).not.toHaveBeenCalled()
  })
  it('el botón del correo usa la paleta del logo: naranja con texto café, nunca texto blanco sobre naranja', () => {
    for (const p of [aviso(), { tipo: 'invitacion' as const, consentimiento: true, para: 'demo@lockumi.com', alquiler: 'a1', rol: 'inquilino' as const, nombre: 'Ana' }]) {
      const { html } = armar(validar(p), ORIGEN)
      expect(html).toContain('background:#FF6B35;color:#3D2A22')
      expect(html).not.toMatch(/#3f6b5a|color:#fff\b/i)
      expect(html).toContain('background:#FFF5EE')
    }
  })
  it('invitación, días 1, 4 y 6 y el reclamo: asunto y texto de la B.2/B.2b con «depósito de prueba»', () => {
    for (const plantilla of ['dueno-1', 'dueno-4', 'dueno-6', 'reclamo-1'] as const) {
      const c = armar(validar(aviso({ plantilla, datos: { deposito: 800, reclamado: 95, venceMs: +new Date('2026-10-29T18:00:00Z') } })), ORIGEN)
      expect(c.texto).toContain('depósito de prueba'); expect(c.texto).toContain(PIE)
    }
  })
})
