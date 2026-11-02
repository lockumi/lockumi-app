// Paso 19 · Reputación ENCENDIDA (VITE_REPUTACION=1), según legal/reputacion-textos-para-producto.md. Desde la 1.13-demo (26/10/2026)
// el perfil se acepta con la casilla de los Términos (sin pantalla aparte, sin tocar el login); las cuentas que ya existían siguen igual, sin perfil ni pantallas extra (Coordinador, 25/10);
// pantallas sin casitas, solo con cantón, sin números de posición, sin «Dejar de mostrar», revisión, noindex y eliminación en 5 días hábiles.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const ses = new Map<string, string>()
const sesion = () => vi.stubGlobal('sessionStorage', { getItem: (k: string) => ses.get(k) ?? null, setItem: (k: string, v: string) => { ses.set(k, String(v)) }, removeItem: (k: string) => { ses.delete(k) } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const sinNavegador = () => vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const aceptarTodo = async () => { const { guardarDatos, aceptarRep01 } = await import('../consentimiento')
  aceptarRep01(U.email, ['x', 'y']); guardarDatos(U.email, 'Demo D.', 'Escazú') }
const BLOQUEO = 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos.'
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); sesion(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); sinNavegador() })

describe('reputación encendida', () => {
  it('Inicio muestra la tarjeta «Tu perfil en Lockumi» (solo con REP-01 aceptado)', async () => {
    const { Inicio } = await import('../../screens/Inicio')
    expect(renderToStaticMarkup(<Inicio u={U} />)).not.toContain('Tu perfil en Lockumi')
    await aceptarTodo(); const h = renderToStaticMarkup(<Inicio u={U} />)
    expect(h).toContain('Tu perfil en Lockumi'); expect(h).toContain('href="#/perfil"')
  })
  it('sin pantalla aparte (Legal, 26/10/2026): la pantalla de inicio de siempre, con la casilla de los Términos 1.13-demo y la línea de Legal', async () => {
    expect((await import('../Pantallas') as Record<string, unknown>).Previa).toBeUndefined()
    const { Login } = await import('../../screens/Login'), h = renderToStaticMarkup(<Login onOk={() => {}} />), t = texto(h)
    expect(h).toMatch(/<a href="\/terminos"[^>]*>Términos 1\.15-demo<\/a>, incluido mi perfil de reputación público\./)
    expect(t).toContain('Tu cuenta incluye un perfil público y fijo que cualquiera con el enlace puede ver')
    expect(h).toContain('id="acepto-privacidad"'); expect(h).not.toMatch(/type="checkbox"[^>]*checked/)
    expect(t).not.toMatch(/Antes de crear tu cuenta|No crear mi cuenta|Ya tengo cuenta: entrar|Confirmo que soy mayor/)
  })
  it('al entrar con los Términos 1.15-demo se registra el perfil (versión, fecha, hora y texto) y se llega a Inicio; nombre y cantón, al crear', async () => {
    const { leer } = await import('../consentimiento'), { V_REPUTACION } = await import('../../legal/version17'), { default: R } = await import('../Pantallas')
    const F = '2026-11-16T16:00:00.000Z', u = { ...U, terminos: { version: V_REPUTACION, fecha: F } }
    const t = texto(renderToStaticMarkup(<R u={u} r="/" salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>))
    expect(t).toContain('PANTALLA-DE-SIEMPRE')
    expect(leer(U.email).rep01).toMatchObject({ fecha: F, hora: '10:00\u00a0a.\u00a0m.', texto: ['Acepto los Términos 1.15-demo, incluido mi perfil de reputación público.', expect.stringContaining('Tu cuenta incluye un perfil público')] })
    expect(leer(U.email).rep01?.version).toMatch(/^1\.15-demo · /)
    const c = texto(await pantalla('/crear')); expect(c).toContain('Nombre visible'); expect(c).not.toContain('PANTALLA-DE-SIEMPRE')
  })
  it('con los Términos 1.12-demo (sesión anterior) no se crea ningún perfil: sin volver a aceptar', async () => {
    const { leer } = await import('../consentimiento'), { default: R } = await import('../Pantallas')
    renderToStaticMarkup(<R u={{ ...U, terminos: { version: '1.12-demo', fecha: '2026-10-26T06:00:00.000Z' } }} r="/" salir={() => {}}><p>x</p></R>)
    expect(leer(U.email).rep01).toBeUndefined()
  })
  it('cuentas que ya existían (sin REP-01, con alquileres): la app de siempre, sin aviso, sin bloqueo y sin perfil', async () => {
    abierto()
    for (const r of ['/', '/crear', '/invitacion/00000000-0000-0000-0000-000000000000/' + 'a'.repeat(64), '/alquiler/x', '/perfil']) {
      const t = texto(await pantalla(r)); expect(t).toContain('PANTALLA-DE-SIEMPRE'); expect(t).not.toMatch(/Actualizamos|Ver cambios|Ver y aceptar|Antes de seguir/) }
  })
  it('con REP-01 y los datos, la app se usa igual que siempre (también crear y unirse)', async () => {
    await aceptarTodo()
    for (const r of ['/', '/crear', '/alquiler/x']) { const t = texto(await pantalla(r)); expect(t).toContain('PANTALLA-DE-SIEMPRE'); expect(t).not.toContain(BLOQUEO) }
  })
  it('«Eliminar mi cuenta» se puede usar sin aceptar (es la forma de no tener reputación)', async () => {
    const t = texto(await pantalla('/perfil/eliminar'))
    expect(t).toContain('5 días hábiles'); expect(t).not.toContain('Antes de crear tu cuenta')
  })
  it('mi perfil: banda ondulada, papel con su ícono, perfil fijo, sin «Dejar de mostrar», «Mostrar mi puntaje» ni «Oro»', async () => {
    await aceptarTodo()
    for (const r of ['/perfil', '/perfil/dueno', '/perfil/inquilino']) {
      const h = await pantalla(r), t = texto(h)
      expect(h).toContain('rp-banda'); expect(h).toContain('M0 128C90 110')
      expect(h).toMatch(/rp-rol--(dueno|inquilino)/)
      expect(t).not.toMatch(/dejar de mostrar|desactiv|mostrar mi puntaje|oro\b|verificad/i)
      expect(t).toContain('Tu perfil es público y fijo.'); expect(t).toContain('No aparece en buscadores'); expect(t).toContain('Nuevo en Lockumi · 0 alquileres cerrados')
      expect(t).toContain('Ver qué se publica'); expect(t).toContain('Ver mis datos de reputación')
      expect(h).toContain('Eliminar mi cuenta')
    }
  })
  it('vitrina (opcional): una sola pantalla con una casilla y «Ahora no»', async () => {
    await aceptarTodo()
    const h = await pantalla('/perfil/dueno/aparecer'), t = texto(h)
    expect(t).toContain('Aparecer en Nuevos en Lockumi'); expect((h.match(/type="checkbox"/g) ?? []).length).toBe(1); expect(t).toContain('Ahora no')
  })
  it('vitrina: solo cantón, sin barrio ni distancia, sin números de posición, con «Espacio para nuevos» y «Ejemplo»; puntajes siempre visibles desde 3', async () => {
    await aceptarTodo()
    for (const r of ['/perfil/vitrina', '/perfil/vitrina/inquilinos']) {
      const t = texto(await pantalla(r))
      expect(t).toContain('Escazú'); expect(t).toContain('Espacio para nuevos'); expect(t).toContain('Ejemplo'); expect(t).toContain('no es un ranking')
      expect(t).not.toMatch(/barrio [A-ZÁÉÍÓÚ]|\bkm\b|metros|#\d|\bN\.?º|\b\d+\.\s+[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-Z]\./)
      expect(t).not.toMatch(/eligen no mostrar|alquileres cerrados en Lockumi/)
    }
    expect(texto(await pantalla('/perfil/vitrina'))).toContain('3,9 de 5')
    expect(texto(await pantalla('/perfil/vitrina/inquilinos'))).toContain('4,2 de 5')
  })
  it('Llave Lockumi y cómo se calcula (regla por papel, 90 %, 10 años)', async () => {
    await aceptarTodo()
    expect(texto(await pantalla('/perfil/llave'))).toContain('Llave Lockumi')
    const t = texto(await pantalla('/perfil/calculo'))
    expect(t).toContain('Si eres dueño:'); expect(t).toContain('Si eres inquilino:'); expect(t).toContain('90 %'); expect(t).toContain('10 años')
    expect(t).toContain('no aparece en buscadores como Google, no se puede buscar por nombre, no hay rankings ni orden por puntaje')
    expect(t).toContain('mientras revisamos un hecho que pediste revisar')
  })
  it('corregir o pedir revisión (REP-11): plazos, PRODHAB, derecho de respuesta de 300 caracteres y el correo de Lockumi', async () => {
    await aceptarTodo()
    const t = texto(await pantalla('/perfil/calculo/corregir'))
    for (const x of ['Al instante:', 'En un máximo de 5 días hábiles:', 'PRODHAB', 'hasta 300 caracteres', 'business.applockumi@gmail.com']) expect(t).toContain(x)
    expect(t).not.toContain('demo@lockumi.com')
    const f = texto(await pantalla('/perfil/revision')); expect(f).toContain('Pedir revisión'); expect(f).toContain('Qué está mal')
  })
  it('eliminar la cuenta: gratis, 5 días hábiles; después el perfil ya no se muestra', async () => {
    expect(texto(await pantalla('/perfil/eliminar'))).toContain('5 días hábiles')
    const { pedirBorrado, ejecutarBorrados, perfilDisponible } = await import('../borrado')
    await aceptarTodo()
    pedirBorrado(U.email, '2026-10-25T20:00:00Z'); ejecutarBorrados()
    expect(perfilDisponible(U.email)).toBe(false)
    const t = texto(await pantalla('/perfil/eliminar/listo'))
    expect(t).toContain('Listo. Pediste eliminar tu cuenta: tu perfil ya no se muestra y la eliminamos en un máximo de 5 días hábiles.'); expect(t).toContain('30 de octubre de 2026')
  })
})

const REP09_ABIERTO = 'Si tienes un alquiler abierto (un depósito guardado, un plazo para reclamar o una mediación en curso), tu perfil deja de mostrarse en cuanto lo pides, pero tu cuenta se elimina cuando ese alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, solo usamos tus datos para cerrar el alquiler, y la otra parte sigue viendo el contrato y el historial. Esta solicitud no se puede deshacer.'
const CONFIRMAR = 'Tienes un alquiler abierto. Tu perfil dejará de mostrarse ahora y tu cuenta se eliminará cuando el alquiler se cierre. Esta solicitud no se puede deshacer.'
const abierto = () => mem.set('lockumi.alquileres.v3', JSON.stringify([{ id: 'ab1', direccion: 'Casa abierta', monto: 20, moneda: 'USDC', inicio: '2026-10-01', fin: '2027-10-01', reglas: [],
  duenoEmail: U.email, inquilinoEmail: 'otro@lockumi.com', estado: 'en_curso', rendimiento: false, historial: [], diasSimulados: 0 }]))
describe('eliminar la cuenta con un alquiler abierto (Legal, respuesta final)', () => {
  it('REP-09 trae el párrafo del alquiler abierto justo después del de los 5 días hábiles', async () => {
    const { ELIMINAR } = await import('../textos')
    const i = ELIMINAR.puntos.findIndex(x => x.startsWith('Borramos tus datos de reputación')); expect(ELIMINAR.puntos[i + 1]).toBe(REP09_ABIERTO)
    expect(texto(await pantalla('/perfil/eliminar'))).toContain(REP09_ABIERTO)
  })
  it('con un alquiler abierto, «Eliminar mi cuenta» pide confirmar: [Eliminar mi cuenta] [Cancelar]', async () => {
    abierto(); await aceptarTodo()
    const h = await pantalla('/perfil/eliminar/confirmar'), t = texto(h)
    expect(t).toContain(CONFIRMAR); expect(h).toMatch(/<button[^>]*>Eliminar mi cuenta<\/button>/); expect(h).toMatch(/<a[^>]*href="#\/perfil\/eliminar"[^>]*>Cancelar<\/a>/)
    const { solicitudBorrado } = await import('../borrado'); expect(solicitudBorrado(U.email)).toBeNull()   // confirmar todavía no pide nada
  })
  it('sin alquiler abierto no hay pantalla de confirmación (va directo al pedido)', async () => {
    await aceptarTodo(); expect(texto(await pantalla('/perfil/eliminar/confirmar'))).not.toContain(CONFIRMAR)
  })
  it('pedida con el alquiler abierto: el perfil no se muestra, no se recalcula ni avisa, la app sigue para cerrar el alquiler', async () => {
    abierto(); await aceptarTodo()
    const { pedirBorrado, ejecutarBorrados, perfilDisponible } = await import('../borrado'), { store } = await import('../../store')
    pedirBorrado(U.email, '2026-10-25T20:00:00Z', store.todos()); ejecutarBorrados(Date.now(), store.todos())
    expect(perfilDisponible(U.email)).toBe(false)
    const l = texto(await pantalla('/perfil/eliminar/listo'))
    expect(l).toContain('Tu perfil ya no se muestra'); expect(l).toContain('cuando el alquiler se cierre'); expect(l).toContain('Lo pediste el 25 de octubre de 2026 a las 2:00 p. m. (hora de Costa Rica).')   // texto() junta los espacios (también U+00A0)
    expect(l).not.toContain('Listo. Pediste eliminar tu cuenta')
    for (const r of ['/perfil', '/perfil/dueno', '/perfil/calculo']) { const t = texto(await pantalla(r)); expect(t).toContain('Ya pediste eliminar tu cuenta'); expect(t).not.toMatch(/\d,\d de 5|Nuevo en Lockumi/) }
    expect(texto(await pantalla('/perfil/eliminar'))).not.toMatch(/<button[^>]*>Eliminar mi cuenta/)
    const t = texto(await pantalla('/')); expect(t).toContain('PANTALLA-DE-SIEMPRE'); expect(t).not.toContain('Tu puntaje cambió')
  })
})

describe('textos legales con la reputación (REP-14 y REP-15, solo con VITE_REPUTACION=1)', () => {
  it('encendida: el Aviso 1.7-demo trae «Perfil de reputación» y los Términos la cláusula 15 y el inciso g)', async () => {
    const { condicional } = await import('../../legal/condicional'), fs = await import(['node', 'fs'].join(':'))
    const leer = (f: string) => fs.readFileSync(new URL('../../legal/v17/' + f, import.meta.url), 'utf8') as string
    const on = { 'dos-personas': true, correos: false, reputacion: true }, off = { 'dos-personas': true, correos: false }
    const p = condicional(leer('privacidad.md'), on), t = condicional(leer('terminos.md'), on)
    expect(p).toContain('## Perfil de reputación'); expect(p).not.toContain('no calculamos ningún puntaje de reputación')
    expect(p).toContain('Cualquier persona en internet con el enlace puede ver los datos indicados en «Perfil de reputación», mientras exista tu cuenta.')
    expect(p).toMatch(/\*\*Perfil fijo y retiro del consentimiento:\*\*[^\n]*No podemos borrar las capturas que otras personas hayan hecho\. Si tienes un alquiler abierto, el plazo de 5 días hábiles corre desde que se cierra\.\n/)
    expect(t).toContain('en un máximo de 5 días hábiles (si tienes un alquiler abierto, desde que se cierra)')
    expect(t).toContain('## 15. Perfil de reputación'); expect(t).toContain('g) usar los perfiles públicos en contra de lo dispuesto en la cláusula 15.4')
    const p0 = condicional(leer('privacidad.md'), off), t0 = condicional(leer('terminos.md'), off)
    expect(p0).toContain('no calculamos ningún puntaje de reputación'); expect(p0).not.toContain('Perfil de reputación'); expect(t0).not.toMatch(/15\. Perfil|g\) usar los perfiles/)
  })
})
