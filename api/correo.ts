// POST /api/correo · Prueba completa: invitación y avisos de los días 1, 4 y 6 por correo (Resend). Ver api/_lib/correo.ts.
import { atenderCorreo, ErrorCorreo, type PedidoCorreo } from './_lib/correo.js'

export async function POST(req: Request): Promise<Response> {
  let p: PedidoCorreo
  try { p = await req.json() as PedidoCorreo } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconocida'
  const origen = req.headers.get('origin') ?? ''
  try {
    return Response.json(await atenderCorreo(process.env, p, origen, ip), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorCorreo ? e.estado : 500
    if (!(e instanceof ErrorCorreo)) console.error('correo', e instanceof Error ? e.message : 'error')
    return Response.json({ error: e instanceof ErrorCorreo ? e.message : 'No pudimos enviar el correo ahora. El aviso está en la app.' }, { status: estado })
  }
}
