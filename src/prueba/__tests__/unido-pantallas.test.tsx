// paso16-unido · Arreglos 2, 3 y 4 de Legal (25/10, 12:05 a. m.): B.7 en un solo aparato, historial del borrado a los 30 días,
// pedido de guardar los datos, contrato con la versión, la fecha única y la fecha de aceptación de cada parte.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Foto } from '../../types'
import { MediacionPC, GuardarDatosMediacion } from '../MediacionPC'
import { CASILLA_MEDIACION, registrarConsentimiento } from '../consentimientos'
import { TEXTO_BORRADO, debeBorrarMediacion, guardarMediacion, textoGuardar } from '../borrado'
import { aceptarVersion17 } from '../version'
import { Documento } from '../../screens/ContratoDoc'
import { EDICION_V17 } from '../../legal/version17'
import { guardarAceptacion } from '../../legal/aceptacion'
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
afterEach(() => { vi.unstubAllEnvs(); mem.clear() })

const CIERRE = '2026-11-10T16:00:00.000Z', DIA = 86_400_000
const f = (src: string): Foto => ({ src, por: 'dueno', fecha: CIERRE })
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'u1', direccion: 'Casa', monto: 20, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-10-31', reglas: [], duenoEmail: 'd@x.com', inquilinoEmail: 'i@x.com',
  estado: 'mediacion', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, terminos: { version: '1.7-demo' },
  reclamo: { monto: 5, motivo: 'Pared manchada', fotos: [f('a.jpg')], fecha: CIERRE }, ...x })
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/\s+/g, ' ')

const B7_UNO = 'Mediación Lockumi (demo): es una simulación. El reparto se elige con el botón «Resolver el reclamo (simulación)» y solo se hace si los dos lo aceptan. No tiene efecto legal, no es una mediación según la Ley 7727 y no tiene costo. Si no hay acuerdo, el monto sigue guardado y pueden ir a los tribunales.'

describe('B.7 en un solo aparato (arreglo 2)', () => {
  it('texto exacto de Legal, sin casilla, sin «Pedir mediación», sin persona del equipo, 3 días hábiles ni 10 casos', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const h = renderToStaticMarkup(<MediacionPC a={alq()} rol="inquilino" />), b7 = h.slice(h.indexOf('mediacion-b7'), h.indexOf('resolver-sim'))
    expect(plano(b7)).toContain(B7_UNO)
    expect(b7).not.toContain('type="checkbox"'); expect(h).not.toContain('Pedir mediación'); expect(h).not.toContain(CASILLA_MEDIACION)
    for (const no of ['una persona del equipo', 'Una persona del equipo', '3 días hábiles', '10 casos']) expect(plano(h)).not.toContain(no)
    expect(h).toContain('Resolver el reclamo (simulación)')
  })
  it('con otra persona, la B.7 sigue igual: con la casilla de la sección C y «Pedir mediación»', () => {
    for (const [k, v] of Object.entries({ VITE_PRUEBA_COMPLETA: '1', VITE_TRUSTLESS: '1', VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'a', VITE_DOS_PERSONAS: '1' })) vi.stubEnv(k, v)
    const h = renderToStaticMarkup(<MediacionPC a={alq({ dosPersonas: true })} rol="inquilino" />)
    expect(h).toContain(CASILLA_MEDIACION); expect(h).toContain('Pedir mediación'); expect(plano(h)).toContain('Respondemos en un plazo de 3 días hábiles (máximo 10 casos en la demo).')
  })
})

describe('borrado a los 30 días y pedido de guardar (arreglo 3)', () => {
  const cerrado = (x: Partial<Alquiler> = {}) => alq({ estado: 'cerrado', resultado: { dueno: 2, inquilino: 18, via: 'simulacion', fecha: CIERRE }, ...x })
  it('historial del borrado: texto exacto', () => {
    expect(TEXTO_BORRADO).toBe('Se borraron las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo), 30 días después de cerrar el caso. Se conservan los montos y el resultado.')
  })
  it('en un solo aparato ya no se «pide» la mediación: se borra todo caso cerrado en la mediación (simulación)', () => {
    expect(debeBorrarMediacion(cerrado(), +new Date(CIERRE) + 30 * DIA)).toBe(true)
    expect(debeBorrarMediacion(cerrado({ resultado: { dueno: 0, inquilino: 20, via: 'acuerdo', fecha: CIERRE } }), +new Date(CIERRE) + 31 * DIA)).toBe(false)
  })
  it('pedir guardar deja la línea en el historial y ya no se borra', () => {
    for (const [rol, quien] of [['dueno', 'El dueño'], ['inquilino', 'El inquilino']] as const) {
      const x = cerrado(); guardarMediacion(x, rol, +new Date(CIERRE) + DIA)
      expect(textoGuardar(rol)).toBe(`${quien} pidió guardar los datos de la mediación para un reclamo fuera de la app.`)
      expect(x.historial.at(-1)!.texto).toBe(textoGuardar(rol)); expect(debeBorrarMediacion(x, +new Date(CIERRE) + 40 * DIA)).toBe(false)
    }
  })
  it('botón para pedir guardar los datos en «Terminado» (solo mientras no se borraron)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(renderToStaticMarkup(<GuardarDatosMediacion a={cerrado()} rol="inquilino" />)).toContain('Guardar los datos de la mediación')
    const g = cerrado(); guardarMediacion(g, 'dueno', +new Date(CIERRE))
    expect(plano(renderToStaticMarkup(<GuardarDatosMediacion a={g} rol="inquilino" />))).toContain(textoGuardar('dueno'))
    expect(renderToStaticMarkup(<GuardarDatosMediacion a={cerrado({ reclamo: { monto: 5, motivo: '', fotos: [], fecha: CIERRE, mediacion: { estado: 'pedida', fecha: CIERRE, borrado: CIERRE } } })} rol="inquilino" />)).not.toContain('<button')
  })
})

describe('contrato: versión, fecha única y aceptación de cada parte (arreglos 3 y 4)', () => {
  it('1.7-demo · 25 de octubre de 2026 y la fecha de aceptación del dueño y del inquilino', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const t = plano(renderToStaticMarkup(<Documento a={alq({ estado: 'firmas', contrato: { firmas: { dueno: '2026-10-25T17:00:00.000Z', inquilino: '2026-10-25T18:30:00.000Z' } } })} />))
    expect(t).toContain(`Términos y condiciones: versión ${EDICION_V17}`)
    expect(t).toMatch(/Aceptada por el dueño el 25 oct 2026[^.]* y por el inquilino el 25 oct 2026[^.]*\./)
    const p = plano(renderToStaticMarkup(<Documento a={alq({ estado: 'firmas', contrato: { firmas: { dueno: '2026-10-25T17:00:00.000Z' } } })} />))
    expect(p).toMatch(/Aceptada por el dueño el 25 oct 2026[^.]*\. Falta la aceptación del inquilino\./)
  })
  it('si pasaron a la 1.7-demo, la fecha de aceptación es la del cambio de versión', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const x = alq({ estado: 'en_curso', terminos: undefined, contrato: { firmas: { dueno: '2026-10-01T15:00:00.000Z', inquilino: '2026-10-01T15:00:00.000Z' } } })
    aceptarVersion17(x, 'dueno', +new Date('2026-10-26T18:00:00Z')); aceptarVersion17(x, 'inquilino', +new Date('2026-10-27T18:00:00Z'))
    expect(x.terminos?.edicion).toBe(EDICION_V17)
    expect(plano(renderToStaticMarkup(<Documento a={x} />))).toMatch(/Aceptada por el dueño el 26 oct 2026.* y por el inquilino el 27 oct 2026/)
  })
  it('los registros de aceptación guardan la misma edición (fecha única)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(guardarAceptacion('terminos', '1.7-demo').edicion).toBe(EDICION_V17)
    expect(guardarAceptacion('terminos', '1.6-demo')).not.toHaveProperty('edicion')
    expect(registrarConsentimiento(alq(), 'mediacion', 'inquilino', CASILLA_MEDIACION, 0).edicion).toBe(EDICION_V17)
  })
})
