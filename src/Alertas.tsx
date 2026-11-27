import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { Tostada } from './Aviso'
import { alertasVisibles, cerrarAlerta, suscribirAlertas } from './alertas'

/** Lo que el aviso no debe tapar: la franja de red de prueba, la cabecera, el título, el paso y los botones principales. */
const TAPAR_NUNCA = '.aviso-red, header.barra, #contenido h1, .paso-cab, .entrada-app__titulo, #contenido .boton--primario'
const SEPARACION = 8, ASOMA = 23

/** Altura (desde abajo) para la pila: abajo al centro (celular) o a la derecha (computadora). Si en esa altura tapara
 *  un botón principal, sube justo encima de él (sin pasar por encima del título); si no hay lugar, queda abajo. */
export function alturaLibre(caja: { left: number; right: number; alto: number }, base: number, vh = innerHeight): number | null {
  const obst = [...document.querySelectorAll(TAPAR_NUNCA)].filter(e => !e.closest('.tostadas')).map(e => e.getBoundingClientRect())
    .filter(r => r.width && r.height && r.bottom > 0 && r.top < vh && r.right > caja.left && r.left < caja.right)
  const choca = (abajo: number) => { const arriba = abajo - caja.alto - ASOMA; return obst.filter(r => r.top < abajo && r.bottom > arriba) }
  let abajo = vh - base
  for (let i = 0; i < 6; i++) {
    const c = choca(abajo); if (!c.length) return i === 0 ? null : vh - abajo
    abajo = Math.min(...c.map(r => r.top)) - SEPARACION
    if (abajo - caja.alto - ASOMA < 0) break
  }
  return null
}

/** Pila de avisos v2 (estilo Sonner): hasta 3, el más nuevo al frente y los anteriores asomando hacia arriba.
 *  Con el mouse, el dedo o el foco encima, la pila se abre y los tiempos se pausan. Dos zonas fijas para lectores de pantalla:
 *  `status` (amable) para pasos y logros, `alert` para errores. Va justo después de «Saltar al contenido» (2.ª parada de Tab). */
export function Alertas() {
  const pila = useSyncExternalStore(suscribirAlertas, alertasVisibles, alertasVisibles)
  const [encima, setEncima] = useState(false), [conFoco, setConFoco] = useState(false), [dedo, setDedo] = useState(false)
  const abierta = encima || conFoco || dedo
  const [altos, setAltos] = useState<Record<number, number>>({})
  const onAlto = useCallback((id: number, h: number) => setAltos(v => v[id] === h ? v : { ...v, [id]: h }), [])
  const cierres = useRef(new Map<number, () => void>())
  const registrar = useCallback((id: number, f: (() => void) | null) => { if (f) cierres.current.set(id, f); else cierres.current.delete(id) }, [])
  const caja = useRef<HTMLDivElement>(null)
  const nuevos = [...pila].reverse()   // el más nuevo primero (al frente y primero con Tab)
  const indice = new Map(nuevos.map((a, i) => [a.id, i]))
  const desplazar = (id: number) => { const i = indice.get(id) ?? 0; let y = 0; for (let k = 0; k < i; k++) y += (altos[nuevos[k].id] ?? 64) + SEPARACION; return y }
  // Esc cierra el aviso más nuevo (también si el foco está en la página).
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && nuevos.length) cierres.current.get(nuevos[0].id)?.() }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  })
  // Lugar: no tapa la cabecera, el título del paso ni los botones principales (se recalcula al desplazar o si cambia la pantalla).
  useLayoutEffect(() => {
    const c = caja.current; if (!c || !pila.length) return
    let cuadro = 0
    const poner = () => {
      c.style.removeProperty('bottom')
      const r = c.getBoundingClientRect(), base = innerHeight - r.bottom
      const h = Math.max(...pila.map(a => altos[a.id] ?? 64))
      const b = alturaLibre({ left: r.left, right: r.right, alto: h }, base)
      if (b != null) c.style.bottom = b + 'px'
    }
    const luego = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(poner) }
    poner(); const t = setTimeout(poner, 350)
    addEventListener('resize', luego); document.addEventListener('scroll', luego, { passive: true, capture: true }); addEventListener('hashchange', luego)
    const m = typeof MutationObserver === 'undefined' ? null : new MutationObserver(luego)
    m?.observe(document.getElementById('contenido') ?? document.body, { childList: true, subtree: true })
    return () => { cancelAnimationFrame(cuadro); clearTimeout(t); m?.disconnect(); removeEventListener('resize', luego); document.removeEventListener('scroll', luego, { capture: true }); removeEventListener('hashchange', luego) }
  }, [pila, altos])
  // Un aviso que se cierra no avisa «blur» ni «pointerout»: se revisa de nuevo al cambiar la pila (si no, la pausa quedaría puesta).
  useEffect(() => { const c = caja.current
    setConFoco(!!c?.contains(document.activeElement)); setEncima(!!c?.querySelector(':hover')); if (!pila.length) setDedo(false) }, [pila])
  const tostada = (a: typeof pila[number]) => <Tostada key={a.id} a={a} indice={indice.get(a.id)!} pausa={abierta} abierta={abierta} desplazar={abierta ? desplazar(a.id) : 0}
    onCerrar={cerrarAlerta} onAlto={onAlto} registrar={registrar} />
  // Como en Sonner, cerrada la pila los de atrás toman el alto del de adelante y asoman parejos por arriba.
  const alto0 = nuevos.length ? altos[nuevos[0].id] : undefined
  return <div ref={caja} className={'tostadas' + (abierta ? ' tostadas--abierta' : '')} style={alto0 ? { '--h0': alto0 + 'px' } as CSSProperties : undefined}
    onPointerOver={e => { if (e.pointerType === 'mouse') setEncima(true) }}
    onPointerOut={e => { if (e.pointerType === 'mouse' && !caja.current?.contains(e.relatedTarget as Node)) setEncima(false) }}
    onPointerDown={e => { if (e.pointerType !== 'mouse') setDedo(true) }}
    onPointerUp={e => { if (e.pointerType !== 'mouse') setDedo(false) }} onPointerCancel={() => setDedo(false)}
    onFocus={() => setConFoco(true)} onBlur={e => { if (!caja.current?.contains(e.relatedTarget as Node)) setConFoco(false) }}>
    <div className="tostadas__zona" role="status" aria-live="polite">{nuevos.filter(a => a.tipo !== 'error').map(tostada)}</div>
    <div className="tostadas__zona" role="alert">{nuevos.filter(a => a.tipo === 'error').map(tostada)}</div>
  </div>
}
