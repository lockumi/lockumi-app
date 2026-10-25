// /api/correo · Correos de Lockumi por Resend. Ver api/_lib/correo.ts (invitación y avisos de B) y api/_lib/correos-c.ts (C).
//  POST { tipo: 'invitacion' | 'aviso' | 'consentimiento', … }  → atenderCorreo
//  POST { tipo: 'avisos', alquiler } + sesión                    → C: el servidor envía lo que toque de ese alquiler (CORREOS_C=1)
//  POST { tipo: 'cuenta', correo: 'COR-C-08' | 'COR-C-09', … } + CRON_SECRET → correos de servicio del borrado de cuenta
//  GET  ?abrir=<enlace de COR-C-03>                              → registra la apertura del aviso del reclamo y abre la app
import { atenderCorreo, ErrorCorreo, origenPermitido, type PedidoCorreo } from './_lib/correo.js'
import { atenderAvisos, enviarCorreoCuenta, abrirCorreo } from './_lib/correos-c.js'
import { autorizado } from './_lib/borrados.js'

const appDe = (req: Request) => { const o = process.env.CORREOS_ORIGEN ?? new URL(req.url).origin; return origenPermitido(o) ? o : 'https://app.lockumi.com' }

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('abrir') ?? ''
  let id: string | null = null
  try { id = await abrirCorreo(process.env, token) } catch { id = null }
  const destino = id ? `${appDe(req)}/#/alquiler/${encodeURIComponent(id)}?aviso=cor-c-03&canal=correo` : `${appDe(req)}/`
  return new Response(null, { status: 302, headers: { location: destino, 'cache-control': 'no-store' } })
}

export async function POST(req: Request): Promise<Response> {
  let p: PedidoCorreo & Record<string, unknown>
  try { p = await req.json() as PedidoCorreo & Record<string, unknown> } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconocida'
  const origen = req.headers.get('origin') ?? ''
  try {
    const tipo = (p as { tipo?: string }).tipo
    const r = tipo === 'avisos' ? await atenderAvisos(process.env, p, req.headers.get('authorization'), origen)
      : tipo === 'cuenta' ? await (async () => {
        if (!autorizado(process.env, req.headers.get('authorization'))) throw new ErrorCorreo(401, 'No autorizado.')
        return enviarCorreoCuenta(process.env, p as never)
      })()
      : await atenderCorreo(process.env, p, origen, ip)
    return Response.json(r, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorCorreo ? e.estado : 500
    if (!(e instanceof ErrorCorreo)) console.error('correo', e instanceof Error ? e.message : 'error')
    return Response.json({ error: e instanceof ErrorCorreo ? e.message : 'No pudimos enviar el correo ahora. El aviso está en la app.' }, { status: estado })
  }
}
