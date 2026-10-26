// PR #22 · estado de las aceptaciones de la mediación (dos personas): qué aceptó cada parte (lk_aceptaciones_mediacion).
// LEGAL: revisado (25/10, lista de Legal) · textos de estado; la persona mediadora no decide: solo registra el reparto que las dos partes aceptaron (2.2 b).
import type { Rol } from '../types'

export interface Aceptacion { rol: Rol; montoDueno: number; fecha: string }
const NOMBRE: Record<Rol, string> = { dueno: 'El dueño', inquilino: 'El inquilino' }
const fmt = (n: number) => new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' USDC de prueba'
const reparto = (d: number, monto: number) => `${fmt(d)} para el dueño y ${fmt(Math.round((monto - d) * 100) / 100)} para el inquilino`

export function estadoAceptaciones(mio: Rol, filas: Aceptacion[], monto: number) {
  const otroRol: Rol = mio === 'dueno' ? 'inquilino' : 'dueno'
  const mia = filas.find(f => f.rol === mio)?.montoDueno ?? null, otra = filas.find(f => f.rol === otroRol)?.montoDueno ?? null
  const texto = otra === null ? `${NOMBRE[otroRol]} todavía no aceptó ningún reparto.`
    : mia !== null && mia === otra ? 'Las dos partes aceptaron el mismo reparto. Falta que la persona mediadora lo registre.'
    : mia !== null ? `${NOMBRE[otroRol]} aceptó otro reparto: ${reparto(otra, monto)}.`
    : `${NOMBRE[otroRol]} aceptó: ${reparto(otra, monto)}.`
  return { mia, otra, texto }
}
