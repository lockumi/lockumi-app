import { aHtml } from './markdown'
import { pruebaCompleta, correosActivos } from '../prueba/interruptor'
import { calcularModos } from '../servidor/config'
import { condicional, type Interruptores } from './condicional'
import { versionVigente, datosVersion, desde17, ordenVersion, VERSIONES } from './versiones'
import { V110, EDICION_V110, V111, EDICION_V111, V112, EDICION_V112, V113, EDICION_V113, V114, EDICION_V114, V_REPUTACION } from './version17'

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
export const interruptoresLegales = (): Interruptores => ({ 'dos-personas': calcularModos(import.meta.env as never).dosPersonas, correos: correosActivos(),
  reputacion: import.meta.env.VITE_REPUTACION === '1' })   // paso 19: REP-14 y REP-15
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

// Legal (PR #33, 25/10/2026, 11:33 p. m.) · REGLA DE ARCHIVO: una versión publicada no cambia nunca y queda en su propia ruta.
// Las versiones 1.7-demo a 1.10-demo se arman SIEMPRE desde la copia exacta de src/legal/v17/ en master 8790b52 (antes de la ronda 1.10),
// guardada en src/legal/archivo/8790b52/ (pruebas: archivo-versiones.test.ts compara byte a byte con lo publicado). src/legal/v17/ es
// solo la edición vigente con la reputación (1.12-demo desde la revisión de c97585b; la 1.11-demo, en archivo/04e4424/); sin la reputación, la vigente es una versión ya publicada (1.7, 1.8 o 1.9).
const archivosPublicados = import.meta.glob('./archivo/8790b52/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const cachePublicados = new Map<string, Record<string, DocLegal>>()
/** Términos y Privacidad publicados (archivo 8790b52) armados para unos interruptores y, si se da, una edición fija. */
function armarPublicado(s: Interruptores, edicion?: string): Record<string, DocLegal> {
  const k = JSON.stringify([s, edicion ?? null])
  let d = cachePublicados.get(k)
  if (!d) {
    d = armar(Object.fromEntries(Object.entries(archivosPublicados).map(([r, t]) => [r.replace('archivo/8790b52/', ''), condicional(t, s, edicion)])))
    cachePublicados.set(k, d)
  }
  return d
}
// Legal (revisión de c97585b, 26/10/2026) · misma regla para la 1.11-demo: copia exacta de src/legal/v17/ en master 04e4424 (PR #33
// publicado), en src/legal/archivo/04e4424/. src/legal/v17/ pasa a ser la 1.12-demo.
const archivosV111 = import.meta.glob('./archivo/04e4424/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
let cacheV111: Record<string, DocLegal> | undefined
const armarV111 = () => cacheV111 ??= armar(Object.fromEntries(Object.entries(archivosV111).map(([r, t]) => [r.replace('archivo/04e4424/', ''), condicional(t, datosVersion(V111)!.interruptores, EDICION_V111)])))
// Legal (26/10/2026) · misma regla para la 1.12-demo: copia exacta de src/legal/v17/ en master 4dfa5ae, en src/legal/archivo/4dfa5ae/.
// src/legal/v17/ pasa a ser la 1.13-demo.
const archivosV112 = import.meta.glob('./archivo/4dfa5ae/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
let cacheV112: Record<string, DocLegal> | undefined
const armarV112 = () => cacheV112 ??= armar(Object.fromEntries(Object.entries(archivosV112).map(([r, t]) => [r.replace('archivo/4dfa5ae/', ''), condicional(t, datosVersion(V112)!.interruptores, EDICION_V112)])))
// Legal (26/10/2026, 9:43 p. m.) · misma regla para la 1.13-demo: copia exacta de src/legal/v17/ en master 712d4c6, en src/legal/archivo/712d4c6/.
// src/legal/v17/ pasa a ser la 1.14-demo.
const archivosV113 = import.meta.glob('./archivo/712d4c6/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
let cacheV113: Record<string, DocLegal> | undefined
const armarV113 = () => cacheV113 ??= armar(Object.fromEntries(Object.entries(archivosV113).map(([r, t]) => [r.replace('archivo/712d4c6/', ''), condicional(t, datosVersion(V113)!.interruptores, EDICION_V113)])))
// Legal (26/10/2026, 10:05 p. m.) · misma regla para la 1.14-demo: copia exacta de src/legal/v17/ en master 4736c0f, en src/legal/archivo/4736c0f/.
// src/legal/v17/ pasa a ser la 1.15-demo.
const archivosV114 = import.meta.glob('./archivo/4736c0f/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
let cacheV114: Record<string, DocLegal> | undefined
const armarV114 = () => cacheV114 ??= armar(Object.fromEntries(Object.entries(archivosV114).map(([r, t]) => [r.replace('archivo/4736c0f/', ''), condicional(t, datosVersion(V114)!.interruptores, EDICION_V114)])))
/** Una versión publicada (1.7-demo a 1.14-demo), con sus interruptores y su edición (la 1.10-demo a la 1.14-demo, con su fecha). */
const publicada = (version: string) => version === V114 ? armarV114() : version === V113 ? armarV113() : version === V112 ? armarV112() : version === V111 ? armarV111() : armarPublicado(datosVersion(version)!.interruptores, version === V110 ? EDICION_V110 : undefined)
/** Los dos textos (terminos, privacidad) de una versión 1.7-demo o posterior: las publicadas desde el archivo; la 1.15-demo, de v17/. */
const textosDe = (version: string): Record<string, DocLegal> => version === V_REPUTACION ? armar17(datosVersion(version)!.interruptores) : publicada(version)
const enSuRuta = (version: string) => Object.fromEntries(Object.entries(textosDe(version)).filter(([k]) => k === 'terminos' || k === 'privacidad')
  .map(([k, d]) => [k + sufijo(version), { ...d, slug: k + sufijo(version) }]))
/** Vigentes según lo encendido, más cada versión ya publicada en su ruta (/terminos-1-6 … /terminos-1-10). */
function docs17(): Record<string, DocLegal> {
  const s = interruptoresLegales(), vig = versionVigente(s)
  // La vigente: con la reputación, la edición de la cuenta (1.12-demo, de v17/); sin ella, la del escenario, tal como se publicó.
  const vigente = s.reputacion ? armar17(s) : armarPublicado(s)
  let archivo: Record<string, DocLegal> = {}
  for (const v of VERSIONES) if (ordenVersion(v.version) < ordenVersion(vig)) archivo = { ...archivo, ...enSuRuta(v.version) }
  // Con dos personas: la 1.9-demo (la de cada alquiler, versiones.ts:28, migración 20261025050000) y la 1.10-demo (publicada el 25/10 con
  // la reputación; la guardaron los alquileres de una persona de esas cuentas) siempre tienen su ruta; con la reputación, la 1.11-demo
  // (archivada, master 04e4424) y la 1.12-demo (la vigente) también.
  if (s['dos-personas']) archivo = { ...archivo, ...enSuRuta('1.9-demo'), ...enSuRuta(V110), ...(s.reputacion ? { ...enSuRuta(V111), ...enSuRuta(V112), ...enSuRuta(V113), ...enSuRuta(V114), ...enSuRuta(V_REPUTACION) } : {}) }
  return { ...DOCS, ...vigente, ...DOCS_16_EN_17, ...archivo }
}
/** Textos legales vigentes en la app (según el interruptor). */
export const docs = (): Record<string, DocLegal> => pruebaCompleta() ? docs17() : DOCS
export const terminosActual = (): DocLegal => docs().terminos
export const privacidadActual = (): DocLegal | undefined => docs().privacidad
/** Términos con los que se firmó un alquiler: la 1.6-demo o la versión 1.7-demo o posterior que guardó (siempre su propio texto). */
export const docTerminos = (version: string): DocLegal => !desde17(version) || !datosVersion(version) ? DOCS.terminos
  : version === terminosActual().version ? terminosActual() : textosDe(version).terminos
/** Ruta de los Términos de la versión que se guardó: la vigente en /terminos; las demás en la suya (/terminos-1-9, /terminos-1-10…). */
export const rutaTerminos = (version: string) => rutaDe('terminos', version)
/** Ruta del Aviso de privacidad de una versión (igual que rutaTerminos): la casilla «Acepto los Términos X y el Aviso de privacidad». */
export const rutaPrivacidad = (version: string) => rutaDe('privacidad', version)
const rutaDe = (doc: 'terminos' | 'privacidad', version: string) => version === docs()[doc]?.version ? '/' + doc
  : desde17(version) && datosVersion(version) ? '/' + doc + sufijo(version) : '/' + doc + '-1-6'
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
// LEGAL: revisado (25/10, lista de Legal) · se agrega «Resend» a la lista de proveedores solo con VITE_CORREOS=1 (la Privacidad 1.7-demo ya lo nombra)
export const consentimientoPrivacidad = (): typeof CONSENTIMIENTO_PRIVACIDAD | { antes: string; enlace: string; despues: string } =>
  !correosActivos() ? CONSENTIMIENTO_PRIVACIDAD : { ...CONSENTIMIENTO_PRIVACIDAD, despues: CONSENTIMIENTO_PRIVACIDAD.despues.replace('Supabase, Vercel, Cavos y Trustless Work', 'Supabase, Vercel, Cavos, Trustless Work y Resend') }

// LEGAL: revisado (26/10/2026, 1:15 a. m.) · casilla de los Términos 1.13-demo y línea visible, textos literales de Legal. Sin la
// pantalla aparte de REP-01: el perfil de reputación se acepta con esta casilla (sin marcar). La del Aviso de privacidad no cambia.
export const LINEA_PERFIL_113 = 'Tu cuenta incluye un perfil público y fijo que cualquiera con el enlace puede ver: tu nombre, la inicial de tu apellido y, ' +
  'desde tu 3.er alquiler cerrado, tu puntaje. Nunca muestra tu dirección, teléfono, correo ni montos. Solo deja de verse si eliminas tu cuenta.'
export interface TextoCasillaTerminos { antes: string; enlace: string; despues: string; linea?: string }
/** La casilla de los Términos en la pantalla de inicio: con la reputación, «Acepto los Términos 1.15-demo, incluido mi perfil de
 *  reputación público.» y la línea de Legal; sin ella, la de siempre («Acepto los Términos y condiciones»). */
export const casillaTerminos = (): TextoCasillaTerminos => interruptoresLegales().reputacion
  ? { antes: 'Acepto los ', enlace: `Términos ${V_REPUTACION}`, despues: ', incluido mi perfil de reputación público.', linea: LINEA_PERFIL_113 }
  : { antes: 'Acepto los ', enlace: 'Términos y condiciones', despues: '' }
/** El texto exacto de esa casilla (y su línea), para el registro del consentimiento del perfil (versión, fecha, hora y texto). */
export const textoCasillaTerminos = (c = casillaTerminos()): string[] => [c.antes + c.enlace + c.despues, ...(c.linea ? [c.linea] : [])]

/** Fecha legible: acepta ISO aaaa-mm-dd; si viene en otro formato se muestra tal cual. */
export const fechaLegible = (f: string | null) => !f ? null : /^\d{4}-\d{2}-\d{2}$/.test(f)
  ? new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }) : f

/** '/terminos', '/terminos/' o el hash '/terminos' → 'terminos' si existe ese texto legal; si no, null. */
export const rutaLegal = (p: string) => { const s = p.replace(/^\/+|\/+$/g, ''); return s && s in docs() ? s : null }
