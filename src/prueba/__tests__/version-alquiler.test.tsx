// Paso 16: cada alquiler queda con la versión de los Términos con la que se creó. Los firmados con la 1.6-demo siguen con
// las reglas de la 1.6-demo salvo que los dos acepten la 1.7-demo. La versión se ve en el contrato de cada alquiler.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import { versionAlquiler, reglas17, puedeCambiarVersion, aceptarVersion17, V16, V17 } from '../version'
import { turno } from '../../flujo'
import { Documento } from '../../screens/ContratoDoc'
afterEach(() => vi.unstubAllEnvs())
const T = '2026-10-24T18:00:00.000Z'
const acta = { cuartos: [], firmas: { dueno: T, inquilino: T } }
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'v1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-30', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
  estado: 'en_curso', rendimiento: false, historial: [], contrato: { firmas: { dueno: T, inquilino: T } }, entrada: acta, diasSimulados: 0, ...x })

describe('versión de los Términos de cada alquiler', () => {
  it('sin versión guardada es 1.6-demo (los alquileres de antes)', () => {
    expect(versionAlquiler(alq())).toBe(V16); expect(versionAlquiler(alq({ terminos: { version: V17 } }))).toBe(V17)
  })
  it('las reglas 1.7-demo solo aplican con el interruptor encendido y en alquileres 1.7-demo', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(reglas17(alq())).toBe(false); expect(reglas17(alq({ terminos: { version: V17 } }))).toBe(true)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0'); expect(reglas17(alq({ terminos: { version: V17 } }))).toBe(false)
  })
  it('un alquiler 1.6-demo sigue con las reglas 1.6-demo aunque el interruptor esté encendido', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const r = { monto: 95, motivo: 'x', fotos: [], fecha: T }
    expect(turno(alq({ estado: 'reclamo', reclamo: r }), 'inquilino').tu).toBe('Responde el reclamo: acéptalo o recházalo.')
    expect(turno(alq({ estado: 'reclamo', reclamo: r, terminos: { version: V17 } }), 'inquilino').tu).toBe('Responde el reclamo rubro por rubro.')
  })
  it('pasa a la 1.7-demo solo cuando los dos la aceptan', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const x = alq(); expect(puedeCambiarVersion(x)).toBe(true)
    aceptarVersion17(x, 'inquilino', +new Date(T)); expect(versionAlquiler(x)).toBe(V16); expect(x.terminos?.acepta?.inquilino).toBe(T)
    aceptarVersion17(x, 'dueno', +new Date(T)); expect(versionAlquiler(x)).toBe(V17); expect(x.terminos?.desde).toBe(T)
    expect(x.historial.map(h => h.texto)).toEqual(['El inquilino aceptó pasar este alquiler a los Términos 1.7-demo', 'El dueño aceptó pasar este alquiler a los Términos 1.7-demo', 'Los dos aceptaron: este alquiler sigue ahora los Términos 1.7-demo'])
    expect(puedeCambiarVersion(x)).toBe(false)
  })
  it('no se ofrece después de la salida (las reglas no cambian a mitad de un reclamo) ni con el interruptor apagado', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); expect(puedeCambiarVersion(alq({ estado: 'ventana_reclamo' }))).toBe(false)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0'); expect(puedeCambiarVersion(alq())).toBe(false)
  })
  it('el contrato muestra la versión con su enlace (solo con el interruptor encendido)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(renderToStaticMarkup(<Documento a={alq()} />)).toMatch(/Términos y condiciones: <a href="\/terminos-1-6"[^>]*>versión 1\.6-demo<\/a>/)
    expect(renderToStaticMarkup(<Documento a={alq({ terminos: { version: V17 } })} />)).toMatch(/Términos y condiciones: <a href="\/terminos"[^>]*>versión 1\.7-demo · 25 de octubre de 2026<\/a>/)
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0')
    expect(renderToStaticMarkup(<Documento a={alq()} />)).not.toContain('Términos y condiciones:')
  })
  it('con el interruptor encendido, los alquileres nuevos quedan en la 1.7-demo', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/store.ts', 'utf8')).toMatch(/pruebaCompleta\(\) \? \{ terminos: \{ version: terminosActual\(\)\.version, \.\.\.edicionDe\(terminosActual\(\)\.version, a\.duenoEmail\) \} \} : \{\}/)
  })
})
