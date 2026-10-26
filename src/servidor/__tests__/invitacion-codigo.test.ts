// Invitación con otro correo (26/10/2026, Katherine): quien abre la invitación con OTRA cuenta (p. ej. Apple) pide el código de 6 números
// al correo INVITADO (/api/codigo-correo, acción 'invitacion') y, con el código correcto, el servidor acepta con ESA cuenta y registra el
// correo invitado verificado (migración 20261026040000). Sin código, otro correo sigue rechazado. PGlite con TODAS las migraciones; el fetch
// falso hace de Supabase y de Resend (nada sale de la prueba). También: la revert deja la base como antes.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { atenderCodigo, INVITACION_NO } from '../../../api/_lib/codigo-correo'
import { correoOculto, textoInvitacionEnviada, BOTON_CODIGO_INVITACION } from '../../prueba/invitacion'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const URL_SB = 'https://proyecto.supabase.co'
const ENV = { SUPABASE_URL: URL_SB, SUPABASE_ANON_KEY: 'anon-de-prueba', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba', RESEND_API_KEY: 're_de_prueba', LOCKUMI_CODIGO_PEPPER: 'pepper-de-prueba-'.repeat(3) }
const DUENO = '00000000-0000-4000-8000-0000000004d1', APPLE = '00000000-0000-4000-8000-0000000004a1', OTRA = '00000000-0000-4000-8000-0000000004b1'
const INVITADO = 'katherine.demo@hotmail.com', RELAY = 'x1y2@privaterelay.appleid.com'
const OTRO_CORREO = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
type Correo = { to: string[]; subject: string; text: string }
const enviados: Correo[] = []
const f = vi.fn(async (url: string, init?: RequestInit) => {
  const h = (init?.headers ?? {}) as Record<string, string>
  if (url === 'https://api.resend.com/emails') { enviados.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: `re_${enviados.length}` })) }
  if (url === `${URL_SB}/auth/v1/user`) { const m = /^Bearer sesion-(.+)$/.exec(h.authorization ?? ''); return m ? new Response(JSON.stringify({ id: m[1] })) : new Response('{}', { status: 401 }) }
  const m = new RegExp(`^${URL_SB}/rest/v1/rpc/(lk_[a-z_0-9]+)$`).exec(url)
  if (!m) return new Response('{}', { status: 404 })
  const args = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, ks = Object.keys(args)
  const servicio = h.authorization === 'Bearer servicio-de-prueba', sesion = /^Bearer sesion-(.+)$/.exec(h.authorization ?? '')?.[1]
  try {
    await db.query(`select set_config('test.uid', $1, false)`, [servicio ? '' : sesion])
    if (!servicio) await db.exec('set role authenticated')
    const r = await uno<{ r: unknown }>(`select public.${m[1]}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`, ks.map(k => args[k]))
    const v = r!.r
    return new Response(v === null || v === undefined ? null : JSON.stringify(v), { status: v === null || v === undefined ? 204 : 200 })
  } catch (e) { return new Response(JSON.stringify({ message: (e as Error).message }), { status: 400 }) }
  finally { await db.exec('reset role'); await db.query(`select set_config('test.uid', '', false)`) }
}) as unknown as typeof fetch
const llamar = (u: string, body: Record<string, unknown>) => atenderCodigo(ENV, `Bearer sesion-${u}`, body, 'http://localhost:4319', f)
const codigoDe = (c: Correo) => /Tu código de Lockumi: (\d{6})$/.exec(c.subject)![1]!
const verificar = (u: string, c: string) => db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, $2, 'email') on conflict do nothing`, [u, c])
async function crear() {
  await db.query(`select set_config('test.uid', $1, false)`, [DUENO])
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  const r = (await uno<{ r: { id: string; token: string } }>(`select public.lk_crear_contrato_invitando('Ejemplo · Casa demo', 20, $1::date, $2::date, '{No fumar}', $3, 'demo@lockumi.com', $4) r`, [hoy, fin, INVITADO, DECL]))!.r
  await db.query(`select set_config('test.uid', '', false)`); return r
}
const aceptarDirecto = async (u: string, id: string, token: string) => {
  await db.query(`select set_config('test.uid', $1, false)`, [u]); await db.exec('set role authenticated')
  try { await db.query(`select public.lk_aceptar_invitacion($1, $2, $3)`, [id, token, INVITADO]) } finally { await db.exec('reset role') }
}
const inquilino = async (id: string) => (await uno<{ usuario: string; email_cavos: string }>(`select usuario, email_cavos from public.lk_participantes where contrato_id = $1 and rol = 'inquilino'`, [id]))

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.exec('grant usage on schema public to authenticated')
  for (const u of [DUENO, APPLE, OTRA]) await db.query('insert into auth.users(id) values ($1)', [u])
  await verificar(APPLE, RELAY); await verificar(OTRA, 'otra.persona@lockumi.com'); await verificar(DUENO, 'demo@lockumi.com')
  // Como en producción: la reputación encendida (el disparador lk_participante_correo_verificado exige un correo verificado de la cuenta).
  await db.exec('insert into public.lk_reputacion_encendido default values')
}, 60_000)

describe('textos', () => {
  it('correo oculto: primera letra, ••• y @dominio', () => {
    expect(correoOculto(' Katherine.Demo@Hotmail.com ')).toBe('k•••@hotmail.com')
    expect(textoInvitacionEnviada(INVITADO)).toBe('Esta invitación se envió a k•••@hotmail.com')
    expect(BOTON_CODIGO_INVITACION).toBe('Enviarme un código a ese correo')
  })
})

describe("acción 'invitacion' de /api/codigo-correo", () => {
  it('POSITIVA: la cuenta de Apple pide el código, llega al correo INVITADO y con el código correcto queda como inquilino', async () => {
    const r = await crear(); enviados.length = 0; await db.exec('delete from public.lk_codigos_correo')
    await expect(aceptarDirecto(APPLE, r.id, r.token)).rejects.toThrow(OTRO_CORREO)
    const p = await llamar(APPLE, { paso: 'pedir', accion: 'invitacion', contrato: r.id, token: r.token })
    expect(p).toEqual({ estado: 200, cuerpo: { enviado: true, correo: INVITADO } })
    expect(enviados).toHaveLength(1); expect(enviados[0]!.to).toEqual([INVITADO]); expect(enviados[0]!.text).toContain('para aceptar la invitación')
    const huella = await uno<{ n: number }>(`select count(*)::int n from public.lk_codigos_correo where accion = 'invitacion' and huella ~ '^[0-9a-f]{64}$'`)
    expect(huella!.n).toBe(1)   // solo la huella
    const mal = await llamar(APPLE, { paso: 'confirmar', accion: 'invitacion', codigo: codigoDe(enviados[0]!) === '000000' ? '111111' : '000000', contrato: r.id, token: r.token })
    expect(mal.estado).toBe(403); expect(mal.cuerpo.motivo).toBe('codigo'); expect(await inquilino(r.id)).toBeUndefined()
    const ok = await llamar(APPLE, { paso: 'confirmar', accion: 'invitacion', codigo: codigoDe(enviados[0]!), contrato: r.id, token: r.token })
    expect(ok).toEqual({ estado: 200, cuerpo: { hecho: true, contrato: r.id } })
    expect(await inquilino(r.id)).toEqual({ usuario: APPLE, email_cavos: RELAY })   // el correo de la CUENTA (20261026050000)
    expect(await uno(`select correo from public.lk_invitaciones_verificadas where contrato_id = $1 and usuario = $2`, [r.id, APPLE])).toEqual({ correo: INVITADO })
    // El correo invitado NO pasa a ser el de la cuenta (lk_correos_verificados no cambia).
    expect(await uno(`select count(*)::int n from public.lk_correos_verificados where usuario = $1 and correo = $2`, [APPLE, INVITADO])).toEqual({ n: 0 })
    // Un solo uso: el mismo código ya no sirve.
    expect((await llamar(APPLE, { paso: 'confirmar', accion: 'invitacion', codigo: codigoDe(enviados[0]!), contrato: r.id, token: r.token })).estado).toBe(403)
  })
  it('NEGATIVA: sin código, otro correo sigue rechazado; la verificación de un alquiler no sirve para otro', async () => {
    const a = await crear(), b = await crear(); enviados.length = 0; await db.exec('delete from public.lk_codigos_correo')
    expect((await llamar(OTRA, { paso: 'pedir', accion: 'invitacion', contrato: a.id, token: a.token })).estado).toBe(200)
    await expect(aceptarDirecto(OTRA, a.id, a.token)).rejects.toThrow(OTRO_CORREO)   // pedido, pero sin código
    expect((await llamar(OTRA, { paso: 'confirmar', accion: 'invitacion', codigo: codigoDe(enviados[0]!), contrato: a.id, token: a.token })).cuerpo).toEqual({ hecho: true, contrato: a.id })
    await expect(aceptarDirecto(OTRA, b.id, b.token)).rejects.toThrow(OTRO_CORREO)
    // La app no puede escribir la verificación ni llamar a las funciones de servicio.
    await db.query(`select set_config('test.uid', $1, false)`, [OTRA]); await db.exec('set role authenticated')
    try {
      await expect(db.query(`insert into public.lk_invitaciones_verificadas(contrato_id, usuario, correo) values ($1, $2, $3)`, [b.id, OTRA, INVITADO])).rejects.toThrow(/permission denied/)
      await expect(db.query(`select public.lk_confirmar_invitacion_codigo($1)`, [OTRA])).rejects.toThrow(/permission denied/)
      await expect(db.query(`select public.lk_invitacion_por_confirmar($1, $2, $3)`, [OTRA, b.id, b.token])).rejects.toThrow(/permission denied/)
    } finally { await db.exec('reset role') }
  })
  it('token malo, invitación ya aceptada o el dueño: no se manda ningún código', async () => {
    const r = await crear(); enviados.length = 0; await db.exec('delete from public.lk_codigos_correo')
    expect(await llamar(APPLE, { paso: 'pedir', accion: 'invitacion', contrato: r.id, token: 'ef'.repeat(32) })).toEqual({ estado: 403, cuerpo: { error: INVITACION_NO, motivo: 'invitacion' } })
    expect((await llamar(DUENO, { paso: 'pedir', accion: 'invitacion', contrato: r.id, token: r.token })).estado).toBe(403)
    expect((await llamar(APPLE, { paso: 'pedir', accion: 'invitacion', contrato: 'x', token: r.token })).estado).toBe(400)
    expect(enviados).toHaveLength(0)
  })
  it('la revert vuelve atrás (y la migración se puede volver a aplicar)', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    await db.exec(`create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key)`)
    await db.exec(fs.readFileSync('supabase/revert/20261026050000_invitacion_codigo_cuenta_revert.sql', 'utf8'))
    await db.exec(fs.readFileSync('supabase/revert/20261026040000_invitacion_codigo_revert.sql', 'utf8'))
    expect(await uno(`select to_regclass('public.lk_invitaciones_verificadas') t`)).toEqual({ t: null })
    await expect(db.query(`insert into public.lk_codigos_correo(usuario, correo, accion, huella, sal, vence_en) values ($1, 'a@b.c', 'invitacion', $2, $3, now())`, [APPLE, 'a'.repeat(64), 'b'.repeat(32)])).rejects.toThrow(/check/)
    await db.exec(fs.readFileSync('supabase/migrations/20261026040000_invitacion_codigo.sql', 'utf8'))
    await db.exec(fs.readFileSync('supabase/migrations/20261026050000_invitacion_codigo_cuenta.sql', 'utf8'))
  })
  it('sin código y con el correo invitado verificado en la cuenta: igual que siempre (queda el correo invitado)', async () => {
    const r = await crear(); const S = '00000000-0000-4000-8000-0000000004c1'
    await db.query('insert into auth.users(id) values ($1) on conflict do nothing', [S]); await verificar(S, INVITADO)
    await aceptarDirecto(S, r.id, r.token)
    expect(await inquilino(r.id)).toEqual({ usuario: S, email_cavos: INVITADO })
  })
})
