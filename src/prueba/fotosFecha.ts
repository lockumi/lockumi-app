// Fecha y hora de cada foto (Términos 1.7-demo, 6.4.2): la app registra la fecha y la hora en que se tomó o se agregó cada foto,
// siempre en hora de Costa Rica, y no registra la ubicación. Solo se muestra con el interruptor de la prueba completa encendido.
import type { Foto } from '../types'
import { fechaHoraCR } from '../../api/_lib/plazos'

const momento = (f: Foto) => f.tomadaEn ?? Date.parse(f.fecha)
// LEGAL: revisado (25/10, lista de Legal) · pie de cada foto (6.4.2)
export function textoFotoPC(f: Foto): string {
  const cuando = `${fechaHoraCR(momento(f))}, hora de Costa Rica`
  if (f.origen === 'ejemplo') return `Foto de ejemplo · registrada el ${cuando}`
  return `${f.origen === 'archivo' ? 'Agregada' : 'Tomada'} en la app el ${cuando}`
}
/** Sello corto sobre la foto: dd/mm/aa hh:mm en hora de Costa Rica (UTC-6). */
export function selloFoto(f: Foto): string {
  const x = new Date(momento(f) - 6 * 3_600_000), p = (n: number) => String(n).padStart(2, '0')
  return `${p(x.getUTCDate())}/${p(x.getUTCMonth() + 1)}/${String(x.getUTCFullYear()).slice(2)} ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`
}
