// Guarda del build (vite.config.ts): el build de PRODUCCIÓN (VERCEL_ENV=production) falla mientras algún texto de correo tenga la
// marca «LEGAL: revisar» (api/_lib/textos-correos.ts). Igual que la guarda de la fecha de reputación. No hay excepción en producción.
import { textosPorRevisar } from './textos-correos.js'

export function revisarBuildCorreos(env: Record<string, string | undefined>) {
  const faltan = textosPorRevisar()
  if (env.VERCEL_ENV === 'production' && faltan.length)
    throw new Error(`Correos: ${faltan.length} textos todavía tienen la marca «LEGAL: revisar» (${faltan.join(', ')}). El build de producción no sigue hasta que Legal los confirme.`)
}
export function guardaCorreos(env: Record<string, string | undefined>) {
  return { name: 'lockumi-guarda-correos', configResolved(c: { command: string }) { if (c.command === 'build') revisarBuildCorreos(env) } }
}
