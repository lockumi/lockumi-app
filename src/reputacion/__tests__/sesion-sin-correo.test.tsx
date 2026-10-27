// PR #61 · 27/10/2026 (jurado, prueba real): quien entró con Cavos, dejó «Revisa tu correo» sin escribir el código y vuelve más tarde con su llave
// de acceso (el aviso local de 55 minutos ya venció, o es otro aparato) entraba con «Tus alquileres» vacío y sin pedir el código: el servidor
// rechazaba en silencio (403) porque la sesión de Supabase no tiene el correo confirmado. Ahora la app le pregunta al servidor con lo que ya
// existe (lk_necesita_rep01: 28000 = correo sin confirmar) y muestra la MISMA pantalla «Revisa tu correo». Solo ese rechazo cuenta.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const CORREO = 'lockumi+sesion@mail.grokbot.com'
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const jwt = (iat: number) => `${b64({ alg: 'ES256' })}.${b64({ iss: 'https://enclave.cavos.xyz', iat, exp: iat + 3600, sub: 'u1' })}.firma`
const ahoraS = () => Math.floor(Date.now() / 1000)
let token: string | null = null
const srv = {
  verificarCorreo: vi.fn(async (_t: string): Promise<{ correo: string; codigo?: boolean; motivo?: string }> => ({ correo: CORREO, codigo: true })),
  codigoCorreo: vi.fn(async (b: { paso: string }) => b.paso === 'pedir'
    ? { ok: true, estado: 200, cuerpo: { enviado: true, correo: CORREO } as Record<string, unknown> }
    : { ok: true, estado: 200, cuerpo: { hecho: true, correo: CORREO, vinculados: 1 } as Record<string, unknown> }),
  necesitaRep01: vi.fn(async (_c: string) => false),
}
const cargar = async () => {
  vi.resetModules(); Object.values(srv).forEach(f => f.mockClear())
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor: true }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, recargar: async () => {}, servidor: { ...m.servidor, ...srv } } })
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
  vi.doMock('../../services/auth', async (o) => ({ ...await o<typeof import('../../services/auth')>(), authCavos: async () => token === null ? null : { getAuthToken: () => token } }))
  const { ErrorServidor } = await import('../../servidor/repositorio')
  /** Lo que devuelve PostgREST (403, SQLSTATE 28000) cuando el correo no está confirmado en esta sesión. */
  const sinConfirmar = () => { const e = new ErrorServidor('Ese correo no es el de tu cuenta en este aparato. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.'); e.codigo = '28000'; return e }
  return { v: await import('../verificacion'), P: await import('../Pantallas'), ErrorServidor, sinConfirmar }
}
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const U: Usuario = { email: CORREO, nombre: 'Demo', metodo: 'correo' }
const pintar = (P: Awaited<ReturnType<typeof cargar>>['P']) => texto(renderToStaticMarkup(<P.default u={U} r="/" salir={() => {}}><p>TUS-ALQUILERES</p></P.default>))
beforeEach(() => { mem.clear(); token = null; vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('sesión restaurada sin el correo confirmado (aviso local vencido o de otro aparato)', () => {
  it('llave de acceso con un token de hace 28 minutos y SIN aviso guardado: el servidor dice «sin confirmar» → «Revisa tu correo», sin mandar el token', async () => {
    token = jwt(ahoraS() - 1700)
    const { v, P, sinConfirmar } = await cargar()
    srv.necesitaRep01.mockImplementationOnce(async () => { throw sinConfirmar() })
    expect(await v.asegurarCorreo(CORREO)).toBe(false)
    expect(srv.verificarCorreo).not.toHaveBeenCalled()
    expect(srv.necesitaRep01).toHaveBeenCalledWith(CORREO)
    expect(v.correoPorConfirmar()).toEqual({ c: CORREO, correo: CORREO })
    const h = pintar(P)
    expect(h).toContain('Revisa tu correo'); expect(h).toContain('Reenviar código'); expect(h).not.toContain('TUS-ALQUILERES')
    expect(mem.has('lockumi.correo-por-confirmar')).toBe(false)   // el servidor es la fuente: no se inventa un aviso local
  })
  it('sin token (pestaña nueva) y el aviso de 55 minutos vencido: también vuelve «Revisa tu correo»; «Reenviar código» y el código sirven sin token', async () => {
    const s = await import('../../services/sesionCavos')
    s.guardarPorConfirmar(CORREO, CORREO, Date.now() - 56 * 60_000)
    const c = await cargar()
    srv.necesitaRep01.mockImplementationOnce(async () => { throw c.sinConfirmar() })
    await c.v.asegurarCorreo(CORREO)
    expect(c.v.correoPorConfirmar()).toMatchObject({ c: CORREO })
    await c.v.reenviarCodigoCorreo()
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'pedir', accion: 'verificar_correo' })
    await c.v.confirmarCorreoConCodigo('123456')
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'confirmar', accion: 'verificar_correo', codigo: '123456' })
    expect(c.v.correoPorConfirmar()).toBeNull()
    expect(pintar(c.P)).toContain('TUS-ALQUILERES')   // confirmado (y vinculado): la lista de siempre
  })
  it('usuario con el correo confirmado: entra directo a su lista, sin «Revisa tu correo» (y no se pregunta dos veces)', async () => {
    token = jwt(ahoraS() - 1700)
    const { v, P } = await cargar()
    await v.asegurarCorreo(CORREO); await v.asegurarCorreo(CORREO)
    expect(v.correoPorConfirmar()).toBeNull()
    expect(srv.verificarCorreo).not.toHaveBeenCalled()
    expect(srv.necesitaRep01).toHaveBeenCalledTimes(1)
    const h = pintar(P); expect(h).toContain('TUS-ALQUILERES'); expect(h).not.toContain('Revisa tu correo')
  })
  it('error de red u otro error del servidor (sin el 28000): NO se muestra «Revisa tu correo» (falso aviso) y se vuelve a preguntar la próxima vez', async () => {
    token = jwt(ahoraS() - 1700)
    const { v, P, ErrorServidor } = await cargar()
    srv.necesitaRep01.mockImplementationOnce(async () => { throw new TypeError('Failed to fetch') })
    expect(await v.asegurarCorreo(CORREO)).toBe(false); expect(v.correoPorConfirmar()).toBeNull()
    srv.necesitaRep01.mockImplementationOnce(async () => { throw new ErrorServidor('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.') })   // sin codigo
    await v.asegurarCorreo(CORREO); expect(v.correoPorConfirmar()).toBeNull()
    srv.necesitaRep01.mockImplementationOnce(async () => { const e = new ErrorServidor('Tu sesión venció. Vuelve a entrar.'); e.codigo = 'PGRST301'; throw e })
    await v.asegurarCorreo(CORREO); expect(v.correoPorConfirmar()).toBeNull()
    const h = pintar(P); expect(h).toContain('TUS-ALQUILERES'); expect(h).not.toContain('Revisa tu correo')
    await v.asegurarCorreo(CORREO); expect(srv.necesitaRep01).toHaveBeenCalledTimes(4)   // se reintenta
  })
  it('token reciente (entrada normal) NO cambia: va a /api/verificar-correo y no se consulta lk_necesita_rep01; recargar con el código ya escrito no inventa nada', async () => {
    token = jwt(ahoraS() - 20)
    const { v } = await cargar()
    await v.asegurarCorreo(CORREO)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1); expect(srv.necesitaRep01).not.toHaveBeenCalled()
    await v.confirmarCorreoConCodigo('123456')
    const r = await cargar()   // recarga: huella 412a806; el servidor ya tiene el correo confirmado
    await r.v.asegurarCorreo(CORREO)
    expect(srv.verificarCorreo).not.toHaveBeenCalled(); expect(r.v.correoPorConfirmar()).toBeNull()
  })
  it('recargar con la huella ya enviada y SIN el código escrito (aviso vencido): el servidor lo confirma como sin confirmar → «Revisa tu correo»', async () => {
    token = jwt(ahoraS() - 20)
    const { v } = await cargar()
    await v.asegurarCorreo(CORREO); mem.delete('lockumi.correo-por-confirmar')
    const r = await cargar(); srv.necesitaRep01.mockImplementationOnce(async () => { throw r.sinConfirmar() })
    await r.v.asegurarCorreo(CORREO)
    expect(srv.verificarCorreo).not.toHaveBeenCalled(); expect(r.v.correoPorConfirmar()).toMatchObject({ c: CORREO })
  })
  it('sin servidor (demo local) no pregunta nada', async () => {
    vi.resetModules(); vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor: false }))
    const v = await import('../verificacion')
    expect(await v.asegurarCorreo(CORREO)).toBe(true); expect(v.correoPorConfirmar()).toBeNull()
  })
  it('repositorio: el rechazo del servidor conserva su SQLSTATE (codigo); una falla de red no lo trae', async () => {
    vi.resetModules(); vi.doUnmock('../../servidor/repositorio'); vi.doUnmock('../../servidor/config')
    let respuesta: { data: unknown; error: { code?: string; message: string } | null } = { data: null, error: { code: '28000', message: 'Ese correo no es el de tu cuenta en este aparato.' } }
    vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) }, rpc: async () => respuesta }) }))
    const { servidor, ErrorServidor } = await import('../../servidor/repositorio')
    await expect(servidor.necesitaRep01(CORREO)).rejects.toMatchObject({ codigo: '28000' })
    respuesta = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    const e = await servidor.necesitaRep01(CORREO).catch(x => x as InstanceType<typeof ErrorServidor>)
    expect(e).toBeInstanceOf(ErrorServidor); expect((e as InstanceType<typeof ErrorServidor>).codigo).toBeUndefined()
    respuesta = { data: true, error: null }; expect(await servidor.necesitaRep01(CORREO)).toBe(true)
    vi.doUnmock('@supabase/supabase-js')
  })
})
