import { useAlquileres } from '../store'
import { fecha } from '../ui'
import type { Usuario } from '../types'
import { avisosVisibles, marcarAvisoAbierto } from './avisos-datos'

export function Avisos({ u }: { u: Usuario }) {
  const items = avisosVisibles(useAlquileres(), u.email)
  return <main id="contenido" tabIndex={-1} className="cont avisos-centro">
    <h1>Avisos</h1>
    {items.length === 0 ? <div className="glass tarjeta avisos-centro__vacio estado-vacio__caja"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" /><path d="M10 18a2 2 0 0 0 4 0" /></svg><p>Todavía no hay avisos.</p></div> : <ul className="avisos-centro__lista">
      {items.map(item => <li key={item.alquilerId + item.aviso.id}>
        <a className={'glass tarjeta avisos-centro__item' + (item.aviso.dia === 'reparacion' ? ' avisos-centro__item--salida' : '') + (item.aviso.abierto ? '' : ' avisos-centro__item--nuevo')} href={'#/alquiler/' + item.alquilerId} onClick={() => marcarAvisoAbierto(item.alquilerId, item.aviso.id)}>
          <span className="avisos-centro__fila"><strong>{item.aviso.asunto}</strong>{!item.aviso.abierto && <span className="chip chip--coral chip--mini">Nuevo</span>}</span>
          <span>{item.direccion}</span>
          <time dateTime={item.aviso.entregado}>{fecha(item.aviso.entregado)}</time>
          <svg className="ico avisos-centro__ir" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </a>
      </li>)}
    </ul>}
  </main>
}
