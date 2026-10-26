// Paso 19 · Guarda de encendido (Legal, revisión de 6e9210a, bloqueo 1): el build de producción falla si VITE_REPUTACION=1 y la fecha
// de la 1.10-demo todavía es la de borrador (lleva «[»). Así nunca se publica «1.10-demo · [fecha de encendido]».
// Borrador local (capturas y E2E en esta máquina): LOCKUMI_REPUTACION_BORRADOR=1 lo deja pasar, pero NUNCA en Vercel.
import { FECHA_ENCENDIDO_REPUTACION } from './fecha-reputacion.ts'

type Entorno = Record<string, string | undefined>
/** null si se puede construir; si no, el error que explica cómo arreglarlo. */
export function revisarEncendido(env: Entorno, fecha: string = FECHA_ENCENDIDO_REPUTACION): string | null {
  if (env.VITE_REPUTACION !== '1' || !fecha.includes('[')) return null
  if (env.LOCKUMI_REPUTACION_BORRADOR === '1' && !env.VERCEL) return null   // borrador solo fuera de Vercel (ni preview ni producción)
  return `VITE_REPUTACION=1 pero FECHA_ENCENDIDO_REPUTACION todavía dice «${fecha}». Escribe la fecha real de encendido en ` +
    'src/legal/fecha-reputacion.ts (por ejemplo «2 de noviembre de 2026») o apaga VITE_REPUTACION.'
}
/** Plugin de Vite: revisa al empezar el build (no en el servidor de desarrollo). */
export function guardaEncendido(env: Entorno) {
  return {
    name: 'lockumi-guarda-encendido',
    configResolved(c: { command: string }) {
      if (c.command !== 'build') return
      const error = revisarEncendido(env); if (error) throw new Error(error)
    },
  }
}
