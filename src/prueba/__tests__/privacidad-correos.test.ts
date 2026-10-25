// Paso 11 · Privacidad 1.7-demo para los correos (LEGAL-correos-2104.md, punto 2), solo con el interruptor encendido.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { privacidadVigente } from '../../legal/documentos'
import { puedeEnviarAvisos, CASILLA_CORREO } from '../correoAvisos'

afterEach(() => vi.unstubAllEnvs())
describe('privacidad de los correos (1.7-demo)', () => {
  it('con el interruptor apagado sigue la 1.6-demo', () => { vi.stubEnv('VITE_PRUEBA_COMPLETA', ''); expect(privacidadVigente()?.version).toBe('1.6-demo') })
  it('con el interruptor encendido, la 1.7-demo con los cambios de Legal', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); const d = privacidadVigente()!
    expect(d.version).toBe('1.7-demo')
    for (const t of ['**Invitaciones y avisos por correo:** el correo de la persona que invitas y su papel en el alquiler simulado.',
      'Los avisos de plazos y de reclamos tampoco incluirán la dirección ni el nombre del lugar, ni fotos: solo montos de prueba, fechas y un enlace a la app.',
      'Usaremos ese correo solo para la invitación y para los avisos de ese alquiler simulado (plazos, reclamo y respuesta).',
      '3. Mostrar a la otra parte lo necesario para la simulación y enviar por correo la invitación y los avisos del alquiler simulado.',
      'Envía los correos de invitación y de avisos', 'Puedes invitar', 'Al invitarla, declaras', 'El correo lo envía **Resend**']) expect(d.texto).toContain(t)
    expect(d.texto).not.toContain('Solo en la fase 2, cuando se active; todavía no está disponible.')
    expect(d.texto).not.toContain('En la fase 2, cuando se active, el correo')
  })
})
describe('consentimiento en el momento de uso', () => {
  it('texto exacto de la casilla', () => { expect(CASILLA_CORREO).toBe('Acepto que Lockumi me envíe avisos por correo') })
  it('sin la casilla o sin un correo válido, no se envía', () => {
    expect(puedeEnviarAvisos('demo@lockumi.com', false)).toBe(false)
    expect(puedeEnviarAvisos('no es correo', true)).toBe(false)
    expect(puedeEnviarAvisos('demo@lockumi.com', true)).toBe(true)
  })
})
