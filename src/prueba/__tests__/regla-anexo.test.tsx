import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
const { pruebaCompleta } = await import('../interruptor')
const { ReglaPropuesta, registroRegla, TITULO_REGLA, TEXTO_REGLA, CASILLA_REGLA, EJEMPLO_REGLA } = await import('../Regla')
const { Anexo6A, REPARACIONES_B, CASILLA_ANEXO, registroAnexo, reparacionesDe } = await import('../Anexo')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')

afterEach(() => vi.unstubAllEnvs())
describe('interruptor de la prueba completa', () => {
  it('está apagado si no se compila con VITE_PRUEBA_COMPLETA=1 (producción)', () => {
    expect(pruebaCompleta()).toBe(false)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); expect(pruebaCompleta()).toBe(true)
  })
  it('las pantallas nuevas solo se montan con el interruptor encendido', () => {
    expect(leer('../../screens/Crear.tsx')).toMatch(/pruebaCompleta\(\) && <Anexo6A/)
    expect(leer('../../screens/Detalle.tsx')).toMatch(/reglas17\(a\) && rol === 'inquilino' && !a\.regla/)
  })
})

describe('B.1 Regla de propuesta automática (opcional)', () => {
  it('textos de Legal v4, casilla sin marcar y «Continuar» siempre activo', () => {
    const h = renderToStaticMarkup(<ReglaPropuesta onListo={() => {}} />)
    expect(h).toContain(TITULO_REGLA); expect(TITULO_REGLA).toBe('Regla de propuesta automática (opcional)')
    expect(TEXTO_REGLA).toContain('solo si abriste al menos un aviso del reclamo')
    expect(TEXTO_REGLA).toContain('Si no abriste ningún aviso o si se supera el 30 %, el caso pasa a la mediación.')
    expect(CASILLA_REGLA).toBe('Acepto la Regla de propuesta automática, con 7 días naturales para responder.')
    expect(EJEMPLO_REGLA).toContain('Depósito de 800 USDC de prueba: el 30 % es 240.')
    expect(h).toMatch(/<input[^>]*type="checkbox"(?![^>]*checked)[^>]*>/)
    expect(h).toMatch(/<button[^>]*>Continuar<\/button>/); expect(h).not.toMatch(/<button[^>]*disabled[^>]*>Continuar/)
    expect(h).toContain('Ver el texto completo (cláusula 6.5.1)'); expect(h).toContain('Ejemplo')
  })
  it('registro: cuenta, alquiler, versión, sí o no, fecha y hora ISO', () => {
    const r = registroRegla('demo@lockumi.com', 'a1', true, new Date('2026-10-24T18:00:00Z'))
    expect(r).toEqual({ cuenta: 'demo@lockumi.com', alquiler: 'a1', version: expect.stringMatching(/demo$/), acepta: true, fecha: '2026-10-24T18:00:00.000Z' })
    expect(registroRegla('x', 'a1', false).acepta).toBe(false)
  })
})

describe('B.5 Anexo 6-A al crear el alquiler', () => {
  it('lista A, B con casillas y C; casilla de aceptación sin marcar', () => {
    const h = renderToStaticMarkup(<Anexo6A valor={{ acepta: false, reparaciones: [] }} onCambio={() => {}} />)
    expect(h).toContain('El desgaste normal nunca se cobra.')
    expect(REPARACIONES_B).toEqual(['Cambio de bombillos', 'Cambio de empaques de grifos', 'Limpieza de canoas', 'Mantenimiento del jardín'])
    expect(CASILLA_ANEXO).toBe('Leímos y aceptamos el Anexo 6-A.')
    expect(h).toContain('No se cobra (desgaste normal y paso del tiempo)'); expect(h).toContain('Se puede cobrar (daño), con pruebas completas')
    expect((h.match(/type="checkbox"/g) ?? []).length).toBe(5)
    expect(h).not.toMatch(/checked/)
  })
  it('registro del anexo con fecha y reparaciones marcadas', () => {
    expect(reparacionesDe({ acepta: true, reparaciones: ['Cambio de bombillos'], otra: '  Pintar la verja ' })).toEqual(['Cambio de bombillos', 'Pintar la verja'])
    expect(reparacionesDe({ acepta: true, reparaciones: [], otra: ' ' })).toEqual([])
    expect(registroAnexo(['Limpieza de canoas'], new Date('2026-10-24T18:00:00Z'))).toEqual({ acepta: '2026-10-24T18:00:00.000Z', reparaciones: ['Limpieza de canoas'] })
  })
  it('«Crear» queda inactivo hasta marcar el Anexo 6-A (solo con el interruptor)', () => {
    expect(leer("../../screens/Crear.tsx")).toMatch(/disabled=\{ocupado \|\| \(pruebaCompleta\(\) && !anexo\.acepta\)( \|\| \(invitar && \(!declara \|\| !aceptaVersion\)\))?\}/)   // paso16-unido: también la declaración al invitar
  })
})
