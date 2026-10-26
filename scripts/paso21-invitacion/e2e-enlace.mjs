// paso21 · E2E del LINK REAL del correo de invitación (lo que el E2E-C de 111 pasos no abría):
// 1) el dueño (demo@lockumi.com, sesión simulada) crea un alquiler invitando, con la app local (Vite) contra el Supabase de .env;
// 2) /api/correo se atiende con el atenderCorreo REAL del repo (Resend falso: no sale ningún correo) y se saca el href del botón del HTML;
// 3) ese href se abre en un navegador NUEVO, sin sesión ni almacenamiento: tiene que verse la pantalla de invitado sin sesión;
// 4) la persona invitada entra con «Continuar con tu correo» (proveedor simulado: sin VITE_CAVOS_APP_ID cualquier código de 6 dígitos)
//    y tiene que llegar DIRECTO a la invitación (no a Inicio), aceptar y ver el alquiler en «Tus alquileres» como inquilino.
// Uso: node scripts/paso21-invitacion/e2e-enlace.mjs [carpeta-capturas]   (RAIZ=<otra copia del repo> para correr la versión anterior,
// ANTES=1 para no exigir el comportamiento nuevo). Requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (públicas) en el entorno.
// Nunca guarda ni imprime el token: antes de cada captura lo tapa en el campo del link y comprueba que no esté en la página.
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const RAIZ = resolve(process.env.RAIZ || '.'), ANTES = process.env.ANTES === '1', SALIDA = process.argv[2] ? resolve(process.argv[2]) : ''
const PUERTO = Number(process.env.PUERTO || (ANTES ? 5292 : 5291)), B = `http://localhost:${PUERTO}/`
const DUENO = { email: 'demo@lockumi.com', nombre: 'Ana Ejemplo', metodo: 'correo' }, INVITADO = process.env.INVITADO || 'lockumi+luis-ejemplo@mail.grokbot.com'
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) { console.error('Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno.'); process.exit(2) }
Object.assign(process.env, { VITE_TRUSTLESS: '1', VITE_PRUEBA_COMPLETA: '1', VITE_DOS_PERSONAS: '1', VITE_CORREOS: '1', VITE_ORIGEN_PUBLICO: B.slice(0, -1) })
delete process.env.VITE_CAVOS_APP_ID
if (SALIDA) mkdirSync(SALIDA, { recursive: true })

const vite = await createServer({ root: RAIZ, configFile: resolve(RAIZ, 'vite.config.ts'), server: { port: PUERTO, strictPort: true, host: 'localhost' }, logLevel: 'error' })
await vite.listen()
const { atenderCorreo } = await vite.ssrLoadModule('/api/_lib/correo.ts')
const correos = []
const navegador = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
const TEL = { width: 390, height: 844 }, ESC = { width: 1280, height: 860 }
const nuevo = async () => {
  const c = await navegador.newContext({ viewport: TEL, deviceScaleFactor: 2, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  await c.route('**/api/correo', async r => {
    const pedido = JSON.parse(r.request().postData() || '{}')
    if (pedido.tipo !== 'invitacion') return r.fulfill({ json: { enviado: true, id: 'ejemplo' } })
    const resend = async (url, init) => { correos.push({ url, cuerpo: JSON.parse(String(init.body)) }); return Response.json({ id: 'em_ejemplo' }) }
    try { r.fulfill({ json: await atenderCorreo({ RESEND_API_KEY: 'resend-falso' }, pedido, B.slice(0, -1), '127.0.0.21', resend) }) }
    catch (e) { r.fulfill({ status: e.estado ?? 500, json: { error: e.message } }) }
  })
  return c
}
const log = (...x) => console.log(new Date().toLocaleTimeString('es-CR'), ...x)
const falla = m => { throw new Error(m) }
let token = ''
const tapar = async p => {
  await p.evaluate(() => { for (const i of document.querySelectorAll('input')) if (/#\/invitacion\//.test(i.value)) { i.value = i.value.replace(/(#\/invitacion\/)[^\s]+/, '$1…'); i.setAttribute('value', i.value) }
    for (const a of document.querySelectorAll('a[href*="wa.me"]')) a.setAttribute('href', 'https://wa.me/')
    if (!document.getElementById('marca-ejemplo')) { const m = document.createElement('div'); m.id = 'marca-ejemplo'; m.textContent = 'Ejemplo'
      m.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#b42318;color:#fff;font:700 13px system-ui;padding:3px 10px;border-radius:999px;opacity:.92;pointer-events:none'
      document.body.appendChild(m) } })
  const html = await p.content(); if (token && html.includes(token)) falla('El token quedaría en la captura: …' + html.slice(Math.max(0, html.indexOf(token) - 200), html.indexOf(token)).replace(/[0-9a-f]{64}/g, '<token>'))
}
const captura = async (p, nombre, prep) => {
  if (!SALIDA) return
  for (const [v, t] of [[TEL, 'tel'], [ESC, 'esc']]) { await p.setViewportSize(v); await p.waitForTimeout(500); await entendido(p); if (prep) { await prep(); await p.waitForTimeout(300) } await tapar(p); await p.screenshot({ path: `${SALIDA}/${nombre}-${t}.png` }) }
  await p.setViewportSize(TEL); log('captura', nombre)
}
const entendido = async p => { for (const n of ['Entendido', 'Saltar']) { const e = p.getByRole('button', { name: n, exact: true }); if (await e.count() && await e.first().isVisible()) await e.first().click().catch(() => {}) } }
const fecha = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
let ok = false
try {
  // 1) Dueño crea e invita
  const cd = await nuevo(); await cd.addInitScript(u => localStorage.setItem('lockumi.usuario', JSON.stringify(u)), DUENO)
  const d = await cd.newPage(); d.on('pageerror', e => log('pageerror dueño', e.message))
  await d.goto(B + '#/crear'); await d.waitForTimeout(1500); await entendido(d)
  await d.getByRole('radio', { name: 'Invitar a la otra persona' }).click()
  await d.fill('#f-direccion', 'Ejemplo · Casa Las Flores'); await d.fill('#f-monto', '20'); await d.fill('#f-inicio', fecha(1)); await d.fill('#f-fin', fecha(190))
  const regla = d.getByLabel('Nueva regla'); if (await regla.count()) { await regla.fill('No fumar dentro de la casa'); await regla.press('Enter') }
  await d.fill('#f-email', INVITADO)
  for (const id of ['#f-declara', '#f-terminos-version', '#acepto-anexo']) { const c = d.locator(id); if (await c.count() && !(await c.isChecked())) await c.check() }
  await d.locator('button.na-crear').click()
  await d.waitForURL(/#\/alquiler\//, { timeout: 30000 }); await d.waitForTimeout(2500)
  const link = await d.locator('input[readonly]').first().inputValue().catch(() => '')
  token = link.match(/[0-9a-f]{64}/)?.[0] ?? ''
  log('alquiler creado; correos de invitación atendidos:', correos.length)
  await captura(d, '1-dueno-con-correo')
  await d.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('lk:invitacion-correo:')) localStorage.removeItem(k) }); await d.reload(); await d.waitForTimeout(2500)
  await captura(d, '2-dueno-sin-correo')
  const correo = correos.find(c => c.url === 'https://api.resend.com/emails') ?? falla('No salió el correo de invitación')
  const href = correo.cuerpo.html.match(/href="([^"]+)"[^>]*>[^<]*(?:invitaci|Ver)/i)?.[1] ?? correo.cuerpo.html.match(/href="(http:\/\/localhost[^"]+)"/)?.[1] ?? falla('El correo no tiene botón')
  log('el botón del correo lleva a', href.replace(/[0-9a-f]{64}/, '<token>'))
  if (!ANTES && !/#\/invitacion\/[0-9a-f-]{36}\/[0-9a-f]{64}$/.test(href)) falla('El botón del correo no lleva a la invitación')

  // 2) Invitada: navegador nuevo, sin sesión, abre el link del correo
  const ci = await nuevo(); const g = await ci.newPage(); g.on('pageerror', e => log('pageerror invitada', e.message))
  await g.goto(href.replace(/&amp;/g, '&')); await g.waitForTimeout(2000)
  const sinSesion = await g.getByText('Te invitaron a un alquiler en Lockumi. Inicia sesión para ver y aceptar la invitación.').count()
  log('pantalla sin sesión con el texto de Legal:', !!sinSesion); if (!ANTES && !sinSesion) falla('Falta el texto de invitado sin sesión')
  await captura(g, '3-invitada-sin-sesion')
  for (const id of ['#acepto-terminos', '#acepto-privacidad']) { const c = g.locator(id); if (await c.count() && !(await c.isChecked())) await c.check() }
  await g.getByRole('button', { name: 'Entrar', exact: true }).click()
  await g.getByRole('button', { name: /Continuar con tu correo/ }).click()
  await g.getByPlaceholder('nombre@correo.com').fill(INVITADO); await g.getByRole('button', { name: 'Enviar código' }).click()
  await g.locator('input.codigo').fill('123456'); await g.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).click()
  await g.waitForTimeout(4000)
  const ruta = await g.evaluate(() => location.hash)
  const enInvitacion = /^#\/invitacion\//.test(ruta) && await g.getByRole('button', { name: 'Aceptar invitación' }).count()
  log('después de entrar llegó a', enInvitacion ? 'la invitación' : `otra pantalla (${ruta.replace(/[0-9a-f]{64}/, '<token>') || '#/'})`)
  if (!ANTES && !enInvitacion) falla('Después de entrar no llegó a la invitación')
  await entendido(g); await captura(g, '4-invitada-tras-entrar')
  if (enInvitacion) {
    const cas = g.locator('#inv-terminos'); if (await cas.count() && !(await cas.isChecked())) await cas.check()
    await g.getByRole('button', { name: 'Aceptar invitación' }).click(); await g.waitForURL(/#\/alquiler\//, { timeout: 30000 }); await g.waitForTimeout(2500); await entendido(g)
    const ver = g.getByRole('button', { name: /Ver el contrato|Ver contrato/ }); if (await ver.count()) await ver.first().click().catch(() => {})
    const aReglas = () => g.evaluate(() => { const l = document.querySelector('.ct__reglas, ul.reglas'); const t = l?.previousElementSibling ?? l; if (t) { t.scrollIntoView({ block: 'start' }); scrollBy(0, -70) } })
    await g.waitForTimeout(600); await captura(g, '6-inquilino-reglas', aReglas)
  }
  await g.goto(B + '#/'); await g.waitForTimeout(3000); await entendido(g); await g.waitForTimeout(800); await entendido(g)
  const tiene = await g.getByText('Ejemplo · Casa Las Flores').count()
  log('«Tus alquileres» del inquilino muestra el alquiler:', !!tiene); if (!ANTES && !tiene) falla('El alquiler no aparece en «Tus alquileres»')
  await captura(g, '5-inquilino-tus-alquileres')
  ok = true
} catch (e) { console.error('FALLÓ:', e.message) }
finally { await navegador.close(); await vite.close() }
console.log(ok ? (ANTES ? 'Listo (versión anterior, solo capturas).' : 'OK: el link del correo abre la invitación, después de entrar llega ahí y el alquiler queda en «Tus alquileres».') : 'NO PASÓ')
process.exit(ok ? 0 : 1)
