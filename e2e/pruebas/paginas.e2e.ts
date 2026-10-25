// Páginas públicas: entrada, Términos y Privacidad (versión vigente: 1.7-demo desde que se encendió la prueba completa; si se revierte el encendido, revertir también este cambio), sin errores de consola.
import { test, expect, captura } from './base'
test.describe('páginas públicas', () => {
  for (const [ruta, nombre, texto] of [['/', 'entrar', /Lockumi/], ['/terminos', 'terminos', /1\.7-demo · 25 de octubre de 2026/], ['/privacidad', 'privacidad', /1\.7-demo · 25 de octubre de 2026/]] as const)
    test(nombre, async ({ page, rol }) => {
      const errores: string[] = []; page.on('pageerror', e => errores.push(e.message))
      const r = await page.goto(ruta); expect(r?.status()).toBeLessThan(400)
      await expect(page.locator('body')).toContainText(texto)
      await captura(page, 'paginas', nombre, rol); expect(errores).toEqual([])
    })
})
