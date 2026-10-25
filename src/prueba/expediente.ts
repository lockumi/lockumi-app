// Paso 14 · Expediente del reclamo en PDF (legal/prueba-completa-textos.md, B.11, revisado 24/10 v3). Solo con la prueba completa.
// Contenido: número y fechas del alquiler; partes por su rol; rubros con su motivo; fotos con fecha y hora; facturas o precios de
// referencia; propuesta y cálculo; aceptaciones; registro de avisos; transacción en la red de prueba.
// No incluye correos, teléfonos, números de identificación ni la dirección del inmueble (Ley 8968, art. 6).
// PDF 1.4 escrito a mano (Helvetica, WinAnsi): sin dependencias nuevas ni envío de datos; se arma en el navegador.
import type { Alquiler, Foto, Rol } from '../types'
import { MOTIVOS, propuesta, referencia } from './propuesta'
import { nombreRubro } from './reclamos'

// LEGAL: revisar · B.11
export const BOTON_EXPEDIENTE = 'Descargar el expediente (demo)'
// LEGAL: revisar · B.11 (aviso antes de descargar)
export const AVISO_EXPEDIENTE = 'Este expediente tiene datos personales de la otra parte. Úsalo solo para este reclamo: para conversar con la otra parte, en una mediación o conciliación, o ante un tribunal. No lo publiques ni lo compartas con otras personas.'
// LEGAL: revisar · B.11 (marca de cada página)
export const MARCA_EXPEDIENTE = 'DEMO · Sin efecto legal'

export interface Seccion { titulo: string; lineas: string[] }
const ROL: Record<Rol, string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
const VIA: Record<string, string> = { automatico: 'Sin reclamo en el plazo', acuerdo: 'Acuerdo en la app', mediacion: 'Mediación Lockumi (demo)', propuesta: 'Propuesta automática', devuelto: 'El dueño devolvió todo', simulacion: 'Resolver el reclamo (simulación)' }
const usdc = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
const cr = (s?: string | number) => s === undefined || s === '' ? '—' : new Date(s).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (hora de Costa Rica)'
const dia = (s: string) => new Date(s).toLocaleDateString('es-CR', { timeZone: /^\d{4}-\d\d-\d\d$/.test(s) ? 'UTC' : 'America/Costa_Rica', day: 'numeric', month: 'long', year: 'numeric' })
/** Quita del texto libre correos, teléfonos y números de identificación que alguien haya escrito. */
export const sinDatos = (s: string) => s.replace(/[^\s@]+@[^\s@]+/g, '(dato quitado)').replace(/\+?\d[\d\s-]{6,}\d/g, '(dato quitado)')
const fotos = (fs: Foto[]) => fs.map(f => `Foto de ${ROL[f.por].toLowerCase()} · ${cr(f.fecha)}`)

export function contenidoExpediente(a: Alquiler, ahora: number): Seccion[] {
  const rubros = a.reclamo?.rubros ?? [], p = propuesta(a, rubros, a.reclamo?.respuestas ?? {})
  const tx = [a.liquidacionTx, a.red?.txs.resolucion, a.red?.txs.liberacion, ...a.historial.map(e => e.tx)].filter((x): x is string => !!x)
  return [
    { titulo: 'Alquiler', lineas: [`Número: ${a.id}`, `Desde el ${dia(a.inicio)} hasta el ${dia(a.fin)}`, `Depósito: ${usdc(a.monto)}`, `Expediente generado: ${cr(ahora)}`] },
    { titulo: 'Partes', lineas: ['Dueño: se identifica por su rol en la app', 'Inquilino: se identifica por su rol en la app', 'Sin correos, teléfonos, identificaciones ni la dirección del inmueble.'] },
    { titulo: 'Fotos de entrada', lineas: a.entrada.cuartos.flatMap(c => fotos(c.fotos).map(f => `${c.nombre}: ${f}`)) },
    { titulo: 'Fotos de salida', lineas: (a.salida?.cuartos ?? []).flatMap(c => fotos(c.fotos).map(f => `${c.nombre}: ${f}`)) },
    { titulo: 'Reclamo del dueño', lineas: [`Abierto: ${cr(a.reclamo?.fecha)}`, ...rubros.flatMap((r, i) => [
      `${i + 1}. ${nombreRubro(r)} × ${r.cantidad}: ${sinDatos(r.descripcion)}`, `   Motivo: ${MOTIVOS[r.motivo]}`,
      `   ${r.factura ? `Factura: ${usdc(r.factura.monto)}` : 'Sin factura'} · Precio de referencia: ${referencia(r) === null ? '—' : usdc(referencia(r)!)}`,
      ...fotos(r.fotos).map(f => '   ' + f), ...(a.reclamo?.respuestas?.[r.id] ? [`   Inquilino: ${a.reclamo.respuestas[r.id].acepta ? 'acepta' : 'no acepta'}`] : [])])] },
    { titulo: 'Propuesta y cálculo', lineas: [...p.filas.map((f, i) => `${i + 1}. Reclamado ${usdc(f.reclamado)} · propuesto ${usdc(f.propuesto)}${f.razones.length ? ' · ' + f.razones.map(z => z.replace(/\.$/, '')).join('; ') : ''}`), `Total propuesto al dueño: ${usdc(p.total)}`] },
    { titulo: 'Resultado', lineas: a.resultado ? [`${VIA[a.resultado.via] ?? a.resultado.via} · ${cr(a.resultado.fecha)}`, `Dueño: ${usdc(a.resultado.dueno)}`, `Inquilino: ${usdc(a.resultado.inquilino)}`] : ['Sin resultado todavía'] },
    { titulo: 'Aceptaciones', lineas: a.regla ? [`Regla de propuesta automática: ${a.regla.acepta ? 'sí' : 'no'} · Términos ${a.regla.version} · ${cr(a.regla.fecha)}`] : ['Sin registro'] },
    { titulo: 'Registro de avisos', lineas: (a.avisos ?? []).map(v => `${v.id} para ${ROL[v.para].toLowerCase()} · entregado en la app ${cr(v.entregado)} · ${v.abierto ? 'abierto ' + cr(v.abierto) : 'sin abrir'}`) },
    { titulo: 'Red de prueba de Stellar', lineas: tx.length ? [...new Set(tx)].map(h => `Transacción: ${h}`) : ['Sin transacciones'] },
  ].map(s => ({ ...s, lineas: s.lineas.length ? s.lineas : ['—'] }))
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
export function pdfExpediente(a: Alquiler, ahora: number): Uint8Array {
  const W = 595, H = 842, M = 50, paginas: string[][] = [[]]; let y = H - 110
  const linea = (s: string, t: number, negrita = false, color = '0.239 0.165 0.133') => {
    for (const l of partir(s, t, W - 2 * M)) {
      if (y < 70) { paginas.push([]); y = H - 80 }
      paginas[paginas.length - 1].push(`BT /${negrita ? 'F2' : 'F1'} ${t} Tf ${color} rg ${M} ${y} Td ${cadena(l)} Tj ET`); y -= t * 1.45
    }
  }
  paginas[0].push(`BT /F2 18 Tf 0.239 0.165 0.133 rg ${M} ${H - 80} Td ${cadena('Expediente del reclamo · Lockumi')} Tj ET`)
  for (const s of contenidoExpediente(a, ahora)) { y -= 8; linea(s.titulo, 13, true, '0.91 0.325 0.122'); for (const l of s.lineas) linea(l, 10) }
  const objs: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
  const kids: number[] = []
  paginas.forEach((ops, i) => {
    const marca = [`0.91 0.325 0.122 rg 0 ${H - 34} ${W} 34 re f`, `BT /F2 12 Tf 0.239 0.165 0.133 rg ${M} ${H - 22} Td ${cadena(MARCA_EXPEDIENTE)} Tj ET`,
      `BT /F1 9 Tf 0.478 0.329 0.275 rg ${M} 36 Td ${cadena(`Página ${i + 1} de ${paginas.length} · ${MARCA_EXPEDIENTE} · Datos de la red de prueba de Stellar, sin valor real.`)} Tj ET`]
    const flujo = [...marca, ...ops].join('\n')
    objs.push(`<< /Length ${new TextEncoder().encode(flujo).length} >>\nstream\n${flujo}\nendstream`)
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${objs.length} 0 R >>`)
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
export function descargarExpediente(a: Alquiler, ahora: number) {
  const url = URL.createObjectURL(new Blob([pdfExpediente(a, ahora) as BlobPart], { type: 'application/pdf' }))
  const el = document.createElement('a'); el.href = url; el.download = `expediente-demo-${a.id.slice(0, 8)}.pdf`; el.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
