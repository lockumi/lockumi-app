// Páginas públicas: entrada, Términos y Privacidad (edición vigente del módulo legal, sin texto fijo aquí), sin errores de consola.
import { test, expect, captura } from './base'
import { EDICION_REPUTACION } from '../../src/legal/version17'
test.describe('páginas públicas', () => {
  const paginas: ReadonlyArray<readonly [string, string, string | RegExp]> = [
    ['/', 'entrar', /Lockumi/],
    ['/terminos', 'terminos', EDICION_REPUTACION],
    ['/privacidad', 'privacidad', EDICION_REPUTACION],
  ]
  for (const [ruta, nombre, texto] of paginas)
    test(nombre, async ({ page, rol }) => {
      const errores: string[] = []; page.on('pageerror', e => errores.push(e.message))
      const r = await page.goto(ruta); expect(r?.status()).toBeLessThan(400)
      await expect(page.locator('body')).toContainText(texto)
      await captura(page, 'paginas', nombre, rol); expect(errores).toEqual([])
    })
})
