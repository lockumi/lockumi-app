import { useAlquileres, store, rolDe } from '../store'
import { NOMBRE_ROL, ETIQUETA_ESTADO, type Usuario, type Alquiler, type Rol } from '../types'
import { Demo, Simulado, usd, fecha } from '../ui'
import { modoReal } from '../services/auth'
import { Billetera } from './Billetera'
import { modoSolo, modoVideo, dosPersonas } from '../servidor/config'
import { Dibujo } from './dibujos'
import { EntradaReputacion } from '../reputacion/Entrada'
import { useState } from 'react'
import { modoPrueba } from '../servidor/config'
import { esMio, oculto, tomarAviso } from '../prueba/eliminar'
import { AvisoLista } from '../prueba/Eliminar'
import { T as TE } from '../prueba/eliminar-textos'
import { ETAPAS, etapaDe } from '../flujo'
import { ordenarInicio } from './inicio-lista'

function Avance({ a }: { a: Alquiler }) {
  const i = etapaDe(a)
  return <div className="ini-avance">
    <span>Paso {i + 1} de {ETAPAS.length}</span>
    <span className="ini-avance__etapa">{ETAPAS[i]}</span>
    <div className="ini-barra" aria-hidden="true">{ETAPAS.map((_, n) => <span key={n} className={n < i ? 'hecho' : n === i ? 'actual' : ''} />)}</div>
  </div>
}

function ChipRol({ rol }: { rol: Rol }) {
  return <span className={'chip chip--mini ' + (rol === 'dueno' ? 'chip--dueno' : 'chip--inquilino')}><Dibujo n={rol === 'dueno' ? 'casa' : 'persona'} />{NOMBRE_ROL[rol]}</span>
}

export function Inicio({ u }: { u: Usuario }) {
  const todosGuardados = useAlquileres()
  const [aviso, setAviso] = useState(tomarAviso), [verOcultos, setVerOcultos] = useState(false)
  const mios = modoPrueba ? todosGuardados.filter(a => esMio(a, u.email)) : todosGuardados
  const ocultos = mios.filter(a => oculto(a, u.email))
  const todos = verOcultos ? mios : mios.filter(a => !oculto(a, u.email))
  const { principal, resto } = ordenarInicio(todos, u.email)
  return <main id="contenido" tabIndex={-1} className="cont ini">
    <div className="ini-cab">
      <h1>Tus alquileres</h1>
      <a className="ini-mas" href="#/crear" data-recorrido="nuevo" aria-label="Nuevo alquiler">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </a>
    </div>
    {modoSolo && <p className="nota">Prueba real en la red de prueba de Stellar, sin dinero real: creas un alquiler, depositas USDC de prueba como inquilino y un dueño de prueba de Lockumi aprueba la devolución.</p>}
    {aviso && <AvisoLista texto={aviso} cerrar={() => setAviso(null)} />}
    {(modoReal || (import.meta.env.DEV && localStorage.getItem('lockumi.billetera.prueba'))) && <Billetera />}
    {import.meta.env.VITE_REPUTACION === '1' && <EntradaReputacion email={u.email} />}
    {todos.length === 0 && <div className="glass tarjeta vacio"><img className="entrada-app__escena" src="/img/bienvenida-escena.png" alt="" /><p>Todavía no hay alquileres.</p></div>}
    {principal && <div className="ini-lista">
      <a className="glass ini-principal" href={'#/alquiler/' + principal.id}>
        <div className="ini-principal__top"><h2 className="h3">{principal.direccion}</h2><ChipRol rol={rolDe(principal, u.email)} /></div>
        <p className="ini-monto">{usd(principal.monto)}</p>
        <p className="ini-monto-et">depósito</p>
        <p className="ini-fechas"><Dibujo n="cal" />{fecha(principal.inicio)} → {fecha(principal.fin)}</p>
        <Avance a={principal} />
      </a>
      {resto.length > 0 && <ul className="ini-resto">
        {resto.map(a => <li key={a.id}><a className="glass ini-compacta" href={'#/alquiler/' + a.id}>
          <span className="ini-compacta__tit"><strong>{a.direccion}</strong><ChipRol rol={rolDe(a, u.email)} /></span>
          <span className="ini-compacta__meta">{usd(a.monto)} · {ETIQUETA_ESTADO[a.estado]}</span>
          {verOcultos && oculto(a, u.email) && <span className="chip chip--neutro chip--mini">{TE.chipOculto}</span>}
          <Dibujo n="der" className="ini-ir" />
        </a></li>)}
      </ul>}
      <a className="boton boton--primario ini-seguir" href={'#/alquiler/' + principal.id}>Continuar paso {etapaDe(principal) + 1}</a>
    </div>}
    {ocultos.length > 0 && <p className="ea-ocultos"><button type="button" className="boton boton--secundario boton--chico" aria-pressed={verOcultos} onClick={() => setVerOcultos(v => !v)}>{verOcultos ? TE.esconderOcultos : TE.verOcultos(ocultos.length)}</button></p>}
    <div className="pie nota"><span>{modoSolo ? 'Tus alquileres de prueba se guardan solo en este navegador. El depósito, la aprobación y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales.' : modoVideo ? <>{dosPersonas ? 'Tus alquileres de prueba se guardan en tu cuenta.' : 'Tus alquileres de prueba se guardan solo en este navegador.'} El depósito, el reclamo y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales. La persona mediadora es simulada. <Simulado /></> : <>En la demo ves todos los alquileres. Los datos son de ejemplo, ficticios, y se guardan solo en este navegador. <Demo /></>}</span>
      {modoPrueba ? <a className="boton boton--secundario boton--chico" href="#/reiniciar">{TE.botonReiniciar}</a>
        : <button type="button" className="boton boton--secundario boton--chico" onClick={() => { if (confirm('¿Reiniciar la demo? Se borran los cambios.')) store.reiniciar() }}>Reiniciar demo</button>}</div>
  </main>
}
