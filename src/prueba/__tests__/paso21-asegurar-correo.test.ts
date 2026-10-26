// Paso 21 sobre la reputación (docs/invitacion-enlace.md, «Orden para publicar», punto 2): antes de aceptar la invitación, la app llama
// asegurarCorreo(u.email) (api/verificar-correo; con correo y código de Cavos termina en «Revisa tu correo»). Con 20261025230000 el
// servidor acepta solo si el correo invitado está verificado para esa sesión, así que el orden importa. Apagada la reputación, no se carga.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const orden: string[] = []
const asegurar = vi.fn(async (e: string) => { orden.push('asegurar:' + e); return true })
const aceptarInvitacion = vi.fn(async () => { orden.push('aceptar') })
vi.mock('../../reputacion/verificacion', () => ({ asegurarCorreo: (e: string) => asegurar(e) }))
vi.mock('../../servidor/repositorio', () => ({ servidor: { aceptarInvitacion: (...a: unknown[]) => aceptarInvitacion(...(a as [])), verInvitacion: vi.fn() } }))
beforeEach(() => { orden.length = 0; asegurar.mockClear(); aceptarInvitacion.mockClear(); vi.unstubAllEnvs() })

const ID = '3f2a9c1b-0000-4000-8000-0000000000aa', TOKEN = 'ab'.repeat(32)

describe('aceptar la invitación con la reputación encendida', () => {
  it('VITE_REPUTACION=1: primero asegurarCorreo(u.email) y después aceptar en el servidor', async () => {
    vi.stubEnv('VITE_REPUTACION', '1')
    const { aceptarConCorreo } = await import('../../screens/Invitacion')
    await aceptarConCorreo(ID, TOKEN, 'luis.demo@lockumi.com')
    expect(orden).toEqual(['asegurar:luis.demo@lockumi.com', 'aceptar'])
  })
  it('si asegurarCorreo falla, igual se intenta aceptar (el servidor rechaza con el texto que dice cómo seguir)', async () => {
    vi.stubEnv('VITE_REPUTACION', '1'); asegurar.mockImplementationOnce(async () => { throw new Error('red') })
    const { aceptarConCorreo } = await import('../../screens/Invitacion')
    await aceptarConCorreo(ID, TOKEN, 'luis.demo@lockumi.com')
    expect(aceptarInvitacion).toHaveBeenCalledTimes(1)
  })
  it('apagada (sin VITE_REPUTACION): no carga la reputación y acepta como antes', async () => {
    const { aceptarConCorreo } = await import('../../screens/Invitacion')
    await aceptarConCorreo(ID, TOKEN, 'luis.demo@lockumi.com')
    expect(asegurar).not.toHaveBeenCalled(); expect(orden).toEqual(['aceptar'])
  })
})
