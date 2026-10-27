// 27/10/2026 · Bug de la matriz en producción: con servidor (dos aparatos), «Nuevo en Lockumi · 0 alquileres cerrados» con 2 cerrados por
// papel en la base. Causa: la app miraba el perfil (REP-01) de la OTRA parte en el localStorage de ESTE navegador, donde nunca está.
// Ahora, con servidor, el servidor dice por alquiler si cuenta y desde cuándo (lk_reputacion_de_mis_alquileres).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import migracion from '../../../supabase/migrations/20261027140000_reputacion_contraparte.sql?raw'
import type { Alquiler } from '../../types'
import { alquileresDeReputacion, alquileresDeReputacionServidor, calcularPuntaje } from '../puntaje'
import { cargarInfoReputacion, infoReputacion, _reiniciarInfoReputacion } from '../perfilesServidor'

const alq = (id: string, x: Partial<Alquiler> = {}): Alquiler => ({ id, direccion: 'Casa', monto: 10, moneda: 'USDC', inicio: '2026-10-27', fin: '2026-10-28', reglas: [],
  duenoEmail: 'd@x.cr', inquilinoEmail: 'i@x.cr', estado: 'cerrado', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: { firmas: {}, cuartos: [] },
  diasSimulados: 0, resultado: { dueno: 2, inquilino: 8, via: 'mediacion', fecha: '2026-10-27T19:22:55Z' }, ...x })
const DOS = [alq('0070af80'), alq('b10557f9', { resultado: { dueno: 4, inquilino: 6, via: 'acuerdo', fecha: '2026-10-27T18:45:25Z' } })]

describe('reputación con servidor: el perfil de la otra parte', () => {
  beforeEach(() => _reiniciarInfoReputacion())
  it('la causa: con el localStorage de este navegador solo está MI perfil, así que nada cuenta (lo que se vio: 0 alquileres cerrados)', () => {
    const soloYo = (e: string) => e === 'd@x.cr'
    expect(alquileresDeReputacion(DOS, 'd@x.cr', 'dueno', soloYo)).toHaveLength(0)
  })
  it('con la información del servidor cuentan los 2 (dueño e inquilino), y el contador dice 2', async () => {
    const pedir = vi.fn(async () => [{ contrato_id: '0070af80', cuenta: true, desde: '2026-10-27T08:00:16Z' }, { contrato_id: 'b10557f9', cuenta: true, desde: '2026-10-27T08:00:16Z' }])
    await cargarInfoReputacion(DOS, pedir)
    for (const [email, rol] of [['d@x.cr', 'dueno'], ['i@x.cr', 'inquilino']] as const) {
      const xs = alquileresDeReputacionServidor(DOS, email, rol, infoReputacion)
      expect(xs.map(a => a.id).sort()).toEqual(['0070af80', 'b10557f9'])
      expect(calcularPuntaje(xs, rol, Date.parse('2026-10-28T00:00:00Z')).cerrados).toBe(2)
    }
    await cargarInfoReputacion(DOS, pedir); expect(pedir).toHaveBeenCalledTimes(1)   // mismo conjunto de cerrados: no vuelve a preguntar
  })
  it('se mantienen las reglas de Legal: no cuenta si la otra parte no tiene perfil, ni lo cerrado antes de la aceptación más tardía', async () => {
    await cargarInfoReputacion(DOS, async () => [{ contrato_id: '0070af80', cuenta: false, desde: null }, { contrato_id: 'b10557f9', cuenta: true, desde: '2026-10-27T19:00:00Z' }])
    expect(alquileresDeReputacionServidor(DOS, 'd@x.cr', 'dueno', infoReputacion)).toHaveLength(0)
  })
  it('sin respuesta del servidor no cuenta nada (y se vuelve a preguntar en la próxima carga)', async () => {
    await cargarInfoReputacion(DOS, async () => { throw new Error('red') })
    expect(alquileresDeReputacionServidor(DOS, 'd@x.cr', 'dueno', infoReputacion)).toHaveLength(0)
    const pedir = vi.fn(async () => [])
    await cargarInfoReputacion(DOS, pedir); expect(pedir).toHaveBeenCalledTimes(1)
  })
  it('la función SQL solo responde por los alquileres de quien llama y no devuelve correos', () => {
    const sql = migracion
    expect(sql).toMatch(/m\.usuario = auth\.uid\(\)/)
    expect(sql).toMatch(/returns table \(contrato_id uuid, cuenta boolean, desde timestamptz\)/)
    expect(sql).toMatch(/revoke all on function public\.lk_reputacion_de_mis_alquileres\(\) from public, anon;/)
    expect(sql).toMatch(/lk_cuenta_para_reputacion\(c\.id\)/)
  })
})
