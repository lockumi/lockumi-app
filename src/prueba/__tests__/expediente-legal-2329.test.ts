// Paso 14 · Cambios de Legal del 24/10 (11:29 p. m.) y fotos dentro del PDF, sin datos personales.
import { describe, it, expect } from 'vitest'
import { contenidoExpediente, pdfExpediente, textoPdf, sinMetadatosJpeg, NOTA_SIMULACION, type ImagenPdf } from '../expediente'
import { propuesta } from '../propuesta'
import { actaVacia } from '../../store'
import type { Alquiler } from '../../types'

const foto = (por: 'dueno' | 'inquilino', src = 'data:image/jpeg;base64,AA') => ({ src, por, fecha: '2026-10-20T16:30:00Z', origen: 'camara' as const })
function alquiler(version = '9.9-prueba'): Alquiler {
  const entrada = actaVacia(); entrada.cuartos.forEach(c => c.fotos.push(foto('inquilino', 'foto-entrada')))
  return { id: '14000000-0000-4000-8000-000000000002', direccion: 'x', monto: 800, moneda: 'USDC', inicio: '2025-10-01', fin: '2026-10-01', reglas: [], duenoEmail: '', inquilinoEmail: '',
    estado: 'cerrado', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada, diasSimulados: 0,
    regla: { cuenta: 'demo@lockumi.com', alquiler: 'x', version, acepta: true, fecha: '2026-10-01T15:00:00Z' },
    reclamo: { monto: 95, motivo: '', fotos: [], fecha: '2026-10-22T15:00:00Z', rubros: [{ id: 'r1', ref: 0, cantidad: 1, motivo: 'dano', descripcion: 'Mancha', cuarto: 0, fotos: [foto('dueno', 'foto-reclamo')] }],
      respuestas: { r1: { acepta: false, soporte: { tipo: 'cotizacion', monto: 2, comercio: 'Pinturas' } } } },
    resultado: { inquilino: 705, dueno: 95, via: 'simulacion', fecha: '2026-10-24T18:00:00Z' } }
}
const AHORA = Date.parse('2026-10-24T18:00:00Z')
const texto = (a: Alquiler, ac?: Parameters<typeof contenidoExpediente>[2]) => contenidoExpediente(a, AHORA, ac).flatMap(s => [s.titulo, ...s.lineas]).join('\n')
// JPEG mínimo: SOI, APP0 (JFIF), APP1 (Exif con GPS), COM, SOF0 8x6, EOI
const seg = (m: number, cuerpo: number[]) => [0xFF, m, (cuerpo.length + 2) >> 8, (cuerpo.length + 2) & 255, ...cuerpo]
const ascii = (s: string) => [...s].map(c => c.charCodeAt(0))
const JPEG = new Uint8Array([0xFF, 0xD8, ...seg(0xE0, ascii('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')), ...seg(0xE1, ascii('Exif\0\0GPS 9.93N 84.08W')), ...seg(0xFE, ascii('Katherine')),
  ...seg(0xC0, [8, 0, 6, 0, 8, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]), 0xFF, 0xD9])

describe('expediente · Legal 11:29 p. m.', () => {
  it('«Aceptaciones» muestra la versión del registro, no una fija', () => {
    const t = texto(alquiler('9.9-prueba'), { terminos: { version: '8.1-x', fecha: '2026-10-01T15:00:00Z' }, privacidad: { version: '7.2-y', fecha: '2026-10-01T15:00:00Z' } })
    expect(t).toContain('Términos 9.9-prueba'); expect(t).toContain('Términos y condiciones aceptados: versión 8.1-x'); expect(t).toContain('Aviso de privacidad aceptado: versión 7.2-y')
    expect(t).not.toContain('1.6-demo'); expect(t).not.toContain('1.7-demo')
    expect(texto(alquiler())).toContain('Términos y condiciones aceptados: sin registro en este aparato')
  })
  it('«Resultado» dice que el reparto se eligió con el botón de simulación', () => {
    expect(NOTA_SIMULACION).toBe('El reparto se eligió con el botón de simulación: no lo decidió una persona.')
    const r = contenidoExpediente(alquiler(), AHORA).find(s => s.titulo === 'Resultado')!
    expect(r.lineas).toContain(NOTA_SIMULACION)
    const b = alquiler(); b.resultado!.via = 'acuerdo'
    expect(contenidoExpediente(b, AHORA).find(s => s.titulo === 'Resultado')!.lineas).not.toContain(NOTA_SIMULACION)
  })
  it('«cotización» con tilde', () => {
    const a = alquiler(), p = propuesta(a, a.reclamo!.rubros!, a.reclamo!.respuestas!)
    expect(p.filas[0].razones.join(' ')).toContain('una cotización de'); expect(texto(a)).not.toMatch(/cotizacion/)
  })
})
describe('expediente · fotos dentro del PDF', () => {
  it('quita Exif, GPS y comentarios del JPEG y deja la imagen', () => {
    const limpio = sinMetadatosJpeg(JPEG), s = String.fromCharCode(...limpio)
    expect(s).not.toContain('Exif'); expect(s).not.toContain('GPS'); expect(s).not.toContain('Katherine')
    expect(limpio[0]).toBe(0xFF); expect(limpio[1]).toBe(0xD8); expect(s).toContain('JFIF')
  })
  it('inserta cada foto como imagen JPEG (DCTDecode) junto a su línea', () => {
    const imgs = new Map<string, ImagenPdf>([['foto-entrada', { ancho: 8, alto: 6, jpeg: JPEG }], ['foto-reclamo', { ancho: 8, alto: 6, jpeg: JPEG }]])
    const t = textoPdf(pdfExpediente(alquiler(), AHORA, undefined, imgs))
    expect((t.match(/\/Subtype \/Image/g) ?? []).length).toBe(2)   // misma foto en varios cuartos: un solo objeto por foto distinta
    expect(t).toContain('/Filter /DCTDecode'); expect(t).toMatch(/\/Im\d+ Do/)
    expect(t).not.toContain('Exif'); expect(t).not.toContain('GPS'); expect(t).not.toContain('Katherine')
  })
  it('sin la imagen cargada, queda solo la línea (no se rompe)', () => {
    const t = textoPdf(pdfExpediente(alquiler(), AHORA))
    expect(t).not.toContain('/Subtype /Image'); expect(t.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
