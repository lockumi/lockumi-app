// GET /api/config · configuración pública para el navegador (sin secretos): { devolucionAutomatica: boolean }. Ver api/_lib/config-publica.ts.
// Cambiar DEVOLUCION_CRON en Vercel exige redesplegar, así que un caché corto alcanza.
import process from 'node:process'
import { configPublica } from './_lib/config-publica.js'

export function GET(): Response {
  return Response.json(configPublica(process.env), { headers: { 'cache-control': 'public, max-age=60, s-maxage=60' } })
}
