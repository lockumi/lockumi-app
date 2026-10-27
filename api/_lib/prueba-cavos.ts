// Verifica en el servidor la prueba de billetera (api/_lib/prueba-mensaje.ts), como requireAddressProof de Meteorito
// (api/_lib/auth.ts): firma ed25519 con el prefijo de Cavos («Cavos Signed Message:\n<largo>\n»), hecha por la dirección Cavos
// del participante (o por una llave firmante de esa cuenta en Horizon testnet), para esta acción y este alquiler, de hace
// 5 minutos o menos. El nonce se gasta una sola vez en la base (tw.ts, lk_pruebas_cavos). Nunca se guarda la firma.
import { Keypair } from '@stellar/stellar-sdk'
import { mensajePrueba, type AccionPrueba, type Prueba } from './prueba-mensaje.js'
import { HORIZON_TESTNET } from './red.js'

export const VIGENCIA_PRUEBA_S = 300
const G = /^G[A-Z2-7]{55}$/, NONCE = /^[0-9a-f]{32}$/
const bytes = (s: string) => new TextEncoder().encode(s)
function conPrefijo(m: string) {
  const b = bytes(m); return new Uint8Array([...bytes('Cavos Signed Message:\n'), ...bytes(String(b.length)), ...bytes('\n'), ...b])
}
const deBase64 = (s: string) => { try { return Uint8Array.from(atob(s), c => c.charCodeAt(0)) } catch { return null } }

/** null si la prueba vale; si no, el motivo (solo para el log del servidor). */
export async function revisarPrueba(p: Partial<Prueba> | undefined, accion: AccionPrueba, contrato: string, direccion: string,
  f: typeof fetch = fetch, ahora = Date.now()): Promise<string | null> {
  if (!p || typeof p !== 'object') return 'sin prueba'
  const { direccion: d, clave, firma, nonce, ts } = p
  if (typeof d !== 'string' || typeof clave !== 'string' || typeof firma !== 'string' || typeof nonce !== 'string' || typeof ts !== 'number') return 'prueba incompleta'
  if (!G.test(d) || !G.test(clave) || !NONCE.test(nonce)) return 'prueba mal formada'
  if (d !== direccion) return 'la prueba es de otra cuenta'
  if (!Number.isFinite(ts) || Math.abs(ahora / 1000 - ts) > VIGENCIA_PRUEBA_S) return 'prueba vencida'
  const sig = deBase64(firma); if (!sig || sig.length !== 64) return 'firma mal formada'
  const m = mensajePrueba(accion, contrato, d, nonce, ts)
  let ok = false
  try { const k = Keypair.fromPublicKey(clave); ok = k.verify(conPrefijo(m) as never, sig as never) || k.verify(bytes(m) as never, sig as never) } catch { ok = false }
  if (!ok) return 'firma inválida'
  if (clave === d) return null
  // La llave que firmó no es la dirección: tiene que ser firmante de esa cuenta con peso suficiente (Horizon testnet).
  const r = await f(`${HORIZON_TESTNET}/accounts/${d}`).catch(() => null)
  if (!r?.ok) return 'no se pudo leer la cuenta'
  const a = await r.json().catch(() => ({})) as { signers?: { key: string; weight: number }[]; thresholds?: { med_threshold?: number } }
  const s = a.signers?.find(x => x.key === clave)
  return s && s.weight > 0 && s.weight >= (a.thresholds?.med_threshold ?? 0) ? null : 'la llave no firma por esa cuenta'
}
