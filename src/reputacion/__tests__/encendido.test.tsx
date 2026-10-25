// Paso 19 · Reputación ENCENDIDA (VITE_REPUTACION=1), según legal/reputacion-textos-para-producto.md: REP-01 en una pantalla aparte ANTES
// de crear la cuenta (sin tocar el login), REP-13 + REP-01 para las cuentas 1.7-demo, la tarjeta de bloqueo para alquileres nuevos,
// pantallas sin casitas, solo con cantón, sin números de posición, sin «Dejar de mostrar», revisión, noindex y eliminación en 5 días hábiles.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const sinNavegador = () => vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
const pantalla = async (r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={U} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const aceptarTodo = async () => { const { guardarDatos, aceptarRep01 } = await import('../consentimiento')
  aceptarRep01(U.email, ['x', 'y']); guardarDatos(U.email, 'Demo D.', 'Escazú') }
const BLOQUEO = 'Para crear o unirte a un alquiler nuevo, primero acepta tu perfil de reputación. Tus alquileres abiertos siguen funcionando igual.'
const omitir = () => { const m = new Map<string, string>([['lockumi.reputacion.ahora-no.demo@lockumi.com', '1']])
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }) }
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => { vi.resetModules(); mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); sinNavegador() })

describe('reputación encendida', () => {
  it('Inicio muestra la tarjeta «Tu perfil en Lockumi»', async () => {
    const { Inicio } = await import('../../screens/Inicio')
    const h = renderToStaticMarkup(<Inicio u={U} />)
    expect(h).toContain('Tu perfil en Lockumi'); expect(h).toContain('href="#/perfil"')
  })
  it('REP-01 antes del login: pantalla aparte, dos casillas sin marcar, [Continuar] desactivado, enlaces y «No crear mi cuenta»', async () => {
    const { Previa } = await import('../Pantallas')
    const h = renderToStaticMarkup(<Previa><p>LOGIN-DE-SIEMPRE</p></Previa>), t = texto(h)
    expect(t).not.toContain('LOGIN-DE-SIEMPRE')
    expect(t).toContain('Antes de crear tu cuenta: tu perfil de reputación'); expect(t).toContain('Usar Lockumi incluye un perfil de reputación público')
    expect((h.match(/type="checkbox"/g) ?? []).length).toBe(2); expect(h).not.toMatch(/type="checkbox"[^>]*checked/)
    expect(t).toContain('Entiendo que usar Lockumi implica tener un perfil de reputación público y fijo, con mi puntaje visible desde mi 3.er alquiler cerrado, y que solo desaparece si elimino mi cuenta. Acepto que Lockumi lo publique.')
    expect(t).toContain('Confirmo que soy mayor de 18 años.')
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Continuar<\/button>/)
    for (const x of ['Ver un ejemplo de perfil', 'Cómo se calcula el puntaje', 'Aviso de privacidad', 'No crear mi cuenta', 'Si no estás de acuerdo, puedes no crear tu cuenta. No tiene ningún costo.']) expect(t).toContain(x)
    expect(t).not.toMatch(/Términos y condiciones|Acepto los Términos/)   // aparte de los Términos
  })
  it('después de aceptar REP-01 en el navegador se ve el login de siempre, y al entrar la aceptación pasa a la cuenta', async () => {
    const { aceptarPrevia, aceptoRep01 } = await import('../consentimiento'), { Previa } = await import('../Pantallas')
    aceptarPrevia(['x']); expect(renderToStaticMarkup(<Previa><p>LOGIN-DE-SIEMPRE</p></Previa>)).toContain('LOGIN-DE-SIEMPRE')
    const t = texto(await pantalla('/'))
    expect(aceptoRep01(U.email)).toBe(true); expect(t).toContain('¿Cómo te verán?'); expect(t).toContain('Nombre visible'); expect(t).not.toContain('PANTALLA-DE-SIEMPRE')
  })
  it('cuentas 1.7-demo sin REP-01: al entrar ven el aviso REP-13 con [Ver cambios] (REP-01 aparte)', async () => {
    const t = texto(await pantalla('/'))
    expect(t).toContain('Actualizamos el Aviso de privacidad (1.8-demo) y los Términos: usar Lockumi ahora incluye un perfil de reputación público y fijo. Antes de seguir, te pedimos aceptarlo en una pantalla aparte. Si no lo aceptas, puedes eliminar tu cuenta sin costo.')
    expect(t).toContain('Ver cambios'); expect(t).toContain('Eliminar mi cuenta'); expect(t).not.toContain('PANTALLA-DE-SIEMPRE')
    const h = await pantalla('/perfil/aceptar')
    expect(texto(h)).toContain('Antes de crear tu cuenta: tu perfil de reputación'); expect(h).toMatch(/disabled=""[^>]*>Continuar/)
  })
  it('regla provisional: sin REP-01, crear o unirse a un alquiler NUEVO muestra la tarjeta con [Ver y aceptar]; los abiertos siguen igual', async () => {
    omitir()
    for (const r of ['/crear', '/invitacion/00000000-0000-0000-0000-000000000000/' + 'a'.repeat(64)]) {
      const h = await pantalla(r), t = texto(h)
      expect(t).toContain(BLOQUEO); expect(t).not.toContain('PANTALLA-DE-SIEMPRE')
      expect(h).toContain('class="glass tarjeta"'); expect(h).toMatch(/<a class="boton boton--primario" href="#\/perfil\/aceptar">Ver y aceptar<\/a>/)
    }
    for (const r of ['/', '/alquiler/x']) expect(texto(await pantalla(r))).toContain('PANTALLA-DE-SIEMPRE')
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
    expect(t).toContain('Listo. Eliminamos tu cuenta.'); expect(t).toContain('30 de octubre de 2026')
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
    expect(l).toContain('Tu perfil ya no se muestra'); expect(l).toContain('cuando el alquiler se cierre'); expect(l).toMatch(/Pedido el 25 de octubre de 2026 a las 14:00/)
    expect(l).not.toContain('Listo. Eliminamos tu cuenta.')
    for (const r of ['/perfil', '/perfil/dueno', '/perfil/calculo']) { const t = texto(await pantalla(r)); expect(t).toContain('Ya pediste eliminar tu cuenta'); expect(t).not.toMatch(/de 5|Nuevo en Lockumi/) }
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
