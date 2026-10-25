import { useEffect, useRef, useState } from 'react'
import { auth, formatoCodigo as F, modoReal } from '../services/auth'
import type { Usuario } from '../types'
import { Demo, Icono } from '../ui'
import { LogoAnimado } from '../LogoAnimado'
import { alertaIngresoFallo } from '../alertas'
import { WORDMARK_SVG } from '../wordmark'
import { CasillaLegal } from '../legal/CasillaLegal'
import { CONSENTIMIENTO_PRIVACIDAD as cons, PRIVACIDAD, TERMINOS } from '../legal/documentos'
import { aceptoVersion, borrarAceptacion, guardarAceptacion, validarAceptaciones, erroresTrasCambio, ERRORES_INICIALES, type ClaveLegal } from '../legal/aceptacion'

type Paso = 'opciones' | 'correo' | 'codigo'
const G = () => <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
const A = () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8s2.2-1.3 3-2.5c1-1.4 1.3-2.7 1.4-2.8-.1 0-2.4-.9-2.4-4.2zM13.9 5c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg>

function Hoja({ onCerrar, onOk }: { onCerrar: () => void; onOk: (u: Usuario) => void }) {
  const [paso, setPaso] = useState<Paso>('opciones'); const [email, setEmail] = useState(''); const [codigo, setCodigo] = useState('')
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
          <button type="button" className="enlace" onClick={async () => { await auth.sendOtp(email.trim()); setReenviado(true) }}>Reenviar código</button></p>
      </form>}
      <p className="nota centro hoja__pie"><Icono id="i-escudo" className="ico--salvia" /> Acceso seguro con Cavos{!modoReal && <> · <Demo /></>}</p>
    </div>
  </div>
}

/** Mientras se confirma el regreso de Google o Apple: la casita con la llave y una línea, sin la pantalla Entrar.
 *  `aria-busy` y un `role="status"`; con «reducir movimiento» la casita queda quieta (regla global de index.css). */
export function Entrando() {
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app ingreso-cargando" aria-busy="true">
    <LogoAnimado className="entrada-app__arte marca-c__arte" />
    <p className="entrada-app__titulo" role="status">Entrando a tu cuenta…</p>
  </main>
}

/** Texto aprobado por Legal (23 oct 2026): el mismo del aviso `ingreso-fallo`. */
const ERROR_INGRESO = alertaIngresoFallo()

// LEGAL: revisado (24/10) · dos-personas-textos.md, D: nota visible bajo el título (Ley 7472, art. 37)
export const NOTA_TITULO = 'Demo en la red de prueba de Stellar, sin dinero real. No es un seguro ni una garantía de devolución.'

export function Login({ onOk, error = false, onReintento }: { onOk: (u: Usuario) => void; error?: boolean; onReintento?: () => void }) {
  const [abierta, setAbierta] = useState(false)
  // Dos casillas obligatorias y separadas: Términos, y Aviso de privacidad con transferencia de datos.
  const pidePrivacidad = !!PRIVACIDAD
  const VERSION: Record<ClaveLegal, string> = { terminos: TERMINOS.version, privacidad: PRIVACIDAD?.version ?? '' }
  const [marcas, setMarcas] = useState(() => ({ terminos: aceptoVersion('terminos', VERSION.terminos), privacidad: !pidePrivacidad || aceptoVersion('privacidad', VERSION.privacidad) }))
  const [errores, setErrores] = useState<Partial<Record<ClaveLegal, string>>>(ERRORES_INICIALES)
  const refT = useRef<HTMLInputElement>(null), refP = useRef<HTMLInputElement>(null)
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
  const beneficios = [
    { ico: 'i-candado', t: 'Tu depósito queda guardado', d: 'Ni el dueño ni el inquilino pueden liberarlo solos.' },   // LEGAL: revisado (24/10)
    { ico: 'i-camara', t: 'Actas con fotos', d: 'Entrada y salida, firmadas por ambos.' },
    { ico: 'i-balanza', t: 'Reclamos claros', d: 'La mayoría se resuelve en la app.' },
  ]
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app">
    <h1 className="marca-c" aria-label="Lockumi"><span dangerouslySetInnerHTML={{ __html: WORDMARK_SVG }} /></h1>
    <LogoAnimado className="entrada-app__arte marca-c__arte" />
    <h2 className="entrada-app__titulo">El depósito de tu alquiler, protegido</h2>
    <p className="nota centro entrada-app__nota">{NOTA_TITULO}</p>
    <ul className="beneficios">{beneficios.map(b => <li key={b.t} className="glass">
      <span className="beneficios__ico"><Icono id={b.ico} /></span><span><strong>{b.t}</strong><br /><span className="nota">{b.d}</span></span></li>)}</ul>
    <div className="casillas-legales">
      <CasillaLegal id="acepto-terminos" ref={refT} marcada={marcas.terminos} onCambio={cambiar('terminos')} error={errores.terminos}>
        Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos y condiciones</a></CasillaLegal>
      {pidePrivacidad && <CasillaLegal id="acepto-privacidad" ref={refP} marcada={marcas.privacidad} onCambio={cambiar('privacidad')} error={errores.privacidad}>
        {cons.antes}<a href="/privacidad" target="_blank" rel="noopener">{cons.enlace}</a>{cons.despues}</CasillaLegal>}
    </div>
    {error && <div id="error-ingreso" className="entrada-app__error"><strong>{ERROR_INGRESO.titulo}</strong> <span>{ERROR_INGRESO.hecho}</span></div>}
    <button type="button" className="boton boton--primario boton--ancho" onClick={entrar} aria-haspopup="dialog" aria-describedby={error ? 'error-ingreso' : undefined}>Entrar</button>
    <p className="nota centro">Con Google, Apple o tu correo. Sin contraseñas.</p>
    <p className="centro"><Demo /></p>
    {abierta && <Hoja onCerrar={() => setAbierta(false)} onOk={onOk} />}
  </main>
}
