// Llave de acceso (passkey) de la cuenta: obligatoria al crearla (secureStep 'required', como meteorito-mvp/lib/config.ts) para
// que la MISMA cuenta firme desde cualquier dispositivo. Módulo reutilizable: cualquier flujo que cree o abra cuentas nuevas
// (entrar, fondeo de testnet…) usa `asegurarLlave` (crear) y `recuperarConLlave` (dispositivo nuevo) y muestra el `mensaje`.
// Cómo, con @cavos/kit 0.4.2 y el vault de Cavos (lo mismo que hace el CavosProvider con `enrollPasskeyDefault` y
// `approveDeviceWithPasskey`; Lockumi no usa el modal, así que el «paso obligatorio» lo hace la puerta de Firmante.tsx):
//  · crear:    VaultClient.attach({ appId }).enrollPasskey(...) en el dispositivo que ya puede firmar (guarda la llave envuelta
//              con el PRF de la passkey; Cavos no puede abrirla).
//  · recuperar: Cavos.connect(... passkeyPrf ...) → el vault pide la passkey y abre la llave en el dispositivo nuevo.
//  · saber si ya hay una: el mismo connect devuelve `passkeyRestore`.
// Fuentes: README de @cavos/kit 0.4.2 («Hardware-isolated social recovery», «Passkeys»), dist/react, dist/vault,
//          https://docs.cavos.xyz (passkeys, multi-device). Origen: PR #53 (solo la parte de passkey).
import { ErrorBilletera, conectarBilletera, olvidarBilletera, probarFirma } from './billetera'
import { APP_ID, CAVOS_BILLETERA, authCavos, modoReal } from './auth'
import { limpiarDetalle, type EstadoFirmante } from './firmante'

/** Equivale a `secureStep` del modal de Cavos: la cuenta no se usa sin llave de acceso. */
export const SECURE_STEP = 'required' as const

export const TEXTOS_LLAVE = {
  crearTitulo: 'Crea tu llave de acceso',
  crear: 'Es un solo paso. Con ella entras a tu cuenta desde cualquier dispositivo.',
  crearBoton: 'Crear llave de acceso',
  creando: 'Creando…',
  auto: 'Confirma con Face ID o tu huella para proteger tu cuenta',
  reintentar: 'Intentar de nuevo',
  entrarBoton: 'Entrar con mi llave de acceso',
  entrando: 'Entrando…',
  conLlave: 'Usa tu llave de acceso para entrar desde este dispositivo.',
  sinLlave: 'Aún no hay llave de acceso. Entra desde tu primer dispositivo y créala ahí.',
  noAbrio: 'No pudimos usar tu llave. Toca el botón otra vez y elige la llave «Cavos».',
  noSoporta: 'Este navegador no permite llaves de acceso. Usa Chrome, Safari o Edge actualizados.',
  cancelado: 'No se completó. Toca el botón otra vez y elige tu huella, cara o PIN.',
  otroDispositivo: 'Crea la llave en el dispositivo donde abriste tu cuenta primero.',
  sinSesion: 'Tu sesión se cerró. Sal, vuelve a entrar y prueba de nuevo.',
  general: 'No pudimos completar la llave. Revisa tu conexión y vuelve a intentarlo.',
} as const

// Solo se recuerda «esta cuenta ya tiene llave» (por correo), para no preguntarle a Cavos en cada entrada. Nunca la llave.
const clave = (email: string) => 'lockumi.llave.' + email.toLowerCase()
export function llaveRegistrada(email: string, s: Pick<Storage, 'getItem'> = localStorage): boolean {
  try { return s.getItem(clave(email)) === 'creada' } catch { return false }
}
export function registrarLlave(email: string, s: Pick<Storage, 'setItem'> = localStorage) { try { s.setItem(clave(email), 'creada') } catch { /* sin almacenamiento */ } }

/** ¿El navegador puede usar llaves de acceso con PRF? false solo si sabemos que no (sin WebAuthn o PRF negado). */
export async function navegadorPermite(w: { PublicKeyCredential?: unknown; isSecureContext?: boolean } = globalThis as never): Promise<boolean> {
  const P = w.PublicKeyCredential as { getClientCapabilities?: () => Promise<Record<string, boolean>> } | undefined
  if (!P || w.isSecureContext === false) return false
  try { const c = await P.getClientCapabilities?.(); if (c && c['extension:prf'] === false) return false } catch { /* sin datos: se intenta */ }
  return true
}

export type CodigoLlave = 'no-soporta' | 'cancelado' | 'otro-dispositivo' | 'sin-llave' | 'sin-sesion' | 'general'
export function codigoErrorLlave(e: unknown): CodigoLlave {
  const m = e instanceof Error ? e.name + ' ' + e.message : String(e)
  if (/PRF is unsupported|did not return a PRF|WebAuthn is only available|NotSupportedError|not supported|IP address as the domain/i.test(m)) return 'no-soporta'
  if (/cancel|NotAllowedError|AbortError|timed out or was not allowed/i.test(m)) return 'cancelado'
  if (/does not hold the wallet key|connect a wallet before adding a passkey/i.test(m)) return 'otro-dispositivo'
  if (/no local key and no recovery wrap|does not hold this wallet's key/i.test(m)) return 'sin-llave'
  if (/no login token|sin-token|sin-identidad|401|403/i.test(m)) return 'sin-sesion'
  return 'general'
}
const TEXTO_CODIGO: Record<CodigoLlave, string> = {
  'no-soporta': TEXTOS_LLAVE.noSoporta, cancelado: TEXTOS_LLAVE.cancelado, 'otro-dispositivo': TEXTOS_LLAVE.otroDispositivo,
  'sin-llave': TEXTOS_LLAVE.sinLlave, 'sin-sesion': TEXTOS_LLAVE.sinSesion, general: TEXTOS_LLAVE.general,
}
/** Cada error dice cómo arreglarlo. */
export const mensajeLlave = (e: unknown) => TEXTO_CODIGO[codigoErrorLlave(e)]

export type ResultadoAprobar = 'aprobado' | 'sin-llave' | 'no-abrio'
/** Qué pasó después de conectar con la llave: listo, la cuenta no tiene llave, o la tiene y no se abrió (cancelada u otra). */
export function resultadoAprobar(c: { estado: string; llave?: boolean }): ResultadoAprobar {
  if (c.estado !== 'needs-device-approval') return 'aprobado'
  return c.llave ? 'no-abrio' : 'sin-llave'
}

/** Crea la llave de acceso (passkey) de la cuenta, en el vault de Cavos. Este dispositivo tiene que poder firmar. */
export async function crearLlave(): Promise<void> {
  const auth = await authCavos(); const id = auth?.restoreIdentity()
  if (!auth || !id) throw new ErrorBilletera('sin-identidad', 'No hay identidad de Cavos guardada en este navegador.')
  await conectarBilletera() // el vault tiene que tener la cuenta conectada antes de agregar la passkey
  const { VaultClient } = await import('@cavos/kit')
  await VaultClient.attach({ appId: APP_ID }).enrollPasskey({ userId: id.userId, userName: id.email ?? id.userId, appSalt: CAVOS_BILLETERA.appSalt,
    environment: CAVOS_BILLETERA.environment, authToken: auth.getAuthToken() })
}
/** Aprueba este dispositivo con la llave de acceso. Devuelve la billetera ya conectada (estado y `llave`). */
export async function aprobarConLlave() {
  olvidarBilletera()
  return conectarBilletera({ llave: true })
}

export type ResultadoLlave = { ok: true } | { ok: false; mensaje: string }
/** Paso obligatorio al crear la cuenta (y al entrar con una que no la tiene): crea la llave si falta. Tiene que llamarse desde
 *  un toque de la persona (el navegador lo exige). Nunca lanza: `mensaje` ya dice cómo resolverlo. */
export async function asegurarLlave(email: string): Promise<ResultadoLlave> {
  try {
    if (!await navegadorPermite()) return { ok: false, mensaje: TEXTOS_LLAVE.noSoporta }
    await crearLlave(); registrarLlave(email); return { ok: true }
  } catch (e) { return { ok: false, mensaje: mensajeLlave(e) } }
}
/** Dispositivo nuevo sin la llave de la cuenta: la recupera con la llave de acceso. Desde un toque de la persona. Nunca lanza. */
export async function recuperarConLlave(email: string): Promise<ResultadoLlave> {
  try {
    if (!await navegadorPermite()) return { ok: false, mensaje: TEXTOS_LLAVE.noSoporta }
    const r = resultadoAprobar(await aprobarConLlave())
    if (r === 'aprobado') { registrarLlave(email); return { ok: true } }
    olvidarBilletera(); return { ok: false, mensaje: r === 'sin-llave' ? TEXTOS_LLAVE.sinLlave : TEXTOS_LLAVE.noAbrio }
  } catch (e) { olvidarBilletera(); return { ok: false, mensaje: mensajeLlave(e) } }
}

/** Puerta al entrar: firma de prueba (probarFirma) y, si el dispositivo puede firmar, que la cuenta tenga llave de acceso.
 *  Una sola conexión (la de probarFirma, ya con `passkeyPrf` como en Meteorito): `llave` (= `passkeyRestore`) dice si la cuenta tiene
 *  llave. Sin llave → 'sin-llave': la puerta la crea sola (LlaveAutomatica → asegurarLlave → el vault pide Face ID o huella).
 *  Se quitó `consultarLlave`, la segunda conexión automática que dejaba «No pudimos abrir tu cuenta. Revisa tu conexión». */
export async function probarCuenta(email: string): Promise<EstadoFirmante> {
  limpiarDetalle()
  const e = await probarFirma()
  const local = import.meta.env.DEV && !!localStorage.getItem('lockumi.billetera.prueba') // gancho de prueba local, nunca en el build
  if (e !== 'puede' || !modoReal || local) return e // sin Cavos (demo) no hay llave
  const b = await conectarBilletera()   // la misma conexión (en caché): no abre otra
  if (b.llave === true) { registrarLlave(email); return 'puede' }
  if (llaveRegistrada(email)) return 'puede'   // la acaba de crear este dispositivo (la conexión en caché aún no lo sabe)
  return 'sin-llave'
}
