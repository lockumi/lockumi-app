// Llave de acceso (passkey) para pagar desde otro dispositivo, con @cavos/kit 0.4.2 y el vault de Cavos.
// Por qué: el registro de billeteras de Cavos es solo de alta (el primer dispositivo gana) y la recuperación social está
// apagada en el panel; en un dispositivo nuevo el kit queda en `needs-device-approval` y no puede firmar.
// Cómo (lo mismo que hace el CavosProvider oficial, `enrollPasskeyDefault` / `approveDeviceWithPasskey`, con vault):
//  · crear:   VaultClient.attach({ appId }).enrollPasskey({ userId, appSalt, userName, environment, authToken })
//             (en el dispositivo que ya tiene la llave de la cuenta; guarda la llave envuelta con el PRF de la passkey).
//  · aprobar: Cavos.connect(... passkeyPrf ...) → el vault conecta con recovery "passkey", pide la passkey y abre la llave.
//  · saber si ya hay una: el mismo connect devuelve `passkeyRestore` (lista de llaves guardadas en Cavos).
// Fuentes: README de @cavos/kit 0.4.2 («Passkeys»), dist/react (enrollPasskeyDefault, approveDeviceWithPasskey),
//          dist/vault (enrollPasskey, recovery "passkey"), https://docs.cavos.xyz (passkeys, multi-device).

export type RegistroLlave = { estado: 'creada' } | { estado: 'ahora-no'; veces: number; desde: number }
export const ESPERA_SEGUNDA_VEZ_MS = 3 * 24 * 60 * 60 * 1000 // «Ahora no» → se ofrece una sola vez más, 3 días después

export const TEXTOS_LLAVE = {
  titulo: 'Paga desde cualquier dispositivo',
  oferta: 'Crea una llave de acceso para usar tu cuenta en otro celular o computadora. Se abre con la huella, la cara o el PIN de este dispositivo.',
  crear: 'Crear llave de acceso',
  creando: 'Creando…',
  ahoraNo: 'Ahora no',
  creada: 'Listo: tu llave de acceso quedó guardada. Tu dispositivo la muestra con el nombre «Cavos».',
  aprobar: 'Aprobar con mi llave de acceso',
  aprobando: 'Aprobando…',
  aprobado: 'Listo: este dispositivo ya puede pagar. Vuelve a intentarlo.',
  sinLlave: 'Todavía no tienes una llave de acceso: abre Lockumi una vez en el dispositivo donde creaste tu cuenta, crea la llave ahí y luego vuelve a intentarlo aquí.',
  noAbrio: 'No se aprobó este dispositivo. Toca «Aprobar con mi llave de acceso» otra vez y elige la llave «Cavos».',
  noSoporta: 'Este navegador no permite usar llaves de acceso. Abre Lockumi en Chrome, Safari o Edge actualizados y vuelve a intentarlo.',
  cancelado: 'No se completó. Toca el botón otra vez cuando estés listo.',
  otroDispositivo: 'Crea la llave de acceso en el dispositivo donde creaste tu cuenta, y luego vuelve a intentarlo aquí.',
  sinSesion: 'Tu sesión se cerró. Sal y vuelve a entrar con la misma cuenta, y vuelve a intentarlo.',
  general: 'No pudimos completar la llave de acceso. Revisa tu conexión y vuelve a intentarlo.',
} as const

const clave = (email: string) => 'lockumi.llave.' + email.toLowerCase()
export function leerRegistro(email: string, s: Pick<Storage, 'getItem'> = localStorage): RegistroLlave | null {
  try { const r = JSON.parse(s.getItem(clave(email)) ?? 'null'); return r && (r.estado === 'creada' || r.estado === 'ahora-no') ? r : null } catch { return null }
}
export function guardarRegistro(email: string, r: RegistroLlave, s: Pick<Storage, 'setItem'> = localStorage) { try { s.setItem(clave(email), JSON.stringify(r)) } catch { /* sin almacenamiento */ } }
/** «Ahora no»: cuenta las veces para preguntar como mucho una vez más. */
export const posponer = (r: RegistroLlave | null, ahora: number): RegistroLlave => ({ estado: 'ahora-no', veces: (r?.estado === 'ahora-no' ? r.veces : 0) + 1, desde: ahora })

/** ¿Ofrecer crear la llave? Solo si este dispositivo ya puede firmar, la cuenta no tiene llave, no se creó aquí,
 *  y no se dijo «Ahora no» dos veces (la segunda vez se ofrece recién 3 días después de la primera). */
export function debeOfrecer(o: { registro: RegistroLlave | null; tieneLlave: boolean | null; estado: string; ahora: number }): boolean {
  if (o.estado === 'needs-device-approval' || o.tieneLlave !== false) return false
  const r = o.registro
  if (!r) return true
  if (r.estado === 'creada') return false
  return r.veces < 2 && o.ahora - r.desde >= ESPERA_SEGUNDA_VEZ_MS
}

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
