// Legal (PR #33, 25/10/2026, 11:33 p. m.) · Regla de archivo: cada casilla y cada línea de versión enlaza la versión EXACTA que se
// guardó, y cada versión publicada queda archivada en su propia ruta, byte a byte igual a lo que se publicó (master 8790b52).
// La 1.11-demo es la nueva edición de la cuenta (con la reputación), sin volver a aceptar: quien tiene la 1.10-demo sigue igual.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1', hostname: '127.0.0.1', hash: '' })
const C = (rep: boolean) => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa'); if (rep) vi.stubEnv('VITE_REPUTACION', '1') }
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); mem.clear() })
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
// node:fs con import dinámico (como en revision-legal.test.tsx): tsc no tiene los tipos de Node.
const fs = async () => await import(['node', 'fs'].join(':')) as { readFileSync: (u: URL, e?: string) => Uint8Array & string }
const leer = async (rel: string) => (await fs()).readFileSync(new URL(rel, import.meta.url), 'utf8')
const plano = (h: string) => h.replace(/<[^>]+>/g, '')

// SHA-256 del HTML que publicaba master 8790b52 (calculado con docs() de ese commit, mismo entorno que C()).
const PUBLICADO = {
  '1.9-demo': { terminos: '6cdadd4c58f4a80f894101b9465d752ffe90c18852e4011a8176488e1ecffddf', privacidad: '46a3cfe3b1a9661ad7130416a07f12da0bf0c821ee0c22ad4090d957c0ff2002' },
  '1.10-demo': { terminos: '125ede3e65d9ba21e30e1733922a43a9d8985418eb67ea3367fa7327ed49d7cc', privacidad: '39a43203a34da410da2ab72f713d3e06a4263130bf6d55e4bf27531d052ef28f' },
  '1.8-demo': { terminos: 'a3754dc0a172', privacidad: '28ef613188e7' }, '1.7-demo': { terminos: '97ecd32bdc49', privacidad: '9c11dd530dbf' },
} as const
// Blobs de git de src/legal/v17/*.md en master 8790b52 (git rev-parse 8790b52:src/legal/v17/terminos.md).
const BLOBS = { terminos: '24cb024f80829f7ee4a0a982bc0ecb3121fdce8c', privacidad: '7b6b35af6657bf4ee2e924a220f44d23a6daa77b' }

describe('archivo: los textos publicados son exactamente los de master 8790b52', () => {
  it('src/legal/archivo/8790b52/*.md son byte a byte los de master (mismo blob de git)', async () => {
    for (const [d, blob] of Object.entries(BLOBS)) {
      const b = (await fs()).readFileSync(new URL(`../archivo/8790b52/${d}.md`, import.meta.url)), cab = new TextEncoder().encode(`blob ${b.length}\0`)
      const todo = new Uint8Array(cab.length + b.length); todo.set(cab); todo.set(b, cab.length)
      expect(hex(await crypto.subtle.digest('SHA-1', todo)), d).toBe(blob)
    }
  })
  it.each([true, false])('reputación %s: /terminos-1-9, /privacidad-1-9, /terminos-1-10 y /privacidad-1-10 = HTML publicado (y 1.7, 1.8)', async rep => {
    C(rep); const { docs } = await import('../documentos'), d = docs()
    for (const [v, s] of [['1.9-demo', '-1-9'], ['1.10-demo', '-1-10']] as const) for (const k of ['terminos', 'privacidad'] as const) {
      expect(d[k + s].version).toBe(v); expect(await sha(d[k + s].html), k + s).toBe(PUBLICADO[v][k])
    }
    for (const [v, s] of [['1.8-demo', '-1-8'], ['1.7-demo', '-1-7']] as const) for (const k of ['terminos', 'privacidad'] as const) expect((await sha(d[k + s].html)).slice(0, 12)).toBe(PUBLICADO[v][k])
    if (!rep) { expect(await sha(d.terminos.html)).toBe(PUBLICADO['1.9-demo'].terminos); expect(d['terminos-1-11']).toBeUndefined() }   // apagada: la 1.9-demo de siempre
  })
})

describe('cada enlace abre su versión (texto y número de versión visibles)', () => {
  const LINEA = { '1.9-demo': 'Versión 1.9-demo · 25 de octubre de 2026', '1.10-demo': 'Versión 1.10-demo · 25 de octubre de 2026' } as Record<string, string>
  it.each(['1.9-demo', '1.10-demo', '1.11-demo'])('%s', async v => {
    C(true); const { rutaTerminos, rutaPrivacidad, rutaLegal, docs } = await import('../documentos'), { EDICION_REPUTACION } = await import('../version17')
    const esperado = { '1.9-demo': ['/terminos-1-9', '/privacidad-1-9'], '1.10-demo': ['/terminos-1-10', '/privacidad-1-10'], '1.11-demo': ['/terminos', '/privacidad'] }[v]!
    expect([rutaTerminos(v), rutaPrivacidad(v)]).toEqual(esperado)
    const linea = LINEA[v] ?? `Versión ${EDICION_REPUTACION}`
    for (const r of esperado) {
      const doc = docs()[rutaLegal(r)!], t = plano(doc.html)
      expect(doc.version).toBe(v); expect(t).toContain(linea)
      for (const otra of ['1.9-demo', '1.10-demo', '1.11-demo'].filter(x => x !== v)) expect(t).not.toContain(`Versión ${otra}`)
      // la ronda 1.10 de Legal solo está en la 1.11-demo
      if (r.startsWith('/privacidad')) expect(t.includes('mediación y cierre del alquiler)'), r).toBe(v === '1.11-demo')
      expect(t.includes('Perfil de reputación'), r).toBe(v !== '1.9-demo')
    }
    expect(rutaLegal(esperado[0].replace('/', '#/').slice(1))).toBe(rutaLegal(esperado[0]))   // también como ruta con #
  })
  it('la línea de versión del contrato enlaza la versión guardada (alquiler de una persona en la 1.10-demo y en la 1.11-demo)', async () => {
    C(true); const { Documento } = await import('../../screens/ContratoDoc')
    const A: Alquiler = { id: 'a1', direccion: 'Ejemplo', monto: 800, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-11-01', reglas: [], duenoEmail: 'demo@lockumi.com',
      inquilinoEmail: 'inquilino.prueba@lockumi.com', estado: 'en_curso', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0 }
    const h10 = renderToStaticMarkup(<Documento a={{ ...A, terminos: { version: '1.10-demo' } }} impresion />)
    expect(h10).toMatch(/<a href="\/terminos-1-10"[^>]*>versión 1\.10-demo · 25 de octubre de 2026<\/a>/)
    const h11 = renderToStaticMarkup(<Documento a={{ ...A, terminos: { version: '1.11-demo' } }} impresion />)
    expect(h11).toMatch(/<a href="\/terminos"[^>]*>versión 1\.11-demo · /)
  })
})

describe('1.11-demo sin volver a aceptar', () => {
  it('los alquileres nuevos de una persona guardan la 1.11-demo; los de dos personas siguen en la 1.9-demo', async () => {
    C(true); const { store } = await import('../../store'), { versionActual } = await import('../../prueba/version')
    const n = store.crear({ direccion: 'Ejemplo', monto: 800, inicio: '2026-11-01', fin: '2027-11-01', reglas: [], duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'inquilino.prueba@lockumi.com' })
    expect(n.terminos?.version).toBe('1.11-demo'); expect(versionActual()).toBe('1.9-demo')
  })
  it('un alquiler en la 1.10-demo no ve «pasar a la versión …» (ni hacia la 1.11-demo); el orden es 1.9 < 1.10 < 1.11', async () => {
    C(true); const { puedeCambiarVersion, puedeCambiarA } = await import('../../prueba/version')
    const { ordenVersion } = await import('../versiones')
    expect(ordenVersion('1.9-demo')).toBeLessThan(ordenVersion('1.10-demo')); expect(ordenVersion('1.10-demo')).toBeLessThan(ordenVersion('1.11-demo'))
    // Detalle.tsx muestra la tarjeta solo con puedeCambiarVersion(a) (y un 1.9-demo tampoco: ya está en la vigente).
    expect(await leer('../../screens/Detalle.tsx')).toContain('{puedeCambiarVersion(a) && !ejemplo && <CambioVersion')
    for (const version of ['1.9-demo', '1.10-demo', '1.11-demo']) {
      const a = { id: 'a1', estado: 'en_curso', terminos: { version }, historial: [] } as unknown as Alquiler
      expect(puedeCambiarVersion(a)).toBe(false); expect(puedeCambiarA(a, '1.11-demo')).toBe(false)
    }
  })
  it('la 1.11-demo no es una versión de escenario (no cambia la versión de los alquileres de dos personas ni pide REP-01 otra vez)', async () => {
    C(true); const { VERSIONES, EDICIONES_CUENTA, versionVigente } = await import('../versiones')
    expect(VERSIONES.map(v => v.version)).toEqual(['1.7-demo', '1.8-demo', '1.9-demo'])
    expect(EDICIONES_CUENTA.map(v => v.version)).toEqual(['1.10-demo', '1.11-demo'])
    expect(versionVigente({ 'dos-personas': true, correos: true, reputacion: true })).toBe('1.9-demo')
    // REP-01 no compara la versión (solo la guarda): lk_necesita_rep01 depende de si la cuenta aceptó, no de la edición.
    expect(await leer('../../reputacion/consentimiento.ts')).not.toMatch(/VERSION_TEXTOS\s*[!=]==/)
  })
  it('la guarda del build: producción con la reputación y sin fecha de la 1.11-demo falla; con fecha o en preview, pasa', async () => {
    const { revisarFechaV111 } = await import('../encendido')
    expect(revisarFechaV111({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '[fecha de publicación]')).toMatch(/fecha-1-11\.mjs/)
    expect(revisarFechaV111({ VITE_REPUTACION: '1', VERCEL_ENV: 'preview' }, '[fecha de publicación]')).toBeNull()
    expect(revisarFechaV111({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '26 de octubre de 2026')).toBeNull()
  })
})
