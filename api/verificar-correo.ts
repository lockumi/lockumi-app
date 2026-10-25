// POST /api/verificar-correo · paso 19 (Legal, 25/10/2026, 4:23 p. m.): la app manda el token que el kit de Cavos ya guarda
// (getAuthToken(); el login no cambia) con su sesión de Supabase. Ver api/_lib/cavos-token.ts y docs/reputacion.md.
// Necesita CAVOS_AUDIENCIAS en Vercel (sin eso responde 503 y nada se verifica: cierre por defecto). NO configurado todavía.
import { atenderVerificacion } from './_lib/cavos-token.js'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const r = await atenderVerificacion(process.env, req.headers.get('authorization'), body)
  return Response.json(r.cuerpo, { status: r.estado, headers: { 'cache-control': 'no-store' } })
}
