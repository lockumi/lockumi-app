// paso21 · El link del correo de invitación abre ESA invitación (antes abría la app sin el link y la persona invitada no veía nada),
// la ruta sobrevive al inicio de sesión, la pantalla Entrar dice que es una invitación y la tarjeta del dueño dice a dónde salió el correo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const almacen = () => { const m = new Map<string, string>(); return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() } } }
const L = almacen(), S = almacen()
vi.stubGlobal('localStorage', L.s); vi.stubGlobal('sessionStorage', S.s)
beforeEach(() => { L.m.clear(); S.m.clear() })

const { armar, validar, atenderCorreo, enlaceInvitacion, olvidarInvitaciones } = await import('../../../api/_lib/correo')
const { enviarInvitacionUnaVez, correoInvitacionEnviado, tokenDeLink, textoEnlaceEnviado, TEXTO_INVITADO_SIN_SESION, BOTON_WHATSAPP } = await import('../invitacion')
const { guardarRegreso, tomarRegreso, esRutaInvitacion } = await import('../../regreso')

const ORIGEN = 'https://app.lockumi.com', ID = '3f2a9c1b-0000-4000-8000-0000000000aa', TOKEN = 'ab'.repeat(32)
const huella = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('')
const pedido = (extra: Record<string, unknown> = {}) => ({ tipo: 'invitacion' as const, consentimiento: true, para: 'luis.demo@lockumi.com', alquiler: ID, rol: 'inquilino' as const, nombre: 'Ana', ...extra })

describe('correo de invitación: el botón abre la invitación de ese alquiler', () => {
  it('con el token, el botón (HTML y texto plano) lleva a #/invitacion/<alquiler>/<token>', () => {
    const c = armar(validar(pedido({ token: TOKEN })), ORIGEN), url = `${ORIGEN}/#/invitacion/${ID}/${TOKEN}`
    expect(c.html).toContain(`href="${url}"`); expect(c.texto).toContain(url)
    expect(enlaceInvitacion(ORIGEN, ID, TOKEN)).toBe(url)
  })
  it('sin token (versión anterior de la app) sigue abriendo la app, como antes', () => {
    expect(armar(validar(pedido()), ORIGEN).html).toContain(`href="${ORIGEN}/"`)
  })
  it('un token o un alquiler con forma rara se rechaza y el mensaje dice qué hacer', () => {
    expect(() => validar(pedido({ token: 'xyz' }))).toThrow(/Crear un link nuevo/)
    expect(() => validar(pedido({ token: TOKEN, alquiler: 'a1' }))).toThrow(/Crear un link nuevo/)
  })
  it('con Supabase, el token tiene que ser el link vigente: si no, no se gasta el único correo ni se llama a Resend', async () => {
    const env = { RESEND_API_KEY: 'llave-de-prueba', SUPABASE_URL: 'https://sb.example.co', SUPABASE_SERVICE_ROLE_KEY: 'servicio-de-prueba' }
    const falso = (hash: string | null) => vi.fn(async (u: string) => {
      if (u.includes('/rest/v1/lk_contratos')) return Response.json([{ invitacion_hash: hash }])
      if (u.includes('/rpc/lk_registrar_correo_invitacion')) return Response.json(true)
      return Response.json({ id: 'em_21' })
    }) as unknown as typeof fetch & { mock: { calls: [string, RequestInit][] } }
    const mal = falso(await huella('cd'.repeat(32)))
    await expect(atenderCorreo(env, pedido({ token: TOKEN }), ORIGEN, '2.1.0.1', mal)).rejects.toThrow(/ya no sirve.*Crear un link nuevo/)
    expect(mal.mock.calls.map(([u]) => u)).toEqual([`https://sb.example.co/rest/v1/lk_contratos?id=eq.${ID}&select=invitacion_hash`])
    const bien = falso(await huella(TOKEN))
    expect(await atenderCorreo(env, pedido({ token: TOKEN }), ORIGEN, '2.1.0.2', bien)).toEqual({ enviado: true, id: 'em_21' })
    const resend = bien.mock.calls.find(([u]) => u === 'https://api.resend.com/emails')!
    expect(JSON.parse(String(resend[1].body)).html).toContain(`${ORIGEN}/#/invitacion/${ID}/${TOKEN}`)
    expect(JSON.stringify(bien.mock.calls.map(([, i]) => i.body))).not.toContain('servicio-de-prueba')
    olvidarInvitaciones()
  })
})

describe('la app manda el token y recuerda a dónde salió el correo', () => {
  it('tokenDeLink saca el token del link de invitación (y nada de otros links)', () => {
    expect(tokenDeLink(`${ORIGEN}/#/invitacion/${ID}/${TOKEN}`)).toBe(TOKEN)
    expect(tokenDeLink(`${ORIGEN}/#/alquiler/${ID}`)).toBeUndefined(); expect(tokenDeLink(undefined)).toBeUndefined()
  })
  it('envía el token; si el correo salió, guarda el correo; si falla, no', async () => {
    vi.stubEnv('VITE_CORREOS', '1')
    const f = vi.fn(async () => new Response('{"enviado":true}', { status: 200 })); vi.stubGlobal('fetch', f)
    expect(await enviarInvitacionUnaVez(ID, 'luis.demo@lockumi.com', 'Ana', TOKEN)).toBe(true)
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toMatchObject({ tipo: 'invitacion', token: TOKEN, alquiler: ID })
    expect(correoInvitacionEnviado(ID)).toBe('luis.demo@lockumi.com')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"x"}', { status: 502 })))
    expect(await enviarInvitacionUnaVez('otro', 'luis.demo@lockumi.com', 'Ana', TOKEN)).toBe(false)
    expect(correoInvitacionEnviado('otro')).toBeNull()
    vi.unstubAllGlobals(); vi.stubGlobal('localStorage', L.s); vi.stubGlobal('sessionStorage', S.s)
  })
})

describe('la ruta de la invitación sobrevive al inicio de sesión', () => {
  const R = `/invitacion/${ID}/${TOKEN}`
  it('se guarda en sessionStorage y en localStorage, se usa una vez y se borra', () => {
    guardarRegreso(R, 1000); expect(tomarRegreso(2000)).toBe(R); expect(tomarRegreso(3000)).toBe('/')
    expect(L.m.size + S.m.size).toBe(0)
  })
  it('si el regreso de Google o Apple llega sin sessionStorage (otra pestaña), sirve el respaldo por 30 minutos', () => {
    guardarRegreso(R, 0); S.m.clear(); expect(tomarRegreso(29 * 60_000)).toBe(R)
    guardarRegreso(R, 0); S.m.clear(); expect(tomarRegreso(31 * 60_000)).toBe('/')
  })
  it('solo guarda rutas de invitación (nada de otras direcciones)', () => {
    guardarRegreso('/crear'); guardarRegreso('//otro.com'); expect(L.m.size + S.m.size).toBe(0)
    expect(esRutaInvitacion(R)).toBe(true); expect(esRutaInvitacion(`/invitacion/${ID}/corto`)).toBe(false)
  })
})

describe('pantallas', () => {
  it('sin sesión, Entrar dice el texto de Legal (sin el nombre del dueño) y conserva Google, Apple y correo', async () => {
    expect(TEXTO_INVITADO_SIN_SESION).toBe('Te invitaron a un alquiler en Lockumi. Inicia sesión para ver y aceptar la invitación.')
    const { Login } = await import('../../screens/Login')
    const html = renderToStaticMarkup(<Login onOk={() => {}} titulo={TEXTO_INVITADO_SIN_SESION} />)
    expect(html).toContain(TEXTO_INVITADO_SIN_SESION); expect(html).not.toContain('El depósito de tu alquiler, protegido')
    expect(html).toContain('Con Google, Apple o tu correo. Sin contraseñas.')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toContain('El depósito de tu alquiler, protegido')
  })
  it('App: sin sesión en #/invitacion/… muestra ese texto y guarda la ruta; al entrar vuelve ahí (nunca a Inicio)', async () => {
    const app = (await import('../../App.tsx?raw')).default
    expect(app).toMatch(/const invitado = !u && esRutaInvitacion\(r\)/); expect(app).toMatch(/if \(invitado\) guardarRegreso\(r\)/)
    expect(app).toMatch(/titulo=\{invitado \? TEXTO_INVITADO_SIN_SESION : undefined\}/); expect(app).toMatch(/location\.hash = volver\(\)/)
  })
  const A: Alquiler = { id: ID, direccion: 'Ejemplo · Casa demo', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-05-01', reglas: [], duenoEmail: 'demo@lockumi.com',
    inquilinoEmail: 'luis.demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0,
    dosPersonas: true, miRol: 'dueno', inquilinoUnido: false, invitacion: `${ORIGEN}/#/invitacion/${ID}/${TOKEN}` }
  it('dueño, con el correo enviado: «Te enviamos el enlace a …», el link, Copiar y WhatsApp', async () => {
    L.m.set('lk:invitacion-correo:' + ID, 'luis.demo@lockumi.com')
    const { Invitacion } = await import('../../screens/Detalle')
    const html = renderToStaticMarkup(<Invitacion a={A} />)
    expect(html).toContain(textoEnlaceEnviado('luis.demo@lockumi.com'))
    expect(textoEnlaceEnviado('x@y.com')).toBe('Te enviamos el enlace a x@y.com. Si quieres, también puedes copiarlo y compartirlo por WhatsApp.')
    expect(html).not.toContain('Envía este link a'); expect(html).toContain('Copiar link'); expect(html).toContain(BOTON_WHATSAPP)
    expect(html).toContain('href="https://wa.me/?text=' + encodeURIComponent(A.invitacion!).replace(/&/g, '&amp;') + '"')
  })
  it('dueño, sin correo enviado: solo el link con Copiar y WhatsApp (sin «Envía este link a…»)', async () => {
    const { Invitacion } = await import('../../screens/Detalle')
    const html = renderToStaticMarkup(<Invitacion a={A} />)
    expect(html).not.toContain('Te enviamos el enlace'); expect(html).not.toContain('Envía este link a')
    expect(html).toContain('Copiar link'); expect(html).toContain(BOTON_WHATSAPP)
  })
})

describe('reglas: el inquilino las ve, no las edita (UI)', () => {
  it('en el contrato del inquilino las reglas son solo texto (sin campos ni botones)', async () => {
    const { Documento } = await import('../../screens/ContratoDoc')
    const a: Alquiler = { id: ID, direccion: 'Ejemplo · Casa demo', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-05-01', reglas: ['No fumar dentro de la casa'], duenoEmail: 'demo@lockumi.com',
      inquilinoEmail: 'luis.demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true, miRol: 'inquilino', inquilinoUnido: true }
    const html = renderToStaticMarkup(<Documento a={a} impresion />)
    const reglas = html.match(/<ul class="ct__reglas">[\s\S]*?<\/ul>/)?.[0] ?? ''
    expect(reglas).toContain('No fumar dentro de la casa'); expect(reglas).not.toMatch(/<input|<button|<textarea|contenteditable/)
  })
  it('la pantalla de la invitación muestra las reglas como lista, sin campos; solo Crear (el dueño) las edita', async () => {
    const inv = (await import('../../screens/Invitacion.tsx?raw')).default, det = (await import('../../screens/Detalle.tsx?raw')).default
    expect(inv).toMatch(/<ul className="reglas">\{d\.reglas\.map\(\(r, i\) => <li key=\{i\}>\{r\}<\/li>\)\}<\/ul>/)
    expect(det).not.toMatch(/setReglas|aria-label="Nueva regla"/); expect(inv).not.toMatch(/setReglas|Nueva regla/)
  })
})
