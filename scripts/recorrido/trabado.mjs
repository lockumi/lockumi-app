// Recorrido de primera vez con una cuenta 1.13-demo sin nombre ni cantón (26/10): los 6 pasos sin trabarse. Uso: BASE=https://app.lockumi.com/ node scripts/recorrido/trabado.mjs
import { chromium } from 'playwright'
const B = process.env.BASE || 'https://app.lockumi.com/'
const V = process.env.V || '1.13-demo'
const b = await chromium.launch({ args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-CR', serviceWorkers: 'block' })
const T = new Date().toISOString(), v = { version: V, fecha: T }
await ctx.addInitScript(({ v }) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear()
  const u = { email: 'recorrido.e2e@lockumi.com', nombre: 'Rec', metodo: 'correo', terminos: v, privacidad: v }
  localStorage.setItem('lockumi.usuario', JSON.stringify(u)); localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v)) } }, { v })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 150)) })
await p.goto(B)
const tit = () => p.evaluate(() => document.querySelector('.driver-popover .driver-popover-title')?.textContent ?? null)
for (let i = 0; i < 7; i++) {
  await p.waitForTimeout(2500)
  const t = await tit(); const info = await p.evaluate(() => ({ h: location.hash, act: document.querySelector('.driver-active-element')?.tagName ?? null, main: document.querySelector('main')?.innerText?.slice(0, 120).replace(/\n/g, ' | ') }))
  console.log(i, JSON.stringify(t), JSON.stringify(info))
  if (!t) break
  const n = p.locator('.driver-popover-next-btn'); if (!(await n.count())) { console.log('sin botón siguiente'); break }
  await n.click({ timeout: 3000 }).catch(e => console.log('click falla', e.message.slice(0, 100)))
}
console.log('errores', errs.slice(0, 5)); await b.close()
