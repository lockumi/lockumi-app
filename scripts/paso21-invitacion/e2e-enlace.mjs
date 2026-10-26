// paso21 · E2E del LINK REAL del correo de invitación (lo que el E2E-C de 111 pasos no abría):
// 1) el dueño (demo@lockumi.com, sesión simulada) crea un alquiler invitando, con la app local (Vite) contra un Supabase LOCAL
//    (supabase-local.mjs: PGlite con todas las migraciones del repo, RLS y permisos de verdad; sin llaves, sin producción);
// 2) /api/correo se atiende con el atenderCorreo REAL del repo (Resend falso: no sale ningún correo) y se saca el href del botón del HTML;
// 3) ese href se abre en un navegador NUEVO, sin sesión ni almacenamiento: tiene que verse la pantalla de invitado sin sesión;
// 4) la persona invitada entra con «Continuar con tu correo» (proveedor simulado: sin VITE_CAVOS_APP_ID cualquier código de 6 dígitos)
//    y tiene que llegar DIRECTO a la invitación (no a Inicio), aceptar y ver el alquiler en «Tus alquileres» como inquilino.
// v2 (Legal 25/10, 10:10 p. m.): aceptar exige el correo invitado VERIFICADO para la sesión (20261025230000). El E2E hace lo que hace
//    el servidor con la clave de servicio (/api/verificar-correo): primero verifica OTRO correo para la sesión → el servidor responde
//    «Esta invitación es para otro correo…»; después verifica el invitado → acepta. Otra persona que entra con otro correo ve el mismo
//    texto en la pantalla. Plegables (25/10, 10:15 p. m.): cerrados al entrar; la casilla, sus enlaces y el botón, a la vista.
// Uso: node scripts/paso21-invitacion/e2e-enlace.mjs [carpeta-capturas]   (RAIZ=<otra copia del repo> para correr la versión anterior,
// ANTES=1 para no exigir el comportamiento nuevo). No necesita ninguna variable de Supabase: todo es local.
// Nunca guarda ni imprime el token: antes de cada captura lo tapa en el campo del link y comprueba que no esté en la página.
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { supabaseLocal, URL_LOCAL, CLAVE_ANON } from './supabase-local.mjs'

const RAIZ = resolve(process.env.RAIZ || '.'), ANTES = process.env.ANTES === '1', SALIDA = process.argv[2] ? resolve(process.argv[2]) : ''
const PUERTO = Number(process.env.PUERTO || (ANTES ? 5292 : 5291)), B = `http://localhost:${PUERTO}/`
const DUENO = { email: 'demo@lockumi.com', nombre: 'Ana Ejemplo', metodo: 'correo' }, INVITADO = process.env.INVITADO || 'lockumi+luis-ejemplo@mail.grokbot.com'
const OTRO = 'lockumi+otro-ejemplo@mail.grokbot.com'   // otra persona (correos de prueba solo a lockumi+…@mail.grokbot.com; aquí no sale ninguno)
const OTRO_CORREO = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
const sb = await supabaseLocal(RAIZ)
Object.assign(process.env, { VITE_SUPABASE_URL: URL_LOCAL, VITE_SUPABASE_ANON_KEY: CLAVE_ANON, VITE_TRUSTLESS: '1', VITE_PRUEBA_COMPLETA: '1', VITE_DOS_PERSONAS: '1', VITE_CORREOS: '1', VITE_ORIGEN_PUBLICO: B.slice(0, -1) })
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
  await sb.enrutar(c)
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
  // Antes (master): el botón del correo no llevaba a la invitación; para las capturas de «antes» la persona abre el link que copió el dueño.
  const abrir = ANTES && !/#\/invitacion\//.test(href) ? link : href.replace(/&amp;/g, '&')

  // 2) Otra persona con el link: entra con OTRO correo → la pantalla dice que la invitación es para otro correo (sin mostrar cuál)
  const co = await nuevo(); const o = await co.newPage(); o.on('pageerror', e => log('pageerror otra', e.message))
  const entrarCon = async (p, correo) => {
    for (const id of ['#acepto-terminos', '#acepto-privacidad']) { const c = p.locator(id); if (await c.count() && !(await c.isChecked())) await c.check() }
    await p.getByRole('button', { name: 'Entrar', exact: true }).click()
    await p.getByRole('button', { name: /Continuar con tu correo/ }).click()
    await p.getByPlaceholder('nombre@correo.com').fill(correo); await p.getByRole('button', { name: 'Enviar código' }).click()
    await p.locator('input.codigo').fill('123456'); await p.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).click()
    await p.waitForTimeout(4000)
  }
  // Legal 25/10, 10:30 p. m.: la comisión va justo debajo de «Red de prueba de Stellar: sin dinero real.», solo en la invitación y el alquiler.
  const COMISION = 'Trustless Work cobra una comisión del 0,3 % de cada monto que se libera.'
  const comision = p => p.evaluate(t => { const e = document.querySelector('.aviso-red__extra'); if (!e) return { hay: false }
    const r = e.getBoundingClientRect(); return { hay: true, texto: e.textContent === t, junto: e.previousElementSibling?.classList.contains('aviso-red') && e.previousElementSibling.textContent === 'Red de prueba de Stellar: sin dinero real.',
      visible: r.height > 0 && getComputedStyle(e).visibility !== 'hidden', fueraDePlegable: !e.closest('.cp-completo') } }, COMISION)
  const exigirComision = async (p, donde) => { const c = await comision(p); log(`comisión de Trustless Work en ${donde}:`, JSON.stringify(c)); if (!ANTES && Object.values(c).some(v => !v)) falla(`Falta la línea de la comisión en ${donde}: ` + JSON.stringify(c)) }
  const sinComision = async (p, donde) => { if (!ANTES && (await comision(p)).hay) falla(`La línea de la comisión no va en ${donde}`) }
  await o.goto(abrir); await o.waitForTimeout(2000)
  const sinSesion = ANTES ? await o.getByText('Te invitaron a un alquiler en Lockumi').count()
    : await o.locator('h2.entrada-app__titulo', { hasText: /^Te invitaron a un alquiler$/ }).count() && await o.locator('.entrada-app__sub', { hasText: /^Inicia sesión para verlo$/ }).count()
  log('pantalla sin sesión, corta (título y subtítulo de Legal):', !!sinSesion); if (!ANTES && !sinSesion) falla('Falta el título o el subtítulo de la invitación sin sesión')
  if (!ANTES && (await o.locator('.beneficios').count() || await o.getByText(/firm/i).count())) falla('La pantalla sin sesión no es corta (beneficios o «firmar»)')
  await sinComision(o, 'la pantalla sin sesión')
  await captura(o, '3-invitada-sin-sesion')
  await entrarCon(o, OTRO); await entendido(o)
  const uiOtro = await o.getByText(OTRO_CORREO).count()
  log('otra persona (otro correo) ve «Esta invitación es para otro correo…»:', !!uiOtro, '· botón Aceptar:', await o.getByRole('button', { name: 'Aceptar invitación' }).count())
  if (!ANTES && (!uiOtro || await o.getByRole('button', { name: 'Aceptar invitación' }).count())) falla('Con otro correo la pantalla no da el texto de Legal o deja aceptar')
  await captura(o, '7-otro-correo-pantalla')

  // 3) Invitada: navegador nuevo, sin sesión, abre el link del correo y entra con el correo invitado
  const ci = await nuevo(); const g = await ci.newPage(); g.on('pageerror', e => log('pageerror invitada', e.message))
  await g.goto(abrir); await g.waitForTimeout(2000)
  await entrarCon(g, INVITADO)
  const ruta = await g.evaluate(() => location.hash)
  const enInvitacion = /^#\/invitacion\//.test(ruta) && await g.getByRole('button', { name: 'Aceptar invitación' }).count()
  log('después de entrar llegó a', enInvitacion ? 'la invitación' : `otra pantalla (${ruta.replace(/[0-9a-f]{64}/, '<token>') || '#/'})`)
  if (!enInvitacion && !ANTES) falla('Después de entrar no llegó a la invitación')
  if (!enInvitacion) { await g.goto(abrir); await g.waitForTimeout(3000) }   // antes (master): se abre el link otra vez a mano
  await entendido(g)
  if (!ANTES) {   // plegable de las reglas cerrado; casilla, enlaces y botón a la vista
    const b = g.locator('.plegable .cp-abrir'); const exp = await b.getAttribute('aria-expanded'), txt = (await b.innerText()).trim()
    const vis = async l => (await l.count()) > 0 && await l.first().isVisible()
    const todo = { cerrado: exp === 'false', titulo: txt === 'Reglas del alquiler', reglasOcultas: !(await g.getByText('No fumar dentro de la casa').isVisible()),
      casilla: await vis(g.locator('#inv-terminos')), terminos: await vis(g.locator('a[href="/terminos"]')), privacidad: await vis(g.locator('a[href="/privacidad"]')), boton: await vis(g.getByRole('button', { name: 'Aceptar invitación' })) }
    log('invitación con el plegable cerrado:', JSON.stringify(todo)); if (Object.values(todo).some(v => !v)) falla('Plegable de la invitación: ' + JSON.stringify(todo))
    await b.click(); if (await b.getAttribute('aria-expanded') !== 'true' || !(await g.getByText('No fumar dentro de la casa').isVisible())) falla('Un toque no abre «Reglas del alquiler»'); await b.click()
    const t = await g.evaluate(() => { const h = document.querySelector('h1.inv-titulo'), c = h?.nextElementSibling; return h && c ? Math.round(c.getBoundingClientRect().top - h.getBoundingClientRect().bottom) : -1 })
    log('aire entre el título y la tarjeta:', t, 'px'); if (t < 16) falla('El título de la invitación sigue pegado a la tarjeta')
    await exigirComision(g, 'la invitación (plegable cerrado)')
  }
  await captura(g, '4-invitada-tras-entrar')
  const uid = sb.uids(ci).at(-1); if (!uid) falla('La invitada no tiene sesión en el servidor')   // la sesión vigente (la última de este navegador)
  const conTabla = await sb.tieneVerificados()
  const cas = g.locator('#inv-terminos'); if (await cas.count() && !(await cas.isChecked())) await cas.check()
  if (conTabla && !ANTES) {
    // 3a) la sesión tiene verificado OTRO correo (aunque en la app entró con el invitado): el servidor no deja aceptar
    await sb.verificar(uid, OTRO)
    await g.getByRole('button', { name: 'Aceptar invitación' }).click(); await g.waitForTimeout(2500)
    const srv = await g.locator('p.error[role="alert"]', { hasText: OTRO_CORREO }).count()
    log('servidor con otro correo verificado responde el texto de Legal:', !!srv, '· sigue en la invitación:', /^#\/invitacion\//.test(await g.evaluate(() => location.hash)))
    if (!srv) falla('El servidor no respondió «Esta invitación es para otro correo…». En pantalla: ' + JSON.stringify(await g.locator('[role="alert"]').allInnerTexts()) + ' · sesiones: ' + sb.uids(ci).length)
    await captura(g, '8-otro-correo-servidor', () => g.locator('p.error[role="alert"]').last().scrollIntoViewIfNeeded())
  }
  // 3b) lo que hace /api/verificar-correo al entrar con el correo invitado → acepta
  if (conTabla) await sb.verificar(uid, INVITADO)
  await g.getByRole('button', { name: 'Aceptar invitación' }).click(); await g.waitForURL(/#\/alquiler\//, { timeout: 30000 }); await g.waitForTimeout(2500); await entendido(g)
  if (!ANTES) {
    const [p] = await sb.q(null, null, `select p.usuario::text u, p.email_cavos e, exists (select 1 from public.lk_correos_verificados v where v.usuario = p.usuario and v.correo = p.email_cavos) ver from public.lk_participantes p join public.lk_contratos c on c.id = p.contrato_id where p.rol = 'inquilino' and c.direccion = 'Ejemplo · Casa Las Flores'`)
    log('inquilino en el servidor: misma sesión', p?.u === uid, '· correo', p?.e === INVITADO ? 'el invitado' : p?.e, '· verificado', p?.ver)
    if (p?.u !== uid || p?.e !== INVITADO || !p?.ver) falla('La invitada no quedó como inquilino con el correo verificado')
    const b = g.locator('.ct .cp-abrir').first()
    const todo = { cerrado: await b.getAttribute('aria-expanded') === 'false', titulo: /^Contrato de alquiler \(Ejemplo\)/.test((await b.innerText()).trim()),
      reglasOcultas: !(await g.locator('.ct__reglas').first().isVisible()), casilla: await g.getByText('Leí el contrato y estoy de acuerdo.').isVisible() }
    log('alquiler (firmas) con el contrato plegado:', JSON.stringify(todo)); if (Object.values(todo).some(v => !v)) falla('Plegable del contrato: ' + JSON.stringify(todo))
    await exigirComision(g, 'el alquiler (contrato cerrado)')
  }
  await captura(g, '9-alquiler-arriba', () => g.evaluate(() => scrollTo(0, 0)))
  const alContrato = () => g.evaluate(() => { const b = document.querySelector('.ct .cp-abrir, .ct__reglas'); const t = b?.closest('.ct') ?? b; if (t) { t.scrollIntoView({ block: 'start' }); scrollBy(0, -70) } })
  await captura(g, '6-inquilino-contrato', alContrato)
  await g.goto(B + '#/'); await g.waitForTimeout(3000); await entendido(g); await g.waitForTimeout(800); await entendido(g)
  const tiene = await g.getByText('Ejemplo · Casa Las Flores').count()
  log('«Tus alquileres» del inquilino muestra el alquiler:', !!tiene); if (!ANTES && !tiene) falla('El alquiler no aparece en «Tus alquileres»')
  await sinComision(g, '«Tus alquileres»')
  await captura(g, '5-inquilino-tus-alquileres')
  ok = true
} catch (e) { console.error('FALLÓ:', e.message) }
finally { await navegador.close(); await vite.close() }
console.log(ok ? (ANTES ? 'Listo (versión anterior, solo capturas).' : 'OK: el link del correo abre la invitación; con otro correo no se acepta (pantalla y servidor); con el correo invitado verificado acepta y el alquiler queda en «Tus alquileres».') : 'NO PASÓ')
process.exit(ok ? 0 : 1)
