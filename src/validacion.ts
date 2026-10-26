// Validación del formulario de nuevo alquiler (pura, sin DOM, con pruebas en __tests__/validacion.test.ts).
// Reglas elegidas:
//  - Entrada: desde hoy (fecha local del usuario, no UTC) hasta 1 año adelante. Nunca en el pasado: el alquiler
//    se registra cuando se paga el depósito.
//  - Salida: posterior a la entrada; duración mínima 1 mes (el mismo día del mes siguiente) y máxima 5 años.
//  - Depósito: mayor que 0, hasta 2 decimales y como máximo USD 50 000 (holgado para un alquiler residencial,
//    evita errores de tipeo como un cero de más).
export const MAX_ANTICIPO_DIAS = 365
export const MIN_MESES = 1
export const MAX_ANIOS = 5
export const MONTO_MAX = 50_000

export type Campo = 'direccion' | 'monto' | 'inicio' | 'fin' | 'email'
export type Errores = Partial<Record<Campo, string>>
export interface DatosAlquiler { direccion: string; monto: string; inicio: string; fin: string; email: string }

/** "aaaa-mm-dd" válido de calendario (no acepta 31/02 ni 29/02 en años no bisiestos). */
export function fechaValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); if (!m) return false
  const [a, me, d] = [+m[1], +m[2], +m[3]]; if (a < 1900 || a > 2200 || me < 1 || me > 12 || d < 1) return false
  return d <= new Date(Date.UTC(a, me, 0)).getUTCDate()
}
const aUTC = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const DIA = 86_400_000
/** Suma meses respetando fin de mes (31/01 + 1 mes = 28 o 29/02). */
export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1 + meses, 1)); const ult = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  base.setUTCDate(Math.min(d, ult)); return base.toISOString().slice(0, 10)
}
/** Fecha de hoy en la zona local del usuario (no UTC) en "aaaa-mm-dd". */
export const hoyISO = (ahora = new Date()) => new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

export function validarFechas(inicio: string, fin: string, hoy: string): Pick<Errores, 'inicio' | 'fin'> {
  const e: Pick<Errores, 'inicio' | 'fin'> = {}
  if (!inicio) e.inicio = 'Elige la fecha de entrada.'
  else if (!fechaValida(inicio)) e.inicio = 'Esa fecha no existe. Revisa el día y el mes.'
  else if (inicio < hoy) e.inicio = 'La fecha de entrada no puede ser anterior a hoy. Elige hoy o una fecha futura.'
  else if (aUTC(inicio) > aUTC(hoy) + MAX_ANTICIPO_DIAS * DIA) e.inicio = 'La entrada debe ser dentro del próximo año.'
  if (!fin) e.fin = 'Elige la fecha de salida.'
  else if (!fechaValida(fin)) e.fin = 'Esa fecha no existe. Revisa el día y el mes.'
  else if (!e.inicio && inicio) {
    if (fin <= inicio) e.fin = 'La salida tiene que ser después de la entrada.'
    else if (fin < sumarMeses(inicio, MIN_MESES)) e.fin = `El alquiler debe durar al menos 1 mes (salida desde el ${fmt(sumarMeses(inicio, MIN_MESES))}).`
    else if (fin > sumarMeses(inicio, MAX_ANIOS * 12)) e.fin = `El alquiler puede durar hasta ${MAX_ANIOS} años (salida hasta el ${fmt(sumarMeses(inicio, MAX_ANIOS * 12))}).`
  }
  return e
}
const fmt = (iso: string) => iso.split('-').reverse().join('/')
/** "aaaa-mm-dd" → "dd/mm/aa" (como se muestra en Nuevo alquiler). */
export const ddmmaa = (iso: string) => { const [a, m, d] = iso.split('-'); return iso ? `${d}/${m}/${a.slice(2)}` : '' }
const sumarDias = (iso: string, n: number) => new Date(aUTC(iso) + n * DIA).toISOString().slice(0, 10)
/** Días que se pueden elegir en el calendario de entrada: desde hoy hasta MAX_ANTICIPO_DIAS después (igual que validarFechas). */
export const limitesEntrada = (hoy: string) => ({ min: hoy, max: sumarDias(hoy, MAX_ANTICIPO_DIAS) })
/** Días que se pueden elegir en el calendario de salida: de 1 mes a 5 años después de la entrada (con sumarMeses). */
export const limitesSalida = (inicio: string) => ({ min: sumarMeses(inicio, MIN_MESES), max: sumarMeses(inicio, MAX_ANIOS * 12) })
/** Al cambiar la entrada: la salida se conserva si sigue dentro de sus límites; si no, se borra (''). */
export function salidaTrasCambiarEntrada(inicio: string, fin: string): string {
  if (!fin || !inicio) return fin
  const { min, max } = limitesSalida(inicio)
  return fin >= min && fin <= max ? fin : ''
}

/** `prueba`: alquiler con otra persona (C), en USDC de prueba. */
export function validarMonto(s: string, prueba = false): string | undefined {
  const t = s.trim().replace(',', '.')
  if (!t) return 'Escribe el monto del depósito.'
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return 'Usa solo números, con hasta 2 decimales (ej.: 800 o 800.50).'
  const n = Number(t)
  if (n <= 0) return 'El depósito tiene que ser mayor que cero.'
  if (n > MONTO_MAX) return prueba ? `El depósito puede ser de hasta ${MONTO_MAX.toLocaleString('es-CR')} USDC de prueba. Revisa si sobra un cero.` : `El depósito puede ser de hasta USD ${MONTO_MAX.toLocaleString('es-CR')}. Revisa si sobra un cero.`
}

export function validarAlquiler(d: DatosAlquiler, hoy: string, correoDueno = '', prueba = false): Errores {
  const e: Errores = { ...validarFechas(d.inicio, d.fin, hoy) }
  const dir = d.direccion.trim()
  if (!dir) e.direccion = 'Escribe la dirección o un nombre para el lugar.'
  else if (dir.length < 4) e.direccion = 'Escribe un poco más (al menos 4 letras).'
  else if (dir.length > 120) e.direccion = 'Es muy largo. Usa hasta 120 caracteres.'
  const m = validarMonto(d.monto, prueba); if (m) e.monto = m
  const correo = d.email.trim().toLowerCase()
  if (!correo) e.email = 'Escribe el correo de la persona que va a alquilar.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) e.email = 'Ese correo no parece válido. Revisa que tenga @ y un punto.'
  else if (correoDueno && correo === correoDueno.toLowerCase()) e.email = 'Ese es tu correo. Escribe el de la otra persona.'
  return e
}
export const montoNumero = (s: string) => Number(s.trim().replace(',', '.'))
