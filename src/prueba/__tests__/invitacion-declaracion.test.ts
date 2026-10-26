// paso16-unido · Invitaciones (Legal, 25/10, arreglo 5): declaración de quien invita (guardada en el servidor con quién, cuándo y
// el texto exacto), un solo correo de invitación por alquiler (solo con VITE_CORREOS=1) y sin recordatorios.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { declaracionInvitacion, enviarInvitacionUnaVez } from '../invitacion'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
afterEach(() => { vi.unstubAllEnvs(); mem.clear() })
const leer = async (p: string) => ((await import(['node', 'fs'].join(':'))) as { readFileSync(p: string, c: 'utf8'): string }).readFileSync(p, 'utf8')

describe('declaración de quien invita', () => {
  it('texto según lo encendido (igual que la Privacidad 1.7-demo)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(declaracionInvitacion()).toBe('Declaro que esta persona sabe que la invito.')
    vi.stubEnv('VITE_CORREOS', '1')
    expect(declaracionInvitacion()).toBe('Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.')
  })
  it('«Invitar a la otra persona» exige marcarla y el servidor la guarda con el alquiler (lk_crear_contrato_invitando)', async () => {
    const crear = await leer('src/screens/Crear.tsx'), repo = await leer('src/servidor/repositorio.ts')
    expect(crear).toMatch(/invitar && <CasillaLegal id="f-declara" marcada=\{declara\} onCambio=\{setDeclara\}>\{declaracionInvitacion\(\)\}/)   // 25/10 6:49: la casilla de la app
    expect(crear).toMatch(/disabled=\{ocupado \|\| \(pruebaCompleta\(\) && !anexo\.acepta\) \|\| \(invitar && \(!declara \|\| !aceptaVersion\)\)\}/)   // PR #22 (c): y la casilla de los Términos vigentes
    expect(crear).toMatch(/declaracion: declaracionInvitacion\(\)/)
    expect(repo).toMatch(/d\.declaracion \? \(d\.terminosVersion \? 'lk_crear_contrato_con_terminos' : 'lk_crear_contrato_invitando'\) : 'lk_crear_contrato'/)   // PR #22 (b): con la versión de los Términos
    expect(repo).toMatch(/p_declaracion: d\.declaracion/)
  })
})

describe('un solo correo de invitación', () => {
  it('solo con VITE_CORREOS=1, una vez por alquiler (sin recordatorios)', async () => {
    const f = vi.fn(async () => new Response('{"enviado":true}', { status: 200 })); vi.stubGlobal('fetch', f)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(await enviarInvitacionUnaVez('c1', 'invitada@correo.com', 'Ana')).toBe(false)
    vi.stubEnv('VITE_CORREOS', '1')
    expect(await enviarInvitacionUnaVez('c1', 'invitada@correo.com', 'Ana')).toBe(true)
    expect(await enviarInvitacionUnaVez('c1', 'invitada@correo.com', 'Ana')).toBe(false)
    expect(f).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ tipo: 'invitacion', rol: 'inquilino', nombre: 'Ana', para: 'invitada@correo.com', alquiler: 'c1', consentimiento: true })
    vi.unstubAllGlobals(); vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
  })
  it('Crear lo envía después de crear el alquiler con la invitación', async () => {
    expect(await leer('src/screens/Crear.tsx')).toMatch(/if \(invitar\) \{ activarServidor\(\); void enviarInvitacionUnaVez\(r\.id, f\.email\.trim\(\), nombreInvitacion\(u\.nombre\), tokenDeLink\(r\.link\)\) \}/)   // paso21: con el token del link
  })
})
