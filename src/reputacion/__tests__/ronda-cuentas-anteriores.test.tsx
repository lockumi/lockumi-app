// Paso 19 · Ronda del 25/10/2026, 3:24–3:27 p. m. (Coordinador + Legal, revisión de 6e9210a):
// las cuentas que ya existían NO vuelven a aceptar nada (sin REP-13, sin tercera casilla, sin tarjeta [Ver y aceptar]); un alquiler con
// una cuenta anterior no cuenta para nadie; con un borrado pendiente no se crea ni se une a alquileres nuevos; guarda de encendido;
// edición 1.10-demo solo para cuentas nuevas; textos literales de Legal.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Usuario } from '../../types'

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
  return condicional(await leerArchivo('src/legal/v17/' + f), { 'dos-personas': true, correos: false, reputacion: rep }) }
const alq = (id: string, dueno: string, inquilino: string, x: Partial<Alquiler> = {}) => ({ id, direccion: 'Casa ' + id, monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
  duenoEmail: dueno, inquilinoEmail: inquilino, estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} },
  resultado: { inquilino: 20, dueno: 0, via: 'acuerdo', fecha: '2026-06-01T12:00:00Z' }, ...x }) as unknown as Alquiler
const sembrar = (xs: Alquiler[]) => mem.set('lockumi.alquileres.v3', JSON.stringify(xs))
beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1')
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } }) })

describe('Coordinador: las cuentas que ya existían no vuelven a aceptar nada', () => {
  it('sin REP-01, la cuenta sigue igual: ni REP-13, ni REP-01, ni tarjeta de bloqueo, en ninguna ruta', async () => {
    sembrar([alq('ya1', U.email, 'otra@x.cr')])   // cuenta anterior: ya tiene alquileres (Legal, 3:47 p. m.: sin REP-01 y sin alquileres → pantalla previa)
    for (const r of ['/', '/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc', '/alquiler/x', '/perfil', '/perfil/aceptar', '/perfil/dueno']) {
      const h = await pantalla(r), t = texto(h)
      expect(h, r).toContain('PANTALLA-DE-SIEMPRE')
      for (const x of ['Actualizamos los Términos', 'Ver cambios', 'Ver y aceptar', 'primero acepta tu perfil', 'Antes de seguir', 'Acepto lo que agrega la versión', 'type="checkbox"']) expect(t + h, r + ' · ' + x).not.toContain(x)
    }
  })
  it('se fue el código y los textos de REP-13, la tercera casilla y la tarjeta [Ver y aceptar]', async () => {
    const t = await import('../textos') as Record<string, unknown>, p = await import('../Pantallas') as Record<string, unknown>
    for (const k of ['REP13', 'BLOQUEO_NUEVO']) expect(t[k], k).toBeUndefined()
    for (const k of ['TEXTO_REP01_CUENTA', 'BloqueoNuevo']) expect(p[k], k).toBeUndefined()
    const { REP01, UI } = t as { REP01: Record<string, unknown>; UI: Record<string, unknown> }
    for (const k of ['tituloCuenta', 'casillaVersion', 'noAcuerdoCuenta']) expect(REP01[k], k).toBeUndefined()
    for (const k of ['errRep01Cuenta', 'rep13Titulo', 'ahoraNoCuenta']) expect(UI[k], k).toBeUndefined()
    const src = await leerArchivo('src/reputacion/Pantallas.tsx') + await leerArchivo('src/reputacion/textos.ts')
    for (const x of ['REP-13', 'REP13', 'ahora-no', 'cuenta = false', '/perfil/aceptar']) expect(src, x).not.toContain(x)
  })
  it('la pantalla previa queda igual (REP-01 con dos casillas) y conserva «Ya tengo cuenta: entrar»', async () => {
    const { Previa } = await import('../Pantallas'), h = renderToStaticMarkup(<Previa><p>LOGIN</p></Previa>)
    expect((h.match(/type="checkbox"/g) ?? []).length).toBe(2); expect(texto(h)).toContain('Antes de crear tu cuenta: tu perfil de reputación'); expect(texto(h)).toContain('Ya tengo cuenta: entrar')
  })
  it('Inicio: la tarjeta «Tu perfil en Lockumi» solo con REP-01 aceptado', async () => {
    const { EntradaReputacion } = await import('../Entrada')
    expect(renderToStaticMarkup(<EntradaReputacion email={U.email} />)).toBe('')
    const { aceptarRep01 } = await import('../consentimiento'); aceptarRep01(U.email, ['x'])
    expect(texto(renderToStaticMarkup(<EntradaReputacion email={U.email} />))).toContain('Tu perfil en Lockumi')
    expect(await leerArchivo('src/screens/Inicio.tsx')).toContain('<EntradaReputacion email={u.email} />')
  })
})

describe('Legal: un alquiler con una cuenta anterior no cuenta para ninguna de las dos', () => {
  it('cuenta solo si las dos partes tienen perfil de reputación', async () => {
    const { alquileresDeReputacion } = await import('../puntaje')
    const conPerfil = (e: string) => e !== 'vieja@x.cr'
    const xs = [alq('a1', U.email, 'nueva@x.cr'), alq('a2', U.email, 'vieja@x.cr'), alq('a3', 'vieja@x.cr', 'nueva@x.cr')]
    expect(alquileresDeReputacion(xs, U.email, 'dueno', conPerfil).map(a => a.id)).toEqual(['a1'])
    expect(alquileresDeReputacion(xs, 'nueva@x.cr', 'inquilino', conPerfil).map(a => a.id)).toEqual(['a1'])
    expect(alquileresDeReputacion(xs, 'vieja@x.cr', 'dueno', conPerfil)).toEqual([])
  })
  it('en el perfil: el alquiler con la cuenta anterior no suma; quien pidió eliminar su cuenta tenía perfil, así que sigue contando', async () => {
    const c = await import('../consentimiento'); c.aceptarRep01(U.email, ['x']); c.guardarDatos(U.email, 'Demo D.', 'Escazú'); c.aceptarRep01('nueva@x.cr', ['x']); c.aceptarRep01('borra@x.cr', ['x'])
    sembrar([alq('a1', U.email, 'nueva@x.cr'), alq('a2', U.email, 'vieja@x.cr'), alq('a4', U.email, 'borra@x.cr')])
    const { pedirBorrado, ejecutarBorrados, tienePerfilReputacion } = await import('../borrado')
    pedirBorrado('borra@x.cr', Date.parse('2026-06-02T12:00:00Z'), []); ejecutarBorrados(Date.parse('2026-07-01T12:00:00Z'), [])
    expect(c.aceptoRep01('borra@x.cr')).toBe(false); expect(tienePerfilReputacion('borra@x.cr')).toBe(true); expect(tienePerfilReputacion('vieja@x.cr')).toBe(false)
    expect(texto(await pantalla('/perfil/dueno'))).toContain('Nuevo en Lockumi · 2 alquileres cerrados')
  })
})

describe('Legal (d): con un borrado pendiente no se crea ni se une a alquileres nuevos', () => {
  const LIT = 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.'
  it('texto literal en «Nuevo alquiler» y en las invitaciones; el resto de la app sigue igual', async () => {
    const { BLOQUEO_BORRADO } = await import('../textos'); expect(BLOQUEO_BORRADO).toBe(LIT)
    const c = await import('../consentimiento'); c.aceptarRep01(U.email, ['x']); c.guardarDatos(U.email, 'Demo D.', 'Escazú')
    sembrar([alq('ab', U.email, 'nueva@x.cr', { estado: 'en_curso', resultado: undefined })])
    const { pedirBorrado } = await import('../borrado'); pedirBorrado(U.email, Date.now(), [alq('ab', U.email, 'nueva@x.cr', { estado: 'en_curso', resultado: undefined })])
    for (const r of ['/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc']) { const h = await pantalla(r); expect(texto(h)).toContain(LIT); expect(h).not.toContain('PANTALLA-DE-SIEMPRE')
      expect(h).toContain('class="glass tarjeta"'); expect(h).not.toMatch(/boton--primario/) }
    expect(await pantalla('/')).toContain('PANTALLA-DE-SIEMPRE'); expect(await pantalla('/alquiler/ab')).toContain('PANTALLA-DE-SIEMPRE')
  })
  it('también para una cuenta anterior (sin REP-01) que pidió eliminar su cuenta', async () => {
    const { pedirBorrado } = await import('../borrado'); pedirBorrado(U.email, Date.now(), [])
    expect(texto(await pantalla('/crear'))).toContain(LIT)
  })
})

describe('Legal: guarda de encendido (la fecha real de publicación)', () => {
  const RE = /^\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de 20\d\d$/
  it('el build de producción falla con VITE_REPUTACION=1 y la fecha todavía con «[»', async () => {
    const { revisarEncendido } = await import('../../legal/encendido')
    expect(revisarEncendido({ VITE_REPUTACION: '1' }, '[fecha de encendido]')).toMatch(/FECHA_ENCENDIDO_REPUTACION/)
    expect(revisarEncendido({ VITE_REPUTACION: '1' }, '2 de noviembre de 2026')).toBeNull()
    expect(revisarEncendido({}, '[fecha de encendido]')).toBeNull()
    // Borrador local (capturas, E2E): solo fuera de Vercel (ni producción ni preview).
    expect(revisarEncendido({ VITE_REPUTACION: '1', LOCKUMI_REPUTACION_BORRADOR: '1' }, '[fecha de encendido]')).toBeNull()
    expect(revisarEncendido({ VITE_REPUTACION: '1', LOCKUMI_REPUTACION_BORRADOR: '1', VERCEL: '1', VERCEL_ENV: 'production' }, '[fecha de encendido]')).toMatch(/FECHA_ENCENDIDO_REPUTACION/)
    expect(revisarEncendido({ VITE_REPUTACION: '1', LOCKUMI_REPUTACION_BORRADOR: '1', VERCEL: '1', VERCEL_ENV: 'preview' }, '[fecha de encendido]')).toMatch(/FECHA_ENCENDIDO_REPUTACION/)
  })
  it('vite.config.ts usa la guarda en el build', async () => {
    const { guardaEncendido } = await import('../../legal/encendido'), g = guardaEncendido({ VITE_REPUTACION: '1' })
    const { FECHA_ENCENDIDO_REPUTACION: F } = await import('../../legal/fecha-reputacion')
    // Con la fecha de borrador el build se para; con la fecha real (al encender) pasa.
    if (F.includes('[')) expect(() => g.configResolved!({ command: 'build' } as never)).toThrow(/FECHA_ENCENDIDO_REPUTACION/)
    else expect(() => g.configResolved!({ command: 'build' } as never)).not.toThrow()
    expect(() => g.configResolved!({ command: 'serve' } as never)).not.toThrow()
    expect(await leerArchivo('vite.config.ts')).toMatch(/guardaEncendido\(/)
  })
  it.runIf(import.meta.env.VITE_REPUTACION === '1')('con el interruptor encendido, la fecha es real («2 de noviembre de 2026»)', async () => {
    const { FECHA_ENCENDIDO_REPUTACION } = await import('../../legal/version17'); expect(FECHA_ENCENDIDO_REPUTACION).toMatch(RE)
  })
  it('la expresión de Legal acepta una fecha real y rechaza la de borrador', () => {
    expect('2 de noviembre de 2026').toMatch(RE); expect('[fecha de encendido]').not.toMatch(RE)
  })
})

describe('Legal: la 1.10-demo solo la guardan las cuentas nuevas (desde la pantalla previa)', () => {
  it('aceptar los Términos sin la pantalla previa (cuenta anterior que entra) guarda la 1.7-demo', async () => {
    const { guardarAceptacion } = await import('../../legal/aceptacion'), v = await import('../../legal/version17')
    expect(guardarAceptacion('terminos', v.V17).edicion).toBe(v.EDICION_V17)
    const { entrarSinAceptar } = await import('../consentimiento'); entrarSinAceptar()
    expect(guardarAceptacion('terminos', v.V17).edicion).toBe(v.EDICION_V17)
  })
  it('con la pantalla previa aceptada en esta sesión (cuenta nueva) guarda la 1.10-demo', async () => {
    const { aceptarPrevia } = await import('../consentimiento'); aceptarPrevia(['x'])
    const { guardarAceptacion } = await import('../../legal/aceptacion'), v = await import('../../legal/version17')
    expect(guardarAceptacion('terminos', v.V17).edicion).toBe(v.EDICION_REPUTACION)
  })
  it('registros por cuenta (Regla 6.5.1) y cambio de versión de un alquiler: 1.7-demo salvo cuenta nueva', async () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const { edicionDe, aceptarVersion17 } = await import('../../prueba/version'), v = await import('../../legal/version17')
    expect(edicionDe(v.V17, 'vieja@x.cr')).toEqual({ edicion: v.EDICION_V17 })
    const { aceptarRep01 } = await import('../consentimiento'); aceptarRep01('nueva@x.cr', ['x'])
    expect(edicionDe(v.V17, 'nueva@x.cr')).toEqual({ edicion: v.EDICION_REPUTACION })
    const x = alq('v6', 'vieja@x.cr', 'nueva@x.cr', { estado: 'en_curso', resultado: undefined, terminos: { version: '1.6-demo' } } as never)
    aceptarVersion17(x, 'dueno', Date.now()); aceptarVersion17(x, 'inquilino', Date.now()); expect(x.terminos?.edicion).toBe(v.EDICION_V17)
  })
})

describe('Legal: textos literales', () => {
  it('Términos 15.1 y Aviso: las cuentas anteriores a la 1.10-demo no tienen perfil (LEGAL: revisado (25/10); guion U+2011 y espacio U+00A0 tras «versión»: «versión 1.10‑demo» nunca se corta)', async () => {
    const t = await legal('terminos.md'), p = await legal('privacidad.md')
    const T = 'Las cuentas creadas antes de la versión\u00a01.10\u2011demo no tienen perfil de reputación: siguen usando Lockumi como antes, sin perfil público, y sus alquileres no se publican ni cuentan para la reputación.'
    const P = 'Si tu cuenta es anterior a la versión\u00a01.10\u2011demo, no tienes perfil de reputación: no publicamos nada sobre ti ni usamos tus alquileres para calcular puntajes.'
    expect(t.split('\n').find(l => l.startsWith('15.1 '))!.endsWith(T)).toBe(true)
    const sec = p.slice(p.indexOf('## Perfil de reputación')).split('\n').filter(l => l.trim() && !l.startsWith('<!--'))
    expect(sec[1]!.startsWith('Usar Lockumi incluye un perfil de reputación')).toBe(true); expect(sec[2]).toBe(P)
    expect(await legal('terminos.md', false)).not.toContain(T); expect(await legal('privacidad.md', false)).not.toContain(P)
    for (const f of ['terminos.md', 'privacidad.md']) expect(await leerArchivo('src/legal/v17/' + f)).toMatch(/LEGAL: revisado \(25\/10\)[^\n]*1\.10-demo/)
  })
  it('sin restos de REP-13, la tercera casilla ni [Ver y aceptar] en los textos legales ni en la documentación', async () => {
    for (const f of ['src/legal/v17/privacidad.md', 'src/legal/v17/terminos.md', 'docs/reputacion.md']) {
      const s = await leerArchivo(f); for (const x of ['REP-13', 'tercera casilla', 'Ver y aceptar', 'Ver cambios', 'tres casillas']) expect(s, f + ' · ' + x).not.toContain(x) }
  })
  it('eliminar: «Listo…» y «Lo pediste el … a las … (hora de Costa Rica).», con hora de 12 horas', async () => {
    const { ELIMINAR, ELIMINAR_UI } = await import('../textos'), { horaCR } = await import('../consentimiento')
    expect(ELIMINAR.listo).toBe('Listo. Pediste eliminar tu cuenta: tu perfil ya no se muestra y la eliminamos en un máximo de 5 días hábiles.')
    expect(ELIMINAR_UI.pedido('25 de octubre de 2026', '3:21 p. m.')).toBe('Lo pediste el 25 de octubre de 2026 a las 3:21 p. m. (hora de Costa Rica).')
    expect(horaCR('2026-10-25T21:21:00Z')).toBe('3:21\u00a0p.\u00a0m.'); expect(horaCR('2026-10-25T16:05:00Z')).toBe('10:05\u00a0a.\u00a0m.')
    expect(horaCR('2026-10-25T18:00:00Z')).toBe('12:00\u00a0p.\u00a0m.'); expect(horaCR('2026-10-26T06:30:00Z')).toBe('12:30\u00a0a.\u00a0m.')
  })
  it('perfil con una revisión pedida: la nota de Legal', async () => {
    const L = 'Pediste una revisión. Mientras la revisamos, tu puntaje público dice «En revisión».'
    const { NOTA_EN_REVISION } = await import('../textos'); expect(NOTA_EN_REVISION).toBe(L)
    const c = await import('../consentimiento'); c.aceptarRep01(U.email, ['x']); c.guardarDatos(U.email, 'Demo D.', 'Escazú')
    sembrar([alq('r1', U.email, 'nueva@x.cr')]); c.aceptarRep01('nueva@x.cr', ['x'])
    const { pedirRevision } = await import('../revision'); pedirRevision(U.email, { alquilerId: 'r1', rol: 'dueno', texto: 'Está mal' }, Date.now())
    expect(texto(await pantalla('/perfil/dueno'))).toContain(L)
  })
  it('robots.txt: el comentario de Legal (la etiqueta meta y el noindex de index.html siguen)', async () => {
    const r = await leerArchivo('public/robots.txt'); expect(r.split('\n')[1]).toBe('# Cada perfil lleva la etiqueta meta "noindex, nofollow".')
    expect(await leerArchivo('index.html')).toMatch(/name="robots" content="noindex/)
  })
  it('nombre visible: nombres compuestos («Ana María V.»), siempre con la inicial del apellido', async () => {
    const { validarNombre } = await import('../consentimiento'), { UI } = await import('../textos')
    for (const n of ['Ana María V.', 'Laura V.', 'María-José R.', 'José Pablo M.']) expect(validarNombre(n), n).toBeNull()
    for (const n of ['Ana María Vargas', 'Laura Vargas', 'Laura', 'Ana María Vargas Rojas']) expect(validarNombre(n), n).toBe(UI.errNombre)
  })
  it('se quitan las marcas «LEGAL: revisar» que Legal aprobó', async () => {
    for (const f of ['src/reputacion/textos.ts', 'src/reputacion/entrada-textos.ts', 'src/reputacion/puntaje.ts', 'supabase/migrations/20261025140000_reputacion.sql']) {
      // Siguen «LEGAL: revisar» solo los textos propios nuevos de las rondas de las 3:42/3:47 y 4:45 (las de las 4:23 quedaron revisadas a las 4:41)
      // (los 2 errores propios del segundo factor quedaron revisados por Legal a las 6:01 p. m.).
      const nuevas = (await leerArchivo(f)).split('\n').filter(l => l.includes('LEGAL: revisar') && !/ronda 25\/10 (3:4[27]|4:45)/.test(l))
      expect(nuevas, f).toEqual([]) }
    // correo.ts: solo el bloque de REP-12 es del paso 19 (las demás marcas son de otros pasos).
    const rep12 = (await leerArchivo('api/_lib/correo.ts')).split('\n').filter(l => /n\.º|Legal exige|líneas públicas del puntaje/.test(l))
    expect(rep12.length).toBeGreaterThan(1); expect(rep12.filter(l => l.includes('LEGAL: revisar'))).toEqual([])
  })
})

describe('Legal (c): el correo de REP-12 no lleva casilla propia, pero tampoco contenido comercial', () => {
  it('solo el aviso, los dos enlaces de la app y el pie de servicio', async () => {
    const { validar, armar, PIE } = await import('../../../api/_lib/correo'), O = 'http://localhost:4319'
    const c = armar(validar({ tipo: 'reputacion', para: 'demo@lockumi.com', alquiler: '00000000-0000-4000-8000-000000000103', aviso: 'cambio', antes: '4,6 de 5', despues: '4,2 de 5', fechaMs: Date.parse('2026-06-30T18:00:00Z') } as never), O)
    expect(c.texto.split('\n').filter(Boolean)).toEqual(['Demo en la red de prueba: sin dinero real.', 'Tu puntaje cambió',
      'Tu puntaje pasó de 4,6 de 5 a 4,2 de 5 por el cierre del alquiler n.º 00000000 el 30 de junio de 2026. Si crees que hay un error, pide una revisión: mientras la revisamos, tu puntaje dice «En revisión».',
      `Ver por qué: ${O}/#/perfil/calculo`, `Pedir revisión: ${O}/#/perfil/revision`, `${PIE} Privacidad: ${O}/privacidad`])
    expect([...c.html.matchAll(/href="([^"]+)"/g)].map(m => m[1])).toEqual([`${O}/#/perfil/calculo`, `${O}/#/perfil/revision`, `${O}/privacidad`])
    expect(c.html).not.toMatch(/<img/i); expect(PIE).toContain('Este es un aviso del servicio, no publicidad.')
    expect(c.texto).not.toMatch(/promoci|oferta|suscr|novedades|invita a|recomienda/i)
  })
})
