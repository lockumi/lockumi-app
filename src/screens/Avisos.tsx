import { useAlquileres } from '../store'
import { fecha } from '../ui'
import type { Usuario } from '../types'
import { avisosVisibles, marcarAvisoAbierto } from './avisos-datos'

export function Avisos({ u }: { u: Usuario }) {
  const items = avisosVisibles(useAlquileres(), u.email)
  return <main id="contenido" tabIndex={-1} className="cont avisos-centro">
    <h1>Avisos</h1>
    {items.length === 0 ? <p className="glass tarjeta avisos-centro__vacio">Todavía no hay avisos.</p> : <ul className="avisos-centro__lista">
      {items.map(item => <li key={item.alquilerId + item.aviso.id}>
        <a className={'glass tarjeta avisos-centro__item' + (item.aviso.dia === 'reparacion' ? ' avisos-centro__item--salida' : '')} href={'#/alquiler/' + item.alquilerId} onClick={() => marcarAvisoAbierto(item.alquilerId, item.aviso.id)}>
          <strong>{item.aviso.asunto}</strong>
          <span>{item.direccion}</span>
          <time dateTime={item.aviso.entregado}>{fecha(item.aviso.entregado)}</time>
          {!item.aviso.abierto && <span className="chip chip--coral chip--mini">Nuevo</span>}
        </a>
      </li>)}
    </ul>}
  </main>
}
