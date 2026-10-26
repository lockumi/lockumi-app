// Paso 19 · REP-12 también por correo (decisión del 25/10, 2:57 p. m.): programado, no recortado. Solo sale con VITE_CORREOS=1 (y la
// prueba completa); apagado, el aviso sigue solo en la app. Una vez por cambio en este navegador; si falla, se reintenta al volver a abrir.
// El servidor (api/_lib/correo.ts, tipo 'reputacion') arma el texto: aquí solo van las líneas públicas del puntaje, el código y la fecha.
import { correosActivos } from '../prueba/interruptor'

export interface AvisoCorreo { tipo: 'cambio' | 'vencido'; antes?: string; despues: string; alquiler: string; fechaMs?: number }
const clave = (email: string) => 'lockumi.reputacion.correos.v1.' + email.trim().toLowerCase()
const id = (a: AvisoCorreo) => `${a.tipo}:${a.alquiler}:${a.antes ?? ''}:${a.despues}`
const enviados = (email: string): string[] => { try { return JSON.parse(localStorage.getItem(clave(email)) ?? '[]') } catch { return [] } }

/** Envía el aviso por /api/correo. Devuelve true si salió ahora (false si los correos están apagados, ya salió o falló). */
export async function enviarAvisoReputacion(email: string, a: AvisoCorreo): Promise<boolean> {
  if (!correosActivos() || enviados(email).includes(id(a))) return false
  try {
    const r = await fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tipo: 'reputacion', para: email.trim(), aviso: a.tipo, ...(a.antes !== undefined ? { antes: a.antes } : {}), despues: a.despues, alquiler: a.alquiler, ...(a.fechaMs !== undefined ? { fechaMs: a.fechaMs } : {}) }) })
    if (!r.ok) return false
    try { localStorage.setItem(clave(email), JSON.stringify([...enviados(email), id(a)].slice(-50))) } catch { /* sin almacenamiento */ }
    return true
  } catch { return false }
}
export const borrarCorreosEnviados = (email: string) => { try { localStorage.removeItem(clave(email)) } catch { /* nada */ } }
