// Legal (revisión de c97585b, 26/10/2026) · 1.12-demo: eliminar y ocultar un alquiler. Regla de archivo (CONTRIBUTING.md): la 1.11-demo
// (publicada en master 04e4424) queda congelada en src/legal/archivo/04e4424/ y en /terminos-1-11 y /privacidad-1-11, byte a byte; la
// 1.12-demo fue la vigente (desde el 26/10/2026 la vigente es la 1.13-demo, version-1-13.test.tsx), sin volver a aceptar. La 1.9-demo no cambia.
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

// SHA-256 del HTML que publica master 04e4424 / 7582483 en /terminos y /privacidad (1.11-demo · 26 de octubre de 2026), mismo entorno que C().
const PUBLICADO_111 = { terminos: '2b3a00a5b1fc9a58cd2bfcb0fc86995bfb5d29737d4f07ade5c4bba6ac1d3fb2', privacidad: 'e360f7ded65a4eecd2f9c97ffe662d365319e2f6c72efa334f1aef9388cfb540' }
// Blobs de git de src/legal/v17/*.md en master 04e4424 (git rev-parse 04e4424:src/legal/v17/terminos.md).
const BLOBS_111 = { terminos: '24cb024f80829f7ee4a0a982bc0ecb3121fdce8c', privacidad: 'c0181499af868db9ed18aabb715e16c0d7999561' }
const PUBLICADO_19 = { terminos: '6cdadd4c58f4a80f894101b9465d752ffe90c18852e4011a8176488e1ecffddf', privacidad: '46a3cfe3b1a9661ad7130416a07f12da0bf0c821ee0c22ad4090d957c0ff2002' }

// Textos literales de Legal.
const P1 = 'Si eliminas un alquiler antes de que tenga depósito, borramos en ese momento ese alquiler y sus datos, incluido el correo de la persona invitada. Los registros técnicos que guardan nuestros proveedores (Supabase, Vercel y Resend) se borran según sus propios plazos. Ocultar un alquiler solo lo quita de tu lista: no borra nada y sus datos siguen esta misma regla.'
const P2 = 'Si el dueño elimina el alquiler antes de que te unas, borramos tu correo en ese momento.'
const T4 = 'Esto es distinto de «Reiniciar mi demo» en la app, que solo elimina tus alquileres sin depósito y oculta los que ya terminaron. No toca los alquileres con depósito, los de otras personas ni ningún fondo.'
const T157 = 'Ocultar un alquiler no cambia tu reputación. Eliminar un alquiler que no tuvo depósito tampoco la cambia.'

describe('archivo de la 1.11-demo', () => {
  it('src/legal/archivo/04e4424/*.md son byte a byte los de master 04e4424 (mismo blob de git)', async () => {
    for (const [d, blob] of Object.entries(BLOBS_111)) {
      const b = (await fs()).readFileSync(new URL(`../archivo/04e4424/${d}.md`, import.meta.url)), cab = new TextEncoder().encode(`blob ${b.length}\0`)
      const todo = new Uint8Array(cab.length + b.length); todo.set(cab); todo.set(b, cab.length)
      expect(hex(await crypto.subtle.digest('SHA-1', todo)), d).toBe(blob)
    }
  })
  it('/terminos-1-11 y /privacidad-1-11 = HTML publicado de la 1.11-demo; sin los textos nuevos', async () => {
    C(); const { docs } = await import('../documentos'), d = docs()
    for (const k of ['terminos', 'privacidad'] as const) {
      expect(d[k + '-1-11'].version).toBe('1.11-demo'); expect(await sha(d[k + '-1-11'].html), k).toBe(PUBLICADO_111[k])
      for (const x of [P1, P2, T4, T157]) expect(plano(d[k + '-1-11'].html)).not.toContain(x)
    }
  })
  it('la 1.9-demo no cambia (con y sin la reputación)', async () => {
    for (const rep of [true, false]) {
      vi.resetModules(); vi.unstubAllEnvs(); C(rep); const { docs } = await import('../documentos'), d = docs()
      for (const k of ['terminos', 'privacidad'] as const) expect(await sha(d[k + '-1-9'].html), k + rep).toBe(PUBLICADO_19[k])
    }
  })
})

describe('1.12-demo: los textos de Legal, literales y en su lugar', () => {
  it('/terminos y /privacidad (ahora la 1.15-demo) siguen con los textos de la 1.12-demo; la 1.12-demo queda en /terminos-1-12', async () => {
    C(); const { docs, rutaTerminos, rutaPrivacidad } = await import('../documentos'), { EDICION_REPUTACION } = await import('../version17'), d = docs()
    for (const k of ['terminos', 'privacidad'] as const) { expect(d[k].version).toBe('1.15-demo'); expect(plano(d[k].html)).toContain(`Versión ${EDICION_REPUTACION}`) }
    expect([rutaTerminos('1.12-demo'), rutaPrivacidad('1.12-demo')]).toEqual(['/terminos-1-12', '/privacidad-1-12'])
    expect([rutaTerminos('1.11-demo'), rutaPrivacidad('1.11-demo')]).toEqual(['/terminos-1-11', '/privacidad-1-11'])
  })
  it('Privacidad (1) después de la frase de dos personas y (2) al final del punto de los 7 días', async () => {
    C(); const t = plano((await import('../documentos')).docs().privacidad.html)
    expect(t).toContain('salvo que pida antes que lo borremos. ' + P1 + ' Luego los eliminamos')
    expect(t).toContain('escribiendo a business.applockumi@gmail.com. ' + P2)
  })
  it('Términos (4) al final de 5.7 y 15.7 con las dos frases', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    expect(t).toContain('Lockumi no podría devolverlos. ' + T4)
    expect(t).toContain('siguen la regla general del Aviso de privacidad. ' + T157)
  })
  it('las notas LEGAL no se publican', async () => {
    C(); const d = (await import('../documentos')).docs()
    for (const k of ['terminos', 'privacidad'] as const) expect(d[k].html).not.toContain('c97585b')
  })
})

describe('1.12-demo sin volver a aceptar', () => {
  it('es edición de la cuenta (no de escenario), va después de la 1.11-demo y nadie ve «pasar a la versión …»', async () => {
    C(); const { VERSIONES, EDICIONES_CUENTA, versionVigente, ordenVersion } = await import('../versiones')
    const { puedeCambiarVersion, puedeCambiarA } = await import('../../prueba/version')
    expect(VERSIONES.map(v => v.version)).toEqual(['1.7-demo', '1.8-demo', '1.9-demo'])
    expect(EDICIONES_CUENTA.map(v => v.version)).toEqual(['1.10-demo', '1.11-demo', '1.12-demo', '1.13-demo', '1.14-demo', '1.15-demo'])
    expect(ordenVersion('1.11-demo')).toBeLessThan(ordenVersion('1.12-demo'))
    expect(versionVigente({ 'dos-personas': true, correos: true, reputacion: true })).toBe('1.9-demo')
    for (const version of ['1.9-demo', '1.10-demo', '1.11-demo']) {
      const a = { id: 'a1', estado: 'en_curso', terminos: { version }, historial: [] } as never
      expect(puedeCambiarVersion(a)).toBe(false); expect(puedeCambiarA(a, '1.12-demo')).toBe(false)
    }
  })
  it('la guarda del build: producción con la reputación y sin fecha de la 1.12-demo falla; con fecha o en preview, pasa', async () => {
    const { revisarFechaV112 } = await import('../encendido'), { FECHA_V112 } = await import('../fecha-v112')
    expect(revisarFechaV112({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '[fecha de publicación]')).toMatch(/fecha-1-12\.mjs/)
    expect(revisarFechaV112({ VITE_REPUTACION: '1', VERCEL_ENV: 'preview' }, '[fecha de publicación]')).toBeNull()
    expect(revisarFechaV112({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '27 de octubre de 2026')).toBeNull()
    expect(FECHA_V112).toBe('26 de octubre de 2026')   // escrita con scripts/fecha-1-12.mjs el día de la publicación
    expect(revisarFechaV112({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, FECHA_V112)).toBeNull()
  })
})
