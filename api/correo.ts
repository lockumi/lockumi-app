// /api/correo · Correos de Lockumi por Resend. Ver api/_lib/correo.ts (invitación y avisos de B) y api/_lib/correos-c.ts (C).
//  POST { tipo: 'invitacion' | 'aviso' | 'consentimiento', … }  → atenderCorreo
//  POST { tipo: 'avisos', alquiler } + sesión                    → C: el servidor envía lo que toque de ese alquiler (CORREOS_C=1)
//  POST { tipo: 'cuenta', correo: 'COR-C-08' | 'COR-C-09', … } + CRON_SECRET → correos de servicio del borrado de cuenta
//  GET  ?abrir=<enlace de COR-C-03>                              → solo muestra una página con un botón (no registra nada)
//  POST ?abrir=<enlace de COR-C-03> (el botón de esa página)     → registra la apertura del aviso del reclamo y abre la app (303)
import { atenderCorreo, ErrorCorreo, origenPermitido, type PedidoCorreo } from './_lib/correo.js'
import { atenderAvisos, enviarCorreoCuenta, abrirCorreo, paginaAbrir } from './_lib/correos-c.js'
import { autorizado } from './_lib/borrados.js'

const appDe = (req: Request) => { const o = process.env.CORREOS_ORIGEN ?? new URL(req.url).origin; return origenPermitido(o) ? o : 'https://app.lockumi.com' }

const TOKEN = /^[0-9a-f]{64}$/
const SIN_GUARDAR = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' }

/** GET ?abrir=: solo la página con el botón. Legal 25/10, 5:09 p. m. (punto 4): la apertura se registra SOLO al tocar el botón. */
export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('abrir') ?? ''
  if (!TOKEN.test(token)) return new Response(null, { status: 302, headers: { location: `${appDe(req)}/`, ...SIN_GUARDAR } })
  return new Response(paginaAbrir(token), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...SIN_GUARDAR } })
}

/** POST ?abrir= (botón de la página): registra la apertura (lk_correo_abierto) y abre el alquiler en la app. */
async function abrir(req: Request, token: string): Promise<Response> {
  let id: string | null = null
  try { id = await abrirCorreo(process.env, token) } catch { id = null }
  const destino = id ? `${appDe(req)}/#/alquiler/${encodeURIComponent(id)}?aviso=cor-c-03&canal=correo` : `${appDe(req)}/`
  return new Response(null, { status: 303, headers: { location: destino, ...SIN_GUARDAR } })
}

export async function POST(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('abrir')
  if (token !== null) return abrir(req, token)
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
