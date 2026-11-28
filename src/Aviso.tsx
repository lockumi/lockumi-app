import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { LogoAviso } from './LogoAviso'
import { lineaDe, tonoDe, type AlertaEnPila, type Accion } from './alertas'

export type Tono = 'paso' | 'logro' | 'error'

/** Tiempo que se ve cada aviso antes de esconderse solo: 5 s sin acción y 8 s con acción. Los errores no se esconden solos. */
export const DURACION_AVISO = 5000
export const DURACION_CON_ACCION = 8000
export const duracionDe = (a: Pick<AlertaEnPila, 'tipo' | 'accion'>) => a.tipo === 'error' ? null : a.accion ? DURACION_CON_ACCION : DURACION_AVISO
/** Deslizar para cerrar: un tercio del ancho hacia un lado, 40 px hacia abajo o un gesto rápido (más de 0,5 px/ms). */
export const UMBRAL_LADO = 1 / 3, UMBRAL_ABAJO = 40, UMBRAL_VELOCIDAD = 0.5

const reducir = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Lleva al paso del botón de acción: la tarjeta del paso (enfoca su botón principal) o «Detalles» abierto. */
export function irA(destino: Accion['ir']) {
  const behavior: ScrollBehavior = reducir() ? 'auto' : 'smooth'
  if (destino === 'detalles') {
    const d = document.querySelector<HTMLDetailsElement>('details.detalles')
    if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior }); d.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true }); return }
  }
  const panel = document.querySelector<HTMLElement>('.detalle__principal > .tarjeta') ?? document.getElementById('contenido')
  if (!panel) return
  const b = panel.querySelector<HTMLElement>('.boton--primario:not([disabled]):not([aria-disabled="true"])') ?? panel.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])')
  if (b) { b.scrollIntoView({ block: 'center', behavior }); b.focus({ preventScroll: true }) }
  else { panel.scrollIntoView({ block: 'start', behavior }); if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1; panel.focus({ preventScroll: true }) }
}

/** Aviso v2 (toast, sin librerías): pastilla de vidrio crema con la casita completa de 32 px, el título y una línea.
 *  Con acción lleva un botón de 44 px que navega al paso; tocar el resto de la pastilla, Enter, Espacio o Esc la cierran.
 *  Se esconde sola a los 5 s (8 s con acción; los errores no) y se pausa con el dedo, el mouse o el foco (`pausa`, de la pila).
 *  En pantallas táctiles se cierra deslizándola hacia un lado o hacia abajo. No es un diálogo y no roba el foco. */
export function Tostada({ a, indice, pausa, abierta, desplazar, onCerrar, onAlto, registrar }: {
  a: AlertaEnPila; indice: number; pausa: boolean; abierta: boolean; desplazar: number
  onCerrar: (id: number) => void; onAlto?: (id: number, h: number) => void; registrar?: (id: number, cerrar: (() => void) | null) => void
}) {
  const tono = tonoDe(a), linea = lineaDe(a), dur = duracionDe(a)
  const [saliendo, setSaliendo] = useState(false)
  const ref = useRef<HTMLDivElement>(null); const id = useId()
  const saliendoRef = useRef(false); const onCerrarRef = useRef(onCerrar); useEffect(() => { onCerrarRef.current = onCerrar })
  const antesDelFoco = useRef<HTMLElement | null>(null)
  const cerrar = (volverFoco = true) => {
    if (saliendoRef.current) return; saliendoRef.current = true; setSaliendo(true)
    if (volverFoco && ref.current?.contains(document.activeElement)) {   // tenía el foco: vuelve a donde estaba
      const v = antesDelFoco.current
      if (v && v !== document.body && v.isConnected && !v.closest('.tostadas')) v.focus(); else document.getElementById('contenido')?.focus()
    }
    setTimeout(() => onCerrarRef.current(a.id), reducir() ? 160 : 200)
  }
  const cerrarRef = useRef(cerrar); useEffect(() => { cerrarRef.current = cerrar })
  useEffect(() => { registrar?.(a.id, () => cerrarRef.current()); return () => registrar?.(a.id, null) }, [a.id, registrar])
  // Conteo que se pausa (dedo, mouse o foco en la pila) y sigue donde quedó.
  const queda = useRef(dur ?? 0), desde = useRef(0), reloj = useRef(0)
  useEffect(() => {
    if (dur == null) return
    if (pausa) { if (reloj.current) { clearTimeout(reloj.current); reloj.current = 0; queda.current -= Date.now() - desde.current } return }
    desde.current = Date.now(); reloj.current = window.setTimeout(() => cerrarRef.current(), Math.max(0, queda.current))
    return () => { if (reloj.current) { clearTimeout(reloj.current); reloj.current = 0; queda.current -= Date.now() - desde.current } }
  }, [pausa, dur])
  useLayoutEffect(() => {
    const n = ref.current; if (!n || !onAlto) return
    const medir = () => onAlto(a.id, n.offsetHeight); medir()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir); ro?.observe(n); return () => ro?.disconnect()
  }, [a.id, onAlto])
  // Deslizar para cerrar (dedo o lápiz): sigue al dedo con opacidad decreciente y 4° de giro; si no pasa el umbral, vuelve con un resorte.
  const gesto = useRef<{ x: number; y: number; t: number; mov: boolean } | null>(null), recienArrastrado = useRef(false)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || saliendoRef.current) return
    gesto.current = { x: e.clientX, y: e.clientY, t: performance.now(), mov: false }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesto.current, n = ref.current; if (!g || !n) return
    const dx = e.clientX - g.x, dy = Math.max(0, e.clientY - g.y)
    if (!g.mov && Math.hypot(dx, dy) < 6) return
    if (!g.mov) { g.mov = true; n.setPointerCapture?.(e.pointerId); n.classList.add('tostada--arrastre') }
    const w = n.offsetWidth || 1, giro = reducir() ? 0 : (dx / w) * 4
    n.style.transform = `translate(${dx}px, ${dy}px) rotate(${giro}deg)`
    n.style.opacity = String(Math.max(0.25, 1 - Math.max(Math.abs(dx) / w, dy / 120) * 0.75))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesto.current, n = ref.current; gesto.current = null; if (!g || !n || !g.mov) return
    recienArrastrado.current = true; setTimeout(() => { recienArrastrado.current = false }, 0)
    const dx = e.clientX - g.x, dy = Math.max(0, e.clientY - g.y), v = Math.hypot(dx, dy) / Math.max(1, performance.now() - g.t), w = n.offsetWidth || 1
    n.classList.remove('tostada--arrastre')
    if (Math.abs(dx) > w * UMBRAL_LADO || dy > UMBRAL_ABAJO || v > UMBRAL_VELOCIDAD) {
      const lado = Math.abs(dx) >= dy
      n.classList.add('tostada--fuera')
      n.style.transform = reducir() ? n.style.transform : lado ? `translate(${Math.sign(dx || 1) * w * 1.2}px, ${dy}px) rotate(${Math.sign(dx || 1) * 8}deg)` : `translate(${dx}px, ${dy + 120}px)`
      n.style.opacity = '0'; cerrar()
    } else { n.classList.add('tostada--resorte'); n.style.transform = ''; n.style.opacity = ''; setTimeout(() => n.classList.remove('tostada--resorte'), 220) }
  }
  const onPointerCancel = () => { const n = ref.current; gesto.current = null; if (n) { n.classList.remove('tostada--arrastre'); n.style.transform = ''; n.style.opacity = '' } }
  const accion = a.accion
  return <div ref={ref} data-id={a.id} data-paso={a.paso} data-i={indice}
    className={`tostada tostada--${tono}${accion ? ' tostada--accion' : ''}${saliendo ? ' tostada--sale' : ''}${pausa ? ' tostada--pausa' : ''}`}
    style={{ '--y': `${-desplazar}px`, zIndex: 10 - indice } as React.CSSProperties}
    role="group" tabIndex={0} aria-label="Aviso. Toca para cerrar" aria-describedby={id + 't ' + id + 'd'}
    onClick={() => { if (!recienArrastrado.current) cerrar() }}
    onKeyDown={e => { if (e.target !== e.currentTarget && e.key !== 'Escape') return; if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() } }}
    onFocus={e => { if (e.target === e.currentTarget && !ref.current?.contains(e.relatedTarget as Node)) antesDelFoco.current = e.relatedTarget as HTMLElement | null }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
    data-abierta={abierta || undefined}>
    <span className="tostada__casa"><LogoAviso /></span>
    <div className="tostada__tx">
      <h2 id={id + 't'} className="tostada__t">{a.titulo}</h2>
      <p id={id + 'd'} className="tostada__l">{linea.et && <b>{linea.et}</b>}{linea.et && ' '}{linea.texto}</p>
    </div>
    {accion && <button type="button" className="tostada__accion" aria-label={accion.etiqueta}
      onClick={e => { e.stopPropagation(); cerrar(false); irA(accion.ir) }}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() } }}>{accion.texto}</button>}
    {tono === 'error' && <button type="button" className="tostada__cerrar" aria-label="Cerrar" onClick={e => { e.stopPropagation(); cerrar() }}>
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>}
    {dur != null && <span className="tostada__tiempo" aria-hidden="true" style={{ animationDuration: dur + 'ms' }} />}
    <span className="tostada__manija" aria-hidden="true" />
  </div>
}
