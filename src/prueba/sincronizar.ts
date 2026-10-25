// Entrega de avisos mientras la app está abierta (no hay tareas en el servidor: Vercel Hobby solo permite una por día).
// Cada 30 segundos, y cada vez que cambian los alquileres, pone al día los alquileres de la demo local con el reloj de la demo.
import { useEffect } from 'react'
import { store, ahoraDe } from '../store'
import { modoServidor } from '../servidor/config'
import { pruebaCompleta } from './interruptor'
import { reglas17 } from './version'
import { sincronizar, pendiente } from './dueno'
import { debeBorrarMediacion, borrarMediacion } from './borrado'

export function sincronizarTodos() {
  for (const a of store.todos()) {
    if (reglas17(a) && pendiente(a, ahoraDe(a))) store.cambiar(a.id, x => { sincronizar(x, ahoraDe(x)) })
    if (reglas17(a) && debeBorrarMediacion(a, ahoraDe(a))) store.cambiar(a.id, x => { borrarMediacion(x, ahoraDe(x)) })
  }
}
export function useSincronizarPrueba() {
  useEffect(() => {
    if (!pruebaCompleta() || modoServidor) return
    let enCurso = false
    const correr = () => { if (enCurso) return; enCurso = true; try { sincronizarTodos() } finally { enCurso = false } }
    correr(); const t = setInterval(correr, 30_000); const s = store.subscribe(() => queueMicrotask(correr))
    return () => { clearInterval(t); s() }
  }, [])
}
