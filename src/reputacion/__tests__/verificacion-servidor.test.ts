// Paso 19 · ronda 25/10/2026, 4:22–4:23 p. m. En modo servidor:
//  · Límite 1 (Legal: bloqueante): antes de aceptar, descargar, eliminar o preguntar por REP-01, la app manda el token que el kit de
//    Cavos ya guarda (CavosAuth.getAuthToken(), sin tocar el login) a /api/verificar-correo. Sin token no inventa nada: el servidor
//    decide y rechaza un correo sin verificar.
//  · Límite 5: eliminar la cuenta manda el pedido al servidor (lk_pedir_borrado_cuenta con el correo de la sesión de Cavos), no solo
//    borra en este aparato. Si el servidor falla, no se borra nada aquí y se explica cómo seguir.
//  · Límite 4: la pantalla previa en un segundo aparato se decide con el estado del servidor (lk_necesita_rep01 por el correo).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const orden: string[] = []
const srv = {
  verificarCorreo: vi.fn(async (_t: string) => { orden.push('verificar'); return { correo: 'demo@lockumi.com' } }),
  pedirBorradoCuenta: vi.fn(async (_e: string) => { orden.push('borrar'); return null as string | null }),
  necesitaRep01: vi.fn(async (_e: string) => { orden.push('necesita'); return false }),
  aceptarReputacion: vi.fn(async () => { orden.push('aceptar'); return true }),
  datosReputacion: vi.fn(async () => { orden.push('datos'); return {} }),
}
let token: string | null = 'token-de-cavos'
const cargar = async (conServidor: boolean) => {
  vi.resetModules(); orden.length = 0; Object.values(srv).forEach(f => f.mockClear())
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, servidor: { ...m.servidor, ...srv } } })
  vi.doMock('../../services/auth', async (o) => ({ ...await o<typeof import('../../services/auth')>(), authCavos: async () => token === null ? null : { getAuthToken: () => token } }))
  return { v: await import('../verificacion'), P: await import('../Pantallas'), b: await import('../borrado') }
}
beforeEach(() => { mem.clear(); token = 'token-de-cavos'; vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('límite 1 en la app: el token de Cavos que ya existe va a /api/verificar-correo (sin tocar el login)', () => {
  it('con token: verifica UNA vez por correo antes de hablar con el servidor', async () => {
    const { v } = await cargar(true)
    await v.necesitaRep01EnServidor('Demo@Lockumi.com '); await v.necesitaRep01EnServidor('demo@lockumi.com')
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1); expect(srv.verificarCorreo).toHaveBeenCalledWith('token-de-cavos')
    expect(orden).toEqual(['verificar', 'necesita', 'necesita'])
  })
  it('sin token (pestaña nueva): no manda nada inventado; el servidor decide con lo que ya verificó', async () => {
    token = null; const { v } = await cargar(true)
    await v.necesitaRep01EnServidor('demo@lockumi.com')
    expect(srv.verificarCorreo).not.toHaveBeenCalled(); expect(srv.necesitaRep01).toHaveBeenCalledWith('demo@lockumi.com')
  })
  it('aceptar y descargar también verifican antes', async () => {
    const { P } = await cargar(true)
    await P.subirAceptacion('demo@lockumi.com', { version: 'v', fecha: '2026-10-25T22:00:00Z', texto: ['a'] })
    await P.datosDeDescarga({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }, [])
    expect(orden).toEqual(['verificar', 'aceptar', 'datos'])
  })
  it('no cambia el login: services/auth.ts no se toca y la app solo lee getAuthToken()', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('src/reputacion/verificacion.ts', 'utf8')
    expect(s).toMatch(/authCavos\(\)/); expect(s).toMatch(/getAuthToken\(\)/)
    expect(s).not.toMatch(/sendOtp|verifyOtp|handleCallback|loginGoogle|loginApple|sessionStorage/)
  })
})

describe('límite 5: eliminar la cuenta pide el borrado al servidor', () => {
  it('modo servidor: lk_pedir_borrado_cuenta con el correo de la sesión de Cavos y, después, el pedido en este aparato', async () => {
    const { v, b } = await cargar(true)
    await v.eliminarCuenta('demo@lockumi.com', [], Date.parse('2026-10-25T22:00:00Z'))
    expect(srv.pedirBorradoCuenta).toHaveBeenCalledWith('demo@lockumi.com'); expect(orden).toEqual(['verificar', 'borrar'])
    expect(b.solicitudBorrado('demo@lockumi.com')).toBeTruthy()
  })
  it('si el servidor lo rechaza, falla y NO borra nada en este aparato (se puede volver a intentar)', async () => {
    const { v, b } = await cargar(true); srv.pedirBorradoCuenta.mockRejectedValueOnce(new Error('Ese correo no es el de tu cuenta en este aparato.'))
    await expect(v.eliminarCuenta('demo@lockumi.com', [], Date.now())).rejects.toThrow()
    expect(b.solicitudBorrado('demo@lockumi.com')).toBeFalsy()
  })
  it('demo local sin servidor: igual que antes, sin llamar al servidor', async () => {
    const { v, b } = await cargar(false)
    await v.eliminarCuenta('demo@lockumi.com', [], Date.now())
    expect(srv.pedirBorradoCuenta).not.toHaveBeenCalled(); expect(b.solicitudBorrado('demo@lockumi.com')).toBeTruthy()
  })
  it('la pantalla usa eliminarCuenta y muestra un error que dice cómo seguir (texto para Legal)', async () => {
    const { UI } = await import('../textos')
    expect(UI.errBorrado).toMatch(/vuelve a tocar «Eliminar mi cuenta»/)
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')).toMatch(/eliminarCuenta\(u\.email, todos, ahora\)/)
    expect(fs.readFileSync('src/reputacion/textos.ts', 'utf8')).toMatch(/LEGAL: revisar · ronda 25\/10 4:23[^\n]*\n[^\n]*errBorrado/)
  })
})

describe('límite 4: la pantalla previa en otro aparato usa el estado del servidor', () => {
  it('decidirPrevia: sin servidor, lo local; con servidor, lo que diga lk_necesita_rep01; si falla, se muestra (nunca se salta)', async () => {
    const { v } = await cargar(true)
    expect(v.decidirPrevia(false, null)).toBe(false); expect(v.decidirPrevia(false, true)).toBe(false)
    expect(v.decidirPrevia(true, null)).toBe(true)
    expect(v.decidirPrevia(true, 'cargando')).toBe('cargando')
    expect(v.decidirPrevia(true, false)).toBe(false)      // ya aceptó en otro aparato (o tiene alquileres): no la ve otra vez
    expect(v.decidirPrevia(true, true)).toBe(true)
    expect(v.decidirPrevia(true, 'error')).toBe(true)
  })
  it('necesitaRep01EnServidor: en modo servidor pregunta por el correo; sin servidor, null', async () => {
    let { v } = await cargar(true); srv.necesitaRep01.mockResolvedValueOnce(false)
    expect(await v.necesitaRep01EnServidor('demo@lockumi.com')).toBe(false)
    ;({ v } = await cargar(false)); expect(await v.necesitaRep01EnServidor('demo@lockumi.com')).toBeNull(); expect(srv.necesitaRep01).not.toHaveBeenCalled()
  })
  it('la puerta de Reputacion usa useRep01Servidor + decidirPrevia', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')
    expect(s).toMatch(/useRep01Servidor\(u\.email/); expect(s).toMatch(/decidirPrevia\(/)
  })
})

describe('textos de Legal (25/10, 4:23 p. m.)', () => {
  it('Privacidad: la línea de la persona por correo, con «solicitudes», se publica y queda «LEGAL: revisado (25/10)»', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const md = fs.readFileSync('src/legal/v17/privacidad.md', 'utf8'), l = md.split('\n')
    const T = 'Si usas Lockumi en más de un aparato, unimos tu perfil de reputación, tus aceptaciones y tus solicitudes por el correo con el que entras con Cavos. Cuando descargas tus datos o eliminas tu cuenta, incluimos todo lo de ese correo, en todos tus aparatos.'
    const i = l.indexOf(T); expect(i).toBeGreaterThan(0)
    expect(l[i - 1]).toMatch(/^<!-- LEGAL: revisado \(25\/10\)/)
    expect(md).not.toMatch(/PROPUESTA NO PUBLICADA/); expect(md).not.toMatch(/tus pedidos por el correo/)
    const { aHtml } = await import('../../legal/markdown')
    expect(aHtml(md)).toContain('tus solicitudes por el correo'); expect(aHtml(md)).not.toContain('LEGAL:')
  })
  it('textos.ts: el error de «Descargar mis datos» queda revisado', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/reputacion/textos.ts', 'utf8')).toMatch(/LEGAL: revisado \(25\/10\)[^\n]*\n[^\n]*errDescarga/)
  })
})
