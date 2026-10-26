// POST /api/tw · Proxy de Trustless Work (Vercel Function, runtime Node). La llave sale de process.env y no se envía nunca al navegador.
import { atender, responderLlaves, ErrorTw, mensajeParaPersona, type Pedido } from './_lib/tw.js'
import { procesarCorreos, vencerMediaciones } from './_lib/correos-c.js'

/** Escenario C: después de pagar en la red de prueba, salen los correos de cierre (COR-C-07) de ese alquiler, si CORREOS_C=1. */
const PAGOS = new Set(['enviar', 'liberar', 'devolver-automatico', 'repartir'])

/** GET /api/tw?revisar=llaves · PR #22, condición (a) para encender C: solo lectura. Dice si la llave mediadora es distinta de la de
 *  la plataforma y los últimos 4 caracteres de cada llave PÚBLICA. Nunca devuelve un secreto. 409 si no está lista. */
export async function GET(req: Request): Promise<Response> { return responderLlaves(process.env, req.url) }

export async function POST(req: Request): Promise<Response> {
  let p: Pedido
  try { p = await req.json() as Pedido } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  try {
    const r = await atender(process.env, p, req.headers.get('authorization'))
    // Plazo de la mediación (P-06): se revisa en cada paso con un alquiler, con o sin CORREOS_C (Legal 25/10, punto 3).
    if (typeof p.contrato === 'string') await vencerMediaciones(process.env, { contrato: p.contrato }).catch(e => console.error('mediacion', e instanceof Error ? e.message : 'error'))
    if (PAGOS.has(String(p.accion)) && typeof p.contrato === 'string')
      await procesarCorreos(process.env, { contrato: p.contrato, origen: req.headers.get('origin') ?? undefined }).catch(e => console.error('correos', e instanceof Error ? e.message : 'error'))
    return Response.json(r, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorTw ? e.estado : 500
    if (!(e instanceof ErrorTw)) console.error('tw', e)
    if (!(e instanceof ErrorTw)) return Response.json({ error: 'Error inesperado del servidor.' }, { status: estado })
    const accion = p.accion === 'enviar' && (p as { paso?: string }).paso === 'fondear' ? 'enviar-fondear' : p.accion
    const visible = mensajeParaPersona(accion, e.message)
    if (visible !== e.message) console.error('tw', String(p.accion), estado, e.message)   // el detalle técnico, solo en el servidor
    return Response.json({ error: visible }, { status: estado })
  }
}
