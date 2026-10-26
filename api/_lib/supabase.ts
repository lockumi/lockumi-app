// Llamadas del servidor a Supabase con la clave de servicio (nunca sale del servidor ni se registra en los logs).
export interface ServicioSupabase { url: string; llave: string }
/** Devuelve la conexión de servicio si están SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY. */
export function servicio(env: Record<string, string | undefined>): ServicioSupabase | null {
  const url = (env.SUPABASE_URL ?? env.VITE_SUPABASE_URL)?.trim().replace(/\/+$/, ''), llave = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && llave && /^https:\/\//.test(url) ? { url, llave } : null
}
const cabeceras = (s: ServicioSupabase) => ({ apikey: s.llave, authorization: `Bearer ${s.llave}`, 'content-type': 'application/json' })
export async function rpc<T>(s: ServicioSupabase, nombre: string, args: Record<string, unknown>, f: typeof fetch = fetch): Promise<T> {
  const r = await f(`${s.url}/rest/v1/rpc/${nombre}`, { method: 'POST', headers: cabeceras(s), body: JSON.stringify(args) })
  if (!r.ok) throw new Error(`Supabase respondió ${r.status} en ${nombre}`)
  const t = await r.text()   // una función «returns void» responde 204 sin cuerpo
  return (t ? JSON.parse(t) : null) as T
}
/** Borra objetos del bucket (Storage API). El bucket lk-fotos no tiene política de borrado: solo la clave de servicio puede. */
export async function borrarObjetos(s: ServicioSupabase, bucket: string, rutas: string[], f: typeof fetch = fetch) {
  const r = await f(`${s.url}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: cabeceras(s), body: JSON.stringify({ prefixes: rutas }) })
  return r.ok
}

// Correo real para avisos con Apple (migración 20261026080000).
export const ES_RELAY = /@privaterelay\.appleid\.com$/i
/** A dónde mandar un aviso o un código: si es un correo oculto de Apple con correo real guardado (lk_correo_aviso), el real. */
export async function correoAviso(s: ServicioSupabase | null, correo: string, f: typeof fetch = fetch): Promise<string> {
  if (!s || !ES_RELAY.test(correo)) return correo
  try { const r = await rpc<string | null>(s, 'lk_correo_aviso', { p_correo: correo }, f); return typeof r === 'string' && r ? r : correo } catch { return correo }
}
