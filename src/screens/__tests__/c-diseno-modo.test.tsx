// PR #22 · regla de Katherine: el diseño que ya existe no se toca. En C, «Simular con dueño de prueba» e «Invitar a la otra persona»
// tienen que verse como en producción (master): mismos elementos y clases. Solo cambia cuál está elegida y desaparece «Pronto».
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import detalleFuente from '../Detalle.tsx?raw'

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} })
const { ModoOpciones } = await import('../Crear')

const html = (dosPersonas: boolean, invitar: boolean) => renderToStaticMarkup(<ModoOpciones dosPersonas={dosPersonas} invitar={invitar} setInvitar={() => {}} />)
/** Solo atributos de accesibilidad (no cambian el aspecto) y el estado: fuera para comparar. */
const sinEstado = (h: string) => h.replace(/ (role|tabindex|aria-checked|aria-label|aria-disabled)="[^"]*"/g, '').replace(/ is-off/g, '').replace(/<span class="na-pronto">Pronto<\/span>/g, '')

describe('C · «elegir modo» igual que producción', () => {
  it('producción (sin C): el marcado de master, con «Pronto»', () => {
    const p = html(false, false)
    expect(p).toContain('<div class="na-modo__op is-off" aria-disabled="true">'); expect(p).toContain('<span class="na-pronto">Pronto</span>')
  })
  it('con C, sin elegir invitar: idéntico a producción salvo «Pronto» (mismos elementos y clases, sin <button>)', () => {
    const c = html(true, false)
    expect(c).not.toMatch(/<button/)
    expect(c).not.toContain('Pronto'); expect(c).not.toContain('is-off')
    expect(sinEstado(c)).toBe(sinEstado(html(false, false)))
  })
  it('con C, eligiendo invitar: solo pasa el estado elegido (is-sel y la marca) a la otra opción', () => {
    const c = sinEstado(html(true, true)), p = sinEstado(html(false, false))
    const marca = /<span class="na-marca">.*?<\/svg><\/span>/
    const op = (h: string) => h.split('<div class="na-modo__op').slice(1).map(x => x.replace(/<\/div>$/, ''))
    const [s0, i0] = op(p), [s1, i1] = op(c)
    expect(s0.startsWith(' is-sel')).toBe(true); expect(s1.startsWith(' is-sel')).toBe(false); expect(i1.startsWith(' is-sel')).toBe(true)
    expect(s1).toBe(s0.replace(' is-sel', '').replace(marca, ''))
    expect(i1.replace(' is-sel', '').replace(marca, '')).toBe(i0)
    expect(i1).toMatch(marca); expect(s1).not.toMatch(marca)
  })
})

// Tarjeta «Invita al inquilino» (visible en C): el campo del link usa el campo de la app (.campo input), no el del navegador.
describe('C · tarjetas nuevas con los estilos que ya existen', () => {
  it('el link de invitación va dentro de un .campo', () => {
    expect(detalleFuente).toMatch(/<label className="campo"><input readOnly value=\{link\} aria-label="Link de invitación"/)
  })
})
