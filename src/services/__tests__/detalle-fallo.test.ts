import { describe, it, expect } from 'vitest'
import { anotarFallo, detalleFallo, limpiarDetalle } from '../firmante'

describe('detalle técnico del fallo al entrar', () => {
  it('lleva paso y tipo, sin URL, correo ni textos largos', () => {
    anotarFallo('llave', new TypeError('failed https://cavos.xyz/api/x?t=abc para ana@correo.com ' + 'a'.repeat(60)))
    const d = detalleFallo()
    expect(d).toMatch(/^llave · TypeError: /)
    expect(d).not.toMatch(/https?:|@|a{32}/)
    expect(d.length).toBeLessThanOrEqual(160)
    limpiarDetalle(); expect(detalleFallo()).toBe('')
  })
})
