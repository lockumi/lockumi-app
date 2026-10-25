// Paso 19 · Legal, 25/10/2026, 4:01 p. m. (condición 3): «Descargar mis datos» viene del SERVIDOR y cubre todas las sesiones con el correo
// de la persona. La app lo pide en modo servidor; la demo local sin servidor sigue igual.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Usuario } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }
const DEL_SERVIDOR = { correo: 'demo@lockumi.com', cuentas: 2, perfiles: [], aceptaciones: [], vitrinas: [], eventos: [], revisiones: [], solicitudes_borrado: [] }
const pedir = vi.fn(async (..._: unknown[]) => DEL_SERVIDOR), aceptarEnServidor = vi.fn(async (..._: unknown[]) => true)
const cargar = async (conServidor: boolean) => {
  vi.resetModules(); pedir.mockClear(); aceptarEnServidor.mockClear()
  vi.doMock('../../servidor/config', async (o) => ({ ...await o<typeof import('../../servidor/config')>(), conServidor }))
  vi.doMock('../../servidor/repositorio', async (o) => { const m = await o<typeof import('../../servidor/repositorio')>(); return { ...m, servidor: { ...m.servidor, datosReputacion: pedir, aceptarReputacion: aceptarEnServidor } } })
  return await import('../Pantallas')
}
beforeEach(() => { mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })

describe('descargar mis datos', () => {
  it('modo servidor: pide lk_mis_datos_reputacion con el correo de la cuenta (y el papel), y junta lo de este aparato', async () => {
    const { datosDeDescarga } = await cargar(true)
    const d = await datosDeDescarga(U, [], 'dueno') as unknown as typeof DEL_SERVIDOR & { enEsteAparato: { cuenta: string } }
    expect(pedir).toHaveBeenCalledWith('demo@lockumi.com', 'dueno')
    expect(d.cuentas).toBe(2); expect(d.enEsteAparato.cuenta).toBe('demo@lockumi.com')
    await datosDeDescarga(U, []); expect(pedir).toHaveBeenLastCalledWith('demo@lockumi.com', undefined)
  })
  it('si el servidor falla, la descarga falla (no se baja un archivo incompleto como si fuera todo)', async () => {
    const { datosDeDescarga } = await cargar(true); pedir.mockRejectedValueOnce(new Error('sin red'))
    await expect(datosDeDescarga(U, [])).rejects.toThrow()
  })
  it('demo local sin servidor: igual que antes (datos de este aparato) y no llama al servidor', async () => {
    const { datosDeDescarga, datosParaDescargar } = await cargar(false)
    expect(await datosDeDescarga(U, [], 'inquilino')).toEqual(datosParaDescargar(U, [], ['inquilino']))
    expect(pedir).not.toHaveBeenCalled()
  })
  it('el mensaje si falla explica cómo arreglarlo y espera a Legal', async () => {
    const { UI } = await import('../textos')
    expect(UI.errDescarga).toMatch(/Revisa tu conexión.*vuelve a tocar «Descargar mis datos»/)
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/reputacion/textos.ts', 'utf8')).toMatch(/LEGAL: revisado \(25\/10\)[^\n]*\n[^\n]*errDescarga/)   // Legal, 25/10 4:23 p. m.
  })
  it('RIESGO (Legal, revisión de c887895): en modo servidor, la aceptación de REP-01 se escribe en el servidor por el correo de la cuenta', async () => {
    const R = { version: '1.10-demo', fecha: '2026-10-25T22:00:00Z', texto: ['a', 'b'] }
    const { subirAceptacion } = await cargar(true)
    expect(await subirAceptacion('demo@lockumi.com', R)).toBe(true)
    expect(aceptarEnServidor).toHaveBeenCalledWith('demo@lockumi.com', '1.10-demo', ['a', 'b'])
    expect(await subirAceptacion('demo@lockumi.com', undefined)).toBe(false); expect(aceptarEnServidor).toHaveBeenCalledTimes(1)
    const local = await cargar(false); expect(await local.subirAceptacion('demo@lockumi.com', R)).toBe(false); expect(aceptarEnServidor).not.toHaveBeenCalled()
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')).toMatch(/useEffect\(\(\) => \{ subirAceptacion\(u\.email, e\.rep01\)/)
  })
})
