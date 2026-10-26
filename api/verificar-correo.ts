// POST /api/verificar-correo · paso 19 (Legal, 25/10/2026, 4:23 p. m.): la app manda el token que el kit de Cavos ya guarda
// (getAuthToken(); el login no cambia) con su sesión de Supabase. Ver api/_lib/cavos-token.ts y docs/reputacion.md.
// Necesita CAVOS_AUD_GOOGLE / CAVOS_AUD_APPLE / CAVOS_AUD_EMAIL y CAVOS_APP_ID en Vercel (sin eso responde 503 y nada se verifica: cierre por defecto). NO configurado todavía.
import { atenderVerificacion } from './_lib/cavos-token.js'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  // IP para el límite de intentos (Vercel pone x-forwarded-for; si no, x-real-ip). Solo se guarda su huella.
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')
  const r = await atenderVerificacion(process.env, req.headers.get('authorization'), body, fetch, Date.now(), ip, req.headers.get('origin'))
  return Response.json(r.cuerpo, { status: r.estado, headers: { 'cache-control': 'no-store' } })
}
