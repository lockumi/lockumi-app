// Firmante: ¿este dispositivo puede firmar con la billetera de la cuenta? (docs-borrador/investigacion-cavos-firmante.md)
// Al entrar se prueba con signMessage('lockumi-login') (gratis, aunque la cuenta no esté desplegada). Solo se recuerda
// «puede» o «no puede» por correo: nunca la firma ni ningún token. No existe renovación silenciosa de la sesión de Cavos:
// si se pierde (pestaña nueva, vencida), se pide volver a entrar con un clic.
export type EstadoFirmante = 'puede' | 'no-firmante' | 'sin-sesion' | 'error'
export const MENSAJE_PRUEBA = 'lockumi-login'

const clave = (email: string) => 'lockumi.firmante.' + email.toLowerCase()
/** Solo 'si' o 'no': nada más. */
export function recordarFirmante(email: string, puede: boolean, s: Pick<Storage, 'setItem'> = localStorage) { try { s.setItem(clave(email), puede ? 'si' : 'no') } catch { /* sin almacenamiento */ } }
export function leerFirmante(email: string, s: Pick<Storage, 'getItem'> = localStorage): 'si' | 'no' | null {
  try { const v = s.getItem(clave(email)); return v === 'si' || v === 'no' ? v : null } catch { return null }
}

export const esNoFirmanteKit = (m: string) => /not an authorized signer|needs-device-approval|restore by connecting with the enclave|protected by recovery|complete a fresh social login|no local key and no recovery wrap|does not hold this wallet's key/i.test(m)
/** Sesión de Cavos perdida o vencida: sin token en esta pestaña, sin identidad, o el registro rechaza el token (401/403). */
export const esSinSesion = (m: string) => /no login token|sin-token|sin-identidad|no tiene token|registry .*failed: 40[13]/i.test(m)
export function clasificarFirma(e: unknown): EstadoFirmante {
  const m = (e as { codigo?: string })?.codigo + ' ' + (e instanceof Error ? e.message : String(e))
  if (esSinSesion(m)) return 'sin-sesion'
  if (esNoFirmanteKit(m)) return 'no-firmante'
  return 'error'
}

/** Textos de la pantalla que aparece al entrar cuando este dispositivo no puede firmar (y del pedido de volver a entrar). */
export const TEXTOS_FIRMANTE = {
  titulo: 'Este dispositivo todavía no puede usar tu cuenta',
  conLlave: 'Apruébalo con tu llave de acceso para entrar.',
  sinLlave: 'Abre Lockumi una vez en el dispositivo donde creaste tu cuenta.',
  otraCuenta: 'Usar otra cuenta',
  errorTitulo: 'No pudimos abrir tu cuenta',
  error: 'Revisa tu conexión y vuelve a intentarlo.',
  reintentar: 'Volver a intentar',
  sesionTitulo: 'Vuelve a entrar para seguir',
  sesion: 'Tu sesión se cerró en esta pestaña. Entra otra vez y vuelves a este paso.',
  entrar: 'Entrar de nuevo',
  entrando: 'Abriendo…',
} as const
/** Error en pantalla cuando la sesión se perdió a mitad del pago. */
export const SIN_SESION = 'Tu sesión se cerró en esta pestaña. Toca «Entrar de nuevo» y vuelves a este paso.'
export const esTextoSinSesion = (t: string | null | undefined) => !!t && t.includes(SIN_SESION)

/** Qué muestra la pantalla de «no puede firmar»: el botón de la llave si el navegador la permite; si no, ir al dispositivo de origen. */
export const varianteNoFirmante = (permiteLlave: boolean): 'llave' | 'origen' => permiteLlave ? 'llave' : 'origen'
