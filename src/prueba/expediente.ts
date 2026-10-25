// Paso 14 · Expediente del reclamo en PDF (legal/prueba-completa-textos.md, B.11, revisado 24/10 v3). Solo con la prueba completa.
// Contenido: número y fechas del alquiler; partes por su rol; rubros con su motivo; fotos con fecha y hora; facturas o precios de
// referencia; propuesta y cálculo; aceptaciones; registro de avisos; transacción en la red de prueba.
// No incluye correos, teléfonos, números de identificación ni la dirección del inmueble (Ley 8968, art. 6).
// PDF 1.4 escrito a mano (Helvetica, WinAnsi): sin dependencias nuevas ni envío de datos; se arma en el navegador.
import type { Alquiler, Foto, Rol } from '../types'
import { MOTIVOS, propuesta, referencia } from './propuesta'
import { nombreRubro } from './reclamos'
import { leerAceptacion } from '../legal/aceptacion'

// LEGAL: revisar · B.11
export const BOTON_EXPEDIENTE = 'Descargar el expediente (demo)'
// LEGAL: revisar · B.11 (aviso antes de descargar)
export const AVISO_EXPEDIENTE = 'Este expediente tiene datos personales de la otra parte. Úsalo solo para este reclamo: para conversar con la otra parte, en una mediación o conciliación, o ante un tribunal. No lo publiques ni lo compartas con otras personas.'
// LEGAL: revisar · B.11 (marca de cada página)
export const MARCA_EXPEDIENTE = 'DEMO · Sin efecto legal'

// LEGAL: revisar · Legal 24/10 (11:29 p. m.), en «Resultado» cuando el reparto salió del botón de simulación
export const NOTA_SIMULACION = 'El reparto se eligió con el botón de simulación: no lo decidió una persona.'
/** `fotos`: índice de línea → src de la foto que va debajo de esa línea. */
export interface Seccion { titulo: string; lineas: string[]; fotos?: Record<number, string> }
/** Aceptaciones legales de quien descarga, leídas del registro (no fijas en el código). */
export interface Aceptaciones { terminos?: { version: string; fecha: string } | null; privacidad?: { version: string; fecha: string } | null }
/** Foto lista para el PDF: JPEG sin metadatos y su tamaño en píxeles. */
export interface ImagenPdf { ancho: number; alto: number; jpeg: Uint8Array }
const ROL: Record<Rol, string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
const VIA: Record<string, string> = { automatico: 'Sin reclamo en el plazo', acuerdo: 'Acuerdo en la app', mediacion: 'Mediación Lockumi (demo)', propuesta: 'Propuesta automática', devuelto: 'El dueño devolvió todo', simulacion: 'Resolver el reclamo (simulación)' }
const usdc = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
const cr = (s?: string | number) => s === undefined || s === '' ? '—' : new Date(s).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (hora de Costa Rica)'
const dia = (s: string) => new Date(s).toLocaleDateString('es-CR', { timeZone: /^\d{4}-\d\d-\d\d$/.test(s) ? 'UTC' : 'America/Costa_Rica', day: 'numeric', month: 'long', year: 'numeric' })
/** Quita del texto libre correos, teléfonos y números de identificación que alguien haya escrito. */
export const sinDatos = (s: string) => s.replace(/[^\s@]+@[^\s@]+/g, '(dato quitado)').replace(/\+?\d[\d\s-]{6,}\d/g, '(dato quitado)')
const fotos = (fs: Foto[]) => fs.map(f => `Foto de ${ROL[f.por].toLowerCase()} · ${cr(f.fecha)}`)
/** Arma líneas con fotos: cada foto tiene su línea (rol y fecha) y, debajo, la imagen. */
class Lineas { lineas: string[] = []; fotos: Record<number, string> = {}
  add(...l: string[]) { this.lineas.push(...l); return this }
  foto(f: Foto, prefijo: string) { this.fotos[this.lineas.length] = f.src; this.lineas.push(prefijo + fotos([f])[0]); return this } }

export function contenidoExpediente(a: Alquiler, ahora: number, ac: Aceptaciones = {}): Seccion[] {
  const rubros = a.reclamo?.rubros ?? [], p = propuesta(a, rubros, a.reclamo?.respuestas ?? {})
  const tx = [a.liquidacionTx, a.red?.txs.resolucion, a.red?.txs.liberacion, ...a.historial.map(e => e.tx)].filter((x): x is string => !!x)
  const ent = new Lineas(); for (const c of a.entrada.cuartos) for (const f of c.fotos) ent.foto(f, `${c.nombre}: `)
  const sal = new Lineas(); for (const c of a.salida?.cuartos ?? []) for (const f of c.fotos) sal.foto(f, `${c.nombre}: `)
  const rec = new Lineas().add(`Abierto: ${cr(a.reclamo?.fecha)}`)
  rubros.forEach((r, i) => {
    rec.add(`${i + 1}. ${nombreRubro(r)} × ${r.cantidad}: ${sinDatos(r.descripcion)}`, `   Motivo: ${MOTIVOS[r.motivo]}`,
      `   ${r.factura ? `Factura: ${usdc(r.factura.monto)}` : 'Sin factura'} · Precio de referencia: ${referencia(r) === null ? '—' : usdc(referencia(r)!)}`)
    for (const f of r.fotos) rec.foto(f, '   ')
    if (a.reclamo?.respuestas?.[r.id]) rec.add(`   Inquilino: ${a.reclamo.respuestas[r.id].acepta ? 'acepta' : 'no acepta'}`)
  })
  const acepto = (n: string, x?: { version: string; fecha: string } | null, gen = 'aceptados') => x ? `${n} ${gen}: versión ${x.version} · ${cr(x.fecha)}` : `${n} ${gen}: sin registro en este aparato`
  return [
    { titulo: 'Alquiler', lineas: [`Número: ${a.id}`, `Desde el ${dia(a.inicio)} hasta el ${dia(a.fin)}`, `Depósito: ${usdc(a.monto)}`, `Expediente generado: ${cr(ahora)}`] },
    { titulo: 'Partes', lineas: ['Dueño: se identifica por su rol en la app', 'Inquilino: se identifica por su rol en la app', 'Sin correos, teléfonos, identificaciones ni la dirección del inmueble.'] },
    { titulo: 'Fotos de entrada', lineas: ent.lineas, fotos: ent.fotos },
    { titulo: 'Fotos de salida', lineas: sal.lineas, fotos: sal.fotos },
    { titulo: 'Reclamo del dueño', lineas: rec.lineas, fotos: rec.fotos },
    { titulo: 'Propuesta y cálculo', lineas: [...p.filas.map((f, i) => `${i + 1}. Reclamado ${usdc(f.reclamado)} · propuesto ${usdc(f.propuesto)}${f.razones.length ? ' · ' + f.razones.map(z => z.replace(/\.$/, '')).join('; ') : ''}`), `Total propuesto al dueño: ${usdc(p.total)}`] },
    { titulo: 'Resultado', lineas: a.resultado ? [`${VIA[a.resultado.via] ?? a.resultado.via} · ${cr(a.resultado.fecha)}`, `Dueño: ${usdc(a.resultado.dueno)}`, `Inquilino: ${usdc(a.resultado.inquilino)}`,
      ...(a.resultado.via === 'simulacion' ? [NOTA_SIMULACION] : [])] : ['Sin resultado todavía'] },
    { titulo: 'Aceptaciones', lineas: [
      a.regla ? `Regla de propuesta automática: ${a.regla.acepta ? 'sí' : 'no'} · Términos ${a.regla.version} · ${cr(a.regla.fecha)}` : 'Regla de propuesta automática: sin registro',
      acepto('Términos y condiciones', ac.terminos), acepto('Aviso de privacidad', ac.privacidad, 'aceptado')] },
    { titulo: 'Registro de avisos', lineas: (a.avisos ?? []).map(v => `${v.id} para ${ROL[v.para].toLowerCase()} · entregado en la app ${cr(v.entregado)} · ${v.abierto ? 'abierto ' + cr(v.abierto) : 'sin abrir'}`) },
    { titulo: 'Red de prueba de Stellar', lineas: tx.length ? [...new Set(tx)].map(h => `Transacción: ${h}`) : ['Sin transacciones'] },
  ].map(s => ({ ...s, lineas: s.lineas.length ? s.lineas : ['—'] }))
}

/** Quita de un JPEG los segmentos con metadatos (Exif/GPS en APP1–APP15 y comentarios COM); deja APP0 (JFIF) y la imagen. */
export function sinMetadatosJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xFF || b[1] !== 0xD8) return b
  const out: number[] = [0xFF, 0xD8]; let i = 2
  while (i + 4 <= b.length && b[i] === 0xFF) {
    const m = b[i + 1]
    if (m === 0xDA || m === 0xD9) { out.push(...b.subarray(i)); return Uint8Array.from(out) }   // inicio de la imagen: el resto se copia
    const largo = (b[i + 2] << 8) | b[i + 3]
    if (!((m >= 0xE1 && m <= 0xEF) || m === 0xFE)) out.push(...b.subarray(i, i + 2 + largo))
    i += 2 + largo
  }
  out.push(...b.subarray(i)); return Uint8Array.from(out)
}
/** Convierte una foto (data URL o blob URL) a JPEG sin metadatos con un lienzo (en el navegador). Si falla, null: queda solo la línea. */
export async function imagenParaPdf(src: string, max = 720): Promise<ImagenPdf | null> {
  try {
    const bmp = await createImageBitmap(await (await fetch(src)).blob())
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.82)); if (!blob) return null
    return { ancho: w, alto: h, jpeg: sinMetadatosJpeg(new Uint8Array(await blob.arrayBuffer())) }
  } catch { return null }
}

// ---------- PDF ----------
const WIN: Record<string, number> = { '—': 0x97, '–': 0x96, '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92, '…': 0x85, '€': 0x80 }
/** Texto a cadena PDF en WinAnsi (acentos, ñ, «», · como escapes octales). */
const cadena = (s: string) => '(' + [...s].map(ch => {
  const c = WIN[ch] ?? ch.charCodeAt(0)
  if (ch === '(' || ch === ')' || ch === '\\') return '\\' + ch
  if (c < 32 || c > 126) return c > 255 ? '?' : '\\' + c.toString(8).padStart(3, '0')
  return ch
}).join('') + ')'
const ancho = (s: string, t: number) => s.length * t * 0.52
function partir(s: string, t: number, max: number): string[] {
  const out: string[] = []; let l = ''
  for (const w of s.split(' ')) { const n = l ? l + ' ' + w : w; if (ancho(n, t) > max && l) { out.push(l); l = w } else l = n }
  return [...out, l]
}
export function pdfExpediente(a: Alquiler, ahora: number, ac?: Aceptaciones, imgs: Map<string, ImagenPdf> = new Map()): Uint8Array {
  const W = 595, H = 842, M = 50, paginas: string[][] = [[]]; let y = H - 110
  const usadas = new Map<string, number>(), usoPagina: Set<number>[] = [new Set()]
  const pagina = () => { paginas.push([]); usoPagina.push(new Set()); y = H - 80 }
  const altoFoto = (src?: string) => { const im = src ? imgs.get(src) : undefined; if (!im) return 0; const w = Math.min(160, 110 * im.ancho / im.alto); return w * im.alto / im.ancho + 6 }
  const altoLinea = (s: string, t: number) => partir(s, t, W - 2 * M).length * t * 1.45
  // Reserva espacio para que un título no quede solo al pie ni una foto se separe de su línea.
  const asegurar = (alto: number) => { if (y - alto < 70 - 10 * 1.45) pagina() }
  const linea = (s: string, t: number, negrita = false, color = '0.239 0.165 0.133') => {
    for (const l of partir(s, t, W - 2 * M)) {
      if (y < 70) pagina()
      paginas[paginas.length - 1].push(`BT /${negrita ? 'F2' : 'F1'} ${t} Tf ${color} rg ${M} ${y} Td ${cadena(l)} Tj ET`); y -= t * 1.45
    }
  }
  paginas[0].push(`BT /F2 18 Tf 0.239 0.165 0.133 rg ${M} ${H - 80} Td ${cadena('Expediente del reclamo · Lockumi')} Tj ET`)
  const imagen = (src: string) => {
    const im = imgs.get(src); if (!im) return
    const w = Math.min(160, 110 * im.ancho / im.alto), h = w * im.alto / im.ancho
    if (y - h < 70) pagina()
    if (!usadas.has(src)) usadas.set(src, usadas.size + 1)
    const n = usadas.get(src)!; usoPagina[usoPagina.length - 1].add(n)
    paginas[paginas.length - 1].push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${M + 12} ${(y - h + 8).toFixed(2)} cm /Im${n} Do Q`); y -= h + 6
  }
  for (const s of contenidoExpediente(a, ahora, ac)) {
    y -= 8; const l0 = s.lineas[0] ?? ''
    asegurar(13 * 1.45 + altoLinea(l0, 10) + altoFoto(s.fotos?.[0]))
    linea(s.titulo, 13, true, '0.91 0.325 0.122')
    s.lineas.forEach((l, i) => { if (s.fotos?.[i]) asegurar(altoLinea(l, 10) + altoFoto(s.fotos[i])); linea(l, 10); if (s.fotos?.[i]) imagen(s.fotos[i]) })
  }
  const objs: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
  const kids: number[] = []
  // Fotos: un objeto por foto distinta (JPEG sin metadatos, DCTDecode). Bytes 0–255 como caracteres (el PDF se arma byte a byte).
  const objImg = new Map<number, number>()
  for (const [src, n] of usadas) {
    const im = imgs.get(src)!, bytes = sinMetadatosJpeg(im.jpeg); let bin = ''
    for (let k = 0; k < bytes.length; k += 8192) bin += String.fromCharCode(...bytes.subarray(k, k + 8192))
    objs.push(`<< /Type /XObject /Subtype /Image /Width ${im.ancho} /Height ${im.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n${bin}\nendstream`)
    objImg.set(n, objs.length)
  }
  paginas.forEach((ops, i) => {
    const marca = [`0.91 0.325 0.122 rg 0 ${H - 34} ${W} 34 re f`, `BT /F2 12 Tf 0.239 0.165 0.133 rg ${M} ${H - 22} Td ${cadena(MARCA_EXPEDIENTE)} Tj ET`,
      `BT /F1 9 Tf 0.478 0.329 0.275 rg ${M} 36 Td ${cadena(`Página ${i + 1} de ${paginas.length} · ${MARCA_EXPEDIENTE} · Datos de la red de prueba de Stellar, sin valor real.`)} Tj ET`]
    const flujo = [...marca, ...ops].join('\n')
    objs.push(`<< /Length ${new TextEncoder().encode(flujo).length} >>\nstream\n${flujo}\nendstream`)
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${usoPagina[i].size ? ` /XObject << ${[...usoPagina[i]].map(n => `/Im${n} ${objImg.get(n)} 0 R`).join(' ')} >>` : ''} >> /Contents ${objs.length} 0 R >>`)
    kids.push(objs.length)
  })
  objs[1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`
  let out = '%PDF-1.4\n'; const pos: number[] = []
  objs.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Uint8Array.from(out, c => c.charCodeAt(0))
}
/** Para las pruebas: el PDF como texto (todo es ASCII). */
export const textoPdf = (b: Uint8Array) => String.fromCharCode(...b)
/** Descarga en el navegador (sin subir nada). */
export async function descargarExpediente(a: Alquiler, ahora: number) {
  const srcs = [...new Set(contenidoExpediente(a, ahora).flatMap(s => Object.values(s.fotos ?? {})))]
  const imgs = new Map<string, ImagenPdf>()
  for (const s of srcs) { const im = await imagenParaPdf(s); if (im) imgs.set(s, im) }
  const ac: Aceptaciones = { terminos: leerAceptacion('terminos'), privacidad: leerAceptacion('privacidad') }
  const url = URL.createObjectURL(new Blob([pdfExpediente(a, ahora, ac, imgs) as BlobPart], { type: 'application/pdf' }))
  const el = document.createElement('a'); el.href = url; el.download = `expediente-demo-${a.id.slice(0, 8)}.pdf`; el.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
