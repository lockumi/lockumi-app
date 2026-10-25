// Cada estado del alquiler visto por los dos papeles (sesión inyectada, sin tocar la red).
import { test, expect, entrar, captura, ALQ } from './base'
test.describe('estados del alquiler', () => {
  test('inicio con la lista de alquileres', async ({ page, rol }) => {
    await entrar(page, rol, ALQ); await page.goto('/#/')
    await expect(page.getByText('Casa de prueba E2E').first()).toBeVisible(); await captura(page, 'estados', 'inicio', rol)
  })
  for (const a of ALQ) test('detalle ' + a.estado, async ({ page, rol }) => {
    const errores: string[] = []; page.on('pageerror', e => errores.push(e.message))
    await entrar(page, rol, ALQ); await page.goto('/#/alquiler/' + a.id)
    await expect(page.getByRole('heading', { name: 'Casa de prueba E2E' })).toBeVisible()
    await expect(page.getByText(rol === 'dueno' ? /dueño/i : /inquilino/i).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('No encontramos ese alquiler')
    await captura(page, 'estados', a.estado, rol); expect(errores).toEqual([])
  })
})
