// Modos de la app. Desde el paso 7 (modo de dos personas), tener las variables de Supabase YA NO cambia toda la app: el servidor
// compartido solo se usa con su propio interruptor (VITE_DOS_PERSONAS=1) y, con la red de prueba, solo para los alquileres que se
// crean «Invitando a la otra persona». Los alquileres de una persona siguen exactamente igual que hoy.
type Env = Record<string, string | boolean | undefined>
const ENV = import.meta.env as unknown as Env
export const SUPABASE_URL = (ENV.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY = (ENV.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
/** Plazo real de reclamos: 7 días (604800 s). Es el único valor posible en producción. */
export const PLAZO_REAL_SEGUNDOS = 604800
/** Lo pone vite.config.ts desde VERCEL_ENV («production», «preview»…); vacío en builds locales y en las pruebas. */
declare const __ENTORNO_VERCEL__: string | undefined
const ENTORNO = typeof __ENTORNO_VERCEL__ === 'undefined' ? '' : (__ENTORNO_VERCEL__ ?? '')
/** Plazo de reclamos al crear (segundos). Siempre 7 días, salvo en pruebas: VITE_VENTANA_SEGUNDOS (mínimo 60, p. ej. 300) solo vale
 *  con VITE_PRUEBA_COMPLETA=1 y nunca en el build de producción de Vercel (VERCEL_ENV=production). Función pura para poder probarla. */
export function calcularVentana(e: Env, entorno = ''): number {
  if (e.VITE_PRUEBA_COMPLETA !== '1' || entorno === 'production') return PLAZO_REAL_SEGUNDOS
  return Math.max(60, Math.min(PLAZO_REAL_SEGUNDOS, Number(e.VITE_VENTANA_SEGUNDOS ?? PLAZO_REAL_SEGUNDOS) || PLAZO_REAL_SEGUNDOS))
}
export const VENTANA_SEGUNDOS = calcularVentana(ENV, ENTORNO)
export const BUCKET_FOTOS = 'lk-fotos'

export type Modos = { servidor: boolean; trustless: boolean; prueba: boolean; solo: boolean; video: boolean; escrowReal: boolean; dosPersonas: boolean }
/** Calcula los modos a partir de las variables VITE_* (función pura para poder probarla). */
export function calcularModos(e: Env): Modos {
  const supa = !!e.VITE_SUPABASE_URL && !!e.VITE_SUPABASE_ANON_KEY
  const red = e.VITE_TRUSTLESS === '1', interruptor = supa && e.VITE_DOS_PERSONAS === '1'
  /** Servidor compartido para TODA la app: solo la demo local sin red de prueba (Supabase + VITE_DOS_PERSONAS=1, sin VITE_TRUSTLESS). */
  const servidor = interruptor && !red
  /** Red de prueba (VITE_TRUSTLESS=1): aviso fijo, dueño de prueba rotulado y mediador «Simulado». Es lo que corre en producción. */
  const prueba = red
  /** Fase 1 mínima: 5 pasos reales en Stellar testnet (Real.tsx → /api/solo). Solo si además VITE_FLUJO=solo. */
  const solo = prueba && e.VITE_FLUJO === 'solo'
  return { servidor, trustless: false, prueba, solo, video: prueba && !solo, escrowReal: prueba,
    /** Modo de dos personas: con Supabase, la red de prueba y su propio interruptor (VITE_DOS_PERSONAS=1), «Invitar a la otra persona» crea el alquiler
     *  en el servidor. Ya no depende de VITE_PRUEBA_COMPLETA. */
    dosPersonas: interruptor && red }
}
const M = calcularModos(ENV)
/** Así se comporta un alquiler con otra persona: servidor compartido y Trustless Work real por /api/tw (nada simulado en un solo aparato). */
const DOS: Omit<Modos, 'dosPersonas'> = { servidor: true, trustless: true, prueba: false, solo: false, video: false, escrowReal: false }
/** Modos de un alquiler: el de dos personas usa el servidor; los demás, los de la app. */
export const modoDeCon = (m: Modos, a?: { dosPersonas?: boolean }): Modos => m.dosPersonas && a?.dosPersonas === true ? { ...DOS, dosPersonas: true } : m
export const modoDe = (a?: { dosPersonas?: boolean }) => modoDeCon(M, a)
/** Este alquiler es del modo de dos personas (interruptor encendido y alquiler creado invitando a la otra persona). */
export const deDosPersonas = (a?: { dosPersonas?: boolean }) => M.dosPersonas && a?.dosPersonas === true

export const modoServidor = M.servidor
/** Trustless Work real por /api/tw: solo en los alquileres con otra persona (ver modoDe). */
export const modoTrustless = M.trustless
export const modoPrueba = M.prueba
export const modoSolo = M.solo
/** Interfaz completa del video en un solo aparato: tú eres el inquilino y el dueño de prueba firma y confirma solo. */
export const modoVideo = M.video
/** ¿El depósito se mueve de verdad en Stellar testnet (Trustless Work, /api/solo)? Sí en la red de prueba. */
export const escrowReal = M.escrowReal
/** ¿Se puede invitar a la otra persona? (VITE_DOS_PERSONAS=1 con Supabase y red de prueba). */
export const dosPersonas = M.dosPersonas
/** ¿Hace falta el servidor compartido en algún alquiler? (toda la app en la demo local, o los de dos personas). */
export const conServidor = M.servidor || M.dosPersonas
