import { describe, it, expect } from 'vitest'
import { leerFechaExif, esPosibleGaleria, huellaSHA256, textoFoto } from '../../fotos'
/** JPEG mínimo con APP1/Exif: IFD0 → puntero ExifIFD → DateTimeOriginal. */
function jpegConFecha(fecha: string): ArrayBuffer {
  const tiff: number[] = []
  const w16 = (n: number) => tiff.push(n >> 8, n & 255), w32 = (n: number) => tiff.push(n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255)
  tiff.push(0x4D, 0x4D); w16(42); w32(8)                 // big endian, IFD0 en 8
  w16(1); w16(0x8769); w16(4); w32(1); w32(26); w32(0)    // IFD0: 1 entrada → ExifIFD en 26
  w16(1); w16(0x9003); w16(2); w32(20); w32(44); w32(0)   // ExifIFD: DateTimeOriginal en 44
  for (const c of fecha + '\0') tiff.push(c.charCodeAt(0))
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const bytes = [0xFF, 0xD8, 0xFF, 0xE1, (app1.length + 2) >> 8, (app1.length + 2) & 255, ...app1, 0xFF, 0xD9]
  return new Uint8Array(bytes).buffer
}
describe('fecha dentro de la foto', () => {
  it('lee DateTimeOriginal', () => {
    expect(leerFechaExif(jpegConFecha('2026:10:16 15:05:00'))).toBe(new Date(2026, 9, 16, 15, 5, 0).getTime())
  })
  it('sin datos o no JPEG → undefined', () => {
    expect(leerFechaExif(new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]).buffer)).toBeUndefined()
    expect(leerFechaExif(new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer)).toBeUndefined()
  })
})
describe('posible foto de galería', () => {
  const t = new Date(2026, 9, 16, 15, 10).getTime()
  it('cámara de la app nunca', () => { expect(esPosibleGaleria('camara', t)).toBe(false) })
  it('archivo sin fecha o con fecha vieja sí; reciente no', () => {
    expect(esPosibleGaleria('archivo', t)).toBe(true)
    expect(esPosibleGaleria('archivo', t, t - 60 * 60_000)).toBe(true)
    expect(esPosibleGaleria('archivo', t, t - 2 * 60_000)).toBe(false)
  })
})
describe('huella y texto', () => {
  it('SHA-256 conocido', async () => {
    expect(await huellaSHA256(new TextEncoder().encode('abc').buffer as ArrayBuffer)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('texto simple', () => {
    const t = new Date(2026, 9, 16, 15, 5).getTime()
    expect(textoFoto({ src: '', por: 'dueno', fecha: '', tomadaEn: t, origen: 'camara' }, t + 1000)).toBe('Foto tomada hoy a las 3:05 p. m.')
  })
})
