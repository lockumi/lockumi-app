// PR #22 · Legal 25/10, 4:56 a. m. CR: textos finales de los errores nuevos del servidor (legal/errores-servidor-c.md, 1–9).
import { describe, it, expect } from 'vitest'

const mig = import.meta.glob('../../../supabase/migrations/202610250[3-7]0000_*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const de = (n: string) => Object.entries(mig).find(([p]) => p.includes(n))![1]
const tw = import.meta.glob('../../../api/_lib/tw.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const REV = '-- LEGAL: revisado (25/10, 4:56 a. m., Legal)'
/** La marca de revisado está en las 3 líneas de arriba del texto. */
const revisado = (src: string, texto: string) => { const l = src.split('\n'), i = l.findIndex(x => x.includes(texto)); expect(i, texto).toBeGreaterThan(0); expect(l.slice(Math.max(0, i - 3), i + 1).join('\n'), texto).toContain(REV) }

describe('Legal 4:56: errores del servidor de C', () => {
  it('ninguna de las migraciones 030000–070000 sigue con «LEGAL: revisar»', () => {
    expect(Object.keys(mig)).toHaveLength(5)
    for (const [p, s] of Object.entries(mig)) expect(s, p).not.toContain('LEGAL: revisar')
  })
  it('1–7 con el texto de Legal, literal, y marcados como revisados', () => {
    const m70 = de('070000'), m60 = de('060000'), m50 = de('050000'), m30 = de('030000')
    revisado(m70, "'El plazo para reclamar ya terminó y ya no puedes reclamar en la app. El depósito se le devuelve al inquilino; puede tardar hasta 24 horas. Fuera de la app, aplica la cláusula 6.5 d).'")
    for (const m of [m70, m60]) revisado(m, "'Ya aprobaste la devolución completa y ya no puedes reclamar en la app. Fuera de la app, aplica la cláusula 6.5 d).'")
    revisado(m60, "'Tu plazo para reclamar ya empezó el % y termina el %.'")
    revisado(m50, "'Para unirte, acepta los Términos % de este alquiler y el Aviso de privacidad.'")
    revisado(m50, "'Acepta los Términos y el Aviso de privacidad para seguir.'")
    revisado(m50, "'La Regla de propuesta automática no se ofrece en esta versión (6.5.1 d).'")
    revisado(m30, "'La Regla de propuesta automática (6.5.1) solo se acepta al firmar el contrato.'")
    expect(m50).not.toContain('Acepta los Términos % de este alquiler para unirte.')
  })
  it('8 y 9 (tw.ts) sin cambios y marcados como revisados', () => {
    const s = Object.values(tw)[0]
    expect(s).toContain("'La aprobación quedó en la red de prueba, pero todavía no se pudo entregar el depósito. Vuelve a abrir el alquiler para reintentarlo.'")
    expect(s).toContain("{ error: 'No encontrado.' }")
    for (const t of ['todavía no se pudo entregar el depósito', "{ error: 'No encontrado.' }"]) { const l = s.split('\n'), i = l.findIndex(x => x.includes(t)); expect(l.slice(Math.max(0, i - 3), i + 1).join('\n'), t).toContain('// LEGAL: revisado (25/10, 4:56 a. m., Legal)') }
  })
})
