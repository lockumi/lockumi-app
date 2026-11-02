// Paso 19 · REP-12 por correo (decisión del 25/10, 2:57 p. m.): el aviso de cambio de puntaje sale en la app y, con VITE_CORREOS=1,
// también por correo (programado, no recortado). Pruebas con fetch simulado: no se envía ningún correo real.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validar, armar, atenderCorreo, PIE } from '../../../api/_lib/correo'

const ORIGEN = 'http://localhost:4319'
const pedido = (x = {}) => ({ tipo: 'reputacion' as const, para: 'demo@lockumi.com', alquiler: '00000000-0000-4000-8000-000000000103', aviso: 'cambio' as const,
  antes: '4,6 de 5', despues: '4,2 de 5', fechaMs: Date.parse('2026-06-30T18:00:00Z'), ...x })
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k) }) })

describe('servidor: correo REP-12 (sin texto libre, sin dirección)', () => {
  it('arma el REP-12 al pie de la letra, con la fecha en Costa Rica y sin la dirección del alquiler', () => {
    const c = armar(validar(pedido()), ORIGEN)
    expect(c.asunto).toBe('Tu puntaje cambió')
    expect(c.texto).toContain('Tu puntaje pasó de 4,6 de 5 a 4,2 de 5 por el cierre del alquiler n.º 00000000 el 30 de junio de 2026.')
    expect(c.texto).toContain('Si crees que hay un error, pide una revisión: mientras la revisamos, tu puntaje dice «En revisión».')
    expect(c.texto).toContain(`Ver por qué: ${ORIGEN}/#/perfil/calculo`); expect(c.texto).toContain(`Pedir revisión: ${ORIGEN}/#/perfil/revision`)
    expect(c.texto).toContain(PIE); expect(c.texto).not.toMatch(/Casa de prueba|desmarca la casilla/)
  })
  it('mismos textos que en la app (AVISO_CAMBIO y AVISO_VENCIDO de textos.ts)', async () => {
    const { AVISO_CAMBIO, AVISO_VENCIDO } = await import('../textos'), { REP12 } = await import('../../../api/_lib/correo')
    expect(REP12.cambio).toEqual({ titulo: AVISO_CAMBIO.titulo, texto: AVISO_CAMBIO.texto, nota: AVISO_CAMBIO.nota })
    expect(REP12.vencido).toEqual(AVISO_VENCIDO); expect([REP12.porque, REP12.revision]).toEqual([AVISO_CAMBIO.porque, AVISO_CAMBIO.revision])
  })
  it('aviso de los 10 años', () => {
    const c = armar(validar(pedido({ aviso: 'vencido', antes: undefined })), ORIGEN)
    expect(c.asunto).toBe('Un hecho dejó de contar en tu puntaje')
    expect(c.texto).toContain('Pasaron 10 años desde el cierre del alquiler n.º 00000000 y lo borramos de tu reputación. Tu puntaje ahora es 4,2 de 5.')
  })
  it('solo acepta líneas de puntaje válidas (nunca texto libre)', () => {
    for (const l of ['<b>5</b>', 'Eres el mejor', '9,9 de 5x']) expect(() => validar(pedido({ despues: l }))).toThrow('Aviso de puntaje inválido.')
    for (const l of ['En revisión', 'Nuevo en Lockumi · 2 alquileres cerrados', 'Nuevo en Lockumi · 1 alquiler cerrado', '5,0 de 5']) expect(() => validar(pedido({ antes: l }))).not.toThrow()
  })
  it('lo envía por Resend (simulado) con una clave de idempotencia por cambio', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: 'em_9' }), { status: 200 })) as unknown as typeof fetch
    expect(await atenderCorreo({ RESEND_API_KEY: 'prueba' }, pedido(), ORIGEN, '1.1.1.1', f)).toEqual({ enviado: true, id: 'em_9' })
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe('rep:demo@lockumi.com:cambio:00000000-0000-4000-8000-000000000103:4,2 de 5')
    expect(JSON.parse(init.body as string).subject).toBe('Tu puntaje cambió')
  })
  it('409 de idempotencia de Resend (ya enviado con otra fecha o en curso): cuenta como enviado, sin 502 (16:41:06 del 27/10)', async () => {
    for (const name of ['invalid_idempotent_request', 'concurrent_idempotent_requests']) {
      const f = vi.fn(async () => new Response(JSON.stringify({ name, statusCode: 409 }), { status: 409 })) as unknown as typeof fetch
      expect(await atenderCorreo({ RESEND_API_KEY: 'prueba' }, pedido({ para: `rep409.${name.length}@lockumi.com` }), ORIGEN, '1.1.1.1', f)).toEqual({ enviado: true, repetido: true })
    }
  })
  it('otros fallos de Resend (429, 5xx o 409 de otro tipo) siguen en 502', async () => {
    for (const [status, name] of [[429, 'rate_limit_exceeded'], [500, 'internal_server_error'], [409, 'otro']] as const) {
      const f = vi.fn(async () => new Response(JSON.stringify({ name }), { status })) as unknown as typeof fetch
      await expect(atenderCorreo({ RESEND_API_KEY: 'prueba' }, pedido({ para: `rep${status}.${name.length}@lockumi.com` }), ORIGEN, '1.1.1.1', f)).rejects.toMatchObject({ estado: 502 })
    }
  })
})

describe('app: se envía solo con VITE_CORREOS=1 (y la prueba completa), una vez por cambio', () => {
  const aviso = { tipo: 'cambio' as const, antes: '4,6 de 5', despues: '4,2 de 5', alquiler: '00000000-0000-4000-8000-000000000103', fechaMs: Date.parse('2026-06-30T18:00:00Z') }
  it('VITE_CORREOS=1: manda el pedido a /api/correo y no lo repite', async () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_CORREOS', '1')
    const f = vi.fn(async () => new Response('{"enviado":true}', { status: 200 })); vi.stubGlobal('fetch', f)
    const { enviarAvisoReputacion } = await import('../correo')
    expect(await enviarAvisoReputacion('demo@lockumi.com', aviso)).toBe(true)
    expect(f).toHaveBeenCalledTimes(1)
    const [url, init] = f.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe('/api/correo'); expect(JSON.parse(init.body as string)).toEqual({ tipo: 'reputacion', para: 'demo@lockumi.com', aviso: 'cambio', antes: '4,6 de 5', despues: '4,2 de 5', alquiler: aviso.alquiler, fechaMs: aviso.fechaMs })
    expect(await enviarAvisoReputacion('demo@lockumi.com', aviso)).toBe(false); expect(f).toHaveBeenCalledTimes(1)
  })
  it('apagado (sin VITE_CORREOS): no envía nada; el aviso sigue en la app', async () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { enviarAvisoReputacion } = await import('../correo')
    expect(await enviarAvisoReputacion('demo@lockumi.com', aviso)).toBe(false); expect(f).not.toHaveBeenCalled()
  })
  it('si falla, se puede volver a intentar más tarde (no se marca como enviado)', async () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_CORREOS', '1')
    const f = vi.fn(async () => new Response('{}', { status: 503 })); vi.stubGlobal('fetch', f)
    const { enviarAvisoReputacion } = await import('../correo')
    expect(await enviarAvisoReputacion('demo@lockumi.com', aviso)).toBe(false); expect(await enviarAvisoReputacion('demo@lockumi.com', aviso)).toBe(false)
    expect(f).toHaveBeenCalledTimes(2)
  })
})
