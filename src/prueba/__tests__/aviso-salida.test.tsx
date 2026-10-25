// PR 7 (paso 12) · aviso de reparación 5 días antes de la salida (6.1.1, B.3), en la app, con las fotos de entrada para comparar.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import { sincronizar } from '../dueno'
import { AvisoSalida } from '../AvisoSalida'
import { diasHastaAvisoSalida } from '../avisos'

const DIA = 86_400_000
const foto = { src: 'data:,', por: 'dueno' as const, fecha: '2026-11-01T18:00:00.000Z', tomadaEn: +new Date('2026-11-01T18:00:00Z'), origen: 'camara' as const }
const alq = (x: Partial<Alquiler> = {}): Alquiler => ({ id: 'a1', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-11-01', fin: '2026-11-30', reglas: [], duenoEmail: 'd', inquilinoEmail: 'i',
  estado: 'en_curso', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [{ nombre: 'Sala', items: [], fotos: [foto], nota: '' }], firmas: {} }, diasSimulados: 0, ...x })
const cinco = +new Date('2026-11-25T18:00:00Z')   // 25 nov 2026, 12:00 hora de Costa Rica: 5 días antes del fin

describe('aviso de 5 días (B.3)', () => {
  it('se entrega al inquilino 5 días antes del fin, una sola vez', () => {
    const x = alq(); sincronizar(x, cinco - 1); expect(x.avisos ?? []).toHaveLength(0)
    sincronizar(x, cinco); sincronizar(x, cinco + DIA)
    expect(x.avisos!.map(v => [v.id, v.para, v.entregado])).toEqual([['reparacion-5', 'inquilino', new Date(cinco).toISOString()]])
    expect(x.avisos![0].texto).toBe('Tu alquiler termina el 30 nov 2026. Repara lo que haga falta antes de las fotos de salida; después se cobra con factura. Aquí están tus fotos de entrada para comparar. El desgaste normal no se cobra: ver las reglas. Después de entregar las llaves, solo puedes reparar si el dueño lo acepta.')
  })
  it('días que faltan para el aviso (simulador de la demo)', () => {
    expect(diasHastaAvisoSalida(alq(), cinco - 3 * DIA - 3600_000)).toBe(4)
    expect(diasHastaAvisoSalida(alq(), cinco)).toBe(0)
  })
  it('la pantalla muestra el aviso, las fotos de entrada y el enlace a las reglas; nada antes de tiempo', () => {
    const x = alq(); expect(renderToStaticMarkup(<AvisoSalida a={x} rol="inquilino" />)).not.toContain('Tu alquiler termina pronto')
    sincronizar(x, cinco)
    const h = renderToStaticMarkup(<AvisoSalida a={x} rol="inquilino" />)
    expect(h).toContain('5 días antes de la salida'); expect(h).toContain('Tu alquiler termina pronto: repara lo que haga falta')
    expect(h).toContain('Tus fotos de entrada'); expect(h).toContain('El desgaste normal no se cobra: <a href="#/terminos">ver las reglas</a>. Después de entregar las llaves')
    expect(renderToStaticMarkup(<AvisoSalida a={x} rol="dueno" />)).not.toContain('Tu alquiler termina pronto')
  })
})
