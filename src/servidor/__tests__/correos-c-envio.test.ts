// Escenario C · envío de COR-C-01 a COR-C-09 desde el servidor (api/_lib/correos-c.ts), con Supabase y Resend simulados.
// Una sola vez por evento (reserva + clave de idempotencia), la casilla manda (salvo 08 y 09), la persona mediadora recibe su
// versión, y la REGLA DURA: ningún texto «LEGAL: revisar» sale en un correo real (envío y build de producción fallan).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEXTOS, textosPorRevisar, PIE, PIE_BAJA, DEMO, NOTA_CONFIRMAR, usdc, llega } from '../../../api/_lib/textos-correos'
import { procesarCorreos, enviarCorreoCuenta, abrirCorreo, revisarTextos, borradorPermitido, armarC, plantillaDe, BUZON_PRUEBA, sha256 } from '../../../api/_lib/correos-c'
import { guardaCorreos } from '../../../api/_lib/guarda-correos'

const URL_SB = 'https://proyecto.supabase.co', LLAVE = 'clave-de-servicio-de-prueba', RESEND = 're_prueba_no_real'
const BASE = { SUPABASE_URL: URL_SB, SUPABASE_SERVICE_ROLE_KEY: LLAVE, RESEND_API_KEY: RESEND, CORREOS_C: '1' }
const BORRADOR = { ...BASE, LOCKUMI_CORREOS_BORRADOR: '1', CORREO_MEDIACION: 'lockumi+e2ec-mediador@mail.grokbot.com' }
const ID = '11111111-2222-4333-8444-555555555555'
type P = { clave: string; correo: string; contrato_id: string; rol: string; para: string | null; datos: Record<string, unknown> }
const pend = (correo: string, rol: string, para: string | null, datos: Record<string, unknown> = {}, sufijo = ''): P =>
  ({ clave: `${correo}:${ID}:${rol}${sufijo}`, correo, contrato_id: ID, rol, para, datos: { deposito: 20, ...datos } })

function falso(pendientes: P[], o: { reservar?: (clave: string) => boolean; resendFalla?: boolean } = {}) {
  const llamadas: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = []
  const f = vi.fn(async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : {}; llamadas.push({ url, body, headers: init.headers as Record<string, string> })
    if (url.endsWith('/rpc/lk_mediacion_vencimientos')) return Response.json(0)
    if (url.endsWith('/rpc/lk_correos_pendientes')) return Response.json(pendientes)
    if (url.endsWith('/rpc/lk_correo_reservar')) return Response.json(o.reservar ? o.reservar(body.p_clave) : true)
    if (url.endsWith('/rpc/lk_correo_marcar')) return Response.json(null)
    if (url.endsWith('/rpc/lk_correo_abierto')) return Response.json(body.p_token_hash === await sha256('a'.repeat(64)) ? ID : null)
    if (url.endsWith('/rpc/lk_correo_cuenta_registrado')) return Response.json(false)
    if (url === 'https://api.resend.com/emails') return o.resendFalla ? new Response('{}', { status: 500 }) : Response.json({ id: 'resend-' + llamadas.length })
    return new Response('no', { status: 404 })
  })
  return { f: f as unknown as typeof fetch, llamadas, resend: () => llamadas.filter(l => l.url === 'https://api.resend.com/emails') }
}
const fs = () => import(['node', 'fs'].join(':')) as Promise<{ readFileSync(p: string, c: 'utf8'): string }>

describe('textos (api/_lib/textos-correos.ts): un solo archivo, con la marca de Legal', () => {
  it('tiene todos los correos de Legal COR-C-01 a COR-C-09 (y la versión de la persona mediadora de COR-C-05)', () => {
    const ids = new Set(Object.values(TEXTOS).map(t => t.id))
    for (let i = 1; i <= 9; i++) expect(ids.has(`COR-C-0${i}` as never)).toBe(true)
    expect(TEXTOS['COR-C-05/mediacion']).toBeTruthy()
  })
  it('la marca del comentario «LEGAL: revisar» coincide con `legal` en cada plantilla', async () => {
    const src = (await fs()).readFileSync('api/_lib/textos-correos.ts', 'utf8').split('\n')
    for (const [k, t] of Object.entries(TEXTOS)) {
      const i = src.findIndex(l => l.trimStart().startsWith(`'${k}': {`)); expect(i, k).toBeGreaterThan(0)
      expect(/\/\/ LEGAL: revisar\b/.test(src[i - 1]), k).toBe(t.legal === 'revisar')
      expect(/\/\/ LEGAL: (revisar|revisado)/.test(src[i - 1]), k).toBe(true)
    }
  })
  it('español neutro, sin voseo ni palabras técnicas, sin publicidad', () => {
    const d = { deposito: 20, reclamado: 5, vence: Date.UTC(2026, 10, 2, 16), dueno: 5, inquilino: 15, motivo: 'rechazo' as const, pedidoEn: Date.UTC(2026, 9, 25, 21, 21), limite: Date.UTC(2026, 10, 2), eliminadoEn: Date.UTC(2026, 10, 1) }
    for (const t of Object.values(TEXTOS)) {
      const x = t.asunto(d) + ' ' + t.cuerpo(d)
      expect(x).not.toMatch(/\b(tenés|podés|querés|sabés|vos|respondé|tocá|revisá|escribinos)\b/i)
      expect(x).not.toMatch(/\b(blockchain|escrow|wallet|smart contract|token|hash|API|webhook)\b/i)
      expect(x).not.toMatch(/\b(oferta|promoción|descuento|suscríbete|novedades)\b/i)
      expect(x).not.toMatch(/undefined|NaN|\{|\}/)
    }
  })
  it('montos de prueba menos el 0,3 % de Trustless Work', () => {
    expect(usdc(20)).toBe('20,00 USDC de prueba'); expect(usdc(0.5)).toBe('0,50 USDC de prueba'); expect(llega(20)).toBe(19.94)
    expect(TEXTOS['COR-C-07/devuelto'].cuerpo({ deposito: 20 })).toContain('llegan 19,94 USDC de prueba')
    expect(TEXTOS['COR-C-06/partes'].cuerpo({ deposito: 20, dueno: 5, inquilino: 15 })).toContain('Llegan 4,985 USDC de prueba al dueño y 14,955 USDC de prueba al inquilino; Trustless Work descuenta 0,06 USDC de prueba')   // exactos (Katherine 27/10): 4,985 + 14,955 + 0,06 = 20
  })
})

describe('REGLA DURA · nada «LEGAL: revisar» sale en un correo real', () => {
  // Desde el OK de Legal (25/10, 5:31 p. m.) no queda ningún texto por revisar: la guarda se prueba con una plantilla marcada a mano.
  beforeEach(() => { TEXTOS['COR-C-02/d4'].legal = 'revisar' }); afterEach(() => { TEXTOS['COR-C-02/d4'].legal = 'revisado' })
  it('ningún texto queda por revisar en el código (Legal 25/10, 5:31 p. m.)', () => { TEXTOS['COR-C-02/d4'].legal = 'revisado'; expect(textosPorRevisar()).toEqual([]) })
  it('con textos por revisar, enviar falla (cron, /api/correo y correos de cuenta), sin llamar a Resend', async () => {
    expect(textosPorRevisar().length).toBeGreaterThan(0)
    expect(() => revisarTextos(BASE)).toThrow(/LEGAL: revisar/)
    const { f, resend } = falso([pend('COR-C-01', 'dueno', 'lockumi@mail.grokbot.com', { vence: Date.now() })])
    await expect(procesarCorreos(BASE, {}, f)).rejects.toThrow(/LEGAL: revisar/)
    await expect(enviarCorreoCuenta(BASE, { correo: 'COR-C-08', para: 'lockumi@mail.grokbot.com', pedidoEn: Date.now() }, f)).rejects.toThrow(/LEGAL: revisar/)
    expect(resend()).toHaveLength(0)
  })
  it('la excepción local (LOCKUMI_CORREOS_BORRADOR=1) nunca vale en Vercel ni con VERCEL_ENV=production', () => {
    expect(borradorPermitido({ LOCKUMI_CORREOS_BORRADOR: '1' })).toBe(true)
    expect(borradorPermitido({ LOCKUMI_CORREOS_BORRADOR: '1', VERCEL: '1' })).toBe(false)
    expect(borradorPermitido({ LOCKUMI_CORREOS_BORRADOR: '1', VERCEL_ENV: 'production' })).toBe(false)
    expect(borradorPermitido({ LOCKUMI_CORREOS_BORRADOR: '1', VERCEL: '1', VERCEL_ENV: 'preview' })).toBe(false)
    expect(borradorPermitido({})).toBe(false)
    expect(() => revisarTextos({ ...BORRADOR, VERCEL_ENV: 'production' })).toThrow(/LEGAL: revisar/)
  })
  it('con la excepción local, solo al buzón de prueba: cualquier otro destinatario se omite', async () => {
    const { f, resend } = falso([pend('COR-C-01', 'dueno', 'otra@correo.com', { vence: Date.now() }), pend('COR-C-01', 'inquilino', 'lockumi+e2ec-x-inquilino@mail.grokbot.com', { vence: Date.now() })])
    const r = await procesarCorreos(BORRADOR, { pausaMs: 0 }, f)
    expect(r.omitidos).toEqual([{ clave: `COR-C-01:${ID}:dueno`, motivo: 'solo-buzon-de-prueba' }])
    expect(resend().map(l => l.body.to)).toEqual([['lockumi+e2ec-x-inquilino@mail.grokbot.com']])
    expect(BUZON_PRUEBA.test('lockumi@mail.grokbot.com')).toBe(true); expect(BUZON_PRUEBA.test('lockumi@mail.grokbot.com.evil.io')).toBe(false)
  })
  it('el build de producción falla mientras haya textos por revisar; el de vista previa y el local no', () => {
    const conf = (env: Record<string, string>) => () => (guardaCorreos(env).configResolved as (c: { command: string }) => void)({ command: 'build' })
    expect(conf({ VERCEL_ENV: 'production' })).toThrow(/LEGAL: revisar/)
    expect(conf({ VERCEL_ENV: 'production', LOCKUMI_CORREOS_BORRADOR: '1' })).toThrow(/LEGAL: revisar/)
    expect(conf({ VERCEL_ENV: 'preview', VERCEL: '1' })).not.toThrow()
    expect(conf({})).not.toThrow()
  })
  it('vite.config.ts usa la guarda', async () => {
    expect((await fs()).readFileSync('vite.config.ts', 'utf8')).toMatch(/guardaCorreos\(/)
  })
})

describe('procesarCorreos · una sola vez por evento, con registro', () => {
  it('apagado (sin CORREOS_C=1) no hace nada', async () => {
    const { f, llamadas } = falso([])
    expect(await procesarCorreos({ ...BORRADOR, CORREOS_C: '' }, {}, f)).toEqual({ apagado: true, enviados: [], omitidos: [], vencidas: 0 })
    expect(llamadas).toHaveLength(0)
  })
  it('vence la mediación, pide los pendientes con el reloj de prueba, reserva, envía con la clave de idempotencia y marca', async () => {
    const { f, llamadas } = falso([pend('COR-C-01', 'dueno', 'lockumi+e2ec-a-dueno@mail.grokbot.com', { vence: Date.now() })])
    const r = await procesarCorreos(BORRADOR, { contrato: ID, ahora: '2026-11-01T10:00:00.000Z', pausaMs: 0 }, f)
    expect(r.enviados.map(e => [e.clave, e.plantilla])).toEqual([[`COR-C-01:${ID}:dueno`, 'COR-C-01/dueno']])
    expect(llamadas.map(l => l.url.replace(URL_SB, ''))).toEqual(['/rest/v1/rpc/lk_mediacion_vencimientos', '/rest/v1/rpc/lk_correos_pendientes', '/rest/v1/rpc/lk_correo_reservar', 'https://api.resend.com/emails', '/rest/v1/rpc/lk_correo_marcar'])
    expect(llamadas[1].body).toEqual({ p_contrato: ID, p_ahora: '2026-11-01T10:00:00.000Z' })
    expect(llamadas[3].headers['idempotency-key']).toBe(`COR-C-01:${ID}:dueno`)
    expect(llamadas[3].body).toMatchObject({ from: 'Lockumi <invitaciones@lockumi.com>', subject: 'Tienes 7 días naturales para revisar la casa y reclamar' })
    expect(llamadas[4].body).toEqual({ p_clave: `COR-C-01:${ID}:dueno`, p_enviado: true, p_resend_id: 'resend-4' })
    expect(JSON.stringify(r)).not.toContain(RESEND); expect(JSON.stringify(r)).not.toContain(LLAVE)
  })
  it('si otra corrida ya lo reservó, no lo envía otra vez', async () => {
    const { f, resend } = falso([pend('COR-C-01', 'dueno', 'lockumi@mail.grokbot.com', { vence: Date.now() })], { reservar: () => false })
    const r = await procesarCorreos(BORRADOR, { pausaMs: 0 }, f)
    expect(resend()).toHaveLength(0); expect(r.omitidos[0].motivo).toBe('ya-enviado')
  })
  it('si Resend falla, queda «fallido» (se reintenta en la próxima corrida)', async () => {
    const { f, llamadas } = falso([pend('COR-C-01', 'dueno', 'lockumi@mail.grokbot.com', { vence: Date.now() })], { resendFalla: true })
    const r = await procesarCorreos(BORRADOR, { pausaMs: 0 }, f)
    expect(r.omitidos[0].motivo).toBe('resend-fallo')
    expect(llamadas.at(-1)!.body).toEqual({ p_clave: `COR-C-01:${ID}:dueno`, p_enviado: false, p_resend_id: null })
  })
  it('la persona mediadora recibe su versión en CORREO_MEDIACION; sin esa variable se omite', async () => {
    const p = [pend('COR-C-05', 'mediacion', null, { reclamado: 5, motivo: 'rechazo', vence: Date.now() })]
    const a = falso(p); const r = await procesarCorreos(BORRADOR, { pausaMs: 0 }, a.f)
    expect(r.enviados[0]).toMatchObject({ plantilla: 'COR-C-05/mediacion', para: 'lockumi+e2ec-mediador@mail.grokbot.com' })
    const html = String(a.resend()[0].body.html)
    expect(html).toContain('confidencial'); expect(html).not.toContain(PIE_BAJA)
    const b = falso(p); expect((await procesarCorreos({ ...BORRADOR, CORREO_MEDIACION: '' }, { pausaMs: 0 }, b.f)).omitidos[0].motivo).toBe('sin-correo-de-mediacion')
  })
  it('COR-C-03 lleva un enlace de un solo uso que registra la apertura (se guarda solo el sha256)', async () => {
    const { f, llamadas } = falso([pend('COR-C-03', 'inquilino', 'lockumi@mail.grokbot.com', { reclamado: 5, vence: Date.now() })])
    await procesarCorreos(BORRADOR, { pausaMs: 0, origen: 'https://app.lockumi.com' }, f)
    const tok = /\/api\/correo\?abrir=([0-9a-f]{64})/.exec(String(llamadas.find(l => l.url.includes('resend'))!.body.html))![1]
    expect(llamadas.find(l => l.url.endsWith('lk_correo_reservar'))!.body.p_token_hash).toBe(await sha256(tok))
    const b = falso([]); expect(await abrirCorreo(BASE, 'a'.repeat(64), b.f)).toBe(ID); expect(await abrirCorreo(BASE, 'x', b.f)).toBeNull()
  })
  it('elige la plantilla por evento y variante', () => {
    expect(plantillaDe(pend('COR-C-02', 'dueno', 'a@b.co', { dia: 6 }, ':d6'))).toBe('COR-C-02/d6')
    expect(plantillaDe(pend('COR-C-04', 'inquilino', 'a@b.co', { dia: 4 }, ':d4'))).toBe('COR-C-04/d4')
    expect(plantillaDe(pend('COR-C-05', 'mediacion', null, { variante: 'recordatorio' }))).toBe('COR-C-05/recordatorio-mediacion')
    expect(plantillaDe(pend('COR-C-06', 'dueno', 'a@b.co', { variante: 'vencida' }))).toBe('COR-C-06/vencida')
    expect(plantillaDe(pend('COR-C-07', 'dueno', 'a@b.co', { via: 'automatico' }))).toBe('COR-C-07/automatico')
  })
})

describe('diseño de la invitación y pies', () => {
  it('logo, paleta (#FF6B35, #E8531F, #FFB08A, crema #FFF5EE, café #3D2A22), demo arriba, pies; nunca texto blanco ni la marca de Legal', () => {
    const c = armarC('COR-C-01/dueno', { deposito: 20, vence: Date.now() }, { origen: 'https://app.lockumi.com', alquiler: ID })
    for (const x of ['#FF6B35', '#E8531F', '#FFB08A', '#FFF5EE', '#3D2A22', 'https://app.lockumi.com/icon-192.png', DEMO, PIE, PIE_BAJA, NOTA_CONFIRMAR, 'Privacidad']) expect(c.html).toContain(x.replace(/"/g, '&quot;').replace(/«/g, '«'))
    expect(c.html).toContain(`https://app.lockumi.com/#/alquiler/${ID}?aviso=cor-c-01&amp;canal=correo&amp;confirmar=devolver`)
    expect(c.html).not.toMatch(/color:\s*#fff(fff)?\b/i); expect(c.html + c.texto).not.toContain('LEGAL')
    const s = armarC('COR-C-09', { pedidoEn: Date.now(), eliminadoEn: Date.now() }, { origen: 'https://app.lockumi.com' })
    expect(s.html).not.toContain(PIE_BAJA); expect(s.html).not.toContain('<a href="https://app.lockumi.com/#')
  })
})

describe('correos de servicio COR-C-08 y COR-C-09 (no dependen de la casilla)', () => {
  it('se envían sin mirar la casilla, una sola vez por pedido', async () => {
    const { f, llamadas } = falso([])
    const r = await enviarCorreoCuenta(BORRADOR, { correo: 'COR-C-08', variante: 'A', para: 'lockumi+e2ec-cuenta@mail.grokbot.com', pedidoEn: Date.UTC(2026, 9, 25, 21, 21) }, f)
    expect(r.plantilla).toBe('COR-C-08/A')
    expect(llamadas.some(l => l.url.includes('consentimiento'))).toBe(false)
    const res = llamadas.find(l => l.url.includes('resend'))!
    expect(res.headers['idempotency-key']).toMatch(/^COR-C-08:/); expect(String(res.body.text)).toContain('3:21\u00a0p.\u00a0m.')
    expect(String(res.body.text)).toContain('Fecha límite: 30 oct 2026')
  })
})
