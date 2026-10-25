// Recorrido guiado (driver.js) en el navegador, sobre la app construida (vite preview en 4173), 390 y 1280 px.
// Revisa: se abre solo la primera vez en Inicio, los 6 pasos con sus textos, «Paso N de 6», foco en Siguiente, trampa de foco,
// Esc = Saltar, el foco vuelve a quien lo abrió, «¿Cómo funciona?» en la cabecera y «Ver el recorrido» en Inicio,
// el globo no tapa lo que señala, alquiler de ejemplo de solo lectura (sin red) y reducir movimiento.
// Uso: VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173 &  luego  OUT=/tmp/ux/rec- node scripts/recorrido/capturar.mjs  (GIF=1 guarda cuadros)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const B = process.env.BASE || 'http://localhost:4173/', OUT = process.env.OUT || 'recorrido-'
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
mkdirSync(OUT.replace(/[^/]*$/, '') || '.', { recursive: true })
const TITULOS = ['Te damos la bienvenida a Lockumi', 'Los datos del alquiler', 'Las reglas del dueño', 'Fotos y lista de entrada', 'Firmas y depósito', 'La devolución']
const RUTAS = ['#/', '#/crear', '#/crear', '#/ejemplo', '#/ejemplo', '#/ejemplo']

async function contexto(w, { reducir = false } = {}) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica', ...(reducir && { reducedMotion: 'reduce' }) })
  await ctx.addInitScript(() => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' })))
  const red = []
  await ctx.route(u => !/^https?:\/\/localhost/.test(u.href), r => { red.push(r.request().url()); return r.abort() })
  await ctx.route('**/api/**', r => { red.push(r.request().url()); return r.fulfill({ status: 503, body: '{}' }) })
  const p = await ctx.newPage(); p.on('pageerror', e => { console.log('  pageerror', e.message); fallas.push('pageerror ' + e.message) })
  return { ctx, p, red }
}
const globo = p => p.locator('.driver-popover.recorrido')
const leer = p => p.evaluate(() => { const g = document.querySelector('.driver-popover.recorrido'); if (!g) return null
  const r = g.getBoundingClientRect(), a = document.querySelector('.driver-active-element')?.getBoundingClientRect()
  const t = document.getElementById(g.getAttribute('aria-labelledby')), d = document.getElementById(g.getAttribute('aria-describedby'))
  const choca = !!a && r.bottom > a.top + 1 && r.top < a.bottom - 1 && r.right > a.left + 1 && r.left < a.right - 1
  return { rol: g.getAttribute('role'), titulo: t?.textContent, texto: d?.textContent, n: g.querySelector('.recorrido__n')?.textContent, puntos: g.querySelectorAll('.recorrido__puntos i').length,
    botones: [...g.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()), alto: Math.min(...[...g.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height)),
    foco: document.activeElement?.textContent?.trim(), dentro: g.contains(document.activeElement), choca, cabe: r.left >= 0 && r.right <= innerWidth + .5 && r.top >= 0 && r.bottom <= innerHeight + .5,
    fondo: getComputedStyle(g).backgroundColor, ruta: location.hash, anim: getComputedStyle(g).animationName, animD: getComputedStyle(g).animationDuration } })
const esperarPaso = (p, i) => p.waitForFunction(t => document.querySelector('.driver-popover.recorrido .driver-popover-title')?.textContent === t, TITULOS[i], { timeout: 8000 })
// Espera a que el globo termine de aparecer (opacidad 1) antes de cada captura.
const quieto = p => p.waitForFunction(() => { const g = document.querySelector('.driver-popover'); return !g || (getComputedStyle(g).opacity === '1' && !g.getAnimations().length) }, null, { timeout: 3000 }).catch(() => {})
const fotos = []; const cuadro = async p => { if (process.env.GIF) { const f = `${OUT}gif-${String(fotos.length).padStart(3, '0')}.png`; await p.screenshot({ path: f }); fotos.push(f) } }

for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) {
  console.log('==', n, w)
  const { ctx, p, red } = await contexto(w)
  await p.goto(B + '#/'); await esperarPaso(p, 0).catch(() => {})
  ok(await globo(p).isVisible(), `${n}: la primera vez se abre solo en Inicio`)
  for (let i = 0; i < 6; i++) {
    await esperarPaso(p, i); await p.waitForTimeout(450)
    const g = await leer(p)
    ok(g.titulo === TITULOS[i] && g.n === `Paso ${i + 1} de 6` && g.puntos === 6, `${n}: paso ${i + 1} «${g.titulo}» (${g.n}, ${g.puntos} puntos)`)
    ok(g.ruta === RUTAS[i], `${n}: paso ${i + 1} en ${g.ruta}`)
    ok(g.rol === 'dialog' && g.texto?.length > 40, `${n}: paso ${i + 1} es un diálogo con título y texto enlazados`)
    const esperados = i === 0 ? ['Saltar', 'Siguiente'] : i === 5 ? ['Saltar', 'Atrás', '¡Listo!'] : ['Saltar', 'Atrás', 'Siguiente']
    ok(JSON.stringify(g.botones) === JSON.stringify(esperados) && g.alto >= 44, `${n}: paso ${i + 1} botones ${g.botones.join(' · ')} (${g.alto} px o más)`)
    ok(g.dentro && g.foco === esperados.at(-1), `${n}: paso ${i + 1} foco en «${g.foco}»`)
    ok(!g.choca && g.cabe, `${n}: paso ${i + 1} el globo no tapa lo que señala y cabe en la pantalla`)
    // Contrato compacto (24/10/2026): la columna derecha se desplaza por dentro; lo señalado (p. ej. «Los pasos») se ve entero, sin cortes.
    const visto = await p.evaluate(() => { const e = document.querySelector('.driver-active-element'); if (!e) return { ok: false }; const r = e.getBoundingClientRect()
      if (r.height > innerHeight - 24) return { ok: true, alto: true }
      let bien = r.top >= -1 && r.bottom <= innerHeight + 1
      for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { if (/(auto|scroll|hidden)/.test(getComputedStyle(x).overflowY)) { const c = x.getBoundingClientRect(); if (r.top < c.top - 1 || r.bottom > c.bottom + 1) bien = false } }
      return { ok: bien, sel: e.getAttribute('data-recorrido') || e.className } })
    ok(visto.ok, `${n}: paso ${i + 1} lo señalado se ve entero (${visto.alto ? 'más alto que la pantalla' : visto.sel})`)
    if (i === 0) ok(g.fondo === 'rgb(255, 245, 238)', `${n}: globo crema sólido (${g.fondo})`)
    await quieto(p); await p.screenshot({ path: `${OUT}${n}-${i + 1}.png` }); await cuadro(p)
    if (i === 1) { // trampa de foco: Tab no sale del globo
      let fuera = false; for (let k = 0; k < 5; k++) { await p.keyboard.press('Tab'); if (!(await leer(p)).dentro) fuera = true }
      ok(!fuera, `${n}: Tab queda dentro del globo (trampa de foco)`)
    }
    if (i === 3) ok(await p.locator('.detalle[inert]').count() === 1 && await p.locator('.ejemplo-cinta').isVisible(), `${n}: alquiler de ejemplo de solo lectura (inert, «Alquiler de ejemplo · solo para ver»)`)
    if (i === 2) { await p.locator('.driver-popover-prev-btn').click(); await esperarPaso(p, 1); ok(true, `${n}: Atrás vuelve al paso 2`); await p.locator('.driver-popover-next-btn').click(); await esperarPaso(p, 2) }
    await p.locator('.driver-popover-next-btn').click()
  }
  await p.waitForFunction(() => !document.querySelector('.driver-popover'), null, { timeout: 4000 })
  ok(await p.evaluate(() => location.hash) === '#/' && await p.evaluate(() => Object.keys(localStorage).some(k => /^lockumi\.recorrido\.v1\.[0-9a-f]{16}$/.test(k))), `${n}: «¡Listo!» lo cierra, vuelve a Inicio y queda marcado como visto (sin el correo en la clave)`)
  await p.reload(); await p.waitForTimeout(1500)
  ok(await globo(p).count() === 0, `${n}: al volver a Inicio no se abre de nuevo`)
  ok(red.length === 0, `${n}: el recorrido no llamó a la red (${red.length})`)
  // Volver a verlo desde la cabecera: Esc = Saltar y el foco vuelve al botón.
  const ayuda = p.getByRole('button', { name: '¿Cómo funciona?' })
  const ab = await ayuda.evaluate(e => ({ h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width, t: e.querySelector('.boton-ayuda__t').getBoundingClientRect().width > 2 ? e.textContent.trim() : '?' }))
  ok(ab.h >= 44 && ab.w >= 44 && (n === 'movil' ? ab.t === '?' : ab.t.includes('¿Cómo funciona?')), `${n}: botón «¿Cómo funciona?» en la cabecera (${Math.round(ab.w)}×${Math.round(ab.h)}, ${n === 'movil' ? 'solo el ícono' : 'con texto'})`)
  await ayuda.focus(); await p.keyboard.press('Enter'); await esperarPaso(p, 0)
  ok(true, `${n}: «¿Cómo funciona?» abre el recorrido`)
  if (n === 'escritorio') await quieto(p), await p.screenshot({ path: `${OUT}${n}-cabecera.png` })
  await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.driver-popover'), null, { timeout: 3000 }); await p.waitForTimeout(150)
  ok(await ayuda.evaluate(e => e === document.activeElement), `${n}: Esc lo cierra y el foco vuelve a «¿Cómo funciona?»`)
  // Desde la tarjeta de Inicio, con Saltar.
  const ver = p.getByRole('button', { name: 'Ver el recorrido' }); await ver.scrollIntoViewIfNeeded()
  if (n === 'movil') await quieto(p), await p.screenshot({ path: `${OUT}${n}-tarjeta.png` })
  await ver.click(); await esperarPaso(p, 0); await p.locator('.recorrido__saltar').click()
  await p.waitForFunction(() => !document.querySelector('.driver-popover'), null, { timeout: 3000 })
  ok(true, `${n}: «Ver el recorrido» en Inicio lo abre y «Saltar» lo cierra`)
  await ctx.close()
}
{ // Reducir movimiento: fundido de 120 ms, sin desplazamiento suave.
  console.log('== reducir movimiento')
  const { ctx, p } = await contexto(390, { reducir: true }); await p.goto(B + '#/'); await esperarPaso(p, 0)
  const g = await leer(p); ok(g.anim === 'aviso-fade' && g.animD === '0.12s', `reducir: el globo aparece con un fundido (${g.anim} ${g.animD})`)
  await ctx.close()
}
await browser.close()
if (process.env.GIF) console.log('cuadros:', fotos.length)
if (fallas.length) { console.log('\nFALLAS:\n' + fallas.join('\n')); process.exit(1) } else console.log('\nTODO BIEN')
