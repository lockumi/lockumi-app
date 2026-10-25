import { useAlquileres, store, rolDe } from '../store'
import { abrirRecorrido } from '../recorrido'
import { LogoAnimado } from '../LogoAnimado'
import { NOMBRE_ROL } from '../types'
import { ETIQUETA_ESTADO, type Usuario } from '../types'
import { Demo, Simulado, usd, fecha } from '../ui'
import { modoReal } from '../services/auth'
import { Billetera } from './Billetera'
import { modoSolo, modoVideo } from '../servidor/config'
import { turno } from '../flujo'
import { ICONO_ESTADO, claseEstado } from '../estados'
import { Dibujo } from './dibujos'

// Los 3 pasos de la portada, en el orden real de flujo.ts (ETAPAS): las fotos de entrada van después del depósito.
const PASOS = [
  { ico: 'contrato', t: 'Firman el contrato', s: 'Los dos, en la app' },
  { ico: 'escudo', t: 'Pagar el depósito', s: 'Luego, fotos de entrada' },   // LEGAL: revisado (24/10)
  { ico: 'devolver', t: 'Devolución al final', s: 'Con 7 días para reclamos' },
]

export function Inicio({ u }: { u: Usuario }) {
  const todos = useAlquileres()
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    {modoSolo ? <div className="hero glass">
      <div><p className="etiqueta">Hola, {u.nombre}</p><h1>Tus alquileres</h1>
        <p className="nota">Prueba real en la red de prueba de Stellar, sin dinero real: creas un alquiler, depositas USDC de prueba como inquilino y un dueño de prueba de Lockumi aprueba la devolución.</p></div>
      <a className="boton boton--primario" href="#/crear" data-recorrido="nuevo">+ Nuevo alquiler</a>
      <LogoAnimado className="logo-pieza logo-pieza--hero" />
    </div> : <div className="hero glass ta-hero">
      <div className="ta-hero__txt"><div className="ta-cab"><p className="etiqueta">Hola, {u.nombre}</p><h1>Tus alquileres</h1></div></div>
      <a className="boton boton--primario" href="#/crear" data-recorrido="nuevo">+ Nuevo alquiler</a>
      <LogoAnimado className="logo-pieza logo-pieza--hero" />
      <ol className="ta-pasos" aria-label="Cómo funciona">{PASOS.map(p => <li key={p.t}><span className="ta-pasos__ico"><Dibujo n={p.ico} /></span><strong>{p.t}</strong><span>{p.s}</span></li>)}</ol>
    </div>}
    {(modoReal || (import.meta.env.DEV && localStorage.getItem('lockumi.billetera.prueba'))) && <Billetera />}
    {/* Volver a ver el recorrido (maqueta aprobada; LEGAL: revisado el 23/10) */}
    <section className="glass tarjeta primera-vez" aria-labelledby="pv-t">
      <div><h2 id="pv-t">¿Primera vez?</h2><p className="nota">Mira cómo funciona en 1 minuto.</p></div>
      <button type="button" className="boton boton--secundario" onClick={e => abrirRecorrido(u, { quien: e.currentTarget })}>Ver el recorrido</button>
    </section>
    {todos.length === 0 && <div className="glass tarjeta"><p>Todavía no hay alquileres.</p></div>}
    <ul className="rejilla" role="list">
      {todos.map(a => { const rol = rolDe(a, u.email), ico = ICONO_ESTADO[a.estado]
        return <li key={a.id}><a className={'glass tarjeta alquiler ta-tar ' + claseEstado(a.estado)} href={'#/alquiler/' + a.id}>
          <div className="ta-tar__top"><span className="ta-sello"><Dibujo n={ico} /></span>
            <div className="ta-tar__tit"><h2 className="h3">{a.direccion}</h2><span className="ta-estado"><Dibujo n={ico} />{ETIQUETA_ESTADO[a.estado]}</span></div>
            <Dibujo n="der" className="ta-ir" /></div>
          <p className="ta-turno">{turno(a, rol).tu}</p>
          <div className="ta-datos"><div><small>Depósito</small><strong>{usd(a.monto)}</strong></div>
            <div><small>Fechas</small><span className="ta-fechas"><Dibujo n="cal" />{fecha(a.inicio)} → {fecha(a.fin)}</span></div></div>
          <p className="nota ta-rol"><span className="chip chip--neutro chip--mini"><Dibujo n="persona" />Eres {NOMBRE_ROL[rol].toLowerCase()}</span><span>{rol === 'dueno' ? 'Inquilino: ' + a.inquilinoEmail : 'Dueño: ' + a.duenoEmail}</span></p>
        </a></li> })}
    </ul>
    <div className="pie nota"><span>{modoSolo ? 'Tus alquileres de prueba se guardan solo en este navegador. El depósito, la aprobación y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales.' : modoVideo ? <>Tus alquileres de prueba se guardan solo en este navegador. El depósito, el reclamo y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales. La persona mediadora es simulada. <Simulado /></> : <>En la demo ves todos los alquileres. Los datos son de ejemplo, ficticios, y se guardan solo en este navegador. <Demo /></>}</span>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => { if (confirm('¿Reiniciar la demo? Se borran los cambios.')) store.reiniciar() }}>Reiniciar demo</button></div>
  </main>
}
