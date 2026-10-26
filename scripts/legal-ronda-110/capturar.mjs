// Legal, ronda 1.10 (25/10/2026, 11:16 p. m. CR) y PR #33 (1.11-demo, /terminos-1-10) · capturas ANTES (master) / DESPUÉS (rama), teléfono 390×844 @2x y escritorio 1440×900.
// Builds LOCALES con VITE_REPUTACION=1 (como producción). Supabase y /api simulados en el navegador: nada sale a la red, no se envía
// ningún correo. Datos de demo (demo@lockumi.com), marca «Ejemplo», sin tokens (el del link es 64 ceros y se comprueba que no se vea).
// Uso: node scripts/legal-ronda-110/capturar.mjs <dist-antes> <dist-despues> <dist-revisa> <carpeta>
import { chromium, devices } from 'playwright'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createHash } from 'node:crypto'
const [ANTES, DESPUES, REVISA, OUT] = process.argv.slice(2); mkdirSync(OUT, { recursive: true })
const YO = 'demo@lockumi.com', UID = '00000000-0000-4000-8000-0000000000d1', T = '2026-10-25T21:00:00Z', v = { version: '1.9-demo', fecha: T }
const ID = '00000000-0000-4000-8000-000000000110', TOKEN = '0'.repeat(64)
const OTRO = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }
const servir = dist => { const s = createServer((q, r) => { let f = join(dist, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(f) || statSync(f).isDirectory()) f = join(dist, 'index.html')
  r.writeHead(200, { 'content-type': TIPOS[extname(f)] ?? 'application/octet-stream' }); r.end(readFileSync(f)) }).listen(0); return s }
const FORMATOS = { tel: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }, esc: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }
const json = (r, s, b) => r.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) })
const pre = r => r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }), log = [], datos = {}
const marca = p => p.evaluate(() => { if (document.getElementById('marca-ejemplo')) return; const m = document.createElement('div'); m.id = 'marca-ejemplo'; m.textContent = 'Ejemplo'
  m.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#b42318;color:#fff;font:700 13px system-ui;padding:3px 10px;border-radius:999px;opacity:.92;pointer-events:none'; document.body.appendChild(m) })
const foto = async (p, nombre) => { await marca(p); const h = await p.content(); if (h.includes(TOKEN)) throw new Error('token visible en ' + nombre)
  await p.screenshot({ path: `${OUT}/${nombre}.png`, animations: 'disabled', caret: 'hide' }); log.push('captura ' + nombre) }
const centro = (p, texto) => p.evaluate(t => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
  while ((n = w.nextNode())) if (n.textContent.includes(t)) { n.parentElement.scrollIntoView({ block: 'center' }); return true } return false }, texto)
async function contexto(fmt, conCodigo = false) {
  const c = await b.newContext({ ...FORMATOS[fmt], locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  await c.route(/\/auth\/v1\//, r => r.request().method() === 'OPTIONS' ? pre(r) : json(r, 200, { access_token: 'ejemplo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'ejemplo', user: { id: UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: T } }))
  await c.route(/\/rest\/v1\//, r => { const q = r.request(); if (q.method() === 'OPTIONS') return pre(r); const u = q.url()
    if (!conCodigo && u.includes('/rpc/lk_necesita_rep01')) return json(r, 200, false)   // cuenta anterior a la 1.10-demo: sin REP-01
    if (u.includes('/rpc/lk_ver_invitacion')) return json(r, 200, { direccion: 'Ejemplo · Casa en Escazú, San José', monto: 20, inicio: '2026-11-01', fin: '2026-11-30', reglas: ['Ejemplo: no fumar dentro de la casa.'], email_inquilino: YO, email_dueno: 'dueno.ejemplo@lockumi.com' })
    if (u.includes('/rpc/lk_aceptar_invitacion')) return json(r, 400, { code: 'P0001', message: OTRO, details: null, hint: null })
    return json(r, 200, []) })
  await c.route(/\/(realtime|storage)\/v1\//, r => r.abort())
  await c.route('**/api/**', r => json(r, 200, {}))   // primero: Playwright prueba las rutas de la última a la primera
  await c.route('**/api/verificar-correo', r => conCodigo ? json(r, 403, { correo: YO, codigo: true, error: 'Falta el código que te enviamos por correo.' }) : json(r, 200, { correo: YO }))
  await c.addInitScript(([email, v, T, rec]) => { if (localStorage.getItem('lk-sembrado')) return; localStorage.setItem('lk-sembrado', '1')
    localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v))
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email, nombre: 'Demo', metodo: 'correo', terminos: v, privacidad: v }))
    localStorage.setItem('lockumi.recorrido.v1.' + rec, T) }, [YO, v, T, createHash('sha256').update(YO).digest('hex').slice(0, 16)])
  const p = await c.newPage(); p.on('pageerror', e => log.push(`${fmt} error JS: ${e.message}`)); return { c, p }
}
const entendido = async p => { for (const n of ['Entendido', 'Saltar']) { const e = p.getByRole('button', { name: n, exact: true }); if (await e.count() && await e.first().isVisible()) await e.first().click().catch(() => {}) } }
for (const [cual, dist] of [['antes', ANTES], ['despues', DESPUES]]) {
  const srv = servir(dist), BASE = 'http://localhost:' + srv.address().port
  for (const fmt of ['tel', 'esc']) {
    const { c, p } = await contexto(fmt)
    await p.goto(`${BASE}/#/invitacion/${ID}/${TOKEN}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await entendido(p)
    const cas = p.locator('#inv-terminos'); await cas.waitFor({ timeout: 8000 })
    await cas.scrollIntoViewIfNeeded(); await centro(p, 'Acepto los Términos')
    const enl = await p.locator('label[for="inv-terminos"] a, #inv-terminos ~ * a, .casilla a').evaluateAll(as => as.map(a => ({ texto: a.textContent.trim(), href: a.getAttribute('href') })))
    const etiqueta = (await p.locator('label:has(#inv-terminos), label[for="inv-terminos"]').first().textContent())?.trim()
    datos[`${cual}-${fmt}`] = { etiqueta, enlaces: enl }
    await foto(p, `${cual}-${fmt}-1-casilla`)
    // A dónde lleva «Términos …» de la casilla
    const t = p.locator('a', { hasText: /^Términos/ }).first(); const href = await t.getAttribute('href')
    const q = await c.newPage(); await q.goto(BASE + '/' + href.replace(/^\//, ''), { waitUntil: 'networkidle' }); await q.waitForTimeout(1200); await entendido(q)
    const cab = await q.evaluate(() => (document.querySelector('main')?.innerText ?? '').match(/Versión \d[^\n]{0,40}/)?.[0] ?? '')
    datos[`${cual}-${fmt}`].abre = { href, version: cab }; await foto(q, `${cual}-${fmt}-2-link-terminos`); await q.close()
    // Error del servidor: otro correo
    await cas.check(); await p.getByRole('button', { name: 'Aceptar invitación' }).click()
    await p.getByText(OTRO).first().waitFor({ timeout: 8000 }); await p.waitForTimeout(400)
    datos[`${cual}-${fmt}`].botonDesactivado = await p.getByRole('button', { name: 'Aceptar invitación' }).isDisabled()
    await centro(p, 'Esta invitación es para otro correo'); await foto(p, `${cual}-${fmt}-3-otro-correo`)
    // Aviso de privacidad (edición de la cuenta, /privacidad)
    await p.goto(`${BASE}/#/privacidad`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); await entendido(p)
    await centro(p, 'Datos que se publican'); await foto(p, `${cual}-${fmt}-4-privacidad-perfil`)
    await centro(p, 'Si usas Lockumi en más de un aparato'); await foto(p, `${cual}-${fmt}-5-privacidad-codigo`)
    await centro(p, 'mediación y cierre'); await foto(p, `${cual}-${fmt}-6-privacidad-cierre`)
    // PR #33: cabecera de /terminos-1-10 (la 1.10-demo archivada; antes no existía: /terminos era la 1.10-demo) y de /terminos (1.11-demo)
    for (const [n, ruta] of [['8-terminos-1-10', cual === 'antes' ? '/terminos' : '/terminos-1-10'], ['9-terminos-vigente', '/terminos']]) {
      await p.goto(BASE + ruta, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); await entendido(p); await p.evaluate(() => scrollTo(0, 0))
      datos[`${cual}-${fmt}`][n] = { ruta, version: await p.evaluate(() => (document.querySelector('main')?.innerText ?? '').match(/Versión \d[^\n]{0,40}/)?.[0] ?? '') }
      await foto(p, `${cual}-${fmt}-${n}`)
    }
    await c.close()
  }
  srv.close()
}
// «Revisa tu correo» con demo@lockumi.com (rama; build aparte con un token de prueba en authCavos, como en la captura anterior)
{ const srv = servir(REVISA), BASE = 'http://localhost:' + srv.address().port
  for (const fmt of ['tel', 'esc']) { const { c, p } = await contexto(fmt, true)
    await p.goto(BASE + '/#/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
    const h = p.getByRole('heading', { name: 'Revisa tu correo' }); if (!(await h.count())) log.push(fmt + ' SIN «Revisa tu correo»')
    datos['revisa-' + fmt] = { correoVisible: (await p.content()).includes(YO), viejo: (await p.content()).includes('grokbot') }
    await foto(p, `despues-${fmt}-7-revisa-tu-correo`); await c.close() }
  srv.close() }
await b.close(); writeFileSync(`${OUT}/datos.json`, JSON.stringify(datos, null, 2)); writeFileSync(`${OUT}/log.txt`, log.join('\n') + '\n')
console.log(JSON.stringify(datos, null, 1)); console.log(log.join('\n'))
