// paso16-unido · Trabajo del servidor (api/borrados.ts) y un solo correo de invitación (api/_lib/correo.ts), con fetch simulado.
import { describe, it, expect, vi } from 'vitest'
import { ejecutarBorrados, autorizado } from '../../../api/_lib/borrados'
import { atenderCorreo, olvidarInvitaciones } from '../../../api/_lib/correo'

const URL_SB = 'https://proyecto.supabase.co', LLAVE = 'clave-de-servicio-de-prueba'
const ENV = { SUPABASE_URL: URL_SB, SUPABASE_SERVICE_ROLE_KEY: LLAVE }
type Llamada = [string, RequestInit]
function falso(respuestas: Record<string, unknown>, fallar: string[] = []) {
  return vi.fn(async (url: string, init: RequestInit) => {
    const clave = Object.keys(respuestas).find(k => url.endsWith(k)) ?? ''
    if (fallar.some(k => url.endsWith(k))) return new Response('{}', { status: 500 })
    void init; return new Response(JSON.stringify(respuestas[clave] ?? null), { status: 200 })
  }) as unknown as typeof fetch & { mock: { calls: Llamada[] } }
}

describe('api/borrados.ts · borrados de la Privacidad 1.7-demo en Supabase (arreglos 5 y 6)', () => {
  it('borra los correos de invitaciones vencidas, las fotos del bucket lk-fotos y marca la mediación como borrada', async () => {
    const f = falso({ '/rpc/lk_vencimientos': { automatico: 1, mediacion: 1 }, '/rpc/lk_borrar_invitaciones_vencidas': 2, '/rpc/lk_mediacion_por_borrar': [{ contrato_id: 'c1', rutas: ['c1/reclamo/a.jpg', 'c1/reclamo/b.jpg'] }, { contrato_id: 'c2', rutas: [] }], '/rpc/lk_marcar_mediacion_borrada': true, '/storage/v1/object/lk-fotos': [] })
    const r = await ejecutarBorrados(ENV, f)
    expect(r).toEqual({ invitaciones: 2, mediaciones: 2, fallidos: [], vencimientos: { automatico: 1, mediacion: 1 } })
    const llamadas = f.mock.calls.map(([u, i]) => [u.replace(URL_SB, ''), i.method, i.body ? JSON.parse(String(i.body)) : null])
    expect(llamadas).toEqual([
      ['/rest/v1/rpc/lk_vencimientos', 'POST', {}],
      ['/rest/v1/rpc/lk_borrar_invitaciones_vencidas', 'POST', {}],
      ['/rest/v1/rpc/lk_mediacion_por_borrar', 'POST', { p_dias: 30 }],
      ['/storage/v1/object/lk-fotos', 'DELETE', { prefixes: ['c1/reclamo/a.jpg', 'c1/reclamo/b.jpg'] }],
      ['/rest/v1/rpc/lk_marcar_mediacion_borrada', 'POST', { p_contrato: 'c1', p_dias: 30 }],
      ['/rest/v1/rpc/lk_marcar_mediacion_borrada', 'POST', { p_contrato: 'c2', p_dias: 30 }],
    ])
    expect((f.mock.calls[0][1].headers as Record<string, string>).authorization).toBe(`Bearer ${LLAVE}`)
    expect(JSON.stringify(r)).not.toContain(LLAVE)
  })
  it('si Storage falla, no marca ese caso como borrado (se reintenta en la próxima corrida)', async () => {
    const f = falso({ '/rpc/lk_borrar_invitaciones_vencidas': 0, '/rpc/lk_mediacion_por_borrar': [{ contrato_id: 'c1', rutas: ['c1/reclamo/a.jpg'] }], '/rpc/lk_marcar_mediacion_borrada': true }, ['/storage/v1/object/lk-fotos'])
    expect(await ejecutarBorrados(ENV, f)).toMatchObject({ invitaciones: 0, mediaciones: 0, fallidos: ['c1'] })
    expect(f.mock.calls.some(([u]) => u.endsWith('lk_marcar_mediacion_borrada'))).toBe(false)
  })
  it('B2 · si lk_vencimientos falla (migración del escenario C sin aplicar), los borrados siguen y se informa vencimientos: null', async () => {
    const f = falso({ '/rpc/lk_borrar_invitaciones_vencidas': 1, '/rpc/lk_mediacion_por_borrar': [] }, ['/rpc/lk_vencimientos'])
    expect(await ejecutarBorrados(ENV, f)).toEqual({ invitaciones: 1, mediaciones: 0, fallidos: [], vencimientos: null })
  })
  it('B2 · vercel.json programa /api/borrados una vez al día', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8')) as { crons?: { path: string; schedule: string }[] }
    expect(v.crons).toEqual([{ path: '/api/borrados', schedule: expect.stringMatching(/^\d+ \d+ \* \* \*$/) }])
  })
  it('sin las variables de Supabase no hace nada y lo explica; solo corre con CRON_SECRET', async () => {
    await expect(ejecutarBorrados({}, falso({}))).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(autorizado({ CRON_SECRET: 's3' }, 'Bearer s3')).toBe(true)
    expect(autorizado({ CRON_SECRET: 's3' }, 'Bearer otro')).toBe(false)
    expect(autorizado({}, 'Bearer ')).toBe(false)
  })
})

describe('un solo correo de invitación por alquiler, sin recordatorios (arreglo 5)', () => {
  const ORIGEN = 'https://app.lockumi.com'
  const inv = (alquiler = 'c0ffee00-0000-4000-8000-000000000001') => ({ tipo: 'invitacion' as const, consentimiento: true, para: 'invitada@correo.com', alquiler, rol: 'inquilino' as const, nombre: 'Ana' })
  it('sin Supabase: el segundo pedido del mismo alquiler no se envía (clave por alquiler)', async () => {
    olvidarInvitaciones()
    const f = falso({ '/emails': { id: 'em_1' } })
    await atenderCorreo({ RESEND_API_KEY: 'x' }, inv(), ORIGEN, '2.2.2.1', f)
    expect((f.mock.calls[0][1].headers as Record<string, string>)['idempotency-key']).toBe('inv:c0ffee00-0000-4000-8000-000000000001')
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, { ...inv(), para: 'otra@correo.com' }, ORIGEN, '2.2.2.1', f)).rejects.toThrow('Ya enviamos el correo de invitación de este alquiler. No enviamos recordatorios.')
    expect(f.mock.calls.length).toBe(1)
  })
  it('con Supabase: lo registra antes de enviar; si ya se envió, si el correo no es el del alquiler o no hay declaración, no envía', async () => {
    olvidarInvitaciones()
    const si = falso({ '/rpc/lk_registrar_correo_invitacion': true, '/emails': { id: 'em_2' } })
    await atenderCorreo({ RESEND_API_KEY: 'x', ...ENV }, inv('c0ffee00-0000-4000-8000-000000000002'), ORIGEN, '2.2.2.2', si)
    expect(si.mock.calls.map(([u]) => u)).toEqual([`${URL_SB}/rest/v1/rpc/lk_registrar_correo_invitacion`, 'https://api.resend.com/emails'])
    expect(JSON.parse(String(si.mock.calls[0][1].body))).toEqual({ p_contrato: 'c0ffee00-0000-4000-8000-000000000002', p_para: 'invitada@correo.com' })
    const no = falso({ '/rpc/lk_registrar_correo_invitacion': false, '/emails': { id: 'em_3' } })
    await expect(atenderCorreo({ RESEND_API_KEY: 'x', ...ENV }, inv('c0ffee00-0000-4000-8000-000000000003'), ORIGEN, '2.2.2.3', no)).rejects.toThrow(/No enviamos recordatorios/)
    expect(no.mock.calls.some(([u]) => u.includes('resend'))).toBe(false)
  })
})
