import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine Solano', metodo: 'correo' }
const { iniciales, rolesDeCuenta, rolesEn } = await import('../perfil-datos')
vi.doMock('../../store', async (o) => {
  const m = await o<typeof import('../../store')>()
  return { ...m, useAlquileres: () => [{ duenoEmail: U.email, inquilinoEmail: 'otra@ejemplo.cr' }] }
})
const { Perfil } = await import('../Perfil')
const fuente = await import('../Perfil.tsx?raw').then(m => m.default as string)
const alq = (x: Partial<Alquiler>): Pick<Alquiler, 'duenoEmail' | 'inquilinoEmail' | 'miRol'> => ({
  duenoEmail: 'dueño@ejemplo.cr', inquilinoEmail: 'inqui@ejemplo.cr', ...x,
})

describe('perfil mínimo', () => {
  it('iniciales del nombre que ya tiene la sesión', () => {
    expect(iniciales('Katherine Solano')).toBe('KS')
    expect(iniciales('Ana')).toBe('A')
    expect(iniciales('  ')).toBe('?')
  })
  it('el rol sale del correo en los alquileres; un correo que no está no se marca dueño', () => {
    expect(rolesEn(alq({ duenoEmail: U.email }), U.email)).toEqual(['dueno'])
    expect(rolesEn(alq({ inquilinoEmail: U.email }), U.email)).toEqual(['inquilino'])
    expect(rolesEn(alq({ duenoEmail: U.email, inquilinoEmail: U.email }), U.email)).toEqual(['dueno', 'inquilino'])
    expect(rolesEn(alq({}), 'otra@ejemplo.cr')).toEqual([])
    expect(rolesEn(alq({ miRol: 'inquilino', duenoEmail: U.email }), U.email)).toEqual(['inquilino'])
    expect(rolesDeCuenta([alq({ duenoEmail: U.email }), alq({ inquilinoEmail: U.email })], U.email)).toEqual(['dueno', 'inquilino'])
    expect(rolesDeCuenta([], U.email)).toEqual([])
  })
  it('muestra la sesión, los enlaces legales y Salir; no hay cédula, edición ni cuenta de pago', () => {
    const h = renderToStaticMarkup(<Perfil u={U} onSalir={() => {}} />)
    expect(h).toContain('Katherine Solano')
    expect(h).toContain('katherine@ejemplo.cr')
    expect(h).toContain('Correo')
    expect(h).toContain('href="/terminos"')
    expect(h).toContain('href="/privacidad"')
    expect(h).toContain('>Salir<')
    expect(h).toContain('chip--dueno')
    expect(h).toContain('Dueño')
    expect(h).not.toContain('chip--inquilino')
    expect(h).not.toMatch(/Cédula|Editar perfil|Cuenta de pago/)
    expect(h).not.toContain('Mi Llave Lockumi')
    expect(fuente).toContain('onClick={onSalir}')
  })
})
