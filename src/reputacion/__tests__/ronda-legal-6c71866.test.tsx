// Paso 19 · Respuesta de Legal a los 3 puntos de 6c71866 (25/10/2026, 3:42 p. m.):
// 1) nombre visible: hasta dos palabras antes de la inicial + texto de ayuda literal;
// 2) (actualizado 3:47 p. m.: las sesiones son anónimas por aparato, sin fecha de creación) SIN REP-01 y SIN alquileres → la pantalla
//    previa de siempre antes de crear o unirse; una cuenta anterior con alquileres no ve nada nuevo (también en SQL);
// 3) un alquiler cuenta para la reputación solo si las DOS cuentas tienen perfil (la edición del alquiler queda como estaba).
// Además: la inicial lleva punto, la guarda de borrador nunca vale en Vercel y la hora usa espacios que no se cortan.
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
const cuenta = (email: string): Usuario => ({ email, nombre: 'X', metodo: 'correo' })
const NUEVA = cuenta('nueva@x.cr'), VIEJA = cuenta('vieja@x.cr')
const pantalla = async (u: Usuario, r: string) => { const { default: R } = await import('../Pantallas'); return renderToStaticMarkup(<R u={u} r={r} salir={() => {}}><p>PANTALLA-DE-SIEMPRE</p></R>) }
const alq = (id: string, dueno: string, inquilino: string, x: Partial<Alquiler> = {}) => ({ id, direccion: 'Casa ' + id, monto: 20, moneda: 'USDC', inicio: '2026-01-01', fin: '2026-06-01', reglas: [],
  duenoEmail: dueno, inquilinoEmail: inquilino, estado: 'cerrado', rendimiento: false, historial: [], diasSimulados: 0, contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} },
  resultado: { inquilino: 20, dueno: 0, via: 'acuerdo', fecha: '2026-06-01T12:00:00Z' }, ...x }) as unknown as Alquiler
beforeEach(() => { vi.resetModules(); mem.clear(); ses.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1')
  vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } }) })

describe('Legal (1): nombre visible', () => {
  it('hasta dos palabras antes de la inicial del apellido; con tres, no', async () => {
    const { validarNombre } = await import('../consentimiento')
    for (const n of ['Ana V.', 'Ana R.', 'Ana María V.', 'Laura Vargas R.', 'José-Luis P.']) expect(validarNombre(n), n).toBeNull()
    for (const n of ['Ana R', 'María José R', 'Ana María José V.', 'Laura Vargas Rojas R.', 'Ana María Vargas', 'Ana', 'Ana María Vargas Rojas']) expect(validarNombre(n), n).not.toBeNull()
  })
  it('texto de ayuda literal debajo del campo (estilo «nota» de siempre), marcado LEGAL: revisado (25/10)', async () => {
    const AYUDA = 'Escribe tu nombre y la inicial de tu apellido, por ejemplo «Ana V.» o «Ana María V.». Así se verá en tu perfil.'
    const { UI } = await import('../textos'); expect(UI.nombreAyuda).toBe(AYUDA)
    const l = (await leerArchivo('src/reputacion/textos.ts')).split('\n'), i = l.findIndex(x => x.includes('nombreAyuda:'))
    expect(l[i - 1]).toContain('LEGAL: revisado (25/10)')
    const { aceptarRep01 } = await import('../consentimiento'); aceptarRep01(VIEJA.email, ['x'])
    expect(await pantalla(VIEJA, '/crear')).toContain(`<p id="rp-n-a" class="nota">${AYUDA.replace(/«/g, '«')}</p>`)
  })
})

const CON_ALQ = () => mem.set('lockumi.alquileres.v3', JSON.stringify([alq('a1', 'otra@x.cr', VIEJA.email)]))
describe('Legal (2), opción (b) del 26/10: sin perfil y sin alquileres → la casilla del perfil dentro de «Nuevo alquiler» y la invitación', () => {
  it('sin REP-01 ni alquileres: el formulario de siempre con la casilla de los Términos 1.13-demo (sin marcar) y la línea de Legal; sin pantalla aparte', async () => {
    const { useRanuraPerfil } = await import('../../ranuraPerfil'), { default: R } = await import('../Pantallas')
    const Formulario = () => { const p = useRanuraPerfil(); return <form><p>PANTALLA-DE-SIEMPRE</p>{p?.casilla}<button disabled={!!p && !p.lista}>Crear</button></form> }
    for (const r of ['/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc']) {
      const h = renderToStaticMarkup(<R u={NUEVA} r={r} salir={() => {}}><Formulario /></R>), t = texto(h)
      expect(h, r).toContain('PANTALLA-DE-SIEMPRE'); expect(h, r).not.toMatch(/Antes de crear un alquiler o unirte a uno|Antes de crear tu cuenta|Confirmo que soy mayor/)
      expect(h, r).toMatch(/Acepto los <a href="\/terminos"[^>]*>Términos 1\.13-demo<\/a>, incluido mi perfil de reputación público\./)
      expect(t, r).toContain('Tu cuenta incluye un perfil público y fijo que cualquiera con el enlace puede ver')
      expect((h.match(/type="checkbox"/g) ?? []).length, r).toBe(1); expect(h, r).not.toMatch(/checked=""/); expect(h, r).toMatch(/<button disabled="">Crear<\/button>/)
    }
    for (const r of ['/', '/alquiler/x', '/perfil']) expect(await pantalla(NUEVA, r), r).not.toContain('acepto-perfil-113')
  })
  it('Crear e Invitación usan la ranura y la invitación separa «Para tu cuenta» y «Para este alquiler»', async () => {
    const c = await leerArchivo('src/screens/Crear.tsx'), v = await leerArchivo('src/screens/Invitacion.tsx')
    for (const f of [c, v]) { expect(f).toContain('useRanuraPerfil()'); expect(f).toContain('{perfil?.casilla}'); expect(f).toContain('(!!perfil && !perfil.lista)') }
    expect(v.indexOf('>Para tu cuenta</p>')).toBeGreaterThan(0); expect(v.indexOf('>Para tu cuenta</p>')).toBeLessThan(v.indexOf('{perfil?.casilla}')); expect(v.indexOf('{perfil?.casilla}')).toBeLessThan(v.indexOf('>Para este alquiler</p>'))
  })
  it('al aceptarla, la aceptación queda en la cuenta y sigue el último paso (nombre y cantón)', async () => {
    const { aceptarRep01, aceptoRep01 } = await import('../consentimiento'); aceptarRep01(NUEVA.email, ['x']); expect(aceptoRep01(NUEVA.email)).toBe(true)
    expect(texto(await pantalla(NUEVA, '/crear'))).toContain('Nombre visible')
  })
  it('una cuenta anterior con alquileres no tiene perfil y no ve nada nuevo', async () => {
    CON_ALQ()
    for (const r of ['/', '/crear', '/invitacion/00000000-0000-4000-8000-000000000999/abc']) expect(await pantalla(VIEJA, r), r).toContain('PANTALLA-DE-SIEMPRE')
  })
  it('la regla vive en una sola función (consentimiento.ts) y la migración la aplica en el servidor', async () => {
    const { sinPerfilNiAlquileres, aceptarRep01 } = await import('../consentimiento')
    expect(sinPerfilNiAlquileres(NUEVA.email, [])).toBe(true)
    expect(sinPerfilNiAlquileres(VIEJA.email, [alq('a1', 'otra@x.cr', 'VIEJA@x.cr ')])).toBe(false)
    aceptarRep01(NUEVA.email, ['x']); expect(sinPerfilNiAlquileres(NUEVA.email, [])).toBe(false)
    expect(await leerArchivo('supabase/migrations/20261025140000_reputacion.sql')).toContain('lk_sin_perfil_ni_alquileres')
  })
})

describe('Arreglos 3:47 p. m.', () => {
  it('la guarda de borrador nunca vale en Vercel (ni preview ni producción)', async () => {
    const { revisarEncendido } = await import('../../legal/encendido'), B = '[fecha de encendido]'
    expect(revisarEncendido({ VITE_REPUTACION: '1', LOCKUMI_REPUTACION_BORRADOR: '1' }, B)).toBeNull()
    for (const VERCEL_ENV of ['preview', 'production', 'development']) expect(revisarEncendido({ VITE_REPUTACION: '1', LOCKUMI_REPUTACION_BORRADOR: '1', VERCEL: '1', VERCEL_ENV }, B), VERCEL_ENV).toMatch(/FECHA_ENCENDIDO_REPUTACION/)
  })
  it('la hora usa espacios que no se cortan: «3:21\u00a0p.\u00a0m.»', async () => {
    const { horaCR } = await import('../consentimiento')
    expect(horaCR('2026-10-25T21:21:00Z')).toBe('3:21\u00a0p.\u00a0m.'); expect(horaCR('2026-10-25T06:05:00Z')).toBe('12:05\u00a0a.\u00a0m.')
    expect(horaCR('2026-10-25T18:00:00Z')).toBe('12:00\u00a0p.\u00a0m.')
  })
  it('las líneas de la 1.10-demo sobre cuentas anteriores se reemplazaron por las de la 1.13-demo (Legal, 26/10); la 1.12-demo queda archivada', async () => {
    for (const f of ['terminos.md', 'privacidad.md']) { expect(await leerArchivo('src/legal/v17/' + f), f).not.toContain('antes de la versión\u00a01.10\u2011demo no tienen')
      expect(await leerArchivo('src/legal/archivo/4dfa5ae/' + f), f).toMatch(/versión\u00a01\.10\u2011demo/) }
  })
  it('las marcas de la ronda de las 3:27 ya dicen «LEGAL: revisado (25/10)»', async () => {
    for (const f of ['src/reputacion/textos.ts', 'supabase/migrations/20261025140000_reputacion.sql', 'src/legal/v17/terminos.md', 'src/legal/v17/privacidad.md'])
      expect(await leerArchivo(f), f).not.toContain('ronda 25/10 3:27')
  })
})

describe('Legal (3): un alquiler cuenta solo si cuenta para las dos cuentas', () => {
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
  it('el perfil usa las dos cuentas (Pantallas.tsx → alquileresDeReputacion con tienePerfilReputacion)', async () => {
    expect(await leerArchivo('src/reputacion/Pantallas.tsx')).toContain('alquileresDeReputacion(todos, u.email, rol, tienePerfilReputacion, perfilDesde)')
  })
})

describe('Legal, revisión de c887895: textos literales', () => {
  it('errores del nombre visible y mensaje del servidor', async () => {
    const { UI } = await import('../textos')
    expect(UI.errNombre).toBe('Escribe tu nombre y la inicial de tu apellido con punto, por ejemplo «Ana V.» o «Ana María V.».')
    expect(UI.errNombreLargo).toBe('Usa solo tu nombre y la inicial de tu apellido, por ejemplo «Ana V.». Máximo 30 letras.')
    const sql = await leerArchivo('supabase/migrations/20261025140000_reputacion.sql')
    expect(sql).toContain(`raise exception 'Antes de crear un alquiler o unirte a uno, acepta tu perfil de reputación en la app. No tiene ningún costo.'`)
    const { validarNombre } = await import('../consentimiento'); expect(validarNombre('Ana')).toBe(UI.errNombre)
  })
})
