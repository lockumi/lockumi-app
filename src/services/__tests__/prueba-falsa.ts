// Pruebas de billetera para los tests (opción A): firma ed25519 como Cavos signMessage («Cavos Signed Message:\n<largo>\n…»)
// con una llave de prueba al azar. Nunca una llave real.
import { Keypair } from '@stellar/stellar-sdk'
import { mensajePrueba, type AccionPrueba, type Prueba } from '../../../api/_lib/prueba-mensaje'

const bytes = (s: string) => new TextEncoder().encode(s)
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
let n = 0
export const nonceNuevo = () => (Date.now().toString(16) + (++n).toString(16) + Math.random().toString(16).slice(2)).replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32)
export function pruebaDe(kp: Keypair, accion: AccionPrueba, contrato: string, o: { ts?: number; nonce?: string; direccion?: string; prefijo?: boolean } = {}): Prueba {
  const direccion = o.direccion ?? kp.publicKey(), nonce = o.nonce ?? nonceNuevo(), ts = o.ts ?? Math.floor(Date.now() / 1000)
  const m = bytes(mensajePrueba(accion, contrato, direccion, nonce, ts))
  const firmado = o.prefijo === false ? m : new Uint8Array([...bytes('Cavos Signed Message:\n' + m.length + '\n'), ...m])
  return { direccion, clave: kp.publicKey(), firma: b64(new Uint8Array(kp.sign(firmado as never))), nonce, ts }
}
/** El pedido con la prueba de quien lo hace. */
export const firmado = <P extends { accion: string; contrato: string }>(p: P, kp: Keypair) => ({ ...p, prueba: pruebaDe(kp, p.accion as AccionPrueba, p.contrato) })
