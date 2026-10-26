// E2E · «Reiniciar mi demo» y después alquiler nuevo con invitación (26/10/2026). Sin correos reales: cuentas …@lockumi.test y RPC.
//   node scripts/e2e-reinicio-invitacion.mjs
// Dueño A (Google) con un alquiler aceptado por B (Apple) → A reinicia su demo (se oculta) → A crea otro alquiler invitando a B →
// B (con su alquiler oculto) y una sesión nueva abren el link (lk_ver_invitacion): disponible y B lo acepta. Después «Crear un link
// nuevo» (lk_nueva_invitacion) deja el link anterior en «Esta invitación ya no está disponible…» y el nuevo sirve. Limpieza y waitlist igual.
import { randomBytes } from 'node:crypto'
const REF = 'sddgjnuvxzkrhhuczuly', SUPA = `https://${REF}.supabase.co`, ANON = process.env.SUPABASE_ANON_KEY, SERV = process.env.SUPABASE_SERVICE_ROLE_KEY
const hora = () => new Date().toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica' })
let fallas = 0; const ok = (c, m) => { console.log(hora(), c ? 'OK   ' : 'FALLA', m); if (!c) fallas++; return c }
const sql = async q => (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json()
const rpc = async (fn, args, token) => { const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: token ? ANON : SERV, authorization: `Bearer ${token ?? SERV}`, 'content-type': 'application/json' }, body: JSON.stringify(args) })
  const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* vacío */ } return { ok: r.ok, status: r.status, j } }
const HUELLA = `select (select count(*) from public.waitlist) w, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist t) wm, (select count(*) from public.waitlist_intentos) i, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist_intentos t) im`
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
const corrida = randomBytes(3).toString('hex'), MARCA = `Ejemplo · E2E-REINV ${corrida}`, correo = q => `e2e-reinv-${q}-${corrida}@lockumi.test`
const ids = [], contratos = []
const sesionNueva = async () => { const r = await fetch(`${SUPA}/auth/v1/signup`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: '{}' }); const s = await r.json()
  if (!r.ok || !s.user?.id) throw new Error('signup'); ids.push(s.user.id); return s }
const verificar = (u, c, metodo) => rpc('lk_registrar_correo_verificado', { p_usuario: u, p_correo: c, p_metodo: metodo, p_huella: randomBytes(32).toString('hex') })
const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
async function crear(s, n) {
  let c = null
  for (const ver of ['1.13-demo', '1.12-demo', '1.11-demo', '1.10-demo', '1.9-demo']) {
    c = await rpc('lk_crear_contrato_con_terminos', { p_direccion: `${MARCA} ${n}`, p_monto: 20, p_inicio: hoy, p_fin: fin, p_reglas: ['No fumar dentro de la casa'], p_email_inquilino: correo('b'),
      p_email_cavos: correo('a'), p_declaracion: DECL, p_terminos_version: ver, p_direccion_stellar: null }, s.access_token)
    if (c.ok) break
  }
  if (!c.ok) throw new Error('crear ' + JSON.stringify(c.j).slice(0, 160)); contratos.push(c.j.id); return c.j
}
const aceptar = (s, c) => rpc('lk_aceptar_invitacion', { p_contrato: c.id, p_token: c.token, p_email_cavos: correo('b'), p_direccion_stellar: null }, s.access_token)
const H0 = (await sql(HUELLA))[0]; console.log(hora(), 'waitlist antes:', JSON.stringify(H0))
try {
  const sA = await sesionNueva(), sB = await sesionNueva(), sN = await sesionNueva()
  ok((await verificar(sA.user.id, correo('a'), 'google')).ok && (await verificar(sB.user.id, correo('b'), 'apple')).ok, 'A (Google) y B (Apple): correos verificados')
  const c1 = await crear(sA, 1); ok((await aceptar(sB, c1)).ok, 'alquiler 1: B aceptó')
  const r = await rpc('lk_reiniciar_mi_demo', {}, sA.access_token)
  ok(r.ok && r.j?.ocultos === 1, 'A reinicia su demo: el alquiler 1 queda oculto para A')
  const c2 = await crear(sA, 2); ok(true, 'A crea el alquiler 2 invitando a B (sin correo)')
  ok((await rpc('lk_ver_invitacion', { p_contrato: c2.id, p_token: c2.token }, sN.access_token)).ok, 'sesión nueva abre el link: invitación disponible')
  ok((await rpc('lk_ver_invitacion', { p_contrato: c2.id, p_token: c2.token }, sB.access_token)).ok, 'B (con el alquiler 1) abre el link: invitación disponible')
  const nuevo = await rpc('lk_nueva_invitacion', { p_contrato: c2.id }, sA.access_token)
  const viejo = await rpc('lk_ver_invitacion', { p_contrato: c2.id, p_token: c2.token }, sB.access_token)
  ok(nuevo.ok && viejo.status === 403 && /ya no está disponible/.test(viejo.j?.message ?? ''), '«Crear un link nuevo»: el link anterior dice «Esta invitación ya no está disponible…»')
  ok((await aceptar(sB, { id: c2.id, token: nuevo.j })).ok, 'B acepta con el link nuevo')
} catch (e) { ok(false, 'error: ' + String(e?.message ?? e).slice(0, 200)) } finally {
  if (contratos.length) await sql(`delete from public.lk_contratos where id in (${contratos.map(i => `'${i}'`).join(',')})`)
  const lista = ids.filter(i => /^[0-9a-f-]{36}$/.test(i)).map(i => `'${i}'`).join(',')
  if (lista) { await sql(`delete from public.lk_correos_verificados where usuario in (${lista})`); await sql(`delete from auth.users where id in (${lista})`) }
  const q = (await sql(`select (select count(*) from public.lk_contratos where direccion like 'Ejemplo · E2E-REINV ${corrida}%') c, (select count(*) from auth.users where id in (${lista || "'00000000-0000-0000-0000-000000000000'"})) u`))[0]
  ok(Number(q.c) === 0 && Number(q.u) === 0, 'limpieza: sin alquileres ni cuentas de prueba')
  const H1 = (await sql(HUELLA))[0]; ok(JSON.stringify(H0) === JSON.stringify(H1), 'waitlist igual: ' + JSON.stringify(H1))
  console.log(hora(), fallas ? `${fallas} FALLA(S)` : 'TODO OK'); process.exit(fallas ? 1 : 0)
}
