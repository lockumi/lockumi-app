// Una sesión anónima por cuenta (26/10/2026, Katherine: Gmail en una pestaña y Apple en otra mostraban «Eres dueño» con la cuenta de
// Apple). Al entrar con otra cuenta o salir, la sesión anterior se termina; la misma cuenta la conserva; las otras pestañas se enteran.
import { describe, it, expect, vi } from 'vitest'
import { usarCuentaCon, salirCon, otraPestanaCambio, K_SESION, K_CORREO } from '../cuenta-sesion'

const almacen = (inicial: Record<string, string> = {}) => {
  const m = new Map(Object.entries(inicial))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }
}
describe('cuenta-sesion', () => {
  it('otra cuenta (Apple después de Gmail): termina la sesión, borra lockumi.sesion-servidor y ata la nueva cuenta', async () => {
    const s = almacen({ [K_SESION]: '{"sesion":"gmail"}', [K_CORREO]: 'katherine@gmail.com' }), salir = vi.fn(async () => {})
    expect(await usarCuentaCon(' 8x@PrivateRelay.AppleID.com ', { storage: s, salir })).toBe(true)
    expect(salir).toHaveBeenCalledTimes(1); expect(s.m.has(K_SESION)).toBe(false); expect(s.m.get(K_CORREO)).toBe('8x@privaterelay.appleid.com')
  })
  it('la misma cuenta: conserva la sesión; sin sesión: solo guarda el correo', async () => {
    const s = almacen({ [K_SESION]: 'x', [K_CORREO]: 'a@ejemplo.com' }), salir = vi.fn(async () => {})
    expect(await usarCuentaCon('A@ejemplo.com', { storage: s, salir })).toBe(false); expect(s.m.get(K_SESION)).toBe('x')
    const v = almacen(); expect(await usarCuentaCon('b@ejemplo.com', { storage: v, salir })).toBe(false); expect(v.m.get(K_CORREO)).toBe('b@ejemplo.com')
    expect(salir).not.toHaveBeenCalled()
  })
  it('sesión vieja sin correo guardado: se termina una vez; si signOut falla, igual se borra', async () => {
    const s = almacen({ [K_SESION]: 'vieja' }), salir = vi.fn(async () => { throw new Error('red') })
    expect(await usarCuentaCon('a@ejemplo.com', { storage: s, salir })).toBe(true); expect(s.m.has(K_SESION)).toBe(false)
  })
  it('salir: termina la sesión y olvida el correo', async () => {
    const s = almacen({ [K_SESION]: 'x', [K_CORREO]: 'a@ejemplo.com' }), salir = vi.fn(async () => {})
    await salirCon({ storage: s, salir }); expect(salir).toHaveBeenCalledTimes(1); expect(s.m.size).toBe(0)
  })
  it('otra pestaña entró con otra cuenta: esta se entera; con la misma cuenta u otra clave, no', () => {
    expect(otraPestanaCambio(K_CORREO, 'b@ejemplo.com', 'a@ejemplo.com')).toBe(true)
    expect(otraPestanaCambio(K_CORREO, 'a@ejemplo.com', ' A@ejemplo.com')).toBe(false)
    expect(otraPestanaCambio('otra', 'b@ejemplo.com', 'a@ejemplo.com')).toBe(false)
    expect(otraPestanaCambio(K_CORREO, null, 'a@ejemplo.com')).toBe(false)
  })
})
