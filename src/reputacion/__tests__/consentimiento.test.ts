// Paso 19 · Registro de consentimientos (C.1 y C.8): una casilla por opción y por papel, sin marcar, con versión, fecha y texto.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as modulo from '../consentimiento'
import { leer, guardarDatos, aceptar, activa, validarNombre, validarCanton, VERSION_TEXTOS, borrarTodo, aceptoReputacion } from '../consentimiento'

const E = 'Demo@Lockumi.com', F = '2026-11-16T16:00:00.000Z'
beforeEach(() => { const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() }) })

describe('consentimientos', () => {
  it('todo empieza apagado, para los dos papeles', () => {
    const s = leer(E)
    for (const rol of ['dueno', 'inquilino'] as const) for (const o of ['perfil', 'destacados', 'nuevos'] as const) expect(activa(s, rol, o)).toBe(false)
  })
  it('el perfil de dueño y el de inquilino tienen casillas separadas', () => {
    aceptar(E, 'dueno', 'perfil', ['a', 'b'], F)
    expect(activa(leer(E), 'dueno', 'perfil')).toBe(true); expect(activa(leer(E), 'inquilino', 'perfil')).toBe(false)
  })
  it('guarda la versión, la fecha y el texto aceptado', () => {
    aceptar(E, 'inquilino', 'perfil', ['Confirmo…', 'Entiendo…'], F)
    expect(leer(E).roles.inquilino.perfil).toEqual({ version: VERSION_TEXTOS, fecha: F, texto: ['Confirmo…', 'Entiendo…'] })
  })
  it('no se puede activar Destacados ni Nuevos sin el perfil público', () => {
    for (const o of ['destacados', 'nuevos'] as const) expect(() => aceptar(E, 'dueno', o, ['x'], F)).toThrow()
  })
  it('no hay opción «Mostrar mi puntaje» (se muestra siempre desde el 3.er alquiler cerrado)', () => {
    aceptar(E, 'dueno', 'perfil', ['a', 'b'], F)
    expect(() => aceptar(E, 'dueno', 'puntaje' as never, ['x'], F)).toThrow()
  })
  it('OBLIGATORIA (decisión de Katherine, 2:24 p. m.): para usar Lockumi hacen falta nombre, cantón y la aceptación de los DOS papeles', () => {
    expect(aceptoReputacion(E)).toBe(false)
    guardarDatos(E, 'Laura V.', 'Escazú'); expect(aceptoReputacion(E)).toBe(false)
    aceptar(E, 'dueno', 'perfil', ['a', 'b'], F); expect(aceptoReputacion(E)).toBe(false)
    aceptar(E, 'inquilino', 'perfil', ['a', 'b'], F); expect(aceptoReputacion(E)).toBe(true)
    borrarTodo(E); expect(aceptoReputacion(E)).toBe(false)
  })
  it('no hay «Dejar de mostrar»: el perfil queda fijo y solo desaparece al eliminar la cuenta (decisión del 25/10/2026)', () => {
    expect(Object.keys(modulo).filter(k => /dejar|retirar|ocultar/i.test(k))).toEqual([])
    guardarDatos(E, 'Laura V.', 'Escazú'); aceptar(E, 'dueno', 'perfil', ['a', 'b'], F)
    borrarTodo(E); expect(leer(E)).toEqual({ roles: { dueno: {}, inquilino: {} } })
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
