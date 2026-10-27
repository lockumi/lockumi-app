// Qué sabe este navegador de la llave de acceso (passkey) de cada cuenta, y si hace falta (obligatoria / oferta / nada).
// Sin imports: lo usan billetera.ts (marca las cuentas nuevas) y llave.ts. Solo guarda estado por correo, nunca la llave.
//
// «Cuenta nueva» = Cavos creó la billetera en ESA conexión (el kit/vault lo informa con `isNewAccount`: el registro de Cavos no tenía
// billetera de esa persona). «Ya existía» = cualquier otra: la billetera ya estaba registrada en Cavos, con o sin la llave en este
// dispositivo. No depende de fechas ni de nada de Lockumi (sin base de datos). La cuenta nueva se anota aquí al crearse
// ('nueva') para que cerrar la pestaña o recargar no salte el paso; queda 'creada' cuando se crea la llave.
export type RegistroLlave = { estado: 'creada' } | { estado: 'nueva' } | { estado: 'ahora-no'; veces: number; desde: number }
export const ESPERA_SEGUNDA_VEZ_MS = 3 * 24 * 60 * 60 * 1000 // «Ahora no» → se ofrece una sola vez más, 3 días después

const clave = (email: string) => 'lockumi.llave.' + email.toLowerCase()
export function leerRegistro(email: string, s: Pick<Storage, 'getItem'> = localStorage): RegistroLlave | null {
  try {
    const raw = s.getItem(clave(email)); if (raw === 'creada') return { estado: 'creada' } // formato anterior (texto suelto)
    const r = JSON.parse(raw ?? 'null'); return r && (r.estado === 'creada' || r.estado === 'nueva' || r.estado === 'ahora-no') ? r : null
  } catch { return null }
}
export function guardarRegistro(email: string, r: RegistroLlave, s: Pick<Storage, 'setItem'> = localStorage) { try { s.setItem(clave(email), JSON.stringify(r)) } catch { /* sin almacenamiento */ } }
/** Cavos acaba de crear la billetera de esta cuenta: la llave es obligatoria. No pisa un registro que ya exista. */
export function marcarNueva(email: string, s: Pick<Storage, 'getItem' | 'setItem'> = localStorage) { if (!leerRegistro(email, s)) guardarRegistro(email, { estado: 'nueva' }, s) }
export const llaveRegistrada = (email: string, s: Pick<Storage, 'getItem'> = localStorage) => leerRegistro(email, s)?.estado === 'creada'
export const registrarLlave = (email: string, s: Pick<Storage, 'setItem'> = localStorage) => guardarRegistro(email, { estado: 'creada' }, s)
/** «Ahora no»: cuenta las veces para preguntar como mucho una vez más. */
export const posponer = (r: RegistroLlave | null, ahora: number): RegistroLlave => ({ estado: 'ahora-no', veces: (r?.estado === 'ahora-no' ? r.veces : 0) + 1, desde: ahora })

export type DecisionLlave = 'tiene' | 'obligatoria' | 'oferta' | 'seguir' | 'error'
/** Con la billetera ya conectada y este dispositivo firmando:
 *  · ya tiene llave → 'tiene'; · cuenta NUEVA sin llave → 'obligatoria' (si no se pudo saber: 'error', no se entra sin llave);
 *  · cuenta que ya existía sin llave → 'oferta' (nunca se obliga): la primera vez, y una sola vez más 3 días después de un «Ahora no»;
 *    si no se pudo saber, 'seguir'. */
export function decidirLlave(o: { registro: RegistroLlave | null; tieneLlave: boolean | null; ahora: number }): DecisionLlave {
  const r = o.registro
  if (r?.estado === 'creada' || o.tieneLlave === true) return 'tiene'
  if (r?.estado === 'nueva') return o.tieneLlave === false ? 'obligatoria' : 'error'
  if (o.tieneLlave !== false) return 'seguir'
  if (!r) return 'oferta'
  return r.veces < 2 && o.ahora - r.desde >= ESPERA_SEGUNDA_VEZ_MS ? 'oferta' : 'seguir'
}
