// Paso 19 · Pantallas de la reputación («coral con amor», sin casitas ni ilustraciones). Se cargan solo con VITE_REPUTACION=1
// (carga diferida desde App.tsx), junto con su CSS propio (reputacion.css, solo clases .rp-*). Una pantalla = un paso.
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import './reputacion.css'
import type { Alquiler, Rol, Usuario } from '../types'
import { useAlquileres as useAlquileresStore } from '../store'
import { usePerfilesServidor, infoReputacion } from './perfilesServidor'
import { ir } from '../router'
import { suscribirRecorrido, recorridoEnCurso } from '../recorrido'
import { calcularPuntaje, lineaPublica, puntajeVisible, insignias, tieneLlave, formatoPuntaje, cuentaParaPuntaje, fraccionDescontada, fraccionReclamoDevuelta,
  valorDelAlquiler, ordenarVitrina, alquileresDeReputacion, alquileresDeReputacionServidor, zonaVitrina, MINIMO_PARA_PUNTAJE, MINIMO_POR_CANTON, type Insignia } from './puntaje'
import { useReputacion, guardarDatos, aceptarRep01, aceptar, activa, leer, validarNombre, validarCanton, type EstadoReputacion, type Opcion } from './consentimiento'
import { pedirRevision, revisiones, enRevisionIds, validarRevision, NOTA_MAX, type Revision } from './revision'
import { avisoCambio, hechosVencidos, avisoVencido, visto, marcarVisto, type Aviso } from './avisos'
import { enviarAvisoReputacion } from './correo'
import { PROVINCIAS, provinciaDe } from './cantones'
import { ejecutarBorrados, solicitudBorrado, abiertosDe, tienePerfilReputacion, perfilDesde, type Solicitud } from './borrado'
import { textoCasillaTerminos } from '../legal/documentos'
import { V_REPUTACION } from '../legal/version17'
import { EJEMPLOS, type Ejemplo } from './ejemplos'
import type { Registro } from './consentimiento'
import { conServidor } from '../servidor/config'
import { servidor } from '../servidor/repositorio'
import { asegurarCorreo, eliminarCuenta, correoPorConfirmar, oirPorConfirmar, confirmarCorreoConCodigo, reenviarCodigoCorreo,
  type PorConfirmar } from './verificacion'
import { pedirCodigo, confirmarCodigo, ErrorCodigo, type AccionCodigo } from './segundo-factor'
import { BLOQUEO_BORRADO, NOTA_EN_REVISION, PROTECCION, PERFIL_FIJO_BOTONES, AVISO_CAMBIO, TEXTO_DESTACADOS, TEXTO_NUEVOS, TEXTO_PUNTAJE_NUEVO, PERFIL_FIJO, SE_PUBLICA, NO_SE_PUBLICA, COMO_SE_CALCULA,
  AVISO_PERFIL, AVISO_LISTA, MIS_DATOS, SEGUNDO_FACTOR, CORREGIR, INSIGNIAS, LLAVE_DESCRIPCION, NUEVO_DESCRIPCION, VITRINA, UI, ELIMINAR, ELIMINAR_UI, NOMBRE_LLAVE, conVars, type Bloque } from './textos'

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
const usd = (n: number) => `${n.toLocaleString('es-CR')} USDC de prueba`   // Legal (revisión del PR #26, regla 5)
/** Legal (regla 4): cantón, o la provincia si en el cantón hay menos de 10 personas. En la demo se cuentan los perfiles de ejemplo;
 *  en el servidor, los perfiles reales del cantón. */
export const zonaDe = (canton: string) => zonaVitrina(canton, provinciaDe(canton) ?? '', EJEMPLOS.filter(x => x.canton === canton).length)
const nombreDe = (e: EstadoReputacion, u: Usuario) => e.nombre ?? u.nombre
const rolDeRuta = (x?: string): Rol => x === 'inquilino' ? 'inquilino' : 'dueno'
/** Los alquileres de esta persona en este papel que cuentan para su reputación (los dos con perfil: Legal, 25/10). */
// Legal (26/10, 2:27 a. m.; Ley 8968, art. 5): un alquiler cuenta solo si las dos partes tienen perfil, y solo si cerró después de aceptarlo.
// 27/10: con servidor, el perfil de la otra parte lo sabe el servidor (no este navegador): lk_reputacion_de_mis_alquileres.
const mios = (todos: Alquiler[], u: Usuario, rol: Rol) => conServidor ? alquileresDeReputacionServidor(todos, u.email, rol, infoReputacion)
  : alquileresDeReputacion(todos, u.email, rol, tienePerfilReputacion, perfilDesde)
/** Los alquileres de la app y, con servidor, la información de reputación de cada uno (vuelve a dibujar cuando llega). */
function useAlquileres() { const t = useAlquileresStore(); usePerfilesServidor(t, conServidor); return t }
const desde = (xs: Alquiler[]) => xs.map(a => a.inicio).filter(Boolean).sort()[0]

function Insignias({ lista }: { lista: Insignia[] }) {
  if (!lista.length) return <p className="nota">{UI.sinInsignias}</p>
  return <ul className="rp-insignias" role="list">{lista.map(i => <li key={i} className="rp-insignia"><span className="rp-burbuja"><Icono n={i} /></span>{INSIGNIAS[i]!.nombre}</li>)}</ul>
}

// ——— Mi perfil (por papel) ———
/** Puntaje con las revisiones pedidas (REP-11): esos alquileres no cuentan y se ve «En revisión». */
const puntajeDe = (todos: Alquiler[], u: Usuario, rol: Rol, ahora = Date.now()) => calcularPuntaje(mios(todos, u, rol), rol, ahora, enRevisionIds(u.email, rol))
function MiPerfil({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), ahora = Date.now()
  const xs = mios(todos, u, rol), p = puntajeDe(todos, u, rol, ahora), ins = insignias(xs, rol), llave = tieneLlave(xs, rol, ahora)
  const borrado = solicitudBorrado(u.email)
  const nombre = nombreDe(e, u), cerrados = xs.filter(cuentaParaPuntaje), completos = cerrados.filter(a => fraccionDescontada(a, ahora) === 0).length
  const vitrina = opcionVitrina(p.cerrados), opciones: [Opcion, string][] = [[vitrina, vitrina === 'destacados' ? (rol === 'dueno' ? UI.vitrinaDuenos : UI.vitrinaInquilinos) : UI.opcion.nuevos]]
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver />
    <h1>{UI.entradaTitulo}</h1>
    <nav className="rp-papeles" aria-label="Tu papel">{(['dueno', 'inquilino'] as Rol[]).map(r =>
      <a key={r} href={`#/perfil/${r}`} className={`rp-rol rp-rol--${r}`} aria-current={r === rol ? 'page' : undefined}><Icono n={r === 'dueno' ? 'casallave' : 'maleta'} />{NOMBRE_PAPEL[r]}</a>)}</nav>
    {borrado && <div className="glass tarjeta" role="status"><p><strong>{ELIMINAR_UI.enCurso}</strong></p><PlazoBorrado s={borrado} /></div>}
    <section className="glass tarjeta rp-perfil" aria-labelledby="rp-nombre">
      <Banda />
      <div className="rp-perfil__cuerpo">
        <Avatar nombre={nombre} rol={rol} />
        <h2 id="rp-nombre" className="rp-nombre">{nombre}</h2>
        <div className="rp-fila"><Papel rol={rol} />{e.canton && <span className="chip chip--neutro chip--mini">{zonaDe(e.canton)}</span>}</div>
        <p className="nota" style={{ marginTop: 8 }}>{UI.asiTeVen}{desde(xs) ? ' · ' + UI.enLockumiDesde(mesAnio(desde(xs)!)) : ''}</p>
        <div className="rp-puntaje">
          {puntajeVisible(p) ? <Anillo valor={p.valor!} /> : null}
          <div><div className="rp-linea">{lineaPublica(p)}</div>
            <p className="nota">{p.enRevision ? NOTA_EN_REVISION : p.cerrados < MINIMO_PARA_PUNTAJE ? TEXTO_PUNTAJE_NUEVO : UI.segunLockumi}</p></div>
        </div>
        {llave && puntajeVisible(p) && <p style={{ marginTop: 12 }}><span className="rp-llave rp-ondas"><Sello />{NOMBRE_LLAVE}</span></p>}
        <h3 className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.insignias}</h3>
        <Insignias lista={ins} />
        <p className="rp-aviso">{AVISO_PERFIL} <a href="#/perfil/calculo">{UI.comoSeCalcula}</a></p>
      </div>
    </section>
    <section className="glass tarjeta" aria-labelledby="rp-solo">
      <p id="rp-solo" className="rp-solo"><Icono n="candado" />{UI.soloTu}</p>
      <p style={{ marginTop: 6 }}>{rol === 'dueno' ? UI.devolvioDe(completos, cerrados.length) : UI.recibioDe(completos, cerrados.length)}</p>
    </section>
    {!borrado && <section className="glass tarjeta" aria-labelledby="rp-op">
      <p><Md t={PERFIL_FIJO} /></p>
      {e.rep01 && <p className="nota" style={{ marginTop: 6 }}>{UI.aceptadoEl(fechaLarga(e.rep01.fecha), e.rep01.hora ?? '')}</p>}
      <div className="rp-acciones"><a className="boton boton--secundario" href="#/perfil/calculo">{PERFIL_FIJO_BOTONES.publica}</a>
        <a className="boton boton--secundario" href={`#/perfil/${rol}/datos`}>{PERFIL_FIJO_BOTONES.datos}</a>
        <a className="rp-enlace-peligro" href="#/perfil/eliminar">{PERFIL_FIJO_BOTONES.eliminar}</a></div>
      <h2 id="rp-op" className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.opciones}</h2>
      <ul className="rp-opciones">{opciones.map(([o, t]) => <li key={o}><span>{t}</span><span className="rp-estado"><span className={'rp-estado__punto' + (activa(e, rol, o) ? ' rp-estado__punto--si' : '')} />{activa(e, rol, o) ? UI.si : UI.no}</span></li>)}</ul>
      {!activa(e, rol, vitrina) && <div className="rp-acciones"><a className="boton boton--secundario" href={`#/perfil/${rol}/aparecer`}>{UI.verVitrinaOpcion}</a></div>}
    </section>}
    <nav className="glass tarjeta" aria-label="Más sobre tu perfil"><ul className="rp-enlaces">
      {[['#/perfil/calculo', UI.comoSeCalcula], ['#/perfil/llave', UI.queEsLlave], [`#/perfil/${rol}/datos`, MIS_DATOS.boton], ['#/perfil/calculo/corregir', UI.corregir],
        ['#/perfil/vitrina', UI.verVitrina], ['#/perfil/eliminar', ELIMINAR.boton]].map(([h, t]) => <li key={h}><a href={h}>{t}<Icono n="der" /></a></li>)}
    </ul></nav>
  </main>
}

// ——— Piezas comunes de pantalla ———
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
const lista = (xs: string[]) => <ul>{xs.map((t, k) => <li key={k}><Md t={t} /></li>)}</ul>

// ——— El perfil se acepta con la casilla de los Términos 1.13-demo (Legal, 26/10/2026): ya no hay pantalla aparte (REP-01) ———
/** Texto exacto que la persona aceptó (va al registro del consentimiento): la casilla de los Términos 1.13-demo y la línea de Legal. */
export const textoPerfil113 = () => textoCasillaTerminos()
/** REP-04 + REP-03 + protección (regla 6). */
function TextoCalculo() {
  return <>
    <section className="glass tarjeta rp-texto"><h1 className="h2">{COMO_SE_CALCULA.titulo}</h1><p><Md t={COMO_SE_CALCULA.intro} /></p>
      {lista(COMO_SE_CALCULA.puntos.map(t => conVars(t, { n: '0, 1 o 2' })))}<p className="rp-aviso"><Md t={COMO_SE_CALCULA.demo} /></p></section>
    <section className="glass tarjeta rp-texto"><h2 className="h3">{UI.queSePublica}</h2>{lista(SE_PUBLICA)}</section>
    <section className="glass tarjeta rp-texto"><h2 className="h3">{UI.queNoSePublica}</h2>{lista(NO_SE_PUBLICA)}<p><Md t={PROTECCION} /></p></section>
  </>
}

// ——— Pedido de borrado pendiente (Legal, ronda del 25/10, d) ———
/** Al intentar crear o unirse a un alquiler nuevo con un pedido de borrado pendiente (texto literal; estilos de siempre: glass tarjeta). */
export function BloqueoBorrado() {
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <section className="glass tarjeta" role="status"><p>{BLOQUEO_BORRADO}</p></section>
  </main>
}
/** Último paso al crear el perfil: nombre visible y cantón (lo que se publica). */
function Datos({ u, e, salir }: { u: Usuario; e: EstadoReputacion; salir: () => void }) {
  const [nombre, setNombre] = useState(e.nombre ?? ''), [canton, setCanton] = useState(e.canton ?? ''), [errores, setErrores] = useState<{ n?: string | null; c?: string | null }>({})
  return <Pantalla titulo={UI.datosTitulo}>
    <p className="nota" style={{ marginTop: 6 }}>{UI.datosNota}</p>
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
    </form>
    <div className="rp-acciones"><button type="button" className="boton boton--secundario" onClick={salir}>{UI.salir}</button>
      <a className="rp-enlace-peligro" href="#/perfil/eliminar">{ELIMINAR.boton}</a></div></Pantalla>
}

// ——— REP-11: pedir revisión ———
function PedirRevision({ u }: { u: Usuario }) {
  const todos = useAlquileres()
  const opciones = (['dueno', 'inquilino'] as Rol[]).flatMap(rol => mios(todos, u, rol).filter(cuentaParaPuntaje).map(a => ({ v: `${rol}|${a.id}`, t: `${a.direccion} · ${NOMBRE_PAPEL[rol]}` })))
  const [sel, setSel] = useState(''), [texto, setTexto] = useState(''), [nota, setNota] = useState(''), [error, setError] = useState<string | null>(null), [hecha, setHecha] = useState<Revision | null>(null)
  const volver = <Volver a="#/perfil" t="← Tu perfil" />
  if (hecha) return <Pantalla titulo={UI.revTitulo} volver={volver}><p role="status" style={{ marginTop: 8 }}>{UI.revAcuse(fechaLarga(hecha.fecha), hecha.hora, fechaLarga(hecha.limite))}</p>
    <div className="rp-acciones"><a className="rp-boton rp-boton--ancho" href="#/perfil">{UI.listo}</a></div></Pantalla>
  const pedidas = revisiones(u.email).filter(r => !r.resuelta)
  return <Pantalla titulo={UI.revTitulo} volver={volver}>
    <form noValidate onSubmit={ev => { ev.preventDefault(); const [rol, alquilerId] = sel.split('|') as [Rol, string]
      const err = validarRevision({ alquilerId: alquilerId ?? '', texto, nota }); setError(err); if (err) return
      try { setHecha(pedirRevision(u.email, { alquilerId, rol, texto, nota })) } catch { setError(UI.errGuardar) } }}>
      <div className="campo rp-campo" style={{ marginTop: 'var(--s4)' }}><label htmlFor="rp-ra">{UI.revAlquiler}</label>
        <select id="rp-ra" value={sel} onChange={ev => setSel(ev.target.value)}><option value="">{UI.revElegir}</option>{opciones.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}</select></div>
      <div className="campo" style={{ marginTop: 'var(--s4)' }}><label htmlFor="rp-rt">{UI.revTexto}</label><textarea id="rp-rt" rows={4} value={texto} onChange={ev => setTexto(ev.target.value)} /></div>
      <div className="campo" style={{ marginTop: 'var(--s4)' }}><label htmlFor="rp-rn">{UI.revNota}</label><textarea id="rp-rn" rows={3} maxLength={NOTA_MAX} value={nota} onChange={ev => setNota(ev.target.value)} />
        <p className="nota">{nota.length}/{NOTA_MAX}</p></div>
      {error && <p className="error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      <div className="rp-acciones"><button className="rp-boton rp-boton--ancho">{UI.revEnviar}</button></div>
    </form>
    {pedidas.length > 0 && <><h2 className="h3" style={{ marginTop: 'var(--s4)' }}>{UI.revPendientes}</h2>
      <ul className="rp-opciones">{pedidas.map(r => <li key={r.id}><span>{r.alquilerId}</span><span>{fechaLarga(r.fecha)} · {r.hora}</span></li>)}</ul></>}
  </Pantalla>
}

// ——— REP-12: avisos en la app cuando cambia el puntaje o un hecho deja de contar ———
function useAvisos(u: Usuario, activo = true): [Aviso | null, () => void] {
  const todos = useAlquileres(), ahora = Date.now(), [, setN] = useState(0)
  const estado = (['dueno', 'inquilino'] as Rol[]).map(rol => { const xs = mios(todos, u, rol), linea = lineaPublica(puntajeDe(todos, u, rol, ahora)), v = visto(u.email, rol)
    const vencidos = hechosVencidos(xs, rol, ahora, v.vencidos ?? [])
    return { rol, linea, v, vencidos, aviso: vencidos[0] ? avisoVencido(vencidos[0], linea) : avisoCambio(v.linea, linea, xs) } })
  useEffect(() => { if (activo) for (const x of estado) if (x.v.linea === undefined) marcarVisto(u.email, x.rol, { linea: x.linea, vencidos: x.v.vencidos ?? [] }) })
  const actual = activo ? estado.find(x => x.aviso) : undefined
  // REP-12 por correo: solo con VITE_CORREOS=1 (enviarAvisoReputacion lo revisa); una vez por cambio.
  const correo = actual?.aviso?.correo, idCorreo = correo ? JSON.stringify(correo) : ''
  useEffect(() => { if (idCorreo) void enviarAvisoReputacion(u.email, JSON.parse(idCorreo)) }, [idCorreo, u.email])
  return [actual?.aviso ?? null, () => { if (actual) { marcarVisto(u.email, actual.rol, { linea: actual.linea, vencidos: [...(actual.v.vencidos ?? []), ...actual.vencidos.map(a => a.id)] }); setN(n => n + 1) } }]
}
function AvisoPuntaje({ a, listo }: { a: Aviso; listo: () => void }) {
  return <div className="cont rp" style={{ paddingBottom: 0 }}><section className="glass tarjeta" role="status" aria-labelledby="rp-aviso-t">
    <h2 id="rp-aviso-t" className="h3">{a.titulo}</h2><p style={{ marginTop: 6 }}>{a.texto}</p>{a.nota && <p className="nota" style={{ marginTop: 6 }}>{a.nota}</p>}
    <div className="rp-acciones"><a className="boton boton--secundario" href="#/perfil/calculo">{AVISO_CAMBIO.porque}</a>
      <a className="boton boton--secundario" href="#/perfil/revision">{AVISO_CAMBIO.revision}</a>
      <button type="button" className="boton boton--secundario" onClick={listo}>{UI.entendido}</button></div></section></div>
}


// ——— Vitrinas (opcionales, C.1): una sola pantalla desde el perfil ———
function Aparecer({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), p = puntajeDe(todos, u, rol)
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
/** Datos de reputación de la cuenta para descargar: por defecto, los dos papeles (Legal, MENORES: al eliminar, también los de inquilino). */
export function datosParaDescargar(u: Usuario, todos: Alquiler[], roles: Rol[] = ['dueno', 'inquilino'], ahora = Date.now()) {
  const e = leer(u.email)
  const papel = (rol: Rol) => { const xs = mios(todos, u, rol)
    return { puntaje: puntajeDe(todos, u, rol, ahora), insignias: insignias(xs, rol), vitrinas: e.roles[rol],
      alquileres: xs.filter(cuentaParaPuntaje).map(a => ({ alquiler: a.direccion, cerrado: a.resultado!.fecha, descuento: Math.round(fraccionDescontada(a, ahora) * 100),
        reclamoDevuelto: rol === 'dueno' ? Math.round(fraccionReclamoDevuelta(a) * 100) : undefined, vale: valorDelAlquiler(a, rol, ahora) })) } }
  return { cuenta: u.email, nombreVisible: e.nombre ?? null, canton: e.canton ?? null, aceptacion: e.rep01 ?? null, revisiones: revisiones(u.email),
    papeles: Object.fromEntries(roles.map(r => [r, papel(r)])) }
}
/** «Descargar mis datos» (Legal, 25/10 4:01 p. m., condición 3): en modo servidor, del SERVIDOR (lk_mis_datos_reputacion: todas las
 *  sesiones con el correo de la cuenta), más lo que guarda este aparato; si el servidor falla, falla (no se baja un archivo incompleto).
 *  En la demo local sin servidor, igual que antes. */
export async function datosDeDescarga(u: Usuario, todos: Alquiler[], rol?: Rol, codigo?: string) {
  const local = datosParaDescargar(u, todos, rol ? [rol] : undefined)
  if (!conServidor) return local
  // Segundo factor (Legal 25/10, 5:04 p. m.): los datos del servidor solo salen con el código del correo (/api/codigo-correo).
  if (!codigo) throw new ErrorCodigo('codigo')
  const r = await confirmarCodigo('descargar', codigo, rol)
  return { ...(r.datos ?? {}) as object, enEsteAparato: local }
}
/** RIESGO de Legal (revisión de c887895): en modo servidor, la aceptación de REP-01 se escribe también en el servidor por el correo de la
 *  cuenta (lk_aceptar_reputacion), para que la fila de encendido no bloquee a quien ya aceptó. Idempotente: se reintenta en cada carga. */
export async function subirAceptacion(email: string, rep01: Registro | undefined) {
  if (!conServidor || !rep01) return false
  await asegurarCorreo(email)
  return await servidor.aceptarReputacion(email, rep01.version, rep01.texto)
}
function bajar(datos: unknown, nombre: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
// ——— Segundo factor: «Revisa tu correo» (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.; par-eliminar.png y par-descargar.png) ———
// Solo en modo servidor. Mismas clases de siempre (glass tarjeta, rp-texto, campo rp-campo, nota, error, rp-acciones, botones).
type Codigo = { accion: AccionCodigo; correo: string }
/** Texto de un error del segundo factor. 'accion' (el servidor no hizo la acción) = el error de siempre de esa acción. */
const textoCodigo = (e: unknown, accion: AccionCodigo) => {
  const m = e instanceof ErrorCodigo ? e.motivo : 'accion'
  return m === 'accion' ? (accion === 'eliminar' ? UI.errBorrado : accion === 'descargar' ? UI.errDescarga : SEGUNDO_FACTOR.errores.correo) : SEGUNDO_FACTOR.errores[m]
}
function useSegundoFactor(email: string) {
  const [codigo, setCodigo] = useState<Codigo | null>(null), [err, setErr] = useState<{ t: string; codigo: boolean } | null>(null), [enviando, setEnviando] = useState(false)
  /** Pide el código y abre la pantalla. Si falla antes de mandarlo, devuelve el texto del error (se muestra donde estaba el botón). */
  const pedir = (accion: AccionCodigo, alFallar: (t: string) => void) => { if (enviando) return; setEnviando(true); setErr(null)
    pedirCodigo(email, accion).then(r => setCodigo({ accion, correo: r.correo }), e => {
      if (e instanceof ErrorCodigo && e.correo && (e.motivo === 'minuto' || e.motivo === 'hora')) { setCodigo({ accion, correo: e.correo }); setErr({ t: SEGUNDO_FACTOR.errores[e.motivo], codigo: false }) }
      else alFallar(textoCodigo(e, accion)) }).finally(() => setEnviando(false)) }
  const reenviar = () => { if (!codigo || enviando) return; setEnviando(true); setErr(null)
    pedirCodigo(email, codigo.accion).then(r => setCodigo({ ...codigo, correo: r.correo }), e => setErr({ t: textoCodigo(e, codigo.accion), codigo: false })).finally(() => setEnviando(false)) }
  /** Confirma el código con la acción (hacer); si falla, el error se muestra en la pantalla del código. */
  const confirmar = (valor: string, hacer: (valor: string) => Promise<unknown>) => { if (!codigo || enviando) return; setEnviando(true); setErr(null)
    hacer(valor).then(() => { setCodigo(null) }, e => setErr({ t: textoCodigo(e, codigo.accion), codigo: e instanceof ErrorCodigo && e.motivo === 'codigo' })).finally(() => setEnviando(false)) }
  const cancelar = () => { setCodigo(null); setErr(null) }
  return { codigo, err, enviando, pedir, reenviar, confirmar, cancelar }
}
export function CodigoCorreo({ c, err, enviando, confirmar, reenviar, cancelar }: { c: Codigo; err: { t: string; codigo: boolean } | null; enviando: boolean
  confirmar: (valor: string) => void; reenviar: () => void; cancelar: () => void }) {
  const [valor, setValor] = useState(''), id = useId()
  // Legal 6:04 p. m. (opcional): el aviso «Ya te enviamos un código…» se oculta cuando la persona empieza a escribir. Solo ESE aviso y
  // solo esa vez: un error nuevo (otro objeto) se vuelve a mostrar.
  const [oculto, setOculto] = useState<typeof err>(null), errVisible = err && err !== oculto ? err : null
  const [antes, despues] = SEGUNDO_FACTOR.texto[c.accion].split('{correo}')
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <section className="glass tarjeta rp-texto" aria-labelledby={`${id}t`}><h1 id={`${id}t`} className="h2">{SEGUNDO_FACTOR.titulo}</h1>
      <p>{antes}<strong>{c.correo}</strong>{despues}</p>
      <form onSubmit={e => { e.preventDefault(); confirmar(valor) }}>
        <div className="campo rp-campo" style={{ marginTop: 'var(--s4)' }}><label htmlFor={`${id}c`}>{SEGUNDO_FACTOR.campo}</label>
          <input id={`${id}c`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={valor} onChange={e => { setValor(e.target.value.replace(/\D/g, '').slice(0, 6)); if (err?.t === SEGUNDO_FACTOR.errores.minuto) setOculto(err) }}
            aria-invalid={errVisible?.codigo || undefined} aria-describedby={errVisible ? `${id}e` : undefined} /></div>
        {errVisible && <p id={`${id}e`} className="error" role="alert" style={{ marginTop: 8 }}>{errVisible.t}</p>}
        <p className="nota">{SEGUNDO_FACTOR.nota}</p>
        <div className="rp-acciones"><button type="submit" className={c.accion === 'eliminar' ? 'boton rp-peligro' : 'rp-boton rp-boton--ancho'} disabled={enviando}>{SEGUNDO_FACTOR.boton[c.accion]}</button>
          <button type="button" className="boton boton--secundario" onClick={reenviar} disabled={enviando}>{SEGUNDO_FACTOR.reenviar}</button>
          <a className="boton boton--secundario" href={c.accion === 'verificar_correo' ? '#/' : c.accion === 'invitacion' ? location.hash : '#/perfil'} onClick={cancelar}>{SEGUNDO_FACTOR.cancelar}</a></div>
      </form></section></main>
}
// ——— «Revisa tu correo» al entrar con el código por correo de Cavos (Legal 25/10/2026, 9:00 p. m.) ———
// El token de correo de Cavos trae aud «cavos-email» (la misma para todas las apps de Cavos): el servidor exige además el código de 6
// números que manda Lockumi. Misma pantalla y mismas clases que el segundo factor (CodigoCorreo); el login no cambia.
/** El correo por confirmar de ESTA cuenta (null si no hay). Al montar, verifica el correo con el servidor (una vez por carga). */
function usePorConfirmar(email: string): PorConfirmar | null {
  const [p, setP] = useState(correoPorConfirmar)
  useEffect(() => oirPorConfirmar(() => setP(correoPorConfirmar())), [])
  useEffect(() => { if (conServidor) asegurarCorreo(email).catch(() => { /* nunca lanza */ }) }, [email])
  return p && p.c === email.trim().toLowerCase() ? p : null
}
export function ConfirmarCorreo({ p, cancelar }: { p: PorConfirmar; cancelar: () => void }) {
  const [err, setErr] = useState<{ t: string; codigo: boolean } | null>(() => p.motivo && p.motivo !== 'accion' ? { t: SEGUNDO_FACTOR.errores[p.motivo], codigo: false } : null)
  const [enviando, setEnviando] = useState(false)
  const fallo = (e: unknown) => setErr({ t: textoCodigo(e, 'verificar_correo'), codigo: e instanceof ErrorCodigo && e.motivo === 'codigo' })
  return <CodigoCorreo c={{ accion: 'verificar_correo', correo: p.correo }} err={err} enviando={enviando} cancelar={cancelar}
    confirmar={v => { if (enviando) return; setEnviando(true); setErr(null); confirmarCorreoConCodigo(v).catch(fallo).finally(() => setEnviando(false)) }}
    reenviar={() => { if (enviando) return; setEnviando(true); setErr(null); reenviarCodigoCorreo().catch(fallo).finally(() => setEnviando(false)) }} />
}
function MisDatos({ u, rol }: { u: Usuario; rol: Rol }) {
  const todos = useAlquileres(), e = useReputacion(u.email), ahora = Date.now(), xs = mios(todos, u, rol), cerrados = xs.filter(cuentaParaPuntaje)
  const p = puntajeDe(todos, u, rol, ahora), ins = insignias(xs, rol)
  const filas = cerrados.map(a => ({ alquiler: a.direccion, cerrado: a.resultado!.fecha, descuento: Math.round(fraccionDescontada(a, ahora) * 100),
    reclamoDevuelto: rol === 'dueno' ? Math.round(fraccionReclamoDevuelta(a) * 100) : undefined, vale: valorDelAlquiler(a, rol, ahora) }))
  const [errDescarga, setErrDescarga] = useState<string | null>(null), sf = useSegundoFactor(u.email)
  // Segundo factor: en modo servidor, primero el código del correo; sin servidor, baja el archivo como siempre.
  const descargar = () => { setErrDescarga(null)
    if (conServidor) sf.pedir('descargar', setErrDescarga)
    else datosDeDescarga(u, todos, rol).then(d => bajar(d, `lockumi-reputacion-${rol}.json`), () => setErrDescarga(UI.errDescarga)) }
  if (sf.codigo) return <CodigoCorreo c={sf.codigo} err={sf.err} enviando={sf.enviando} reenviar={sf.reenviar} cancelar={sf.cancelar}
    confirmar={v => sf.confirmar(v, codigo => datosDeDescarga(u, todos, rol, codigo).then(d => bajar(d, `lockumi-reputacion-${rol}.json`)))} />
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
      {e.rep01 && <p className="nota">{UI.aceptadoEl(fechaLarga(e.rep01.fecha), e.rep01.hora ?? '')}</p>}
      <ul className="rp-opciones">{(['destacados', 'nuevos'] as Opcion[]).map(o => { const r = e.roles[rol][o]
        return <li key={o}><span>{UI.opcion[o]}</span><span>{r ? `${UI.si} · ${fechaLarga(r.fecha)}` : UI.no}</span></li> })}</ul></section>
    <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={descargar}>{MIS_DATOS.descargar}</button>
      <a className="boton boton--secundario" href="#/perfil/calculo/corregir">{MIS_DATOS.corregir}</a>
      <a className="boton boton--secundario" href="#/perfil/eliminar">{MIS_DATOS.eliminar}</a></div>
    {errDescarga && <p className="error" role="alert" style={{ marginTop: 8 }}>{errDescarga}</p>}
  </main>
}

// ——— Cómo se calcula (REP-04, REP-03) y Corregir o pedir revisión (REP-11) ———
function Calculo({ corregir }: { corregir: boolean }) {
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    {corregir ? <section className="glass tarjeta rp-texto"><h1 className="h2">{CORREGIR.titulo}</h1><p>{CORREGIR.intro}</p>{lista(CORREGIR.puntos)}
      {CORREGIR.parrafos.map((t, k) => <p key={k}><Md t={t} /></p>)}
      <div className="rp-acciones"><a className="rp-boton rp-boton--ancho" href="#/perfil/revision">{CORREGIR.boton}</a></div></section> : <>
      <TextoCalculo />
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
function Tarjeta({ x, zona }: { x: Ejemplo; zona: string }) {
  const nuevo = x.cerrados < MINIMO_PARA_PUNTAJE, p = { cerrados: x.cerrados, valor: x.valor, enRevision: false }
  return <li className="glass rp-tarjeta"><Banda mini />{nuevo && <span className="rp-espacio rp-ondas">{VITRINA.espacio}</span>}
    <div className="rp-tarjeta__cuerpo"><div className="rp-tarjeta__cab"><Avatar nombre={x.nombre} rol={x.rol} mini /><div>
      <p className="rp-tarjeta__nombre">{x.nombre}</p><div className="rp-fila" style={{ marginTop: 0 }}><Papel rol={x.rol} /><span className="chip chip--neutro chip--mini">{UI.ejemplo}</span></div></div></div>
      <p className="nota" style={{ marginTop: 10 }}>{zona} · {x.rol === 'dueno' ? UI.alquilaDesde(usd(x.precio)) : UI.buscaDe(`${usd(x.precio)} a ${usd(x.precio + 200)}`)}</p>
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
    {xs.length < MINIMO_POR_CANTON ? <p className="glass tarjeta">{VITRINA.vacio}</p> : <ul className="rp-vitrina" role="list">{ordenarVitrina(xs).map(x => <Tarjeta key={x.nombre} x={x} zona={zona} />)}</ul>}
    <p className="rp-aviso">{VITRINA.pie(rol === 'dueno' ? 'dueños' : 'inquilinos')}</p>
    <p className="rp-aviso">{AVISO_LISTA}</p>
  </main>
}

// ——— Eliminar la cuenta (REP-09): gratis, definitiva, en un máximo de 5 días hábiles (con un alquiler abierto, desde que se cierra) ———
/** Fecha y hora del pedido y su plazo: la fecha límite o, con un alquiler abierto, «cuando el alquiler se cierre». */
function PlazoBorrado({ s }: { s: Solicitud }) {
  return <>{s.limite ? <p className="nota" style={{ marginTop: 8 }}>{ELIMINAR_UI.limite(fechaLarga(s.limite))}</p> : <p style={{ marginTop: 8 }}>{ELIMINAR_UI.esperaCierre}</p>}
    {s.hora && <p className="nota" style={{ marginTop: 4 }}>{ELIMINAR_UI.pedido(fechaLarga(s.pedido), s.hora)}</p>}</>
}
/** Pedido hecho y la cuenta todavía no se elimina (espera el cierre del alquiler, o los 5 días hábiles): sin puntaje ni perfil. */
function BorradoEnCurso({ s }: { s: Solicitud }) {
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver />
    <section className="glass tarjeta" role="status"><h1 className="h2">{ELIMINAR_UI.enCurso}</h1><PlazoBorrado s={s} />
      <div className="rp-acciones"><a className="rp-boton rp-boton--ancho" href="#/">{ELIMINAR_UI.inicio}</a></div></section></main>
}
function Eliminar({ u, paso, salir }: { u: Usuario; paso?: string; salir: () => void }) {
  const todos = useAlquileres(), s = solicitudBorrado(u.email), abiertos = abiertosDe(todos, u.email).length > 0
  const [errBorrado, setErrBorrado] = useState<string | null>(null), [enviando, setEnviando] = useState(false), sf = useSegundoFactor(u.email)
  // Límite 5: en modo servidor, el pedido va al servidor (lk_pedir_borrado_cuenta); si falla, no se borra nada y se explica cómo seguir.
  // Segundo factor (Legal 25/10, 5:04 p. m.): en modo servidor, «Eliminar mi cuenta» primero pide el código del correo («Revisa tu correo»).
  const pedir = () => { if (enviando || sf.enviando) return; setErrBorrado(null)
    if (conServidor) { sf.pedir('eliminar', setErrBorrado); return }
    const ahora = Date.now(); setEnviando(true)
    eliminarCuenta(u.email, todos, ahora).then(() => ir('/perfil/eliminar/listo'), () => { setErrBorrado(UI.errBorrado); setEnviando(false) }) }
  const [errDescarga, setErrDescarga] = useState<string | null>(null)
  const descargar = () => { setErrDescarga(null)
    if (conServidor) sf.pedir('descargar', setErrDescarga)
    else datosDeDescarga(u, todos).then(d => bajar(d, 'lockumi-reputacion.json'), () => setErrDescarga(UI.errDescarga)) }
  if (sf.codigo && !s) return <CodigoCorreo c={sf.codigo} err={sf.err} enviando={sf.enviando} reenviar={sf.reenviar} cancelar={sf.cancelar}
    confirmar={v => sf.confirmar(v, codigo => sf.codigo!.accion === 'eliminar'
      ? eliminarCuenta(u.email, todos, Date.now(), codigo).then(() => ir('/perfil/eliminar/listo'))
      : datosDeDescarga(u, todos, undefined, codigo).then(d => bajar(d, 'lockumi-reputacion.json')))} />
  if (s && (paso === 'listo' || !s.hecho)) {
    if (s.hecho || s.limite) return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
      <section className="glass tarjeta" role="status"><h1 className="h2">{s.hecho ? ELIMINAR.listo : ELIMINAR_UI.enCurso}</h1><PlazoBorrado s={s} />
        <div className="rp-acciones"><button type="button" className="rp-boton rp-boton--ancho" onClick={() => { location.hash = '/'; salir() }}>{ELIMINAR_UI.salir}</button></div></section></main>
    return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
      <section className="glass tarjeta" role="status"><h1 className="h2">{ELIMINAR_UI.listoAbierto}</h1><PlazoBorrado s={s} />
        <div className="rp-acciones"><a className="rp-boton rp-boton--ancho" href="#/">{ELIMINAR_UI.inicio}</a></div></section></main>
  }
  if (paso === 'confirmar' && abiertos && !s) return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <section className="glass tarjeta rp-texto" role="alertdialog" aria-labelledby="rp-conf"><h1 id="rp-conf" className="h2">{ELIMINAR.titulo}</h1><p>{ELIMINAR.confirmarAbierto}</p>
      <div className="rp-acciones">
        <button type="button" className="boton rp-peligro" onClick={pedir} disabled={enviando}>{ELIMINAR.si}</button>
        <a className="boton boton--secundario" href="#/perfil/eliminar">{ELIMINAR.no}</a></div>
      {errBorrado && <p className="error" role="alert" style={{ marginTop: 8 }}>{errBorrado}</p>}</section></main>
  return <main id="contenido" tabIndex={-1} className="cont rp" style={{ paddingBottom: 48 }}>
    <Volver a="#/perfil" t="← Tu perfil" />
    <section className="glass tarjeta rp-texto"><h1 className="h2">{ELIMINAR.titulo}</h1><p>{ELIMINAR.intro}</p><ul>{ELIMINAR.puntos.map((t, k) => <li key={k}>{t}</li>)}</ul>
      <p className="nota">{ELIMINAR.correo}</p>
      <div className="rp-acciones">
        <button type="button" className="boton boton--secundario" onClick={descargar}>{ELIMINAR.descargar}</button>
        <button type="button" className="boton rp-peligro" disabled={enviando} onClick={() => { if (abiertos) ir('/perfil/eliminar/confirmar'); else pedir() }}>{ELIMINAR.si}</button>
        <a className="boton boton--secundario" href="#/perfil">{ELIMINAR.no}</a></div>
      {errDescarga && <p className="error" role="alert" style={{ marginTop: 8 }}>{errDescarga}</p>}
      {errBorrado && <p className="error" role="alert" style={{ marginTop: 8 }}>{errBorrado}</p>}</section>
  </main>
}

/** Rutas que crean o unen a un alquiler NUEVO (bloqueadas mientras hay un pedido de borrado pendiente). */
const esNuevo = (r: string) => r === '/crear' || r.startsWith('/invitacion/')
/** Regla 6: los perfiles no aparecen en buscadores (noindex en todas las rutas #/perfil). */
function useNoIndex(activo: boolean) {
  useEffect(() => { if (!activo || typeof document === 'undefined') return
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m)
    return () => { m.remove() } }, [activo])
}

/** Con VITE_REPUTACION=1, App.tsx pasa por aquí TODAS las pantallas con sesión:
 *  1) si entró aceptando los Términos 1.13-demo (la casilla nombra el perfil), se registra su perfil (REP-01) con esa fecha y hora;
 *  2) con un pedido de borrado pendiente, crear o unirse a un alquiler nuevo muestra el aviso de Legal (los abiertos siguen igual);
 *  3) sin perfil (cuentas que ya existían): la app de siempre, sin perfil público, sin pantallas, casillas ni avisos extra y sin
 *  bloqueos (Katherine, 26/10 2:26 a. m.: la aceptación solo ocurre con la casilla de la pantalla de inicio);
 *  4) con perfil, «Nombre visible y cantón» al crear o unirse a un alquiler (o en #/perfil), nunca entre la entrada e Inicio;
 *  5) las rutas #/perfil/… o la pantalla de siempre (children). */
export default function Reputacion({ u, r, salir, children }: { u: Usuario; r: string; salir: () => void; children?: ReactNode }) {
  // Legal (26/10/2026): aceptar los Términos 1.13-demo en la pantalla de inicio ES aceptar el perfil. Se registra la casilla exacta,
  // con la fecha y hora de esa aceptación (u.terminos.fecha). Una cuenta con un REP-01 anterior lo conserva (aceptarRep01 no lo pisa).
  useState(() => { try { if (u.terminos?.version === V_REPUTACION) aceptarRep01(u.email, textoPerfil113(), u.terminos.fecha) } catch { /* sin almacenamiento */ } return 0 })
  const e = useReputacion(u.email)
  const porConfirmar = usePorConfirmar(u.email), [omitido, setOmitido] = useState(false)
  useEffect(() => { subirAceptacion(u.email, e.rep01).catch(() => { /* se reintenta en la próxima carga; el servidor explica qué hacer si bloquea */ }) }, [u.email, e.rep01])
  // Al confirmar el correo con el código (porConfirmar pasa a null) se reintenta: antes de eso el servidor la rechazaba (403) sin avisar.
  const sinConfirmar = !!porConfirmar, estuvoSinConfirmar = useRef(false)
  useEffect(() => { if (sinConfirmar) { estuvoSinConfirmar.current = true; return }
    if (estuvoSinConfirmar.current) { estuvoSinConfirmar.current = false; subirAceptacion(u.email, e.rep01).catch(() => { /* idem */ }) } }, [sinConfirmar, u.email, e.rep01])
  const [raiz, a, b] = r.split('/').filter(Boolean)   // ['perfil', a, b]
  const perfil = raiz === 'perfil'
  useNoIndex(perfil)
  const todos = useAlquileres(), borrado = solicitudBorrado(u.email), pendiente = !!borrado && !borrado.hecho
  // Tarea programada de la demo: borra los pedidos vencidos y, con un alquiler abierto, cuando ya se cerró (nunca toca los alquileres).
  useEffect(() => { try { ejecutarBorrados(Date.now(), todos) } catch { /* sin almacenamiento */ } }, [todos])
  const [aviso, avisoListo] = useAvisos(u, !pendiente)
  // Legal 9:00 p. m.: entró con el código por correo de Cavos → primero «Revisa tu correo» (el código de Lockumi). «Cancelar» la oculta
  // en esta carga; sin el código el servidor no da el correo por verificado (las acciones de la reputación dicen cómo seguir).
  const enRecorrido = useSyncExternalStore(suscribirRecorrido, recorridoEnCurso, () => false)
  if (porConfirmar && !omitido) return <ConfirmarCorreo key={porConfirmar.correo} p={porConfirmar} cancelar={() => setOmitido(true)} />
  if (perfil && a === 'eliminar') return <Eliminar u={u} paso={b} salir={salir} />
  // Pedido de borrado en curso (definitivo): el perfil no se muestra y el puntaje no se recalcula ni se avisa; la app sigue para cerrar el alquiler.
  if (pendiente) return esNuevo(r) ? <BloqueoBorrado /> : perfil ? <BorradoEnCurso s={borrado} /> : <>{children}</>
  // Cuenta que ya existía (sin perfil): no tiene perfil y sigue igual. Solo «Eliminar mi cuenta» (arriba) sigue disponible.
  if (!e.rep01) return <>{children}</>
  // «Nombre visible y cantón» (Katherine, 26/10): al crear o unirse a un alquiler, o en #/perfil; la entrada lleva directo a Inicio.
  // Durante el «Recorrido de primera vez» no se muestra: los pasos 2 y 3 señalan el formulario de «Nuevo alquiler» (26/10, 2:32 a. m.).
  if ((!e.nombre || !e.canton) && (perfil || (esNuevo(r) && !enRecorrido))) return <Datos u={u} e={e} salir={salir} />
  const avisoEl = aviso && !(perfil && a === 'revision') ? <AvisoPuntaje a={aviso} listo={avisoListo} /> : null
  if (!perfil) return <>{avisoEl}{children}</>
  const pantalla = a === 'calculo' ? <Calculo corregir={b === 'corregir'} /> : a === 'llave' ? <Llave /> : a === 'revision' ? <PedirRevision u={u} />
    : a === 'vitrina' ? <Vitrina rol={b === 'inquilinos' ? 'inquilino' : 'dueno'} />
    : b === 'aparecer' ? <Aparecer u={u} rol={rolDeRuta(a)} /> : b === 'datos' ? <MisDatos u={u} rol={rolDeRuta(a)} /> : <MiPerfil u={u} rol={rolDeRuta(a)} />
  return <>{avisoEl}{pantalla}</>
}
