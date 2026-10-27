import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { acciones, accionesServidor } from '../acciones'
import { cuentaPropia } from './Invitacion'
import { CasillaVersion } from '../prueba/CasillaVersion'
import { CasillaLegal } from '../legal/CasillaLegal'
import { versionActual } from '../prueba/version'
import { ir } from '../router'
import type { Usuario } from '../types'
import { LogoAnimado } from '../LogoAnimado'
import { modoSolo, modoPrueba, escrowReal as escrowRealApp, dosPersonas } from '../servidor/config'
import { DUENO_PRUEBA } from './Real'
import { pruebaCompleta } from '../prueba/interruptor'
import { declaracionInvitacion, enviarInvitacionUnaVez, nombreInvitacion, tokenDeLink } from '../prueba/invitacion'
import { SuscripcionB8, RendimientoB13 } from '../prueba/SuscripcionPC'
import { Anexo6A, registroAnexo, reparacionesDe, type ValorAnexo } from '../prueba/Anexo'
import { store, activarServidor } from '../store'
import { modoServidor } from '../servidor/config'
/** Primera letra en minúscula, sin tocar el resto («cuenta de Lockumi» conserva la L). */
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
import { TOPE_USDC, MONTO_MAX_USDC, montoValido, mensajeSaldoPropio } from '../services/solo'
import { conectar, saldoPropio, hayFreighter, hayCavos, NOMBRE_FIRMA, type Firma } from '../services/cuentaPropia'
import { abreviar } from '../services/billetera'
import { avisar, alertaCreado } from '../alertas'
// 26/10/2026: Apple con correo oculto → campo corto para el correo real de los avisos (src/reputacion/CorreoReal.tsx).
const CorreoReal = import.meta.env.VITE_REPUTACION === '1' ? lazy(() => import('../reputacion/CorreoReal').then(m => ({ default: m.CorreoReal }))) : null
import { validarAlquiler, hoyISO, montoNumero, fechaValida, ddmmaa, limitesEntrada, limitesSalida, salidaTrasCambiarEntrada, MONTO_MAX, type Campo, type Errores } from '../validacion'

// ---------- Íconos de línea (mismo trazo que .ico) ----------
const TRAZOS = {
  lugar: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  billetera: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>,
  moneda: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.4c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 2.8 5.6 1.4 5.6 4.1 0 1.2-1.2 1.9-2.8 1.9-1.3 0-2.4-.5-2.9-1.4M12 6.5V8M12 16v1.5" /></>,
  candado: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  escudo: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  reglas: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  pata: <><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></>,
  check: <path d="M20 6 9 17l-5-5" />, mas: <path d="M12 5v14M5 12h14" />, menos: <path d="M5 12h14" />, x: <path d="M18 6 6 18M6 6l12 12" />,
  der: <path d="m9 18 6-6-6-6" />, i: <path d="M12 11v6M12 7.5h.01" />,
  matraz: <><path d="M9 3h6M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9.5V3" /><path d="M7.2 15h9.6" /></>,
  llave: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  enviar: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
}
const Ico = ({ n, c = '' }: { n: keyof typeof TRAZOS; c?: string }) => <svg className={'ico ' + c} viewBox="0 0 24 24" aria-hidden="true">{TRAZOS[n]}</svg>

/** «Simular con dueño de prueba» / «Invitar a la otra persona». Mismo marcado y clases que producción (master): en C solo cambia
 *  cuál está elegida (is-sel y la marca) y desaparece «Pronto». Sin <button>: el estilo del navegador cambiaba el diseño. */
export function ModoOpciones({ dosPersonas, invitar, setInvitar }: { dosPersonas: boolean; invitar: boolean; setInvitar: (v: boolean) => void }) {
  if (!dosPersonas) return <div className="na-modo">
    <div className="na-modo__op is-sel"><span className="na-modo__ico na-modo__ico--salvia"><Ico n="llave" /></span><span className="na-modo__txt">Simular con dueño de prueba</span><span className="na-marca"><Ico n="check" /></span></div>
    <div className="na-modo__op is-off" aria-disabled="true"><span className="na-modo__ico"><Ico n="enviar" /></span><span className="na-modo__txt">Invitar a la otra persona</span><span className="na-pronto">Pronto</span></div>
  </div>
  const op = (v: boolean) => ({ role: 'radio', tabIndex: 0, 'aria-checked': invitar === v, className: 'na-modo__op' + (invitar === v ? ' is-sel' : ''),
    onClick: () => setInvitar(v), onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInvitar(v) } } })
  return <div className="na-modo" role="radiogroup" aria-label="Cómo quieres hacer la prueba">
    <div {...op(false)}><span className="na-modo__ico na-modo__ico--salvia"><Ico n="llave" /></span><span className="na-modo__txt">Simular con dueño de prueba</span>{!invitar && <span className="na-marca"><Ico n="check" /></span>}</div>
    <div {...op(true)}><span className="na-modo__ico"><Ico n="enviar" /></span><span className="na-modo__txt">Invitar a la otra persona</span>{invitar && <span className="na-marca"><Ico n="check" /></span>}</div>
  </div>
}
const Info = ({ et, onClick }: { et: string; onClick: () => void }) => <button type="button" className="na-info" aria-label={et} aria-haspopup="dialog" onClick={onClick}><Ico n="i" /></button>

// ---------- Fechas: "aaaa-mm-dd" ↔ Date local ----------
const aFecha = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d) }
const aISO = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
/** Texto escrito (dd/mm/aa, dd/mm/aaaa o solo cifras) → ISO válido o ''. Lo usan los campos ocultos #f-inicio/#f-fin. */
const deTexto = (t: string) => {
  const n = t.replace(/\D/g, ''); if (n.length !== 6 && n.length !== 8) return ''
  const iso = `${n.length === 6 ? '20' + n.slice(4) : n.slice(4)}-${n.slice(2, 4)}-${n.slice(0, 2)}`
  return fechaValida(iso) ? iso : ''
}
const INICIAL_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Hoja con <dialog> nativo: en celular entra desde abajo; en escritorio (ancla) se abre como ventanita junto al campo. */
export function Hoja({ id, titulo, abierta, onCerrar, ancla, alDerecha, children }: { id: string; titulo: string; abierta: boolean; onCerrar: () => void; ancla?: RefObject<HTMLElement | null>; alDerecha?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (abierta && !d.open) {
      d.style.maxHeight = ''; d.showModal(); document.documentElement.classList.add('sin-scroll')
      const a = ancla?.current
      if (a && matchMedia('(min-width: 720px)').matches) {
        let r = a.getBoundingClientRect(); const w = d.offsetWidth, h = d.offsetHeight
        // Si no cabe ni abajo ni arriba del campo, sube la página lo necesario para que quepa abajo (sin tapar el campo).
        if (r.bottom + 8 + h > innerHeight - 12 && r.top - h - 8 < 12) { scrollBy(0, r.bottom + 8 + h - (innerHeight - 12)); r = a.getBoundingClientRect() }
        // Abajo si cabe; si no, arriba; si no cabe en ninguno (fin de la página), en el lado con más espacio y con scroll interno: nunca tapa el campo.
        const abajo = innerHeight - 12 - (r.bottom + 8), arriba = r.top - 8 - 12
        let top: number
        if (h <= abajo) top = r.bottom + 8
        else if (h <= arriba) top = r.top - 8 - h
        else if (abajo >= arriba) { top = r.bottom + 8; d.style.maxHeight = abajo + 'px' }
        else { top = 12; d.style.maxHeight = arriba + 'px' }
        // Tarjeta de la izquierda: alinea por la izquierda. Tarjeta de la derecha (alDerecha) o si no cabe: alinea con su borde derecho.
        let left = alDerecha ? r.right - w : r.left; if (left + w > innerWidth - 12) left = r.right - w
        d.style.top = top + 'px'; d.style.left = Math.max(12, Math.min(left, innerWidth - w - 12)) + 'px'
      } else { d.style.top = ''; d.style.left = ''; d.style.maxHeight = '' }
    }
    if (!abierta && d.open) d.close()
    if (!abierta) document.documentElement.classList.remove('sin-scroll')
  }, [abierta, ancla, alDerecha])
  useEffect(() => () => document.documentElement.classList.remove('sin-scroll'), [])
  return <dialog ref={ref} className={'na-hoja' + (ancla ? ' na-hoja--pop' : '')} aria-labelledby={id + '-t'}
    onCancel={e => { e.preventDefault(); onCerrar() }} onClick={e => { if (e.target === ref.current) onCerrar() }}>
    <div className="na-hoja__in">
      <div className="na-hoja__asa" aria-hidden="true" />
      <div className="na-hoja__cab"><h2 id={id + '-t'}>{titulo}</h2><button type="button" className="boton-icono" aria-label="Cerrar" onClick={onCerrar}><Ico n="x" /></button></div>
      {abierta && children}
    </div>
  </dialog>
}

/** Campo de fecha: botón que muestra dd/mm/aa y abre un calendario de un solo día (react-day-picker). */
function CampoCalendario({ id, etiqueta, valor, min, max, error, contexto, alDerecha, onElegir, onAbrir, onCerrar }: {
  id: string; etiqueta: string; valor: string; min: string; max: string; error?: string; contexto?: ReactNode; alDerecha?: boolean
  onElegir: (iso: string) => void; onAbrir?: () => boolean; onCerrar: () => void }) {
  const [abierta, setAbierta] = useState(false); const boton = useRef<HTMLButtonElement>(null)
  const sel = valor ? aFecha(valor) : undefined
  const cerrar = () => { setAbierta(false); onCerrar() }
  return <div className="na-fecha">
    <button ref={boton} id={id + '-boton'} type="button" className={'na-entrada' + (abierta ? ' is-abierta' : '') + (error ? ' na-entrada--error' : '')}
      aria-haspopup="dialog" aria-expanded={abierta} aria-invalid={!!error} aria-describedby={error ? id + '-err' : undefined}
      onClick={() => { if (!onAbrir || onAbrir()) setAbierta(true) }}>
      <Ico n="cal" /><small>{etiqueta}</small><strong>{valor ? ddmmaa(valor) : 'Elegir'}</strong><Ico n="der" c="na-entrada__ir" />
    </button>
    {/* Compatibilidad: los recorridos automáticos escriben la fecha aquí (dd/mm/aa o ddmmaaaa). No recibe foco con Tab. */}
    <input id={id} className="sr" tabIndex={-1} aria-hidden="true" autoComplete="off" defaultValue="" onChange={e => { const iso = deTexto(e.target.value); if (iso) onElegir(iso) }} />
    {error && <small id={id + '-err'} className="campo__error" role="alert">{error}</small>}
    <Hoja id={id + '-hoja'} titulo={etiqueta} abierta={abierta} onCerrar={cerrar} ancla={boton} alDerecha={alDerecha}>
      {contexto}
      <DayPicker mode="single" locale={es} captionLayout="dropdown" startMonth={aFecha(min)} endMonth={aFecha(max)} defaultMonth={sel ?? aFecha(min)}
        selected={sel} onSelect={d => { if (d) onElegir(aISO(d)) }} disabled={[{ before: aFecha(min) }, { after: aFecha(max) }]}
        showOutsideDays={false} formatters={{ formatWeekdayName: d => INICIAL_SEMANA[d.getDay()] }} />
      <p className="na-hoja__pie">De {ddmmaa(min)} a {ddmmaa(max)}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande na-hoja__listo" onClick={cerrar}>Listo</button>
    </Hoja>
  </div>
}

type InfoClave = 'red' | 'usdc' | 'fechas'

export function Crear({ u }: { u: Usuario }) {
  const [f, setF] = useState({ direccion: '', monto: '', email: '', inicio: '', fin: '' })
  const [tocado, setTocado] = useState<Partial<Record<Campo, boolean>>>({}); const [enviado, setEnviado] = useState(false)
  const [reglas, setReglas] = useState<string[]>(['No se permiten mascotas']); const [regla, setRegla] = useState(''); const [ocupado, setOcupado] = useState(false); const [errSrv, setErrSrv] = useState('')
  // Red de prueba: tú eres el inquilino y el dueño es una cuenta de prueba de Lockumi.
  // Origen de los USDC de prueba: «USDC de prueba de Lockumi» (sin valor, tope de 20) o tu propia cuenta (el límite es tu saldo real, máximo 50 000).
  const [origen, setOrigen] = useState<'lockumi' | 'propia'>('lockumi')
  const [propia, setPropia] = useState<{ g: string; firma: Firma; saldo: number | null } | null>(null)
  const [conectando, setConectando] = useState<Firma | null>(null); const [errCuenta, setErrCuenta] = useState('')
  const [freighter, setFreighter] = useState(false)
  const [info, setInfo] = useState<InfoClave | null>(null)
  const [anexo, setAnexo] = useState<ValorAnexo>({ acepta: false, reparaciones: [] })
  const [avisoFin, setAvisoFin] = useState('')
  // Modo de dos personas (VITE_DOS_PERSONAS=1): «Invitar a la otra persona» crea el alquiler en el servidor; tú quedas como dueño.
  const [invitar, setInvitar] = useState(false)
  const [declara, setDeclara] = useState(false)   // paso16-unido: declaración de quien invita (se guarda en el servidor)
  const [aceptaVersion, setAceptaVersion] = useState(false)   // escenario C: Términos vigentes y Aviso de privacidad (se guarda en el servidor)
  const escrowReal = escrowRealApp && !invitar, prueba1 = modoPrueba && !invitar
  useEffect(() => { if (escrowRealApp) void hayFreighter().then(setFreighter) }, [])
  const usar = async (firma: Firma) => {
    setConectando(firma); setErrCuenta('')
    try { const g = await conectar(firma); setPropia({ g, firma, saldo: await saldoPropio(g) }) }
    catch (e) { setErrCuenta(e instanceof Error ? e.message : 'No pudimos conectar tu cuenta. Vuelve a intentarlo.') }
    finally { setConectando(null) }
  }
  const errores: Errores = prueba1 ? (() => {
    const e = validarAlquiler({ ...f, email: 'inquilino@ejemplo.com' }, hoyISO()); delete e.email
    const m = montoNumero(f.monto)
    if (escrowReal && !e.monto && origen === 'lockumi' && !montoValido(m, TOPE_USDC)) e.monto = `Con «USDC de prueba de Lockumi» el depósito es de máximo ${TOPE_USDC} USDC de prueba (no es dinero real). Baja el monto a ${TOPE_USDC} o menos, o elige «Usar mi propio USDC de prueba».`
    if (escrowReal && !e.monto && origen === 'propia') {
      if (!propia) e.monto = 'Primero conecta tu cuenta para ver cuántos USDC de prueba tienes.'
      else if ((propia.saldo ?? 0) < m) e.monto = mensajeSaldoPropio(propia.saldo ?? 0)
    }
    return e })() : validarAlquiler(f, hoyISO(), u.email, invitar)
  const ver = (k: Campo) => (enviado || tocado[k]) ? errores[k] : undefined
  const poner = (k: Campo, v: string) => setF(x => ({ ...x, [k]: v }))
  const tocar = (k: Campo) => () => setTocado(t => ({ ...t, [k]: true }))
  const agregar = () => { if (regla.trim()) { setReglas([...reglas, regla.trim()]); setRegla('') } }
  // Entrada nueva: si la salida ya no queda entre 1 mes y 5 años después, se borra y se avisa.
  const elegirInicio = (iso: string) => setF(x => {
    const fin = salidaTrasCambiarEntrada(iso, x.fin)
    setAvisoFin(x.fin && !fin ? 'Con la nueva entrada, esa salida ya no sirve. Elige la salida otra vez.' : '')
    return { ...x, inicio: iso, fin }
  })
  const elegirFin = (iso: string) => { setAvisoFin(''); poner('fin', iso) }
  const crear = async () => {
    setEnviado(true)
    const primero = (['direccion', 'monto', 'inicio', 'fin', 'email'] as Campo[]).find(k => errores[k])
    if (primero) { document.getElementById('f-' + primero + (primero === 'inicio' || primero === 'fin' ? '-boton' : ''))?.focus(); return }
    setOcupado(true)
    const m = montoNumero(f.monto)
    try {
      const r = invitar
        ? await accionesServidor.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: f.email.trim(), declaracion: declaracionInvitacion(), terminosVersion: versionActual() }, u.email, await cuentaPropia())
        : modoPrueba
        ? await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: u.email, ...(escrowReal && origen === 'propia' && propia && { propia: { g: propia.g, firma: propia.firma } }) }, DUENO_PRUEBA)
        : await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: f.email.trim() }, u.email, await cuentaPropia())
      // Prueba completa: registro del Anexo 6-A aceptado al crear (fecha y reparaciones de uso marcadas).
      if (invitar) { activarServidor(); void enviarInvitacionUnaVez(r.id, f.email.trim(), nombreInvitacion(u.nombre), tokenDeLink(r.link)) }
      if (pruebaCompleta() && !modoServidor && !invitar) store.cambiar(r.id, x => { x.anexo = registroAnexo(reparacionesDe(anexo)) }, 'Anexo 6-A aceptado')
      avisar(alertaCreado({ direccion: f.direccion.trim(), monto: m }))
      ir('/alquiler/' + r.id)
    } catch (e) { setOcupado(false); setErrSrv(e instanceof Error ? e.message : 'No pudimos crear el alquiler. Intenta de nuevo.') }
  }
  // Monto: botones − y + de 1 en 1 (sin pasar el tope de cada origen); también se puede escribir.
  const tope = !escrowReal ? MONTO_MAX : origen === 'lockumi' ? TOPE_USDC : Math.min(propia?.saldo ?? MONTO_MAX_USDC, MONTO_MAX_USDC)
  const mActual = montoNumero(f.monto) || 0
  const paso = (d: number) => { const n = Math.round((mActual + d) * 100) / 100; poner('monto', String(Math.max(1, Math.min(tope, n)))); tocar('monto')() }
  const etMonto = !escrowReal ? (invitar ? 'USDC de prueba' : 'USD') : origen === 'lockumi' ? `Máximo ${TOPE_USDC}` : propia?.saldo != null ? `Saldo ${(Math.floor(propia.saldo * 100) / 100).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Hasta tu saldo'
  const errMonto = ver('monto')
  const cuantos = Object.keys(errores).length
  const hoy = hoyISO(), le = limitesEntrada(hoy), ls = f.inicio ? limitesSalida(f.inicio) : null
  const errFin = avisoFin || ver('fin')

  return <main id="contenido" tabIndex={-1} className="cont cont--form na" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <div className="cab titulo"><h1>Nuevo alquiler</h1><LogoAnimado className="logo-pieza logo-pieza--titulo" /></div>
    {/* LEGAL: revisado (25/10, lista de Legal). Resumen corto de «Prueba en la red de prueba de Stellar, sin dinero real»; el texto completo está en la hoja ⓘ. */}
    {modoPrueba && <div className="na-meta"><button type="button" className="na-red" aria-haspopup="dialog" onClick={() => setInfo('red')}><Ico n="matraz" />Red de prueba · sin dinero real<span className="na-red__i" aria-hidden="true"><Ico n="i" /></span><span className="sr">. Ver detalles</span></button></div>}

    {/* Parte 4 (todavía no activa): tú eres el inquilino y el dueño es de prueba. «Soy dueño» e «Invitar» llegan después. */}
    {modoPrueba && <section className="glass na-p4" aria-label="Tu papel en esta prueba">
      <div className="roles roles--ancho" role="group" aria-label="Tu papel"><button type="button" aria-pressed={!invitar} onClick={dosPersonas ? () => setInvitar(false) : undefined}>Soy inquilino</button><button type="button" aria-pressed={invitar} disabled={!dosPersonas} title={dosPersonas ? undefined : 'Pronto'} onClick={() => setInvitar(true)}>Soy dueño</button></div>
      <ModoOpciones dosPersonas={dosPersonas} invitar={invitar} setInvitar={setInvitar} />
    </section>}

    <form className="glass glass--fuerte na-form" noValidate onSubmit={e => { e.preventDefault(); crear() }}>
      <section className="na-sec" data-recorrido="datos">
        <label htmlFor="f-direccion" className="na-et"><Ico n="lugar" />Lugar</label>
        <div className={'na-input' + (ver('direccion') ? ' na-input--error' : '')}><input id="f-direccion" value={f.direccion} onChange={e => poner('direccion', e.target.value)} onBlur={tocar('direccion')} placeholder="Ej.: Apartamento 3B, Escazú" autoComplete="off" maxLength={140}
          aria-invalid={!!ver('direccion')} aria-describedby={ver('direccion') ? 'f-direccion-err' : undefined} /></div>
        {ver('direccion') && <small id="f-direccion-err" className="campo__error" role="alert">{ver('direccion')}</small>}
      </section>

      {escrowReal && <section className="na-sec">
        <div className="na-et" id="et-origen"><Ico n="moneda" />USDC de prueba<span className="na-et__der"><Info et="De dónde salen los USDC de prueba" onClick={() => setInfo('usdc')} /></span></div>
        <div role="radiogroup" aria-labelledby="et-origen">
          <button type="button" role="radio" aria-checked={origen === 'lockumi'} className={'na-lockumi' + (origen === 'lockumi' ? ' is-sel' : '')} onClick={() => setOrigen('lockumi')}>
            <span className="na-lockumi__ico"><Ico n="moneda" /></span>
            <span className="na-lockumi__txt">USDC de prueba de Lockumi<small>Sin valor · hasta {TOPE_USDC}</small></span>
            <span className="na-marca"><Ico n="check" /></span>
          </button>
          <button type="button" role="radio" aria-checked={origen === 'propia'} className={'na-propio' + (origen === 'propia' ? ' is-sel' : '')} onClick={() => setOrigen('propia')}>
            <Ico n="billetera" c="na-propio__ico" /><span>Usar mi propio USDC de prueba</span>{origen === 'propia' ? <span className="na-marca"><Ico n="check" /></span> : <Ico n="der" c="na-propio__ir" />}
          </button>
        </div>
        {origen === 'propia' && (propia
          ? <p className="na-saldo" id="saldo-propio" role="status"><Ico n="check" />{propia.saldo === null
              ? <span>Tu cuenta ({abreviar(propia.g)}) todavía no tiene USDC de prueba. Carga USDC de prueba o elige «USDC de prueba de Lockumi».</span>
              : <span>Cuenta {abreviar(propia.g)} · {NOMBRE_FIRMA[propia.firma]}: <strong>{(Math.floor(propia.saldo * 100) / 100).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC de prueba</strong></span>}</p>
          : <div className="na-conectar">
              {hayCavos() && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('cavos')}>{conectando === 'cavos' ? 'Conectando…' : 'Usar mi cuenta Lockumi'}</button>}
              {freighter && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('freighter')}>{conectando === 'freighter' ? 'Conectando…' : 'Usar Freighter'}</button>}
              {!hayCavos() && !freighter && <p>Para usar tu cuenta, instala Freighter (freighter.app) en este navegador y recarga la página.</p>}
            </div>)}
        {errCuenta && <p className="error" role="alert">{errCuenta}</p>}
      </section>}

      <section className="na-sec">
        <label htmlFor="f-monto" className="na-et"><Ico n="candado" />Depósito<span className="na-et__der">{etMonto}</span></label>
        <div className={'na-paso' + (errMonto ? ' na-paso--error' : '')}>
          <button type="button" aria-label="Restar 1" disabled={mActual <= 1} onClick={() => paso(-1)}><Ico n="menos" /></button>
          <div className="na-paso__valor"><input id="f-monto" value={f.monto} onChange={e => poner('monto', e.target.value)} onBlur={tocar('monto')} inputMode="decimal" placeholder="0" autoComplete="off"
            aria-invalid={!!errMonto} aria-describedby={'f-monto-u' + (errMonto ? ' f-monto-err' : '')} /><small id="f-monto-u">{escrowReal || invitar ? 'USDC de prueba' : 'USD'}</small></div>
          <button type="button" aria-label="Sumar 1" disabled={mActual >= tope} onClick={() => paso(1)}><Ico n="mas" /></button>
        </div>
        {errMonto && <small id="f-monto-err" className="campo__error" role="alert">{errMonto}</small>}
      </section>

      <section className="na-sec">
        <div className="na-et"><Ico n="cal" />Fechas<span className="na-et__der"><Info et="Reglas de las fechas" onClick={() => setInfo('fechas')} /></span></div>
        <div className="na-fechas2">
          <CampoCalendario id="f-inicio" etiqueta="Entrada" valor={f.inicio} min={le.min} max={le.max} error={ver('inicio')} onElegir={elegirInicio} onCerrar={tocar('inicio')} />
          <CampoCalendario id="f-fin" etiqueta="Salida" valor={f.fin} min={ls?.min ?? le.min} max={ls?.max ?? le.max} error={errFin} alDerecha onElegir={elegirFin} onCerrar={tocar('fin')}
            onAbrir={() => { if (f.inicio) return true; setAvisoFin('Primero elige la fecha de entrada.'); return false }}
            contexto={f.inicio && <div className="na-hoja__ctx"><span className="na-ctx"><Ico n="cal" />Entrada <strong>{ddmmaa(f.inicio)}</strong></span>{f.fin && <span className="na-ctx na-ctx--sel">Salida <strong>{ddmmaa(f.fin)}</strong></span>}</div>} />
        </div>
      </section>

      <section className="na-sec" data-recorrido="reglas">
        <div className="na-et" id="et-reglas"><Ico n="reglas" />Reglas</div>
        <ul className="na-reglas" aria-labelledby="et-reglas">{reglas.map((r, i) => <li key={i}><span className="na-reglas__ico"><Ico n={/mascota/i.test(r) ? 'pata' : 'check'} /></span><span className="na-reglas__txt">{r}</span>
          <button type="button" className="na-quitar" aria-label={'Quitar regla: ' + r} onClick={() => setReglas(reglas.filter((_, j) => j !== i))}><Ico n="x" /></button></li>)}</ul>
        <div className="na-agregar"><div className="na-input"><input aria-label="Nueva regla" value={regla} onChange={e => setRegla(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} placeholder="Agregar una regla" /></div>
          <button type="button" className="na-mas" aria-label="Agregar regla" onClick={agregar}><Ico n="mas" /></button></div>
      </section>

      {!prueba1 && <section className={'na-sec' + (invitar ? ' pila' : '')}><label className={'campo' + (ver('email') ? ' campo--error' : '')}><span>Correo del inquilino</span>
        <input id="f-email" type="email" value={f.email} onChange={e => poner('email', e.target.value)} onBlur={tocar('email')} placeholder="inquilino@correo.com" autoComplete="off" aria-invalid={!!ver('email')} aria-describedby={ver('email') ? 'f-email-err' : undefined} />
        {ver('email') && <small id="f-email-err" className="campo__error" role="alert">{ver('email')}</small>}</label>
        {invitar && <CasillaLegal id="f-declara" marcada={declara} onCambio={setDeclara}>{declaracionInvitacion()}</CasillaLegal>}
        {invitar && <CasillaVersion id="f-terminos-version" marcada={aceptaVersion} onCambio={setAceptaVersion} />}</section>}

      {modoServidor && CorreoReal && /@privaterelay\.appleid\.com$/i.test(u.email.trim()) && <Suspense fallback={null}><CorreoReal email={u.email} className="na-sec pila" /></Suspense>}
      {enviado && cuantos > 0 && <p className="error na-error" role="alert">Revisa {cuantos === 1 ? 'el campo marcado' : `los ${cuantos} campos marcados`} y vuelve a intentarlo.</p>}
      {errSrv && <p className="error na-error" role="alert">{errSrv}</p>}
      {pruebaCompleta() && <><SuscripcionB8 /><RendimientoB13 /></>}
      {pruebaCompleta() && <Anexo6A valor={anexo} onCambio={setAnexo} />}
      <button type="submit" className="boton boton--primario boton--ancho boton--grande na-crear" disabled={ocupado || (pruebaCompleta() && !anexo.acepta) || (invitar && (!declara || !aceptaVersion))}>{ocupado ? 'Creando…' : prueba1 ? 'Crear alquiler de prueba' : 'Crear alquiler e invitar'}</button>
      {/* LEGAL: revisado (25/10, lista de Legal). Texto propuesto por Legal (cambios-1.5-vs-1.4.md, «Línea de la fase 1»), palabra por palabra. */}
      {prueba1 ? <p className="na-priv"><Ico n="escudo" /><span>Lugar y fotos: se quedan en tu navegador; a la red solo va una huella de las fotos.</span></p>
        : <p className="nota">Tú quedas como dueño. La persona invitada entra como inquilino. Lo siguiente es firmar el contrato los dos.</p>}
    </form>

    <Hoja id="info" titulo={info === 'red' ? 'Red de prueba' : info === 'usdc' ? 'USDC de prueba' : 'Fechas'} abierta={!!info} onCerrar={() => setInfo(null)}>
      <div className="na-hoja__texto">
        {/* LEGAL: revisado (25/10, lista de Legal). Hoja «Red de prueba» 1.5 (borrador): 1.er párrafo = ⓘ de la píldora propuesto por Legal; el resto, versión corta del texto 1.4 con los cambios pedidos. */}
        {info === 'red' && <>
          <p>Esta demo funciona en la red de prueba (testnet) de Stellar. Los tokens no tienen valor y la red se reinicia de vez en cuando. No uses la red principal ni envíes dinero real.</p>
          {/* LEGAL: revisado (25/10, lista de Legal) · hoja de «Invitar a la otra persona» (C), texto exacto de Legal */}
          {invitar ? <>
            <p>Tú eres el dueño y la persona que invitas es el inquilino. Cada uno entra con su propia cuenta y firma por sí mismo.</p>
            <p>Si hay un reclamo y no se ponen de acuerdo, el caso pasa a la Mediación Lockumi (demo), sin costo. La mediación no decide por ustedes: el reparto solo se aplica si los dos lo aceptan. Si no hay acuerdo, el depósito de prueba sigue retenido. Si el dueño no reclama a tiempo, se devuelve automáticamente el 100 % al inquilino, menos el 0,3 % de comisión de Trustless Work.</p>
            <p>El alquiler simulado y las fotos reducidas se guardan en Supabase, en un almacenamiento privado en Estados Unidos. A la red solo va una huella de las fotos.</p>
          </> : modoSolo ? <>
            {/* LEGAL: revisado (24/10) · 5.3 ronda 9 (texto del depósito); ronda 8: modoSolo (con o sin billetera propia); el reclamo y la mediación no van a la red (DetalleSolo no tiene reclamo) */}
            <p>Tú eres el <strong>inquilino</strong>. Si usas tu propia billetera, depositas con ella; si no, Lockumi firma el depósito por ti con una cuenta de prueba, en la red de prueba. El dueño es el <strong>{minuscula(DUENO_PRUEBA)}</strong>: por eso no te pedimos su correo.</p>
            <p>Lockumi firma y confirma por el dueño de prueba: tú tocas el botón en su nombre. El reclamo y la persona mediadora son simulados y no se registran en la red de prueba.</p>
          </> : <>
            <p>Tú eres el <strong>inquilino</strong>. El dueño es el <strong>{minuscula(DUENO_PRUEBA)}</strong>: por eso no te pedimos su correo.</p>
            {/* LEGAL: revisado (24/10) · ronda 8: modoVideo (producción): el reclamo abre una disputa real en la red de prueba (acciones.reclamar → escrow.disputar); la mediación es simulada */}
            <p>Lockumi firma y confirma por el dueño de prueba. La mediación es simulada. El reclamo lo haces tú con un botón, en nombre del dueño de prueba, y queda registrado en la red de prueba.</p>
          </>}
          {!invitar && <p>El nombre del lugar y las fotos se quedan en tu navegador; a la red solo va una huella de las fotos.</p>}</>}
        {/* LEGAL: revisado (25/10, lista de Legal). Hoja «USDC de prueba» 1.5 (borrador): base = ⓘ propuesto por Legal, más billeteras (Cavos o Freighter) y «hasta tu saldo». */}
        {info === 'usdc' && <>
          <p>El USDC de prueba no es dinero real y no tiene valor. Tienes dos opciones:</p>
          <ul>
            <li><strong>USDC de prueba de Lockumi:</strong> USDC de prueba que te da Lockumi, sin valor, hasta {TOPE_USDC}{dosPersonas && ' USDC de prueba'}.</li>
            <li><strong>Usar mi propio USDC de prueba:</strong> con tu billetera de Lockumi (Cavos), Lockumi te envía hasta {TOPE_USDC} USDC de prueba de su propia cuenta, sin valor. Con Freighter, usas el que ya tengas, hasta {MONTO_MAX_USDC.toLocaleString('es-CR')} USDC de prueba. Si tu cuenta de Cavos no está activa en la red de prueba, Lockumi paga su reserva y tú firmas la habilitación del USDC de prueba (trustline). Firmas tú el depósito.</li>
          </ul></>}
        {/* LEGAL: revisado (25/10, lista de Legal). Texto propuesto por Legal para la ⓘ de «Fechas», palabra por palabra. */}
        {info === 'fechas' && <p>En esta demo, la fecha de entrada es de hoy en adelante (hasta 1 año) y la duración va de 1 mes a 5 años. Son valores de prueba, no plazos legales.</p>}
      </div>
      <button type="button" className="boton boton--primario boton--ancho na-hoja__listo" onClick={() => setInfo(null)}>Entendido</button>
    </Hoja>
  </main>
}
