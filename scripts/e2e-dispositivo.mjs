// E2E · Pagar desde cualquier dispositivo (26/10/2026). Sin correos reales, sin login real (un token de Cavos no se puede fabricar).
//   node scripts/e2e-dispositivo.mjs [--app https://app.lockumi.com]
// 1) La configuración pública de recuperación social de Cavos responde (enabled true/false) para el App ID de Lockumi.
// 2) El build publicado trae el texto nuevo en español y consulta esa configuración (si está apagada, nada cambia).
// 3) Waitlist igual. Nunca imprime tokens ni claves.
const A = process.argv.slice(2), APP = (A.includes('--app') ? A[A.indexOf('--app') + 1] : 'https://app.lockumi.com').replace(/\/$/, '')
const REF = 'sddgjnuvxzkrhhuczuly'
const TEXTO = 'Este dispositivo todavía no puede firmar con tu billetera.'
const hora = () => new Date().toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica' })
let fallas = 0; const ok = (c, m) => { console.log(hora(), c ? 'OK   ' : 'FALLA', m); if (!c) fallas++; return c }
const sql = async q => (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json()
const HUELLA = `select (select count(*) from public.waitlist) w, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist t) wm, (select count(*) from public.waitlist_intentos) i, (select md5(string_agg(t::text, '|' order by id)) from public.waitlist_intentos t) im`
const H0 = JSON.stringify((await sql(HUELLA))[0])
const html = await (await fetch(APP + '/')).text()
let js = ''; for (const f of new Set(html.match(/\/assets\/[^"]+\.js/g) ?? [])) js += await (await fetch(APP + f)).text()
const id = js.match(/VITE_CAVOS_APP_ID:`([^`]+)`/)?.[1]
ok(!!id, 'build con App ID de Cavos (público)')
const c = await (await fetch(`https://cavos.xyz/api/recovery/social/config?app_id=${id}&environment=production`)).json().catch(() => ({}))
ok(typeof c.enabled === 'boolean', 'recuperación social de Cavos en el panel: ' + (c.enabled ? 'ACTIVA' : 'apagada (hay que activarla para pagar desde otro dispositivo)'))
// el texto puede estar en un chunk diferido: se buscan también los chunks que importa el bundle
for (const f of new Set(js.match(/assets\/[\w.-]+\.js/g) ?? [])) if (!js.includes(TEXTO)) js += await (await fetch(APP + '/' + f)).text()
ok(js.includes(TEXTO), 'build publicado con el texto nuevo en español')
ok(js.includes('/api/recovery/social/config'), 'build publicado consulta la recuperación social al conectar')
ok(H0 === JSON.stringify((await sql(HUELLA))[0]), 'waitlist igual: ' + H0)
console.log(hora(), fallas ? `${fallas} FALLA(S)` : 'TODO OK'); process.exit(fallas ? 1 : 0)
