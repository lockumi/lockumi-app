// Fondeo automático de la billetera Cavos en testnet (XLM + USDC de prueba). El trabajo lo hace el servidor (api/_lib/fondeo.ts,
// acción «fondear-cuenta» de /api/tw, apagada sin LOCKUMI_FONDEO_TESTNET=1); aquí solo se pide y se interpreta la respuesta.
// Nunca bloquea el login: cualquier falla se ignora y se reintenta al pagar (solo.ts → prepararCuentaCavos).
// La trustline de USDC la firma la persona con su billetera (Cavos): el servidor no tiene su llave.
import { supabase } from '../servidor/repositorio'

/** Token de la sesión que YA existe (no crea una sesión anónima nueva como tokenSesion). */
async function tokenExistente(): Promise<string> {
  const { data } = await (await supabase()).auth.getSession()
  if (!data.session) throw new Error('sin sesión'); return data.session.access_token
}

export type EstadoFondeo = 'apagado' | 'listo' | 'ya-fondeada' | 'falta-trustline' | 'pendiente' | 'tesoreria-sin-saldo'
/** Texto corto cuando el faucet falló y la persona tiene que reintentar (texto para personas, sin palabras técnicas). */
export const MENSAJE_FONDEO_PENDIENTE = 'Todavía no pudimos cargar tu cuenta de prueba. Espera un minuto y vuelve a tocar el botón.'

/** Pide el fondeo de `g`. Devuelve el estado del servidor, o 'pendiente' si no se pudo pedir (sin sesión, sin red, etc.). */
export async function pedirFondeo(g: string, f: typeof fetch = fetch, token: () => Promise<string> = tokenExistente): Promise<EstadoFondeo> {
  try {
    const r = await f('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await token() }, body: JSON.stringify({ accion: 'fondear-cuenta', cuenta: g }) })
    if (!r.ok) return 'pendiente'
    const j = await r.json().catch(() => ({})) as { estado?: EstadoFondeo }
    return j.estado ?? 'pendiente'
  } catch { return 'pendiente' }
}

/** Una vez por pestaña y cuenta: al conectar la billetera, en segundo plano. No lanza nunca. */
const pedidas = new Set<string>()
export function fondearEnSegundoPlano(g: string, f?: typeof fetch) {
  if (pedidas.has(g)) return
  pedidas.add(g)
  void pedirFondeo(g, f).then(e => { if (e === 'pendiente') pedidas.delete(g) })   // si falló, se puede volver a intentar
}
export const _reiniciarFondeo = () => pedidas.clear()
