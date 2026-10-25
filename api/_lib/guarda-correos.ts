// Guarda del build (vite.config.ts): el build de PRODUCCIÓN (VERCEL_ENV=production) falla mientras quede alguna marca «LEGAL: revisar»
// visible: en los textos de los correos (api/_lib/textos-correos.ts, campo `legal`) Y en cualquier marca de comentario del código,
// los textos legales o las migraciones (src/, api/, supabase/migrations/; Legal 25/10, 5:09 p. m., punto 10). Igual que la guarda
// de la fecha de reputación. No hay excepción en producción.
import { textosPorRevisar } from './textos-correos.js'

export interface Archivo { ruta: string; texto: string }
export const CARPETAS_GUARDA = ['src', 'api', 'supabase/migrations']
/** Una marca es un comentario que EMPIEZA con «LEGAL: revisar» (//, /*, {/*, <!-- o --), al inicio de la línea o después de código.
 *  No cuentan las menciones entre comillas o acentos graves (`// LEGAL: revisar`, «LEGAL: revisar») que explican la regla. */
const MARCA = /(^|[\s;,)}>\]])(\/\/|\{\/\*|\/\*|<!--|--)\s*LEGAL: revisar/
/** Archivos que la guarda revisa: código, textos y migraciones; no las pruebas. */
export const revisaGuarda = (ruta: string) => /\.(ts|tsx|md|sql|mjs|js)$/.test(ruta) && !/(^|\/)(__tests__|node_modules)\//.test(ruta) && !/\.test\.tsx?$/.test(ruta)

/** «ruta:línea» de cada marca «LEGAL: revisar» visible. */
export function marcasPorRevisar(archivos: Archivo[]): string[] {
  const r: string[] = []
  for (const a of archivos) if (revisaGuarda(a.ruta)) a.texto.split('\n').forEach((l, i) => { if (MARCA.test(l)) r.push(`${a.ruta}:${i + 1}`) })
  return r
}

export function revisarBuildCorreos(env: Record<string, string | undefined>, archivos: Archivo[] = []) {
  if (env.VERCEL_ENV !== 'production') return
  const faltan = textosPorRevisar(), marcas = marcasPorRevisar(archivos)
  if (faltan.length)
    throw new Error(`Correos: ${faltan.length} textos todavía tienen la marca «LEGAL: revisar» (${faltan.join(', ')}). El build de producción no sigue hasta que Legal los confirme.`)
  if (marcas.length)
    throw new Error(`Textos: ${marcas.length} marcas «LEGAL: revisar» (${marcas.join(', ')}). El build de producción no sigue hasta que Legal las confirme.`)
}
/** `leer`: lista los archivos del repositorio (vite.config.ts la arma con node:fs). */
export function guardaCorreos(env: Record<string, string | undefined>, leer: () => Archivo[] = () => []) {
  return { name: 'lockumi-guarda-correos', configResolved(c: { command: string }) { if (c.command === 'build') revisarBuildCorreos(env, env.VERCEL_ENV === 'production' ? leer() : []) } }
}
