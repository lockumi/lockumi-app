// Paso 11 · Cambios de Legal del 24/10 (11:29 p. m.): reclamo en dos variantes, pie de baja, casilla desmarcable y Privacidad 1.7-demo.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { atenderCorreo, validar, armar, PIE_BAJA, RECLAMO_CON_REGLA, RECLAMO_SIN_REGLA, darDeBaja } from '../../../api/_lib/correo'
import { avisosPorEnviar, desactivarCorreo } from '../correoAvisos'
import { privacidadVigente } from '../../legal/documentos'
import type { Alquiler } from '../../types'

const ORIGEN = 'https://app.lockumi.com'
const reclamo = (regla: boolean) => ({ tipo: 'aviso' as const, consentimiento: true, para: 'demo@lockumi.com', alquiler: 'r2329', plantilla: 'reclamo-1' as const,
  datos: { deposito: 800, reclamado: 95, venceMs: +new Date('2026-11-09T16:00:00Z'), regla, rubros: ['otro rubro'] } })
const ok = () => vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 })) as unknown as typeof fetch
afterEach(() => vi.unstubAllEnvs())

describe('correo del reclamo según lo registrado al firmar', () => {
  it('aceptó la regla', () => {
    expect(RECLAMO_CON_REGLA).toBe('Si no respondes a tiempo y abriste al menos un aviso, se aplicará la propuesta automática (máximo el 30 % del depósito de prueba, solo con pruebas completas).')
    const c = armar(validar(reclamo(true)), ORIGEN)
    expect(c.texto).toContain(RECLAMO_CON_REGLA); expect(c.texto).not.toContain(RECLAMO_SIN_REGLA); expect(c.texto).not.toContain('depósito de prueba de prueba')
  })
  it('no aceptó la regla', () => {
    expect(RECLAMO_SIN_REGLA).toBe('Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo).')
    const c = armar(validar(reclamo(false)), ORIGEN)
    expect(c.texto).toContain(RECLAMO_SIN_REGLA); expect(c.texto).not.toContain('propuesta automática'); expect(c.texto).not.toContain('que tiene costo')
  })
})
describe('pie para dejar de recibir avisos', () => {
  it('solo en los avisos, no en la invitación', () => {
    expect(PIE_BAJA).toBe('Para dejar de recibir estos avisos, desmarca la casilla en la app; seguirás viéndolos dentro de la app.')
    const a = armar(validar(reclamo(true)), ORIGEN); expect(a.texto).toContain(PIE_BAJA); expect(a.html).toContain(PIE_BAJA)
    const i = armar(validar({ tipo: 'invitacion', consentimiento: true, para: 'demo@lockumi.com', alquiler: 'r2329', rol: 'inquilino', nombre: 'Ana' }), ORIGEN)
    expect(i.texto).not.toContain(PIE_BAJA); expect(i.html).not.toContain(PIE_BAJA)
  })
})
describe('desmarcar la casilla detiene los envíos', () => {
  it('servidor: después de la baja no envía avisos de ese alquiler a ese correo', async () => {
    const f = ok(); const env = { RESEND_API_KEY: 'x' }
    await expect(atenderCorreo(env, reclamo(true), ORIGEN, 'ip-baja', f)).resolves.toMatchObject({ enviado: true })
    expect(darDeBaja({ tipo: 'baja', para: 'Demo@Lockumi.com', alquiler: 'r2329' })).toEqual({ baja: true })
    await expect(atenderCorreo(env, reclamo(true), ORIGEN, 'ip-baja', f)).rejects.toMatchObject({ estado: 409 })
    expect(f).toHaveBeenCalledTimes(1)
    // otro alquiler sigue igual
    await expect(atenderCorreo(env, { ...reclamo(true), alquiler: 'otro1' }, ORIGEN, 'ip-baja', f)).resolves.toMatchObject({ enviado: true })
  })
  it('servidor: sin la casilla marcada no envía', async () => {
    const f = ok()
    await expect(atenderCorreo({ RESEND_API_KEY: 'x' }, { ...reclamo(true), consentimiento: false }, ORIGEN, 'ip-2', f)).rejects.toMatchObject({ estado: 400 })
    expect(f).not.toHaveBeenCalled()
  })
  it('app: con la casilla marcada se envían los avisos entregados y pendientes; al desmarcarla, ninguno', () => {
    const a = { id: 'r2329', correos: { inquilino: 'demo@lockumi.com' }, correosEnviados: { inquilino: ['reclamo-1'] },
      avisos: [{ id: 'reclamo-1', para: 'inquilino', dia: 1, entregado: 'x' }, { id: 'reclamo-4', para: 'inquilino', dia: 4, entregado: 'x' }, { id: 'reclamo-6', para: 'inquilino', dia: 6 }, { id: 'dueno-1', para: 'dueno', dia: 1, entregado: 'x' }] } as unknown as Alquiler
    expect(avisosPorEnviar(a, 'inquilino').map(v => v.id)).toEqual(['reclamo-4'])
    expect(avisosPorEnviar(a, 'dueno')).toEqual([])
    const b = structuredClone(a); desactivarCorreo(b, 'inquilino')
    expect(b.correos?.inquilino).toBeUndefined(); expect(avisosPorEnviar(b, 'inquilino')).toEqual([])
  })
})
describe('Privacidad 1.7-demo (Legal 11:29 p. m.)', () => {
  it('casilla, :32, :33 y fase 2 en presente', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); const d = privacidadVigente()!, texto = d.html.replace(/<[^>]+>/g, '')
    expect(texto).toContain('Usaremos ese correo solo para la invitación y para los avisos de ese alquiler simulado (plazos, reclamo y respuesta). No lo agregaremos a ninguna lista ni le enviaremos novedades. Los avisos por correo solo se envían si marcas la casilla «Acepto que Lockumi me envíe avisos por correo». Puedes desmarcarla cuando quieras.')
    expect(d.html).toContain('>Invitar a otra persona y avisos por correo<')
    expect(texto).toContain('Esto aplica cuando simulas un alquiler con otra persona y cada una tiene su cuenta. Los avisos por correo son opcionales: sin la casilla, llegan solo dentro de la app.')
    expect(texto).not.toMatch(/cuando se active|todavía no está disponible|Hoy la app no envía invitaciones/)
    expect(texto).toContain('Mostrar a la otra parte lo necesario para la simulación y enviar por correo la invitación y los avisos del alquiler simulado.')
  })
})
