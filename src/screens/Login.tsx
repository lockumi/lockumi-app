import { useEffect, useRef, useState } from 'react'
import { auth, formatoCodigo as F, modoReal } from '../services/auth'
import type { Usuario } from '../types'
import { Demo, Icono } from '../ui'
import { alertaIngresoFallo } from '../alertas'
import { CasillaLegal } from '../legal/CasillaLegal'
import { consentimientoPrivacidad, casillaTerminos, terminosActual, privacidadActual } from '../legal/documentos'
import { aceptoVersion, borrarAceptacion, guardarAceptacion, validarAceptaciones, erroresTrasCambio, ERRORES_INICIALES, type ClaveLegal } from '../legal/aceptacion'

type Paso = 'opciones' | 'correo' | 'codigo'
const G = () => <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
const A = () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8s2.2-1.3 3-2.5c1-1.4 1.3-2.7 1.4-2.8-.1 0-2.4-.9-2.4-4.2zM13.9 5c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg>

/** `correo`: «Entrar de nuevo» con correo (firmante, 26/10): abre directo en el paso del correo, ya escrito. */
export function Hoja({ onCerrar, onOk, correo, inicio = 'opciones' }: { onCerrar: () => void; onOk: (u: Usuario) => void; correo?: string; inicio?: Paso }) {
  const [paso, setPaso] = useState<Paso>(correo ? 'correo' : inicio); const [email, setEmail] = useState(correo ?? ''); const [codigo, setCodigo] = useState('')
  const [cargando, setC] = useState<string | null>(null); const [err, setErr] = useState(''); const [reenviado, setReenviado] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'Tab' && ref.current) { const f = ref.current.querySelectorAll<HTMLElement>('button,input,a[href]'); const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() } }
    }
    addEventListener('keydown', tecla); document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', tecla); document.body.style.overflow = ''; prev?.focus() }
  }, [onCerrar])
  useEffect(() => { ref.current?.querySelector<HTMLElement>('input,button.boton-social')?.focus() }, [paso])
  const social = async (m: 'google' | 'apple') => { setC(m); setErr(''); try { onOk(await (m === 'google' ? auth.loginGoogle() : auth.loginApple())) } catch { setC(null); setErr('No pudimos conectar. Inténtalo de nuevo.') } }
  const enviar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Escribe un correo válido.')
    setC('correo'); try { await auth.sendOtp(email.trim()) } catch (e) { setC(null); return setErr(e instanceof Error && /not supported/i.test(e.message) ? 'Ese proveedor de correo aún no es compatible. Prueba con Gmail u Outlook.' : 'No pudimos enviar el código. Inténtalo de nuevo.') } setC(null); setCodigo(''); setReenviado(false); setPaso('codigo')
  }
  const verificar = async () => {
    if (codigo.length !== F.largo) return setErr(modoReal ? 'El código tiene 9 caracteres.' : 'El código tiene 6 dígitos.')
    setC('codigo'); try { onOk(await auth.verifyOtp(email.trim(), codigo)) } catch { setC(null); setErr('Ese código no funcionó. Inténtalo de nuevo.') }
  }
  const titulo = { opciones: 'Entrar a Lockumi', correo: 'Continuar con tu correo', codigo: 'Te enviamos un código' }[paso]
  return <div className="velo" onClick={e => e.target === e.currentTarget && onCerrar()}>
    <div ref={ref} className="hoja" role="dialog" aria-modal="true" aria-labelledby="hoja-t">
      <div className="hoja__asa" aria-hidden="true" />
      <div className="hoja__cab">
        {paso !== 'opciones' ? <button type="button" className="boton-icono" aria-label="Atrás" onClick={() => { setErr(''); setPaso(paso === 'codigo' ? 'correo' : 'opciones') }}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button> : <span style={{ width: 40 }} />}
        <h2 id="hoja-t">{titulo}</h2>
        <button type="button" className="boton-icono" aria-label="Cerrar" onClick={onCerrar}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>
      {paso === 'opciones' && <div className="pila">
        <button type="button" className="boton-social" disabled={!!cargando} onClick={() => social('google')}><G /><span>{cargando === 'google' ? 'Conectando…' : 'Continuar con Google'}</span></button>
        <button type="button" className="boton-social" disabled={!!cargando} onClick={() => social('apple')}><A /><span>{cargando === 'apple' ? 'Conectando…' : 'Continuar con Apple'}</span></button>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="sep">o</div>
        <button type="button" className="boton boton--secundario boton--ancho" disabled={!!cargando} onClick={() => setPaso('correo')}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg> Continuar con tu correo</button>
      </div>}
      {paso === 'correo' && <form className="pila" noValidate onSubmit={e => { e.preventDefault(); enviar() }}>
        <p className="nota">Te enviaremos un código {modoReal ? 'de 9 caracteres' : 'de 6 dígitos'} para entrar. Sin contraseñas.</p>
        <label className="campo"><span>Correo electrónico</span><input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} placeholder="nombre@correo.com" /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button type="submit" className="boton boton--primario boton--ancho" disabled={!!cargando}>{cargando ? 'Enviando…' : 'Enviar código'}</button>
      </form>}
      {paso === 'codigo' && <form className="pila" noValidate onSubmit={e => { e.preventDefault(); verificar() }}>
        <p className="nota">Escribe el código que enviamos a <strong className="cortar">{email.trim()}</strong>. {!modoReal && <Demo t="Demo: cualquier código de 6 dígitos" />}</p>
        <label className="campo"><span>{F.etiqueta}</span>
          <input className="codigo" inputMode={F.teclado} autoCapitalize="none" autoComplete="one-time-code" maxLength={F.largo} value={codigo} placeholder={"•".repeat(F.largo)}
            onChange={e => { setCodigo(F.limpiar(e.target.value)); setErr('') }} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button type="submit" className="boton boton--primario boton--ancho" disabled={!!cargando || codigo.length !== F.largo}>{cargando ? 'Verificando…' : 'Entrar'}</button>
        <p className="nota centro" role="status">{reenviado ? 'Te enviamos un código nuevo.' : '¿No te llegó?'}{' '}
          <button type="button" className="enlace" onClick={async () => { setErr(''); try { await auth.sendOtp(email.trim()); setReenviado(true) } catch { setErr('No pudimos enviar el código. Inténtalo de nuevo.') } }}>Reenviar código</button></p>
      </form>}
      <p className="nota centro hoja__pie"><Icono id="i-escudo" className="ico--salvia" /> Acceso seguro con Cavos{!modoReal && <> · <Demo /></>}</p>
    </div>
  </div>
}

/** Mientras se confirma el regreso de Google o Apple: la casita con la llave y una línea, sin la pantalla Entrar.
 *  `aria-busy`, un `role="status"` y una barra indeterminada (no hay avance real que mostrar).
 *  Con «reducir movimiento» la barra queda quieta (regla global de index.css).
 *  La casita es un solo archivo: la llave y la puerta no existen por separado, así que no se animan.
 *  La franja de esta pantalla dice la frase de Stellar; el aviso del resto de la app no cambia. */
export function Entrando() {
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app ingreso-cargando carga-cuenta" aria-busy="true">
    <div className="aviso-red carga-cuenta__franja" role="note">Red de prueba de Stellar: sin dinero real.</div>
    <img className="entrada-hoja entrada-hoja--sup" src={HOJAS} alt="" />
    <img className="entrada-hoja entrada-hoja--inf" src={HOJAS} alt="" />
    <div className="entrada-logo carga-cuenta__logo"><img src="/img/logo-header.png" alt="" /><span>Lockumi</span></div>
    <div className="carga-cuenta__escena" aria-hidden="true">
      <img className="carga-cuenta__hojas" src={HOJAS} alt="" />
      <div className="carga-cuenta__placa"><img className="carga-cuenta__casa" src="/img/bienvenida-escena.png" alt="" /></div>
    </div>
    <p className="entrada-app__titulo carga-cuenta__titulo" role="status">Entrando a tu cuenta…</p>
    <div className="carga-cuenta__barra" role="progressbar" aria-label="Entrando a tu cuenta" aria-valuemin={0} aria-valuemax={100}><span /></div>
    <p className="carga-cuenta__pildora" role="note"><Matraz /><span><strong>Red de prueba de Stellar:</strong><span>sin dinero real.</span></span></p>
  </main>
}

/** Texto aprobado por Legal (23 oct 2026): el mismo del aviso `ingreso-fallo`. */
const ERROR_INGRESO = alertaIngresoFallo()

const CASA = '/img/katherine/01-casa-simple-arbol.png'
const ARBOL = '/img/katherine/04-arbol.png'
const HOJAS = '/img/katherine/11-hojas.png'
const PAISAJE = '/img/katherine/12-paisaje.png'

/** Espejo de la casita, solo en esta pantalla. Katherine lo aprobó: queda encendido.
 *  `false` vuelve a v1: se ve 04-arbol y la casa sin voltear. No toca ningún archivo de imagen. */
const ESPEJO_CASA = true

/** La casita de la entrada: las mismas capas de Katherine. La hoja grande de atrás es el 11-hojas original. */
function EscenaEntrada() {
  return <div className={ESPEJO_CASA ? 'porta-escena porta-escena--espejo' : 'porta-escena'} aria-hidden="true">
    <img className="porta-escena__paisaje" src={PAISAJE} alt="" />
    <img className="porta-escena__hojas" src={HOJAS} alt="" />
    <img className="porta-escena__arbol" src={ARBOL} alt="" />
    <img className="porta-escena__casa" src={CASA} alt="" />
  </div>
}

function Sobre() {
  return <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
}
function Matraz() {
  return <svg className="entrada-matraz" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L5.5 18A3.2 3.2 0 0 0 8.4 22h7.2a3.2 3.2 0 0 0 2.9-4L14 9V3" /><path d="M8 15h8" /></svg>
}

// LEGAL: revisado (24/10) · dos-personas-textos.md, D: nota visible bajo el título (Ley 7472, art. 37)
export const NOTA_TITULO = 'Demo en la red de prueba de Stellar, sin dinero real. No es un seguro ni una garantía de devolución.'

/** `invitacion`: paso21, la persona que abrió un link de invitación sin sesión ve una pantalla corta (Katherine/Legal 25/10, 10:15 p. m.):
 *  título y subtítulo de la invitación en lugar del título, sin la lista de beneficios. Las casillas, «Entrar» y la nota legal no cambian. */
export function Login({ onOk, error = false, onReintento, invitacion }: { onOk: (u: Usuario) => void; error?: boolean; onReintento?: () => void; invitacion?: { titulo: string; subtitulo: string } }) {
  const [abierta, setAbierta] = useState(false)
  const [tab, setTab] = useState<'iniciar' | 'crear'>('iniciar')
  const [pasoHoja, setPasoHoja] = useState<Paso>('opciones')
  const [falta, setFalta] = useState(false)
  // Dos casillas obligatorias y separadas: Términos, y Aviso de privacidad con transferencia de datos.
  // Paso 16: la versión vigente (1.7-demo con el interruptor encendido). La pantalla no cambia: solo el texto detrás de los enlaces.
  const PRIVACIDAD = privacidadActual(), pidePrivacidad = !!PRIVACIDAD
  const VERSION: Record<ClaveLegal, string> = { terminos: terminosActual().version, privacidad: PRIVACIDAD?.version ?? '' }
  const [marcas, setMarcas] = useState(() => ({ terminos: aceptoVersion('terminos', VERSION.terminos), privacidad: !pidePrivacidad || aceptoVersion('privacidad', VERSION.privacidad) }))
  const [errores, setErrores] = useState<Partial<Record<ClaveLegal, string>>>(ERRORES_INICIALES)
  const refT = useRef<HTMLInputElement>(null), refP = useRef<HTMLInputElement>(null)
  const aceptado = marcas.terminos && (!pidePrivacidad || marcas.privacidad)
  const entrar = () => {
    const e = validarAceptaciones(marcas); setErrores(e)
    if (e.terminos) return refT.current?.focus()
    if (e.privacidad) return refP.current?.focus()
    for (const c of ['terminos', 'privacidad'] as const) if (VERSION[c] && (c === 'terminos' || pidePrivacidad) && !aceptoVersion(c, VERSION[c])) guardarAceptacion(c, VERSION[c])
    onReintento?.(); setAbierta(true)
  }
  const cambiar = (c: ClaveLegal) => (v: boolean) => {
    setMarcas(m => ({ ...m, [c]: v })); setErrores(e => erroresTrasCambio(e, c, v))
    if (v) guardarAceptacion(c, VERSION[c]); else borrarAceptacion(c)
  }
  const marcarCrear = (v: boolean) => { setFalta(false); cambiar('terminos')(v); if (pidePrivacidad) cambiar('privacidad')(v) }
  const anotar = () => {
    for (const c of ['terminos', 'privacidad'] as const) if (VERSION[c] && (c === 'terminos' || pidePrivacidad) && !aceptoVersion(c, VERSION[c])) guardarAceptacion(c, VERSION[c])
    setMarcas({ terminos: true, privacidad: true })
  }
  const conCorreo = () => { setPasoHoja('correo'); onReintento?.(); setAbierta(true) }
  const crear = () => { if (!aceptado) return; anotar(); conCorreo() }
  const [ocupado, setOcupado] = useState<string | null>(null)
  const pulsar = async (m: 'google' | 'apple' | 'correo') => {
    if (tab === 'crear' && !aceptado) { setFalta(true); document.getElementById('acepto-crear')?.focus(); return }
    setOcupado(m); setFalta(false)
    if (tab === 'iniciar') anotar()
    if (m === 'correo') { setOcupado(null); return conCorreo() }
    try { onOk(await (m === 'google' ? auth.loginGoogle() : auth.loginApple())) } catch { setOcupado(null) }
  }
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app entrada-portada">
    <img className="entrada-hoja entrada-hoja--sup" src={HOJAS} alt="" />
    <img className="entrada-hoja entrada-hoja--inf" src={HOJAS} alt="" />
    <div className="entrada-lado">
      <a className="entrada-logo" href="#/" aria-label="Lockumi"><img src="/img/logo-header.png" alt="" /><span>Lockumi</span></a>
      <span className="entrada-rayita" aria-hidden="true" />
      <h1 className="entrada-hero__titulo">{invitacion ? invitacion.titulo : <>Tu espacio, <br />más seguro.</>}</h1>
      <p className="entrada-hero__bajada">{invitacion?.subtitulo ?? 'Accede a tu cuenta o crea una nueva para comenzar.'}</p>
      <EscenaEntrada />
    </div>
    <section className="entrada-tarjeta" aria-label="Acceso">
      <div className="entrada-pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'iniciar'} className={tab === 'iniciar' ? 'is-on' : ''} onClick={() => setTab('iniciar')}>Iniciar sesión</button>
        <button type="button" role="tab" aria-selected={tab === 'crear'} className={tab === 'crear' ? 'is-on' : ''} onClick={() => setTab('crear')}>Crear cuenta</button>
      </div>
      {tab === 'iniciar' ? <>
        <h2 className="entrada-tarjeta__titulo">Inicia sesión</h2>
        <p className="entrada-tarjeta__bajada">Usa tu método preferido para continuar.</p>
      </> : <>
        <h2 className="entrada-tarjeta__titulo">Crea tu cuenta</h2>
        <p className="entrada-tarjeta__bajada">Es rápido, seguro y sin complicaciones.</p>
      </>}
      <div className="entrada-metodos">
        <button type="button" className="entrada-metodo" disabled={!!ocupado} onClick={() => void pulsar('apple')}><A /><span>{ocupado === 'apple' ? 'Conectando…' : 'Continuar con Apple'}</span></button>
        <button type="button" className="entrada-metodo" disabled={!!ocupado} onClick={() => void pulsar('google')}><G /><span>{ocupado === 'google' ? 'Conectando…' : 'Continuar con Google'}</span></button>
        <button type="button" className="entrada-metodo entrada-metodo--correo" disabled={!!ocupado} onClick={() => void pulsar('correo')}><Sobre /><span>Continuar con correo electrónico</span></button>
      </div>
      {tab === 'iniciar' ? <>
        <div className="entrada-linea" aria-hidden="true" />
        <p className="entrada-legal">Al iniciar sesión, aceptas nuestros <a href="/terminos" target="_blank" rel="noopener">Términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</p>
      </> : <>
        <label className="entrada-check">
          <input id="acepto-crear" type="checkbox" checked={aceptado} onChange={e => marcarCrear(e.target.checked)} />
          <span>Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a></span>
        </label>
        {falta && <p className="error" role="alert">Marca la casilla para crear la cuenta.</p>}
        <button type="button" className="boton boton--primario boton--ancho entrada-crear" disabled={!aceptado || !!ocupado} onClick={crear}>Crear cuenta</button>
      </>}
      {error && <div id="error-ingreso" className="entrada-app__error"><strong>{ERROR_INGRESO.titulo}</strong> <span>{ERROR_INGRESO.hecho}</span></div>}
      <div className="entrada-red" role="note">
        <Matraz />
        <p><strong>Red de prueba de Stellar</strong><span>Estás usando una versión de prueba (testnet).</span></p>
      </div>
    </section>
    {/* El bloque de siempre queda en el HTML (casillas, nota y Entrar) para no cambiar la aceptación ni las pruebas. No se muestra. */}
    <div className="entrada-legado">
      <h2 className="entrada-app__titulo">{invitacion?.titulo ?? 'El depósito de tu alquiler, protegido'}</h2>{invitacion && <p className="entrada-app__sub">{invitacion.subtitulo}</p>}
      {!invitacion && <p className="entrada-bajada">Custodia neutral · reglas claras · devolución automática</p>}
      <p className="nota centro entrada-app__nota">{NOTA_TITULO}</p>
      {!invitacion && <p className="nota centro">Ni el dueño ni el inquilino pueden liberarlo solos.</p>}
      {!invitacion && <ul className="entrada-papeles" aria-label="Los dos papeles. Esta lista no elige ninguno.">
        <li><strong>Dueño</strong><span>Evidencia ordenada</span></li>
        <li><strong>Inquilino</strong><span>Depósito seguro</span></li>
      </ul>}
      <div className="casillas-legales">
        <CasillaLegal id="acepto-terminos" ref={refT} marcada={marcas.terminos} onCambio={cambiar('terminos')} error={errores.terminos} nota={casillaTerminos().linea}>
          {casillaTerminos().antes}<a href="/terminos" target="_blank" rel="noopener">{casillaTerminos().enlace}</a>{casillaTerminos().despues}</CasillaLegal>
        {pidePrivacidad && <CasillaLegal id="acepto-privacidad" ref={refP} marcada={marcas.privacidad} onCambio={cambiar('privacidad')} error={errores.privacidad}>
          {consentimientoPrivacidad().antes}<a href="/privacidad" target="_blank" rel="noopener">{consentimientoPrivacidad().enlace}</a>{consentimientoPrivacidad().despues}</CasillaLegal>}
      </div>
      <button type="button" className="boton boton--primario boton--ancho" onClick={entrar} aria-haspopup="dialog" aria-describedby={error ? 'error-ingreso' : undefined}>Entrar</button>
      <p className="nota centro">Con Google, Apple o tu correo. Sin contraseñas.</p>
      <p className="centro"><Demo /></p>
    </div>
    {abierta && <Hoja inicio={pasoHoja} onCerrar={() => { setAbierta(false); setPasoHoja('opciones') }} onOk={onOk} />}
  </main>
}
