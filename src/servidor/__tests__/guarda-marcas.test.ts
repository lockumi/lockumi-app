// Legal 25/10, 5:09 p. m. (punto 10) · La guarda del build de producción cubre TODAS las marcas «LEGAL: revisar» visibles
// (código, textos legales y migraciones), no solo los textos de los correos.
import { describe, it, expect } from 'vitest'
import { marcasPorRevisar, revisarBuildCorreos, CARPETAS_GUARDA, revisaGuarda, type Archivo } from '../../../api/_lib/guarda-correos'

type Fs = { readdirSync(p: string): string[]; readFileSync(p: string, c: 'utf8'): string; statSync(p: string): { isDirectory(): boolean } }
async function repo(): Promise<Archivo[]> {
  const fs = await import(['node', 'fs'].join(':')) as Fs, r: Archivo[] = []
  const ver = (d: string) => { for (const n of fs.readdirSync(d)) { const p = `${d}/${n}`
    if (fs.statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== '__tests__') ver(p) } else if (revisaGuarda(p)) r.push({ ruta: p, texto: fs.readFileSync(p, 'utf8') }) } }
  for (const c of CARPETAS_GUARDA) ver(c)
  return r
}

describe('marcas «LEGAL: revisar» visibles', () => {
  it('encuentra las marcas de comentario en TS/TSX, Markdown y SQL (al inicio o después de código)', () => {
    expect(marcasPorRevisar([
      { ruta: 'api/_lib/correo.ts', texto: 'a\n// LEGAL: revisar · x\nconst t = 1 // LEGAL: revisar · y' },
      { ruta: 'src/prueba/A.tsx', texto: '<p>x</p>{/* LEGAL: revisar */}\n{/* LEGAL: revisado (25/10) */}' },
      { ruta: 'src/legal/v17/privacidad.md', texto: '<!-- LEGAL: revisar · 1.9-demo -->' },
      { ruta: 'supabase/migrations/x.sql', texto: '  -- LEGAL: revisar · evento\n-- LEGAL: revisado (25/10)' },
    ])).toEqual(['api/_lib/correo.ts:2', 'api/_lib/correo.ts:3', 'src/prueba/A.tsx:1', 'src/legal/v17/privacidad.md:1', 'supabase/migrations/x.sql:1'])
  })
  it('no cuentan las menciones que explican la regla, ni las pruebas', () => {
    expect(marcasPorRevisar([
      { ruta: 'src/legal/LEEME.md', texto: '- Las notas `<!-- LEGAL: revisar … -->` no se publican. `// LEGAL: revisar`.' },
      { ruta: 'api/_lib/textos-correos.ts', texto: '// REGLA DURA: ningún texto marcado «LEGAL: revisar» sale' },
      { ruta: 'src/__tests__/a.test.ts', texto: '// LEGAL: revisar' },
    ])).toEqual([])
  })
  it('el build de producción falla con cualquier marca visible; fuera de producción, no', () => {
    const una = [{ ruta: 'src/legal/v17/privacidad.md', texto: '<!-- LEGAL: revisar · x -->' }]
    expect(() => revisarBuildCorreos({ VERCEL_ENV: 'preview' }, una)).not.toThrow()
    expect(() => revisarBuildCorreos({ VERCEL_ENV: 'production' }, una)).toThrow(/LEGAL: revisar/)
  })
  it('en el repositorio no queda ninguna marca (OK de Legal para publicar C, 25/10, 5:31 p. m.)', async () => {
    expect(marcasPorRevisar(await repo())).toEqual([])
  })

})
