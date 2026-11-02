// Legal (26/10/2026, 1:15 a. m.) · 1.13-demo: sin la pantalla aparte de REP-01, el perfil de reputación se acepta con la casilla de los
// Términos. Regla de archivo (CONTRIBUTING.md): la 1.12-demo (publicada en master 4dfa5ae) queda congelada en src/legal/archivo/4dfa5ae/
// y en /terminos-1-12 y /privacidad-1-12, byte a byte; la 1.13-demo es la vigente, sin volver a aceptar. La 1.9-demo no cambia.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1', hostname: '127.0.0.1', hash: '' })
const C = (rep = true) => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa'); if (rep) vi.stubEnv('VITE_REPUTACION', '1') }
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); mem.clear() })
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
const fs = async () => await import(['node', 'fs'].join(':')) as { readFileSync: (u: URL, e?: string) => Uint8Array & string }
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')

// SHA-256 del HTML que publica master 4dfa5ae en /terminos y /privacidad (1.12-demo · 26 de octubre de 2026), mismo entorno que C().
const PUBLICADO_112 = { terminos: '5db0e31ad4293d16b803bbe50257f44493933571f6e59e78da9cb61cbb39fa8a', privacidad: '1d5f055bb94b89ecc1b01b233c21cb67e848d8dfd3c583692f62355030daac83' }
// Blobs de git de src/legal/v17/*.md en master 4dfa5ae (git rev-parse 4dfa5ae:src/legal/v17/terminos.md).
const BLOBS_112 = { terminos: '395ed8f7db6c1936c96a34a211f619dc68385797', privacidad: '045ead3ddf7e4e402bce0645be4fe3f7d75ff858' }

// Textos literales de Legal (26/10/2026, 1:15 a. m.).
const CASILLA = 'Acepto los Términos 1.15-demo, incluido mi perfil de reputación público.'
const LINEA = 'Tu cuenta incluye un perfil público y fijo que cualquiera con el enlace puede ver: tu nombre, la inicial de tu apellido y, desde tu 3.er alquiler cerrado, tu puntaje. Nunca muestra tu dirección, teléfono, correo ni montos. Solo deja de verse si eliminas tu cuenta.'
const T151 = 'que se crea con tu cuenta cuando aceptas estos Términos'
const T151_FIN = 'Las cuentas creadas antes de aceptar el perfil de reputación siguen usando Lockumi sin perfil público, y sus alquileres no se publican ni cuentan para la reputación. Si más adelante aceptan estos Términos en la pantalla de inicio, reciben su perfil desde ese momento, y sus alquileres cerrados antes de eso no cuentan.'
const P101 = 'Lo aceptas al marcar la casilla de los Términos, que nombra el perfil y sale sin marcar.'

describe('archivo de la 1.12-demo', () => {
  it('src/legal/archivo/4dfa5ae/*.md son byte a byte los de master 4dfa5ae (mismo blob de git)', async () => {
    for (const [d, blob] of Object.entries(BLOBS_112)) {
      const b = (await fs()).readFileSync(new URL(`../archivo/4dfa5ae/${d}.md`, import.meta.url)), cab = new TextEncoder().encode(`blob ${b.length}\0`)
      const todo = new Uint8Array(cab.length + b.length); todo.set(cab); todo.set(b, cab.length)
      expect(hex(await crypto.subtle.digest('SHA-1', todo)), d).toBe(blob)
    }
  })
  it('/terminos-1-12 y /privacidad-1-12 = HTML publicado de la 1.12-demo; sin los textos nuevos', async () => {
    C(); const { docs } = await import('../documentos'), d = docs()
    for (const k of ['terminos', 'privacidad'] as const) {
      expect(d[k + '-1-12'].version).toBe('1.12-demo'); expect(await sha(d[k + '-1-12'].html), k).toBe(PUBLICADO_112[k])
      for (const x of [T151, T151_FIN, P101]) expect(plano(d[k + '-1-12'].html)).not.toContain(x)
    }
  })
})

describe('1.13-demo: los textos de Legal, literales y en su lugar', () => {
  it('/terminos y /privacidad (ahora la 1.15-demo) conservan los textos de la 1.13-demo; la 1.13-demo queda en /terminos-1-13 y la 1.12-demo en su ruta', async () => {
    C(); const { docs, rutaTerminos, rutaPrivacidad } = await import('../documentos'), { EDICION_REPUTACION } = await import('../version17'), d = docs()
    expect(EDICION_REPUTACION).toMatch(/^1\.15-demo · /)
    for (const k of ['terminos', 'privacidad'] as const) { expect(d[k].version).toBe('1.15-demo'); expect(plano(d[k].html)).toContain(`Versión ${EDICION_REPUTACION}`) }
    expect([rutaTerminos('1.13-demo'), rutaPrivacidad('1.13-demo')]).toEqual(['/terminos-1-13', '/privacidad-1-13'])
    expect([rutaTerminos('1.14-demo'), rutaPrivacidad('1.14-demo')]).toEqual(['/terminos-1-14', '/privacidad-1-14'])
    expect([rutaTerminos('1.15-demo'), rutaPrivacidad('1.15-demo')]).toEqual(['/terminos', '/privacidad'])
    expect([rutaTerminos('1.12-demo'), rutaPrivacidad('1.12-demo')]).toEqual(['/terminos-1-12', '/privacidad-1-12'])
  })
  it('Términos 15.1: «cuando aceptas estos Términos» y la última oración nueva; sin «pantalla aparte» para el perfil', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    expect(t).toContain('15.1 Usar Lockumi incluye un perfil de reputación público (perfil, puntaje e insignias), ' + T151 + '.')
    expect(t).toContain('(Dueños destacados, Inquilinos destacados y Nuevos en Lockumi) son opcionales. ' + T151_FIN)
    expect(t).not.toContain('después de que lo aceptes en una pantalla aparte')
    expect(t).not.toContain('Las cuentas creadas antes de la versión')
    expect(t).toContain('6.5.1 Regla de propuesta automática (opcional). Al firmar el alquiler, el inquilino puede aceptar o no esta regla, en una pantalla aparte')   // 6.5.1 no cambia
  })
  it('Privacidad: «Perfil de reputación» dice cómo se acepta; sin pantalla previa ni «pantalla aparte»', async () => {
    C(); const t = plano((await import('../documentos')).docs().privacidad.html)
    expect(t).toContain('**Cualquier persona en internet** con el enlace puede verlo. '.replace(/\*\*/g, '') + P101 + ' Si no lo aceptas, puedes no crear tu cuenta, sin costo.')
    expect(t).toContain(T151_FIN)
    expect(t).toContain('Consentimiento: lo aceptas al marcar la casilla de los Términos, que nombra el perfil y sale sin marcar. Guardamos la versión, la fecha, la hora y el texto que aceptaste.')
    for (const x of ['pantalla aparte', 'pantalla previa', 'Antes de crear tu cuenta te pedimos']) expect(t).not.toContain(x)
    expect(t).toContain('Antes de usar la demo, la app te muestra una casilla sin marcar para aceptar este aviso.')   // :163 no cambia
  })
  it('las notas LEGAL no se publican', async () => {
    C(); const d = (await import('../documentos')).docs()
    for (const k of ['terminos', 'privacidad'] as const) expect(d[k].html).not.toContain('1:15 a. m.')
  })
})

describe('la casilla de los Términos en la pantalla de inicio', () => {
  it('con la reputación: el texto literal de Legal y su línea; sin ella, la de siempre', async () => {
    C(); let m = await import('../documentos')
    const c = m.casillaTerminos(); expect(c.antes + c.enlace + c.despues).toBe(CASILLA); expect(c.enlace).toBe('Términos 1.15-demo'); expect(c.linea).toBe(LINEA)
    expect(m.textoCasillaTerminos()).toEqual([CASILLA, LINEA])
    vi.resetModules(); vi.unstubAllEnvs(); C(false); m = await import('../documentos')
    const s = m.casillaTerminos(); expect(s.antes + s.enlace + s.despues).toBe('Acepto los Términos y condiciones'); expect(s.linea).toBeUndefined()
  })
})

describe('1.13-demo sin volver a aceptar', () => {
  it('es edición de la cuenta (no de escenario), va después de la 1.12-demo y nadie ve «pasar a la versión …»', async () => {
    C(); const { VERSIONES, EDICIONES_CUENTA, ordenVersion, versionVigente } = await import('../versiones'), { puedeCambiarVersion, puedeCambiarA } = await import('../../prueba/version')
    expect(VERSIONES.map(v => v.version)).toEqual(['1.7-demo', '1.8-demo', '1.9-demo'])
    expect(EDICIONES_CUENTA.map(v => v.version)).toEqual(['1.10-demo', '1.11-demo', '1.12-demo', '1.13-demo', '1.14-demo', '1.15-demo'])
    expect(ordenVersion('1.12-demo')).toBeLessThan(ordenVersion('1.13-demo'))
    expect(versionVigente({ 'dos-personas': true, correos: true, reputacion: true })).toBe('1.9-demo')
    for (const version of ['1.9-demo', '1.10-demo', '1.11-demo', '1.12-demo', '1.13-demo']) {
      const a = { id: 'a1', estado: 'en_curso', terminos: { version }, historial: [] } as never
      expect(puedeCambiarVersion(a)).toBe(false); expect(puedeCambiarA(a, '1.13-demo')).toBe(false)
    }
  })
  it('la guarda del build: producción con la reputación y sin fecha de la 1.13-demo falla; con fecha o en preview, pasa', async () => {
    const { revisarFechaV113 } = await import('../encendido'), { FECHA_V113 } = await import('../fecha-v113')
    expect(FECHA_V113).toBe('26 de octubre de 2026')   // escrita con scripts/fecha-1-13.mjs el día de la publicación
    expect(revisarFechaV113({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '[fecha de publicación]')).toMatch(/fecha-1-13\.mjs/)
    expect(revisarFechaV113({ VITE_REPUTACION: '1', VERCEL_ENV: 'preview' }, '[fecha de publicación]')).toBeNull()
    expect(revisarFechaV113({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '27 de octubre de 2026')).toBeNull()
    expect(revisarFechaV113({ VERCEL_ENV: 'production' }, '[fecha de publicación]')).toBeNull()
  })
})
