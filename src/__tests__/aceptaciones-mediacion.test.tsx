// PR #22 · solo con VITE_DOS_PERSONAS: en «Con una persona mediadora» cada parte ve si la otra ya aceptó un reparto y cuál.
import { describe, it, expect, vi, beforeEach } from 'vitest'
const selects: { tabla: string; filtro: [string, string] }[] = []
let filas: { rol: string; monto_dueno: string; aceptado_en: string }[] = []
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' }, access_token: 't' } } }) },
  from: (tabla: string) => ({ select: () => ({ eq: async (c: string, v: string) => { selects.push({ tabla, filtro: [c, v] }); return { data: filas, error: null } } }) }),
}) }))
vi.mock('../servidor/config', async orig => ({ ...(await orig<typeof import('../servidor/config')>()), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }))
const { servidor } = await import('../servidor/repositorio')
const { estadoAceptaciones } = await import('../servidor/aceptaciones')
const ID = '11111111-2222-3333-4444-555555555555'

describe('PR #22 · aceptaciones de la mediación (dos personas)', () => {
  beforeEach(() => { selects.length = 0; filas = [] })
  it('repositorio: lee lk_aceptaciones_mediacion del alquiler (RLS: solo participantes) y convierte los montos', async () => {
    filas = [{ rol: 'dueno', monto_dueno: '30.00', aceptado_en: '2026-10-25T07:00:00Z' }]
    expect(await servidor.aceptaciones(ID)).toEqual([{ rol: 'dueno', montoDueno: 30, fecha: '2026-10-25T07:00:00Z' }])
    expect(selects).toEqual([{ tabla: 'lk_aceptaciones_mediacion', filtro: ['contrato_id', ID] }])
  })
  it('nadie aceptó', () => {
    expect(estadoAceptaciones('inquilino', [], 100)).toEqual({ mia: null, otra: null, texto: 'El dueño todavía no aceptó ningún reparto.' })
  })
  it('la otra parte aceptó: muestra su reparto', () => {
    const e = estadoAceptaciones('inquilino', [{ rol: 'dueno', montoDueno: 30, fecha: 'x' }], 100)
    expect(e.otra).toBe(30); expect(e.texto).toBe('El dueño aceptó: 30,00 USDC de prueba para el dueño y 70,00 USDC de prueba para el inquilino.')
  })
  it('las dos con el mismo reparto: espera que la persona mediadora lo registre', () => {
    const e = estadoAceptaciones('dueno', [{ rol: 'dueno', montoDueno: 30, fecha: 'x' }, { rol: 'inquilino', montoDueno: 30, fecha: 'y' }], 100)
    expect(e).toMatchObject({ mia: 30, otra: 30 }); expect(e.texto).toBe('Las dos partes aceptaron el mismo reparto. Falta que la persona mediadora lo registre.')
  })
  it('repartos distintos: lo dice', () => {
    const e = estadoAceptaciones('dueno', [{ rol: 'dueno', montoDueno: 50, fecha: 'x' }, { rol: 'inquilino', montoDueno: 20, fecha: 'y' }], 100)
    expect(e.texto).toBe('El inquilino aceptó otro reparto: 20,00 USDC de prueba para el dueño y 80,00 USDC de prueba para el inquilino.')
  })
})
