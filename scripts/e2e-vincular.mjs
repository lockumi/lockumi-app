// E2E · Tus alquileres en cualquier dispositivo y cambio de cuenta (26/10/2026). Sin correos reales: cuentas de prueba (…@lockumi.test).
//   node scripts/e2e-vincular.mjs [--app https://app.lockumi.com]
// Base (Supabase del proyecto, migración 20261026060000): dueño A (Google) crea, inquilino B (Apple) acepta. Sesión nueva C con el correo
// de B verificado por Cavos → lk_vincular_alquileres la trae (rol inquilino; B ya no lo ve); idempotente; con el correo verificado solo
// por el código de Lockumi, nada. Como un token real de Cavos no se puede fabricar, el registro del correo verificado (lo que
// /api/verificar-correo hace tras validar el token) se hace con la clave de servicio: mismo RPC, misma llamada.
// Con --app (navegador): C con la cuenta B → «Eres inquilino» y el pie nuevo; entra la cuenta A en el mismo navegador → la sesión C se
// termina (sesión nueva, lista sin el alquiler de B); con el correo de A verificado → «Eres dueño»; «Salir» borra la sesión.
// Limpieza total y waitlist igual. Nunca imprime tokens ni claves.
import { randomBytes, createHash } from 'node:crypto'
const A = process.argv.slice(2), APP = A.includes('--app') ? A[A.indexOf('--app') + 1].replace(/\/$/, '') : ''
const REF = 'sddgjnuvxzkrhhuczuly', SUPA = `https://${REF}.supabase.co`, ANON = process.env.SUPABASE_ANON_KEY, SERV = process.env.SUPABASE_SERVICE_ROLE_KEY
const hora = () => new Date().toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica' })
let fallas = 0; const ok = (c, m) => { console.log(hora(), c ? 'OK   ' : 'FALLA', m); if (!c) fallas++; return c }
const sql = async q => (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json()
const rpc = async (fn, args, token) => { const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: token ? ANON : SERV, authorization: `Bearer ${token ?? SERV}`, 'content-type': 'application/json' }, body: JSON.stringify(args) })
  const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* vacío */ } return { ok: r.ok, status: r.status, j } }
const HUELLA = `select (select count(*) from public.waitlist) w, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist t) wm, (select count(*) from public.waitlist_intentos) i, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist_intentos t) im`
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
const corrida = randomBytes(3).toString('hex'), MARCA = `Ejemplo · E2E-VINC ${corrida}`, correo = q => `e2e-vinc-${q}-${corrida}@lockumi.test`
const ids = []
const sesionNueva = async () => { const r = await fetch(`${SUPA}/auth/v1/signup`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: '{}' }); const s = await r.json()
  if (!r.ok || !s.user?.id) throw new Error('signup'); ids.push(s.user.id)
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, expires_in: s.expires_in, token_type: 'bearer', user: s.user } }
const verificar = (u, c, metodo) => rpc('lk_registrar_correo_verificado', { p_usuario: u, p_correo: c, p_metodo: metodo, p_huella: randomBytes(32).toString('hex') })
const vincular = async (u, c) => (await rpc('lk_vincular_alquileres', { p_usuario: u, p_correo: c })).j
const rolDe = async (s, id) => { const r = await fetch(`${SUPA}/rest/v1/lk_participantes?select=rol,usuario&contrato_id=eq.${id}`, { headers: { apikey: ANON, authorization: `Bearer ${s.access_token}` } })
  const f = await r.json(); return Array.isArray(f) ? (f.find(p => p.usuario === s.user.id)?.rol ?? (f.length ? 'otro' : 'nada')) : 'nada' }
const H0 = (await sql(HUELLA))[0]; console.log(hora(), 'waitlist antes:', JSON.stringify(H0))
let contrato = null
try {
  const sA = await sesionNueva(), sB = await sesionNueva()
  ok((await verificar(sA.user.id, correo('a'), 'google')).ok && (await verificar(sB.user.id, correo('b'), 'apple')).ok, 'A (Google) y B (Apple): correos verificados')
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  let c = null
  for (const ver of ['1.13-demo', '1.12-demo', '1.11-demo', '1.10-demo', '1.9-demo']) {
    c = await rpc('lk_crear_contrato_con_terminos', { p_direccion: MARCA, p_monto: 20, p_inicio: hoy, p_fin: fin, p_reglas: ['No fumar dentro de la casa'], p_email_inquilino: correo('b'),
      p_email_cavos: correo('a'), p_declaracion: DECL, p_terminos_version: ver, p_direccion_stellar: null }, sA.access_token)
    if (c.ok) break
  }
  if (!ok(c.ok, 'A crea el alquiler (sin correo de invitación)')) throw new Error(JSON.stringify(c.j).slice(0, 160))
  contrato = c.j.id
  const x = await rpc('lk_aceptar_invitacion', { p_contrato: contrato, p_token: c.j.token, p_email_cavos: correo('b'), p_direccion_stellar: null }, sB.access_token)
  if (!ok(x.ok, 'B acepta la invitación')) throw new Error(JSON.stringify(x.j).slice(0, 160))
  ok(await rolDe(sA, contrato) === 'dueno' && await rolDe(sB, contrato) === 'inquilino', 'roles: A dueño, B inquilino')
  // Otro dispositivo: sesión nueva C, entra con el correo de B.
  const sC = await sesionNueva()
  ok(await rolDe(sC, contrato) === 'nada', 'C (sesión nueva) no ve el alquiler antes de verificar')
  const sE = await sesionNueva(); await verificar(sE.user.id, correo('b'), 'email')
  ok(await vincular(sE.user.id, correo('b')) === 0 && await rolDe(sE, contrato) === 'nada', 'correo verificado solo con el código de Lockumi: no trae nada')
  ok(await vincular(sC.user.id, correo('b')) === 0, 'sin correo verificado en C: no trae nada')
  await verificar(sC.user.id, correo('b'), 'apple')
  ok(await vincular(sC.user.id, correo('b')) === 1, 'C con el correo de B verificado por Cavos: trae 1 lugar')
  ok(await rolDe(sC, contrato) === 'inquilino' && await rolDe(sB, contrato) === 'nada' && await rolDe(sA, contrato) === 'dueno', 'C es inquilino; B ya no lo ve; A sigue dueño')
  ok(await vincular(sC.user.id, correo('b')) === 0, 'idempotente: la segunda vez no mueve nada')
  if (APP) {
    const { chromium } = await import('/workspace/lockumi/wt-e2e/node_modules/playwright/index.mjs')
    const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }), ahora = new Date().toISOString(), v = { version: '1.13-demo', fecha: ahora }
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
    const usuario = (email, metodo) => JSON.stringify({ email, nombre: 'Prueba VINC', metodo, terminos: v, privacidad: v })
    await ctx.addInitScript(([s, email, u, v, ahora, recs]) => { if (localStorage.getItem('lk-e2e-sembrado')) return; localStorage.setItem('lk-e2e-sembrado', '1')
      localStorage.setItem('lockumi.sesion-servidor', s); localStorage.setItem('lockumi.sesion-correo', email); localStorage.setItem('lockumi.usuario', u)
      localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v))
      for (const r of recs) localStorage.setItem('lockumi.recorrido.v1.' + r, ahora) },
      [JSON.stringify(sC), correo('b'), usuario(correo('b'), 'apple'), v, ahora, [correo('a'), correo('b')].map(e => createHash('sha256').update(e).digest('hex').slice(0, 16))])
    const p = await ctx.newPage()
    const texto = async () => { await p.waitForTimeout(4000); for (let k = 0; k < 4; k++) { const l = p.getByRole('button', { name: /^(Entendido|Saltar|Continuar|Ahora no)$/ }).first(); if (!(await l.count())) break; await l.click().catch(() => {}); await p.waitForTimeout(600) } return p.evaluate(() => document.body.innerText) }
    const uidLocal = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('lockumi.sesion-servidor') || 'null')?.user?.id ?? null } catch { return null } })
    await p.goto(APP + '/#/', { waitUntil: 'networkidle' }); let t = await texto()
    const tarjeta = () => p.evaluate(m => [...document.querySelectorAll('a.tarjeta')].find(a => a.textContent.includes(m))?.textContent ?? '', MARCA)
    ok(t.includes(MARCA) && (await tarjeta()).includes('Eres inquilino'), 'navegador, cuenta B: el alquiler con «Eres inquilino»')
    ok(t.includes('Tus alquileres de prueba se guardan en tu cuenta.') && !t.includes('se guardan solo en este navegador'), 'pie: «Tus alquileres de prueba se guardan en tu cuenta.»')
    // Cambio de cuenta en el mismo navegador: entra A.
    await p.evaluate(u => localStorage.setItem('lockumi.usuario', u), usuario(correo('a'), 'google')); await p.reload({ waitUntil: 'networkidle' }); t = await texto()
    const uD = await uidLocal(); if (uD && !ids.includes(uD)) ids.push(uD)
    ok(uD && uD !== sC.user.id && !t.includes(MARCA), 'cuenta A: la sesión de B se terminó (sesión nueva) y su alquiler no aparece mezclado')
    await verificar(uD, correo('a'), 'google'); ok(await vincular(uD, correo('a')) === 1, 'cuenta A verificada por Cavos: trae su lugar de dueño')
    await p.reload({ waitUntil: 'networkidle' }); t = await texto()
    ok(t.includes(MARCA) && (await tarjeta()).includes('Eres dueño') && !(await tarjeta()).includes('Eres inquilino'), 'cuenta A: el alquiler con «Eres dueño»')
    await p.getByRole('button', { name: 'Salir' }).first().click(); await p.waitForTimeout(2500)
    ok(await p.evaluate(() => !localStorage.getItem('lockumi.sesion-servidor') && !localStorage.getItem('lockumi.sesion-correo')), '«Salir»: la sesión anónima se terminó')
    await b.close()
  }
} catch (e) { ok(false, 'error: ' + String(e?.message ?? e).slice(0, 200)) } finally {
  if (contrato) await sql(`delete from public.lk_contratos where id = '${contrato}'`)
  const lista = ids.filter(i => /^[0-9a-f-]{36}$/.test(i)).map(i => `'${i}'`).join(',')
  if (lista) { await sql(`delete from public.lk_correos_verificados where usuario in (${lista})`); await sql(`delete from auth.users where id in (${lista})`) }
  const quedan = (await sql(`select (select count(*) from public.lk_contratos where direccion like 'Ejemplo · E2E-VINC ${corrida}%') c, (select count(*) from auth.users where id in (${lista || "'00000000-0000-0000-0000-000000000000'"})) u`))[0]
  ok(Number(quedan.c) === 0 && Number(quedan.u) === 0, 'limpieza: sin alquiler ni cuentas de prueba')
  const H1 = (await sql(HUELLA))[0]; ok(JSON.stringify(H0) === JSON.stringify(H1), 'waitlist igual: ' + JSON.stringify(H1))
  console.log(hora(), fallas ? `${fallas} FALLA(S)` : 'TODO OK'); process.exit(fallas ? 1 : 0)
}
