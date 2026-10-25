import { useEffect } from 'react'
import { docs, fechaLegible } from './documentos'

/** Página de un texto legal (/terminos, /privacidad…). Se ve con o sin sesión. */
export function PaginaLegal({ slug }: { slug: string }) {
  const d = docs()[slug]
  useEffect(() => { document.title = d ? `${d.titulo} · Lockumi` : 'Lockumi'; window.scrollTo(0, 0) }, [d])
  if (!d) return <main id="contenido" tabIndex={-1} className="cont legal"><p>Esta página no existe.</p><p><a href="/">Volver a Lockumi</a></p></main>
  const f = fechaLegible(d.fecha)
  return <main id="contenido" tabIndex={-1} className="cont legal">
    <header className="legal__cab">
      <a href="/" className="logo" aria-label="Lockumi, ir al inicio"><img src="/img/logo-lockumi.svg" alt="" /></a>
      <a href="/" className="legal__volver">Volver a la app</a>
    </header>
    <article className="legal__doc">
      {/* Decisión de Katherine: la marca de revisión por abogado se ve siempre; si el texto no la trae, va como aviso discreto. */}
      {!d.revisionAbogado && <p className="legal__revision" role="note">Pendiente de revisión por abogado</p>}
      {/* Versión y fecha una sola vez: si el texto ya las trae, no se repiten. */}
      {!d.metaEnTexto && <p className="legal__meta"><span>Versión: <strong>{d.version}</strong></span>{f && <span>Fecha: <strong>{f}</strong></span>}</p>}
      <div className="legal__texto" dangerouslySetInnerHTML={{ __html: d.html }} />
    </article>
  </main>
}
