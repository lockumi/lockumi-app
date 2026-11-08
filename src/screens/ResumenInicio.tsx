import { useAlquileres, useEstadoAlquileres, rolDe } from '../store'
import { modoPrueba } from '../servidor/config'
import { esMio, oculto } from '../prueba/eliminar'
import { NOMBRE_ROL, type Usuario, type Alquiler, type Rol } from '../types'
import { usd } from '../ui'
import { ETAPAS, etapaDe, pasoTexto } from '../flujo'
import { lugarContrato } from './Detalle'
import { copiaTarea, enCursoSinTarea, esperas, saldosDe, tareasPropias, textoEnCurso, textoEspera, textoPendientes } from './inicio-resumen'

function visiblesDe(lista: Alquiler[], email: string) {
  const mios = modoPrueba ? lista.filter(a => esMio(a, email)) : lista
  return mios.filter(a => !oculto(a, email))
}

function Barras({ a }: { a: Alquiler }) {
  const i = etapaDe(a)
  return <div className="ini-barra res-barras" aria-hidden="true">{ETAPAS.map((_, n) => <span key={n} className={n < i ? 'hecho' : n === i ? 'actual' : ''} />)}</div>
}

export function ResumenInicio({ u }: { u: Usuario }) {
  const estado = useEstadoAlquileres()
  const lista = visiblesDe(useAlquileres(), u.email)
  if (estado === 'cargando') return <main id="contenido" tabIndex={-1} className="cont res"><h1>Inicio</h1><p className="res-sub">Tus depósitos y próximos pasos</p><p role="status">Cargando tus alquileres…</p></main>
  if (estado === 'error') return <main id="contenido" tabIndex={-1} className="cont res"><h1>Inicio</h1><p className="res-sub">Tus depósitos y próximos pasos</p><p role="alert">No se pudieron leer los alquileres. No hay importes para mostrar.</p></main>
  const saldos = saldosDe(lista)
  const tareas = tareasPropias(lista, u.email)
  const espera = esperas(lista, u.email)
  const curso = enCursoSinTarea(lista, u.email)
  const vacio = lista.length === 0
  const tarea = tareas[0]
  return <main id="contenido" tabIndex={-1} className="cont res">
    <h1>Inicio</h1>
    <p className="res-sub">Tus depósitos y próximos pasos</p>
    <section className="glass res-saldos" aria-label="Depósitos">
      <p className="res-saldos__et">Importe previsto</p>
      <p className="res-saldos__n">{usd(saldos.previsto)}</p>
      <div className="res-saldos__par">
        <p className="res-caja res-caja--custodia"><span>En custodia</span><strong>{usd(saldos.custodia)}</strong></p>
        <p className="res-caja res-caja--pendiente"><span>Por depositar</span><strong>{usd(saldos.porDepositar)}</strong></p>
      </div>
      {saldos.porDepositar > 0 && <p className="res-saldos__nota">Lo pendiente aún no está en custodia.</p>}
      {saldos.sinImporte > 0 && <p className="res-saldos__nota">Falta el importe de {saldos.sinImporte === 1 ? 'un alquiler' : `${saldos.sinImporte} alquileres`}. No entra en estas sumas.</p>}
    </section>
    {vacio ? <Vacio /> : tarea ? <Siguiente tarea={tarea} n={tareas.length} email={u.email} /> : <Actividad espera={espera} curso={curso} email={u.email} />}
    {!vacio && <a className="boton boton--secundario boton--ancho res-lista" href="#/alquileres">Ver mis alquileres</a>}
    <p className="res-pie">{vacio ? 'El listado estará en Alquileres.' : 'El listado completo está en Alquileres.'}</p>
  </main>
}

function Vacio() {
  return <section className="res-bloque">
    <h2>Para empezar</h2>
    <div className="glass res-tarjeta">
      <h3>Todavía sin alquileres</h3>
      <p>Cuando crees uno o aceptes una invitación, aquí verás tus depósitos y próximos pasos.</p>
      <a className="boton boton--primario boton--ancho" href="#/crear" data-recorrido="nuevo">Crear alquiler</a>
    </div>
  </section>
}

function Siguiente({ tarea, n, email }: { tarea: Alquiler; n: number; email: string }) {
  const rol = rolDe(tarea, email)
  const copia = copiaTarea(tarea, email)
  const { titulo } = lugarContrato(tarea.direccion)
  return <section className="res-bloque">
    <div className="res-bloque__cab"><h2>Tu siguiente paso</h2><span className="chip chip--coral">{textoPendientes(n)}</span></div>
    <div className="glass res-tarjeta">
      <div className="res-tarjeta__top"><span className={'chip ' + (rol === 'dueno' ? 'chip--dueno' : 'chip--inquilino')}>{NOMBRE_ROL[rol]}</span><span className="res-paso">{pasoTexto(tarea)}</span></div>
      <h3>{titulo}</h3>
      <p className="res-titulo">{copia.titulo}</p>
      <p>{copia.texto}</p>
      <Barras a={tarea} />
      <a className="boton boton--primario boton--ancho" href={'#/alquiler/' + tarea.id}>{copia.boton}</a>
    </div>
  </section>
}

function Actividad({ espera, curso, email }: { espera: Alquiler[]; curso: number; email: string }) {
  const linea = textoEnCurso(curso)
  return <section className="res-bloque">
    <div className="res-bloque__cab"><h2>Tu actividad</h2><span className="chip chip--neutro">Sin tareas</span></div>
    <div className="glass res-tarjeta">
      <h3>Estás al día</h3>
      <p>No tienes acciones pendientes para ti.</p>
      {espera.length > 0 && <ul className="res-esperas">{espera.map(a => <Espera key={a.id} a={a} email={email} />)}</ul>}
      {linea && <p className="res-curso">{linea}</p>}
    </div>
  </section>
}

function Espera({ a, email }: { a: Alquiler; email: string }) {
  const rol: Rol = rolDe(a, email)
  const { titulo } = lugarContrato(a.direccion)
  return <li>
    <span className="res-casa" aria-hidden="true"><svg className="ico" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></svg></span>
    <span><strong>{titulo} · {NOMBRE_ROL[rol]}</strong><span>{textoEspera(a, email)}</span></span>
  </li>
}
