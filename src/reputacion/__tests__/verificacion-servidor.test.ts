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
  // Segundo factor (Legal 25/10, 5:04 p. m.): eliminar y descargar van por /api/codigo-correo (pedir el código y confirmarlo con la acción).
  codigoCorreo: vi.fn(async (b: { paso: string; accion: string; codigo?: string }) => { orden.push(`${b.paso}:${b.accion}`)
    return { ok: true, estado: 200, cuerpo: (b.paso === 'pedir' ? { enviado: true, correo: 'demo@lockumi.com' } : b.accion === 'eliminar' ? { hecho: true, fecha_limite: null } : { hecho: true, datos: {} }) as Record<string, unknown> } }),
  necesitaRep01: vi.fn(async (_e: string) => { orden.push('necesita'); return false }),
  aceptarReputacion: vi.fn(async () => { orden.push('aceptar'); return true }),
}
let token: string | null = 'token-de-cavos'
const cargar = async (conServidor: boolean) => {
  vi.resetModules(); orden.length = 0; Object.values(srv).forEach(f => f.mockClear())
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, servidor: { ...m.servidor, ...srv } } })
  vi.doMock('../../services/auth', async (o) => ({ ...await o<typeof import('../../services/auth')>(), authCavos: async () => token === null ? null : { getAuthToken: () => token } }))
  return { v: await import('../verificacion'), P: await import('../Pantallas'), b: await import('../borrado'), sf: await import('../segundo-factor') }
}
beforeEach(() => { mem.clear(); token = 'token-de-cavos'; vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('límite 1 en la app: el token de Cavos que ya existe va a /api/verificar-correo (sin tocar el login)', () => {
  it('con token: verifica UNA vez por correo antes de hablar con el servidor', async () => {
    const { v } = await cargar(true)
    await v.necesitaRep01EnServidor('Demo@Lockumi.com '); await v.necesitaRep01EnServidor('demo@lockumi.com')
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1); expect(srv.verificarCorreo).toHaveBeenCalledWith('token-de-cavos')
    expect(orden).toEqual(['verificar', 'necesita', 'necesita'])
  })
  it('el servidor lee por el ÚLTIMO correo verificado de la sesión: si cambia la persona en el aparato, se verifica otra vez', async () => {
    const { v } = await cargar(true)
    srv.verificarCorreo.mockImplementationOnce(async () => { orden.push('verificar'); return { correo: 'a@ejemplo.com' } })
    await v.asegurarCorreo('a@ejemplo.com'); await v.asegurarCorreo('a@ejemplo.com')
    token = 'token-de-b'   // cambiar de persona = volver a entrar = token nuevo
    srv.verificarCorreo.mockImplementationOnce(async () => { orden.push('verificar'); return { correo: 'b@ejemplo.com' } })
    await v.asegurarCorreo('b@ejemplo.com')
    token = 'token-de-a-otra-vez'
    srv.verificarCorreo.mockImplementationOnce(async () => { orden.push('verificar'); return { correo: 'a@ejemplo.com' } })
    expect(await v.asegurarCorreo('a@ejemplo.com')).toBe(true)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(3)
  })
  it('Legal 4:45 (token de un solo uso): no reenvía un token que ya mandó; sin volver a entrar, el servidor decide con lo que ya verificó', async () => {
    const { v } = await cargar(true)
    srv.verificarCorreo.mockImplementationOnce(async () => { throw new Error('No pudimos confirmar tu correo') })
    expect(await v.asegurarCorreo('demo@lockumi.com')).toBe(false)
    expect(await v.asegurarCorreo('demo@lockumi.com')).toBe(false)
    expect(await v.asegurarCorreo('otra@ejemplo.com')).toBe(false)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(1)
    token = 'token-nuevo'; expect(await v.asegurarCorreo('demo@lockumi.com')).toBe(true)
    expect(srv.verificarCorreo).toHaveBeenCalledTimes(2)
  })
  it('sin token (pestaña nueva): no manda nada inventado; el servidor decide con lo que ya verificó', async () => {
    token = null; const { v } = await cargar(true)
    await v.necesitaRep01EnServidor('demo@lockumi.com')
    expect(srv.verificarCorreo).not.toHaveBeenCalled(); expect(srv.necesitaRep01).toHaveBeenCalledWith('demo@lockumi.com')
  })
  it('aceptar y descargar también verifican antes (descargar: pedir el código y confirmarlo)', async () => {
    const { P, sf } = await cargar(true)
    await P.subirAceptacion('demo@lockumi.com', { version: 'v', fecha: '2026-10-25T22:00:00Z', texto: ['a'] })
    expect(await sf.pedirCodigo('demo@lockumi.com', 'descargar')).toEqual({ correo: 'demo@lockumi.com' })
    await P.datosDeDescarga({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }, [], undefined, '123456')
    expect(orden).toEqual(['verificar', 'aceptar', 'pedir:descargar', 'confirmar:descargar'])
  })
  it('no cambia el login: services/auth.ts no se toca y la app solo lee getAuthToken()', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('src/reputacion/verificacion.ts', 'utf8')
    expect(s).toMatch(/authCavos\(\)/); expect(s).toMatch(/getAuthToken\(\)/)
    expect(s).not.toMatch(/sendOtp|verifyOtp|handleCallback|loginGoogle|loginApple|sessionStorage/)
  })
})

describe('límite 5: eliminar la cuenta pide el borrado al servidor', () => {
  it('modo servidor: con el código del correo, el servidor hace lk_pedir_borrado_cuenta y, después, el pedido en este aparato', async () => {
    const { v, b, sf } = await cargar(true)
    await sf.pedirCodigo('demo@lockumi.com', 'eliminar')
    await v.eliminarCuenta('demo@lockumi.com', [], Date.parse('2026-10-25T22:00:00Z'), '123456')
    expect(srv.codigoCorreo).toHaveBeenLastCalledWith({ paso: 'confirmar', accion: 'eliminar', codigo: '123456' }); expect(orden).toEqual(['verificar', 'pedir:eliminar', 'confirmar:eliminar'])
    expect(b.solicitudBorrado('demo@lockumi.com')).toBeTruthy()
  })
  it('modo servidor sin código: falla sin llamar al servidor y NO borra nada en este aparato', async () => {
    const { v, b } = await cargar(true)
    await expect(v.eliminarCuenta('demo@lockumi.com', [], Date.now())).rejects.toMatchObject({ motivo: 'codigo' })
    expect(srv.codigoCorreo).not.toHaveBeenCalled(); expect(b.solicitudBorrado('demo@lockumi.com')).toBeFalsy()
  })
  it('si el servidor lo rechaza (código mal o la acción falla), falla y NO borra nada en este aparato (se puede volver a intentar)', async () => {
    const { v, b } = await cargar(true)
    srv.codigoCorreo.mockResolvedValueOnce({ ok: false, estado: 403, cuerpo: { motivo: 'codigo' } })
    await expect(v.eliminarCuenta('demo@lockumi.com', [], Date.now(), '000000')).rejects.toMatchObject({ motivo: 'codigo' })
    srv.codigoCorreo.mockResolvedValueOnce({ ok: false, estado: 502, cuerpo: { motivo: 'accion' } })
    await expect(v.eliminarCuenta('demo@lockumi.com', [], Date.now(), '123456')).rejects.toMatchObject({ motivo: 'accion' })
    srv.codigoCorreo.mockRejectedValueOnce(new Error('sin red'))
    await expect(v.eliminarCuenta('demo@lockumi.com', [], Date.now(), '123456')).rejects.toMatchObject({ motivo: 'accion' })
    expect(b.solicitudBorrado('demo@lockumi.com')).toBeFalsy()
  })
  it('pedir el código: «minuto» trae el correo (la pantalla se abre igual, con el aviso); sin correo verificado, «correo»', async () => {
    const { sf } = await cargar(true)
    srv.codigoCorreo.mockResolvedValueOnce({ ok: false, estado: 429, cuerpo: { motivo: 'minuto', correo: 'demo@lockumi.com' } })
    await expect(sf.pedirCodigo('demo@lockumi.com', 'eliminar')).rejects.toMatchObject({ motivo: 'minuto', correo: 'demo@lockumi.com' })
    srv.codigoCorreo.mockResolvedValueOnce({ ok: false, estado: 403, cuerpo: { motivo: 'correo' } })
    await expect(sf.pedirCodigo('demo@lockumi.com', 'eliminar')).rejects.toMatchObject({ motivo: 'correo' })
    srv.codigoCorreo.mockResolvedValueOnce({ ok: false, estado: 500, cuerpo: {} })
    await expect(sf.pedirCodigo('demo@lockumi.com', 'eliminar')).rejects.toMatchObject({ motivo: 'envio' })
  })
  it('demo local sin servidor: igual que antes, sin llamar al servidor', async () => {
    const { v, b } = await cargar(false)
    await v.eliminarCuenta('demo@lockumi.com', [], Date.now())
    expect(srv.codigoCorreo).not.toHaveBeenCalled(); expect(b.solicitudBorrado('demo@lockumi.com')).toBeTruthy()
  })
  it('la pantalla usa eliminarCuenta y muestra un error que dice cómo seguir (texto para Legal)', async () => {
    const { UI } = await import('../textos')
    expect(UI.errBorrado).toMatch(/vuelve a tocar «Eliminar mi cuenta»/)
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')).toMatch(/eliminarCuenta\(u\.email, todos, ahora\)/)
    // Legal, respuesta a 96e931b (4:41 p. m.): «solicitud» en vez de «pedido», y revisado.
    expect(UI.errBorrado).toBe('No pudimos enviar tu solicitud para eliminar la cuenta. Revisa tu conexión y vuelve a tocar «Eliminar mi cuenta». Si sigue igual, sal de Lockumi y vuelve a entrar con tu correo.')
    expect(fs.readFileSync('src/reputacion/textos.ts', 'utf8')).toMatch(/LEGAL: revisado \(25\/10\)[^\n]*\n[^\n]*errBorrado/)
    expect(fs.readFileSync('api/_lib/cavos-token.ts', 'utf8')).toMatch(/LEGAL: revisado \(25\/10\)[^\n]*\n[^\n]*NO_SE_PUDO_VERIFICAR/)
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
