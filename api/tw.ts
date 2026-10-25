// POST /api/tw · Proxy de Trustless Work (Vercel Function, runtime Node). La llave sale de process.env y no se envía nunca al navegador.
import { atender, responderLlaves, ErrorTw, type Pedido } from './_lib/tw.js'

/** GET /api/tw?revisar=llaves · PR #22, condición (a) para encender C: solo lectura. Dice si la llave mediadora es distinta de la de
 *  la plataforma y los últimos 4 caracteres de cada llave PÚBLICA. Nunca devuelve un secreto. 409 si no está lista. */
export async function GET(req: Request): Promise<Response> { return responderLlaves(process.env, req.url) }

export async function POST(req: Request): Promise<Response> {
  let p: Pedido
  try { p = await req.json() as Pedido } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  try {
    return Response.json(await atender(process.env, p, req.headers.get('authorization')), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorTw ? e.estado : 500
    if (!(e instanceof ErrorTw)) console.error('tw', e)
    return Response.json({ error: e instanceof ErrorTw ? e.message : 'Error inesperado del servidor.' }, { status: estado })
  }
}
