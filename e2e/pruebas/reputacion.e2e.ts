// Paso 19 · Prueba de reputación con DOS cuentas (dueño + inquilino), cada una en su navegador. SOLO contra un build local o una
// vista previa con VITE_REPUTACION=1; nunca contra producción (app.lockumi.com no tiene la reputación y la prueba se salta sola).
// Uso: VITE_REPUTACION=1 npm run build && npx vite preview --port 4319 &
//      E2E_BASE=http://localhost:4319 E2E_CHROME=/usr/bin/google-chrome npx playwright test -c e2e reputacion --project=dueno
// Plan (docs/reputacion.md, «Prueba con dos cuentas»):
//   1. Los dos tienen los mismos 3 alquileres cerrados: uno limpio, uno con descuento justo y uno con reclamo indebido.
//   2. Inquilino: 5 + 3,75 + 5 → 4,6 (solo le baja el descuento). Dueño: 5 + 5 + 2,5 → 4,2 (solo le baja el reclamo indebido).
//   3. Dueño = cuenta NUEVA: REP-01 aparece ANTES del login, en una pantalla aparte; [Continuar] sigue desactivado hasta marcar las dos
//      casillas (REP-01 y REP-01b). Después se ve el login de siempre; al entrar, la aceptación pasa a la cuenta y falta el nombre y el cantón.
//   4. Inquilino = cuenta 1.7-demo SIN REP-01: al entrar ve REP-13; con «Ahora no» sus alquileres siguen igual, pero «+ Nuevo alquiler»
//      muestra la tarjeta de bloqueo con [Ver y aceptar], que abre REP-01.
//   5. El puntaje se ve siempre desde el 3.er alquiler cerrado. No existen «Dejar de mostrar» ni «Mostrar mi puntaje».
//   6. El inquilino pide revisar un alquiler: acuse con fecha y hora, y su puntaje dice «En revisión».
//   7. El dueño aparece en Dueños destacados (opcional). El inquilino elimina su cuenta: plazo de 5 días hábiles; al salir, REP-01 otra vez.
//   8. La cuenta del dueño no cambia.
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

const BLOQUEO = 'Para crear o unirte a un alquiler nuevo, primero acepta tu perfil de reputación. Tus alquileres abiertos siguen funcionando igual.'
async function cuenta(browser: Browser, email: string, rol: 'dueno' | 'inquilino', conSesion: boolean): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: BASE, locale: 'es-CR', timezoneId: 'America/Costa_Rica', viewport: { width: 420, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.evaluate(async ({ v16, ALQ, email, rol, conSesion }) => {
    localStorage.clear()
    if (conSesion) entrar(email, rol, v16)
    localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v16)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v16))
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))
    localStorage.setItem('lockumi.recorrido.v1.' + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''), 'x')
    for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) localStorage.setItem(k, JSON.stringify(ALQ))
    localStorage.setItem('lockumi.vista', JSON.stringify(Object.fromEntries(ALQ.map(a => [a.id, rol]))))
    function entrar(email: string, rol: string, v16: object) { localStorage.setItem('lockumi.usuario', JSON.stringify({ email, nombre: rol === 'dueno' ? 'Rodrigo' : 'Ana', metodo: 'correo', terminos: v16, privacidad: v16 })) }
  }, { v16, ALQ, email, rol, conSesion })
  await page.reload()
  return page
}
/** REP-01: dos casillas sin marcar; [Continuar] desactivado hasta marcar las dos. */
async function aceptarRep01(page: Page) {
  await expect(page.getByRole('heading', { name: 'Antes de crear tu cuenta: tu perfil de reputación' })).toBeVisible()
  const continuar = page.getByRole('button', { name: 'Continuar', exact: true })
  await expect(continuar).toBeDisabled(); await expect(page.getByText('Marca las dos casillas para continuar.')).toBeVisible()
  const [rep01, edad] = await page.getByRole('checkbox').all()
  await expect(rep01!).not.toBeChecked(); await expect(edad!).not.toBeChecked()
  await rep01!.check(); await expect(continuar).toBeDisabled()                                      // con una sola tampoco
  await edad!.check(); await expect(continuar).toBeEnabled(); await continuar.click()
}
/** Último paso: nombre visible y cantón; el error dice cómo arreglarlo. */
async function datos(page: Page, nombre: string) {
  await expect(page.getByRole('heading', { name: '¿Cómo te verán?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Escribe tu nombre y la inicial de tu apellido')).toBeVisible()
  await page.getByLabel('Nombre visible').fill(nombre); await page.getByLabel('Tu cantón').selectOption('Escazú')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo te verán?' })).toHaveCount(0)
}

test.describe('reputación con dos cuentas (local, nunca producción)', () => {
  test.skip(/app\.lockumi\.com/.test(BASE), 'La reputación está apagada en producción: esta prueba corre solo en local o en una vista previa.')
  test('dueño e inquilino', async ({ browser }) => {
    // Dueño: cuenta nueva. REP-01 antes del login (el login no cambia).
    const dueno = await cuenta(browser, DUENO, 'dueno', false)
    await dueno.getByRole('button', { name: 'Ver un ejemplo de perfil' }).click(); await expect(dueno.getByText('Ana M.').first()).toBeVisible()
    await dueno.getByRole('button', { name: 'Volver' }).click()
    await aceptarRep01(dueno)
    await expect(dueno.getByRole('heading', { name: 'Antes de crear tu cuenta: tu perfil de reputación' })).toHaveCount(0)
    expect(await dueno.evaluate(() => JSON.parse(localStorage.getItem('lockumi.reputacion.previa.v1')!).hora)).toMatch(/^\d\d:\d\d$/)
    await dueno.evaluate(({ DUENO, v16 }) => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: DUENO, nombre: 'Rodrigo', metodo: 'correo', terminos: v16, privacidad: v16 })), { DUENO, v16 })
    await dueno.reload()                                                                              // entra como siempre
    await datos(dueno, 'Rodrigo S.')
    expect(await dueno.evaluate(e => JSON.parse(localStorage.getItem('lockumi.reputacion.v1.' + e)!).rep01.version, DUENO)).toContain('reputacion-1.0-demo')
    // Inquilino: cuenta 1.7-demo sin REP-01.
    const inq = await cuenta(browser, INQUILINO, 'inquilino', true)
    await expect(inq.getByText(/Actualizamos el Aviso de privacidad \(1\.8-demo\)/)).toBeVisible()
    await inq.getByRole('button', { name: 'Ahora no' }).click()
    await expect(inq.getByText('Casa de prueba 1').first()).toBeVisible()                             // sus alquileres siguen igual
    await inq.goto('/#/crear'); await expect(inq.getByText(BLOQUEO)).toBeVisible()
    await inq.getByRole('link', { name: 'Ver y aceptar' }).click()
    await aceptarRep01(inq); await datos(inq, 'Ana M.')
    await inq.goto('/#/crear'); await expect(inq.getByText(BLOQUEO)).toHaveCount(0)
    // Puntajes.
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible()          // solo le bajó el reclamo indebido
    await inq.goto('/#/perfil/inquilino'); await expect(inq.getByText('4,6 de 5').first()).toBeVisible()        // solo le bajó el descuento
    for (const p of [dueno, inq]) { await expect(p.getByText(/dejar de mostrar|mostrar mi puntaje/i)).toHaveCount(0); await expect(p.getByText('Tu perfil es público y fijo.')).toBeVisible()
      await expect(p.locator('meta[name="robots"][content="noindex, nofollow"]')).toHaveCount(1) }   // además del noindex de index.html
    // Revisión pedida por el inquilino: acuse y «En revisión».
    await inq.goto('/#/perfil/revision'); await inq.getByRole('button', { name: 'Pedir revisión' }).click()
    await expect(inq.getByText('Elige el alquiler que quieres que revisemos.')).toBeVisible()
    await inq.getByLabel('Alquiler', { exact: true }).selectOption({ label: 'Casa de prueba 2 · Inquilino' }); await inq.getByLabel('Qué está mal').fill('El descuento no corresponde.')
    await inq.getByRole('button', { name: 'Pedir revisión' }).click(); await expect(inq.getByText(/Recibimos tu pedido el .* a las \d\d:\d\d/)).toBeVisible()
    await inq.goto('/#/perfil/inquilino'); await expect(inq.getByText('En revisión').first()).toBeVisible()
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
    await inq.locator('main').getByRole('button', { name: 'Salir' }).click()
    await expect(inq.getByRole('heading', { name: 'Antes de crear tu cuenta: tu perfil de reputación' })).toBeVisible()
    // El dueño sigue igual.
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible()
  })
})
