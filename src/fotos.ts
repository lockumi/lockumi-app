// Fotos con prueba de cuándo se tomaron. Fuentes y límites en docs/fotos-captura.md.
import type { Foto, Rol } from './types'

/** Diferencia máxima entre la fecha que trae el archivo y el momento en que se eligió, para considerarla "recién tomada". */
export const MARGEN_RECIENTE_MS = 10 * 60_000

/** Lee DateTimeOriginal (0x9003) o DateTime (0x0132) de un JPEG. Devuelve ms (hora local del aparato) o undefined. */
export function leerFechaExif(buf: ArrayBuffer): number | undefined {
  const v = new DataView(buf)
  if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return
  let o = 2
  while (o + 4 <= v.byteLength) {
    const marca = v.getUint16(o); const largo = v.getUint16(o + 2)
    if (marca === 0xFFE1 && o + 10 <= v.byteLength && v.getUint32(o + 4) === 0x45786966) return leerTiff(v, o + 10)
    if ((marca & 0xFF00) !== 0xFF00 || marca === 0xFFDA) return
    o += 2 + largo
  }
}
function leerTiff(v: DataView, t: number): number | undefined {
  const le = v.getUint16(t) === 0x4949
  const u16 = (p: number) => v.getUint16(p, le), u32 = (p: number) => v.getUint32(p, le)
  const texto = (p: number, n: number) => { let s = ''; for (let i = 0; i < n && p + i < v.byteLength; i++) { const c = v.getUint8(p + i); if (!c) break; s += String.fromCharCode(c) } return s }
  const buscar = (ifd: number, tag: number): number | undefined => {
    if (ifd + 2 > v.byteLength) return
    const n = u16(ifd)
    for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (e + 12 > v.byteLength) return; if (u16(e) === tag) return e }
  }
  const ifd0 = t + u32(t + 4)
  const fecha = (e?: number) => { if (e === undefined) return; const s = texto(t + u32(e + 8), 19); const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s)
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : undefined }
  const pExif = buscar(ifd0, 0x8769)
  const original = pExif !== undefined ? fecha(buscar(t + u32(pExif + 8), 0x9003)) : undefined
  return original ?? fecha(buscar(ifd0, 0x0132))
}

export async function huellaSHA256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('')
}

/** Una foto elegida como archivo es "posible foto de galería" si no trae fecha o la fecha es bastante anterior. */
export function esPosibleGaleria(origen: Foto['origen'], tomadaEn: number, fechaArchivo?: number): boolean {
  if (origen !== 'archivo') return false
  if (fechaArchivo === undefined) return true
  return tomadaEn - fechaArchivo > MARGEN_RECIENTE_MS
}

/** "Foto tomada hoy a las 3:05 PM" / "ayer" / "el 12 oct". Sin palabras técnicas. */
export function textoFoto(f: Foto, ahora = Date.now()): string {
  if (f.origen === 'ejemplo') return 'Foto de ejemplo'
  const t = f.tomadaEn ?? Date.parse(f.fecha)
  const d = new Date(t), h = new Date(ahora)
  const hora = d.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s*([ap])\.\s*m\./g, '\u00a0$1.\u00a0m.')   // 12 h (Legal 25/10, punto 8)
  const mismoDia = (x: Date, y: Date) => x.toDateString() === y.toDateString()
  const ayer = new Date(h); ayer.setDate(h.getDate() - 1)
  const dia = mismoDia(d, h) ? 'hoy' : mismoDia(d, ayer) ? 'ayer' : 'el ' + d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
  return `Foto ${f.origen === 'archivo' ? 'agregada' : 'tomada'} ${dia} a las ${hora}`
}

/** Reduce la imagen para guardarla en el navegador (la huella se calcula sobre el archivo original). */
export async function reducir(blob: Blob, max = 720): Promise<string> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url })
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.75)
  } finally { URL.revokeObjectURL(url) }
}

/** Crea la Foto a partir de un archivo o de una captura de la cámara de la app. */
export async function crearFoto(blob: Blob, origen: 'camara' | 'archivo', por: Rol, ahora = Date.now()): Promise<Foto> {
  const buf = await blob.arrayBuffer()
  const fechaArchivo = origen === 'archivo' ? leerFechaExif(buf) : undefined
  const [huella, src] = await Promise.all([huellaSHA256(buf), reducir(blob)])
  return { src, por, fecha: new Date(ahora).toISOString(), tomadaEn: ahora, fechaArchivo, huella, origen, posibleGaleria: esPosibleGaleria(origen, ahora, fechaArchivo) }
}
