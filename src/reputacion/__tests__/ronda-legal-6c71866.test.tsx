// Paso 19 · Respuesta de Legal a los 3 puntos de 6c71866 (25/10/2026, 3:42 p. m.):
// 1) nombre visible: hasta dos palabras antes de la inicial + texto de ayuda literal;
// 2) las cuentas se distinguen por la FECHA DE CREACIÓN: una cuenta creada desde el encendido de la 1.10-demo y sin REP-01 ve la pantalla
//    previa de siempre antes de crear o unirse a su primer alquiler; las anteriores, nada nuevo (también en SQL);
// 3) cada aceptación guarda la edición de ESA persona (no la del dueño) y un alquiler cuenta solo si cuenta para las DOS cuentas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Usuario } from '../../types'

const mem = new Map<string, string>(), ses = new Map<string, string>()
const almacen = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)) }, removeItem: (k: string) => { m.delete(k) },
  clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size } })
vi.stubGlobal('localStorage', almacen(mem)); vi.stubGlobal('sessionStorage', almacen(ses))
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const fs = async () => await import(['node', 'fs'].join(':'))
const leerArchivo = async (f: string) => (await fs()).readFileSync(new URL('../../../' + f, import.meta.url), 'utf8') as string
const ENCENDIDO = '2026-10-25T12:00:00-06:00'          // borrador: el instante de encendido de la demo local
const cuenta = (email: string, entro: string): Usuario => ({ email, nombre: 'X', metodo: 'correo', terminos: { version: '1.7-demo', fecha: entro }, privacidad: { version: '1.7-demo', fecha: entro } })
const NUEVA = cuenta('nueva@x.cr', '2026-10-25T21:00:00Z'), VIEJA = cuenta('vieja@x.cr', '2026-10-20T15:00:00Z')
const pantalla = async (u: Usuario, r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={u} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const alq = (id: string, dueno: string, inquilino: string, x: Partial<Alquiler> = {}) => ({ id, direccion: 'Casa ' + id, monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
  duenoEmail: dueno, inquilinoEmail: inquilino, estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} },
  resultado: { inquilino: 20, dueno: 0, via: 'acuerdo', fecha: '2026-06-01T12:00:00Z' }, ...x }) as unknown as Alquiler
beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1'); vi.stubEnv('VITE_REPUTACION_ENCENDIDO', ENCENDIDO)
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } }) })

describe('Legal (1): nombre visible', () => {
  it('hasta dos palabras antes de la inicial del apellido; con tres, no', async () => {
    const { validarNombre } = await import('../consentimiento')
    for (const n of ['Ana V.', 'Ana María V.', 'Laura Vargas R.', 'María José R', 'José-Luis P.']) expect(validarNombre(n), n).toBeNull()
    for (const n of ['Ana María José V.', 'Laura Vargas Rojas R.', 'Ana María Vargas', 'Ana', 'Ana María Vargas Rojas']) expect(validarNombre(n), n).not.toBeNull()
  })
  it('texto de ayuda literal debajo del campo (estilo «nota» de siempre), marcado LEGAL: revisar', async () => {
    const AYUDA = 'Escribe tu nombre y la inicial de tu apellido, por ejemplo «Ana V.» o «Ana María V.». Así se verá en tu perfil.'
    const { UI } = await import('../textos'); expect(UI.nombreAyuda).toBe(AYUDA)
    const l = (await leerArchivo('src/reputacion/textos.ts')).split('\n'), i = l.findIndex(x => x.includes('nombreAyuda:'))
    expect(l[i - 1]).toContain('LEGAL: revisar')
    const { aceptarRep01 } = await import('../consentimiento'); aceptarRep01(VIEJA.email, ['x'])
    expect(await pantalla(VIEJA, '/')).toContain(`<p id="rp-n-a" class="nota">${AYUDA.replace(/«/g, '«')}</p>`)
  })
})

describe('Legal (2): cuentas creadas desde el encendido de la 1.10-demo', () => {
  it('el instante de encendido sale de FECHA_ENCENDIDO_REPUTACION (medianoche en Costa Rica); en borrador, de VITE_REPUTACION_ENCENDIDO', async () => {
    const { instanteEncendido } = await import('../../legal/version17')
    expect(instanteEncendido('2 de noviembre de 2026')).toBe('2026-11-02T06:00:00.000Z')
    expect(instanteEncendido('[fecha de encendido]')).toBe(new Date(ENCENDIDO).toISOString())
    vi.stubEnv('VITE_REPUTACION_ENCENDIDO', ''); expect(instanteEncendido('[fecha de encendido]')).toBeNull()
  })
  it('una cuenta nueva sin REP-01 ve la pantalla previa de siempre (casillas sin marcar) antes de crear o unirse; el resto de la app igual', async () => {
    for (const r of ['/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc']) {
      const h = await pantalla(NUEVA, r), t = texto(h)
      expect(t, r).toContain('Antes de crear tu cuenta: tu perfil de reputación'); expect(h, r).not.toContain('PANTALLA-DE-SIEMPRE')
      expect((h.match(/type="checkbox"/g) ?? []).length, r).toBe(2); expect(h, r).not.toMatch(/checked=""/)
      expect(t, r).not.toContain('Ya tengo cuenta: entrar')
    }
    for (const r of ['/', '/alquiler/x', '/perfil']) expect(await pantalla(NUEVA, r), r).toContain('PANTALLA-DE-SIEMPRE')
  })
  it('al aceptarla, la aceptación queda en la cuenta y sigue el último paso (nombre y cantón)', async () => {
    const { aceptarRep01, aceptoRep01 } = await import('../consentimiento'); aceptarRep01(NUEVA.email, ['x']); expect(aceptoRep01(NUEVA.email)).toBe(true)
    expect(texto(await pantalla(NUEVA, '/crear'))).toContain('Nombre visible')
  })
  it('las cuentas creadas antes del encendido no ven nada nuevo (tampoco con alquileres de antes)', async () => {
    for (const r of ['/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc']) expect(await pantalla(VIEJA, r), r).toContain('PANTALLA-DE-SIEMPRE')
    mem.set('lockumi.alquileres.v3', JSON.stringify([alq('a1', 'dueno@x.cr', NUEVA.email)]))
    expect(await pantalla(NUEVA, '/crear')).toContain('PANTALLA-DE-SIEMPRE')    // ya tenía alquileres: es de antes
  })
  it('sin instante de encendido (interruptor recién encendido en borrador sin fecha), ninguna cuenta es posterior', async () => {
    vi.stubEnv('VITE_REPUTACION_ENCENDIDO', ''); expect(await pantalla(NUEVA, '/crear')).toContain('PANTALLA-DE-SIEMPRE')
  })
  it('la regla vive en una sola función (consentimiento.ts) y la migración la aplica en el servidor', async () => {
    const { cuentaPosteriorAlEncendido } = await import('../consentimiento')
    expect(cuentaPosteriorAlEncendido(NUEVA, [])).toBe(true); expect(cuentaPosteriorAlEncendido(VIEJA, [])).toBe(false)
    expect(cuentaPosteriorAlEncendido({ ...NUEVA, terminos: undefined }, [])).toBe(false)
    expect(await leerArchivo('supabase/migrations/20261025140000_reputacion.sql')).toContain('lk_sin_perfil_tras_encendido')
  })
})

describe('Legal (3): la edición es la de cada persona y un alquiler cuenta solo si cuenta para las dos', () => {
  it('al crear: la edición del dueño; al firmar el inquilino: la suya (no la del dueño)', async () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const { aceptarRep01 } = await import('../consentimiento'); aceptarRep01('nueva@x.cr', ['x'])
    const { edicionesAlCrear, registrarEdicion } = await import('../../prueba/version'), v = await import('../../legal/version17')
    const x = alq('e1', 'nueva@x.cr', 'vieja@x.cr', { estado: 'firmas', resultado: undefined, terminos: { version: v.V17, ...edicionesAlCrear(v.V17, 'nueva@x.cr') } } as never)
    expect(x.terminos).toEqual({ version: v.V17, ediciones: { dueno: v.EDICION_REPUTACION } })
    registrarEdicion(x, 'inquilino'); expect(x.terminos?.ediciones).toEqual({ dueno: v.EDICION_REPUTACION, inquilino: v.EDICION_V17 })
    const y = alq('e2', 'vieja@x.cr', 'nueva@x.cr', { estado: 'firmas', resultado: undefined, terminos: { version: v.V17, ...edicionesAlCrear(v.V17, 'vieja@x.cr') } } as never)
    registrarEdicion(y, 'inquilino'); expect(y.terminos?.ediciones).toEqual({ dueno: v.EDICION_V17, inquilino: v.EDICION_REPUTACION })
    registrarEdicion(y, 'inquilino'); expect(y.terminos?.ediciones?.inquilino).toBe(v.EDICION_REPUTACION)   // no se reescribe
    expect(edicionesAlCrear('1.6-demo', 'nueva@x.cr')).toEqual({})
  })
  it('store y la firma usan la edición de cada persona; ya no se deriva una edición del alquiler desde el dueño', async () => {
    const st = await leerArchivo('src/store.ts'), ac = await leerArchivo('src/acciones.ts')
    expect(st).toContain('edicionesAlCrear(terminosActual().version, a.duenoEmail)'); expect(st).not.toMatch(/edicionDe\(terminosActual\(\)\.version, a\.duenoEmail\)/)
    expect(ac).toMatch(/etapa === 'contrato'\) registrarEdicion\(x, rol\)/)
  })
  it('puntaje.ts: un alquiler cuenta solo si las DOS cuentas tienen perfil, mire quien mire', async () => {
    const { alquileresDeReputacion } = await import('../puntaje')
    const xs = [alq('p1', 'con@x.cr', 'sin@x.cr'), alq('p2', 'sin@x.cr', 'con@x.cr'), alq('p3', 'con@x.cr', 'con2@x.cr')]
    const vistos: string[] = [], perfil = (e: string) => { vistos.push(e); return e !== 'sin@x.cr' }
    expect(alquileresDeReputacion(xs, 'con@x.cr', 'dueno', perfil).map(a => a.id)).toEqual(['p3'])
    expect(alquileresDeReputacion(xs, 'con@x.cr', 'inquilino', perfil).map(a => a.id)).toEqual([])
    expect(alquileresDeReputacion(xs, 'con2@x.cr', 'inquilino', perfil).map(a => a.id)).toEqual(['p3'])
    expect(vistos).toEqual(expect.arrayContaining(['con@x.cr', 'sin@x.cr', 'con2@x.cr']))
    expect(alquileresDeReputacion([alq('p4', 'con@x.cr', '')], 'con@x.cr', 'dueno', () => true)).toEqual([])   // sin inquilino, no cuenta
  })
})
