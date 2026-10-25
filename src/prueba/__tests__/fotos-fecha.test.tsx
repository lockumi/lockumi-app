// PR 7 (paso 13) · fecha y hora en cada foto (6.4.2): pie con la fecha y la hora de Costa Rica y sello sobre la foto, solo con el interruptor.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Foto } from '../../types'
import { textoFotoPC, selloFoto } from '../fotosFecha'
import { FotoLista } from '../../screens/Acta'

const t = +new Date('2026-10-24T18:05:00Z')   // 24 oct 2026, 12:05 hora de Costa Rica
const f = (x: Partial<Foto> = {}): Foto => ({ src: 'data:,', por: 'inquilino', fecha: new Date(t).toISOString(), tomadaEn: t, origen: 'camara', ...x })
afterEach(() => vi.unstubAllEnvs())

describe('fecha y hora de las fotos', () => {
  it('pie con fecha y hora de Costa Rica según el origen', () => {
    expect(textoFotoPC(f())).toBe('Tomada en la app el 24 oct 2026, 12:05, hora de Costa Rica')
    expect(textoFotoPC(f({ origen: 'archivo' }))).toBe('Agregada en la app el 24 oct 2026, 12:05, hora de Costa Rica')
    expect(textoFotoPC(f({ origen: 'ejemplo' }))).toBe('Foto de ejemplo · registrada el 24 oct 2026, 12:05, hora de Costa Rica')
    expect(textoFotoPC(f({ tomadaEn: undefined }))).toBe('Tomada en la app el 24 oct 2026, 12:05, hora de Costa Rica')
  })
  it('sello corto dd/mm/aa hh:mm (hora de Costa Rica), sin ubicación', () => {
    expect(selloFoto(f())).toBe('24/10/26 12:05')
  })
  it('con el interruptor encendido, la lista muestra el sello y el pie nuevos', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
    const h = renderToStaticMarkup(<FotoLista fotos={[f()]} />)
    expect(h).toContain('<span class="foto__sello" aria-hidden="true">24/10/26 12:05</span>')
    expect(h).toContain('Tomada en la app el 24 oct 2026, 12:05, hora de Costa Rica · Inquilino')
  })
  it('con el interruptor apagado, la lista queda como siempre', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0')
    const h = renderToStaticMarkup(<FotoLista fotos={[f()]} />)
    expect(h).not.toContain('foto__sello'); expect(h).not.toContain('hora de Costa Rica')
  })
})
