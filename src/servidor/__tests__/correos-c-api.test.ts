// Escenario C · puertas del envío: POST /api/correo { tipo: 'avisos' } (solo una persona del alquiler), la corrida diaria
// (api/_lib/borrados.ts) solo envía con CORREOS_C=1, y P-05 (texto literal de la espera de la mediación).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEXTOS } from '../../../api/_lib/textos-correos'
import { atenderAvisos, esRecordatorio } from '../../../api/_lib/correos-c'
import { ejecutarBorrados } from '../../../api/_lib/borrados'
import { ESPERA_MEDIACION_C } from '../../screens/Detalle'

const ID = '11111111-2222-4333-8444-555555555555', UID = '99999999-2222-4333-8444-555555555555'
const ENV = { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv', RESEND_API_KEY: 're_x', CORREOS_C: '1', LOCKUMI_CORREOS_BORRADOR: '1' }
const falso = (participa: boolean, sesion = true) => { const urls: string[] = []
  const f = vi.fn(async (url: string) => { urls.push(url)
    if (url.endsWith('/auth/v1/user')) return sesion ? Response.json({ id: UID }) : new Response('{}', { status: 401 })
    if (url.includes('/rest/v1/lk_participantes')) return Response.json(participa ? [{ rol: 'dueno' }] : [])
    if (url.includes('/rpc/lk_mediacion_vencimientos')) return Response.json(0)
    if (url.includes('/rpc/lk_correos_pendientes')) return Response.json([])
    if (url.includes('/rpc/')) return Response.json(0)
    return new Response('no', { status: 404 }) })
  return { f: f as unknown as typeof fetch, urls } }

// Desde el OK de Legal (25/10, 5:31 p. m.) no queda ningún texto por revisar: la guarda se prueba con una plantilla marcada a mano.
beforeEach(() => { TEXTOS['COR-C-02/d4'].legal = 'revisar' }); afterEach(() => { TEXTOS['COR-C-02/d4'].legal = 'revisado' })

describe('POST /api/correo { tipo: avisos }', () => {
  it('apagado (sin CORREOS_C=1) no envía nada, pero SÍ revisa el plazo de la mediación de ese alquiler (Legal 25/10, punto 3)', async () => {
    const x = falso(true); expect(await atenderAvisos({ ...ENV, CORREOS_C: undefined }, { alquiler: ID }, 'Bearer t', 'https://app.lockumi.com', x.f)).toEqual({ apagado: true, enviados: 0, vencidas: 0 })
    expect(x.urls.filter(u => u.includes('/rpc/'))).toEqual(['https://p.supabase.co/rest/v1/rpc/lk_mediacion_vencimientos'])
    // sin sesión o sin participar, ni eso
    const y = falso(false); await expect(atenderAvisos({ ...ENV, CORREOS_C: undefined }, { alquiler: ID }, 'Bearer t', '', y.f)).rejects.toMatchObject({ estado: 403 })
    expect(y.urls.some(u => u.includes('/rpc/'))).toBe(false)
  })
  it('sin sesión 401; si no participa 403; con alquiler inválido 400', async () => {
    await expect(atenderAvisos(ENV, { alquiler: ID }, null, '', falso(true).f)).rejects.toMatchObject({ estado: 401 })
    await expect(atenderAvisos(ENV, { alquiler: ID }, 'Bearer t', '', falso(true, false).f)).rejects.toMatchObject({ estado: 401 })
    await expect(atenderAvisos(ENV, { alquiler: ID }, 'Bearer t', '', falso(false).f)).rejects.toMatchObject({ estado: 403 })
    await expect(atenderAvisos(ENV, { alquiler: 'x' }, 'Bearer t', '', falso(true).f)).rejects.toMatchObject({ estado: 400 })
  })
  it('una persona del alquiler: el servidor procesa SOLO ese alquiler', async () => {
    const x = falso(true); expect(await atenderAvisos(ENV, { alquiler: ID }, 'Bearer t', 'https://app.lockumi.com', x.f)).toEqual({ enviados: 0 })
    expect(x.urls.filter(u => u.includes('/rpc/')).every(u => /lk_mediacion_vencimientos|lk_correos_pendientes/.test(u))).toBe(true)
    expect(x.urls.filter(u => u.includes('/rpc/')).at(-1)).toBe('https://p.supabase.co/rest/v1/rpc/lk_correos_pendientes')
  })
  it('la guarda de Legal también corta este camino (textos «LEGAL: revisar», sin borrador); el plazo de la mediación se revisó antes', async () => {
    const x = falso(true)
    await expect(atenderAvisos({ ...ENV, LOCKUMI_CORREOS_BORRADOR: undefined }, { alquiler: ID }, 'Bearer t', '', x.f)).rejects.toMatchObject({ estado: 503 })
    expect(x.urls).toContain('https://p.supabase.co/rest/v1/rpc/lk_mediacion_vencimientos')
  })
})

describe('corrida diaria (/api/borrados)', () => {
  const sb = (url: string) => url.includes('lk_mediacion_por_borrar') ? Response.json([]) : url.includes('lk_correos_pendientes') ? Response.json([]) : Response.json(0)
  it('sin CORREOS_C no toca los correos, pero SÍ vence el plazo de la mediación (Legal 25/10, punto 3)', async () => {
    const urls: string[] = []; const r = await ejecutarBorrados({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv' }, (async (u: string) => { urls.push(u); return sb(u) }) as never)
    expect(r.correos).toBeUndefined(); expect(urls.some(u => u.includes('correo'))).toBe(false)
    expect(r.vencidas).toBe(0); expect(urls).toContain('https://p.supabase.co/rest/v1/rpc/lk_mediacion_vencimientos')
  })
  it('si falla el vencimiento de la mediación, los borrados siguen', async () => {
    const r = await ejecutarBorrados({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv' }, (async (u: string) => u.includes('lk_mediacion_vencimientos') ? new Response('x', { status: 500 }) : sb(u)) as never)
    expect(r.vencidas).toMatchObject({ error: expect.any(String) }); expect(r.invitaciones).toBe(0)
  })
  it('con CORREOS_C=1 vence la mediación y envía; un error de correos no rompe los borrados', async () => {
    const ok = await ejecutarBorrados(ENV, (async (u: string) => sb(u)) as never, { ahora: Date.parse('2026-10-26T09:00:00Z') }); expect(ok.correos).toEqual({ enviados: 0, omitidos: 0, vencidas: 0, recordatorios: true })
    const mal = await ejecutarBorrados({ ...ENV, LOCKUMI_CORREOS_BORRADOR: undefined }, (async (u: string) => sb(u)) as never)
    expect(mal.correos).toMatchObject({ error: expect.stringContaining('LEGAL: revisar') }); expect(mal.invitaciones).toBe(0)
  })
})

describe('paso 22 · corrida cada hora: los recordatorios salen solo a las 09:00 UTC (3:00 a. m. CR)', () => {
  const C = 'c0ffee00-0000-4000-8000-0000000000aa'
  const pend = [
    { clave: `COR-C-02:${C}:dueno:d6`, correo: 'COR-C-02' }, { clave: `COR-C-04:${C}:inquilino:d4`, correo: 'COR-C-04' },
    { clave: `COR-C-05:${C}:inquilino:recordatorio`, correo: 'COR-C-05' }, { clave: `COR-C-07:${C}:inquilino`, correo: 'COR-C-07' },
  ].map(p => ({ ...p, contrato_id: C, rol: 'inquilino', para: 'lockumi+p22@mail.grokbot.com', datos: { variante: 'recordatorio', dia: p.clave.endsWith('d4') ? 4 : 6, via: 'automatico', deposito: 100, dueno: 0, inquilino: 100, vence: '2026-10-27T12:00:00Z' } }))
  const correr = async (ahora: string) => {
    const reservadas: string[] = []
    const f = (async (u: string, i?: RequestInit) => {
      if (u.includes('lk_correos_pendientes')) return Response.json(pend)
      if (u.includes('lk_correo_reservar')) { reservadas.push(JSON.parse(String(i?.body)).p_clave); return Response.json(false) }
      return u.includes('lk_mediacion_por_borrar') ? Response.json([]) : Response.json(0)
    }) as never
    const r = await ejecutarBorrados({ ...ENV, DEVOLUCION_CRON: '0' }, f, { ahora: Date.parse(ahora) })
    return { r, reservadas }
  }
  it('esRecordatorio reconoce d6/d4 y «recordatorio», no los avisos de un hecho', () => {
    expect(pend.map(p => esRecordatorio(p.clave))).toEqual([true, true, true, false])
    expect(esRecordatorio(`COR-C-06:${C}:mediacion:vencida`)).toBe(false)
  })
  it('a las 10:00 UTC solo intenta el aviso (COR-C-07); a las 09:00 UTC también los recordatorios', async () => {
    const otra = await correr('2026-10-26T10:00:00Z')
    expect(otra.reservadas).toEqual([`COR-C-07:${C}:inquilino`]); expect(otra.r.correos).toMatchObject({ recordatorios: false })
    const tres = await correr('2026-10-26T09:00:00Z')
    expect(tres.reservadas).toEqual(pend.map(p => p.clave)); expect(tres.r.correos).toMatchObject({ recordatorios: true })
  })
})

describe('P-05: espera de la mediación en C', () => {
  it('texto literal de la decisión', () => {
    expect(ESPERA_MEDIACION_C).toBe('Ahora cada parte elige cómo repartir el depósito. Cuando las dos acepten el mismo reparto, la persona mediadora lo registra y liberamos los USDC de prueba, cada monto menos el 0,3 % de comisión de Trustless Work. La persona mediadora puede ayudarles a llegar a un acuerdo, pero no decide por ustedes.')
  })
})

describe('rpc con la clave de servicio', () => {
  it('una función «returns void» (204 sin cuerpo) no rompe el envío', async () => {
    const { rpc } = await import('../../../api/_lib/supabase')
    const f = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch
    await expect(rpc({ url: 'https://x.supabase.co', key: 'k' } as never, 'lk_correo_marcar', {}, f)).resolves.toBeNull()
    const g = (async () => new Response('true', { status: 200 })) as unknown as typeof fetch
    await expect(rpc({ url: 'https://x.supabase.co', key: 'k' } as never, 'lk_correo_reservar', {}, g)).resolves.toBe(true)
  })
})
