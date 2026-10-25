// Paso 16: Términos y Aviso de privacidad 1.7-demo (textos de Legal, prueba-completa-textos.md A.1–A.8 y la conservación de la
// mediación a 30 días). Solo con el interruptor encendido; apagado, /terminos y /privacidad siguen en la 1.6-demo.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { docs, terminosActual, privacidadActual, docTerminos, rutaLegal, DOCS } from '../documentos'
afterEach(() => vi.unstubAllEnvs())
const texto = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')

describe('Términos 1.7-demo', () => {
  it('apagado: todo sigue en la 1.6-demo y no hay rutas nuevas', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0')
    expect(terminosActual().version).toBe('1.6-demo'); expect(privacidadActual()?.version).toBe('1.6-demo')
    expect(docs()).toBe(DOCS); expect(rutaLegal('/terminos-1-6')).toBeNull(); expect(Object.keys(DOCS).some(k => k.includes('v17'))).toBe(false)
  })
  it('encendido: /terminos y /privacidad muestran la 1.7-demo; la 1.6-demo queda en /terminos-1-6 y /privacidad-1-6', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(terminosActual().version).toBe('1.7-demo'); expect(privacidadActual()?.version).toBe('1.7-demo')
    expect(docs().terminos.version).toBe('1.7-demo'); expect(rutaLegal('/terminos-1-6')).toBe('terminos-1-6')
    expect(docs()['terminos-1-6'].version).toBe('1.6-demo'); expect(docs()['privacidad-1-6'].version).toBe('1.6-demo')
    expect(docTerminos('1.6-demo').version).toBe('1.6-demo'); expect(docTerminos('1.7-demo').version).toBe('1.7-demo')
  })
  it('trae las cláusulas de Legal (A.1–A.8)', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const t = texto(terminosActual().html)
    for (const f of ['Versión 1.7-demo · 25 de octubre de 2026', 'la propuesta automática no usa inteligencia artificial', 'con su propia llave, distinta de la cuenta de Lockumi',
      '5.2.1 Suscripción.', 'En la demo, la app es gratis: no hay suscripción ni se cobra nada.', 'el reparto se elige con el botón «Resolver el reclamo (simulación)» (cláusula 6.7)',
      '6.1.1 Aviso antes de la salida.', '6.4.1 Pruebas completas.', '6.5.1 Regla de propuesta automática (opcional).', '6.7.1 En el servicio con dinero real,',
      '6.8 Mediación Lockumi (demo).', '6.9 No renuncia a derechos.', 'Anexo 6-A. Desgaste normal y daños'])
      // (la cláusula 8 con la persona del equipo solo aparece con el modo de dos personas: unificado-17.test.ts)
      expect(t).toContain(f)
    expect(t).not.toContain('persona mediadora simulada')
  })
  it('6.5.1 b) y 6.8 g) terminan sin paréntesis (Legal, 11:25 p. m.) y la 6.7.1 no nombra una región', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const t = texto(terminosActual().html)
    expect(t).toContain('la mediación tendría un costo, que se informaría antes de firmar. En la demo, el costo es simulado y no se cobra.')
    expect(t).toContain('(Ley 7727, art. 72), con un costo que se informaría antes de firmar.')
    expect(t).not.toMatch(/informaría antes de firmar\s*\)/); expect(t).not.toMatch(/regi[oó]n/i)
  })
  it('Privacidad 1.7-demo: los datos de una mediación se borran a los 30 días de cerrar el caso', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    expect(texto(privacidadActual()!.html)).toContain('Lo que se usa para una mediación lo borramos o lo anonimizamos 30 días después de cerrar el caso, salvo que una de las partes nos pida guardarlo para un reclamo fuera de la app. Los datos que quedan solo en tu navegador')
  })
})
