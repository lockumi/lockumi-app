// Paso 19 · Revisión de Legal del PR #26 (legal/revision-pr26-legal.md, 25/10/2026, 3:02 p. m.): VERSIÓN, TEXTOS, REGLAS QUE NO SE
// CUMPLEN y MENORES. Textos literales de Legal.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>(), ses = new Map<string, string>()
const almacen = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)) }, removeItem: (k: string) => { m.delete(k) },
  clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } })
vi.stubGlobal('localStorage', almacen(mem)); vi.stubGlobal('sessionStorage', almacen(ses))
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const fs = async () => await import(['node', 'fs'].join(':'))
const leerArchivo = async (f: string) => (await fs()).readFileSync(new URL('../../../' + f, import.meta.url), 'utf8') as string
const legal = async (f: string, rep = true) => { const { condicional } = await import('../../legal/condicional')
  return condicional((await fs()).readFileSync(new URL('../../legal/v17/' + f, import.meta.url), 'utf8') as string, { 'dos-personas': true, correos: false, reputacion: rep }) }
beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1')
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } }) })

describe('VERSIÓN: 1.10-demo con la fecha real de encendido (una sola constante)', () => {
  it('VERSION_TEXTOS = «{versión} · {fecha}»; la fecha es una sola constante, a fijar al encender', async () => {
    const v = await import('../../legal/version17'), { VERSION_TEXTOS } = await import('../consentimiento')
    // Legal (PR #33): la edición de la cuenta es ahora la 1.11-demo, con la fecha del día de la publicación (fecha-v111.ts); la 1.10-demo
    // queda archivada con su fecha real de encendido (EDICION_V110, /terminos-1-10).
    // Legal (revisión de c97585b): la vigente pasa a la 1.12-demo (fecha-v112.ts); la 1.11-demo queda archivada (EDICION_V111, /terminos-1-11).
    // Legal (26/10/2026): la vigente pasa a la 1.13-demo (fecha-v113.ts); la 1.12-demo queda archivada (EDICION_V112, /terminos-1-12).
    // Legal (26/10/2026, 9:43 p. m.): la vigente pasa a la 1.14-demo (fecha-v114.ts); la 1.13-demo queda archivada (EDICION_V113, /terminos-1-13).
    expect(v.V_REPUTACION).toBe('1.14-demo'); expect(v.EDICION_REPUTACION).toBe(`1.14-demo · ${v.FECHA_V114}`); expect(v.EDICION_V113).toBe(`1.13-demo · ${v.FECHA_V113}`); expect(v.EDICION_V112).toBe(`1.12-demo · ${v.FECHA_V112}`); expect(v.EDICION_V111).toBe(`1.11-demo · ${v.FECHA_V111}`)
    expect(v.EDICION_V110).toBe(`1.10-demo · ${v.FECHA_ENCENDIDO_REPUTACION}`)
    expect(VERSION_TEXTOS).toBe(v.EDICION_REPUTACION)
    for (const f of ['src/reputacion/consentimiento.ts', 'src/reputacion/textos.ts', 'src/legal/condicional.ts']) { expect(await leerArchivo(f)).not.toContain(v.FECHA_ENCENDIDO_REPUTACION); expect(await leerArchivo(f)).not.toContain(v.FECHA_V111); expect(await leerArchivo(f)).not.toContain(v.FECHA_V112) }
  })
  it('con la reputación, el Aviso y los Términos dicen la 1.10-demo (nunca la etiqueta 1.7-demo ya publicada); apagada, siguen en 1.7-demo', async () => {
    const { EDICION_REPUTACION, EDICION_V17 } = await import('../../legal/version17'), { edicionDe, versionVigente } = await import('../../legal/versiones')
    // Apagada: la edición de lo encendido (desde master, con dos personas, la 1.9-demo; src/legal/versiones.ts).
    const apagada = edicionDe(versionVigente({ 'dos-personas': true, correos: false, reputacion: false }))!
    for (const f of ['privacidad.md', 'terminos.md']) {
      const on = await legal(f), off = await legal(f, false)
      expect(on).toContain(`**Versión ${EDICION_REPUTACION}**`); expect(on).not.toContain(EDICION_V17); expect(on).not.toContain(apagada)
      expect(off).toContain(`**Versión ${apagada}**`)
    }
  })
  it('aceptar los Términos con la reputación encendida guarda la edición de la cuenta (1.13-demo: la casilla incluye el perfil, sin pantalla previa)', async () => {
    const { guardarAceptacion } = await import('../../legal/aceptacion'), { V17, EDICION_REPUTACION } = await import('../../legal/version17')
    expect(guardarAceptacion('terminos', V17).edicion).toBe(EDICION_REPUTACION)
    vi.stubEnv('VITE_REPUTACION', '0'); vi.resetModules()
    const a = await import('../../legal/aceptacion'), w = await import('../../legal/version17'); expect(a.guardarAceptacion('terminos', w.V17).edicion).toBe(w.EDICION_V17)
  })
})

describe('TEXTOS (literales de Legal)', () => {
  it('sin «Ajustes»: la ubicación es «Tu perfil en Lockumi»', async () => {
    const p = await legal('privacidad.md'), t = await legal('terminos.md')
    expect(p + t).not.toContain('Ajustes')
    expect(p).toContain('(en «Tu perfil en Lockumi» › «Eliminar mi cuenta», o por correo a business.applockumi@gmail.com)')
    expect(p).toContain('puedes ver y descargar tus datos de reputación en «Tu perfil en Lockumi» › «Ver mis datos de reputación» › «Descargar mis datos»,')
    expect(t).toContain('puedes hacerlo gratis en «Tu perfil en Lockumi» › «Eliminar mi cuenta» o por correo a business.applockumi@gmail.com')
  })
  it('{n}: nunca sale «{n}» ni «1 alquileres»; Cómo se calcula y Nuevos usan el texto de Legal', async () => {
    const LEGAL_N = 'Todas las personas empiezan con 5,0. Lo mostramos desde el 3.er alquiler cerrado; antes se ve «Nuevo en Lockumi» con la cantidad de alquileres cerrados (por ejemplo, «Nuevo en Lockumi · 1 alquiler cerrado»).'
    const { COMO_SE_CALCULA, TEXTO_NUEVOS } = await import('../textos')
    expect(COMO_SE_CALCULA.puntos[0]).toBe(LEGAL_N)
    expect(TEXTO_NUEVOS.dueno.parrafos[0]).toContain('con tu nombre visible, «Nuevo en Lockumi» con la cantidad de alquileres cerrados (por ejemplo, «Nuevo en Lockumi · 1 alquiler cerrado») y tus insignias')
    const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú')
    aceptarRep01('o@x.cr', ['x'])   // la otra parte también tiene perfil (si no, el alquiler no cuenta: Legal, 25/10)
    mem.set('lockumi.alquileres.v3', JSON.stringify([{ id: 'c1', direccion: 'Casa 1', monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [], duenoEmail: U.email, inquilinoEmail: 'o@x.cr',
      estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, resultado: { inquilino: 20, dueno: 0, via: 'acuerdo', fecha: '2026-06-01T12:00:00Z' } }]))
    for (const r of ['/perfil/dueno', '/perfil/calculo', '/perfil/dueno/aparecer']) { const t = texto(await pantalla(r)); expect(t).not.toContain('{n}'); expect(t).not.toMatch(/\b1 alquileres/) }
    expect(texto(await pantalla('/perfil/dueno'))).toContain('Nuevo en Lockumi · 1 alquiler cerrado')
  })
  it('textos de Producto', async () => {
    const { UI } = await import('../textos'), { ENTRADA } = await import('../entrada-textos')
    expect(UI.revAcuse('1 de junio de 2026', '10:00 a. m.', '8 de junio de 2026')).toBe('Recibimos tu pedido el 1 de junio de 2026 a las 10:00 a. m. (hora de Costa Rica). Te respondemos por escrito a más tardar el 8 de junio de 2026. Mientras tanto, ese alquiler no cuenta y tu puntaje público dice «En revisión».')
    expect(UI.cantonAyuda).toBe('Mostramos tu cantón, o tu provincia si en tu cantón hay menos de 10 personas. Nunca el barrio ni la dirección.')
    expect(UI.datosNota).toBe('Último paso: estos datos se publican en tu perfil.')
    expect(ENTRADA.texto).toBe('Así se ve tu perfil público: tus insignias y, desde tu 3.er alquiler cerrado, tu puntaje.')
  })
  it('nombre visible: el nombre (también compuesto) y la inicial del apellido; el error de largo solo por largo', async () => {
    const { validarNombre } = await import('../consentimiento'), { UI } = await import('../textos')
    expect(validarNombre('Laura V.')).toBeNull(); expect(validarNombre('María-José R.')).toBeNull()
    expect(validarNombre('Ana María V.')).toBeNull(); expect(validarNombre('Ana María Vargas')).toBe(UI.errNombre); expect(validarNombre('Laura Vargas')).toBe(UI.errNombre); expect(validarNombre('Laura')).toBe(UI.errNombre)
    expect(validarNombre('Maximilianoalejandrotomasito V.')).toBe(UI.errNombreLargo)
  })
})

describe('REGLAS QUE NO SE CUMPLÍAN', () => {
  it('1) sin pantalla previa (Legal, 26/10/2026): nada se guarda en la sesión del navegador antes de entrar', async () => {
    const p = await import('../Pantallas') as Record<string, unknown>, c = await import('../consentimiento') as Record<string, unknown>
    expect(p.Previa).toBeUndefined(); for (const k of ['aceptarPrevia', 'previa', 'vincularPrevia', 'entrarSinAceptar', 'quiereEntrar']) expect(c[k], k).toBeUndefined()
    await pantalla('/'); expect(ses.size).toBe(0); expect([...mem.keys()].filter(k => k.includes('previa'))).toEqual([])
  })
  it('2) el perfil se registra solo si la cuenta aceptó los Términos 1.13-demo (la casilla nombra el perfil); sin volver a aceptar', async () => {
    const c = await import('../consentimiento'), { default: R } = await import('../Pantallas'), { V_REPUTACION } = await import('../../legal/version17')
    renderToStaticMarkup(<R u={{ ...U, email: 'vieja@x.cr', terminos: { version: '1.12-demo', fecha: '2026-10-26T06:00:00.000Z' } }} r="/" salir={() => {}}>x</R>)
    expect(c.aceptoRep01('vieja@x.cr')).toBe(false)
    renderToStaticMarkup(<R u={{ ...U, email: 'nueva@x.cr', terminos: { version: V_REPUTACION, fecha: '2026-10-27T06:00:00.000Z' } }} r="/" salir={() => {}}>x</R>)
    expect(c.aceptoRep01('nueva@x.cr')).toBe(true)
  })
  it('2b) una cuenta con alquileres que acepta la 1.13-demo recibe perfil, y sus alquileres cerrados antes no cuentan (Términos 15.1)', async () => {
    const { alquileresDeReputacion } = await import('../puntaje')
    const a = (id: string, fecha: string) => ({ id, duenoEmail: U.email, inquilinoEmail: 'o@x.cr', estado: 'cerrado', resultado: { via: 'acuerdo', fecha, dueno: 0, inquilino: 20 } }) as never
    const desde = (e: string) => e === U.email ? '2026-10-27T06:00:00.000Z' : '2026-01-01T00:00:00.000Z'
    const xs = alquileresDeReputacion([a('antes', '2026-06-01T12:00:00Z'), a('despues', '2026-11-01T12:00:00Z')], U.email, 'dueno', () => true, desde)
    expect(xs.map((x: { id: string }) => x.id)).toEqual(['despues'])
  })
  it('3) robots.txt existe y se sirve antes del rewrite; X-Robots-Tag noindex, nofollow en las rutas de perfil', async () => {
    const r = await leerArchivo('public/robots.txt'); expect(r).toMatch(/^User-agent: \*$/m); expect(r).toMatch(/^Disallow: \/perfil$/m)
    expect(r).toMatch(/^[\x00-\x7F]*$/)   // solo ASCII: se sirve como text/plain sin charset y los acentos se verían rotos
    const v = JSON.parse(await leerArchivo('vercel.json')) as { rewrites: { source: string }[]; headers: { source: string; headers: { key: string; value: string }[] }[] }
    const re = new RegExp('^' + v.rewrites[0]!.source.replace('/((?!', '/(?:(?!') + '$')
    expect(re.test('/robots.txt')).toBe(false); expect(re.test('/alquiler/x')).toBe(true)
    const h = v.headers.filter(x => x.headers.some(y => y.key === 'X-Robots-Tag' && y.value === 'noindex, nofollow')).map(x => x.source)
    expect(h).toEqual(expect.arrayContaining(['/perfil', '/perfil/:path*']))
  })
  it('4) perfil y tarjetas con zonaVitrina: provincia si el cantón tiene menos de 10 personas', async () => {
    const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Liberia')
    const t = texto(await pantalla('/perfil/dueno')); expect(t).toContain('Guanacaste (provincia)'); expect(t).not.toContain('Liberia')
    guardarDatos(U.email, 'Demo D.', 'Escazú'); expect(texto(await pantalla('/perfil/dueno'))).toContain('Escazú')
  })
  it('5) montos de la vitrina en «USDC de prueba»', async () => {
    const { guardarDatos, aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x']); guardarDatos(U.email, 'Demo D.', 'Escazú')
    const t = texto(await pantalla('/perfil/vitrina')); expect(t).toMatch(/Alquila desde [\d .]+ USDC de prueba al mes/); expect(t).not.toMatch(/USDC al mes/)
  })
  it('7) y 8) Aviso: «la fecha, la hora y el texto»; avisos «en la app» y, solo con correos, «y por correo»', async () => {
    const p = await legal('privacidad.md'); expect(p).toContain('Guardamos la versión, la fecha, la hora y el texto que aceptaste.')
    expect(p).toContain('te avisamos en la app cada vez que tu puntaje cambie'); expect(p).not.toContain('en la app y por correo cada vez')
    const { condicional } = await import('../../legal/condicional')
    const c = condicional((await fs()).readFileSync(new URL('../../legal/v17/privacidad.md', import.meta.url), 'utf8') as string, { 'dos-personas': true, correos: true, reputacion: true })
    expect(c).toContain('te avisamos en la app y por correo cada vez que tu puntaje cambie')
  })
})

describe('MENORES', () => {
  it('«Descargar mis datos» al eliminar incluye los dos papeles (también los de inquilino)', async () => {
    const { datosParaDescargar } = await import('../Pantallas')
    const d = datosParaDescargar(U, []) as { papeles: Record<string, unknown> }
    expect(Object.keys(d.papeles).sort()).toEqual(['dueno', 'inquilino'])
    expect(await pantalla('/perfil/eliminar')).not.toContain('href="#/perfil/dueno/datos"')
  })
  it('sin textos del perfil opcional («Hacer público mi perfil», «Tu perfil no es público.»)', async () => {
    const src = await leerArchivo('src/reputacion/textos.ts')
    for (const x of ['Hacer público mi perfil', 'Tu perfil no es público.', 'Tu perfil es público.\'', 'Listo. Tu perfil ya es público.']) expect(src).not.toContain(x)
  })
  it('REP-04: el inquilino también baja por la Regla de propuesta automática', async () => {
    const { COMO_SE_CALCULA } = await import('../textos')
    expect(COMO_SE_CALCULA.puntos.find(x => x.startsWith('**Si eres inquilino:**'))).toContain('o por la Regla de propuesta automática (cláusula 6.5.1), en las versiones donde se ofrece')
  })
})
