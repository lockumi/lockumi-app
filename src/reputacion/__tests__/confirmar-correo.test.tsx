// Paso 19 · Legal, 25/10/2026, 9:00 p. m.: al entrar con el código por correo de Cavos (token con aud «cavos-email»), el servidor responde
// 403 con codigo: true y manda el código de 6 números de Lockumi. La app muestra «Revisa tu correo» (mismo estilo que el segundo factor,
// una pantalla = un paso) y, con el código correcto, el correo queda verificado. El login no cambia.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const CORREO = 'lockumi+confirmar@mail.grokbot.com'
const srv = {
  verificarCorreo: vi.fn(async (_t: string): Promise<{ correo: string; codigo?: boolean; motivo?: string }> => ({ correo: CORREO, codigo: true })),
  codigoCorreo: vi.fn(async (b: { paso: string; accion: string; codigo?: string }) => b.paso === 'pedir'
    ? { ok: true, estado: 200, cuerpo: { enviado: true, correo: CORREO } as Record<string, unknown> }
    : b.codigo === '123456' ? { ok: true, estado: 200, cuerpo: { hecho: true, correo: CORREO } as Record<string, unknown> }
    : { ok: false, estado: 403, cuerpo: { motivo: 'codigo' } as Record<string, unknown> }),
  necesitaRep01: vi.fn(async () => false),
}
const cargar = async () => {
  vi.resetModules(); Object.values(srv).forEach(f => f.mockClear())
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor: true }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, servidor: { ...m.servidor, ...srv } } })
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
  vi.doMock('../../services/auth', async (o) => ({ ...await o<typeof import('../../services/auth')>(), authCavos: async () => ({ getAuthToken: () => 'token-de-correo-de-cavos' }) }))
  return { v: await import('../verificacion'), P: await import('../Pantallas'), t: await import('../textos') }
}
const texto = (h: string) => h.replace(/<\/?strong>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
beforeEach(() => { mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('«Revisa tu correo» con el token de correo de Cavos', () => {
  it('sin el código el correo NO cuenta como verificado; con el código correcto sí (y no se vuelve a mandar el token)', async () => {
    const { v } = await cargar()
    expect(await v.asegurarCorreo(CORREO)).toBe(false)
    expect(v.correoPorConfirmar()).toEqual({ c: CORREO, correo: CORREO })
    await expect(v.confirmarCorreoConCodigo('000000')).rejects.toMatchObject({ motivo: 'codigo' })
    expect(v.correoPorConfirmar()).not.toBeNull()
    await v.confirmarCorreoConCodigo('123456')
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'confirmar', accion: 'verificar_correo', codigo: '123456' })
    expect(v.correoPorConfirmar()).toBeNull()
    expect(await v.asegurarCorreo(CORREO)).toBe(true)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1)
  })
  it('«Reenviar código» pide otro para verificar_correo (sin volver a mandar el token)', async () => {
    const { v } = await cargar()
    await v.asegurarCorreo(CORREO); await v.reenviarCodigoCorreo()
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'pedir', accion: 'verificar_correo' })
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1)
  })
  it('la pantalla: textos literales de Legal, el campo, la nota de 10 minutos y los botones de siempre, sin palabras técnicas', async () => {
    const { P, t } = await cargar()
    const h = renderToStaticMarkup(<P.ConfirmarCorreo p={{ c: CORREO, correo: CORREO }} cancelar={() => {}} />), x = texto(h)
    expect(x).toContain('Revisa tu correo')
    expect(x).toContain(`Te enviamos un código de 6 números a ${CORREO}. Escríbelo aquí para confirmar tu correo.`)
    expect(x).toContain(t.SEGUNDO_FACTOR.campo); expect(x).toContain(t.SEGUNDO_FACTOR.nota)
    expect(x).toContain('Continuar'); expect(x).toContain('Reenviar código'); expect(x).toContain('Cancelar')
    expect(h).toContain('autoComplete="one-time-code"'); expect(h).toContain('href="#/"')
    expect(x).not.toMatch(/token|cavos|aud|nonce|enclave|JWT/i)
    const m = renderToStaticMarkup(<P.ConfirmarCorreo p={{ c: CORREO, correo: CORREO, motivo: 'minuto' }} cancelar={() => {}} />)
    expect(texto(m)).toContain(t.SEGUNDO_FACTOR.errores.minuto)
  })
  it('con un correo por confirmar, la app muestra «Revisa tu correo» antes que cualquier otra pantalla', async () => {
    const { v, P } = await cargar()
    await v.asegurarCorreo(CORREO)
    const U: Usuario = { email: CORREO, nombre: 'Demo', metodo: 'correo' }
    const h = texto(renderToStaticMarkup(<P.default u={U} r="/" salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></P.default>))
    expect(h).toContain('Revisa tu correo'); expect(h).not.toContain('PANTALLA-DE-SIEMPRE')
  })
})
