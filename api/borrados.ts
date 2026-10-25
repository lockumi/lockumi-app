// GET /api/borrados · paso16-unido: borrados de la Privacidad 1.7-demo en Supabase (correos de invitación a los 7 días y datos de
// la mediación a los 30). Solo con CRON_SECRET. Ver api/_lib/borrados.ts. PENDIENTE: programarlo (no hay cron en vercel.json).
import { ejecutarBorrados, autorizado } from './_lib/borrados.js'

export async function GET(req: Request): Promise<Response> {
  if (!autorizado(process.env, req.headers.get('authorization'))) return Response.json({ error: 'No autorizado.' }, { status: 401 })
  try {
    return Response.json(await ejecutarBorrados(process.env), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    console.error('borrados', e instanceof Error ? e.message : 'error')
    return Response.json({ error: 'No se pudieron hacer los borrados. Se reintenta en la próxima corrida.' }, { status: 503 })
  }
}
