// Paso 19 · Guarda de encendido (Legal, revisión de 6e9210a, bloqueo 1): el build de producción falla si VITE_REPUTACION=1 y la fecha
// de la 1.10-demo todavía es la de borrador (lleva «[»). Así nunca se publica «1.10-demo · [fecha de encendido]».
// Borrador local (capturas y E2E en esta máquina): LOCKUMI_REPUTACION_BORRADOR=1 lo deja pasar, pero NUNCA en Vercel.
import { FECHA_ENCENDIDO_REPUTACION } from './fecha-reputacion.ts'
import { FECHA_V111 } from './fecha-v111.ts'
import { FECHA_V112 } from './fecha-v112.ts'
import { FECHA_V113 } from './fecha-v113.ts'

type Entorno = Record<string, string | undefined>
/** null si se puede construir; si no, el error que explica cómo arreglarlo. */
export function revisarEncendido(env: Entorno, fecha: string = FECHA_ENCENDIDO_REPUTACION): string | null {
  if (env.VITE_REPUTACION !== '1' || !fecha.includes('[')) return null
  if (env.LOCKUMI_REPUTACION_BORRADOR === '1' && !env.VERCEL) return null   // borrador solo fuera de Vercel (ni preview ni producción)
  return `VITE_REPUTACION=1 pero FECHA_ENCENDIDO_REPUTACION todavía dice «${fecha}». Escribe la fecha real de encendido en ` +
    'src/legal/fecha-reputacion.ts (por ejemplo «2 de noviembre de 2026») o apaga VITE_REPUTACION.'
}
/** Legal (PR #33): la 1.11-demo lleva la fecha del día de la publicación (src/legal/fecha-v111.ts, la escribe scripts/fecha-1-11.mjs).
 *  Sin fecha, el build de PRODUCCIÓN de Vercel con la reputación falla; los previews y los builds locales pasan (muestran la marca). */
export function revisarFechaV111(env: Entorno, fecha: string = FECHA_V111): string | null {
  if (env.VITE_REPUTACION !== '1' || !fecha.includes('[') || env.VERCEL_ENV !== 'production') return null
  return `VITE_REPUTACION=1 pero FECHA_V111 todavía dice «${fecha}». Antes del merge, corre «node scripts/fecha-1-11.mjs» ` +
    '(escribe la fecha de hoy en src/legal/fecha-v111.ts) y súbelo en el mismo PR.'
}
/** Legal (revisión de c97585b): la 1.12-demo, igual que la 1.11-demo (src/legal/fecha-v112.ts, la escribe scripts/fecha-1-12.mjs). */
export function revisarFechaV112(env: Entorno, fecha: string = FECHA_V112): string | null {
  if (env.VITE_REPUTACION !== '1' || !fecha.includes('[') || env.VERCEL_ENV !== 'production') return null
  return `VITE_REPUTACION=1 pero FECHA_V112 todavía dice «${fecha}». Antes del merge, corre «node scripts/fecha-1-12.mjs» ` +
    '(escribe la fecha de hoy en src/legal/fecha-v112.ts) y súbelo en el mismo PR.'
}
/** Legal (26/10/2026): la 1.13-demo, igual que la 1.12-demo (src/legal/fecha-v113.ts, la escribe scripts/fecha-1-13.mjs). */
export function revisarFechaV113(env: Entorno, fecha: string = FECHA_V113): string | null {
  if (env.VITE_REPUTACION !== '1' || !fecha.includes('[') || env.VERCEL_ENV !== 'production') return null
  return `VITE_REPUTACION=1 pero FECHA_V113 todavía dice «${fecha}». Antes del merge, corre «node scripts/fecha-1-13.mjs» ` +
    '(escribe la fecha de hoy en src/legal/fecha-v113.ts) y súbelo en el mismo PR.'
}
/** Plugin de Vite: revisa al empezar el build (no en el servidor de desarrollo). */
export function guardaEncendido(env: Entorno) {
  return {
    name: 'lockumi-guarda-encendido',
    configResolved(c: { command: string }) {
      if (c.command !== 'build') return
      const error = revisarEncendido(env) ?? revisarFechaV111(env) ?? revisarFechaV112(env) ?? revisarFechaV113(env); if (error) throw new Error(error)
    },
  }
}
