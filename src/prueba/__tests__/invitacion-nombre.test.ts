// Legal 25/10, 5:01 p. m. (punto 3): COR-C-00 decía «porque El dueño escribió…». Sin nombre visible, va «el dueño» (en minúscula:
// está a mitad de la frase). El mismo valor lo usan la app (Crear.tsx) y el E2E-C real.
import { describe, it, expect } from 'vitest'
import { nombreInvitacion } from '../invitacion'
import { textoInvitacion, NOMBRE_INVITACION } from '../../../api/_lib/textos-correos'
const leer = async (p: string) => ((await import(['node', 'fs'].join(':'))) as { readFileSync(p: string, c: 'utf8'): string }).readFileSync(p, 'utf8')

describe('COR-C-00: «el dueño» en minúscula a mitad de la frase', () => {
  it('sin nombre (o con uno inválido), el nombre por defecto va en minúscula', () => {
    expect(NOMBRE_INVITACION).toBe('el dueño')
    for (const n of [undefined, '', '   ', '<b>x</b>']) expect(nombreInvitacion(n)).toBe('el dueño')
    expect(nombreInvitacion(' Ana ')).toBe('Ana')
  })
  it('el correo dice «porque el dueño escribió…»', () => {
    const t = textoInvitacion(nombreInvitacion(), 'inquilino')
    expect(t.startsWith('Recibes este correo porque el dueño escribió tu correo para invitarte como inquilino')).toBe(true)
    expect(t).not.toContain('El dueño')
  })
  it('el E2E-C no escribe el nombre a mano (usa NOMBRE_INVITACION)', async () => {
    const s = await leer('scripts/e2e-c.mjs')
    expect(s).not.toMatch(/nombre: 'El dueño'/)
    expect(s).toMatch(/nombre: NOMBRE_INVITACION/)
  })
})
