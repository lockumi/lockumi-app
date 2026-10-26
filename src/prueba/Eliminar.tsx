// PROTOTIPO (rama local eliminar-alquiler-propuesta): «Más opciones» del alquiler, confirmaciones de eliminar y ocultar,
// «Reiniciar mi demo» y el aviso del resultado en «Tus alquileres». Un paso por pantalla. LEGAL: pendiente (textos en eliminar-textos.ts).
import { useState } from 'react'
import { obtener, useAlquileres } from '../store'
import { usd, fecha } from '../ui'
import type { Alquiler, Usuario } from '../types'
import { T } from './eliminar-textos'
import { opcionDe, oculto, eliminarAlquiler, ocultarAlquiler, planReinicio, reiniciarMiDemo, dejarAviso, NoSePuede } from './eliminar'
import './eliminar.css'

const ir = (r: string) => { location.hash = r }
function textoError(e: unknown, a: Alquiler | undefined, boton: string) {
  if (e instanceof NoSePuede) return e.message === 'ya-no-esta' ? T.errNoEsta : e.message === 'no-es-tuyo' ? T.errNoEsTuyo : a?.dosPersonas && a.inquilinoUnido ? T.errUnido : T.errDeposito
  const m = e instanceof Error ? e.message : ''
  if (/aceptó la invitación|Ya no se puede eliminar/.test(m)) return a?.inquilinoUnido ? T.errUnido : T.errDeposito
  if (/depósito guardado/.test(m)) return T.errDeposito
  return T.errRed(boton)
}

/** Tarjeta al final del alquiler (columna lateral en computadora; al final en el teléfono). */
export function MasOpciones({ a, u }: { a: Alquiler; u: Usuario }) {
  const op = opcionDe(a, u.email); const [error, setError] = useState('')
  if (!op) return null
  const yaOculto = oculto(a, u.email)
  const mostrar = () => ocultarAlquiler(a.id, u.email, false, a).catch(e => setError(textoError(e, a, T.botonMostrar)))
  return <section className="glass tarjeta ea-mas" aria-labelledby="ea-mas-t"><h3 id="ea-mas-t">{T.mas}</h3>
    {op === 'eliminar' && <><p className="nota">{T.puedeEliminar}</p><a className="ea-enlace-peligro" href={`#/alquiler/${a.id}/eliminar`}>{T.botonEliminar}</a></>}
    {op === 'ocultar' && (yaOculto ? <><p className="nota">{T.estaOculto}</p><button type="button" className="boton boton--secundario boton--chico" onClick={mostrar}>{T.botonMostrar}</button></>
      : <><p className="nota">{T.puedeOcultar}</p><a className="boton boton--secundario boton--chico" href={`#/alquiler/${a.id}/ocultar`}>{T.botonOcultar}</a></>)}
    {op === 'esperar' && <p className="nota ea-esperar" role="note">{T.esperar}</p>}
    {error && <p className="ea-error" role="alert">{error}</p>}
  </section>
}

const Resumen = ({ a }: { a: Alquiler }) => <div className="ea-resumen"><strong>{a.direccion}</strong><span>{usd(a.monto)} · {fecha(a.inicio)} → {fecha(a.fin)}</span></div>

/** Un paso: confirmar eliminar u ocultar. */
export function ConfirmarAlquiler({ id, u, que }: { id: string; u: Usuario; que: 'eliminar' | 'ocultar' }) {
  useAlquileres(); const a = obtener(id)
  const [error, setError] = useState(''), [ocupado, setOcupado] = useState(false)
  const boton = que === 'eliminar' ? T.si : T.siOcultar
  const volver = <a href={`#/alquiler/${id}`} className="volver">← {T.no}</a>
  if (!a) return <main id="contenido" tabIndex={-1} className="cont cont--form ea"><a href="#/" className="volver">← Tus alquileres</a><p className="ea-error" role="alert">{T.errNoEsta}</p></main>
  const hacer = async () => {
    setOcupado(true); setError('')
    try {
      if (que === 'eliminar') { const d = await eliminarAlquiler(id, u.email, a); dejarAviso(T.listoEliminar(d)) }
      else { await ocultarAlquiler(id, u.email, true, a); dejarAviso(T.listoOcultar(a.direccion)) }
      ir('/')
    } catch (e) { setError(textoError(e, a, boton)); setOcupado(false) }
  }
  // Si ya no corresponde (p. ej. se abrió el enlace después del depósito), se explica en vez de pedir confirmación.
  const op = opcionDe(a, u.email), vale = que === 'eliminar' ? op === 'eliminar' : op === 'ocultar' && !oculto(a, u.email)
  if (!vale) return <main id="contenido" tabIndex={-1} className="cont cont--form ea">{volver}
    <section className="glass glass--fuerte tarjeta" aria-labelledby="ea-t"><h1 id="ea-t" className="h2">{que === 'eliminar' ? T.tituloEliminar : T.tituloOcultar}</h1><Resumen a={a} />
      <p className="ea-error" role="alert">{op === null ? T.errNoEsTuyo : que === 'ocultar' && oculto(a, u.email) ? T.estaOculto : a.dosPersonas && a.inquilinoUnido && op === 'ocultar' ? T.errUnido : que === 'eliminar' ? T.errDeposito : T.esperar}</p>
      <div className="ea-botones"><a className="boton boton--primario" href={`#/alquiler/${id}`}>{T.volverAlquiler}</a></div></section></main>
  return <main id="contenido" tabIndex={-1} className="cont cont--form ea">{volver}
    <section className="glass glass--fuerte tarjeta" role="alertdialog" aria-labelledby="ea-t">
      <h1 id="ea-t" className="h2">{que === 'eliminar' ? T.tituloEliminar : T.tituloOcultar}</h1>
      <Resumen a={a} />
      <ul className="ea-puntos">{(que === 'eliminar' ? T.eliminarPuntos(!!a.dosPersonas) : T.ocultarPuntos).map(t => <li key={t}>{t}</li>)}</ul>
      {error && <p className="ea-error" role="alert">{error}</p>}
      <div className="ea-botones">
        <button type="button" className={'boton ' + (que === 'eliminar' ? 'ea-peligro' : 'boton--primario')} disabled={ocupado} onClick={hacer}>{boton}</button>
        <a className="boton boton--secundario" href={`#/alquiler/${id}`}>{T.no}</a></div>
    </section></main>
}

const Lista = ({ t, xs }: { t: string; xs: Alquiler[] }) => xs.length ? <li>{t}<ul>{xs.map(a => <li key={a.id}>{a.direccion}</li>)}</ul></li> : null

/** Un paso: confirmar «Reiniciar mi demo» (reemplaza el confirm() del navegador). */
export function ConfirmarReinicio({ u }: { u: Usuario }) {
  const todos = useAlquileres(); const p = planReinicio(todos, u.email)
  const [error, setError] = useState(''), [ocupado, setOcupado] = useState(false)
  const nada = !p.eliminar.length && !p.ocultar.length && !p.quedan.length
  const hacer = async () => {
    setOcupado(true); setError('')
    try { const r = await reiniciarMiDemo(u.email, todos); dejarAviso(T.listoReiniciar(r.eliminados, r.ocultos) + (r.quedan ? ' ' + T.listoQuedan(r.quedan) : '')); ir('/') }
    catch (e) { setError(textoError(e, undefined, T.siReiniciar)); setOcupado(false) }
  }
  return <main id="contenido" tabIndex={-1} className="cont cont--form ea"><a href="#/" className="volver">← {T.no}</a>
    <section className="glass glass--fuerte tarjeta" role="alertdialog" aria-labelledby="ea-r">
      <h1 id="ea-r" className="h2">{T.tituloReiniciar}</h1>
      <p>{T.reiniciarIntro}</p>
      {nada ? <p className="nota">{T.reiniciarNada}</p> : <ul className="ea-puntos">
        <Lista t={T.reiniciarEliminar(p.eliminar.length)} xs={p.eliminar} />
        <Lista t={T.reiniciarOcultar(p.ocultar.length)} xs={p.ocultar} />
        <Lista t={T.reiniciarQuedan(p.quedan.length)} xs={p.quedan} /></ul>}
      {error && <p className="ea-error" role="alert">{error}</p>}
      <div className="ea-botones">
        {!nada && <button type="button" className="boton ea-peligro" disabled={ocupado} onClick={hacer}>{T.siReiniciar}</button>}
        <a className="boton boton--secundario" href="#/">{T.no}</a></div>
    </section></main>
}

/** Aviso del resultado, arriba de la lista (se cierra con «Cerrar aviso»). */
export function AvisoLista({ texto, cerrar }: { texto: string; cerrar: () => void }) {
  return <div className="glass tarjeta ea-aviso" role="status"><p><span aria-hidden="true">✓</span> {texto}</p>
    <button type="button" className="boton-icono" aria-label={T.cerrar} onClick={cerrar}>×</button></div>
}
