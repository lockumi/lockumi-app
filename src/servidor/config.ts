// Modos de la app. Desde el paso 7 (modo de dos personas), tener las variables de Supabase YA NO cambia toda la app: el servidor
// compartido solo se usa con su propio interruptor (VITE_DOS_PERSONAS=1) y, con la red de prueba, solo para los alquileres que se
// crean «Invitando a la otra persona». Los alquileres de una persona siguen exactamente igual que hoy.
type Env = Record<string, string | boolean | undefined>
const ENV = import.meta.env as unknown as Env
export const SUPABASE_URL = (ENV.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY = (ENV.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
/** Plazo de reclamos al crear (segundos). 7 días por defecto; para la prueba en testnet se puede acortar (mínimo 60). */
export const VENTANA_SEGUNDOS = Math.max(60, Math.min(604800, Number(ENV.VITE_VENTANA_SEGUNDOS ?? 604800) || 604800))
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
    /** Modo de dos personas: con la red de prueba, la prueba completa y el interruptor, «Invitar a la otra persona» crea el alquiler en el servidor. */
    dosPersonas: interruptor && red && e.VITE_PRUEBA_COMPLETA === '1' }
}
const M = calcularModos(ENV)
/** Así se comporta un alquiler con otra persona: servidor compartido y Trustless Work real por /api/tw (nada simulado en un solo aparato). */
const DOS: Omit<Modos, 'dosPersonas'> = { servidor: true, trustless: true, prueba: false, solo: false, video: false, escrowReal: false }
/** Modos de un alquiler: el de dos personas usa el servidor; los demás, los de la app. */
export const modoDeCon = (m: Modos, a?: { dosPersonas?: boolean }): Modos => m.dosPersonas && a?.dosPersonas === true ? { ...DOS, dosPersonas: true } : m
export const modoDe = (a?: { dosPersonas?: boolean }) => modoDeCon(M, a)

export const modoServidor = M.servidor
/** Trustless Work real por /api/tw: solo en los alquileres con otra persona (ver modoDe). */
export const modoTrustless = M.trustless
export const modoPrueba = M.prueba
export const modoSolo = M.solo
/** Interfaz completa del video en un solo aparato: tú eres el inquilino y el dueño de prueba firma y confirma solo. */
export const modoVideo = M.video
/** ¿El depósito se mueve de verdad en Stellar testnet (Trustless Work, /api/solo)? Sí en la red de prueba. */
export const escrowReal = M.escrowReal
/** ¿Se puede invitar a la otra persona? (VITE_DOS_PERSONAS=1 con Supabase, red de prueba y prueba completa). */
export const dosPersonas = M.dosPersonas
/** ¿Hace falta el servidor compartido en algún alquiler? (toda la app en la demo local, o los de dos personas). */
export const conServidor = M.servidor || M.dosPersonas
