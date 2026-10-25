// Modo de dos personas detrás de su propio interruptor (VITE_DOS_PERSONAS=1). Tener las variables de Supabase ya no cambia
// toda la app: el modo de una persona sigue igual que hoy y solo los alquileres creados «Invitando a la otra persona» van al servidor.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'
import detalleFuente from '../../screens/Detalle.tsx?raw'
import migracion7 from '../../../supabase/migrations/20261025000000_invitacion_7_dias.sql?raw'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { calcularModos, modoDeCon } = await import('../../servidor/config')
const { TEXTO_INVITACION_VENCE, TEXTO_GUARDA_DOS } = await import('../dosPersonas')

const SUPA = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'publica' }
const PROD = { VITE_TRUSTLESS: '1', VITE_PRUEBA_COMPLETA: '1' }

describe('interruptor VITE_DOS_PERSONAS', () => {
  it('producción de hoy (sin Supabase): una persona, red de prueba', () => {
    expect(calcularModos(PROD)).toMatchObject({ servidor: false, prueba: true, video: true, escrowReal: true, dosPersonas: false })
  })
  it('con las variables de Supabase pero sin el interruptor, la app NO cambia', () => {
    expect(calcularModos({ ...PROD, ...SUPA })).toEqual(calcularModos(PROD))
  })
  it('con el interruptor, el modo de una persona sigue igual y además se puede invitar', () => {
    const m = calcularModos({ ...PROD, ...SUPA, VITE_DOS_PERSONAS: '1' })
    expect(m).toMatchObject({ servidor: false, prueba: true, video: true, escrowReal: true, dosPersonas: true })
  })
  it('el interruptor solo vale con Supabase y con la prueba completa', () => {
    expect(calcularModos({ ...PROD, VITE_DOS_PERSONAS: '1' }).dosPersonas).toBe(false)
    expect(calcularModos({ ...SUPA, VITE_TRUSTLESS: '1', VITE_DOS_PERSONAS: '1' }).dosPersonas).toBe(false)
  })
  it('cada alquiler elige su modo: el de dos personas va al servidor (con Trustless Work); el de una persona, como hoy', () => {
    const m = calcularModos({ ...PROD, ...SUPA, VITE_DOS_PERSONAS: '1' })
    expect(modoDeCon(m, { dosPersonas: true })).toMatchObject({ servidor: true, trustless: true, prueba: false, video: false, solo: false, escrowReal: false })
    expect(modoDeCon(m, {})).toBe(m); expect(modoDeCon(m, undefined)).toBe(m)
    // Sin el interruptor, aunque un alquiler diga dosPersonas, no se va al servidor.
    const sin = calcularModos({ ...PROD, ...SUPA }); expect(modoDeCon(sin, { dosPersonas: true })).toBe(sin)
  })
})

describe('textos del modo de dos personas (Legal)', () => {
  it('la invitación vence en 7 días, igual que el texto aprobado y que el servidor', () => {
    expect(TEXTO_INVITACION_VENCE).toBe('El link sirve una sola vez y vence en 7 días.')
    expect(detalleFuente).toContain('TEXTO_INVITACION_VENCE'); expect(detalleFuente).not.toMatch(/vence en 14 días/)
    expect(migracion7).toMatch(/interval '7 days'/); expect(migracion7).not.toMatch(/14 days/)
  })
  it('el contrato de un alquiler con otra persona no dice que se guarda solo en tu navegador', async () => {
    const { Documento } = await import('../../screens/ContratoDoc')
    const A: Alquiler = { id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Casa', monto: 800, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-11-01', reglas: [],
      duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'inquilino.prueba@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0 }
    const dos = renderToStaticMarkup(<Documento a={{ ...A, dosPersonas: true }} impresion />)
    expect(dos).not.toContain('se guarda solo en tu navegador'); expect(dos).toContain(TEXTO_GUARDA_DOS)
    expect(dos).toContain('800 USDC de prueba'); expect(dos).not.toContain('USD 800')
    expect(renderToStaticMarkup(<Documento a={A} impresion />)).toContain('Este contrato se guarda solo en tu navegador')
  })
})
