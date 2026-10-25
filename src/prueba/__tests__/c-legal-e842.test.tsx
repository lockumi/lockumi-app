// PR #22 · Legal dio el OK a e842e2b (25/10, 4:33 a. m. CR) con estos cambios literales, todos detrás de C.
import { describe, it, expect } from 'vitest'
import { TEXTO_APROBAR_DOS, TEXTO_APROBADO_DOS } from '../dosPersonas'

const raw = async (p: string) => (await import(/* @vite-ignore */ p + '?raw')).default as string

describe('Legal 25/10, 4:33 a. m.', () => {
  it('1) aprobar y aprobado: «en cuanto la red de prueba lo confirme», y revisados', async () => {
    expect(TEXTO_APROBAR_DOS).toBe('Vas a aprobar en la red de prueba que se devuelva todo el depósito al inquilino. Después ya no podrás reclamar en la app. Se le entrega en cuanto la red de prueba lo confirme, menos el 0,3 % de comisión de la red de prueba de Trustless Work.')
    expect(TEXTO_APROBADO_DOS).toBe('Ya aprobaste la devolución completa y ya no puedes reclamar en la app. El depósito se le entrega al inquilino en cuanto la red de prueba lo confirme, menos el 0,3 % de comisión de la red de prueba de Trustless Work.')
    expect(await raw('../dosPersonas.ts')).not.toContain('LEGAL: revisar')
  })
  it('2) y 5) Términos: 2.4 con el vencimiento del enlace; 6.5 a) con «hasta 24 horas», dentro de {{dos-personas:…}}', async () => {
    const t = await raw('../../legal/v17/terminos.md')
    expect(t).toContain('En el alquiler con otra persona, quien lo crea es el dueño e invita al inquilino con un enlace. El enlace vence a los 7 días si la persona no se une.')
    expect(t).toContain('{{dos-personas: En la fase 2, si el plazo vence sin reclamo y el dueño no aprobó, la devolución del 100 % al inquilino es automática (cláusula 5.3 d). Puede tardar hasta 24 horas después de que vence el plazo. No la decide')
  })
  it('3) Privacidad: invitada como inquilino y «el correo de invitación de Lockumi»', async () => {
    const p = await raw('../../legal/v17/privacidad.md')
    expect(p).not.toContain('el papel de la persona invitada (dueño o inquilino)')
    expect(p).toContain('Solo contiene quién invita, que la invitan como inquilino, un resumen')
    expect(p).toContain('{{correos: y que acepta recibir el correo de invitación de Lockumi}}')
  })
  it('6) «liberar» en el historial: USDC de prueba', async () => {
    expect(await raw('../../../api/_lib/tw.ts')).toContain('Se liberó el depósito al inquilino desde Trustless Work (${k.monto} USDC de prueba menos la comisión de 0,3 % de Trustless Work)')
  })
  it('5) el rechazo por plazo vencido está en la lista de errores de Legal (revisado a las 4:56 a. m.)', async () => {
    const m = await raw('../../../supabase/migrations/20261025070000_c_reclamo_vencido.sql')
    // Legal 4:56 a. m. dio el texto final y quitó la marca (c-errores-legal.test.ts)
    expect(m).toMatch(/-- LEGAL: revisado \(25\/10, 4:56 a\. m\., Legal\)[^\n]*\n\s*raise exception 'El plazo para reclamar ya terminó y ya no puedes reclamar en la app\./)
  })
})
