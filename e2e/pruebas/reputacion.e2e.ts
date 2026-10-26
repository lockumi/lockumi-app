// Paso 19 · Prueba de reputación con DOS cuentas (dueño + inquilino), cada una en su navegador. SOLO contra un build local o una
// vista previa con VITE_REPUTACION=1; nunca contra producción (app.lockumi.com no tiene la reputación y la prueba se salta sola).
// Uso: VITE_REPUTACION=1 npm run build && npx vite preview --port 4319 &
//      E2E_BASE=http://localhost:4319 E2E_CHROME=/usr/bin/google-chrome npx playwright test -c e2e reputacion --project=dueno
// Plan (docs/reputacion.md, «Prueba con dos cuentas»):
//   1. Dueño e inquilino tienen los mismos 3 alquileres cerrados: uno limpio, uno con descuento justo y uno con reclamo indebido.
//   2. Inquilino: 5 + 3,75 + 5 → 4,6 (solo le baja el descuento). Dueño: 5 + 5 + 2,5 → 4,2 (solo le baja el reclamo indebido).
//   3. Los dos son cuentas NUEVAS: REP-01 aparece ANTES del login, en una pantalla aparte; [Continuar] sigue desactivado hasta marcar las dos
//      casillas (REP-01 y REP-01b). Después se ve el login de siempre; al entrar, la aceptación pasa a la cuenta y falta el nombre y el cantón.
//   4. Cuenta ANTERIOR (sin REP-01, Coordinador 25/10): «Ya tengo cuenta: entrar» abre el login; adentro, la app de siempre: sin aviso, sin
//      tarjeta de bloqueo, sin «Tu perfil en Lockumi» y puede crear alquileres. Su alquiler con el dueño no cuenta para ninguno (Legal, 25/10).
//   5. El puntaje se ve siempre desde el 3.er alquiler cerrado. No existen «Dejar de mostrar» ni «Mostrar mi puntaje».
//   6. El inquilino pide revisar un alquiler: acuse con fecha y hora, y su puntaje dice «En revisión».
//   7. El dueño aparece en Dueños destacados (opcional). El inquilino elimina su cuenta: plazo de 5 días hábiles; al salir, REP-01 otra vez.
//   8. Con un alquiler abierto, el dueño pide eliminar su cuenta: confirmación, perfil oculto, nada borrado y ya no puede crear alquileres nuevos.
// Demo: cada navegador guarda solo lo suyo, así que el REP-01 de la otra parte se siembra (en el servidor, lk_cuenta_para_reputacion).
import { test, expect, type Browser, type Page } from '@playwright/test'
import { BASE } from '../playwright.config'

const DUENO = 'dueno@lockumi.com', INQUILINO = 'demo@lockumi.com', VIEJA = 'vieja@lockumi.com', T = '2026-10-24T18:00:00Z', v16 = { version: '1.6-demo', fecha: T }
const acta = { cuartos: [{ nombre: 'Sala', items: [{ texto: 'Paredes', estado: 'bien' }], fotos: [], nota: '' }], firmas: { dueno: T, inquilino: T } }
const cerrado = (n: number, resultado: object, reclamo?: object, inquilino = INQUILINO) => ({ id: `00000000-0000-4000-8000-00000000010${n}`, direccion: `Casa de prueba ${n}`, monto: 20, moneda: 'USDC',
  inicio: '2026-01-01', fin: '2026-06-30', reglas: [], duenoEmail: DUENO, inquilinoEmail: inquilino, estado: 'cerrado', rendimiento: false, historial: [],
  contrato: { firmas: { dueno: T, inquilino: T } }, entrada: acta, salida: acta, diasSimulados: 0, ventanaInicio: T, resultado: { ...resultado, fecha: T },
  ...(reclamo ? { reclamo: { motivo: 'Prueba', fotos: [], fecha: T, ...reclamo } } : {}) })
const ALQ = [
  cerrado(1, { inquilino: 20, dueno: 0, via: 'acuerdo' }),
  cerrado(2, { inquilino: 15, dueno: 5, via: 'mediacion' }, { monto: 5 }),     // descuento justo: baja al inquilino, no al dueño
  cerrado(3, { inquilino: 20, dueno: 0, via: 'mediacion' }, { monto: 10 }),    // reclamo indebido (se devolvió todo): baja al dueño
]
// Con la cuenta anterior: otro reclamo indebido que, si contara, le bajaría el puntaje al dueño. No cuenta (Legal, 25/10).
const CON_VIEJA = cerrado(4, { inquilino: 20, dueno: 0, via: 'mediacion' }, { monto: 10 }, VIEJA)
const BORRADO = 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.'
const HORA = /\d{1,2}:\d\d\s[ap]\.\sm\./

async function cuenta(browser: Browser, email: string, rol: 'dueno' | 'inquilino', conSesion: boolean, alq: object[] = ALQ): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: BASE, locale: 'es-CR', timezoneId: 'America/Costa_Rica', viewport: { width: 420, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.evaluate(async ({ v16, ALQ, email, rol, conSesion }) => {   // ALQ: los alquileres de esta cuenta
    localStorage.clear()
    if (conSesion) entrar(email, rol, v16)
    localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v16)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v16))
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))
    localStorage.setItem('lockumi.recorrido.v1.' + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''), 'x')
    for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) localStorage.setItem(k, JSON.stringify(ALQ))
    localStorage.setItem('lockumi.vista', JSON.stringify(Object.fromEntries(ALQ.map(a => [a.id, rol]))))
    function entrar(email: string, rol: string, v16: object) { localStorage.setItem('lockumi.usuario', JSON.stringify({ email, nombre: rol === 'dueno' ? 'Rodrigo' : 'Ana', metodo: 'correo', terminos: v16, privacidad: v16 })) }
  }, { v16, ALQ: alq, email, rol, conSesion })
  await page.reload()
  return page
}
/** 1.13-demo (Legal, 26/10/2026): sin pantalla previa; la pantalla de inicio de siempre con la casilla de los Términos que nombra el perfil. */
async function aceptarRep01(page: Page) {
  await expect(page.getByRole('heading', { name: /Antes de crear tu cuenta/ })).toHaveCount(0)
  const c = page.getByRole('checkbox', { name: /Acepto los Términos 1\.13-demo, incluido mi perfil de reputación público\./ })
  await expect(c).toBeVisible(); await expect(c).not.toBeChecked()
  await expect(page.getByText('Tu cuenta incluye un perfil público y fijo que cualquiera con el enlace puede ver', { exact: false })).toBeVisible()
}
/** Entra como siempre (la sesión de la demo) y, si es nueva, completa el último paso; después llegan sus alquileres y el REP-01 de la otra parte. */
async function entrarNueva(page: Page, email: string, nombre: string, rol: 'dueno' | 'inquilino', alq: object[], otra: string) {
  // Entró aceptando los Términos 1.13-demo (la casilla nombra el perfil): se registra al entrar; nombre y cantón, al crear el primer alquiler.
  await page.evaluate(({ email, nombre, v16 }) => localStorage.setItem('lockumi.usuario', JSON.stringify({ email, nombre, metodo: 'correo', terminos: { ...v16, version: '1.13-demo' }, privacidad: v16 })), { email, nombre: nombre.split(' ')[0], v16 })
  await page.reload(); await expect(page.getByRole('heading', { name: '¿Cómo te verán?' })).toHaveCount(0)
  await page.goto('/#/crear'); await datos(page, nombre)
  await page.evaluate(({ alq, rol, otra, T, email }) => {
    const k = 'lockumi.reputacion.v1.' + email, yo = JSON.parse(localStorage.getItem(k)!); yo.rep01.fecha = T; localStorage.setItem(k, JSON.stringify(yo))   // los alquileres de ejemplo cerraron después
 for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) localStorage.setItem(k, JSON.stringify(alq))
    localStorage.setItem('lockumi.vista', JSON.stringify(Object.fromEntries(alq.map((a: { id: string }) => [a.id, rol]))))
    localStorage.setItem('lockumi.reputacion.v1.' + otra, JSON.stringify({ rep01: { version: '1.10-demo', fecha: T, texto: [] }, roles: { dueno: {}, inquilino: {} } })) }, { alq, rol, otra, T, email })
  await page.goto('/#/')
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
    const dueno = await cuenta(browser, DUENO, 'dueno', false, [])
    await aceptarRep01(dueno)
    expect(await dueno.evaluate(() => Object.keys(localStorage).filter(k => k.includes('previa')))).toEqual([])
    await entrarNueva(dueno, DUENO, 'Rodrigo S.', 'dueno', [...ALQ, CON_VIEJA], INQUILINO)
    expect(await dueno.evaluate(e => JSON.parse(localStorage.getItem('lockumi.reputacion.v1.' + e)!).rep01.version, DUENO)).toMatch(/^1\.13-demo · /)
    expect(await dueno.evaluate(e => JSON.parse(localStorage.getItem('lockumi.reputacion.v1.' + e)!).rep01.hora, DUENO)).toMatch(HORA)
    await dueno.goto('/#/'); await expect(dueno.getByText('Tu perfil en Lockumi')).toBeVisible()
    // Inquilino: también cuenta nueva (nombre compuesto).
    const inq = await cuenta(browser, INQUILINO, 'inquilino', false, [])
    await aceptarRep01(inq); await entrarNueva(inq, INQUILINO, 'Ana María M.', 'inquilino', ALQ, DUENO)
    // Cuenta anterior (sin REP-01): «Ya tengo cuenta: entrar» abre el login y adentro todo sigue como antes, sin pantallas extra.
    const vieja = await cuenta(browser, VIEJA, 'inquilino', false, [CON_VIEJA])
    await expect(vieja.getByRole('heading', { name: 'El depósito de tu alquiler, protegido' })).toBeVisible()          // el login de siempre
    expect(await vieja.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(k => k.includes('previa')))).toEqual([])
    await vieja.evaluate(({ VIEJA, v16 }) => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: VIEJA, nombre: 'Lucía', metodo: 'correo', terminos: v16, privacidad: v16 })), { VIEJA, v16 })
    await vieja.reload()                                                                               // entra como siempre
    await expect(vieja.getByText('Casa de prueba 4').first()).toBeVisible()
    await expect(vieja.getByText(/Actualizamos los Términos|Ver y aceptar|Tu perfil en Lockumi/)).toHaveCount(0)
    await vieja.goto('/#/crear'); await expect(vieja.getByText(BORRADO)).toHaveCount(0); await expect(vieja.getByRole('checkbox', { name: /1\.10-demo/ })).toHaveCount(0)
    await expect(vieja.getByRole('heading', { name: /Antes de/ })).toHaveCount(0)
    expect(await vieja.evaluate(e => localStorage.getItem('lockumi.reputacion.v1.' + e), VIEJA)).toBeNull()
    // Sin REP-01 y sin alquileres (entró por «Ya tengo cuenta: entrar»): antes de crear, la pantalla previa de siempre (Legal, 3:47 p. m.).
    const SIN = 'sin-alquileres@lockumi.com', sin = await cuenta(browser, SIN, 'dueno', false, [])
    await sin.evaluate(({ SIN, v16 }) => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: SIN, nombre: 'Ejemplo', metodo: 'correo', terminos: v16, privacidad: v16 })), { SIN, v16 })
    await sin.reload(); await sin.goto('/#/crear')
    // Opción (b) (Katherine, 26/10): la casilla del perfil dentro de «Nuevo alquiler», sin pantalla aparte; [Crear] espera a que la marque.
    await expect(sin.getByRole('heading', { name: /Antes de/ })).toHaveCount(0)
    await expect(sin.getByRole('checkbox', { name: /Términos 1\.13-demo, incluido mi perfil/ })).not.toBeChecked()
    // Puntajes.
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible()          // solo le bajó el reclamo indebido (no el de la cuenta anterior)
    await inq.goto('/#/perfil/inquilino'); await expect(inq.getByText('4,6 de 5').first()).toBeVisible()        // solo le bajó el descuento
    for (const p of [dueno, inq]) { await expect(p.getByText(/dejar de mostrar|mostrar mi puntaje/i)).toHaveCount(0); await expect(p.getByText('Tu perfil es público y fijo.')).toBeVisible()
      await expect(p.locator('meta[name="robots"][content="noindex, nofollow"]')).toHaveCount(1) }   // además del noindex de index.html
    // Revisión pedida por el inquilino: acuse y «En revisión».
    await inq.goto('/#/perfil/revision'); await inq.getByRole('button', { name: 'Pedir revisión' }).click()
    await expect(inq.getByText('Elige el alquiler que quieres que revisemos.')).toBeVisible()
    await inq.getByLabel('Alquiler', { exact: true }).selectOption({ label: 'Casa de prueba 2 · Inquilino' }); await inq.getByLabel('Qué está mal').fill('El descuento no corresponde.')
    await inq.getByRole('button', { name: 'Pedir revisión' }).click(); await expect(inq.getByText(/Recibimos tu pedido el .* a las \d{1,2}:\d\d\s[ap]\.\sm\./)).toBeVisible()
    await inq.goto('/#/perfil/inquilino'); await expect(inq.getByText('En revisión').first()).toBeVisible()
    await expect(inq.getByText('Pediste una revisión. Mientras la revisamos, tu puntaje público dice «En revisión».')).toBeVisible()
    // Vitrina opcional del dueño (3 alquileres cerrados → Dueños destacados).
    await dueno.getByRole('link', { name: 'Ver si quieres aparecer en la vitrina' }).click()
    await dueno.getByRole('button', { name: 'Activar', exact: true }).click(); await expect(dueno.getByText('Para aparecer, marca la casilla.')).toBeVisible()
    await dueno.getByRole('checkbox').check(); await dueno.getByRole('button', { name: 'Activar', exact: true }).click()
    await expect(dueno.getByText('Listo. Ya apareces en la vitrina de tu cantón.')).toBeVisible()
    // El inquilino elimina su cuenta.
    await inq.goto('/#/perfil/eliminar'); await expect(inq.getByText('5 días hábiles').first()).toBeVisible()
    await inq.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    await expect(inq.getByText('Listo. Pediste eliminar tu cuenta: tu perfil ya no se muestra y la eliminamos en un máximo de 5 días hábiles.')).toBeVisible(); await expect(inq.getByText(/Fecha límite:/)).toBeVisible()
    expect(await inq.evaluate(e => localStorage.getItem('lockumi.reputacion.v1.' + e), INQUILINO)).toBeNull()
    await inq.locator('main').getByRole('button', { name: 'Salir' }).click()
    await aceptarRep01(inq)
    // El dueño sigue igual.
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('4,2 de 5').first()).toBeVisible()
    // El dueño, con un alquiler ABIERTO, elimina su cuenta: confirmación, [Cancelar] vuelve; al pedirlo, el perfil se oculta y no se borra nada.
    await dueno.evaluate(() => { for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) {
      const xs = JSON.parse(localStorage.getItem(k)!); xs.push({ ...xs[0], id: '00000000-0000-4000-8000-000000000109', direccion: 'Casa abierta', estado: 'en_curso', resultado: undefined })
      localStorage.setItem(k, JSON.stringify(xs)) } })
    await dueno.goto('/#/perfil/eliminar'); await dueno.reload()
    await expect(dueno.getByText('Si tienes un alquiler abierto', { exact: false }).first()).toBeVisible()
    await dueno.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    const CONFIRMAR = 'Tienes un alquiler abierto. Tu perfil dejará de mostrarse ahora y tu cuenta se eliminará cuando el alquiler se cierre. Esta solicitud no se puede deshacer.'
    await expect(dueno.getByRole('alertdialog')).toContainText(CONFIRMAR)
    await dueno.getByRole('link', { name: 'Cancelar' }).click(); await expect(dueno.getByRole('alertdialog')).toHaveCount(0)
    expect(await dueno.evaluate(e => localStorage.getItem('lockumi.borrado.v1.' + e), DUENO)).toBeNull()
    await dueno.getByRole('button', { name: 'Eliminar mi cuenta' }).click(); await dueno.getByRole('alertdialog').getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    await expect(dueno.getByText('Listo. Tu perfil ya no se muestra.')).toBeVisible(); await expect(dueno.getByText(/Lo pediste el .* a las \d{1,2}:\d\d\s[ap]\.\sm\. \(hora de Costa Rica\)\./)).toBeVisible()
    expect(await dueno.evaluate(e => localStorage.getItem('lockumi.reputacion.v1.' + e), DUENO)).not.toBeNull()   // nada se borra mientras siga abierto
    await dueno.goto('/#/perfil/dueno'); await expect(dueno.getByText('Ya pediste eliminar tu cuenta').first()).toBeVisible(); await expect(dueno.getByText('4,2 de 5')).toHaveCount(0)
    await dueno.goto('/#/'); await expect(dueno.getByText('Casa abierta').first()).toBeVisible()        // puede cerrar su alquiler
    await dueno.goto('/#/crear'); await expect(dueno.getByText(BORRADO)).toBeVisible()                   // pero no crear uno nuevo (Legal, d)
    await expect(dueno.getByRole('link', { name: '← Tus alquileres' })).toBeVisible()
  })
})
