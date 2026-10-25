// Pedido de Katherine (24/10, 10:03 p. m.): sin pantalla de volver a aceptar. Quien aceptó una versión anterior entra directo a la app.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const { readFileSync } = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 })
vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
vi.stubGlobal('location', { hash: '#/', pathname: '/', search: '', href: 'http://localhost/' })
// Inicio usa el almacén del navegador (sin render en servidor): aquí basta saber que se llega a Inicio.
vi.mock('../../screens/Inicio', () => ({ Inicio: () => <main>INICIO-DE-LA-APP</main> }))
const { guardarAceptacion, K_ACEPTACION } = await import('../aceptacion')
const { TITULO_REACEPTACION } = await import('../Reaceptacion')
const { TERMINOS } = await import('../documentos')
const { default: App } = await import('../../App')
const { Login } = await import('../../screens/Login')
beforeEach(() => mem.clear())
const v15 = { version: '1.5-demo', fecha: '2026-10-20T15:00:00.000Z' }
describe('sin pantalla de volver a aceptar', () => {
  it('con 1.5-demo aceptado y la sesión abierta, entra directo a la app (sin «Actualizamos los Términos…»)', () => {
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    mem.set('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'demo', metodo: 'correo', terminos: v15, privacidad: v15 }))
    const html = renderToStaticMarkup(<App />)
    expect(html).not.toContain(TITULO_REACEPTACION); expect(html).not.toContain('Aceptar y seguir')
    expect(html).toContain('INICIO-DE-LA-APP'); expect(html).toContain('demo@lockumi.com')
    expect(JSON.parse(mem.get(K_ACEPTACION.terminos)!).version).toBe('1.5-demo')   // no se cambia la aceptación guardada
  })
  it('App.tsx ya no usa la pantalla', () => {
    expect(readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')).not.toMatch(/Reaceptacion|necesitaReaceptar/)
  })
  it('una cuenta nueva sigue aceptando en Entrar y queda 1.6-demo', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toContain('Acepto los'); expect(html).toContain('href="/terminos"')
    const login = readFileSync(new URL('../../screens/Login.tsx', import.meta.url), 'utf8')
    expect(login).toContain("terminos: terminosActual().version"); expect(login).toContain('guardarAceptacion(c, VERSION[c])')
    expect(TERMINOS.version).toBe('1.6-demo')
  })
})
