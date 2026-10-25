// Contrato del alquiler: el resumen (cabecera, «El alquiler», «Partes» y pie) siempre visible en el detalle (antes y después de
// firmar); el resto (Reglas, El depósito, 7 días para reclamos, Mediación y Firmas) plegado por defecto tras «Ver contrato completo»
// (maqueta producto/contrato-plegable, 22/10/2026). Empieza cerrado cada vez (no se recuerda el estado). La versión para imprimir
// o guardar como PDF desde el navegador (window.print, sin generar archivos) es SIEMPRE la completa. Todo sale de los datos que ya están en este navegador:
// el lugar y las fotos no se envían a ningún lado para mostrarlo o imprimirlo.
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { modoPrueba } from '../servidor/config'
import { NOMBRE_ROL, type Alquiler, type Rol } from '../types'
import { usd, fecha, fechaHora, Icono } from '../ui'
import { DUENO_PRUEBA } from './Real'

const ROLES: Rol[] = ['dueno', 'inquilino']
const parte = (a: Alquiler, r: Rol) => r === 'dueno' ? (modoPrueba ? DUENO_PRUEBA : a.duenoEmail) : a.inquilinoEmail

export const TEXTO_VER = 'Ver contrato completo'
export const TEXTO_OCULTAR = 'Ocultar contrato completo'
export const TEXTO_CONTENIDO = 'Reglas, depósito, reclamos, mediación y firmas'

/** Plegado: solo en pantalla. `impresion` siempre muestra todo (y con @media print lo plegado también se imprime). */
type Plegado = { abierto: boolean; alternar: () => void; id: string }

export function Documento({ a, impresion, plegado }: { a: Alquiler; impresion?: boolean; plegado?: Plegado }) {
  const f = a.contrato.firmas
  const firmado = ROLES.every(r => f[r])
  const completo = <>
    <section className="ct__sec"><h3>Reglas</h3>
      {a.reglas.length > 0 ? <ul className="ct__reglas">{a.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="ct__texto">Sin reglas adicionales.</p>}
    </section>

    <section className="ct__sec"><h3>El depósito</h3>
      {/* Texto que ya mostraba la app en «El contrato». */}
      {/* LEGAL: revisado (24/10) */}
      <p className="ct__texto">El depósito queda guardado hasta el final. Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.</p>
    </section>

    <section className="ct__sec"><h3>7 días para reclamos</h3>
      {/* LEGAL: revisar. Resumen de la cláusula 6.5 de los Términos 1.6-demo. LEGAL: revisado (24/10) · «después de 7 días…» */}
      <p className="ct__texto">Al terminar el alquiler, el dueño tiene 7 días para hacer un reclamo, con fotos y una factura o un presupuesto. Si no reclama, después de 7 días el depósito se devuelve completo al inquilino. El inquilino tiene 7 días para responder.</p>
    </section>

    <section className="ct__sec"><h3>Mediación</h3>
      {/* LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide. Resumen de la cláusula 6.7 de los Términos 1.6-demo. */}
      <p className="ct__texto">Si no se ponen de acuerdo, una persona mediadora revisa con ustedes las fotos de entrada y de salida y les ayuda a buscar un acuerdo sobre el reparto del depósito. No decide por ustedes.{modoPrueba ? ' En esta prueba, la mediación es una simulación y el reparto se elige con el botón «Resolver el reclamo (simulación)».' : ''}</p>
    </section>

    <section className="ct__sec"><h3>Firmas</h3>
      <ul className="ct__firmas">{ROLES.map(r => <li key={r}>
        <span className="ct__firma-quien">{NOMBRE_ROL[r]}<small>{parte(a, r)}</small></span>
        {f[r] ? <span className="ct__firma-ok">Firmó el {fechaHora(f[r]!)}</span> : <span className="ct__firma-pend">Pendiente</span>}
      </li>)}</ul>
    </section>
  </>
  return <article className={'ct' + (impresion ? ' ct--impresion' : '')} aria-labelledby={impresion ? undefined : 'ct-titulo'}>
    <header className="ct__cab">
      <p className="ct__marca">Lockumi{modoPrueba ? ' · Prueba en la red de prueba' : ''}</p>
      <h2 id={impresion ? undefined : 'ct-titulo'} className="ct__titulo">Contrato</h2>
      <p className="ct__estado"><span className={'ct__sello' + (firmado ? ' ct__sello--ok' : '')}>{firmado ? 'Firmado por los dos' : 'Pendiente de firmas'}</span>
        <span className="ct__ref">Referencia {a.id.slice(0, 8).toUpperCase()}</span></p>
    </header>

    <section className="ct__sec"><h3>El alquiler</h3>
      <dl className="ct__datos">
        <div className="ct__ancho"><dt>Lugar</dt><dd>{a.direccion}</dd></div>
        <div><dt>Depósito</dt><dd>{usd(a.monto)}</dd></div>
        <div><dt>Entrada</dt><dd>{fecha(a.inicio)}</dd></div>
        <div><dt>Salida</dt><dd>{fecha(a.fin)}</dd></div>
      </dl>
    </section>

    <section className="ct__sec"><h3>Partes</h3>
      <dl className="ct__datos ct__datos--partes">{ROLES.map(r => <div key={r}><dt>{NOMBRE_ROL[r]}</dt><dd>{parte(a, r)}</dd></div>)}</dl>
    </section>

    {plegado && !impresion ? <>
      <button type="button" className="cp-abrir" aria-expanded={plegado.abierto} aria-controls={plegado.id} onClick={plegado.alternar}>
        <span className="cp-abrir__txt">{plegado.abierto ? TEXTO_OCULTAR : <>{TEXTO_VER}<small>{TEXTO_CONTENIDO}</small></>}</span>
        <span className="cp-abrir__ico"><Icono id="i-chevron" /></span>
      </button>
      <div className="cp-completo" id={plegado.id} role="region" aria-label="Contrato completo" hidden={!plegado.abierto}>
        {completo}
      </div>
    </> : completo}

    {/* LEGAL: revisar. Resumen de las cláusulas 2.5 y 2.6 de los Términos 1.6-demo y de la línea de privacidad aprobada. */}
    <footer className="ct__pie">
      {modoPrueba && <p>Es una prueba en la red de prueba de Stellar, sin dinero real. No reemplaza un contrato de alquiler.</p>}
      <p>Este contrato se guarda solo en tu navegador. El lugar y las fotos no salen de él.</p>
    </footer>
  </article>
}

/** Contrato (resumen fijo y resto plegable) con el botón «Descargar o imprimir», que siempre imprime el contrato completo. El navegador abre su ventana de impresión, donde también se puede guardar como PDF.
 *  `completo`: sin plegar (lo usa el panel de «Ver contrato» del contrato compacto); el texto es el mismo. */
export function ContratoDoc({ a, completo: todo }: { a: Alquiler; completo?: boolean }) {
  const [imprimiendo, setImprimiendo] = useState(false)
  // Siempre empieza cerrado (no se guarda en ningún lado). Al imprimir con el menú del navegador, @media print muestra lo plegado
  // igual; además se abre aquí para que pantalla e impresión coincidan, y al terminar vuelve a como estaba.
  const [abierto, setAbierto] = useState(false)
  const id = 'ct-completo-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const actual = useRef(abierto)
  useEffect(() => { actual.current = abierto }, [abierto])
  useEffect(() => {
    let antes: boolean | null = null
    const abrir = () => { antes = actual.current; setAbierto(true) }
    const volver = () => { if (antes !== null) { const v = antes; antes = null; setAbierto(v) } }
    addEventListener('beforeprint', abrir); addEventListener('afterprint', volver)
    return () => { removeEventListener('beforeprint', abrir); removeEventListener('afterprint', volver) }
  }, [])
  useEffect(() => {
    if (!imprimiendo) return
    const fin = () => { document.documentElement.classList.remove('imprimiendo'); setImprimiendo(false) }
    document.documentElement.classList.add('imprimiendo'); addEventListener('afterprint', fin, { once: true })
    const t = setTimeout(() => print(), 50)
    return () => { clearTimeout(t); removeEventListener('afterprint', fin); document.documentElement.classList.remove('imprimiendo') }
  }, [imprimiendo])
  return <div className="pila">
    {todo ? <Documento a={a} /> : <Documento a={a} plegado={{ abierto, alternar: () => setAbierto(v => !v), id }} />}
    <button type="button" className="boton boton--secundario boton--ancho ct__imprimir" onClick={() => setImprimiendo(true)}>Descargar o imprimir</button>
    <p className="nota centro">Se abre la ventana de impresión. Para descargarlo, elige «Guardar como PDF».</p>
    {imprimiendo && createPortal(<div className="impresion"><Documento a={a} impresion /></div>, document.body)}
  </div>
}
