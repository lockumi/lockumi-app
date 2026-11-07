import { useState } from 'react'
import type { Usuario } from '../types'
import { abrirRecorrido } from '../recorrido'
import { NOTA_AYUDA, preguntasVisibles, TEMAS, type TemaAyuda } from './ayuda-datos'

export function Ayuda({ u }: { u: Usuario }) {
  const [filtro, setFiltro] = useState<TemaAyuda | null>(null)
  const lista = preguntasVisibles(filtro)
  return <main id="contenido" tabIndex={-1} className="cont ayuda">
    <h1>¿Cómo te ayudamos?</h1>
    <p className="nota" role="note">{NOTA_AYUDA}</p>
    <button type="button" className="boton boton--secundario" onClick={e => abrirRecorrido(u, { quien: e.currentTarget })}>Ver el recorrido</button>
    <div className="ayuda__temas" role="group" aria-label="Temas">
      {TEMAS.map(t => <button type="button" key={t.id} className="boton boton--secundario boton--chico" aria-pressed={filtro === t.id} onClick={() => setFiltro(f => f === t.id ? null : t.id)}>{t.texto}</button>)}
    </div>
    <div className="ayuda__lista">
      {lista.map(p => <details key={p.id} className="glass tarjeta ayuda__item">
        <summary>{p.pregunta}</summary>
        <p>{p.respuesta}</p>
        <p><a href={p.enlace.href}>{p.enlace.texto}</a></p>
      </details>)}
    </div>
  </main>
}
