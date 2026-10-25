// Paso 19 · Registro de consentimientos (C.1 y C.8): una casilla por opción y por papel, sin marcar, con versión, fecha y texto.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { leer, guardarDatos, aceptar, dejarDeMostrar, activa, validarNombre, validarCanton, VERSION_TEXTOS } from '../consentimiento'

const E = 'Demo@Lockumi.com', F = '2026-11-16T16:00:00.000Z'
beforeEach(() => { const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() }) })

describe('consentimientos', () => {
  it('todo empieza apagado, para los dos papeles', () => {
    const s = leer(E)
    for (const rol of ['dueno', 'inquilino'] as const) for (const o of ['perfil', 'destacados', 'nuevos', 'puntaje'] as const) expect(activa(s, rol, o)).toBe(false)
  })
  it('el perfil de dueño y el de inquilino tienen casillas separadas', () => {
    aceptar(E, 'dueno', 'perfil', ['a', 'b'], F)
    expect(activa(leer(E), 'dueno', 'perfil')).toBe(true); expect(activa(leer(E), 'inquilino', 'perfil')).toBe(false)
  })
  it('guarda la versión, la fecha y el texto aceptado', () => {
    aceptar(E, 'inquilino', 'perfil', ['Confirmo…', 'Entiendo…'], F)
    expect(leer(E).roles.inquilino.perfil).toEqual({ version: VERSION_TEXTOS, fecha: F, texto: ['Confirmo…', 'Entiendo…'] })
  })
  it('no se puede activar Destacados, Nuevos ni el puntaje sin el perfil público', () => {
    for (const o of ['destacados', 'nuevos', 'puntaje'] as const) expect(() => aceptar(E, 'dueno', o, ['x'], F)).toThrow()
  })
  it('«Dejar de mostrar» apaga todo lo público al instante y guarda la fecha en que se retiró', () => {
    aceptar(E, 'dueno', 'perfil', ['a', 'b'], F); aceptar(E, 'dueno', 'destacados', ['c'], F); aceptar(E, 'dueno', 'puntaje', ['d'], F)
    dejarDeMostrar(E, 'dueno', '2026-11-17T10:00:00.000Z')
    const s = leer(E)
    for (const o of ['perfil', 'destacados', 'nuevos', 'puntaje'] as const) expect(activa(s, 'dueno', o)).toBe(false)
    expect(s.roles.dueno.perfil?.retirado).toBe('2026-11-17T10:00:00.000Z')
  })
  it('«Dejar de mostrar» no borra los datos (decisión 5: se borran solo al eliminar la cuenta)', () => {
    guardarDatos(E, 'Laura V.', 'Escazú'); aceptar(E, 'dueno', 'perfil', ['a', 'b'], F); dejarDeMostrar(E, 'dueno', F)
    expect(leer(E)).toMatchObject({ nombre: 'Laura V.', canton: 'Escazú' })
  })
  it('se guarda por cuenta (sin importar mayúsculas)', () => {
    guardarDatos(E, 'Laura V.', 'Escazú'); expect(leer('demo@lockumi.com').canton).toBe('Escazú'); expect(leer('otra@x.cr').canton).toBeUndefined()
  })
})

describe('cada error dice cómo arreglarlo', () => {
  it('nombre visible: nombre y la inicial del apellido', () => {
    expect(validarNombre('Laura V.')).toBeNull(); expect(validarNombre('María José R')).toBeNull()
    expect(validarNombre('')).toMatch(/Escribe tu nombre y la inicial de tu apellido/)
    expect(validarNombre('Laura Vargas')).toMatch(/inicial del apellido/)
    expect(validarNombre('Laura V. ' + 'x'.repeat(30))).toMatch(/Máximo 30/)
  })
  it('cantón: uno de la lista', () => {
    expect(validarCanton('Escazú')).toBeNull(); expect(validarCanton('Loma Clara')).toMatch(/Elige tu cantón/); expect(validarCanton('')).toMatch(/Elige tu cantón/)
  })
})
