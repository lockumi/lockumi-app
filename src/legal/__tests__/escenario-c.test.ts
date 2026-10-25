// Escenario C (preparación, PR borrador; no se enciende): textos de la mediación con otra persona y una versión por escenario.
// LEGAL: revisar · 2.2 b) y Privacidad (sección C de dos-personas-textos.md): «el reparto que las dos partes acepten en la mediación».
import { describe, it, expect, vi, afterEach } from 'vitest'
import { terminosActual, privacidadActual } from '../documentos'
import { versionVigente, edicionDe, VERSIONES, avisoNuevaVersion, casillaDeFuncion, ordenVersion } from '../versiones'
import { condicional } from '../condicional'
import { aceptarVersion, puedeCambiarA } from '../../prueba/version'
import type { Alquiler } from '../../types'
afterEach(() => vi.unstubAllEnvs())
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
function encender({ dos, correos }: { dos: boolean; correos: boolean }) {
  vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', dos ? 'https://x.supabase.co' : ''); vi.stubEnv('VITE_SUPABASE_ANON_KEY', dos ? 'anon' : '')
  vi.stubEnv('VITE_DOS_PERSONAS', dos ? '1' : '0'); vi.stubEnv('VITE_CORREOS', correos ? '1' : '0')
  return { t: plano(terminosActual().html), p: plano(privacidadActual()!.html), vt: terminosActual().version, vp: privacidadActual()!.version }
}
const COMBOS = [{ dos: false, correos: false }, { dos: false, correos: true }, { dos: true, correos: false }, { dos: true, correos: true }]
const FRASE = 'el reparto que las dos partes acepten en la mediación'

describe('2.2 b) y Privacidad C: nadie decide el reparto en la mediación', () => {
  it('con otra persona (C), 2.2 b) y Privacidad dicen «el reparto que las dos partes acepten en la mediación»', () => {
    const { t, p } = encender({ dos: true, correos: true })
    expect(t).toContain(`En la fase 2, se aplica ${FRASE} (cláusula 6).`)
    expect(p).toContain(`ayudar a las partes a llegar a un acuerdo y registre ${FRASE}.`)
  })
  it.each(COMBOS)('ningún texto dice que la mediación «decide» el reparto (%o)', c => {
    const { t, p } = encender(c)
    for (const x of [t, p]) { expect(x).not.toMatch(/lo decide la Mediación|decida el reparto|el reparto que decida la mediación/) }
  })
})

describe('una versión por escenario, cada una con su fecha', () => {
  it('A → 1.7-demo, B (correos) → 1.8-demo, C (correos + dos personas) → 1.9-demo', () => {
    expect(versionVigente({ 'dos-personas': false, correos: false })).toBe('1.7-demo')
    expect(versionVigente({ 'dos-personas': false, correos: true })).toBe('1.8-demo')
    expect(versionVigente({ 'dos-personas': true, correos: true })).toBe('1.9-demo')
    expect(versionVigente({ 'dos-personas': true, correos: false })).toBe('1.9-demo')
  })
  it('cada versión tiene su propia fecha; la 1.7-demo sigue con la del 25 de octubre', () => {
    expect(edicionDe('1.7-demo')).toBe('1.7-demo · 25 de octubre de 2026')
    const fechas = VERSIONES.map(v => v.fecha); expect(new Set(fechas).size).toBe(fechas.length)
    for (const v of VERSIONES) expect(edicionDe(v.version)).toBe(`${v.version} · ${v.fecha}`)
    expect(ordenVersion('1.6-demo')).toBeLessThan(ordenVersion('1.7-demo')); expect(ordenVersion('1.8-demo')).toBeLessThan(ordenVersion('1.9-demo'))
  })
  it('{{edicion}} usa la versión de lo encendido, y las páginas la muestran', () => {
    expect(condicional('V {{edicion}}', { 'dos-personas': false, correos: true })).toBe(`V ${edicionDe('1.8-demo')}`)
    for (const c of COMBOS) {
      const v = versionVigente({ 'dos-personas': c.dos, correos: c.correos }), r = encender(c)
      expect(r.t).toContain(edicionDe(v)); expect(r.p).toContain(edicionDe(v)); expect(r.vt).toBe(v); expect(r.vp).toBe(v)
    }
  })
  it('con solo A encendido nada cambia: 1.7-demo · 25 de octubre de 2026', () => {
    const r = encender({ dos: false, correos: false })
    expect(r.vt).toBe('1.7-demo'); expect(r.t).toContain('1.7-demo · 25 de octubre de 2026')
  })
})

describe('aviso no bloqueante y casilla dentro de cada función', () => {
  it('quien aceptó una versión 1.7 o posterior más vieja ve un aviso que no bloquea; si no, nada', () => {
    const s = { 'dos-personas': false, correos: true }
    const t = avisoNuevaVersion('1.7-demo', s)!
    expect(t).toContain(edicionDe('1.8-demo')); expect(t).toMatch(/Puedes seguir usando la app/); expect(t).not.toMatch(/\[|LEGAL|PENDIENTE/)
    expect(avisoNuevaVersion('1.8-demo', s)).toBeNull()
    expect(avisoNuevaVersion('1.7-demo', { 'dos-personas': false, correos: false })).toBeNull()
    expect(avisoNuevaVersion(undefined, s)).toBeNull()      // sin aceptación: la pide «Entrar», como siempre
    expect(avisoNuevaVersion('1.6-demo', s)).toBeNull()     // 1.6-demo: casillas de «Entrar» (paso 16), sin cambios
  })
  it('lo nuevo se acepta con una casilla dentro de su función (correos en B, mediación con otra persona en C)', () => {
    expect(casillaDeFuncion('correos')).toMatchObject({ version: '1.8-demo' })
    expect(casillaDeFuncion('dos-personas')).toMatchObject({ version: '1.9-demo' })
  })
})

describe('los alquileres firmados conservan su versión salvo que los dos acepten', () => {
  const alq = (version: string): Alquiler => ({ id: 'x', estado: 'en_curso', historial: [], terminos: { version } } as unknown as Alquiler)
  it('un alquiler de la 1.7-demo sigue en la 1.7-demo con B encendido hasta que aceptan los dos', () => {
    encender({ dos: false, correos: true })
    const a = alq('1.7-demo')
    expect(puedeCambiarA(a, '1.8-demo')).toBe(true)
    aceptarVersion(a, 'dueno', Date.UTC(2026, 10, 1), '1.8-demo'); expect(a.terminos!.version).toBe('1.7-demo')
    aceptarVersion(a, 'inquilino', Date.UTC(2026, 10, 2), '1.8-demo')
    expect(a.terminos).toMatchObject({ version: '1.8-demo', edicion: edicionDe('1.8-demo') })
    expect(a.historial.at(-1)!.texto).toBe('Los dos aceptaron: este alquiler sigue ahora los Términos 1.8-demo')
  })
  it('no se baja de versión ni se cambia a una versión que no está vigente', () => {
    encender({ dos: false, correos: true })
    expect(puedeCambiarA(alq('1.8-demo'), '1.7-demo')).toBe(false)
    expect(puedeCambiarA(alq('1.7-demo'), '1.9-demo')).toBe(false)
  })
})

describe('AvisoVersion en «Tus alquileres»', () => {
  it('con B encendido y la 1.7-demo aceptada se ve el aviso (con enlace); con solo A no se ve nada', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { createElement } = await import('react')
    const { AvisoVersion } = await import('../AvisoVersion')
    const u = { email: 'a@b.cr', nombre: 'A', metodo: 'correo' as const, terminos: { version: '1.7-demo', fecha: '2026-10-25T06:00:00Z' } }
    encender({ dos: false, correos: false }); expect(renderToStaticMarkup(createElement(AvisoVersion, { u }))).toBe('')
    encender({ dos: false, correos: true })
    const h = renderToStaticMarkup(createElement(AvisoVersion, { u }))
    expect(h).toContain('role="status"'); expect(h).toContain('href="/terminos"'); expect(h).toContain(edicionDe('1.8-demo'))
  })
})
