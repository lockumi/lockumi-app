import { useAlquileres, useEstadoAlquileres, rolDe } from '../store'
import { modoPrueba } from '../servidor/config'
import { esMio, oculto } from '../prueba/eliminar'
import { ETIQUETA_ESTADO, NOMBRE_ROL, type Usuario, type Alquiler, type Foto } from '../types'
import { usd, fecha, Lugar } from '../ui'
import { ETAPAS, etapaDe } from '../flujo'
import { claseEstado } from '../estados'
import { activos, tareasPropias } from './inicio-resumen'
import { ordenarInicio } from './inicio-lista'

const CASA = '/img/katherine/01-casa-simple-arbol.png'
const ARBOL = '/img/katherine/04-arbol.png'
const HOJAS = '/img/katherine/11-hojas.png'
const HOJAS_ESCENA = '/img/katherine/11-hojas-sin-derecha.png'
const PAISAJE = '/img/katherine/12-paisaje.png'
const EDIFICIO = '/img/katherine/02-edificio-moderno.png'
const ICO_CAL = ['M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M8 3v4', 'M16 3v4', 'M3 10h18']
const ICO_PERSONA = ['M12 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M6 19.5c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5']
const ICO_ESCUDO = ['M12 3 5 6v6c0 4.2 2.8 6.8 7 8.5 4.2-1.7 7-4.3 7-8.5V6l-7-3z']
const ICO_CHEV = ['m9 6 6 6-6 6']
const ICO_SOBRE = ['M3 6h18v12H3z', 'm3 7 9 7 9-7']
const ICO_RAYO = ['M13 2 4 14h7l-1 8 9-12h-7z']
const ICO_HOJA = ['M5 19c8 0 14-8 14-14-6 0-14 6-14 14z', 'M8 16c2-3 5-6 9-8']
const LOGO = '/img/logo-header.png'

function visiblesDe(lista: Alquiler[], email: string) {
  const mios = modoPrueba ? lista.filter(a => esMio(a, email)) : lista
  return mios.filter(a => !oculto(a, email))
}

/** La misma tarjeta que ya tocaba continuar: la tarea propia, si hay; si no, el activo más urgente. */
function destacado(lista: Alquiler[], email: string): Alquiler | null {
  const tarea = tareasPropias(lista, email)[0]
  if (tarea) return tarea
  const vivos = activos(lista)
  return ordenarInicio(vivos.length ? vivos : lista, email).principal
}

function fotoReal(a: Alquiler): string | null {
  const fotos: Foto[] = []
  for (const c of a.entrada?.cuartos ?? []) fotos.push(...c.fotos)
  for (const c of a.salida?.cuartos ?? []) fotos.push(...c.fotos)
  const real = fotos.find(f => f.src && f.origen !== 'ejemplo')
  return real?.src ?? null
}

function Ico({ d }: { d: string[] }) {
  return <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{d.map(p => <path key={p} d={p} />)}</svg>
}

function Escena() {
  return <div className="casa-escena" aria-hidden="true">
    <img className="casa-escena__paisaje" src={PAISAJE} alt="" />
    <img className="casa-escena__hojas" src={HOJAS_ESCENA} alt="" />
    <img className="casa-escena__arbol" src={ARBOL} alt="" />
    <img className="casa-escena__casa" src={CASA} alt="" />
  </div>
}

function Saludo({ nombre }: { nombre: string }) {
  return <header className="casa-saludo">
    <div className="casa-saludo__texto">
      <p className="casa-overline">Tu espacio</p>
      <h1 className="casa-hola">Hola, {nombre} <span aria-hidden="true">👋</span></h1>
      <p className="casa-saludo__sub">Todo en orden por aquí.</p>
    </div>
    <Escena />
  </header>
}

function Pasos({ a }: { a: Alquiler }) {
  const i = etapaDe(a)
  return <div className="casa-pasos">
    <p className="casa-pasos__txt"><span>Paso {i + 1} de {ETAPAS.length}</span><span className="casa-pasos__etapa">{ETAPAS[i]}</span></p>
    <div className="ini-barra" aria-hidden="true">{ETAPAS.map((_, n) => <span key={n} className={n < i ? 'hecho' : n === i ? 'actual' : ''} />)}</div>
  </div>
}

function Tarjeta({ a, email }: { a: Alquiler; email: string }) {
  const rol = rolDe(a, email)
  const foto = fotoReal(a)
  return <article className="glass casa-card">
    <div className="casa-card__top">
      <img className="casa-card__foto" src={foto ?? EDIFICIO} alt="" />
      <div className="casa-card__datos">
        <div className="casa-card__titulo-fila">
          <h3 className="casa-card__titulo"><Lugar texto={a.direccion} /></h3>
          <span className={'casa-estado ' + claseEstado(a.estado)}><i />{ETIQUETA_ESTADO[a.estado]}</span>
        </div>
        <p className="casa-meta"><Ico d={ICO_PERSONA} />{NOMBRE_ROL[rol]}</p>
        <p className="casa-meta casa-fechas"><Ico d={ICO_CAL} /><span>{fecha(a.inicio)} – {fecha(a.fin)}</span></p>
      </div>
    </div>
    <div className="casa-deposito">
      <div>
        <p className="casa-deposito__et">Depósito protegido</p>
        <p className="casa-monto">{usd(a.monto)}</p>
      </div>
      <span className="casa-escudo" aria-hidden="true"><Ico d={ICO_ESCUDO} /></span>
    </div>
    <Pasos a={a} />
    <a className="boton boton--primario boton--ancho" href={'#/alquiler/' + a.id}>Continuar proceso <Ico d={ICO_CHEV} /></a>
  </article>
}

function Nuevo({ ancho = false }: { ancho?: boolean }) {
  return <a className={'boton boton--secundario casa-nuevo' + (ancho ? ' boton--ancho' : '')} href="#/crear" data-recorrido="nuevo">+ Nuevo alquiler</a>
}

function ComoFunciona() {
  return <a className="casa-como" href="#/ayuda">
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></svg>
    Cómo funciona
  </a>
}

// LEGAL: pendiente. Copy de marketing del escritorio vacío (Katherine, 14/11). No es texto legal.
function Invitacion() {
  return <button type="button" className="boton casa-invitar" disabled title="Las invitaciones se abren con el enlace del correo. No hay una pantalla para aceptarlas sin ese enlace.">
    <Ico d={ICO_SOBRE} />Aceptar invitación
  </button>
}

function HeroVacio() {
  return <section className="casa-hero">
    <Escena />
    <h1>Tu próximo hogar empieza aquí.</h1>
    <p>Crea tu primer alquiler o acepta una invitación.</p>
    <div className="casa-hero__acciones">
      <a className="boton boton--primario" href="#/crear" data-recorrido="nuevo">+ Nuevo alquiler</a>
      <Invitacion />
    </div>
    <div className="casa-hero__sep" aria-hidden="true"><span /><img src={LOGO} alt="" /><span /></div>
    <ul className="casa-hero__beneficios">
      <li><Ico d={ICO_ESCUDO} />Seguro y confiable</li>
      <li><Ico d={ICO_RAYO} />Rápido y 100% digital</li>
      <li><Ico d={ICO_HOJA} />Con respaldo en blockchain</li>
    </ul>
    <img className="casa-hoja casa-hoja--izq" src={HOJAS} alt="" />
    <img className="casa-hoja casa-hoja--der" src={HOJAS} alt="" />
  </section>
}

export function ResumenInicio({ u }: { u: Usuario }) {
  const estado = useEstadoAlquileres()
  const todos = useAlquileres()
  const lista = visiblesDe(todos, u.email)
  const listo = estado === 'listo'
  const vacio = listo && lista.length === 0
  const a = listo && !vacio ? destacado(lista, u.email) : null
  return <main id="contenido" tabIndex={-1} className={'cont casa' + (vacio ? ' casa--vacio' : '')}>
    {!vacio && <div className="casa-rejilla">
      <Saludo nombre={u.nombre} />
      {estado === 'cargando' && <p role="status">Cargando tus alquileres…</p>}
      {estado === 'error' && <p role="alert">No se pudieron leer los alquileres. No hay importes para mostrar.</p>}
      {a && <div className="casa-cuerpo">
        <div className="casa-col">
          <div className="casa-sec">
            <h2>Mis alquileres</h2>
            <a className="casa-todos" href="#/alquileres">Ver todos <Ico d={ICO_CHEV} /></a>
          </div>
          <Tarjeta a={a} email={u.email} />
        </div>
        <aside className="casa-lado">
          <Nuevo ancho />
          <ComoFunciona />
        </aside>
      </div>}
    </div>}
    {vacio && <HeroVacio />}
  </main>
}
