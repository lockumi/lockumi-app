import { pruebaCompleta } from './prueba/interruptor'
import { modoReal } from './services/auth'
import { abrirRecorrido } from './recorrido'
import { modoPrueba, escrowReal } from './servidor/config'
import { useEffect, useState, type ReactNode } from 'react'
import { Plegable } from './screens/Plegable'
import type { Usuario, Alquiler } from './types'
import { ETAPAS, etapaDe } from './flujo'

export const Demo = ({ t = 'Demo: simulado' }: { t?: string }) => modoReal ? null : <span className="demo" title="Integración simulada para la demo">{t}</span>
export const Icono = ({ id, className = '' }: { id: string; className?: string }) =>
  <svg className={'ico ' + className} aria-hidden="true" focusable="false"><use href={'#' + id} /></svg>
export const Deco = ({ id, size = 48, className = '' }: { id: string; size?: number; className?: string }) =>
  <svg className={'deco ' + className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href={'#' + id} /></svg>

export function Barra({ u, onSalir }: { u: Usuario; onSalir: () => void }) {
  return <header className="cont barra">
    <a href="#/" className="logo" aria-label="Lockumi, ir a tus alquileres"><img src="/img/logo-lockumi.svg" alt="" /></a>
    <div className="barra__der">
      <span className="barra__usuario cortar" title={u.email}>{u.email}</span>
      <button type="button" className="boton-ayuda" aria-label="¿Cómo funciona?" onClick={e => abrirRecorrido(u, { quien: e.currentTarget })}>
        <span className="boton-ayuda__i" aria-hidden="true">?</span><span className="boton-ayuda__t" aria-hidden="true">¿Cómo funciona?</span></button>
      <button type="button" className="boton-icono" onClick={onSalir} aria-label="Salir" title="Salir">
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/></svg>
      </button>
    </div>
  </header>
}
// LEGAL: revisado (24/10, 11:25 p. m.) · cambio visible con el OK de Katherine (24/10, 11:39 p. m.)
export const AVISO_RED = 'Red de prueba de Stellar: sin dinero real.'
/** Mismo aviso mientras el depósito sea simulado (modoVideo): no promete movimientos reales en la red. */
export const AVISO_RED_SIMULADO = 'Red de prueba: sin dinero real, depósito simulado'
// LEGAL: revisado (Legal 25/10, 10:30 p. m., texto literal) · paso21 v3: junto al aviso de la red, solo en la invitación y en la vista del
// alquiler (App.tsx), y solo con escrow real (donde sale AVISO_RED). Coincide con el código: COMISION_TW = 0.003 por monto liberado
// (api/_lib/centimos.ts:4,12) y docs/testnet-e2e.md:118. La línea del plazo de 7 días NO se agregó: el código no coincide (ver
// docs/invitacion-enlace.md, «Línea del plazo»).
export const TEXTO_COMISION_TW = 'Trustless Work cobra una comisión del 0,3 % de cada monto que se libera.'
// LEGAL: revisado (26/10, 12:44 a. m., OK de Katherine a la hoja linea-plazo-v2): plazo de devolución, plegado y cerrado al entrar.
// «solo» SOLO si la corrida de cada hora paga (DEVOLUCION_CRON encendido, leído de GET /api/config); si está apagado, termina distinto.
export const TITULO_PLAZO_DEVOLUCION = 'Plazo de devolución'
const PLAZO_BASE = 'El dueño tiene 7 días para revisar la casa y reclamar, desde que toca «Recibí la casa» o, si no lo toca, desde 2 días después de la entrega. Si el último día cae en domingo o feriado, el plazo pasa al siguiente día hábil. Si no reclama a tiempo, '
export const TEXTO_PLAZO_DEVOLUCION = PLAZO_BASE + 'el depósito se devuelve solo al inquilino, menos el 0,3 % de comisión de Trustless Work.'
export const TEXTO_PLAZO_DEVOLUCION_SIN_CORRIDA = PLAZO_BASE + 'el inquilino recibe su depósito de vuelta cuando cualquiera de los dos abre el alquiler.'
let configPublica: Promise<boolean> | null = null
/** true solo si /api/config confirma la corrida encendida; ante cualquier duda (error, sin red), false = texto sin «solo». */
export const devolucionAutomatica = () => configPublica ??= fetch('/api/config').then(r => r.ok ? r.json() : null).then(j => j?.devolucionAutomatica === true).catch(() => false)
export function PlazoDevolucion({ automatica }: { automatica?: boolean }) {
  const [auto, setAuto] = useState(automatica ?? false)
  useEffect(() => { if (automatica !== undefined) return; let vivo = true; void devolucionAutomatica().then(v => { if (vivo) setAuto(v) }); return () => { vivo = false } }, [automatica])
  return <Plegable className="plegable--plazo" titulo={TITULO_PLAZO_DEVOLUCION}><p>{auto ? TEXTO_PLAZO_DEVOLUCION : TEXTO_PLAZO_DEVOLUCION_SIN_CORRIDA}</p></Plegable>
}
/** `comision`: agrega TEXTO_COMISION_TW justo debajo del aviso de la red y, debajo, el plegable «Plazo de devolución» (cerrado). */
export const Fondo = ({ children, comision = false }: { children: ReactNode; comision?: boolean }) => <><div className="aurora" aria-hidden="true"><div className="blob blob--1"/><div className="blob blob--2"/><div className="blob blob--3"/></div>
  {(modoPrueba || pruebaCompleta()) && <div className="aviso-red" role="note">{escrowReal ? AVISO_RED : AVISO_RED_SIMULADO}</div>}
  {(modoPrueba || pruebaCompleta()) && escrowReal && comision && <><p className="aviso-red__extra" role="note">{TEXTO_COMISION_TW}</p><PlazoDevolucion /></>}{children}</>
// LEGAL: revisado (24/10, 11:25 p. m.) · con la prueba completa, todos los montos dicen «USDC de prueba» (también la cabecera del detalle)
// Legal 25/10 5:09 p. m. (punto 8): hora en 12 h («4:44 p. m.», espacios duros) y montos con 2 decimales («0,50»).
const dos = (n: number) => new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
export const usd = (n: number) => pruebaCompleta() ? dos(n) + ' USDC de prueba'
  : escrowReal ? dos(n) + ' USDC'
  : new Intl.NumberFormat('es-CR', { style:'currency', currency:'USD', currencyDisplay:'code' }).format(n)
/** Rótulo siempre visible para lo que sigue simulado en la fase 1 (reglas, reclamos y mediador). */
export const Simulado = ({ texto = 'Simulado' }: { texto?: string }) => <span className="demo demo--simulado">{texto}</span>
const d = (s: string | number) => typeof s === 'string' && s.length === 10 ? new Date(s + 'T12:00:00') : new Date(s)
export const fecha = (s: string | number) => d(s).toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })
/** «a. m.» / «p. m.» con espacios duros (U+00A0), como horaCR de api/_lib/plazos.ts. */
export const ampm = (s: string) => s.replace(/\s*([ap])\.\s*m\./g, '\u00a0$1.\u00a0m.')
export const fechaHora = (s: string | number) => ampm(d(s).toLocaleString('es-CR', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12: true }))

/** Campo de fecha en formato dd/mm/aa o dd/mm/aaaa (consistente en cualquier navegador). Valor: ISO aaaa-mm-dd (aunque sea un día
 *  imposible, para que la validación lo explique) o '' si está incompleta. */
export function CampoFecha({ etiqueta, valor, onCambio, onSalir, id, error, ayuda, min, max }: { min?: string; max?: string; etiqueta: string; valor: string; onCambio: (iso: string) => void; onSalir?: () => void; id: string; error?: string; ayuda?: string }) {
  const aTexto = (iso: string) => iso ? iso.split('-').reverse().join('/') : ''
  const [t, setT] = useState(aTexto(valor))
  useEffect(() => { if (!valor) return; setT(aTexto(valor)) }, [valor])
  const cambiar = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 8)
    const f = n.length > 4 ? `${n.slice(0,2)}/${n.slice(2,4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0,2)}/${n.slice(2)}` : n
    setT(f)
    // Año con 2 cifras (21/10/26 = 21/10/2026) o con 4 cifras.
    const m = f.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/)
    onCambio(m ? `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2]}-${m[1]}` : '')
  }
  const ok = !error && /^\d{4}-\d{2}-\d{2}$/.test(valor)
  return <div className={'campo' + (error ? ' campo--error' : '')}><label htmlFor={id} className="campo__et">{etiqueta}</label>
    <input id={id} inputMode="numeric" autoComplete="off" placeholder="dd/mm/aa" value={t} onChange={e => cambiar(e.target.value)} onBlur={onSalir} min={min} max={max} data-min={min}
      aria-invalid={!!error} aria-describedby={id + '-ayuda'} />
    <small id={id + '-ayuda'} className={error ? 'campo__error' : 'ayuda'} role={error ? 'alert' : undefined}>{error ?? (ok ? fecha(valor) + (ayuda ? ' · ' + ayuda : '') : ayuda ?? 'Formato dd/mm/aa')}</small>
  </div>
}

/** Línea de tiempo simple, igual para las dos personas. */
export function LineaTiempo({ a }: { a: Alquiler }) {
  const actual = etapaDe(a); const fin = a.estado === 'cerrado'
  return <ol className="tiempo" aria-label="Cómo va el alquiler">
    {ETAPAS.map((t, i) => {
      const estado = i < actual || (fin && i === actual) ? 'hecho' : i === actual ? 'actual' : 'futuro'
      return <li key={t} className={'tiempo__paso tiempo__paso--' + estado} aria-current={estado === 'actual' ? 'step' : undefined}>
        <span className="tiempo__punto">{estado === 'hecho' ? <Icono id="i-check" /> : <b>{i + 1}</b>}</span>
        <span>{t}{estado === 'actual' && <em className="nota"> · ahora</em>}</span>
        <span className="sr">{estado === 'hecho' ? ' (listo)' : estado === 'actual' ? ' (paso actual)' : ' (pendiente)'}</span>
      </li>
    })}
  </ol>
}
