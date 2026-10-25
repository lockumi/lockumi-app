// Contrato plegable: recorrido con Playwright en Firma (390 y 1280 px; en Detalle ahora va el contrato compacto), capturas cerrado/abierto, teclado y PDF.
// Vite en localhost:5173 con VITE_TRUSTLESS=1 y VITE_CAVOS_APP_ID (como producción). Sesión simulada como la deja el login
// (lockumi.usuario con metodo 'google' + identidad pública de Cavos). /api/solo se responde AQUÍ con datos de ejemplo (solo
// «dueno» y «cuenta-prueba»; no se paga): no hace falta la vista previa protegida ni ningún enlace para saltar la protección.
// Uso: VITE_CAVOS_APP_ID=… OUT=dir/prefijo- [CHROME=…] node scripts/contrato-plegable/capturar.mjs
import { chromium } from 'playwright'
import { Keypair } from '@stellar/stellar-sdk'
import { execFileSync } from 'node:child_process'
const APP_ID = (process.env.VITE_CAVOS_APP_ID || '').trim(), OUT = process.env.OUT || 'contrato-plegable-', B = process.env.BASE || 'http://localhost:5173/'
const DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) {
  console.log('==', n, w)
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  // El recorrido guiado ya «visto» (si no, se abre solo en Inicio y tapa la pantalla de la prueba).
  await ctx.addInitScript(() => localStorage.setItem('lockumi.recorrido.v1.059bcb6c5fd0cda5', 'captura'))
  await ctx.addInitScript(id => {
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' }))
    localStorage.setItem('cavos-kit:identity:' + id, JSON.stringify({ userId: 'google-oauth2|simulado-demo', email: 'demo@lockumi.com', name: 'Demo' }))
  }, APP_ID)
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('  pageerror', e.message))
  await ctx.route('**/api/solo', async r => {
    const a = JSON.parse(r.request().postData() || '{}').accion; console.log('  api (ejemplo)', a)
    const cuerpo = a === 'dueno' ? { dueno: DUENO, trustlineTx: null } : a === 'cuenta-prueba' ? { inquilino: INQ, trustlineTx: null, compraTx: null } : null
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{"error":"no disponible en la captura"}' })
  })
  await p.goto(B); await p.waitForTimeout(800)
  const entendido = async () => { const e = p.getByRole('button', { name: 'Entendido' }); if (await e.count()) await e.first().click().catch(() => {}) }
  await entendido(); await p.goto(B + '#/crear'); await p.waitForTimeout(1200); await entendido()
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  const reglas = p.locator('#f-reglas'); if (await reglas.count()) await reglas.fill('No se permiten mascotas\nNo fumar dentro del apartamento').catch(() => {})
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.paso-cab').waitFor({ timeout: 20000 })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)

  const revisar = async pantalla => {
    const b = p.locator('.cp-abrir'); const reg = p.locator('.cp-completo')
    ok(await b.count() === 1, `${pantalla}: un solo botón «Ver contrato completo»`)
    const m = await b.evaluate(e => { const r = e.getBoundingClientRect(); return { alto: r.height, tag: e.tagName, tipo: e.getAttribute('type'), exp: e.getAttribute('aria-expanded'), ctrl: e.getAttribute('aria-controls'),
      letra: Math.min(...[...e.querySelectorAll('*'), e].filter(x => x.childNodes.length && [...x.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())).map(x => parseFloat(getComputedStyle(x).fontSize))) } })
    ok(m.tag === 'BUTTON' && m.tipo === 'button', `${pantalla}: es <button type="button">`)
    ok(m.exp === 'false', `${pantalla}: cerrado al entrar (aria-expanded="false")`)
    ok(m.ctrl && await reg.getAttribute('id') === m.ctrl, `${pantalla}: aria-controls apunta al bloque plegado`)
    ok(m.alto >= 56, `${pantalla}: alto del botón ${m.alto}px (≥ 56)`); ok(m.letra >= 14, `${pantalla}: letra mínima del botón ${m.letra}px (≥ 14)`)
    ok(await reg.isHidden() && await reg.getAttribute('hidden') !== null, `${pantalla}: Reglas, depósito, reclamos, mediación y firmas ocultos`)
    for (const t of ['El alquiler', 'Partes']) ok(await p.locator('.ct__sec h3', { hasText: t }).first().isVisible(), `${pantalla}: «${t}» visible cerrado`)
    ok(await p.locator('.ct__pie').first().isVisible(), `${pantalla}: pie legal visible cerrado`)
    ok(await p.getByRole('button', { name: 'Descargar o imprimir' }).isVisible(), `${pantalla}: «Descargar o imprimir» visible cerrado`)
    return b
  }
  const teclado = async (b, pantalla) => {
    // Tab desde el elemento anterior llega al botón; Enter abre; Espacio cierra; el foco no se mueve
    await b.evaluate(e => { const t = [...document.querySelectorAll('a[href],button,input,summary,[tabindex]:not([tabindex="-1"])')].filter(x => !x.closest('[hidden]') && x.getClientRects().length); const i = t.indexOf(e); (t[i - 1] || document.body).focus() })
    await p.keyboard.press('Tab'); ok(await b.evaluate(e => document.activeElement === e), `${pantalla}: se llega con Tab`)
    await p.keyboard.press('Enter'); await p.waitForTimeout(350)
    ok(await b.getAttribute('aria-expanded') === 'true' && await p.locator('.cp-completo').isVisible(), `${pantalla}: Enter abre`)
    ok((await b.innerText()).includes('Ocultar contrato completo'), `${pantalla}: abierto dice «Ocultar contrato completo»`)
    await p.keyboard.press('Space'); await p.waitForTimeout(350)
    ok(await b.getAttribute('aria-expanded') === 'false' && await p.locator('.cp-completo').isHidden(), `${pantalla}: Espacio cierra`)
    ok(await b.evaluate(e => document.activeElement === e), `${pantalla}: el foco queda en el botón`)
    await p.keyboard.press('Tab'); ok(await p.evaluate(() => !document.activeElement?.closest('.cp-completo')), `${pantalla}: cerrado, Tab no entra en lo oculto`)
  }
  const desborde = () => p.evaluate(() => ({ ancho: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll('main *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + .5 || b.left < -.5) }).length }))

  // ---- Firma ----
  ok(await p.getByText('Firmas del contrato').isVisible(), 'firma: pantalla Firma después de «Crear alquiler de prueba»')
  const b1 = await revisar('firma')
  const casilla = p.getByLabel('Leí el contrato y estoy de acuerdo.')
  ok(await casilla.isVisible() && await casilla.isEnabled(), 'firma: casilla visible y activa con el contrato cerrado (opción a)')
  ok(await p.getByRole('button', { name: 'Firma como inquilino' }).isVisible(), 'firma: «Firma como inquilino» visible cerrado')
  console.log('  desborde', JSON.stringify(await desborde()))
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}firma-cerrado-${n}.png`, fullPage: true })
  await teclado(b1, 'firma')
  await b1.click(); await p.waitForTimeout(400); await p.mouse.move(0, 0)
  console.log('  desborde abierto', JSON.stringify(await desborde()))
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}firma-abierto-${n}.png`, fullPage: true })
  await b1.click(); await p.waitForTimeout(300)

  if (n === 'escritorio') {
    // 1) Menú del navegador (Ctrl+P) con el contrato CERRADO: @media print + beforeprint lo muestran completo
    await p.emulateMedia({ media: 'print' })
    ok(await p.locator('.cp-completo').isVisible(), 'impresión (menú del navegador, cerrado): lo plegado se ve')
    ok(await p.locator('.cp-abrir').isHidden(), 'impresión: el botón no sale en el papel')
    await p.screenshot({ path: `${OUT}impresion-menu-cerrado.png`, fullPage: true })
    await p.pdf({ path: `${OUT}impresion-menu-cerrado.pdf`, format: 'A4', printBackground: true })
    // 2) «Descargar o imprimir» con el contrato CERRADO: imprime solo la versión de impresión, completa
    await p.emulateMedia({ media: 'screen' }); await p.waitForTimeout(300)
    ok(await p.locator('.cp-abrir').getAttribute('aria-expanded') === 'false' && await p.locator('.cp-completo').isHidden(), 'después de imprimir con el menú sigue cerrado en pantalla')
    await p.evaluate(() => { window.__impreso = 0; window.print = () => { window.__impreso++ } })
    await p.getByRole('button', { name: 'Descargar o imprimir' }).click(); await p.waitForTimeout(300)
    ok(await p.evaluate(() => window.__impreso === 1 && document.documentElement.classList.contains('imprimiendo')), '«Descargar o imprimir»: abre la ventana de impresión')
    await p.emulateMedia({ media: 'print' }); await p.pdf({ path: `${OUT}impresion-boton-cerrado.pdf`, format: 'A4', printBackground: true })
    await p.emulateMedia({ media: 'screen' })
    await p.evaluate(() => dispatchEvent(new Event('afterprint'))); await p.waitForTimeout(300)
    ok(await p.locator('.cp-abrir').getAttribute('aria-expanded') === 'false', 'después de imprimir sigue cerrado')
    for (const f of ['impresion-menu-cerrado', 'impresion-boton-cerrado']) {
      const t = execFileSync('pdftotext', [`${OUT}${f}.pdf`, '-']).toString().replace(/\s+/g, ' ').toLowerCase()
      const faltan = ['El alquiler', 'Partes', 'Reglas', 'No se permiten mascotas', 'El depósito', 'Ni el dueño ni el inquilino pueden tomarlo solos', '7 días para reclamos', 'Mediación', 'la mediación es una simulación', 'No decide por ustedes', 'Firmas', 'No reemplaza un contrato de alquiler', 'Este contrato se guarda solo en tu navegador']
        .filter(x => !t.includes(x.toLowerCase()))
      if (f === 'impresion-boton-cerrado') ok(!t.includes('firmas del contrato') && !t.includes('tus alquileres'), `PDF ${f}: solo el contrato (sin el resto de la pantalla)`)
      ok(!faltan.length && !t.includes('ver contrato completo'), `PDF ${f}: contrato completo${faltan.length ? ' (faltan: ' + faltan.join(', ') + ')' : ''}`)
    }
  }

  // ---- Firmar con el contrato cerrado y pasar a Detalle ----
  await casilla.check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  await p.getByText('Ahora te toca: pagar el depósito.').waitFor({ timeout: 30000 }); await p.waitForTimeout(1200)
  // Desde el 24/10/2026 (contrato compacto) el detalle ya no muestra el contrato plegable en la columna: tarjeta corta (escritorio) o
  // barra compacta (celular) con «Ver contrato». Lo revisa a fondo scripts/contrato-compacto/capturar.mjs.
  ok(await p.locator('.detalle .cp-abrir, .detalle .ct:not(.ct--impresion)').count() === 0, 'detalle: sin contrato plegable en la columna')
  ok(await p.locator(movil ? '.cc-barra' : '.detalle__lado .cc-tarjeta').count() === 1 && await p.locator('.cc-tarjeta, .cc-barra').count() === 1, `detalle: ${movil ? 'barra compacta' : 'tarjeta corta'} (una sola variante)`)
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}detalle-compacto-${n}.png`, fullPage: true })
  await ctx.close()
}
await browser.close()
console.log(fallas.length ? `FALLAS: ${fallas.length}` : 'TODO OK')
process.exit(fallas.length ? 1 : 0)
