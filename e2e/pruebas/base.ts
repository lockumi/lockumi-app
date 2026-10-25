// Fixtures: sesión inyectada en localStorage (`lockumi.usuario`), alquileres de ejemplo y el papel del proyecto.
import { test as t, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
export type Rol = 'inquilino' | 'dueno'
export const EMAIL = 'demo@lockumi.com'
const T = '2026-10-24T18:00:00Z', v16 = { version: '1.6-demo', fecha: T }
const acta = (f: boolean) => ({ cuartos: [{ nombre: 'Sala', items: [{ texto: 'Paredes', estado: 'bien' }], fotos: [], nota: '' }], firmas: f ? { dueno: T, inquilino: T } : {} })
const alq = (id: string, estado: string, x: object = {}) => ({ id, direccion: 'Casa de prueba E2E', monto: 20, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-30', reglas: [], duenoEmail: 'dueno@lockumi.com', inquilinoEmail: EMAIL, estado, rendimiento: false, historial: [{ fecha: T, texto: 'Alquiler creado' }], contrato: { firmas: { dueno: T, inquilino: T } }, entrada: acta(true), diasSimulados: 0, ...x })
export const ALQ = [
  alq('00000000-0000-4000-8000-000000000000', 'firmas', { contrato: { firmas: {} }, entrada: acta(false) }),
  alq('11111111-1111-4111-8111-111111111111', 'en_curso'),
  alq('22222222-2222-4222-8222-222222222222', 'ventana_reclamo', { salida: acta(true), ventanaInicio: T }),
  alq('33333333-3333-4333-8333-333333333333', 'reclamo', { salida: acta(true), ventanaInicio: T, reclamo: { monto: 5, motivo: 'Pared manchada', fotos: [], fecha: T } }),
  alq('44444444-4444-4444-8444-444444444444', 'mediacion', { salida: acta(true), ventanaInicio: T, reclamo: { monto: 5, motivo: 'Pared manchada', fotos: [], fecha: T, respuesta: 'rechazado' } }),
  alq('55555555-5555-4555-8555-555555555555', 'cerrado', { salida: acta(true), ventanaInicio: T, resultado: { inquilino: 15, dueno: 5, via: 'mediacion', fecha: T } }),
]
export async function entrar(page: Page, rol: Rol, alquileres: object[] = []) {
  await page.goto('/')
  await page.evaluate(async ({ v16, alquileres, rol, email }) => {
    localStorage.clear()
    const u = { email, nombre: 'demo', metodo: 'correo', terminos: v16, privacidad: v16 }
    localStorage.setItem('lockumi.usuario', JSON.stringify(u))
    localStorage.setItem('lockumi.terminos.aceptacion', JSON.stringify(v16)); localStorage.setItem('lockumi.privacidad.consentimiento', JSON.stringify(v16))
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))
    localStorage.setItem('lockumi.recorrido.v1.' + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''), 'x')
    for (const k of ['lockumi.alquileres.prueba.v2', 'lockumi.alquileres.v3', 'lockumi.alquileres.testnet.v1']) localStorage.setItem(k, JSON.stringify(alquileres))
    localStorage.setItem('lockumi.vista', JSON.stringify(Object.fromEntries((alquileres as { id: string }[]).map(a => [a.id, rol]))))
  }, { v16, alquileres, rol, email: EMAIL })
  await page.reload()
}
/** Captura con nombre en capturas/<bloque>/<papel>-<nombre>.png (además de las del reporte). */
export async function captura(page: Page, bloque: string, nombre: string, rol: Rol) {
  mkdirSync(`capturas/${bloque}`, { recursive: true })
  await page.screenshot({ path: `capturas/${bloque}/${rol}-${nombre}.png`, fullPage: true })
}
export const test = t.extend<{ rol: Rol }>({ rol: ['inquilino', { option: true }] })
export { expect }
