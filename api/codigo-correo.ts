// POST /api/codigo-correo · paso 19, segundo factor (Legal 25/10/2026, 5:04 p. m.; Katherine 5:29 p. m.): manda el código de 6 números al
// correo verificado de la sesión (paso 'pedir') y, con el código correcto, elimina la cuenta o devuelve los datos (paso 'confirmar').
// Ver api/_lib/codigo-correo.ts y docs/reputacion.md. Necesita LOCKUMI_CODIGO_PEPPER, RESEND_API_KEY y SUPABASE_* (sin eso, 503).
import { atenderCodigo } from './_lib/codigo-correo.js'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const r = await atenderCodigo(process.env, req.headers.get('authorization'), body, req.headers.get('origin'))
  return Response.json(r.cuerpo, { status: r.estado, headers: { 'cache-control': 'no-store' } })
}
