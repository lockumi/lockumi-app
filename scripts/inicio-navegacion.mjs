// Prueba de navegación de Inicio contra un servidor local (vite dev o preview).
// No apunta a producción: hace falta INICIO_BASE=http://127.0.0.1:PUERTO
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = process.env.INICIO_BASE
if (!base || /lockumi\.com|vercel\.app/i.test(base)) {
  console.error('Define INICIO_BASE con un servidor local. Este script no corre contra producción ni un preview público.')
  process.exit(1)
}
const out = process.env.INICIO_SHOTS || '/tmp/inicio-shots'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const filas = []
function fila(ancho, estado, accion, esperado, resultado, ok) {
  filas.push({ ancho, estado, accion, esperado, resultado, ok })
  console.log(`${ok ? 'OK' : 'FALLO'}\t${ancho}\t${estado}\t${accion}\t${esperado}\t${resultado}`)
}

async function preparar(page, alquileres) {
  await page.goto(base + '/')
  await page.evaluate(async (alquileres) => {
    localStorage.clear()
    const email = 'katherine@ejemplo.cr'
    const u = { email, nombre: 'Katherine', metodo: 'correo', terminos: { version: '1.6-demo', fecha: '2026-10-24T18:00:00Z' }, privacidad: { version: '1.6-demo', fecha: '2026-10-24T18:00:00Z' } }
    localStorage.setItem('lockumi.usuario', JSON.stringify(u))
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))
    localStorage.setItem('lockumi.recorrido.v1.' + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''), 'x')
    const json = alquileres === 'semilla' ? null : JSON.stringify(alquileres)
    for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) {
      if (json === null) localStorage.removeItem(k)
      else localStorage.setItem(k, json)
    }
  }, alquileres)
  await page.reload()
  await page.waitForSelector('main.casa')
}

function ruta(page) {
  const h = new URL(page.url()).hash.replace(/^#/, '') || '/'
  return h
}

async function clic(page, locator, esperado) {
  await locator.click()
  await page.waitForTimeout(250)
  const got = ruta(page)
  return { got, ok: got === esperado || got.startsWith(esperado) }
}

const anchos = [
  { w: 390, h: 844, nombre: '390' },
  { w: 1280, h: 900, nombre: '1280' },
]

for (const vp of anchos) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await preparar(page, 'semilla')
  const h1 = await page.locator('h1').innerText()
  fila(vp.nombre, 'con', 'datos en pantalla', 'nombre real y un alquiler', h1.replace(/\s+/g, ' '), /Katherine/.test(h1))

  let r = await clic(page, page.getByRole('link', { name: 'Continuar proceso' }), '/alquiler/')
  fila(vp.nombre, 'con', 'Continuar proceso', '/alquiler/{id}', r.got, r.ok && r.got !== '/alquiler/')
  await page.goto(base + '/#/')
  await page.waitForSelector('text=Continuar proceso')

  r = await clic(page, page.getByRole('link', { name: 'Ver todos' }), '/alquileres')
  fila(vp.nombre, 'con', 'Ver todos', '/alquileres', r.got, r.got === '/alquileres')
  await page.goto(base + '/#/')
  await page.waitForSelector('text=Continuar proceso')

  r = await clic(page, page.getByRole('link', { name: 'Nuevo alquiler' }), '/crear')
  fila(vp.nombre, 'con', 'Nuevo alquiler', '/crear', r.got, r.got === '/crear')
  await page.goto(base + '/#/')
  await page.waitForSelector('main.casa')

  const campana = page.locator('a.casa-campana')
  r = await clic(page, campana, '/avisos')
  fila(vp.nombre, 'con', 'Campana', '/avisos', r.got, r.got === '/avisos')
  await page.goto(base + '/#/')
  await page.waitForSelector('main.casa')

  const nav = page.locator('nav[aria-label="Secciones"]')
  for (const [texto, dest] of [['Inicio', '/'], ['Alquileres', '/alquileres'], ['Avisos', '/avisos'], ['Perfil', '/perfil']]) {
    r = await clic(page, nav.getByRole('link', { name: texto }), dest)
    fila(vp.nombre, 'con', `Barra ${texto}`, dest, r.got, r.got === dest)
    if (dest !== '/') { await page.goto(base + '/#/'); await page.waitForSelector('main.casa') }
  }

  if (vp.w >= 960) {
    r = await clic(page, page.getByRole('link', { name: 'Ayuda' }), '/ayuda')
    fila(vp.nombre, 'con', 'Ayuda (cabecera)', '/ayuda', r.got, r.got === '/ayuda')
    await page.goto(base + '/#/')
    await page.waitForSelector('main.casa')
    r = await clic(page, page.getByRole('link', { name: 'Cómo funciona' }), '/ayuda')
    fila(vp.nombre, 'con', 'Cómo funciona', '/ayuda', r.got, r.got === '/ayuda')
    await page.goto(base + '/#/')
    await page.waitForSelector('main.casa')
    await page.getByRole('button', { name: 'Salir' }).click()
    await page.waitForSelector('main.entrada-app')
    const enLogin = await page.getByRole('button', { name: 'Entrar' }).count() > 0
    fila(vp.nombre, 'con', 'Salir', 'pantalla de entrada', enLogin ? 'entrada' : ruta(page), enLogin)
    await preparar(page, 'semilla')
  } else {
    await page.goto(base + '/#/perfil')
    await page.locator('main').getByRole('button', { name: 'Salir' }).click()
    await page.waitForSelector('main.entrada-app')
    const enLogin = await page.getByRole('button', { name: 'Entrar' }).count() > 0
    fila(vp.nombre, 'con', 'Salir desde Perfil', 'pantalla de entrada', enLogin ? 'entrada' : ruta(page), enLogin)
  }

  await preparar(page, [])
  const tituloVacio = vp.w >= 960 ? 'Tu próximo hogar empieza aquí.' : 'Sin alquileres aún'
  const vacio = await page.locator('h1').filter({ visible: true }).innerText()
  fila(vp.nombre, 'vacio', 'estado vacío', tituloVacio, vacio, vacio.includes(tituloVacio))
  r = await clic(page, page.getByRole('link', { name: 'Nuevo alquiler' }), '/crear')
  fila(vp.nombre, 'vacio', 'Nuevo alquiler', '/crear', r.got, r.got === '/crear')
  await page.goto(base + '/#/')
  await page.waitForSelector('main.casa--vacio')
  if (vp.w >= 960) {
    const inv = page.getByRole('button', { name: 'Aceptar invitación' })
    const dis = await inv.isDisabled()
    const antes = ruta(page)
    fila(vp.nombre, 'vacio', 'Aceptar invitación', 'sin ruta: no navega', dis && antes === '/' ? 'deshabilitado, sigue en /' : ruta(page), dis && antes === '/')
    const cierre = await page.locator('.aviso-red button, .aviso-red [aria-label*="errar"], .aviso-red [aria-label*="Cerrar"]').count()
    fila(vp.nombre, 'vacio', 'X de la franja', 'no existe en la app', cierre === 0 ? 'no hay botón de cerrar' : 'hay botón', cierre === 0)
  } else {
    r = await clic(page, page.getByRole('link', { name: 'Cómo funciona' }), '/ayuda')
    fila(vp.nombre, 'vacio', 'Cómo funciona', '/ayuda', r.got, r.got === '/ayuda')
    await page.goto(base + '/#/')
    await page.waitForSelector('main.casa--vacio')
  }
  r = await clic(page, campana, '/avisos')
  fila(vp.nombre, 'vacio', 'Campana', '/avisos', r.got, r.got === '/avisos')
  await page.close()
}

// Capturas de presentación (con la semilla real y vacío) en los cuatro anchos.
const page = await browser.newPage()
for (const estado of ['con', 'vacio']) {
  for (const w of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: w < 800 ? 844 : 960 })
    await preparar(page, estado === 'vacio' ? [] : 'semilla')
    await page.screenshot({ path: `${out}/${estado}-${w}.png` })
  }
}
await browser.close()
writeFileSync(out + '/navegacion.json', JSON.stringify(filas, null, 2))
const mal = filas.filter(f => !f.ok)
if (mal.length) {
  console.error(mal.length + ' acciones no llegaron a su destino')
  process.exit(1)
}
console.log('Todas las acciones llegaron. Capturas en ' + out)
