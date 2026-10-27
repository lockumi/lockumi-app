// GET /api/borrados · paso16-unido: borrados de la Privacidad 1.7-demo en Supabase (correos de invitación a los 7 días y datos de
// la mediación a los 30). Solo con CRON_SECRET. Ver api/_lib/borrados.ts. Escenario C: programado cada hora en vercel.json (crons; paso 22).
import { ejecutarBorrados, autorizado } from './_lib/borrados.js'
import { pagarRepartos } from './_lib/devoluciones.js'

export async function GET(req: Request): Promise<Response> {
  if (!autorizado(process.env, req.headers.get('authorization'))) return Response.json({ error: 'No autorizado.' }, { status: 401 })
  // 27/10 · Operación (docs/fondeo-testnet.md § «Reparto por pagar»): ?reparto=pendientes lista sin pagar; ?reparto=<id> paga ese caso.
  const reparto = new URL(req.url).searchParams.get('reparto')
  if (reparto) {
    const r = await pagarRepartos(process.env, reparto === 'pendientes' ? { listar: true } : { ids: [reparto] })
    return Response.json(r, { status: 'error' in r ? 400 : 200, headers: { 'cache-control': 'no-store' } })
  }
  try {
    return Response.json(await ejecutarBorrados(process.env), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    console.error('borrados', e instanceof Error ? e.message : 'error')
    return Response.json({ error: 'No se pudieron hacer los borrados. Se reintenta en la próxima corrida.' }, { status: 503 })
  }
}
