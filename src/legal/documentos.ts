import { aHtml } from './markdown'
import { pruebaCompleta, correosActivos } from '../prueba/interruptor'
import { calcularModos } from '../servidor/config'
import { condicional, type Interruptores } from './condicional'
import { versionVigente, datosVersion, desde17, ordenVersion, VERSIONES } from './versiones'

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

const armar = (a: Record<string, string>): Record<string, DocLegal> => Object.fromEntries(
  Object.entries(a)
    .map(([ruta, txt]) => [ruta.replace(/^\.\/(v17\/)?|\.md$/g, ''), txt] as const)
    .filter(([slug]) => /^[a-z0-9-]+$/.test(slug)) // LEEME.md no es una página
    .map(([slug, txt]) => [slug, leerDoc(slug, txt)]),
)
/** Textos 1.6-demo (los de producción con el interruptor apagado). */
export const DOCS: Record<string, DocLegal> = armar(archivos)
// Paso 16 · Términos y Aviso de privacidad 1.7-demo (prueba completa). Están en v17/ para no ser páginas con el interruptor apagado.
// Con el interruptor encendido, /terminos y /privacidad muestran la 1.7-demo, y la 1.6-demo sigue en /terminos-1-6 y /privacidad-1-6
// para los alquileres firmados con ella (siguen con sus reglas salvo que los dos acepten la nueva versión).
const archivosV17 = import.meta.glob('./v17/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
// paso16-unido · UNA sola 1.7-demo: los .md de v17/ traen bloques condicionales (ver condicional.ts) y se arman según lo que está
// encendido, para que el texto describa exactamente lo que la app hace. Se calcula al pedirlo (las pruebas cambian el entorno).
/** Lo que está encendido para los textos legales: modo de dos personas (servidor/config) y correos (VITE_CORREOS). */
export const interruptoresLegales = (): Interruptores => ({ 'dos-personas': calcularModos(import.meta.env as never).dosPersonas, correos: correosActivos() })
const DOCS_16_EN_17 = Object.fromEntries(Object.entries(DOCS).filter(([k]) => k === 'terminos' || k === 'privacidad').map(([k, d]) => [k + '-1-6', { ...d, slug: k + '-1-6' }]))
const cache17 = new Map<string, Record<string, DocLegal>>()
/** Términos y Privacidad armados para unos interruptores (sin las páginas de versiones anteriores). */
function armar17(s: Interruptores): Record<string, DocLegal> {
  const k = JSON.stringify(s)
  let d = cache17.get(k)
  if (!d) { d = armar(Object.fromEntries(Object.entries(archivosV17).map(([r, t]) => [r, condicional(t, s)]))); cache17.set(k, d) }
  return d
}
/** Escenario C (preparación): la ruta de una versión anterior a la vigente, «/terminos-1-7» (la 1.6-demo, «/terminos-1-6»). */
const sufijo = (v: string) => '-' + v.replace(/-demo$/, '').replace('.', '-')
/** Vigentes según lo encendido, más las versiones anteriores (1.6-demo y, si ya subió, las 1.7-demo o posteriores) en su ruta. */
function docs17(): Record<string, DocLegal> {
  const s = interruptoresLegales(), vig = versionVigente(s), anteriores: Record<string, DocLegal> = {}
  for (const v of VERSIONES) if (ordenVersion(v.version) < ordenVersion(vig)) for (const [k, d] of Object.entries(armar17(v.interruptores)))
    if (k === 'terminos' || k === 'privacidad') anteriores[k + sufijo(v.version)] = { ...d, slug: k + sufijo(v.version) }
  return { ...DOCS, ...armar17(s), ...DOCS_16_EN_17, ...anteriores }
}
/** Textos legales vigentes en la app (según el interruptor). */
export const docs = (): Record<string, DocLegal> => pruebaCompleta() ? docs17() : DOCS
export const terminosActual = (): DocLegal => docs().terminos
export const privacidadActual = (): DocLegal | undefined => docs().privacidad
/** Términos con los que se firmó un alquiler: la 1.6-demo, la vigente o una 1.7-demo o posterior anterior (con sus interruptores). */
export const docTerminos = (version: string): DocLegal => {
  if (!desde17(version) || !datosVersion(version)) return DOCS.terminos
  return version === versionVigente(interruptoresLegales()) ? docs17().terminos : armar17(datosVersion(version)!.interruptores).terminos
}
/** Ruta de los Términos de una versión: la vigente en /terminos; la 1.6-demo, con el interruptor encendido, en /terminos-1-6. */
export const rutaTerminos = (version: string) => version === terminosActual().version ? '/terminos' : desde17(version) && datosVersion(version) ? '/terminos' + sufijo(version) : '/terminos-1-6'
export const TERMINOS = DOCS.terminos
/** Paso 11 + paso 16: la Privacidad vigente (1.7-demo con el interruptor) sale de un solo archivo, `v17/privacidad.md`. */
export const privacidadVigente = (): DocLegal | undefined => privacidadActual()
export const PRIVACIDAD = DOCS.privacidad as DocLegal | undefined
export const hayPrivacidad = !!PRIVACIDAD

/** Texto fijo de la casilla de consentimiento de privacidad (ya no viene en privacidad.md; sale solo de la app).
 *  "Aviso de privacidad de la app" se enlaza a /privacidad. La casilla es obligatoria y empieza sin marcar. */
// LEGAL: revisado (24/10) · ajuste 3 de Legal (docs/reaceptacion.md): «o de mi cuenta de prueba»
export const CONSENTIMIENTO_PRIVACIDAD = {
  antes: 'Acepto el ',
  enlace: 'Aviso de privacidad de la app',
  despues: ' y autorizo que Lockumi trate mis datos y los transfiera a Supabase, Vercel, Cavos y Trustless Work, dentro y fuera de Costa Rica, para usar la demo. Entiendo que la demo funciona en la red de prueba de Stellar, con tokens sin valor y sin dinero real, y que la dirección de mi billetera o de mi cuenta de prueba, los montos y las fechas quedan registrados en esa red, que es pública y no se puede borrar.',
} as const

/** paso16-unido · Casilla de privacidad vigente: con los correos encendidos nombra también a Resend (recibe el correo de los avisos
 *  y de las invitaciones). Apagada la prueba completa, es la de siempre. */
// LEGAL: revisar · se agrega «Resend» a la lista de proveedores solo con VITE_CORREOS=1 (la Privacidad 1.7-demo ya lo nombra)
export const consentimientoPrivacidad = (): typeof CONSENTIMIENTO_PRIVACIDAD | { antes: string; enlace: string; despues: string } =>
  !correosActivos() ? CONSENTIMIENTO_PRIVACIDAD : { ...CONSENTIMIENTO_PRIVACIDAD, despues: CONSENTIMIENTO_PRIVACIDAD.despues.replace('Supabase, Vercel, Cavos y Trustless Work', 'Supabase, Vercel, Cavos, Trustless Work y Resend') }

/** Fecha legible: acepta ISO aaaa-mm-dd; si viene en otro formato se muestra tal cual. */
export const fechaLegible = (f: string | null) => !f ? null : /^\d{4}-\d{2}-\d{2}$/.test(f)
  ? new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }) : f

/** '/terminos', '/terminos/' o el hash '/terminos' → 'terminos' si existe ese texto legal; si no, null. */
export const rutaLegal = (p: string) => { const s = p.replace(/^\/+|\/+$/g, ''); return s && s in docs() ? s : null }
