// Paso 14 · Expediente en PDF (B.11): solo los datos listados, sin datos personales y con «DEMO · Sin efecto legal» en cada página.
import { describe, it, expect } from 'vitest'
import { contenidoExpediente, pdfExpediente, textoPdf, AVISO_EXPEDIENTE, BOTON_EXPEDIENTE, MARCA_EXPEDIENTE } from '../expediente'
import { actaVacia } from '../../store'
import type { Alquiler, Rubro } from '../../types'

const foto = (por: 'dueno' | 'inquilino') => ({ src: 'data:image/png;base64,AA', por, fecha: '2026-10-20T16:30:00Z', origen: 'camara' as const })
const rubro = (i: number): Rubro => ({ id: 'r' + i, ref: 0, cantidad: 1, motivo: 'dano', descripcion: `Pomo del dormitorio quebrado ${i}`, cuarto: 1, fotos: [foto('dueno')] })
function alquiler(rubros = 1): Alquiler {
  const entrada = actaVacia(); entrada.cuartos.forEach(c => c.fotos.push(foto('inquilino'))); entrada.firmas = { dueno: 'x', inquilino: 'y' }
  return { id: '14000000-0000-4000-8000-000000000001', direccion: 'Calle 5, casa 22, San Pedro', monto: 800, moneda: 'USDC', inicio: '2025-10-01', fin: '2026-10-01', reglas: [],
    duenoEmail: 'dueno.real@ejemplo.com', inquilinoEmail: 'inquilino.real@ejemplo.com', correos: { inquilino: 'otro@ejemplo.com' },
    estado: 'cerrado', rendimiento: false, historial: [{ fecha: '2026-10-24T18:00:00Z', texto: 'Reparto en la red de prueba', tx: 'a'.repeat(64) }],
    contrato: { firmas: {} }, entrada, diasSimulados: 0, liquidacionTx: 'b'.repeat(64),
    regla: { cuenta: 'demo@lockumi.com', alquiler: 'x', version: '1.6-demo', acepta: true, fecha: '2026-10-01T15:00:00Z' },
    reclamo: { monto: 95, motivo: '', fotos: [], fecha: '2026-10-22T15:00:00Z', rubros: Array.from({ length: rubros }, (_, i) => rubro(i)) },
    avisos: [{ id: 'reclamo-1', para: 'inquilino', dia: 1, asunto: 'Reclamo', texto: '', entregado: '2026-10-22T15:00:00Z', entregadoReal: 'x', abierto: '2026-10-22T16:00:00Z' }],
    resultado: { inquilino: 705, dueno: 95, via: 'simulacion', fecha: '2026-10-24T18:00:00Z' } }
}
const AHORA = Date.parse('2026-10-24T18:00:00Z')

describe('expediente (B.11)', () => {
  it('textos exactos de la B.11', () => {
    expect(BOTON_EXPEDIENTE).toBe('Descargar el expediente (demo)')
    expect(MARCA_EXPEDIENTE).toBe('DEMO · Sin efecto legal')
    expect(AVISO_EXPEDIENTE).toBe('Este expediente tiene datos personales de la otra parte. Úsalo solo para este reclamo: para conversar con la otra parte, en una mediación o conciliación, o ante un tribunal. No lo publiques ni lo compartas con otras personas.')
  })
  it('incluye roles, rubros, propuesta, aceptaciones, avisos y la transacción', () => {
    const t = contenidoExpediente(alquiler(), AHORA).flatMap(s => [s.titulo, ...s.lineas]).join('\n')
    for (const x of ['Dueño', 'Inquilino', 'Pomo del dormitorio quebrado 0', '95', '705', '1.6-demo', 'reclamo-1', 'b'.repeat(64), '14000000']) expect(t).toContain(x)
  })
  it('no incluye correos, teléfonos, identificaciones ni la dirección', () => {
    const t = textoPdf(pdfExpediente(alquiler(), AHORA))
    expect(t).not.toMatch(/@/)
    expect(t).not.toContain('San Pedro'); expect(t).not.toContain('Calle 5')
  })
  it('cada página lleva la marca, también con muchas páginas', () => {
    const pdf = pdfExpediente(alquiler(60), AHORA), t = textoPdf(pdf)
    const paginas = (t.match(/\/Type \/Page\b/g) ?? []).length
    expect(paginas).toBeGreaterThan(1)
    expect((t.match(/\(DEMO \\267 Sin efecto legal\) Tj/g) ?? []).length).toBe(paginas)   // encabezado de cada página
    expect(t.startsWith('%PDF-1.4')).toBe(true); expect(t.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
