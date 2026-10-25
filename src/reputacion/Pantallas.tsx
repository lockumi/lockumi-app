// Paso 19 · Pantallas de la reputación («coral con amor», sin casitas ni ilustraciones). Se cargan solo con VITE_REPUTACION=1
// (carga diferida desde App.tsx), junto con su CSS propio (reputacion.css, solo clases .rp-*). Una pantalla = un paso.
import { useId, useState, type ReactNode } from 'react'
import './reputacion.css'
import type { Alquiler, Rol, Usuario } from '../types'
import { useAlquileres, rolDe } from '../store'
import { ir } from '../router'
import { calcularPuntaje, lineaPublica, puntajeVisible, insignias, tieneLlave, formatoPuntaje, cuentaParaPuntaje, fraccionDescontada, fraccionReclamoDevuelta,
  valorDelAlquiler, ordenarVitrina, zonaVitrina, MINIMO_PARA_PUNTAJE, MINIMO_POR_CANTON, type Insignia } from './puntaje'
import { useReputacion, guardarDatos, aceptar, activa, validarNombre, validarCanton, type EstadoReputacion, type Opcion } from './consentimiento'
import { PROVINCIAS, provinciaDe } from './cantones'
import { pedirBorrado, ejecutarBorrados, solicitudBorrado } from './borrado'
import { EJEMPLOS, type Ejemplo } from './ejemplos'
import { TEXTO_PERFIL, TEXTO_DESTACADOS, TEXTO_NUEVOS, TEXTO_PUNTAJE_NUEVO, PERFIL_FIJO, SE_PUBLICA, NO_SE_PUBLICA, COMO_SE_CALCULA,
  AVISO_PERFIL, AVISO_LISTA, MIS_DATOS, CORREGIR, INSIGNIAS, LLAVE_DESCRIPCION, NUEVO_DESCRIPCION, VITRINA, UI, ELIMINAR, ELIMINAR_UI, NOMBRE_LLAVE, conVars, type Bloque } from './textos'

// ——— Piezas ———
const ICONOS: Record<string, string[]> = {
  casallave: ['M3 10.5 12 3l9 7.5', 'M5 9v11h6', 'M19 9v2.5', 'M15.5 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M18 17h3.5', 'M20.5 17v2'],
  maleta: ['M4.5 8h15A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-9A1.5 1.5 0 0 1 4.5 8Z', 'M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8', 'M8 8v12', 'M16 8v12'],
  llave: ['M15 7a4 4 0 1 1-3.5 6L4 20.5', 'M7 17.5l2 2', 'M9.5 15l2 2'],
  contrato: ['M7 3h7l4 4v14H7Z', 'M14 3v4h4', 'M10 12h5', 'M10 16h5'],
  deposito: ['M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z', 'm9 12 2 2 4-4'],
  'fotos-entrada': ['M4 7h4l2-2h4l2 2h4v12H4Z', 'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  'fotos-salida': ['M4 7h4l2-2h4l2 2h4v12H4Z', 'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  devolvio: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v4h-4', 'm9 12 2 2 4-4'],
  recibio: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v4h-4', 'm9 12 2 2 4-4'],
  candado: ['M6 11h12v9H6Z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  der: ['m9 6 6 6-6 6'],
}
export const Icono = ({ n, className = 'rp-ico' }: { n: string; className?: string }) =>
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{(ICONOS[n] ?? []).map(d => <path key={d} d={d} />)}</svg>

/** Banda superior con borde ondulado (sin casitas ni dibujos). */
export function Banda({ mini = false }: { mini?: boolean }) {
  const id = useId().replace(/:/g, '')
  return <span className={'rp-banda' + (mini ? ' rp-banda--mini' : '')} aria-hidden="true">
    <svg viewBox="0 0 390 150" preserveAspectRatio="none"><defs>
      <radialGradient id={'g' + id} cx="20%" cy="0%" r="120%"><stop offset="0" stopColor="#FFB08A" /><stop offset=".55" stopColor="#FF6B35" /><stop offset="1" stopColor="#E8531F" /></radialGradient>
      <radialGradient id={'b' + id} cx="80%" cy="10%" r="45%"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
      <rect width="390" height="150" fill={`url(#g${id})`} /><rect width="390" height="150" fill={`url(#b${id})`} />
      <path d="M0 112C70 86 140 92 210 102S330 84 390 92V150H0Z" fill="#FFE8DA" opacity=".35" />
      <path d="M0 128C90 110 170 118 250 124S350 114 390 118V150H0Z" fill="#FFF5EE" /></svg></span>
}
/** Sello de la Llave Lockumi: borde ondulado y colores del logo (sin dorado). */
export function Sello({ t = 36 }: { t?: number }) {
  const id = useId().replace(/:/g, ''), R = 42, A = 4, N = 14
  const d = Array.from({ length: 181 }, (_, k) => { const th = (k / 180) * 2 * Math.PI, r = R + A * Math.sin(N * th); return `${k ? 'L' : 'M'}${(50 + r * Math.cos(th)).toFixed(2)} ${(50 + r * Math.sin(th)).toFixed(2)}` }).join('') + 'Z'
  return <svg className="rp-sello" width={t} height={t} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id={'s' + id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor="#FFB08A" /><stop offset=".6" stopColor="#FF6B35" /><stop offset="1" stopColor="#E8531F" /></linearGradient></defs>
    <path d={d} fill={`url(#s${id})`} /><circle cx="50" cy="50" r="29" fill="#FFF5EE" />
    <g transform="translate(29 29) scale(1.75)" fill="none" stroke="#3D2A22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONOS.llave.map(p => <path key={p} d={p} />)}</g></svg>
}
function Anillo({ valor }: { valor: number }) {
  const id = useId().replace(/:/g, ''), r = 34, c = 2 * Math.PI * r
  return <div className="rp-anillo" role="img" aria-label={`${formatoPuntaje(valor)} de 5`}>
    <svg width="84" height="84" viewBox="0 0 84 84"><defs><linearGradient id={'a' + id}><stop offset="0" stopColor="#FFB08A" /><stop offset=".6" stopColor="#FF6B35" /><stop offset="1" stopColor="#E8531F" /></linearGradient></defs>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#FFE8DA" strokeWidth="9" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={`url(#a${id})`} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(valor / 5) * c} ${c}`} /></svg>
    <div className="rp-anillo__c"><div><div className="rp-anillo__n">{formatoPuntaje(valor)}</div><div className="rp-anillo__d">de 5</div></div></div></div>
}
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('')
const Avatar = ({ nombre, rol, mini }: { nombre: string; rol: Rol; mini?: boolean }) =>
  <span className={`rp-avatar rp-avatar--${rol}` + (mini ? ' rp-avatar--mini' : '')} aria-hidden="true">{iniciales(nombre)}</span>
const NOMBRE_PAPEL: Record<Rol, string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
const Papel = ({ rol }: { rol: Rol }) => <span className={`rp-rol rp-rol--${rol}`}><Icono n={rol === 'dueno' ? 'casallave' : 'maleta'} />{NOMBRE_PAPEL[rol]}</span>
/** Negritas de Legal (**…**) y cursivas (*…*), sin HTML crudo. */
export function Md({ t }: { t: string }) {
  return <>{t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((x, i) => x.startsWith('**') ? <strong key={i}>{x.slice(2, -2)}</strong> : x.startsWith('*') && x.length > 2 ? <em key={i}>{x.slice(1, -1)}</em> : x)}</>
}
const Volver = ({ a = '#/', t = '← Tus alquileres' }: { a?: string; t?: string }) => <a href={a} className="volver">{t}</a>
const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })
const mesAnio = (iso: string) => new Date(iso).toLocaleDateString('es-CR', { month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })
const usd = (n: number) => `${n.toLocaleString('es-CR')} USDC`
const nombreDe = (e: EstadoReputacion, u: Usuario) => e.nombre ?? u.nombre
const rolDeRuta = (x?: string): Rol => x === 'inquilino' ? 'inquilino' : 'dueno'
const mios = (todos: Alquiler[], u: Usuario, rol: Rol) => todos.filter(a => rolDe(a, u.email) === rol)
const desde = (xs: Alquiler[]) => xs.map(a => a.inicio).filter(Boolean).sort()[0]

function Insignias({ lista }: { lista: Insignia[] }) {
  if (!lista.length) return <p className="nota">{UI.sinInsignias}</p>
  return <ul className="rp-insignias" role="list">{lista.map(i => <li key={i} className="rp-insignia"><span className="rp-burbuja"><Icono n={i} /></span>{INSIGNIAS[i]!.nombre}</li>)}</ul>
}

// ——— Mi perfil (por papel) ———
function MiPerfil({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), ahora = Date.now()
  const xs = mios(todos, u, rol), p = calcularPuntaje(xs, rol, ahora), ins = insignias(xs, rol), llave = tieneLlave(xs, rol, ahora)
  const publico = activa(e, rol, 'perfil'), borrado = solicitudBorrado(u.email)
  const nombre = nombreDe(e, u), cerrados = xs.filter(cuentaParaPuntaje), completos = cerrados.filter(a => fraccionDescontada(a, ahora) === 0).length
  const vitrina = opcionVitrina(p.cerrados), opciones: [Opcion, string][] = [['perfil', UI.opcion.perfil], [vitrina, vitrina === 'destacados' ? (rol === 'dueno' ? UI.vitrinaDuenos : UI.vitrinaInquilinos) : UI.opcion.nuevos]]
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver />
    <h1>{UI.entradaTitulo}</h1>
    <nav className="rp-papeles" aria-label="Tu papel">{(['dueno', 'inquilino'] as Rol[]).map(r =>
      <a key={r} href={`#/perfil/${r}`} className={`rp-rol rp-rol--${r}`} aria-current={r === rol ? 'page' : undefined}><Icono n={r === 'dueno' ? 'casallave' : 'maleta'} />{NOMBRE_PAPEL[r]}</a>)}</nav>
    {borrado && <div className="glass tarjeta" role="status"><p><strong>{ELIMINAR_UI.enCurso}</strong></p><p className="nota">{ELIMINAR_UI.limite(fechaLarga(borrado.limite))}</p></div>}
    <section className="glass tarjeta rp-perfil" aria-labelledby="rp-nombre">
      <Banda />
      <div className="rp-perfil__cuerpo">
        <Avatar nombre={nombre} rol={rol} />
        <h2 id="rp-nombre" className="rp-nombre">{nombre}</h2>
        <div className="rp-fila"><Papel rol={rol} />{e.canton && <span className="chip chip--neutro chip--mini">{e.canton}</span>}</div>
        <p className="nota" style={{ marginTop: 8 }}>{publico && !borrado ? UI.publico : UI.miPerfil}{desde(xs) ? ' · ' + UI.enLockumiDesde(mesAnio(desde(xs)!)) : ''}</p>
        <div className="rp-puntaje">
          {puntajeVisible(p) ? <Anillo valor={p.valor!} /> : null}
          <div><div className="rp-linea">{lineaPublica(p)}</div>
            <p className="nota">{p.cerrados < MINIMO_PARA_PUNTAJE ? TEXTO_PUNTAJE_NUEVO : UI.segunLockumi}</p></div>
        </div>
        {llave && puntajeVisible(p) && <p style={{ marginTop: 12 }}><span className="rp-llave rp-ondas"><Sello />{NOMBRE_LLAVE}</span></p>}
        <h3 className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.insignias}</h3>
        <Insignias lista={ins} />
        <p className="rp-aviso">{AVISO_PERFIL}</p>
      </div>
    </section>
    <section className="glass tarjeta" aria-labelledby="rp-solo">
      <p id="rp-solo" className="rp-solo"><Icono n="candado" />{UI.soloTu}</p>
      <p style={{ marginTop: 6 }}>{rol === 'dueno' ? UI.devolvioDe(completos, cerrados.length) : UI.recibioDe(completos, cerrados.length)}</p>
    </section>
    {!borrado && <section className="glass tarjeta" aria-labelledby="rp-op">
      <h2 id="rp-op" className="h3">{UI.opciones}</h2>
      <ul className="rp-opciones">{opciones.map(([o, t]) => <li key={o}><span>{t}</span><span className="rp-estado"><span className={'rp-estado__punto' + (activa(e, rol, o) ? ' rp-estado__punto--si' : '')} />{activa(e, rol, o) ? UI.si : UI.no}</span></li>)}</ul>
      {publico && <p className="nota" style={{ marginTop: 10 }}>{UI.activoDesde(fechaLarga(e.roles[rol].perfil!.fecha))}</p>}
      <p className="nota" style={{ marginTop: 6 }}><Md t={PERFIL_FIJO} /></p>
      {publico && !activa(e, rol, vitrina) && <div className="rp-acciones"><a className="boton boton--secundario" href={`#/perfil/${rol}/aparecer`}>{UI.verVitrinaOpcion}</a></div>}
    </section>}
    <nav className="glass tarjeta" aria-label="Más sobre tu perfil"><ul className="rp-enlaces">
      {[['#/perfil/calculo', UI.comoSeCalcula], ['#/perfil/llave', UI.queEsLlave], [`#/perfil/${rol}/datos`, MIS_DATOS.boton], ['#/perfil/calculo/corregir', UI.corregir],
        ['#/perfil/vitrina', UI.verVitrina], ['#/perfil/eliminar', ELIMINAR.boton]].map(([h, t]) => <li key={h}><a href={h}>{t}<Icono n="der" /></a></li>)}
    </ul></nav>
  </main>
}

// ——— Puerta obligatoria: sin la reputación aceptada no se puede usar Lockumi (decisión de Katherine, 25/10/2026, 2:24 p. m.) ———
// Tres pantallas, una por paso: datos → perfil de dueño → perfil de inquilino. El paso sale del estado guardado (no de la URL), así que
// no hay redirecciones durante el render y la persona vuelve a la ruta que pidió (por ejemplo, una invitación) al terminar.
const PASOS_PUERTA = 3
const opcionVitrina = (cerrados: number): Opcion => cerrados >= MINIMO_PARA_PUNTAJE ? 'destacados' : 'nuevos'
function Pantalla({ i, n, titulo, volver, children }: { i?: number; n?: number; titulo: string; volver?: ReactNode; children: ReactNode }) {
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    {volver}
    <section className="glass tarjeta rp-perfil"><Banda mini /><div className="rp-perfil__cuerpo">
      {i && n ? <p className="rp-paso">{UI.pasoDe(i, n)}</p> : null}<h1 className="h2">{titulo}</h1>{children}</div></section>
  </main>
}
function Casillas({ b, marcadas, set, error }: { b: Bloque; marcadas: boolean[]; set: (m: boolean[]) => void; error: string | null }) {
  return <fieldset style={{ border: 0, padding: 0, margin: 'var(--s4) 0 0' }} aria-describedby={error ? 'rp-err' : undefined}>
    <legend className="sr-only">Casillas</legend>
    {b.casillas.map((c, k) => <label key={k} className="check" style={{ marginTop: k ? 10 : 0 }}>
      <input type="checkbox" checked={marcadas[k] ?? false} onChange={ev => { const m = [...marcadas]; m[k] = ev.target.checked; set(m) }} /><span>{c}</span></label>)}
    {error && <p id="rp-err" className="error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
  </fieldset>
}
const textoAceptado = (b: Bloque, vars: Record<string, string>) => [b.titulo, ...b.parrafos, ...b.casillas].map(t => conVars(t, vars))
const TextoBloque = ({ b, vars }: { b: Bloque; vars: Record<string, string> }) =>
  <div className="rp-texto" style={{ marginTop: 10 }}>{b.parrafos.map((t, k) => <p key={k}><Md t={conVars(t, vars)} /></p>)}</div>

export function Puerta({ u, salir }: { u: Usuario; salir: () => void }) {
  const e = useReputacion(u.email)
  const paso = !e.nombre || !e.canton ? 1 : !activa(e, 'dueno', 'perfil') ? 2 : 3
  const salida = <div className="rp-acciones"><button type="button" className="boton boton--secundario" onClick={salir}>{UI.salir}</button>
    <a className="rp-enlace-peligro" href="#/perfil/eliminar">{ELIMINAR.boton}</a></div>
  if (paso === 1) return <PuertaDatos key="d" u={u} e={e} salida={salida} />
  const rol: Rol = paso === 2 ? 'dueno' : 'inquilino'
  return <PuertaPerfil key={rol} u={u} e={e} rol={rol} paso={paso} salida={salida} />
}
function PuertaDatos({ u, e, salida }: { u: Usuario; e: EstadoReputacion; salida: ReactNode }) {
  const [nombre, setNombre] = useState(e.nombre ?? ''), [canton, setCanton] = useState(e.canton ?? ''), [errores, setErrores] = useState<{ n?: string | null; c?: string | null }>({})
  return <Pantalla i={1} n={PASOS_PUERTA} titulo={UI.datosTitulo}>
    <p className="nota" style={{ marginTop: 6 }}>{UI.puertaNota}</p>
    <form noValidate onSubmit={ev => { ev.preventDefault(); const n = validarNombre(nombre), c = validarCanton(canton); setErrores({ n, c })
      if (n || c) return; try { guardarDatos(u.email, nombre, canton) } catch { setErrores({ n: UI.errGuardar }) } }}>
      <div className={'campo' + (errores.n ? ' rp-campo--error' : '')} style={{ marginTop: 'var(--s4)' }}>
        <label htmlFor="rp-n">{UI.nombreVisible}</label>
        <input id="rp-n" value={nombre} onChange={ev => setNombre(ev.target.value)} autoComplete="off" aria-describedby="rp-n-a" aria-invalid={!!errores.n} />
        <p id="rp-n-a" className={errores.n ? 'error' : 'nota'}>{errores.n ?? UI.nombreAyuda}</p></div>
      <div className={'campo rp-campo' + (errores.c ? ' rp-campo--error' : '')} style={{ marginTop: 'var(--s4)' }}>
        <label htmlFor="rp-c">{UI.canton}</label>
        <select id="rp-c" value={canton} onChange={ev => setCanton(ev.target.value)} aria-describedby="rp-c-a" aria-invalid={!!errores.c}>
          <option value="">{UI.elegirCanton}</option>
          {Object.entries(PROVINCIAS).map(([pr, cs]) => <optgroup key={pr} label={pr}>{cs.map(c => <option key={c}>{c}</option>)}</optgroup>)}</select>
        <p id="rp-c-a" className={errores.c ? 'error' : 'nota'}>{errores.c ?? UI.cantonAyuda}</p></div>
      <div className="rp-acciones"><button className="rp-boton rp-boton--ancho">{UI.continuar}</button></div>
    </form>{salida}</Pantalla>
}
function PuertaPerfil({ u, e, rol, paso, salida }: { u: Usuario; e: EstadoReputacion; rol: Rol; paso: number; salida: ReactNode }) {
  const [marcadas, setMarcadas] = useState<boolean[]>([]), [error, setError] = useState<string | null>(null)
  const b = TEXTO_PERFIL[rol], vars = { 'nombre visible': e.nombre ?? '', 'cantón': e.canton ?? '' }
  const aceptarPerfil = () => {
    if (marcadas.filter(Boolean).length < b.casillas.length) { setError(UI.errCasillas); return }
    try { aceptar(u.email, rol, 'perfil', textoAceptado(b, vars)) } catch { setError(UI.errGuardar) }
  }
  return <Pantalla i={paso} n={PASOS_PUERTA} titulo={b.titulo}>
    <p className="rp-fila" style={{ marginTop: 6 }}><Papel rol={rol} /></p>
    <TextoBloque b={b} vars={vars} />
    <Casillas b={b} marcadas={marcadas} set={setMarcadas} error={error} />
    <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={aceptarPerfil}>{UI.aceptarYSeguir}</button></div>
    <p className="nota" style={{ marginTop: 10 }}>{UI.obligatoria}</p>{salida}</Pantalla>
}

// ——— Vitrinas (opcionales, C.1): una sola pantalla desde el perfil ———
function Aparecer({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), p = calcularPuntaje(mios(todos, u, rol), rol, Date.now())
  const [marcadas, setMarcadas] = useState<boolean[]>([]), [error, setError] = useState<string | null>(null), [hecho, setHecho] = useState(false)
  const o = opcionVitrina(p.cerrados), b = (o === 'destacados' ? TEXTO_DESTACADOS : TEXTO_NUEVOS)[rol], vars = { 'nombre visible': e.nombre ?? '', 'cantón': e.canton ?? '' }
  const volver = <Volver a={`#/perfil/${rol}`} t="← Tu perfil" />
  if (hecho || activa(e, rol, o)) return <Pantalla titulo={UI.aparecesListo} volver={volver}>
    <div className="rp-acciones"><a className="rp-boton rp-boton--ancho" href={`#/perfil/${rol}`}>{UI.listo}</a></div></Pantalla>
  return <Pantalla titulo={conVars(b.titulo, vars)} volver={volver}><TextoBloque b={b} vars={vars} />
    {o === 'nuevos' && <p className="nota" style={{ marginTop: 10 }}>{VITRINA.nuevos}</p>}
    <Casillas b={b} marcadas={marcadas} set={setMarcadas} error={error} />
    <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={() => {
      if (!marcadas[0]) { setError(UI.errCasilla); return }
      try { aceptar(u.email, rol, o, textoAceptado(b, vars)); setHecho(true) } catch { setError(UI.errGuardar) } }}>{UI.activar}</button>
      <a className="boton boton--secundario" href={`#/perfil/${rol}`}>{UI.ahoraNo}</a></div></Pantalla>
}

// ——— Mis datos de reputación (C.5.2) ———
function MisDatos({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), ahora = Date.now(), xs = mios(todos, u, rol), cerrados = xs.filter(cuentaParaPuntaje)
  const p = calcularPuntaje(xs, rol, ahora), ins = insignias(xs, rol)
  const filas = cerrados.map(a => ({ alquiler: a.direccion, cerrado: a.resultado!.fecha, descuento: Math.round(fraccionDescontada(a, ahora) * 100),
    reclamoDevuelto: rol === 'dueno' ? Math.round(fraccionReclamoDevuelta(a) * 100) : undefined, vale: valorDelAlquiler(a, rol, ahora) }))
  const descargar = () => {
    const datos = { cuenta: u.email, papel: rol, nombreVisible: e.nombre ?? null, canton: e.canton ?? null, puntaje: p, insignias: ins, alquileres: filas, opciones: e.roles[rol] }
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `lockumi-reputacion-${rol}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a={`#/perfil/${rol}`} t="← Tu perfil" />
    <section className="glass tarjeta"><h1 className="h2">{MIS_DATOS.titulo}</h1><p className="nota" style={{ marginTop: 6 }}><Papel rol={rol} /></p>
      <p style={{ marginTop: 10 }}>{MIS_DATOS.texto}</p></section>
    <section className="glass tarjeta"><h2 className="h3">{lineaPublica(p)}</h2>
      {!filas.length ? <p className="nota">{UI.datosVacio}</p> : <ul className="rp-opciones">{filas.map((f, k) => <li key={k}><span>{f.alquiler}<br /><small className="nota">{fechaLarga(f.cerrado)}</small></span>
        <span style={{ textAlign: 'right' }}>{rol === 'dueno' ? (f.reclamoDevuelto ? UI.reclamoDevuelto(f.reclamoDevuelto) : UI.sinReclamo) : f.descuento ? UI.descuento(f.descuento) : UI.sinDescuento}<br /><small className="nota">{UI.vale(formatoPuntaje(f.vale))}</small></span></li>)}</ul>}
    </section>
    <section className="glass tarjeta"><h2 className="h3">{UI.insignias}</h2><Insignias lista={ins} /></section>
    <section className="glass tarjeta"><h2 className="h3">{UI.opciones}</h2>
      <ul className="rp-opciones">{(['perfil', 'destacados', 'nuevos'] as Opcion[]).map(o => { const r = e.roles[rol][o]
        return <li key={o}><span>{UI.opcion[o]}</span><span>{r ? `${UI.si} · ${fechaLarga(r.fecha)}` : UI.no}</span></li> })}</ul></section>
    <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={descargar}>{MIS_DATOS.descargar}</button>
      <a className="boton boton--secundario" href="#/perfil/calculo/corregir">{MIS_DATOS.corregir}</a>
      <a className="boton boton--secundario" href="#/perfil/eliminar">{MIS_DATOS.eliminar}</a></div>
  </main>
}

// ——— Cómo se calcula (C.2, C.3, C.6) ———
function Calculo({ corregir }: { corregir: boolean }) {
  const lista = (xs: string[]) => <ul>{xs.map((t, k) => <li key={k}><Md t={t} /></li>)}</ul>
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    {corregir ? <section className="glass tarjeta rp-texto"><h1 className="h2">{CORREGIR.titulo}</h1>{CORREGIR.parrafos.map((t, k) => <p key={k}><Md t={t} /></p>)}</section> : <>
      <section className="glass tarjeta rp-texto"><h1 className="h2">{UI.comoSeCalcula}</h1><p><Md t={COMO_SE_CALCULA.intro} /></p>{lista(COMO_SE_CALCULA.puntos)}
        <p className="rp-aviso"><Md t={COMO_SE_CALCULA.demo} /></p></section>
      <section className="glass tarjeta rp-texto"><h2 className="h3">{UI.queSePublica}</h2>{lista(SE_PUBLICA)}</section>
      <section className="glass tarjeta rp-texto"><h2 className="h3">{UI.queNoSePublica}</h2>{lista(NO_SE_PUBLICA)}</section>
      <div className="rp-acciones"><a className="boton boton--secundario" href="#/perfil/calculo/corregir">{UI.corregir}</a></div></>}
  </main>
}

// ——— Llave Lockumi (C.7) ———
function Llave() {
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    <section className="glass tarjeta rp-perfil"><Banda mini /><div className="rp-perfil__cuerpo rp-texto">
      <Sello t={72} /><h1 className="h2" style={{ marginTop: 8 }}>{NOMBRE_LLAVE}</h1><p>{LLAVE_DESCRIPCION}</p>
      <h2 className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.nuevoTitulo}</h2><p>{NUEVO_DESCRIPCION}</p>
      <h2 className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.insignias}</h2>
      <ul className="rp-enlaces">{Object.entries(INSIGNIAS).filter(([k]) => k !== 'fotos-salida' && k !== 'recibio').map(([k, v]) =>
        <li key={k} style={{ padding: '8px 0' }}><span className="rp-fila" style={{ marginTop: 0 }}><span className="rp-burbuja"><Icono n={k} /></span><strong>{v.nombre}</strong></span><p className="nota">{v.descripcion}</p></li>)}</ul>
    </div></section>
  </main>
}

// ——— Vitrina de ejemplo (solo cantón, sin números de posición) ———
function Tarjeta({ x }: { x: Ejemplo }) {
  const nuevo = x.cerrados < MINIMO_PARA_PUNTAJE, p = { cerrados: x.cerrados, valor: x.valor, enRevision: false }
  return <li className="glass rp-tarjeta"><Banda mini />{nuevo && <span className="rp-espacio rp-ondas">{VITRINA.espacio}</span>}
    <div className="rp-tarjeta__cuerpo"><div className="rp-tarjeta__cab"><Avatar nombre={x.nombre} rol={x.rol} mini /><div>
      <p className="rp-tarjeta__nombre">{x.nombre}</p><div className="rp-fila" style={{ marginTop: 0 }}><Papel rol={x.rol} /><span className="chip chip--neutro chip--mini">{UI.ejemplo}</span></div></div></div>
      <p className="nota" style={{ marginTop: 10 }}>{x.canton} · {x.rol === 'dueno' ? UI.alquilaDesde(usd(x.precio)) : UI.buscaDe(`${usd(x.precio)} a ${usd(x.precio + 200)}`)}</p>
      <p className="rp-linea" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>{x.llave && puntajeVisible(p) && <Sello t={28} />}{lineaPublica(p)}</p>
      <ul className="rp-burbujas" aria-label={UI.insignias}>{x.insignias.map(i => <li key={i} className="rp-burbuja" title={INSIGNIAS[i]!.nombre}><Icono n={i} /><span className="sr-only">{INSIGNIAS[i]!.nombre}</span></li>)}</ul>
    </div></li>
}
function Vitrina({ rol }: { rol: Rol }) {
  const xs = EJEMPLOS.filter(x => x.rol === rol), canton = 'Escazú', zona = zonaVitrina(canton, provinciaDe(canton) ?? '', xs.length)
  const lista = rol === 'dueno' ? UI.vitrinaDuenos : UI.vitrinaInquilinos
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    <section className="glass tarjeta rp-perfil"><Banda mini /><div className="rp-perfil__cuerpo">
      <p className="rp-paso">{UI.vitrinaTitulo}</p><h1 className="h2">{UI.vitrinaEn(lista, zona)}</h1>
      <nav className="rp-pestanas" aria-label="Lista">{(['dueno', 'inquilino'] as Rol[]).map(r => <a key={r} href={r === 'dueno' ? '#/perfil/vitrina' : '#/perfil/vitrina/inquilinos'} aria-current={r === rol ? 'page' : undefined}>{r === 'dueno' ? UI.vitrinaDuenos : UI.vitrinaInquilinos}</a>)}</nav>
      <p className="rp-orden">{VITRINA.orden}</p></div></section>
    {xs.length < MINIMO_POR_CANTON ? <p className="glass tarjeta">{VITRINA.vacio}</p> : <ul className="rp-vitrina" role="list">{ordenarVitrina(xs).map(x => <Tarjeta key={x.nombre} x={x} />)}</ul>}
    <p className="rp-aviso">{VITRINA.pie(rol === 'dueno' ? 'dueños' : 'inquilinos')}</p>
    <p className="rp-aviso">{AVISO_LISTA}</p>
  </main>
}

// ——— Eliminar la cuenta (C.5.1): gratis, en un máximo de 5 días hábiles ———
function Eliminar({ u, listo, salir }: { u: Usuario; listo: boolean; salir: () => void }) {
  const s = solicitudBorrado(u.email)
  if (listo && s) return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <section className="glass tarjeta" role="status"><h1 className="h2">{ELIMINAR.listo}</h1><p className="nota" style={{ marginTop: 8 }}>{ELIMINAR_UI.limite(fechaLarga(s.limite))}</p>
      <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={() => { location.hash = '/'; salir() }}>{ELIMINAR_UI.salir}</button></div></section></main>
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    <section className="glass tarjeta rp-texto"><h1 className="h2">{ELIMINAR.titulo}</h1><p>{ELIMINAR.intro}</p><ul>{ELIMINAR.puntos.map((t, k) => <li key={k}>{t}</li>)}</ul>
      <p className="nota">{ELIMINAR.correo}</p>
      <div className="rp-acciones">
        <a className="boton boton--secundario" href="#/perfil/dueno/datos">{ELIMINAR.descargar}</a>
        <button type="button" className="boton rp-peligro" onClick={() => { pedirBorrado(u.email); ejecutarBorrados(); ir('/perfil/eliminar/listo') }}>{ELIMINAR.si}</button>
        <a className="boton boton--secundario" href="#/perfil">{ELIMINAR.no}</a></div></section>
  </main>
}

/** Con VITE_REPUTACION=1, App.tsx pasa por aquí TODAS las pantallas con sesión: la puerta obligatoria primero (salvo «Eliminar mi cuenta»),
 *  después las rutas #/perfil/… o, si la ruta es otra, la pantalla de siempre (children). */
export default function Reputacion({ u, r, salir, children }: { u: Usuario; r: string; salir: () => void; children?: ReactNode }) {
  const e = useReputacion(u.email)
  const [raiz, a, b] = r.split('/').filter(Boolean)   // ['perfil', a, b]
  const perfil = raiz === 'perfil'
  if (perfil && a === 'eliminar') return <Eliminar u={u} listo={b === 'listo'} salir={salir} />
  const acepto = !!e.nombre && !!e.canton && activa(e, 'dueno', 'perfil') && activa(e, 'inquilino', 'perfil')
  if (!acepto) return <Puerta u={u} salir={salir} />
  if (!perfil) return <>{children}</>
  if (a === 'calculo') return <Calculo corregir={b === 'corregir'} />
  if (a === 'llave') return <Llave />
  if (a === 'vitrina') return <Vitrina rol={b === 'inquilinos' ? 'inquilino' : 'dueno'} />
  const rol = rolDeRuta(a)
  if (b === 'aparecer') return <Aparecer u={u} rol={rol} />
  if (b === 'datos') return <MisDatos u={u} rol={rol} />
  return <MiPerfil u={u} rol={rol} />
}
