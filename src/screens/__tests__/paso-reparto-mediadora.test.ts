import { describe, expect, it } from 'vitest'
import { calcularModos, modoDeCon } from '../../servidor/config'
import { pasoRepartoMediadora } from '../pasoReparto'

// Matriz fase B (27/10/2026, alquiler 5413ba1a): las dos partes aceptaron 3 de un reclamo de 4 y la mediadora solo podía registrar 2.
describe('control del reparto de la persona mediadora', () => {
  const prod = calcularModos({ VITE_SUPABASE_URL: 'x', VITE_SUPABASE_ANON_KEY: 'y', VITE_DOS_PERSONAS: '1', VITE_TRUSTLESS: '1', VITE_PRUEBA_COMPLETA: '1' })
  it('en un alquiler de dos personas (producción) el paso es de 0,01: se puede elegir 3 de 4', () => {
    const m = modoDeCon(prod, { dosPersonas: true })
    expect(m.escrowReal).toBe(false)   // la causa: este modo no marca escrowReal
    const paso = pasoRepartoMediadora(m)
    expect(paso).toBe(0.01)
    expect(Number.isInteger(Math.round(3 / paso)) && Math.abs(3 / paso - Math.round(3 / paso)) < 1e-9).toBe(true)
  })
  it('con la red de prueba de una persona sigue en 0,01 y la demo sin dinero sigue en 10', () => {
    expect(pasoRepartoMediadora(modoDeCon(prod, { dosPersonas: false }))).toBe(0.01)
    expect(pasoRepartoMediadora(calcularModos({}))).toBe(10)
  })
  it('Detalle usa el mismo paso en el control de la mediadora', async () => {
    const src = (await import('../Detalle.tsx?raw')).default as string
    expect(src).toContain('step={pasoRepartoMediadora({ escrowReal, servidor: modoServidor })}')
    expect(src).not.toContain('step={escrowReal ? 0.01 : 10}')
  })
})
