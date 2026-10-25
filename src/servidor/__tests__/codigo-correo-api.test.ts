// Paso 19 · Segundo factor (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.): POST /api/codigo-correo (api/_lib/codigo-correo.ts)
// contra la migración real en Postgres (PGlite). El fetch falso hace de Supabase (auth, RPC con la clave de servicio o con la sesión de
// la persona, como rol authenticated) y de Resend (guarda los correos; nada sale de la prueba).
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { atenderCodigo, armarCodigo, huellaCodigo, mismaHuella, codigoAlAzar, ERRORES, asuntoCodigo, cuerpoCodigo } from '../../../api/_lib/codigo-correo'
import { PIE } from '../../../api/_lib/correo'
import { SEGUNDO_FACTOR } from '../../reputacion/textos'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now(), email_inquilino text);
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated, service_role; grant usage on schema auth to anon, authenticated, service_role;`
const URL_SB = 'https://proyecto.supabase.co', PEPPER = 'pepper-de-prueba-'.repeat(3)
const ENV = { SUPABASE_URL: URL_SB, SUPABASE_ANON_KEY: 'anon-de-prueba', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba', RESEND_API_KEY: 're_de_prueba', LOCKUMI_CODIGO_PEPPER: PEPPER }
let n = 0, db: PGlite
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
type Correo = { from: string; to: string[]; subject: string; html: string; text: string }
const enviados: Correo[] = []
let resendFalla = false
/** Supabase y Resend falsos. RPC con la clave de servicio: como superusuario sin sesión (las funciones son security definer y solo de
 *  service_role). RPC con la sesión de la persona: SET ROLE authenticated y auth.uid() = la sesión (así se prueban también los permisos). */
const f = vi.fn(async (url: string, init?: RequestInit) => {
  const h = (init?.headers ?? {}) as Record<string, string>
  if (url === 'https://api.resend.com/emails') {
    if (resendFalla) return new Response('{"message":"falló"}', { status: 500 })
    enviados.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: `re_${enviados.length}` }), { status: 200 })
  }
  if (url === `${URL_SB}/auth/v1/user`) { const m = /^Bearer sesion-(.+)$/.exec(h.authorization ?? ''); return m ? new Response(JSON.stringify({ id: m[1] })) : new Response('{}', { status: 401 }) }
  const m = new RegExp(`^${URL_SB}/rest/v1/rpc/(lk_[a-z_]+)$`).exec(url)
  if (!m) return new Response('{}', { status: 404 })
  const args = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, ks = Object.keys(args)
  const sql = `select public.${m[1]}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`
  const servicio = h.authorization === 'Bearer servicio-de-prueba' && h.apikey === 'servicio-de-prueba'
  const sesion = /^Bearer sesion-(.+)$/.exec(h.authorization ?? '')?.[1]
  if (!servicio && !(sesion && h.apikey === 'anon-de-prueba')) return new Response('{}', { status: 401 })
  try {
    await db.query(`select set_config('test.uid', $1, false)`, [servicio ? '' : sesion])
    if (!servicio) await db.exec('set role authenticated')
    const r = await uno<{ r: unknown }>(sql, ks.map(k => args[k] === null ? null : typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
    return new Response(JSON.stringify(r.r), { status: 200 })
  } catch (e) { return new Response(JSON.stringify({ message: (e as Error).message }), { status: 400 }) }
  finally { await db.exec('reset role'); await db.query(`select set_config('test.uid', '', false)`) }
}) as unknown as typeof fetch
const llamar = (u: string | null, body: unknown, env: Record<string, string | undefined> = ENV) => atenderCodigo(env, u ? `Bearer sesion-${u}` : null, body, 'http://localhost:4319', f)
async function persona(correo: string) {
  const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u])
  await db.query(`select public.lk_registrar_correo_verificado($1, $2, 'google', md5(random()::text) || md5(random()::text))`, [u, correo])
  return u
}
/** HMAC-SHA256 hecho aparte (Web Crypto), para comprobar la huella guardada. */
async function hmac(llave: string, m: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(llave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(m))), x => x.toString(16).padStart(2, '0')).join('')
}
const codigoDe = (c: Correo) => /Tu código de Lockumi: (\d{6})$/.exec(c.subject)![1]!
const otro = (c: string) => String((Number(c) + 1) % 1_000_000).padStart(6, '0')
const atrasar = (correo: string, min: number) => db.query(`update public.lk_codigos_correo set creado_en = creado_en - ($2::float8 * interval '1 minute'), vence_en = vence_en - ($2::float8 * interval '1 minute') where correo = $1`, [correo, min])

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
}, 30_000)

describe('pedir: manda el código al correo verificado de la sesión y guarda solo la huella', () => {
  it('correo: asunto y texto literales de Legal, pie de siempre, sin casilla ni botones; en la base, solo HMAC con pepper y sal', async () => {
    const c = 'pide@ejemplo.com', u = await persona(c)
    const r = await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    expect(r).toEqual({ estado: 200, cuerpo: { enviado: true, correo: c } })
    const m = enviados.at(-1)!, codigo = codigoDe(m)
    expect(m.to).toEqual([c]); expect(m.from).toBe('Lockumi <invitaciones@lockumi.com>')
    expect(m.subject).toBe(`Tu código de Lockumi: ${codigo}`)
    const cuerpo = 'Escribe este código en Lockumi para eliminar tu cuenta. Vale 10 minutos. No lo compartas con nadie: Lockumi nunca te lo va a pedir por otro medio. Si no lo pediste, ignora este correo; sin el código no se hace nada.'
    expect(m.text).toContain(cuerpo); expect(m.text).toContain(PIE); expect(m.html).toContain(PIE.replace(/'/g, '&#39;'))
    expect(m.html).not.toMatch(/type="checkbox"|casilla|PIE_BAJA|dejar de recibir/i)
    expect([...m.html.matchAll(/<a /g)]).toHaveLength(1); expect(m.html).toContain('http://localhost:4319/privacidad')
    const fila = await uno<{ huella: string; sal: string; usuario: string; correo: string; accion: string; intentos: number }>('select * from public.lk_codigos_correo where usuario = $1', [u])
    expect(JSON.stringify(fila)).not.toContain(codigo)
    expect(fila.huella).toBe(await hmac(PEPPER, `${fila.sal}|${u}|${c}|eliminar|${codigo}`))
    expect(fila.huella).not.toBe(await hmac('otro-pepper-'.repeat(4), `${fila.sal}|${u}|${c}|eliminar|${codigo}`))
    expect(fila.sal).toMatch(/^[0-9a-f]{32}$/); expect(fila.intentos).toBe(0)
  })
  it('descargar: el texto dice «descargar tus datos»', async () => {
    const u = await persona('pide-d@ejemplo.com'); await llamar(u, { paso: 'pedir', accion: 'descargar' })
    expect(enviados.at(-1)!.text).toContain('Escribe este código en Lockumi para descargar tus datos. Vale 10 minutos.')
  })
  it('reenviar antes de un minuto: 429 con el texto de Legal (y el correo, para mostrar la pantalla); sin correo verificado: 403', async () => {
    const c = 'minuto@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    const antes = enviados.length, r = await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    expect(r).toEqual({ estado: 429, cuerpo: { error: 'Ya te enviamos un código. Espera un minuto antes de pedir otro.', motivo: 'minuto', correo: c } })
    expect(enviados.length).toBe(antes)
    const sin = uid(); await db.query('insert into auth.users(id) values ($1)', [sin])
    expect((await llamar(sin, { paso: 'pedir', accion: 'eliminar' })).cuerpo).toMatchObject({ motivo: 'correo', error: ERRORES.correo })
  })
  it('5 por hora', async () => {
    const c = 'hora@ejemplo.com', u = await persona(c)
    for (let k = 0; k < 5; k++) { expect((await llamar(u, { paso: 'pedir', accion: 'descargar' })).estado).toBe(200); await atrasar(c, 1.5) }
    expect((await llamar(u, { paso: 'pedir', accion: 'descargar' })).cuerpo).toMatchObject({ motivo: 'hora' })
  })
  it('si Resend falla: 502 «envio» y el código se borra (se puede pedir otro enseguida)', async () => {
    const c = 'resend@ejemplo.com', u = await persona(c); resendFalla = true
    try { expect(await llamar(u, { paso: 'pedir', accion: 'eliminar' })).toEqual({ estado: 502, cuerpo: { error: ERRORES.envio, motivo: 'envio' } }) } finally { resendFalla = false }
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_codigos_correo where usuario = $1', [u])).n).toBe(0)
    expect((await llamar(u, { paso: 'pedir', accion: 'eliminar' })).estado).toBe(200)
  })
  it('cierre por defecto: sin pepper (o corto), sin Resend o sin base → 503; sin sesión → 401; acción desconocida → 400', async () => {
    const u = await persona('cierre@ejemplo.com'), b = { paso: 'pedir', accion: 'eliminar' }
    for (const env of [{ ...ENV, LOCKUMI_CODIGO_PEPPER: undefined }, { ...ENV, LOCKUMI_CODIGO_PEPPER: 'corto' }, { ...ENV, RESEND_API_KEY: '' }, { ...ENV, SUPABASE_SERVICE_ROLE_KEY: undefined }])
      expect((await llamar(u, b, env)).estado).toBe(503)
    expect((await llamar(null, b)).estado).toBe(401)
    expect((await atenderCodigo(ENV, 'Bearer otra-cosa', b, null, f)).estado).toBe(401)
    expect((await llamar(u, { paso: 'pedir', accion: 'borrar-todo' })).estado).toBe(400)
    expect((await llamar(u, { paso: 'otro', accion: 'eliminar' })).estado).toBe(400)
  })
})

describe('confirmar: código correcto → la acción en el servidor; un solo uso, 5 intentos, 10 minutos, ligado a la acción', () => {
  it('eliminar: código mal → 403 con el texto de Legal; código bien → se pide el borrado; el mismo código otra vez → 403', async () => {
    const c = 'elimina@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    const codigo = codigoDe(enviados.at(-1)!)
    expect(await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo: otro(codigo) })).toEqual({ estado: 403, cuerpo: { error: ERRORES.codigo, motivo: 'codigo' } })
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_solicitudes_borrado where correo = $1', [c])).n).toBe(0)
    const r = await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo })
    expect(r.estado).toBe(200); expect(r.cuerpo.hecho).toBe(true)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_solicitudes_borrado where correo = $1', [c])).n).toBe(1)
    expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo })).cuerpo).toMatchObject({ motivo: 'codigo' })
  })
  it('descargar: devuelve lk_mis_datos_reputacion del correo de la sesión (con el papel)', async () => {
    const c = 'descarga@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'descargar' })
    const r = await llamar(u, { paso: 'confirmar', accion: 'descargar', codigo: codigoDe(enviados.at(-1)!), rol: 'dueno' })
    expect(r.estado).toBe(200); expect(r.cuerpo.datos).toMatchObject({ correo: c, cuentas: 1, perfiles: [] })
  })
  it('5 intentos: después de 5 códigos mal, ni el correcto sirve', async () => {
    const u = await persona('intentos@ejemplo.com'); await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    const codigo = codigoDe(enviados.at(-1)!)
    for (let k = 0; k < 5; k++) expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo: otro(codigo) })).estado).toBe(403)
    expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo })).cuerpo).toMatchObject({ motivo: 'codigo' })
  })
  it('vencido a los 10 minutos', async () => {
    const c = 'vencido@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'descargar' }); await atrasar(c, 10.5)
    expect((await llamar(u, { paso: 'confirmar', accion: 'descargar', codigo: codigoDe(enviados.at(-1)!) })).cuerpo).toMatchObject({ motivo: 'codigo' })
  })
  it('ligado a la acción y a la sesión: el código de «descargar» no elimina; el de una sesión no sirve en otra con el mismo correo', async () => {
    const c = 'liga@ejemplo.com', u = await persona(c), otra = await persona(c); await llamar(u, { paso: 'pedir', accion: 'descargar' })
    const codigo = codigoDe(enviados.at(-1)!)
    expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo })).cuerpo).toMatchObject({ motivo: 'codigo' })
    expect((await llamar(otra, { paso: 'confirmar', accion: 'descargar', codigo })).cuerpo).toMatchObject({ motivo: 'codigo' })
    expect((await llamar(u, { paso: 'confirmar', accion: 'descargar', codigo })).estado).toBe(200)
  })
  it('un código nuevo anula el anterior («Revisa el último correo de Lockumi»)', async () => {
    const c = 'ultimo@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'eliminar' }); const viejo = codigoDe(enviados.at(-1)!)
    await atrasar(c, 1.5); await llamar(u, { paso: 'pedir', accion: 'eliminar' }); const nuevo = codigoDe(enviados.at(-1)!)
    if (viejo !== nuevo) expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo: viejo })).cuerpo).toMatchObject({ motivo: 'codigo' })
    expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo: nuevo })).estado).toBe(200)
  })
  it('código con otra forma (letras, 5 o 7 números): 400 sin gastar un intento', async () => {
    const c = 'forma@ejemplo.com', u = await persona(c); await llamar(u, { paso: 'pedir', accion: 'eliminar' })
    for (const codigo of ['12345', '1234567', 'abcdef', '', null]) expect((await llamar(u, { paso: 'confirmar', accion: 'eliminar', codigo })).cuerpo).toMatchObject({ motivo: 'codigo' })
    expect((await uno<{ i: number }>('select intentos i from public.lk_codigos_correo where usuario = $1', [u])).i).toBe(0)
  })
  it('la app no puede saltarse el código: llamar directo a la acción con su sesión se rechaza', async () => {
    const c = 'directo@ejemplo.com', u = await persona(c)
    const r = await f(`${URL_SB}/rest/v1/rpc/lk_pedir_borrado_cuenta`, { method: 'POST', headers: { apikey: 'anon-de-prueba', authorization: `Bearer sesion-${u}` }, body: JSON.stringify({ p_correo: c }) })
    expect(r.status).toBe(400); expect(await r.text()).toContain('Ese código no es correcto o ya venció')
    const d = await f(`${URL_SB}/rest/v1/rpc/lk_mis_datos_reputacion`, { method: 'POST', headers: { apikey: 'anon-de-prueba', authorization: `Bearer sesion-${u}` }, body: JSON.stringify({ p_correo: c }) })
    expect(d.status).toBe(400)
    const h = await f(`${URL_SB}/rest/v1/rpc/lk_codigo_intento`, { method: 'POST', headers: { apikey: 'anon-de-prueba', authorization: `Bearer sesion-${u}` }, body: JSON.stringify({ p_usuario: u, p_accion: 'eliminar' }) })
    expect(h.status).toBe(400); expect(await h.text()).toMatch(/permission denied/)
  })
})

describe('piezas: código al azar, huella y comparación en tiempo constante, textos iguales en la app', () => {
  it('codigoAlAzar: siempre 6 números (con ceros a la izquierda)', () => {
    const xs = Array.from({ length: 2000 }, codigoAlAzar)
    expect(xs.every(x => /^\d{6}$/.test(x))).toBe(true); expect(new Set(xs).size).toBeGreaterThan(1900)
  })
  it('huella: depende del pepper, la sal, la sesión, el correo, la acción y el código', async () => {
    const S = 'ab'.repeat(16), base = await huellaCodigo(PEPPER, S, 'u', 'a@e.com', 'eliminar', '123456')
    expect(base).toBe(await hmac(PEPPER, `${S}|u|a@e.com|eliminar|123456`)); expect(base).toMatch(/^[0-9a-f]{64}$/)
    for (const h of [await huellaCodigo('x'.repeat(32), S, 'u', 'a@e.com', 'eliminar', '123456'), await huellaCodigo(PEPPER, 'cd'.repeat(16), 'u', 'a@e.com', 'eliminar', '123456'),
      await huellaCodigo(PEPPER, S, 'v', 'a@e.com', 'eliminar', '123456'), await huellaCodigo(PEPPER, S, 'u', 'b@e.com', 'eliminar', '123456'),
      await huellaCodigo(PEPPER, S, 'u', 'a@e.com', 'descargar', '123456'), await huellaCodigo(PEPPER, S, 'u', 'a@e.com', 'eliminar', '123457')]) expect(h).not.toBe(base)
  })
  it('mismaHuella compara en tiempo constante (crypto.subtle.verify de HMAC; nunca === sobre la huella) y rechaza huellas mal formadas', async () => {
    const S = 'ab'.repeat(16), a = await huellaCodigo(PEPPER, S, 'u', 'a@e.com', 'eliminar', '123456')
    expect(await mismaHuella(PEPPER, a, S, 'u', 'a@e.com', 'eliminar', '123456')).toBe(true)
    expect(await mismaHuella(PEPPER, a, S, 'u', 'a@e.com', 'eliminar', '123457')).toBe(false)
    expect(await mismaHuella(PEPPER, a, S, 'u', 'a@e.com', 'descargar', '123456')).toBe(false)
    expect(await mismaHuella('otro-pepper-'.repeat(4), a, S, 'u', 'a@e.com', 'eliminar', '123456')).toBe(false)
    expect(await mismaHuella(PEPPER, a.replace(/.$/, c => c === '0' ? '1' : '0'), S, 'u', 'a@e.com', 'eliminar', '123456')).toBe(false)
    for (const h of [a.slice(0, 62), '', a.toUpperCase(), 'z'.repeat(64)]) expect(await mismaHuella(PEPPER, h, S, 'u', 'a@e.com', 'eliminar', '123456')).toBe(false)
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('api/_lib/codigo-correo.ts', 'utf8')
    expect(s).toMatch(/crypto\.subtle\.verify\('HMAC'/); expect(s).toMatch(/crypto\.getRandomValues\(b\)/)
    expect(s).not.toMatch(/huella\s*[!=]==|[!=]==\s*t\.huella|\bcodigo\s*[!=]==\s*[a-z]/)
    expect(s).not.toMatch(/console\.[a-z]+\([^\n]*(\$\{(codigo|llave|pepper|c\.)|, (codigo|llave|pepper)\b)/)   // nunca se registra el código ni una clave
  })
  it('los errores del servidor son los mismos que muestra la app; los de Legal, literales', () => {
    expect(SEGUNDO_FACTOR.errores).toEqual(ERRORES)
    expect(ERRORES.codigo).toBe('Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».')
    expect(ERRORES.minuto).toBe('Ya te enviamos un código. Espera un minuto antes de pedir otro.')
    expect(asuntoCodigo('012345')).toBe('Tu código de Lockumi: 012345')
    expect(cuerpoCodigo('descargar')).toBe('Escribe este código en Lockumi para descargar tus datos. Vale 10 minutos. No lo compartas con nadie: Lockumi nunca te lo va a pedir por otro medio. Si no lo pediste, ignora este correo; sin el código no se hace nada.')
    const c = armarCodigo('012345', 'eliminar', 'https://app.lockumi.com'); expect(c.html).toContain('#FFF5EE'); expect(c.html).toContain('#3D2A22')
  })
})
