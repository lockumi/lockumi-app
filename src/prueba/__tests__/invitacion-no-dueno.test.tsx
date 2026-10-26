// Arreglo 26/10/2026 (Katherine, 3:07 p. m.): el link de invitación abierto con la sesión del dueño no deja aceptar como inquilino;
// muestra el aviso y «Cerrar sesión», que vuelve a ese mismo link al entrar (src/regreso.ts).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const almacen = () => { const m = new Map<string, string>(); return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() } } }
const L = almacen(), S = almacen()
vi.stubGlobal('localStorage', L.s); vi.stubGlobal('sessionStorage', S.s)
beforeEach(() => { L.m.clear(); S.m.clear() })

const { esLinkDelDueno, TEXTO_LINK_DEL_DUENO, BOTON_CERRAR_SESION } = await import('../invitacion')
const { LinkDelDueno, CuerpoInvitacion } = await import('../../screens/Invitacion')
const { tomarRegreso } = await import('../../regreso')
const ID = '3f2a9c1b-0000-4000-8000-0000000000aa', TOKEN = 'ab'.repeat(32)

describe('link de invitación abierto por el dueño', () => {
  it('el texto es el aprobado', () => {
    expect(TEXTO_LINK_DEL_DUENO).toBe('Este link es para la otra persona. Cierra sesión o ábrelo en otro dispositivo.')
    expect(BOTON_CERRAR_SESION).toBe('Cerrar sesión')
  })
  it('es el dueño: lo dice el servidor, el alquiler es mío como dueño, el mismo correo (sin mayúsculas ni espacios) o la base lo rechazó', () => {
    expect(esLinkDelDueno({ esDueno: true })).toBe(true)
    expect(esLinkDelDueno({ miRol: 'dueno' })).toBe(true)
    expect(esLinkDelDueno({ correo: ' Ana@Lockumi.com', correoDueno: 'ana@lockumi.com ' })).toBe(true)
    expect(esLinkDelDueno({ error: TEXTO_LINK_DEL_DUENO })).toBe(true)
    expect(esLinkDelDueno({ error: 'Eres el dueño de este alquiler. Comparte el link con el inquilino.' })).toBe(true)
    expect(esLinkDelDueno({ esDueno: false, miRol: 'inquilino', correo: 'luis@lockumi.com', correoDueno: 'ana@lockumi.com', error: '' })).toBe(false)
    expect(esLinkDelDueno({ correo: '', correoDueno: '' })).toBe(false)
  })
  it('se ve el aviso en lugar de «Aceptar invitación»', () => {
    const d = { direccion: 'Casa', monto: 20, inicio: '2026-11-01', fin: '2026-12-01', reglas: [], email_inquilino: 'luis@lockumi.com', email_dueno: 'ana@lockumi.com', es_dueno: true }
    const html = renderToStaticMarkup(<CuerpoInvitacion d={d} u={{ email: 'luis@lockumi.com' } as never} acepta={false} setAcepta={() => {}} ocupado={false} aceptar={() => {}}
      delDueno={<LinkDelDueno id={ID} token={TOKEN} salir={() => {}} />} />)
    expect(html).toContain(TEXTO_LINK_DEL_DUENO); expect(html).toContain(BOTON_CERRAR_SESION); expect(html).not.toContain('Aceptar invitación')
  })
  it('«Cerrar sesión» sale y guarda el mismo link para volver al entrar', () => {
    const salir = vi.fn()
    const el = LinkDelDueno({ id: ID, token: TOKEN, salir }) as ReactElement<{ children: ReactElement<{ onClick: () => void }>[] }>
    el.props.children[1].props.onClick()
    expect(salir).toHaveBeenCalledOnce()
    expect(tomarRegreso()).toBe(`/invitacion/${ID}/${TOKEN}`)
  })
})
