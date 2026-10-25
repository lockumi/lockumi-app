// Contrato compacto (maqueta diseno/envio/contrato-compacto, aprobada el 24/10/2026): en el detalle del alquiler el contrato ya no
// ocupa toda la columna. Escritorio (960 px o más): tarjeta corta en la columna derecha (lugar, depósito, fechas, estado y «Ver contrato»)
// que abre el contrato completo en un panel a la derecha. Celular: barra compacta arriba (lugar y depósito) que abre el contrato en una
// hoja desde abajo; la hoja se cierra deslizándola hacia abajo. Solo se dibuja UNA de las dos variantes según el ancho de la pantalla.
// El texto del contrato es el mismo componente de siempre (ContratoDoc → Documento, con sus partes «LEGAL»), sin cambios.
// Imprimir: «Descargar o imprimir» dentro del panel y el menú del navegador dan siempre el contrato completo.
import { useEffect, useId, useRef, useState, useSyncExternalStore, type PointerEvent as EventoPuntero, type KeyboardEvent as EventoTecla } from 'react'
import { modoPrueba } from '../servidor/config'
import type { Alquiler } from '../types'
import { usd, fecha } from '../ui'
import { ContratoDoc, Documento } from './ContratoDoc'

export const TEXTO_VER_CONTRATO = 'Ver contrato'
export const TEXTO_CERRAR = 'Cerrar'
/** Ancho desde el que se usa la tarjeta + panel (el mismo corte que la columna derecha de .detalle en index.css). */
export const CONSULTA_ESCRITORIO = '(min-width: 960px)'
/** Deslizar la hoja hacia abajo: cierra si baja más de 120 px, o más de 40 px con un gesto rápido (más de 0,5 px por ms). */
export const cierraAlDeslizar = (dy: number, ms: number) => dy > 120 || (dy > 40 && ms > 0 && dy / ms > 0.5)

const suscribir = (f: () => void) => { if (typeof matchMedia !== 'function') return () => {}; const m = matchMedia(CONSULTA_ESCRITORIO); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }
const ahora = () => typeof matchMedia === 'function' && matchMedia(CONSULTA_ESCRITORIO).matches
/** ¿Pantalla de escritorio? Se actualiza al cambiar el ancho (sin dibujar las dos variantes). */
export const useEscritorio = () => useSyncExternalStore(suscribir, ahora, () => false)

export const firmadoPorLosDos = (a: Alquiler) => !!a.contrato.firmas.dueno && !!a.contrato.firmas.inquilino

/** Panel (escritorio) u hoja (celular) con el contrato completo. <dialog> nativo y modal: Tab se queda dentro, Escape o tocar afuera
 *  cierran y el foco vuelve al botón que lo abrió. En la hoja, la cabecera (con el asa) se puede arrastrar hacia abajo para cerrar. */
export function PanelContrato({ a, abierto, onCerrar, hoja }: { a: Alquiler; abierto: boolean; onCerrar: () => void; hoja: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const tid = 'cc-panel-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [dy, setDy] = useState(0); const gesto = useRef<{ y: number; t: number } | null>(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (abierto && !d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); document.documentElement.classList.add('sin-scroll') }
    if (!abierto && d.open) d.close()
    if (!abierto) document.documentElement.classList.remove('sin-scroll')
  }, [abierto])
  useEffect(() => () => document.documentElement.classList.remove('sin-scroll'), [])
  // Tab y Mayús+Tab dan la vuelta dentro del panel (el navegador dejaría salir el foco hacia su propia barra).
  const atrapar = (e: EventoTecla) => {
    if (e.key !== 'Tab' || !ref.current) return
    const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(x => x.getClientRects().length)
    if (!f.length) return
    const i = f.indexOf(document.activeElement as HTMLElement)
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
  }
  const bajar = (e: EventoPuntero) => { if (!hoja || (e.target as Element).closest('button')) return; e.preventDefault(); gesto.current = { y: e.clientY, t: e.timeStamp }; (e.currentTarget as Element).setPointerCapture?.(e.pointerId) }
  const mover = (e: EventoPuntero) => { if (gesto.current) setDy(Math.max(0, e.clientY - gesto.current.y)) }
  const soltar = (e: EventoPuntero) => { const g = gesto.current; gesto.current = null; if (g && cierraAlDeslizar(e.clientY - g.y, e.timeStamp - g.t)) onCerrar(); setDy(0) }
  return <dialog ref={ref} className={'cc-panel' + (hoja ? ' cc-panel--hoja' : ' cc-panel--lado')} aria-labelledby={tid} data-cc-panel=""
    style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
    onCancel={e => { e.preventDefault(); onCerrar() }} onClick={e => { if (e.target === ref.current) onCerrar() }} onKeyDown={atrapar}>
    <div className="cc-panel__cab" onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => { gesto.current = null; setDy(0) }}>
      {hoja && <div className="cc-panel__asa" aria-hidden="true" />}
      <div className="cc-panel__fila"><h2 id={tid} className="sr">Contrato</h2><span className="cc-panel__esp" />
        <button type="button" className="boton-icono" aria-label={TEXTO_CERRAR} onClick={onCerrar}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button></div>
    </div>
    <div className="cc-panel__cuerpo">{abierto && <ContratoDoc a={a} completo />}</div>
  </dialog>
}

/** Tarjeta corta (escritorio) o barra compacta (celular). Al cerrar el panel, el foco vuelve a su botón «Ver contrato». */
export function ContratoCompacto({ a, como }: { a: Alquiler; como: 'tarjeta' | 'barra' }) {
  const [abierto, setAbierto] = useState(false); const boton = useRef<HTMLButtonElement>(null); const tid = 'cc-t-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const cerrar = () => { setAbierto(false); requestAnimationFrame(() => boton.current?.focus()) }
  const firmado = firmadoPorLosDos(a)
  const panel = <PanelContrato a={a} abierto={abierto} onCerrar={cerrar} hoja={como === 'barra'} />
  // Imprimir con el menú del navegador: en el papel sale el contrato completo en lugar de la tarjeta o la barra (solo @media print).
  const papel = <div className="cc-papel" aria-hidden="true"><Documento a={a} impresion /></div>
  if (como === 'barra') return <div className="cc-barra-caja">
    <button ref={boton} type="button" className="cc-barra" aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto(true)}>
      <span className="cc-barra__txt"><small>Contrato</small><strong>{a.direccion} · {usd(a.monto)}</strong></span>
      <span className="cc-barra__ver">{TEXTO_VER_CONTRATO}</span>
    </button>{panel}{papel}</div>
  return <section className="glass tarjeta cc-tarjeta" aria-labelledby={tid}>
    <p className="ct__marca">Lockumi{modoPrueba ? ' · Prueba en la red de prueba' : ''}</p>
    <h3 id={tid} className="cc-tarjeta__t">Contrato</h3>
    <dl className="cc-datos">
      <div><dt>Lugar</dt><dd>{a.direccion}</dd></div>
      <div><dt>Depósito</dt><dd>{usd(a.monto)}</dd></div>
      <div><dt>Fechas</dt><dd>{fecha(a.inicio)} → {fecha(a.fin)}</dd></div>
      <div><dt>Estado</dt><dd><span className={'ct__sello' + (firmado ? ' ct__sello--ok' : '')}>{firmado ? 'Firmado por los dos' : 'Pendiente de firmas'}</span></dd></div>
    </dl>
    <button ref={boton} type="button" className="boton boton--secundario boton--ancho cc-ver" aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto(true)}>{TEXTO_VER_CONTRATO}</button>
    {panel}{papel}
  </section>
}
