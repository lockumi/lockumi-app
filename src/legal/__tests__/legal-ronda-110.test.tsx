// Legal, ronda 1.10 (25/10/2026, 11:16 p. m.): (1) la casilla de la invitación y del alquiler dice la misma versión que abre su enlace y
// que se guarda; (2) Privacidad: nombre visible, código de 6 números y «cierre del alquiler»; (3) con «Esta invitación es para otro
// correo» a la vista, «Aceptar invitación» queda desactivado.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '' })
const C = () => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa') }
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); mem.clear(); C() })
const sinEtiquetas = (h: string) => h.replace(/<[^>]+>/g, '')
const casilla = async () => { const { CasillaVersion } = await import('../../prueba/CasillaVersion'); return renderToStaticMarkup(<CasillaVersion id="inv-terminos" marcada={false} onCambio={() => {}} />) }
const href = (h: string, txt: RegExp) => [...h.matchAll(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].find(m => txt.test(m[2]))?.[1]

describe('(1) la casilla dice la versión que abre su enlace (y la que se guarda)', () => {
  it('con la reputación encendida (producción): «Términos 1.9-demo» abre /terminos-1-9 y /privacidad-1-9, que son la 1.9-demo', async () => {
    vi.stubEnv('VITE_REPUTACION', '1')
    const h = await casilla(), { docs, terminosActual, rutaLegal } = await import('../documentos'), { versionActual } = await import('../../prueba/version')
    expect(sinEtiquetas(h)).toContain('Acepto los Términos 1.9-demo y el Aviso de privacidad')
    expect(versionActual()).toBe('1.9-demo')                                   // lo que se guarda (Invitacion.tsx: aceptarConCorreo)
    expect(terminosActual().version).toBe('1.11-demo')                         // /terminos es la edición de la cuenta (PR #33: 1.11-demo)
    const t = href(h, /^Términos/)!, p = href(h, /^Aviso de privacidad$/)!
    expect([t, p]).toEqual(['/terminos-1-9', '/privacidad-1-9'])
    const d = docs()
    for (const r of [t, p]) { const doc = d[rutaLegal(r)!]; expect(doc.version).toBe('1.9-demo'); expect(doc.html).not.toContain('Perfil de reputación') }
    expect(d['privacidad'].version).toBe('1.11-demo'); expect(d['privacidad'].html).toContain('Perfil de reputación')
  })
  it('con la reputación apagada, todo sigue en /terminos y /privacidad (1.9-demo)', async () => {
    const h = await casilla(), { docs } = await import('../documentos')
    expect(sinEtiquetas(h)).toContain('Acepto los Términos 1.9-demo y el Aviso de privacidad')
    expect([href(h, /^Términos/), href(h, /^Aviso de privacidad$/)]).toEqual(['/terminos', '/privacidad'])
    // PR #33: la 1.9-demo también tiene su ruta archivada (el mismo texto que /terminos mientras sea la vigente).
    expect(docs()['terminos-1-9'].html).toBe(docs().terminos.html)
  })
  it('el contrato de un alquiler 1.9-demo enlaza la 1.9-demo (antes, con la reputación, /terminos-1-9 no existía)', async () => {
    vi.stubEnv('VITE_REPUTACION', '1')
    const { rutaTerminos, rutaLegal, docTerminos } = await import('../documentos')
    expect(rutaTerminos('1.9-demo')).toBe('/terminos-1-9'); expect(rutaLegal('/terminos-1-9')).toBe('terminos-1-9')
    expect(docTerminos('1.9-demo').version).toBe('1.9-demo')
  })
})

describe('(2) Privacidad (ronda 1.10)', () => {
  it('nombre visible, código de 6 números y «cierre del alquiler», solo en la 1.11-demo; sigue «Pendiente de revisión por abogado»', async () => {
    vi.stubEnv('VITE_REPUTACION', '1')
    const ds = (await import('../documentos')).docs(), d = ds.privacidad, t = sinEtiquetas(d.html)
    expect(d.version).toBe('1.11-demo')
    // PR #33: la 1.9-demo y la 1.10-demo no cambian (siguen con «mediación y cierre)», sin el código de 6 números).
    for (const k of ['privacidad-1-9', 'privacidad-1-10']) { const x = sinEtiquetas(ds[k].html); expect(x).toContain('mediación y cierre)'); expect(x).not.toContain('código de 6 números') }
    expect(t).toContain('Datos que se publican: tu nombre visible (tu nombre y la inicial de tu apellido), tu papel')
    expect(t).toContain('Cuando descargas tus datos o eliminas tu cuenta, incluimos todo lo de ese correo, en todos tus aparatos. Para descargar tus datos o eliminar tu cuenta, te pedimos un código de 6 números que te enviamos por correo.')
    expect(t).toContain('(plazos, reclamo, respuesta, mediación y cierre del alquiler)'); expect(t).not.toContain('mediación y cierre)')
    expect(d.revisionAbogado).toBe(false)   // PaginaLegal muestra «Pendiente de revisión por abogado»
  })
  it('lo que dice coincide con el código: nombre + inicial del apellido y código de 6 números para descargar y eliminar', async () => {
    const { UI, SEGUNDO_FACTOR } = await import('../../reputacion/textos')
    expect(UI.nombreAyuda).toContain('Escribe tu nombre y la inicial de tu apellido')
    expect(SEGUNDO_FACTOR.texto.descargar).toContain('código de 6 números'); expect(SEGUNDO_FACTOR.texto.eliminar).toContain('código de 6 números')
  })
})

describe('(3) «Aceptar invitación» desactivado con «Esta invitación es para otro correo»', () => {
  it('ZonaAceptar con bloqueado: el botón queda desactivado aunque la casilla esté marcada', async () => {
    const { ZonaAceptar } = await import('../../screens/Invitacion')
    const z = (b: boolean) => renderToStaticMarkup(<ZonaAceptar marcada ocupado={false} onMarcar={() => {}} onAceptar={() => {}} bloqueado={b} />)
    expect(z(false)).not.toMatch(/<button[^>]*disabled/); expect(z(true)).toMatch(/<button[^>]*disabled=""[^>]*>Aceptar invitación/)
  })
  it('con otro correo en la pantalla (no el del servidor) el botón ni siquiera se muestra', async () => {
    const { CuerpoInvitacion } = await import('../../screens/Invitacion'), { TEXTO_OTRO_CORREO } = await import('../../prueba/invitacion')
    const d = { direccion: 'Ejemplo', monto: 20, inicio: '2026-10-26', fin: '2026-12-25', reglas: [], email_inquilino: 'otra@ejemplo.com', email_dueno: 'demo@lockumi.com' }
    const h = renderToStaticMarkup(<CuerpoInvitacion d={d} u={{ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }} acepta={false} setAcepta={() => {}} ocupado={false} aceptar={() => {}} />)
    expect(h).toContain(TEXTO_OTRO_CORREO); expect(h).not.toContain('Aceptar invitación')
  })
})
