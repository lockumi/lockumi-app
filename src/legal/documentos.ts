import { aHtml } from './markdown'
import privacidad17 from '../prueba/privacidad-1.7.md?raw'
import { pruebaCompleta } from '../prueba/interruptor'

/** Textos legales: cada `*.md` de esta carpeta es una página (`terminos.md` → `/terminos`).
 *  Para cambiar un texto basta con reemplazar su archivo (ver LEEME.md). */
const archivos = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** `metaEnTexto`: el propio texto ya muestra la versión y la fecha (la página no las repite). */
export interface DocLegal { slug: string; titulo: string; version: string; fecha: string | null; html: string; borrador: boolean; metaEnTexto: boolean; revisionAbogado: boolean }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16).padStart(8, '0') }

export function leerDoc(slug: string, crudo: string): DocLegal {
  let cuerpo = crudo.replace(/^\uFEFF/, ''); const meta: Record<string, string> = {}
  const fm = cuerpo.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fm) { for (const l of fm[1].split('\n')) { const m = l.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/); if (m) meta[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '') } cuerpo = cuerpo.slice(fm[0].length) }
  // Sin metadatos: busca la línea de versión del propio texto, p. ej. "**Versión 1.3-demo · 17 de octubre de 2026**"
  // o "**Versión:** 1.0-demo · **Fecha:** 17 de octubre de 2026" (también "Última actualización:").
  const limpio = (x?: string) => x?.replace(/[*_]/g, '').trim() || undefined
  const lineaV = cuerpo.match(/^.*versi[oó]n\s*\**\s*:?\s*\**\s*\d[^\n]*$/im)?.[0] ?? ''
  const vTexto = limpio(lineaV.match(/versi[oó]n\s*\**\s*:?\s*\**\s*(\d[^·\n*]*)/i)?.[1])
  const fTexto = limpio(cuerpo.match(/(?:fecha|[uú]ltima actualizaci[oó]n|vigente desde)\s*\**\s*:\s*\**\s*([^·\n]+)/i)?.[1])
    ?? limpio(lineaV.match(/·\s*\**\s*(\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i)?.[1])
  const version = meta.version || meta['versión'] || vTexto || 'texto-' + hash(cuerpo)
  const fecha = meta.fecha || fTexto || null
  const metaEnTexto = !!vTexto && (meta.version || meta['versión'] || vTexto) === vTexto
  const titulo = cuerpo.match(/^#\s+(.+)$/m)?.[1].trim() || slug
  return { slug, titulo, version, fecha, html: aHtml(cuerpo), borrador: /borrador/i.test(version) || /borrador provisional/i.test(cuerpo), metaEnTexto, revisionAbogado: /revisi[oó]n por abogado/i.test(cuerpo) }
}


export const DOCS: Record<string, DocLegal> = Object.fromEntries(
  Object.entries(archivos)
    .map(([ruta, txt]) => [ruta.replace(/^\.\/|\.md$/g, ''), txt] as const)
    .filter(([slug]) => /^[a-z0-9-]+$/.test(slug)) // LEEME.md no es una página
    .map(([slug, txt]) => [slug, leerDoc(slug, txt)]),
)
export const TERMINOS = DOCS.terminos
/** Paso 11: con el interruptor de la prueba completa, la Privacidad 1.7-demo con los correos (LEGAL-correos-2104.md, punto 2).
 *  Al cambiar la versión, Reaceptacion.tsx pide aceptarla de nuevo dentro de la sesión. */
export const privacidadVigente = (): DocLegal | undefined => pruebaCompleta() ? leerDoc('privacidad', privacidad17) : DOCS.privacidad as DocLegal | undefined
export const PRIVACIDAD = privacidadVigente()
export const hayPrivacidad = !!PRIVACIDAD

/** Texto fijo de la casilla de consentimiento de privacidad (ya no viene en privacidad.md; sale solo de la app).
 *  "Aviso de privacidad de la app" se enlaza a /privacidad. La casilla es obligatoria y empieza sin marcar. */
// LEGAL: revisado (24/10) · ajuste 3 de Legal (docs/reaceptacion.md): «o de mi cuenta de prueba»
export const CONSENTIMIENTO_PRIVACIDAD = {
  antes: 'Acepto el ',
  enlace: 'Aviso de privacidad de la app',
  despues: ' y autorizo que Lockumi trate mis datos y los transfiera a Supabase, Vercel, Cavos y Trustless Work, dentro y fuera de Costa Rica, para usar la demo. Entiendo que la demo funciona en la red de prueba de Stellar, con tokens sin valor y sin dinero real, y que la dirección de mi billetera o de mi cuenta de prueba, los montos y las fechas quedan registrados en esa red, que es pública y no se puede borrar.',
} as const

/** Fecha legible: acepta ISO aaaa-mm-dd; si viene en otro formato se muestra tal cual. */
export const fechaLegible = (f: string | null) => !f ? null : /^\d{4}-\d{2}-\d{2}$/.test(f)
  ? new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }) : f

/** '/terminos', '/terminos/' o el hash '/terminos' → 'terminos' si existe ese texto legal; si no, null. */
export const rutaLegal = (p: string) => { const s = p.replace(/^\/+|\/+$/g, ''); return s && s in DOCS ? s : null }
