// Paso 19 · Prueba de reputación con DOS cuentas (dueño + inquilino), cada una en su navegador. SOLO contra un build local o una
// vista previa con VITE_REPUTACION=1; nunca contra producción (app.lockumi.com no tiene la reputación y la prueba se salta sola).
// Uso: VITE_REPUTACION=1 npm run build && npx vite preview --port 4319 &
//      E2E_BASE=http://localhost:4319 E2E_CHROME=/usr/bin/google-chrome npx playwright test -c e2e reputacion --project=dueno
// Plan (docs/reputacion.md, «Prueba con dos cuentas»):
//   1. Los dos tienen los mismos 3 alquileres cerrados: uno limpio, uno con descuento justo y uno con reclamo indebido.
//   2. Inquilino: 5 + 3,75 + 5 → 4,6 (solo le baja el descuento). Dueño: 5 + 5 + 2,5 → 4,2 (solo le baja el reclamo indebido).
//   3. La reputación es OBLIGATORIA: al entrar, ninguna pantalla se puede usar hasta pasar la puerta de 3 pasos (nombre visible y cantón,
//      perfil de dueño con sus dos casillas, perfil de inquilino con las suyas). Sin las casillas, un error explica cómo seguir.
//   4. El puntaje se ve siempre desde el 3.er alquiler cerrado. No existen «Dejar de mostrar» ni «Mostrar mi puntaje».
//   5. El dueño aparece en Dueños destacados (opcional, una pantalla). El inquilino elimina su cuenta: ve el plazo de 5 días hábiles y sale.
//   6. La cuenta del dueño no cambia.
import { test, expect, type Browser, type Page } from '@playwright/test'
import { BASE } from '../playwright.config'

const DUENO = 'dueno@lockumi.com', INQUILINO = 'demo@lockumi.com', T = '2026-10-24T18:00:00Z', v16 = { version: '1.6-demo', fecha: T }
const acta = { cuartos: [{ nombre: 'Sala', items: [{ texto: 'Paredes', estado: 'bien' }], fotos: [], nota: '' }], firmas: { dueno: T, inquilino: T } }
const cerrado = (n: number, resultado: object, reclamo?: object) => ({ id: `00000000-0000-4000-8000-00000000010${n}`, direccion: `Casa de prueba ${n}`, monto: 20, moneda: 'USDC',
  inicio: '2026-01-01', fin: '2026-06-30', reglas: [], duenoEmail: DUENO, inquilinoEmail: INQUILINO, estado: 'cerrado', rendimiento: false, historial: [],
  contrato: { firmas: { dueno: T, inquilino: T } }, entrada: acta, salida: acta, diasSimulados: 0, ventanaInicio: T, resultado: { ...resultado, fecha: T },
  ...(reclamo ? { reclamo: { motivo: 'Prueba', fotos: [], fecha: T, ...reclamo } } : {}) })
const ALQ = [
  cerrado(1, { inquilino: 20, dueno: 0, via: 'acuerdo' }),
  cerrado(2, { inquilino: 15, dueno: 5, via: 'mediacion' }, { monto: 5 }),     // descuento justo: baja al inquilino, no al dueño
  cerrado(3, { inquilino: 20, dueno: 0, via: 'mediacion' }, { monto: 10 }),    // reclamo indebido (se devolvió todo): baja al dueño
]

async function cuenta(browser: Browser, email: string, rol: 'dueno' | 'inquilino'): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: BASE, locale: 'es-CR', timezoneId: 'America/Costa_Rica', viewport: { width: 420, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.evaluate(async ({ v16, ALQ, email, rol }) => {
    localStorage.clear()
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email, nombre: rol === 'dueno' ? 'Rodrigo' : 'Ana', metodo: 'correo', terminos: v16, privacidad: v16 }))
    localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v16)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v16))
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))
    localStorage.setItem('lockumi.recorrido.v1.' + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''), 'x')
    for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) localStorage.setItem(k, JSON.stringify(ALQ))
    localStorage.setItem('lockumi.vista', JSON.stringify(Object.fromEntries(ALQ.map(a => [a.id, rol]))))
  }, { v16, ALQ, email, rol })
  await page.reload()
  return page
}
async function pasarPuerta(page: Page, nombre: string) {
  await page.goto('/#/perfil/dueno')                                                                // cualquier ruta lleva a la puerta
  await expect(page.getByText('Paso 1 de 3')).toBeVisible()
  await expect(page.getByRole('button', { name: /Ahora no|sin activarlo|Saltar/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Escribe tu nombre y la inicial de tu apellido')).toBeVisible()      // el error dice cómo arreglarlo
  await page.getByLabel('Nombre visible').fill(nombre)
  await page.getByLabel('Tu cantón').selectOption('Escazú')
  await page.getByRole('button', { name: 'Continuar' }).click()
  for (const [paso, titulo] of [['Paso 2 de 3', 'Activar mi perfil público de dueño'], ['Paso 3 de 3', 'Activar mi perfil público de inquilino']]) {
    await expect(page.getByText(paso)).toBeVisible(); await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
    await page.getByRole('button', { name: 'Aceptar y continuar' }).click()
    await expect(page.getByText('Marca las dos casillas para continuar')).toBeVisible()
    await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Aceptar y continuar' }).click()
    await expect(page.getByText('Marca las dos casillas para continuar')).toBeVisible()             // con una sola tampoco
    for (const c of await page.getByRole('checkbox').all()) await c.check()
    await page.getByRole('button', { name: 'Aceptar y continuar' }).click()
  }
  await expect(page.getByText(/Paso \d de 3/)).toHaveCount(0)
}

test.describe('reputación con dos cuentas (local, nunca producción)', () => {
  test.skip(/app\.lockumi\.com/.test(BASE), 'La reputación está apagada en producción: esta prueba corre solo en local o en una vista previa.')
  test('dueño e inquilino', async ({ browser }) => {
    const dueno = await cuenta(browser, DUENO, 'dueno'), inq = await cuenta(browser, INQUILINO, 'inquilino')
    await pasarPuerta(dueno, 'Rodrigo S.'); await pasarPuerta(inq, 'Ana M.')
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible()          // solo le bajó el reclamo indebido
    await inq.goto('/#/perfil/inquilino'); await expect(inq.getByText('4,6 de 5').first()).toBeVisible()        // solo le bajó el descuento
    for (const p of [dueno, inq]) { await expect(p.getByText(/dejar de mostrar|mostrar mi puntaje/i)).toHaveCount(0); await expect(p.getByText('Tu perfil es público y fijo.')).toBeVisible() }
    // Vitrina opcional del dueño (3 alquileres cerrados → Dueños destacados).
    await dueno.getByRole('link', { name: 'Ver si quieres aparecer en la vitrina' }).click()
    await dueno.getByRole('button', { name: 'Activar', exact: true }).click(); await expect(dueno.getByText('Para aparecer, marca la casilla.')).toBeVisible()
    await dueno.getByRole('checkbox').check(); await dueno.getByRole('button', { name: 'Activar', exact: true }).click()
    await expect(dueno.getByText('Listo. Ya apareces en la vitrina de tu cantón.')).toBeVisible()
    // El inquilino elimina su cuenta.
    await inq.goto('/#/perfil/eliminar'); await expect(inq.getByText('5 días hábiles').first()).toBeVisible()
    await inq.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    await expect(inq.getByText('Listo. Eliminamos tu cuenta.')).toBeVisible(); await expect(inq.getByText(/Fecha límite:/)).toBeVisible()
    expect(await inq.evaluate(e => localStorage.getItem('lockumi.reputacion.v1.' + e), INQUILINO)).toBeNull()
    await inq.locator('main').getByRole('button', { name: 'Salir' }).click(); await expect(inq.getByRole('button', { name: /Entrar|Continuar/ }).first()).toBeVisible()
    // El dueño sigue igual.
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible(); await expect(dueno.getByText(/Paso \d de 3/)).toHaveCount(0)
  })
})
