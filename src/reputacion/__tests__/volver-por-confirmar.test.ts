// PR #60 · 27/10/2026 (prueba real con el dueño): quien deja «Revisa tu correo» sin escribir el código y vuelve con su llave de acceso trae el
// token de Cavos de hace rato. El servidor solo acepta tokens de 5 minutos como máximo y de un solo uso (api/_lib/cavos-token.ts), así que
// respondía 403 «Sal de Lockumi…», el correo nunca se confirmaba y la app no volvía a pedir el código (aceptar la reputación y crear
// alquileres seguían dando 403). Ahora la app NO manda un token que el servidor va a rechazar y, si esa cuenta dejó el correo por confirmar
// hace menos de una hora, vuelve a mostrar «Revisa tu correo» (mismo flujo y misma pantalla). No cambia el servidor ni el login.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const CORREO = 'lockumi+volver@mail.grokbot.com', OTRO = 'otra+persona@mail.grokbot.com'
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
/** JWT de prueba sin firma real (la app solo lee iat y exp; la firma la valida el servidor). */
const jwt = (iat: number, exp = iat + 3600) => `${b64({ alg: 'ES256' })}.${b64({ iss: 'https://enclave.cavos.xyz', iat, exp, sub: 'u1' })}.firma`
const ahoraS = () => Math.floor(Date.now() / 1000)
let token: string | null = null
const srv = {
  verificarCorreo: vi.fn(async (_t: string): Promise<{ correo: string; codigo?: boolean; motivo?: string }> => ({ correo: CORREO, codigo: true })),
  codigoCorreo: vi.fn(async (b: { paso: string; accion: string; codigo?: string }) => b.paso === 'pedir'
    ? { ok: true, estado: 200, cuerpo: { enviado: true, correo: CORREO } as Record<string, unknown> }
    : { ok: true, estado: 200, cuerpo: { hecho: true, correo: CORREO } as Record<string, unknown> }),
  necesitaRep01: vi.fn(async () => false),
}
const cargar = async () => {
  vi.resetModules(); Object.values(srv).forEach(f => f.mockClear())
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor: true }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, servidor: { ...m.servidor, ...srv } } })
  vi.doMock('../../services/auth', async (o) => ({ ...await o<typeof import('../../services/auth')>(), authCavos: async () => token === null ? null : { getAuthToken: () => token } }))
  return { v: await import('../verificacion'), s: await import('../../services/sesionCavos') }
}
beforeEach(() => { mem.clear(); token = null; vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('tokenYaNoSirve: lo que el servidor va a rechazar no se manda', () => {
  it('más de 6 minutos de emitido (el servidor acepta 5 + 60 s de reloj) o vencido: no sirve; reciente u opaco: se manda', async () => {
    const { s } = await cargar(), n = ahoraS()
    expect(s.tokenYaNoSirve(jwt(n - 30))).toBe(false)
    expect(s.tokenYaNoSirve(jwt(n - 300))).toBe(false)
    expect(s.tokenYaNoSirve(jwt(n - 361))).toBe(true)
    expect(s.tokenYaNoSirve(jwt(n - 1700))).toBe(true)   // el caso real: 28 minutos, todavía con 32 de vida (el JWT del enclave dura 1 hora)
    expect(s.tokenYaNoSirve(jwt(n - 7200, n - 3600))).toBe(true)
    expect(s.tokenYaNoSirve('token-opaco')).toBe(false)   // no es un JWT: decide el servidor
  })
})
describe('correo por confirmar guardado en este aparato', () => {
  it('guarda solo el correo (nunca token ni código), vale 55 minutos, es de una cuenta y se borra al salir', async () => {
    const { s } = await cargar(), t0 = 1_000_000
    s.guardarPorConfirmar(CORREO, CORREO, t0)
    expect(JSON.stringify([...mem.values()])).not.toMatch(/token|codigo|jwt/i)
    expect(s.leerPorConfirmar(CORREO, t0 + 54 * 60_000)).toEqual({ c: CORREO, correo: CORREO })
    expect(s.leerPorConfirmar(OTRO, t0 + 1000)).toBeNull()
    expect(s.leerPorConfirmar(CORREO, t0 + 56 * 60_000)).toBeNull()
    expect(mem.has('lockumi.correo-por-confirmar')).toBe(false)   // vencido: se borra solo
    s.guardarPorConfirmar(CORREO, CORREO, t0); s.borrarSesion()
    expect(s.leerPorConfirmar(CORREO, t0 + 1000)).toBeNull()
  })
})
describe('volver con la llave de acceso al «Revisa tu correo» pendiente', () => {
  it('primera vez: el token reciente va al servidor, queda por confirmar y se guarda el correo', async () => {
    token = jwt(ahoraS() - 20)
    const { v, s } = await cargar()
    expect(await v.asegurarCorreo(CORREO)).toBe(false)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1)
    expect(v.correoPorConfirmar()).toEqual({ c: CORREO, correo: CORREO })
    expect(s.leerPorConfirmar(CORREO)).toEqual({ c: CORREO, correo: CORREO })
  })
  it('vuelve con el token de hace 28 minutos: NO lo manda (daría 403) y muestra otra vez «Revisa tu correo»; el código y «Reenviar» sirven sin token', async () => {
    const { s } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO)
    token = jwt(ahoraS() - 1700)
    const { v } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO)   // otra carga de la app: módulos nuevos, mismo almacenamiento
    expect(v.correoPorConfirmar()).toBeNull()
    expect(await v.asegurarCorreo(CORREO)).toBe(false)
    expect(srv.verificarCorreo).not.toHaveBeenCalled()
    expect(v.correoPorConfirmar()).toEqual({ c: CORREO, correo: CORREO })
    await v.reenviarCodigoCorreo()
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'pedir', accion: 'verificar_correo' })
    await v.confirmarCorreoConCodigo('123456')
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'confirmar', accion: 'verificar_correo', codigo: '123456' })
    expect(v.correoPorConfirmar()).toBeNull()
    expect(mem.has('lockumi.correo-por-confirmar')).toBe(false)   // confirmado: ya no hay nada pendiente
    expect(await v.asegurarCorreo(CORREO)).toBe(true)
    expect(srv.verificarCorreo).not.toHaveBeenCalled()
  })
  it('una pestaña nueva sin token también vuelve a «Revisa tu correo»', async () => {
    const { s } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO)
    token = null
    const { v } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO)
    await v.asegurarCorreo(CORREO)
    expect(srv.verificarCorreo).not.toHaveBeenCalled(); expect(v.correoPorConfirmar()).toMatchObject({ c: CORREO })
  })
  it('sin nada pendiente (correo ya confirmado o nunca empezó) no inventa la pantalla; tampoco con otra cuenta o pasada la hora', async () => {
    token = jwt(ahoraS() - 1700)
    const { v, s } = await cargar()
    expect(await v.asegurarCorreo(CORREO)).toBe(false); expect(v.correoPorConfirmar()).toBeNull()
    s.guardarPorConfirmar(OTRO, OTRO)
    const { v: v2 } = await cargar(); s.guardarPorConfirmar(OTRO, OTRO)
    await v2.asegurarCorreo(CORREO); expect(v2.correoPorConfirmar()).toBeNull()
    s.guardarPorConfirmar(CORREO, CORREO, Date.now() - 56 * 60_000)
    const { v: v3 } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO, Date.now() - 56 * 60_000)
    await v3.asegurarCorreo(CORREO); expect(v3.correoPorConfirmar()).toBeNull()
    expect(srv.verificarCorreo).not.toHaveBeenCalled()
  })
  it('si el servidor verifica el correo directo (Google o Apple) se borra lo pendiente', async () => {
    token = jwt(ahoraS() - 10)
    const { v, s } = await cargar(); s.guardarPorConfirmar(CORREO, CORREO)
    srv.verificarCorreo.mockImplementationOnce(async () => ({ correo: CORREO }))
    expect(await v.asegurarCorreo(CORREO)).toBe(true)
    expect(s.leerPorConfirmar(CORREO)).toBeNull()
  })
  it('no toca el login: services/auth.ts no sabe nada de esto', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/services/auth.ts', 'utf8')).not.toMatch(/PorConfirmar|tokenYaNoSirve/)
  })
})
