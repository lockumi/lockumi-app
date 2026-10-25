import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { guardarAceptacion, K_ACEPTACION } = await import('../aceptacion')
const { TERMINOS, PRIVACIDAD, CONSENTIMIENTO_PRIVACIDAD } = await import('../documentos')
const { necesitaReaceptar, aceptarVersiones, Reaceptacion, TITULO_REACEPTACION } = await import('../Reaceptacion')
const { Login, NOTA_TITULO } = await import('../../screens/Login')

beforeEach(() => mem.clear())
const u = { email: 'demo@lockumi.com', nombre: 'demo', metodo: 'correo' as const }

describe('volver a aceptar con la sesión abierta (docs/reaceptacion.md)', () => {
  it('las versiones vigentes son 1.6-demo', () => { expect(TERMINOS.version).toBe('1.6-demo'); expect(PRIVACIDAD!.version).toBe('1.6-demo') })
  it('con 1.5-demo guardado en los dos, o sin nada, sale la pantalla', () => {
    expect(necesitaReaceptar()).toBe(true)
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    expect(necesitaReaceptar()).toBe(true)
  })
  it('con Términos 1.6-demo y Privacidad 1.5-demo sale igual (falta una)', () => {
    guardarAceptacion('terminos', '1.6-demo'); guardarAceptacion('privacidad', '1.5-demo')
    expect(necesitaReaceptar()).toBe(true)
  })
  it('con las dos en 1.6-demo no sale', () => {
    guardarAceptacion('terminos', '1.6-demo'); guardarAceptacion('privacidad', '1.6-demo')
    expect(necesitaReaceptar()).toBe(false)
  })
  it('al aceptar se guarda la versión vigente con fecha y hora en los dos documentos y en el usuario', () => {
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    const x = aceptarVersiones(u, new Date('2026-10-25T03:00:00Z'))
    for (const k of ['terminos', 'privacidad'] as const) expect(JSON.parse(mem.get(K_ACEPTACION[k])!)).toEqual({ version: '1.6-demo', fecha: '2026-10-25T03:00:00.000Z' })
    expect(x.terminos?.version).toBe('1.6-demo'); expect(x.privacidad?.version).toBe('1.6-demo')
    expect(JSON.parse(mem.get('lockumi.usuario')!).terminos.version).toBe('1.6-demo')
    expect(necesitaReaceptar()).toBe(false)
  })
  it('la pantalla: título con versión y fecha, dos casillas sin marcar, botón desactivado y sin «Salir»', () => {
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    const html = renderToStaticMarkup(<Reaceptacion u={u} onListo={() => {}} />)
    expect(TITULO_REACEPTACION).toBe('Actualizamos los Términos y el Aviso de privacidad (versión 1.6-demo, 24 oct 2026).')
    expect(html).toContain(TITULO_REACEPTACION)
    expect(html).toContain('Para seguir usando Lockumi, revísalos y acéptalos.')
    expect(html).toContain('Qué cambió: ahora explicamos con más detalle quién firma cada paso en la red de prueba (tú, tu billetera o la cuenta de Lockumi).')
    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).not.toMatch(/checked=""/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Aceptar y seguir<\/button>/)
    expect(html).not.toContain('Salir')
    expect(html).toContain('href="/terminos"'); expect(html).toContain('href="/privacidad"')
  })
  it('la casilla de privacidad dice «la dirección de mi billetera o de mi cuenta de prueba» (aquí y en Entrar)', () => {
    expect(CONSENTIMIENTO_PRIVACIDAD.despues).toContain('la dirección de mi billetera o de mi cuenta de prueba')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toContain('la dirección de mi billetera o de mi cuenta de prueba')
  })
})

describe('inicio de sesión: título y nota de Legal debajo', () => {
  it('el título sigue igual y la nota va debajo, visible', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(NOTA_TITULO).toBe('Demo en la red de prueba de Stellar, sin dinero real. No es un seguro ni una garantía de devolución.')
    const i = html.indexOf('El depósito de tu alquiler, protegido</h2>'), j = html.indexOf(NOTA_TITULO)
    expect(i).toBeGreaterThan(0); expect(j).toBeGreaterThan(i)
    expect(html.slice(i, j)).not.toMatch(/<ul/)   // justo debajo, antes de los beneficios
  })
})
