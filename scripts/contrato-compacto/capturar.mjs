// Contrato compacto: recorrido con Playwright sobre la app construida (como producción: VITE_TRUSTLESS=1), 390 y 1440 px.
// Revisa: una sola variante según el ancho (tarjeta + panel en escritorio, barra + hoja en celular), sin ids repetidos; la tarjeta
// muestra lugar, depósito, fechas y estado; «Ver contrato» abre el panel; Escape y «Cerrar» lo cierran y el foco vuelve al botón;
// Tab no sale del panel; la columna derecha queda fija y nunca más alta que la pantalla; en el celular la hoja se cierra deslizando
// hacia abajo; al cambiar el ancho cambia la variante; imprimir con el menú del navegador da el contrato completo.
// Sesión simulada como la deja el login (demo@lockumi.com); /api/solo se responde AQUÍ con datos de ejemplo (no se paga nada).
// Uso: VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173 &  luego  OUT=/tmp/cc/ [CHROME=…] node scripts/contrato-compacto/capturar.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const B = process.env.BASE || 'http://localhost:4173/', OUT = process.env.OUT || 'contrato-compacto-'
mkdirSync(OUT.replace(/[^/]*$/, '') || '.', { recursive: true })
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
const LUGAR = 'Apartamento en Heredia centro'
const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }

for (const [n, w] of [['movil', 390], ['escritorio', 1440]]) {
  console.log('==', n, w)
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  await ctx.addInitScript(() => {
    localStorage.setItem('lockumi.recorrido.v1.059bcb6c5fd0cda5', 'captura')   // recorrido guiado ya visto (demo@lockumi.com)
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' }))
  })
  await ctx.route(/\/api\/(solo|tw)/, async r => {
    let a = ''; try { a = JSON.parse(r.request().postData() || '{}').accion } catch { /* sin cuerpo */ }
    const cuerpo = a === 'dueno' ? { dueno: 'G' + 'D'.repeat(55), trustlineTx: null } : a === 'cuenta-prueba' ? { inquilino: 'G' + 'I'.repeat(55), trustlineTx: null, compraTx: null } : null
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{"error":"no disponible en la captura"}' })
  })
  const p = await ctx.newPage(); p.on('pageerror', e => { console.log('  pageerror', e.message); fallas.push('pageerror ' + e.message) })
  const entendido = async () => { const e = p.getByRole('button', { name: 'Entendido' }); if (await e.count()) await e.first().click().catch(() => {}) }
  await p.goto(B + '#/crear'); await p.waitForTimeout(1200); await entendido()
  await p.fill('#f-direccion', LUGAR); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(350))
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.paso-cab').waitFor({ timeout: 20000 })
  ok(await p.locator('.cc-tarjeta, .cc-barra').count() === 0, `${n}: en la pantalla de firma no hay tarjeta ni barra (ahí sigue el contrato plegable)`)
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  await p.waitForTimeout(2500)
  // Lleva el alquiler al acta de entrada (la pantalla de la captura original): firmas de los dos y estado «fotos_entrada».
  await p.evaluate(l => { const k = 'lockumi.alquileres.prueba.v2'; const xs = JSON.parse(localStorage.getItem(k)); const a = xs.find(x => x.direccion === l)
    const t = new Date().toISOString(); a.contrato.firmas.dueno ||= t; a.contrato.firmas.inquilino ||= t; a.estado = 'fotos_entrada'; localStorage.setItem(k, JSON.stringify(xs)) }, LUGAR)
  await p.reload(); await p.waitForTimeout(1500); await entendido(); await p.mouse.move(0, 0); await p.evaluate(() => document.fonts.ready)

  const ids = await p.evaluate(() => { const x = [...document.querySelectorAll('[id]')].map(e => e.id); return x.filter((v, i) => x.indexOf(v) !== i) })
  ok(ids.length === 0, `${n}: sin ids repetidos${ids.length ? ' (' + ids.join(', ') + ')' : ''}`)
  ok(await p.locator('dialog.cc-panel').count() === 1, `${n}: un solo panel en la página`)
  ok(await p.locator('.detalle .ct:not(.ct--impresion), .cp-abrir').count() === 0, `${n}: el contrato entero ya no está en la página`)
  const boton = movil ? p.locator('.cc-barra') : p.locator('.cc-tarjeta').getByRole('button', { name: 'Ver contrato', exact: true })
  const abierto = () => p.locator('dialog.cc-panel[open]')
  const foco = () => boton.evaluate(e => e === document.activeElement)

  if (!movil) {
    ok(await p.locator('.cc-barra').count() === 0 && await p.locator('.detalle__lado > .cc-tarjeta').count() === 1, `${n}: tarjeta corta en la columna derecha (sin barra)`)
    const t = await p.locator('.cc-tarjeta').innerText()
    for (const x of ['Lugar', LUGAR, 'Depósito', '20 USDC', 'Fechas', '→', 'Estado', 'Firmado por los dos', 'Ver contrato']) ok(t.includes(x), `${n}: la tarjeta muestra «${x}»`)
    const orden = await p.evaluate(() => [...document.querySelector('.detalle__lado').children].map(e => e.classList.contains('cc-tarjeta') ? 'contrato' : e.getAttribute('data-recorrido') || e.tagName.toLowerCase()))
    ok(orden[0] === 'contrato' && orden.includes('pasos'), `${n}: orden de la columna ${orden.join(' · ')}`)
    // Fija bajo el aviso (48 px) al bajar, y nunca más alta que la pantalla
    const lado = await p.evaluate(async () => { let r; for (const y of [280, 300, 320, 340, 360, 380]) { scrollTo(0, y); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); r = document.querySelector('.detalle__lado').getBoundingClientRect(); if (Math.round(r.top) === 48) break } return { top: Math.round(r.top), alto: Math.round(r.height), pos: getComputedStyle(document.querySelector('.detalle__lado')).position } })
    ok(lado.pos === 'sticky' && lado.top === 48, `${n}: la columna queda fija a 48 px al bajar (top ${lado.top})`)
    ok(lado.alto <= 900 - 64 + 1, `${n}: la columna no es más alta que la pantalla (${lado.alto} px)`)
    const alto = await p.evaluate(() => [document.querySelector('.detalle__principal').getBoundingClientRect().height, document.querySelector('.detalle__lado').getBoundingClientRect().height])
    ok(alto[1] <= alto[0] + 1, `${n}: la columna no es más larga que el formulario (${Math.round(alto[1])} ≤ ${Math.round(alto[0])})`)
    await p.screenshot({ path: `${OUT}${n}-tarjeta.png` })
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}${n}-completa.png`, fullPage: true }); await p.evaluate(() => scrollTo(0, 280))
  } else {
    ok(await p.locator('.cc-tarjeta').count() === 0 && await p.locator('.cc-barra').count() === 1, `${n}: barra compacta arriba (sin tarjeta)`)
    const t = await p.locator('.cc-barra').innerText(); ok(t.includes(LUGAR) && t.includes('20 USDC') && t.includes('Ver contrato'), `${n}: la barra muestra lugar, depósito y «Ver contrato»`)
    const pos = await p.locator('.cc-barra').evaluate(e => [e.getBoundingClientRect().top < document.querySelector('.detalle').getBoundingClientRect().top, getComputedStyle(e.parentElement).position])
    ok(pos[0] && pos[1] !== 'sticky', `${n}: la barra va arriba, antes del formulario, y se va con la página`)
    const h = await p.locator('.cc-barra__ver').evaluate(e => e.getBoundingClientRect().height); ok(h >= 44, `${n}: «Ver contrato» de ${h} px (≥ 44)`)
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}${n}-barra.png` })
    await p.screenshot({ path: `${OUT}${n}-completa.png`, fullPage: true })
  }

  // Abrir con el teclado (Enter), Tab queda dentro, Escape cierra y el foco vuelve
  await boton.focus(); await p.keyboard.press('Enter'); await abierto().waitFor({ timeout: 3000 }); await p.waitForTimeout(400)
  ok(await abierto().count() === 1, `${n}: «Ver contrato» abre el ${movil ? 'contrato en una hoja desde abajo' : 'panel a la derecha'}`)
  const caja = await abierto().evaluate(e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) } })
  ok(movil ? caja.b === 844 && caja.l === 0 : caja.r === w && caja.t === 0 && caja.l >= w - 480, `${n}: posición del panel ${JSON.stringify(caja)}`)
  const txt = await abierto().evaluate(e => e.textContent)
  for (const x of ['El alquiler', 'Partes', 'Reglas', 'El depósito', '7 días para reclamos', 'Mediación', 'Firmas', 'Descargar o imprimir']) ok(txt.includes(x), `${n}: el panel tiene «${x}»`)
  ok(!txt.includes('Ver contrato completo'), `${n}: el panel muestra el contrato entero (sin plegar)`)
  let fuera = false; for (let k = 0; k < 8; k++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement?.closest('dialog.cc-panel[open]')))) fuera = true }
  ok(!fuera, `${n}: Tab queda dentro del panel`)
  await p.screenshot({ path: `${OUT}${n}-panel.png` })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  ok(await abierto().count() === 0, `${n}: Escape lo cierra`); ok(await foco(), `${n}: después de Escape el foco vuelve a «Ver contrato»`)
  // «Cerrar»
  await boton.click(); await abierto().waitFor(); await p.waitForTimeout(350)
  await abierto().getByRole('button', { name: 'Cerrar' }).click(); await p.waitForTimeout(300)
  ok(await abierto().count() === 0, `${n}: «Cerrar» lo cierra`); ok(await foco(), `${n}: después de «Cerrar» el foco vuelve a «Ver contrato»`)

  if (movil) { // Deslizar hacia abajo
    await boton.click(); await abierto().waitFor(); await p.waitForTimeout(400)
    const cab = await p.locator('dialog.cc-panel[open] .cc-panel__cab').boundingBox()
    await p.mouse.move(cab.x + 120, cab.y + 10); await p.mouse.down(); for (let k = 1; k <= 5; k++) { await p.mouse.move(cab.x + 120, cab.y + 10 + k * 10); await p.waitForTimeout(80) } await p.mouse.up(); await p.waitForTimeout(300)
    ok(await abierto().count() === 1, `${n}: deslizar poco y despacio no la cierra`)
    await p.mouse.move(cab.x + 120, cab.y + 10); await p.mouse.down(); await p.mouse.move(cab.x + 120, cab.y + 110, { steps: 5 }); await p.waitForTimeout(150)
    await p.screenshot({ path: `${OUT}${n}-deslizando.png` })
    await p.mouse.move(cab.x + 120, cab.y + 300, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(400)
    ok(await abierto().count() === 0, `${n}: deslizar hacia abajo cierra la hoja`); ok(await foco(), `${n}: después de deslizar el foco vuelve a la barra`)
    // Al pasar a escritorio cambia la variante (una sola a la vez)
    await p.setViewportSize({ width: 1100, height: 844 }); await p.waitForTimeout(400)
    ok(await p.locator('.cc-barra').count() === 0 && await p.locator('.cc-tarjeta').count() === 1 && await p.locator('dialog.cc-panel').count() === 1, `${n}: al ensanchar la pantalla pasa a la tarjeta (una sola variante)`)
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300)
  } else { // Tocar afuera cierra
    await boton.click(); await abierto().waitFor(); await p.waitForTimeout(350); await p.mouse.click(100, 450); await p.waitForTimeout(300)
    ok(await abierto().count() === 0, `${n}: tocar afuera cierra el panel`)
  }
  // Imprimir con el menú del navegador: contrato completo en el papel, sin la tarjeta ni la barra
  await p.emulateMedia({ media: 'print' })
  const papel = await p.evaluate(() => { const e = document.querySelector('.cc-papel'); return e && getComputedStyle(e).display !== 'none' && !document.querySelector('.cc-tarjeta .cc-ver, .cc-barra')?.checkVisibility() ? e.textContent : '' })
  ok(['Reglas', 'El depósito', '7 días para reclamos', 'Mediación', 'Firmas', 'No reemplaza un contrato de alquiler'].every(x => papel.includes(x)), `${n}: imprimir con el menú del navegador da el contrato completo`)
  await p.emulateMedia({ media: 'screen' })
  await ctx.close()
}
await browser.close()
if (fallas.length) { console.log('\nFALLAS:\n' + fallas.join('\n')); process.exit(1) } else console.log('\nTODO BIEN')
