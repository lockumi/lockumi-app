// Cuenta nueva para quien perdió la llave de su billetera Cavos (testnet). Pasos:
//  1) Se crea una billetera Cavos NUEVA para la misma persona (otro «appSalt»: lockumi-2, lockumi-3…) en su navegador.
//  2) Se le agrega una clave de acceso (passkey) en el vault de Cavos. Es obligatoria: sin ella no se usa la cuenta nueva
//     (equivale a `secureStep: 'required'` del modal de @cavos/kit 0.4.2, que Lockumi no usa).
//  3) El servidor la asigna a la misma cuenta Lockumi (api/_lib/cuentaNueva.ts: historial, alquileres sin depósito y roles en
//     Trustless Work). La cuenta vieja queda en el historial; nunca se borra.
//  4) Se fondea (XLM + USDC de prueba; la trustline la firma la persona con la clave de acceso).
// Fuentes: README de @cavos/kit 0.4.2 («Passkeys», «secureStep»), VaultClient.enrollPasskey.
import { CAVOS_BILLETERA, APP_ID, authCavos, identidadCavos, modoReal } from './auth'
import { olvidarBilletera, abrirTrustlineUsdc, conectarBilletera, mensajeFirma } from './billetera'
import { pedirFondeo } from './fondeoTestnet'
import { supabase, tokenSesion, recargar } from '../servidor/repositorio'

export class ErrorCuentaNueva extends Error {}
const K_GEN = 'lockumi.cuenta.generacion'
/** Texto corto para la persona cuando la billetera no puede firmar. */
export const OFRECER_CUENTA_NUEVA = 'Si no puedes entrar a tu cuenta anterior, crea una cuenta nueva. Tus alquileres sin depósito pasan a ella.'
export const PASSKEY_OBLIGATORIA = 'No pudimos crear la clave de acceso de tu dispositivo. Tu cuenta nueva no se activó. Vuelve a intentarlo.'

/** «lockumi» para la cuenta de siempre (número 1); «lockumi-2», «lockumi-3»… para las nuevas. */
export const saltDe = (gen: number) => gen <= 1 ? CAVOS_BILLETERA.appSalt : `${CAVOS_BILLETERA.appSalt}-${gen}`
export const generacionLocal = () => { const n = Number(localStorage.getItem(K_GEN)); return Number.isInteger(n) && n >= 1 ? n : 1 }
/** Número de cuenta de la persona: el de la base (lk_mi_generacion) si hay sesión; si no, el guardado en este navegador. */
export async function generacionActual(): Promise<number> {
  try {
    const { data, error } = await (await supabase()).rpc('lk_mi_generacion')
    if (!error && Number.isInteger(data) && data >= 1) { localStorage.setItem(K_GEN, String(data)); return data as number }
  } catch { /* sin sesión: se usa el valor guardado */ }
  return generacionLocal()
}

export async function crearCuentaNueva(avance: (t: string) => void = () => {}): Promise<string> {
  if (!modoReal) throw new ErrorCuentaNueva('Esta opción solo está en la app con acceso real.')
  const auth = await authCavos(), identidad = await identidadCavos()
  if (!auth || !identidad) throw new ErrorCuentaNueva('Sal y vuelve a entrar con tu cuenta, y toca el botón otra vez.')
  const gen = (await generacionActual()) + 1, appSalt = saltDe(gen)
  avance('Creando tu cuenta nueva…')
  const { VaultClient } = await import('@cavos/kit')
  olvidarBilletera()
  const g = (await conectarBilletera(appSalt)).direccion   // única puerta a Cavos.connect (billetera.ts), con el appSalt nuevo
  avance('Protegiéndola con la clave de acceso de tu dispositivo…')
  try {
    await VaultClient.attach({ appId: APP_ID }).enrollPasskey({ userId: identidad.userId, userName: identidad.email ?? identidad.userId, appSalt, environment: CAVOS_BILLETERA.environment, authToken: auth.getAuthToken() })
  } catch { olvidarBilletera(); throw new ErrorCuentaNueva(PASSKEY_OBLIGATORIA) }
  avance('Pasando tus alquileres a la cuenta nueva…')
  const r = await fetch('/api/tw', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await tokenSesion() }, body: JSON.stringify({ accion: 'cuenta-nueva', cuenta: g }) })
  if (!r.ok) { olvidarBilletera(); throw new ErrorCuentaNueva('No pudimos pasar tu cuenta nueva. Intenta de nuevo en un momento.') }
  localStorage.setItem(K_GEN, String(gen))           // desde aquí la app abre siempre la cuenta nueva
  avance('Cargando tu cuenta de prueba…')
  await pedirFondeo(g)                               // XLM (Friendbot)
  try { await abrirTrustlineUsdc() } catch (e) { throw new ErrorCuentaNueva(mensajeFirma(e)) }   // la firma la persona
  await pedirFondeo(g)                               // USDC de prueba (una sola vez)
  await recargar().catch(() => {})
  return g
}
