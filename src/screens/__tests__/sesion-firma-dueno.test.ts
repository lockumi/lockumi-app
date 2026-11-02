// U4 (27/10/2026; rama «NO FUSIONAR» hasta el OK de Katherine): el dueño que entró solo con la llave de acceso firmaba sin sesión de Cavos
// y el alquiler quedaba sin su cuenta Stellar (409 al pagar). Ahora, si le falta la cuenta, su firma pide antes «Entrar de nuevo»
// (el mismo ConSesion y los mismos textos que ya ve el inquilino). Con la cuenta guardada, nada cambia.
import { describe, it, expect, vi } from 'vitest'

const m = vi.hoisted(() => ({ dos: true, tw: true }))
vi.mock('../../prueba/dosPersonas', async o => ({ ...(await o() as object), esDosPersonas: () => m.dos }))
vi.mock('../../servidor/config', async o => ({ ...(await o() as object), modoDe: () => ({ servidor: true, trustless: m.tw, dosPersonas: true }) }))
import { pideSesionAntesDeFirmar } from '../sesionFirma'

const G = 'GDJU2MWJWMC37S3PWUVUABI2NPDMGGTMCMY2O3PFNTWMPFDL7QL3VRBX'
const A = (x: Record<string, unknown> = {}, firmas: Record<string, string> = {}) => ({ id: 'a1', estado: 'firmas', dosPersonas: true, miRol: 'dueno', contrato: { firmas }, ...x }) as never

describe('pideSesionAntesDeFirmar', () => {
  it('dueño sin su cuenta Stellar y sin firmar: pide sesión antes de firmar (U4)', () => {
    m.dos = true; m.tw = true
    expect(pideSesionAntesDeFirmar(A(), 'dueno')).toBe(true)
    expect(pideSesionAntesDeFirmar(A({ cuentas: { inquilino: G } }), 'dueno')).toBe(true)
  })
  it('dueño con la cuenta ya guardada: firma como antes, sin pedir nada', () => {
    m.dos = true; m.tw = true
    expect(pideSesionAntesDeFirmar(A({ cuentas: { dueno: G } }), 'dueno')).toBe(false)
  })
  it('dueño que ya firmó: no pide nada (el respaldo del #64 al abrir el depósito sigue igual)', () => {
    m.dos = true; m.tw = true
    expect(pideSesionAntesDeFirmar(A({}, { dueno: '2026-10-27' }), 'dueno')).toBe(false)
  })
  it('inquilino: igual que antes (pide sesión mientras no haya firmado, con o sin cuenta)', () => {
    m.dos = true; m.tw = true
    expect(pideSesionAntesDeFirmar(A({ miRol: 'inquilino' }), 'inquilino')).toBe(true)
    expect(pideSesionAntesDeFirmar(A({ miRol: 'inquilino', cuentas: { inquilino: G } }), 'inquilino')).toBe(true)
    expect(pideSesionAntesDeFirmar(A({ miRol: 'inquilino' }, { inquilino: 'x' }), 'inquilino')).toBe(false)
  })
  it('fuera de dos personas o sin Trustless Work: nunca pide sesión', () => {
    m.dos = false; m.tw = true; expect(pideSesionAntesDeFirmar(A(), 'dueno')).toBe(false); expect(pideSesionAntesDeFirmar(A({ miRol: 'inquilino' }), 'inquilino')).toBe(false)
    m.dos = true; m.tw = false; expect(pideSesionAntesDeFirmar(A(), 'dueno')).toBe(false)
    m.dos = true; m.tw = true
  })
  it('otra persona viendo la vista del dueño (miRol distinto): no pide sesión por el dueño', () => {
    expect(pideSesionAntesDeFirmar(A({ miRol: 'inquilino' }), 'dueno')).toBe(false)
  })
  it('Detalle usa la regla en la firma del contrato, con el mismo ConSesion (sin textos nuevos)', async () => {
    const leer = async (f: string) => (await import(/* @vite-ignore */ f + '?raw')).default as string
    const d = await leer('../Detalle.tsx')
    expect(d).toMatch(/<ConSesion activo=\{pideSesionAntesDeFirmar\(a, rol\)\}>\s*<Firma key=\{'c-' \+ rol\}/)
    expect((await leer('../sesionFirma.ts')).split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('/**')).join('\n')).not.toMatch(/['"`][A-ZÁÉÍÓÚ¿][^'"`]*\s[^'"`]*['"`]/)
  })
})
