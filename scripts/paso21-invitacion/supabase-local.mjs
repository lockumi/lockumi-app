// paso21 · Supabase local para el E2E del link de invitación: Postgres en memoria (PGlite) con TODAS las migraciones del repo
// (incluida 20261025230000_invitacion_correo_verificado.sql, que no está en producción) y, en el navegador, Playwright atiende
// /auth/v1, /rest/v1 y /storage/v1 de supabase-js con esa base. Cada pedido corre como `authenticated` (o `anon`) con auth.uid()
// = el usuario del token: RLS y permisos de verdad, igual que las pruebas *-sql. No usa ninguna llave ni toca producción.
// Lo único que hace «por fuera» es lo que hace el servidor con la clave de servicio: `verificar(uid, correo)` escribe en
// lk_correos_verificados (como /api/verificar-correo o /api/codigo-correo después de comprobar el inicio de sesión).
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

export const URL_LOCAL = 'http://supabase.ejemplo.local'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
/** JWT con la forma de Supabase (sin firma real: nadie lo valida fuera de esta prueba). */
const jwt = (sub, role) => [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub, role, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, is_anonymous: true }), 'firma-ejemplo'].join('.')
export const CLAVE_ANON = jwt(undefined, 'anon')
const deJwt = t => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()) } catch { return {} } }

export async function supabaseLocal(raiz) {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`)
  const dir = resolve(raiz, 'supabase/migrations'), migraciones = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  for (const m of migraciones) await db.exec(readFileSync(resolve(dir, m), 'utf8'))
  await db.exec('grant usage on schema public to anon, authenticated')
  let cola = Promise.resolve()
  /** Una consulta a la vez, con auth.uid() y el rol de quien pide (null = superusuario, como la clave de servicio). */
  const q = (uid, rol, sql, p = []) => { const r = cola.then(async () => {
    await db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
    if (rol) await db.exec(`set role ${rol}`)
    try { return (await db.query(sql, p)).rows } finally { if (rol) await db.exec('reset role') } }); cola = r.catch(() => {}); return r }
  const usuarios = new Map()   // uid → { context }
  const sesion = uid => ({ access_token: jwt(uid, 'authenticated'), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresco-' + uid,
    user: { id: uid, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: { provider: 'anonymous' }, user_metadata: {}, identities: [], created_at: new Date().toISOString() } })
  const quien = req => { const t = (req.headers()['authorization'] || '').replace(/^Bearer /, ''); const c = deJwt(t); return c.role === 'authenticated' && c.sub ? { uid: c.sub, rol: 'authenticated' } : { uid: null, rol: 'anon' } }
  const arr = v => '{' + v.map(x => x === null ? 'NULL' : '"' + String(x).replace(/["\\]/g, m => '\\' + m) + '"').join(',') + '}'
  const val = v => v === null || v === undefined ? null : Array.isArray(v) ? arr(v) : typeof v === 'object' ? JSON.stringify(v) : String(v)
  const nombre = s => /^[a-z_][a-z0-9_]*$/.test(s) ? s : (() => { throw new Error('nombre raro: ' + s) })()
  const error = (route, e) => route.fulfill({ status: e.code === '42501' ? 403 : 400, json: { code: e.code ?? 'P0001', message: e.message, details: null, hint: null } })

  async function auth(route, ctx) {
    const u = new URL(route.request().url()), ruta = u.pathname.replace('/auth/v1/', '')
    if (ruta === 'signup' || (ruta === 'token' && u.searchParams.get('grant_type') === 'refresh_token')) {
      let uid = ruta === 'token' ? (JSON.parse(route.request().postData() || '{}').refresh_token || '').replace('refresco-', '') : ''
      if (!uid) { uid = randomUUID(); usuarios.set(uid, { ctx }) }
      return route.fulfill({ json: sesion(uid) })
    }
    if (ruta === 'user') { const { uid } = quien(route.request()); return uid ? route.fulfill({ json: sesion(uid).user }) : route.fulfill({ status: 401, json: { message: 'sin sesión' } }) }
    if (ruta === 'logout') return route.fulfill({ status: 204, body: '' })
    return route.fulfill({ status: 404, json: { message: 'ruta de auth no simulada: ' + ruta } })
  }
  async function rest(route) {
    const req = route.request(), u = new URL(req.url()), { uid, rol } = quien(req), partes = u.pathname.replace('/rest/v1/', '').split('/')
    try {
      if (partes[0] === 'rpc') {
        const fn = nombre(partes[1]), args = JSON.parse(req.postData() || '{}'), ks = Object.keys(args).map(nombre)
        const [info] = await q(null, null, `select p.proretset s, p.prorettype = 'void'::regtype v from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1 limit 1`, [fn])
        if (!info) return route.fulfill({ status: 404, json: { code: 'PGRST202', message: 'no existe ' + fn } })
        const llamada = `public.${fn}(${ks.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, ps = ks.map(k => val(args[k]))
        if (info.v) { await q(uid, rol, `select ${llamada}`, ps); return route.fulfill({ status: 204, body: '' }) }
        const [r] = await q(uid, rol, info.s ? `select coalesce(json_agg(x), '[]'::json) j from ${llamada} x` : `select to_json(x) j from ${llamada} x`, ps)
        return route.fulfill({ json: r?.j ?? null })
      }
      const t = nombre(partes[0]); if (req.method() !== 'GET' && req.method() !== 'HEAD') return route.fulfill({ status: 405, json: { message: 'solo lectura en esta prueba' } })
      const cols = (u.searchParams.get('select') || '*').split(',').map(c => c.trim()).map(c => c === '*' ? '*' : nombre(c)).join(', ')
      const donde = [], ps = []; let orden = ''
      for (const [k, v] of u.searchParams) {
        if (k === 'select') continue
        if (k === 'order') { orden = ' order by ' + v.split(',').map(o => { const [c, d, n] = o.split('.'); return `${nombre(c)} ${d === 'desc' ? 'desc' : 'asc'}${n === 'nullsfirst' ? ' nulls first' : n === 'nullslast' ? ' nulls last' : ''}` }).join(', '); continue }
        if (k === 'limit') { orden += ' limit ' + Number(v); continue }
        const [op, ...resto] = v.split('.'), x = resto.join('.')
        if (op === 'eq') { ps.push(x); donde.push(`${nombre(k)}::text = $${ps.length}`) }
        else if (op === 'in') { ps.push(x.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''))); donde.push(`${nombre(k)}::text = any($${ps.length}::text[])`) }
        else if (op === 'is' && x === 'null') donde.push(`${nombre(k)} is null`)
        else return route.fulfill({ status: 400, json: { message: 'filtro no simulado: ' + k + '=' + v } })
      }
      const [r] = await q(uid, rol, `select coalesce(json_agg(x), '[]'::json) j from (select ${cols} from public.${t}${donde.length ? ' where ' + donde.join(' and ') : ''}${orden}) x`, ps)
      return route.fulfill({ json: r.j })
    } catch (e) { return error(route, e) }
  }
  async function storage(route) {
    const u = new URL(route.request().url())
    if (u.pathname.includes('/object/sign/')) { const b = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ json: (b.paths ?? []).map(p => ({ path: p, signedURL: null, error: 'sin foto en la prueba' })) }) }
    return route.fulfill({ status: 404, json: { message: 'storage no simulado' } })
  }
  return {
    db, migraciones,
    /** Atiende Supabase en ese contexto del navegador. */
    async enrutar(ctx) {
      await ctx.route(URL_LOCAL + '/auth/v1/**', r => auth(r, ctx))
      await ctx.route(URL_LOCAL + '/rest/v1/**', rest)
      await ctx.route(URL_LOCAL + '/storage/v1/**', storage)
      await ctx.route(URL_LOCAL + '/realtime/**', r => r.abort())
    },
    /** Sesiones (auth.uid()) creadas en ese contexto, en orden. */
    uids: ctx => [...usuarios].filter(([, v]) => v.ctx === ctx).map(([k]) => k),
    /** Lo que hace el servidor con la clave de servicio después de comprobar el inicio de sesión (en producción: /api/verificar-correo). */
    verificar: (uid, correo) => q(null, null, `insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, lower(btrim($2)), 'email') on conflict do nothing`, [uid, correo]),
    /** Para el «antes» (master sin la tabla): ¿existe lk_correos_verificados? */
    tieneVerificados: async () => !!(await q(null, null, `select to_regclass('public.lk_correos_verificados') t`))[0].t,
    q,
  }
}
