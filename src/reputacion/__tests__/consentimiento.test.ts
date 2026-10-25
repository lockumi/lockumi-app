// Paso 19 · Registro de consentimientos (legal/reputacion-textos-para-producto.md, regla 5 y REP-01): una sola aceptación, en una pantalla
// previa a crear la cuenta, con versión, fecha, hora y texto (Ley 8968). Las vitrinas (REP-06) son casillas opcionales por papel.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as modulo from '../consentimiento'
import { leer, guardarDatos, aceptar, activa, validarNombre, validarCanton, VERSION_TEXTOS, borrarTodo, aceptarRep01, aceptoRep01, perfilCompleto,
  aceptarPrevia, previa, vincularPrevia } from '../consentimiento'

const E = 'Demo@Lockumi.com', F = '2026-11-16T16:00:00.000Z'
const alm = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() } }
beforeEach(() => { vi.stubGlobal('localStorage', alm()); vi.stubGlobal('sessionStorage', alm()) })

describe('REP-01: aceptación previa a crear la cuenta', () => {
  it('todo empieza sin aceptar', () => {
    expect(aceptoRep01(E)).toBe(false); expect(previa()).toBeNull()
    for (const rol of ['dueno', 'inquilino'] as const) for (const o of ['destacados', 'nuevos'] as const) expect(activa(leer(E), rol, o)).toBe(false)
  })
  it('guarda la versión, la fecha, la hora (Costa Rica) y el texto aceptado', () => {
    aceptarRep01(E, ['Entiendo…', 'Confirmo que soy mayor de 18 años.'], F)
    expect(leer(E).rep01).toEqual({ version: VERSION_TEXTOS, fecha: F, hora: '10:00 a. m.', texto: ['Entiendo…', 'Confirmo que soy mayor de 18 años.'] })
    expect(aceptoRep01(E)).toBe(true)
  })
  it('antes de tener cuenta se guarda en esta sesión y se pasa a la cuenta nueva al entrar (una sola vez)', () => {
    aceptarPrevia(['Entiendo…', 'Confirmo…'], F); expect(previa()?.hora).toBe('10:00 a. m.')
    vincularPrevia(E, true); expect(aceptoRep01(E)).toBe(true); expect(leer(E).rep01?.fecha).toBe(F); expect(previa()).toBeNull()
    vincularPrevia('otra@x.cr', true); expect(aceptoRep01('otra@x.cr')).toBe(false)
  })
  it('una cuenta que ya aceptó no cambia su registro', () => {
    aceptarRep01(E, ['a'], F); aceptarPrevia(['b'], '2026-11-17T16:00:00.000Z'); vincularPrevia(E, true)
    expect(leer(E).rep01?.texto).toEqual(['a'])
  })
  it('el perfil queda completo con REP-01, el nombre visible y el cantón', () => {
    aceptarRep01(E, ['a'], F); expect(perfilCompleto(E)).toBe(false)
    guardarDatos(E, 'Laura V.', 'Escazú'); expect(perfilCompleto(E)).toBe(true)
  })
  it('las vitrinas son opcionales, por papel, y necesitan REP-01', () => {
    expect(() => aceptar(E, 'dueno', 'destacados', ['x'], F)).toThrow()
    aceptarRep01(E, ['a'], F); aceptar(E, 'dueno', 'destacados', ['x'], F)
    expect(activa(leer(E), 'dueno', 'destacados')).toBe(true); expect(activa(leer(E), 'inquilino', 'destacados')).toBe(false)
    expect(() => aceptar(E, 'dueno', 'puntaje' as never, ['x'], F)).toThrow()
  })
  it('no hay «Dejar de mostrar» ni «Mostrar mi puntaje»: el perfil queda fijo y solo desaparece al eliminar la cuenta', () => {
    expect(Object.keys(modulo).filter(k => /dejar|retirar|ocultar|mostrar/i.test(k))).toEqual([])
    guardarDatos(E, 'Laura V.', 'Escazú'); aceptarRep01(E, ['a'], F)
    borrarTodo(E); expect(leer(E)).toEqual({ roles: { dueno: {}, inquilino: {} } })
  })
  it('se guarda por cuenta (sin importar mayúsculas)', () => {
    guardarDatos(E, 'Laura V.', 'Escazú'); expect(leer('demo@lockumi.com').canton).toBe('Escazú'); expect(leer('otra@x.cr').canton).toBeUndefined()
  })
})

describe('cada error dice cómo arreglarlo', () => {
  it('nombre visible: nombre y la inicial del apellido', () => {
    expect(validarNombre('Laura V.')).toBeNull(); expect(validarNombre('María-José R')).toBeNull(); expect(validarNombre('María José R')).toBeNull()   // nombre compuesto (Legal, 25/10)
    expect(validarNombre('')).toMatch(/Escribe tu nombre y la inicial de tu apellido/)
    expect(validarNombre('Laura Vargas')).toMatch(/inicial de tu apellido/)
    expect(validarNombre('Laura V. ' + 'x'.repeat(30))).toMatch(/Máximo 30/)
  })
  it('cantón: uno de la lista', () => {
    expect(validarCanton('Escazú')).toBeNull(); expect(validarCanton('Loma Clara')).toMatch(/Elige tu cantón/); expect(validarCanton('')).toMatch(/Elige tu cantón/)
  })
})
