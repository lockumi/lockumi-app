import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// localStorage mínimo para el entorno de pruebas (node)
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { erroresTrasCambio, ERRORES_INICIALES, validarAceptaciones, guardarAceptacion, leerAceptacion, aceptoVersion, conAceptacion, K_ACEPTACION, MSJ_SIN_TERMINOS, MSJ_SIN_PRIVACIDAD } = await import('../aceptacion')
const { TERMINOS, PRIVACIDAD, DOCS, rutaLegal, CONSENTIMIENTO_PRIVACIDAD, leerDoc } = await import('../documentos')
const { PaginaLegal } = await import('../PaginaLegal')
const { Login } = await import('../../screens/Login')
const { aHtml } = await import('../markdown')

beforeEach(() => mem.clear())

describe('casillas obligatorias de Términos y Privacidad', () => {
  it('sin marcar ninguna no se puede continuar y el error explica qué hacer', () => {
    const e = validarAceptaciones({ terminos: false, privacidad: false })
    expect(e.terminos).toBe(MSJ_SIN_TERMINOS); expect(e.privacidad).toBe(MSJ_SIN_PRIVACIDAD)
    expect(e.terminos).toMatch(/marca la casilla «Acepto los Términos y condiciones»/)
  })
  it('con una sola marcada tampoco se puede continuar', () => {
    expect(validarAceptaciones({ terminos: true, privacidad: false })).toEqual({ privacidad: MSJ_SIN_PRIVACIDAD })
    expect(validarAceptaciones({ terminos: false, privacidad: true })).toEqual({ terminos: MSJ_SIN_TERMINOS })
  })
  it('con las dos marcadas se puede continuar', () => { expect(validarAceptaciones({ terminos: true, privacidad: true })).toEqual({}) })

  it('al cargar la pantalla no hay errores visibles', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(ERRORES_INICIALES).toEqual({})
    expect(html).not.toContain('casilla-legal__error'); expect(html).not.toContain('casilla-legal--error')
    expect(html).not.toContain('role="alert"'); expect(html).not.toContain('aria-invalid="true"')
    expect(html).not.toContain(MSJ_SIN_TERMINOS); expect(html).not.toContain(MSJ_SIN_PRIVACIDAD)
  })
  it('tras tocar Entrar sin marcar, al marcar una casilla desaparece solo su error', () => {
    const e = validarAceptaciones({ terminos: false, privacidad: false })
    const e2 = erroresTrasCambio(e, 'terminos', true)
    expect(e2).toEqual({ privacidad: MSJ_SIN_PRIVACIDAD })
    expect(erroresTrasCambio(e2, 'privacidad', true)).toEqual({})
    expect(erroresTrasCambio({}, 'terminos', false)).toEqual({}) // desmarcar no muestra errores; solo "Entrar" los muestra
  })
  it('la pantalla de entrada muestra las dos casillas sin marcar, obligatorias y con sus enlaces', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*id="acepto-terminos"[^>]*required=""/)
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*id="acepto-privacidad"[^>]*required=""/)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/)
    expect(html).toContain('Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos y condiciones</a>')
    expect(html).toContain('<a href="/privacidad" target="_blank" rel="noopener">Aviso de privacidad de la app</a>')
  })
  it('si ya aceptó estas versiones, las casillas aparecen marcadas; con otra versión, no', () => {
    guardarAceptacion('terminos', TERMINOS.version); guardarAceptacion('privacidad', PRIVACIDAD!.version)
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toMatch(/id="acepto-terminos"[^>]*checked/)
    guardarAceptacion('terminos', 'otra-version')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).not.toMatch(/id="acepto-terminos"[^>]*checked/)
  })
  it('guarda cada aceptación con versión y fecha, y la copia al usuario', () => {
    const f = new Date('2026-10-17T20:30:00Z')
    guardarAceptacion('terminos', '1.0-demo', f); guardarAceptacion('privacidad', '1.0-demo', f)
    expect(JSON.parse(mem.get(K_ACEPTACION.terminos)!)).toEqual({ version: '1.0-demo', fecha: '2026-10-17T20:30:00.000Z' })
    expect(leerAceptacion('privacidad')).toEqual({ version: '1.0-demo', fecha: '2026-10-17T20:30:00.000Z' })
    expect(aceptoVersion('terminos', '1.0-demo')).toBe(true); expect(aceptoVersion('terminos', '2.0')).toBe(false)
    const u = conAceptacion({ email: 'a@b.cr', nombre: 'a', metodo: 'correo' })
    expect(u.terminos?.version).toBe('1.0-demo'); expect(u.privacidad?.fecha).toBe('2026-10-17T20:30:00.000Z')
  })
})

describe('textos legales', () => {
  // LEGAL: revisado (24/10) · Términos 1.6-demo (cláusula 6.7); ronda 7: Aviso de privacidad 1.6-demo (Freighter).
  const VER: Record<string, [string, string]> = { terminos: ['1.6-demo', '24 de octubre de 2026'], privacidad: ['1.6-demo', '24 de octubre de 2026'] }
  it('carga Términos 1.6-demo y Privacidad 1.6-demo con su fecha, tomadas del texto', () => {
    for (const d of [TERMINOS, PRIVACIDAD!]) { expect(d.version).toBe(VER[d.slug][0]); expect(d.fecha).toBe(VER[d.slug][1]); expect(d.metaEnTexto).toBe(true) }
    expect(Object.keys(DOCS).sort()).toEqual(['privacidad', 'terminos'])
  })
  it('la página muestra la versión y la fecha una sola vez, y el aviso de una línea de arriba', () => {
    for (const slug of ['terminos', 'privacidad']) {
      const html = renderToStaticMarkup(<PaginaLegal slug={slug} />)
      expect(html.split(VER[slug][0]).length - 1).toBe(1); expect(html).not.toContain('1.5-demo'); expect(html).not.toContain('1.4-demo'); expect(html).not.toContain('1.3-demo'); expect(html).not.toContain('1.2-demo'); expect(html).not.toContain('1.1-demo')
      expect(html.split(VER[slug][1]).length - 1).toBe(1)
      expect(html).toMatch(/<blockquote><p>Versión demo[^<]*\. Este texto puede actualizarse; te avisaremos de los cambios importantes\.<\/p><\/blockquote>/)
      expect(html).toContain('Pendiente de revisión por abogado')
    }
  })
  it('la nota interna no se publica', () => { for (const d of [TERMINOS, PRIVACIDAD!]) expect(d.html).not.toMatch(/nota interna/i) })
  it('los textos legales no traen corchetes ni repiten la línea de versión', () => {
    for (const d of [TERMINOS, PRIVACIDAD!]) {
      const crudo = renderToStaticMarkup(<PaginaLegal slug={d.slug} />).replace(/<[^>]+>/g, '')
      expect(crudo).not.toMatch(/[\[\]]/)
      expect(crudo.match(/Versión \d/g)?.length).toBe(1)
    }
  })
  it('el consentimiento de privacidad es un texto fijo de la app', () => {
    const c = CONSENTIMIENTO_PRIVACIDAD
    expect(c.antes + c.enlace + c.despues).toBe('Acepto el Aviso de privacidad de la app y autorizo que Lockumi trate mis datos y los transfiera a Supabase, Vercel, Cavos y Trustless Work, dentro y fuera de Costa Rica, para usar la demo. Entiendo que la demo funciona en la red de prueba de Stellar, con tokens sin valor y sin dinero real, y que la dirección de mi billetera, los montos y las fechas quedan registrados en esa red, que es pública y no se puede borrar.')
  })
  it('una aceptación de la versión 1.3-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.3-demo'); guardarAceptacion('privacidad', '1.3-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('las dos casillas guardan { version, fecha }: Términos 1.6-demo y Privacidad 1.6-demo', () => {
    const ahora = new Date('2026-10-18T18:00:00Z')
    expect(guardarAceptacion('terminos', TERMINOS.version, ahora)).toEqual({ version: '1.6-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(guardarAceptacion('privacidad', PRIVACIDAD!.version, ahora)).toEqual({ version: '1.6-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(JSON.parse(localStorage.getItem('lockumi.privacidad.consentimiento')!)).toEqual({ version: '1.6-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(true)
  })
  it('una aceptación 1.5-demo ya no cuenta para ninguno de los dos: las dos casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  // LEGAL: revisado (24/10) · ronda 7: quien ya aceptó Términos 1.6-demo (vista previa) solo vuelve a marcar Privacidad
  it('con Términos 1.6-demo y Privacidad 1.5-demo, solo la casilla de privacidad sale sin marcar', () => {
    guardarAceptacion('terminos', '1.6-demo'); guardarAceptacion('privacidad', '1.5-demo')
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('ronda 7: textos exactos de Legal sobre quién firma (Términos 3.1, 5.3, 5.5.1 b; Privacidad Freighter)', () => {
    const t = TERMINOS.html.replace(/<[^>]+>/g, ''), pr = PRIVACIDAD!.html.replace(/<[^>]+>/g, '')
    // LEGAL: revisado (24/10) · 5.3 ronda 9: texto exacto de Legal, un literal por línea
    for (const l of [
      '5.3 Firmas. Lockumi no tiene las llaves de tu propia billetera (Cavos o Freighter). Sí guarda en su servidor las llaves de las cuentas de prueba rotuladas: la del dueño de prueba y, si usas el USDC de prueba que te da Lockumi, la de tu cuenta de inquilino de prueba (cláusula 4.1). Lockumi firma con ellas cuando alguien toca el botón en la app. Quién firma cada paso en la red de prueba:',
      'a) Depósito: si usas tu propio USDC de prueba, lo firmas tú con tu billetera. Si no, Lockumi lo firma con tu cuenta de inquilino de prueba (4.1 b). Si falla la firma de tu billetera, Lockumi puede firmarlo con una cuenta de inquilino de prueba de respaldo (4.1 c).',
      'b) Compra de USDC de prueba: la firmas tú con tu billetera. Abrir la línea de USDC en tu billetera no mueve fondos; según la billetera, puede pedirte o no que lo confirmes.',
      'c) Aprobación de la devolución: en la fase 1, Lockumi la firma con la cuenta del dueño de prueba (4.2 a). En la fase 2, la firmará la billetera del dueño.',
      'd) Liberación: la firma la cuenta de plataforma de Lockumi, solo después de la aprobación y solo a favor del inquilino (4.1.1 y 4.2 b). Si no hay reclamo, después del plazo la devolución se ejecuta la próxima vez que alguien abre el alquiler, sin que nadie más tenga que aprobarla. Si nadie aprobó antes, en ese momento Lockumi firma la aprobación con la cuenta del dueño de prueba.',
      'e) Reclamos: en la demo, el reclamo abre una disputa en la red de prueba y bloquea el depósito de prueba. Lockumi la firma con la cuenta del dueño de prueba, que es distinta de la cuenta de Lockumi que resuelve disputas (4.2 c). La persona mediadora es simulada: el reparto se elige con el botón «Resolver el reclamo (simulación)» (cláusula 6.7) y lo ejecuta en la red la cuenta de Lockumi que resuelve disputas. En un servicio real, ni la persona mediadora ni una sugerencia automática decidirán: si no hay acuerdo, el depósito seguirá bloqueado y las partes podrán ir a conciliación, a arbitraje si ambas lo firman o a los tribunales.',
      'f) Cavos permite que una app firme pagos pequeños con tu billetera sin pedirte confirmación, dentro de un límite por transacción y por día. Lockumi no usa esa función.',
    ]) expect(t).toContain(l)
    expect(t).not.toContain('la cuenta de Lockumi firma por ti en la red de prueba, incluido el depósito')
    // LEGAL: revisado (24/10) · ronda 9b: 2.2 b) (opción a: el reclamo y el reparto sí van a la red de prueba)
    expect(t).toContain('b) El depósito, la aprobación, la liberación, el reclamo y el reparto del reclamo sí se registran en la red de prueba. Las reglas de retención y de devolución y la persona mediadora son simulados y aparecen rotulados como &quot;Demo&quot;. En la demo, el reparto de un reclamo se elige con un botón (cláusula 6.7). Nada de esto tiene efecto legal.')
    // LEGAL: revisado (24/10) · ronda 9b: 6.3 f) (todo el depósito queda bloqueado mientras hay un reclamo)
    expect(t).toContain('f) la parte no reclamada, cuando se cierre el reclamo. En la demo, mientras hay un reclamo, todo el depósito de prueba queda bloqueado en la cuenta segura, porque la cuenta segura que usa Lockumi no permite liberarlo por partes.'); expect(t).not.toContain('la parte no reclamada, de inmediato')
    // LEGAL: revisado (24/10): 2.1 sin «protegido»
    expect(t).toContain('2.1 app.lockumi.com es una demostración de cómo funcionaría un depósito de garantía de alquiler guardado con reglas claras.'); expect(t).not.toMatch(/protegid/i)
    expect(t).not.toContain('en la fase 1 no hay reclamos en la red'); expect(t).not.toContain('los reclamos y la persona mediadora son simulados')
    expect(t).toContain('3.1 Para entrar, usas el servicio de inicio de sesión de Cavos (cláusula 5) con Google, Apple o tu correo y un código. Con Cavos se crea tu billetera en la red de prueba. Si usas tu propia billetera, con ella firmas el depósito como inquilino; en el modo por defecto, lo firma Lockumi con tu cuenta de inquilino de prueba (ver 5.3). Debes ser mayor de 18 años.')
    expect(t).toContain('b) cuando usas Freighter, las transacciones que firma tu billetera (el depósito y la compra de USDC de prueba) las confirmas tú en la extensión; las demás las firma Lockumi (ver 5.3), y Lockumi nunca ve tu clave privada;')
    expect(t).not.toContain('con la que firmas el depósito como inquilino.'); expect(t).not.toContain('cada transacción la firmas tú')
    expect(pr).toContain('Si usas Freighter, las transacciones de tu billetera las confirmas tú en la extensión. Las demás acciones del contrato las firma Lockumi (ver la cláusula 5.3 de los Términos) en la red de prueba. Lockumi nunca ve tu clave privada.')
    expect(pr).not.toContain('Las transacciones las firmas tú'); expect(PRIVACIDAD!.html).not.toContain('LEGAL:')
  })
  it('6.7 Desacuerdo: texto de Legal (24/10); la mediación no decide y no hay persona mediadora que decida en la demo', () => {
    const t = TERMINOS.html.replace(/<[^>]+>/g, '')
    expect(t).toContain('6.7 Desacuerdo. En la demo, si el inquilino no acepta el reclamo, el caso pasa a una mediación simulada y el reparto se elige con el botón «Resolver el reclamo (simulación)». En un servicio real, una persona mediadora neutral les ayudaría a buscar un acuerdo, sin decidir por las partes. Si no hay acuerdo, el depósito seguiría guardado y cualquiera de las partes podría acudir a los tribunales de Costa Rica.')
    expect(t).not.toContain('decide un reparto'); expect(TERMINOS.html).not.toContain('LEGAL:')
  })
  // LEGAL: revisado (24/10) · ronda 3: 4.1 a) con el texto de Legal; 5.3 sin cambios (ver docs/alertas.md, «Legal, ronda 3»).
  it('4.1 a) ronda 3 de Legal: el escrow y el reparto de Lockumi si hay reclamo; 5.3 de la ronda 7', () => {
    const t = TERMINOS.html.replace(/<[^>]+>/g, '')
    expect(t).toContain('tú firmas el depósito con tu billetera. Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.')
    expect(t).not.toContain('Lockumi no custodia tus tokens de prueba')
    // LEGAL: revisado (24/10) · ronda 7: 5.3 «Firmas.» (texto exacto en el test de la ronda 7, sin montos)
    expect(t).toContain('5.3 Firmas. Lockumi no tiene las llaves de tu propia billetera'); expect(t).not.toContain('Lockumi no usa esa función: el depósito y cada acción')
    expect(t).not.toContain('ni Cavos ni Lockumi pueden firmar por ti'); expect(t.slice(t.indexOf('5.3 '), t.indexOf('5.4 '))).not.toMatch(/\d+\s*(USDC|XLM)/)
    expect(TERMINOS.version).toBe('1.6-demo'); expect(TERMINOS.html).not.toContain('LEGAL:')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toContain('Ni el dueño ni el inquilino pueden liberarlo solos.')
  })
  it('una aceptación de la versión 1.2-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.2-demo'); guardarAceptacion('privacidad', '1.2-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('la casilla de privacidad muestra el consentimiento completo con el enlace al aviso', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toContain('<a href="/privacidad" target="_blank" rel="noopener">Aviso de privacidad de la app</a>' + CONSENTIMIENTO_PRIVACIDAD.despues)
  })
  it('una aceptación de la versión 1.1-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.1-demo'); guardarAceptacion('privacidad', '1.1-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('una aceptación de la versión anterior (1.0-demo) no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.0-demo'); guardarAceptacion('privacidad', '1.0-demo')
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('rutas', () => { expect(rutaLegal('/terminos')).toBe('terminos'); expect(rutaLegal('/terminos/')).toBe('terminos'); expect(rutaLegal('/privacidad')).toBe('privacidad'); expect(rutaLegal('/')).toBe(null); expect(rutaLegal('/crear')).toBe(null) })
  it('metadatos y Markdown', () => {
    expect(leerDoc('x', '---\nversion: 2\nfecha: 2026-10-17\n---\n# T').version).toBe('2')
    expect(aHtml('# Hola <b>\n- a\n  - b\n- c')).toBe('<h2 id="hola-b">Hola &lt;b&gt;</h2>\n<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>')
    expect(aHtml('[x](javascript:alert(1))')).toContain('href="#"')
  })
})
