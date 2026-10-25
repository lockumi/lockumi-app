// Flujo publicado en la app: crear un alquiler de prueba y verlo con el papel del proyecto (sin depósito; el depósito real va en red.e2e.ts).
import { test, expect, entrar, captura } from './base'
test('crear alquiler de prueba', async ({ page, rol }) => {
  await entrar(page, rol); await page.goto('/#/crear')
  await page.locator('#f-direccion').fill('Casa E2E ' + rol)
  await page.locator('#f-monto').fill('2')
  // Fechas: el campo de texto del calendario (dd/mm/aaaa), el mismo que usa el autocompletado.
  const fecha = (dias: number) => { const d = new Date(Date.now() + dias * 86_400_000); return [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('/') + '/' + d.getFullYear() }
  for (const [id, v] of [['f-inicio', fecha(1)], ['f-fin', fecha(70)]]) await page.evaluate(([id, v]) => {
    const el = document.getElementById(id) as HTMLInputElement
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }))
  }, [id, v])
  // Con la prueba completa encendida, «Crear» pide aceptar el Anexo 6-A (B.5).
  const anexo = page.getByLabel('Leímos y aceptamos el Anexo 6-A.')
  if (await anexo.count()) await anexo.check()
  await captura(page, 'crear', 'formulario', rol)
  await page.getByRole('button', { name: /Crear alquiler/ }).click()
  await expect(page).toHaveURL(/#\/alquiler\//, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Casa E2E ' + rol })).toBeVisible()
  await captura(page, 'crear', 'creado', rol)
  // Cambiar a la otra pantalla y volver (modo de un solo aparato).
  const cambiar = page.getByRole('button', { name: /pantalla del dueño de prueba|Ver como/ })
  if (await cambiar.count()) { await cambiar.first().click(); await captura(page, 'crear', 'otra-pantalla', rol) }
})
