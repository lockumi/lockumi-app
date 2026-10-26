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
const { enviarInvitacionUnaVez, correoInvitacionEnviado, tokenDeLink, textoEnlaceEnviado, TITULO_INVITACION, SUBTITULO_INVITADO_SIN_SESION, TITULO_PLEGABLE_REGLAS, TEXTO_OTRO_CORREO, BOTON_WHATSAPP } = await import('../invitacion')
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
  it('sin sesión, Entrar es corto: título y subtítulo de Legal (sin el nombre del dueño ni «firmar»), sin beneficios; casillas y Entrar igual', async () => {
    expect(TITULO_INVITACION).toBe('Te invitaron a un alquiler'); expect(SUBTITULO_INVITADO_SIN_SESION).toBe('Inicia sesión para verlo')
    const { Login } = await import('../../screens/Login')
    const html = renderToStaticMarkup(<Login onOk={() => {}} invitacion={{ titulo: TITULO_INVITACION, subtitulo: SUBTITULO_INVITADO_SIN_SESION }} />)
    expect(html).toContain(`<h2 class="entrada-app__titulo">${TITULO_INVITACION}</h2><p class="entrada-app__sub">${SUBTITULO_INVITADO_SIN_SESION}</p>`)
    expect(html).not.toContain('El depósito de tu alquiler, protegido'); expect(html).not.toContain('class="beneficios"'); expect(html).not.toMatch(/firm/i)
    expect(html).not.toContain('demo@lockumi.com'); expect(html).not.toContain('Ana')
    expect(html).toContain('id="acepto-terminos"'); expect(html).toContain('href="/terminos"'); expect(html).toContain('>Entrar</button>')
    expect(html).toContain('Con Google, Apple o tu correo. Sin contraseñas.')
    const normal = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(normal).toContain('El depósito de tu alquiler, protegido'); expect(normal).toContain('class="beneficios"'); expect(normal).not.toContain('entrada-app__sub')
  })
  it('App: sin sesión en #/invitacion/… muestra ese texto y guarda la ruta; al entrar vuelve ahí (nunca a Inicio)', async () => {
    const app = (await import('../../App.tsx?raw')).default
    expect(app).toMatch(/const invitado = !u && esRutaInvitacion\(r\)/); expect(app).toMatch(/if \(invitado\) guardarRegreso\(r\)/)
    expect(app).toMatch(/invitacion=\{invitado \? \{ titulo: TITULO_INVITACION, subtitulo: SUBTITULO_INVITADO_SIN_SESION \} : undefined\}/); expect(app).toMatch(/location\.hash = volver\(\)/)
  })
  const A: Alquiler = { id: ID, direccion: 'Ejemplo · Casa demo', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-05-01', reglas: [], duenoEmail: 'demo@lockumi.com',
    inquilinoEmail: 'luis.demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0,
    dosPersonas: true, miRol: 'dueno', inquilinoUnido: false, invitacion: `${ORIGEN}/#/invitacion/${ID}/${TOKEN}` }
  it('dueño, con el correo enviado: «Te enviamos el enlace a …», el link, Copiar y WhatsApp', async () => {
    L.m.set('lk:invitacion-correo:' + ID, 'luis.demo@lockumi.com')
    const { Invitacion } = await import('../../screens/Detalle')
    const html = renderToStaticMarkup(<Invitacion a={A} />)
    expect(html).toContain(textoEnlaceEnviado('luis.demo@lockumi.com'))
    expect(textoEnlaceEnviado('x@y.com')).toBe('Te enviamos el enlace a x@y.com. La persona invitada tiene que entrar con ese correo. Si quieres, también puedes copiarlo y compartirlo por WhatsApp.')
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

/** Quita del HTML lo que está dentro de bloques `hidden` (lo que el navegador no muestra con los plegables cerrados). */
const aLaVista = (html: string) => { let s = html; for (;;) { const i = s.search(/<div class="cp-completo"[^>]*hidden=""/); if (i < 0) return s; const j = s.indexOf('</div>', i); s = s.slice(0, i) + s.slice(j + 6) } }

describe('plegables (Katherine/Legal 25/10, 10:15 p. m.): cerrados al entrar, título que dice qué contiene, casilla y botón a la vista', () => {
  const D = { id: ID, direccion: 'Ejemplo · Casa demo', monto: 20, inicio: '2026-11-01', fin: '2027-05-01', reglas: ['No fumar dentro de la casa', 'Sin fiestas'],
    email_dueno: 'demo@lockumi.com', email_inquilino: 'luis.demo@lockumi.com', estado: 'firmas' }
  const U = { email: 'Luis.Demo@lockumi.com ', nombre: 'Luis Ejemplo', metodo: 'correo' } as const
  it('invitación: «Reglas del alquiler» es un botón con aria-expanded="false" y aria-controls; las reglas (solo lectura) quedan ocultas', async () => {
    const { CuerpoInvitacion } = await import('../../screens/Invitacion')
    const html = renderToStaticMarkup(<CuerpoInvitacion d={D as never} u={U as never} acepta={false} setAcepta={() => {}} ocupado={false} aceptar={() => {}} />)
    expect(TITULO_PLEGABLE_REGLAS).toBe('Reglas del alquiler')
    const b = html.match(/<button type="button" class="cp-abrir" aria-expanded="false" aria-controls="([^"]+)"><span class="cp-abrir__txt">Reglas del alquiler<\/span>/)
    expect(b, 'botón del plegable').not.toBeNull()
    expect(html).toContain(`<div class="cp-completo" id="${b![1]}" role="region" aria-label="Reglas del alquiler" hidden=""><ul class="reglas"><li>No fumar dentro de la casa</li><li>Sin fiestas</li></ul></div>`)
    const vista = aLaVista(html)
    expect(vista).not.toContain('No fumar dentro de la casa'); expect(vista).not.toMatch(/<input[^>]*type="text"|<textarea|contenteditable/)
  })
  it('invitación con los plegables CERRADOS: la casilla, los enlaces a /terminos y /privacidad, «Aceptar invitación» y el depósito siguen a la vista', async () => {
    const { CuerpoInvitacion } = await import('../../screens/Invitacion')
    const vista = aLaVista(renderToStaticMarkup(<CuerpoInvitacion d={D as never} u={U as never} acepta={false} setAcepta={() => {}} ocupado={false} aceptar={() => {}} />))
    expect(vista).toMatch(/<input[^>]*type="checkbox"[^>]*id="inv-terminos"|<input[^>]*id="inv-terminos"[^>]*type="checkbox"/)
    expect(vista).toContain('href="/terminos"'); expect(vista).toContain('href="/privacidad"')
    expect(vista).toMatch(/<button type="button" class="boton boton--primario[^"]*"[^>]*>Aceptar invitación<\/button>/)
    expect(vista).toContain('<span>Depósito</span><strong>20,00 USDC de prueba</strong>')
  })
  it('alquiler (paso de firmas): el contrato va en «Contrato de alquiler (Ejemplo)», cerrado; la casilla «Leí el contrato…» y Firmar quedan a la vista', async () => {
    const { Contrato } = await import('../../screens/Detalle')
    const a: Alquiler = { id: ID, direccion: 'Ejemplo · Casa demo', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-05-01', reglas: ['No fumar dentro de la casa'], duenoEmail: 'demo@lockumi.com',
      inquilinoEmail: 'luis.demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true, miRol: 'inquilino', inquilinoUnido: true }
    const html = renderToStaticMarkup(<Contrato a={a} rol="inquilino" />)
    expect(html).toMatch(/<button type="button" class="cp-abrir" aria-expanded="false" aria-controls="[^"]+"><span class="cp-abrir__txt">Contrato de alquiler \(Ejemplo\)<small>/)
    const vista = aLaVista(html)
    expect(vista).not.toContain('No fumar dentro de la casa')   // reglas dentro del plegable cerrado
    expect(vista).toContain('Leí el contrato y estoy de acuerdo.'); expect(vista).toMatch(/<input[^>]*type="checkbox"/)
    expect(vista).toMatch(/<button[^>]*>[^<]*Firma/)
    expect(vista).toContain('<dt>Depósito</dt><dd>20,00 USDC de prueba</dd>'); expect(vista).toContain('sin dinero real')
  })
})

describe('comisión de Trustless Work junto al aviso de la red (Legal 25/10, 10:30 p. m.)', () => {
  const L = 'Trustless Work cobra una comisión del 0,3 % de cada monto que se libera.'
  it('texto literal, justo debajo de «Red de prueba de Stellar: sin dinero real.» y fuera de cualquier plegable', async () => {
    const { Fondo, TEXTO_COMISION_TW, AVISO_RED } = await import('../../ui')
    expect(TEXTO_COMISION_TW).toBe(L)
    const h = renderToStaticMarkup(<Fondo comision><p>x</p></Fondo>)
    expect(h).toContain(`<div class="aviso-red" role="note">${AVISO_RED}</div><p class="aviso-red__extra" role="note">${L}</p><p>x</p>`)
    expect(aLaVista(h)).toContain(L)
    expect(renderToStaticMarkup(<Fondo><p>x</p></Fondo>)).not.toContain(L)   // las demás pantallas no cambian
  })
  it('solo en la invitación y en la vista del alquiler (App.tsx); la pantalla sin sesión sigue corta', async () => {
    const app = (await import('../../App.tsx?raw')).default
    expect(app).toContain('return <Fondo comision={!!(inv || m)}>{skip}')
    expect(app.match(/<Fondo comision/g)).toHaveLength(1)
  })
  it('la línea del plazo de 7 días NO se agregó (el código no coincide: el plazo empieza con «Recibí la casa» o 2 días después de la entrega)', async () => {
    const ui = (await import('../../ui.tsx?raw')).default, inv = (await import('../../screens/Invitacion.tsx?raw')).default
    for (const f of [ui, inv]) expect(f).not.toContain('Cuando el inquilino entrega el inmueble')
  })
})

describe('la invitación es para otro correo (Legal 25/10, 10:10 p. m.)', () => {
  it('el texto es el literal de Legal, igual en la pantalla y en el servidor (migración 20261025230000)', async () => {
    const L = 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.'
    expect(TEXTO_OTRO_CORREO).toBe(L)
    const inv = (await import('../../screens/Invitacion.tsx?raw')).default
    expect(inv).toMatch(/u\.email\.trim\(\)\.toLowerCase\(\) !== d\.email_inquilino\?\.trim\(\)\.toLowerCase\(\)\s*\? <p className="error" role="alert">\{TEXTO_OTRO_CORREO\}<\/p>/)
    expect(inv).not.toMatch(/Esta invitación es para \{/)   // ya no se muestra el correo invitado a otra persona
    const sql = (await import('../../../supabase/migrations/20261025230000_invitacion_correo_verificado.sql?raw')).default
    expect(sql).toContain(`raise exception '${L}'`)
    expect(sql).not.toMatch(/lower\(trim\(p_email_cavos\)\)\s*<>/)
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
