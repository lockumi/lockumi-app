// Legal 25/10, 5:01 p. m. (punto 1): en la pantalla de la mediación de C va la línea del plazo de 3 días hábiles, con la MISMA
// fecha que programa el servidor (lk_mediacion_vencimientos: desde = respondido_en o el evento «Pasa a la Mediación…», + 3 hábiles).
import { describe, it, expect } from 'vitest'
import { venceMediacionC, textoPlazoMediacionC } from '../prueba/mediacion'
import { aAlquiler, type Filas } from '../servidor/mapeo'
import type { Alquiler } from '../types'

const base = (reclamo: Partial<NonNullable<Alquiler['reclamo']>>, historial: Alquiler['historial'] = []) =>
  ({ estado: 'mediacion', reclamo: { monto: 1, motivo: 'x', fotos: [], fecha: '2026-10-20T15:00:00Z', ...reclamo }, historial }) as unknown as Alquiler

describe('Plazo de la mediación en C (P-06, texto de Legal)', () => {
  it('texto literal, con la fecha como el resto de la app', () => {
    expect(textoPlazoMediacionC(Date.parse('2026-11-04T21:00:00Z'))).toBe('La mediación tiene un plazo de 3 días hábiles, hasta el 4 nov 2026, 15:00, hora de Costa Rica. Si para entonces no aceptan el mismo reparto, no se paga nada: el monto reclamado sigue retenido y pueden seguir buscando un acuerdo.')
  })
  it('rechazo: cuenta desde la respuesta del inquilino (viernes → miércoles, sin fin de semana)', () => {
    expect(venceMediacionC(base({ respuesta: 'rechazado', respondido: '2026-10-30T21:00:00Z' }))).toBe(Date.parse('2026-11-04T21:00:00Z'))
  })
  it('silencio: cuenta desde el evento «Pasa a la Mediación Lockumi (demo)» y salta el feriado del 25 de diciembre', () => {
    const h = [{ fecha: '2026-12-20T16:00:00Z', texto: 'El dueño reclamó' }, { fecha: '2026-12-23T16:00:00Z', texto: 'El inquilino no respondió a tiempo: regla no disponible en esta versión (6.5.1 d). Pasa a la Mediación Lockumi (demo).' }]
    expect(venceMediacionC(base({}, h))).toBe(Date.parse('2026-12-29T16:00:00Z'))
  })
  it('sin respuesta ni evento: no muestra fecha', () => {
    expect(venceMediacionC(base({}))).toBeNull()
  })
  it('el servidor manda respondido_en y la app lo guarda', () => {
    const f = { contrato: { id: 'c', direccion: 'd', monto: 2, inicio: '', fin: '', reglas: [], email_inquilino: '', estado: 'mediacion', ventana_inicio: null, ventana_segundos: 60, escrow_contract_id: null, resultado: null, liquidacion_tx: null, actualizado_en: '' },
      participantes: [], actas: [], firmas: [], fotos: [], eventos: [], terminos: null,
      reclamo: { monto: 1, motivo: 'm', creado_en: '2026-10-29T15:00:00Z', respuesta: 'rechazado', respondido_en: '2026-10-30T21:00:00Z' } } as unknown as Filas
    expect(aAlquiler(f, 'u', r => r).reclamo?.respondido).toBe('2026-10-30T21:00:00Z')
  })
})
