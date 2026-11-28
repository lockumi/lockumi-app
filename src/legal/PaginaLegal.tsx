import { useEffect } from 'react'
import { docs, fechaLegible } from './documentos'
import { VerMas } from '../screens/Plegable'

/** Título y cita de la demo a la vista; el articulado, en «Ver más». Las palabras del HTML no cambian. */
function partirLegal(html: string) {
  const marca = '</blockquote>'
  const i = html.indexOf(marca)
  if (i < 0) return { visible: html, resto: '' }
  const corte = i + marca.length
  return { visible: html.slice(0, corte), resto: html.slice(corte).trim() }
}

/** Página de un texto legal (/terminos, /privacidad…). Se ve con o sin sesión. */
export function PaginaLegal({ slug }: { slug: string }) {
  const d = docs()[slug]
  useEffect(() => { document.title = d ? `${d.titulo} · Lockumi` : 'Lockumi'; window.scrollTo(0, 0) }, [d])
  if (!d) return <main id="contenido" tabIndex={-1} className="cont legal"><p>Esta página no existe.</p><p><a href="/">Volver a Lockumi</a></p></main>
  const f = fechaLegible(d.fecha)
  const partes = partirLegal(d.html)
  return <main id="contenido" tabIndex={-1} className="cont legal">
    <header className="legal__cab">
      <a href="/" className="logo" aria-label="Lockumi, ir al inicio"><img src="/img/logo-header.png" alt="" /><span className="logo__nombre">Lockumi</span></a>
      <a href="/" className="legal__volver">Volver a la app</a>
    </header>
    <article className="legal__doc">
      {/* Decisión de Katherine: la marca de revisión por abogado se ve siempre; si el texto no la trae, va como aviso discreto. */}
      {!d.revisionAbogado && <p className="legal__revision" role="note">Pendiente de revisión por abogado</p>}
      {/* Versión y fecha una sola vez: si el texto ya las trae, no se repiten. */}
      {!d.metaEnTexto && <p className="legal__meta"><span>Versión: <strong>{d.version}</strong></span>{f && <span>Fecha: <strong>{f}</strong></span>}</p>}
      <div className="legal__texto">
        <div dangerouslySetInnerHTML={{ __html: partes.visible }} />
        {partes.resto && <VerMas etiqueta="Ver más"><div dangerouslySetInnerHTML={{ __html: partes.resto }} /></VerMas>}
      </div>
    </article>
  </main>
}
