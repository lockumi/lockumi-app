// Fase 1 · pantallas del flujo REAL en la red de prueba de Stellar (una sola persona, sin base de datos).
// Botones sin palabras técnicas; los enlaces a stellar.expert dicen "Ver comprobante en la red de prueba".
import { useCallback, useEffect, useState } from 'react'
import { store } from '../store'
import { NOMBRE_PASO, ORDEN, esHash } from '../services/comprobantes'
import type { Alquiler, PasoRed, Rol } from '../types'
import { usd, fechaHora, Simulado } from '../ui'
import { enlaceTx, enlaceCuenta, enlaceContrato, TOPE_USDC, MAX_XLM_COMPRA } from '../../api/_lib/red'
import { consultarUsdc, conectarBilletera, abreviar } from '../services/billetera'
import { obtenerUsdc, depositar, reintentarDeposito, aprobar, liberar, huellaActa, usarPrueba, fijarUsarPrueba, cuentaInquilino, cotizar, maximoAGastar, type Txs } from '../services/solo'

export const DUENO_PRUEBA = 'Dueño de prueba (cuenta de Lockumi para la demo)'
export const INQUILINO_PRUEBA = 'Inquilino de prueba (cuenta de Lockumi para la demo)'
export { NOMBRE_PASO }
/** Solo la primera letra en minúscula (para usar el rótulo dentro de una frase sin tocar «Lockumi»). */
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
export const VerTx = ({ h }: { h: string }) => <a className="enlace" href={enlaceTx(h)} target="_blank" rel="noopener noreferrer">Ver comprobante en la red de prueba</a>
const Error = ({ m }: { m: string }) => m ? <p className="error" role="alert">{m}</p> : null
const textoError = (e: unknown) => e instanceof globalThis.Error ? e.message : 'Algo salió mal. Vuelve a intentarlo en un minuto.'
const anotar = (id: string, txs: Partial<Record<PasoRed, string>>, extra: (a: Alquiler) => void = () => {}) => store.cambiar(id, x => {
  x.red ??= { txs: {} }
  for (const k of ORDEN) { const h = txs[k]; if (h && !x.red.txs[k]) { x.red.txs[k] = h; x.historial.push({ fecha: new Date().toISOString(), texto: NOMBRE_PASO[k], tx: h }) } }
  extra(x)
})

/** Quién es quién en esta prueba (rótulos de las cuentas de prueba). */
export function Cuentas({ a }: { a: Alquiler }) {
  const prueba = a.red?.inquilinoPrueba ?? usarPrueba()
  return <div className="cuentas-prueba" role="note" aria-label="Cuentas de esta prueba">
    <p><span className="chip chip--neutro chip--mini">Dueño</span> <strong>{DUENO_PRUEBA}</strong>
      {a.red?.dueno && <> · <a className="enlace" href={enlaceCuenta(a.red.dueno)} target="_blank" rel="noopener noreferrer">Ver cuenta en la red de prueba</a></>}</p>
    <p><span className="chip chip--neutro chip--mini">Inquilino</span> <strong>{prueba ? INQUILINO_PRUEBA : 'Tu billetera'}</strong>
      {a.red?.inquilino && <> · <a className="enlace" href={enlaceCuenta(a.red.inquilino)} target="_blank" rel="noopener noreferrer">Ver cuenta en la red de prueba</a></>}</p>
  </div>
}

/** Interruptor visible del respaldo: inquilino en una cuenta de prueba custodiada por Lockumi. */
export function InterruptorPrueba({ bloqueado = false }: { bloqueado?: boolean }) {
  const [v, setV] = useState(usarPrueba())
  useEffect(() => { const f = () => setV(usarPrueba()); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  return <label className="casilla interruptor-prueba">
    <input type="checkbox" checked={v} disabled={bloqueado} onChange={e => fijarUsarPrueba(e.target.checked)} />
    <span><strong>Usar cuenta de prueba</strong>: si tu billetera no puede firmar, Lockumi crea un {minuscula(INQUILINO_PRUEBA)} y firma por ella. Solo usa tokens de prueba sin valor.</span>
  </label>
}

/** Botón "Obtener USDC de prueba": XLM de prueba gratis si hace falta, habilitar USDC y comprar con un máximo a gastar. */
export function ObtenerUsdc({ objetivo, onListo }: { objetivo: number; onListo?: (r: { g: string; txs: Txs; saldo: string }) => void }) {
  const [saldo, setSaldo] = useState<string | null | undefined>(undefined); const [g, setG] = useState('')
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState(''); const [txs, setTxs] = useState<Txs>({})
  const [max, setMax] = useState<number | null>(null); const [prueba, setPrueba] = useState(usarPrueba())
  useEffect(() => { const f = () => setPrueba(usarPrueba()); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  const leer = useCallback(async () => {
    try { const c = await cuentaInquilino(); setG(c.g); setSaldo(c.g ? await consultarUsdc(c.g) : null); setErr('') }
    catch { setErr(prueba ? 'No pudimos preparar la cuenta de prueba. Vuelve a intentarlo en un minuto.' : 'No pudimos abrir tu billetera. Cierra sesión y vuelve a entrar en esta pestaña, o activa «Usar cuenta de prueba».') }
  }, [prueba])
  useEffect(() => { void leer() }, [leer])
  useEffect(() => { cotizar(objetivo).then(p => setMax(maximoAGastar(p))).catch(() => setMax(null)) }, [objetivo])
  const tiene = Number(saldo ?? 0)
  const pedir = async () => {
    setOcupado(true); setErr('')
    try { const r = await obtenerUsdc(objetivo, setAvance); setTxs(r.txs); setG(r.g); setSaldo(r.saldo); onListo?.(r) }
    catch (e) { setErr(textoError(e)) } finally { setOcupado(false); setAvance('') }
  }
  return <div className="pila obtener-usdc">
    <p className="saldo-usdc" role="status">{saldo === undefined && !g ? 'Consultando tu saldo…' : <>Tienes <strong>{usd(tiene)}</strong> de prueba{g && <> en {prueba ? 'la cuenta de prueba' : 'tu billetera'} ({abreviar(g)})</>}.</>}</p>
    {tiene < objetivo ? <>
      <p className="nota">Necesitas {usd(objetivo)} de prueba. Al tocar el botón: {prueba ? <>Lockumi crea el <strong>{minuscula(INQUILINO_PRUEBA)}</strong>, le da XLM de prueba gratis, habilita USDC y le envía {usd(Math.round((objetivo - tiene) * 1e7) / 1e7)} de prueba desde su tesorería de prueba. Tarda unos 15 segundos.</> : <>
        1) activamos tu cuenta con XLM de prueba gratis si hace falta, 2) habilitamos USDC en tu cuenta y 3) compramos {usd(Math.round((objetivo - tiene) * 1e7) / 1e7)} de prueba
        con <strong>como máximo {max ?? MAX_XLM_COMPRA} XLM de prueba</strong>. Tu billetera te mostrará una ventana para confirmar: revisa y acepta. Nada de esto es dinero real.</>}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void pedir()}>{ocupado ? (avance || 'Un momento…') : 'Obtener USDC de prueba'}</button>
      {!prueba && <p className="nota">¿Prefieres otra vía? En <a className="enlace" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">faucet.circle.com</a> eliges Stellar Testnet y pegas tu dirección (20 USDC cada 2 horas). Después vuelve aquí.</p>}
    </> : <p className="nota">Ya están los USDC de prueba que hacen falta.</p>}
    {(txs.trustline || txs.compra) && <ul className="lista comprobantes">
      {txs.trustline && <li><span>{NOMBRE_PASO.trustline}</span><VerTx h={txs.trustline} /></li>}
      {txs.compra && <li><span>{NOMBRE_PASO.compra}</span><VerTx h={txs.compra} /></li>}</ul>}
    <Error m={err} />
  </div>
}

/** Paso "Depósito" real: un paso por pantalla (1. USDC de prueba → 2. depositar). */
export function PagoReal({ a, rol }: { a: Alquiler; rol: Rol }) {
  const [listo, setListo] = useState(false); const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  const [, refrescar] = useState(0)
  useEffect(() => { const f = () => refrescar(n => n + 1); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  const prueba = usarPrueba()
  useEffect(() => { let vivo = true; setListo(false)
    cuentaInquilino().then(c => consultarUsdc(c.g)).then(s => { if (vivo) setListo(Number(s ?? 0) >= a.monto) }).catch(() => {}); return () => { vivo = false } }, [a.monto, prueba])
  if (rol === 'dueno') return <section className="pila"><div className="cab"><h2>Depósito</h2><span className="chip chip--neutro">Red de prueba</span></div>
    <div className="monto">{usd(a.monto)}</div><Cuentas a={a} />
    <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>Esperando que el inquilino deposite. Toca «Ver como inquilino» para hacerlo tú.</p></div></section>
  const pagar = async () => {
    setOcupado(true); setErr('')
    try {
      if (a.red?.escrow && !a.red.txs.deposito) {   // la cuenta segura ya existe: solo falta el depósito
        setAvance('Confirma el depósito en tu billetera…'); const h = await reintentarDeposito(a.red.escrow)
        anotar(a.id, { deposito: h }, x => { x.estado = 'fotos_entrada'; x.pago = new Date().toISOString(); x.escrowId = a.red!.escrow })
      } else {
        const r = await depositar(a.id, a.monto, setAvance)
        anotar(a.id, r.pasos, x => { x.red!.escrow = r.escrow; x.red!.dueno = r.dueno; x.red!.inquilino = r.inquilino; x.red!.inquilinoPrueba = r.prueba; x.escrowId = r.escrow; x.estado = 'fotos_entrada'; x.pago = new Date().toISOString() })
      }
    } catch (e) {
      const x = e as { escrow?: string; pasos?: Partial<Record<PasoRed, string>> }
      if (x.escrow) anotar(a.id, x.pasos ?? {}, y => { y.red!.escrow = x.escrow })
      setErr(textoError(e) + (usarPrueba() ? '' : ' Si tu billetera no puede firmar, activa «Usar cuenta de prueba» y vuelve a tocar el botón.'))
    } finally { setOcupado(false); setAvance('') }
  }
  return <section className="pila"><div className="cab"><h2>Depósito</h2><span className="chip chip--neutro">Red de prueba</span></div>
    <div className="subpasos" aria-label={`Depósito: parte ${listo ? 2 : 1} de 2`}><span className={listo ? 'hecho' : 'actual'} /><span className={listo ? 'actual' : ''} /></div>
    <div className="monto">{usd(a.monto)}</div>
    <Cuentas a={a} />
    {!listo ? <><p className="mini">Parte 1 de 2 · Consigue USDC de prueba</p><ObtenerUsdc objetivo={a.monto} onListo={r => setListo(Number(r.saldo) >= a.monto)} /></> : <>
      <p className="mini">Parte 2 de 2 · Deposita</p>
      {/* LEGAL: revisado (24/10) */}
      <p>Tus {usd(a.monto)} de prueba quedan bloqueados en una cuenta segura de Trustless Work en la red de prueba de Stellar. Ni el dueño ni el inquilino pueden tomarlos solos.
        {!prueba && ' Tu billetera te mostrará una ventana para confirmar el depósito.'}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void pagar()}>{ocupado ? (avance || 'Un momento…') : `Depositar ${usd(a.monto)}`}</button>
      <p className="nota">Esto toma entre 20 y 60 segundos.</p></>}
    <Error m={err} />
    <InterruptorPrueba bloqueado={!!a.red?.escrow} />
  </section>
}

/** Plazo de reclamos (fase 1): el dueño de prueba aprueba y Lockumi devuelve el depósito en la red de prueba. */
export function CierreReal({ a, rol }: { a: Alquiler; rol: Rol }) {
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  const escrow = a.red?.escrow; if (!escrow) return null
  const aprobado = !!a.red?.txs.aprobacion
  const correr = async (f: () => Promise<void>) => { setOcupado(true); setErr(''); try { await f() } catch (e) { setErr(textoError(e)) } finally { setOcupado(false); setAvance('') } }
  const aprobarYa = () => correr(async () => {
    setAvance('El dueño de prueba está aprobando…')
    const huella = await huellaActa((a.salida?.cuartos ?? []).flatMap(c => c.fotos.map(f => f.huella ?? '')))
    const r = await aprobar(escrow, huella)
    anotar(a.id, { ...(r.evidenciaTx && { evidencia: r.evidenciaTx }), ...(r.aprobacionTx && { aprobacion: r.aprobacionTx }) }, x => { if (r.yaAprobado) x.red!.txs.aprobacion ??= 'ya-aprobado' })
  })
  const liberarYa = () => correr(async () => {
    setAvance('Devolviendo el depósito…'); const r = await liberar(escrow)
    anotar(a.id, { liberacion: r.tx }, x => { x.estado = 'cerrado'; x.resultado = { inquilino: Math.round(x.monto * 0.997 * 1e7) / 1e7, dueno: 0, via: 'automatico', fecha: new Date().toISOString() } })
  })
  return <div className="pila cierre-real">
    {!aprobado ? (rol === 'dueno' ? <>
      <p>Si todo está bien, aprueba la devolución. Como dueño de prueba, Lockumi firma esta aprobación por ti en la red de prueba.</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void aprobarYa()}>{ocupado ? (avance || 'Un momento…') : 'Todo está bien: aprobar la devolución'}</button>
    </> : <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>Esperando que el dueño de prueba apruebe. Toca «Ver como dueño» para hacerlo.</p></div>) : <>
      <p>El dueño de prueba aprobó. Ya se puede devolver el depósito al inquilino.</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void liberarYa()}>{ocupado ? (avance || 'Un momento…') : 'Devolver el depósito al inquilino'}</button>
      <p className="nota">Trustless Work descuenta 0,3 % al devolver: el inquilino recibe {usd(Math.round(a.monto * 0.997 * 1e7) / 1e7)} de prueba.</p></>}
    {(a.red?.txs.evidencia || (a.red?.txs.aprobacion && a.red.txs.aprobacion !== 'ya-aprobado')) && <ul className="lista comprobantes">
      {a.red?.txs.evidencia && <li><span>{NOMBRE_PASO.evidencia}</span><VerTx h={a.red.txs.evidencia} /></li>}
      {a.red?.txs.aprobacion && a.red.txs.aprobacion !== 'ya-aprobado' && <li><span>{NOMBRE_PASO.aprobacion}</span><VerTx h={a.red.txs.aprobacion} /></li>}</ul>}
    <Error m={err} />
  </div>
}

/** Todos los comprobantes del alquiler en la red de prueba (stellar.expert, testnet). */
export function Comprobantes({ a }: { a: Alquiler }) {
  const txs = a.red?.txs ?? {}; const hay = ORDEN.filter(k => esHash(txs[k]))
  return <section className="glass tarjeta" aria-labelledby="t-comp"><h3 id="t-comp">Comprobantes en la red de prueba</h3>
    {hay.length === 0 ? <p className="nota">Aquí aparece cada paso que quede registrado en la red de prueba de Stellar.</p> :
      <ol className="lista comprobantes">{hay.map(k => <li key={k}><span>{NOMBRE_PASO[k]}</span><VerTx h={txs[k]!} /></li>)}</ol>}
    {a.red?.escrow && <p className="nota"><a className="enlace" href={enlaceContrato(a.red.escrow)} target="_blank" rel="noopener noreferrer">Ver la cuenta segura en la red de prueba</a></p>}
  </section>
}

/** Último paso registrado en la red de prueba, para mostrarlo arriba del panel. */
export function UltimoComprobante({ a }: { a: Alquiler }) {
  const e = [...a.historial].reverse().find(h => esHash(h.tx)); if (!e) return null
  return <p className="ultimo-comprobante nota" role="status">✓ {e.texto} · {fechaHora(e.fecha)} · <VerTx h={e.tx!} /></p>
}

/** Fase 1 mínima: un paso por pantalla. 1 crear (hecho) → 2 obtener USDC → 3 depositar → 4 el dueño de prueba aprueba → 5 devolver. */
const PASOS_SOLO = ['Crear el alquiler', 'Obtener USDC de prueba', 'Depositar en la cuenta segura', 'El dueño de prueba aprueba', 'Devolver el depósito'] as const
export function DetalleSolo({ a }: { a: Alquiler }) {
  const t = a.red?.txs ?? {}
  const paso = t.liberacion ? 5 : t.aprobacion ? 4 : t.deposito ? 3 : a.red?.usdcListo ? 2 : 1   // índice del paso actual (0 = crear, ya hecho)
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  useEffect(() => { window.scrollTo(0, 0); setErr('') }, [paso])
  const correr = async (f: () => Promise<void>) => { setOcupado(true); setErr(''); try { await f() } catch (e) { setErr(textoError(e)) } finally { setOcupado(false); setAvance('') } }
  const boton = (texto: string, f: () => Promise<void>) => <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void correr(f)}>{ocupado ? (avance || 'Un momento…') : texto}</button>
  const depositarYa = () => correr(async () => {
    if (a.red?.escrow) { setAvance('Depositando…'); const h = await reintentarDeposito(a.red.escrow); anotar(a.id, { deposito: h }, x => { x.estado = 'en_curso'; x.pago = new Date().toISOString() }); return }
    try {
      const r = await depositar(a.id, a.monto, setAvance)
      anotar(a.id, r.pasos, x => { Object.assign(x.red!, { escrow: r.escrow, dueno: r.dueno, inquilino: r.inquilino, inquilinoPrueba: r.prueba }); x.escrowId = r.escrow; x.estado = 'en_curso'; x.pago = new Date().toISOString() })
    } catch (e) { const x = e as { escrow?: string; pasos?: Partial<Record<PasoRed, string>> }; if (x.escrow) anotar(a.id, x.pasos ?? {}, y => { y.red!.escrow = x.escrow }); throw e }
  })
  const aprobarYa = () => correr(async () => {
    setAvance('El dueño de prueba está aprobando…'); const r = await aprobar(a.red!.escrow!)
    anotar(a.id, { ...(r.evidenciaTx && { evidencia: r.evidenciaTx }), ...(r.aprobacionTx && { aprobacion: r.aprobacionTx }) }, x => { x.estado = 'ventana_reclamo'; if (r.yaAprobado) x.red!.txs.aprobacion ??= 'ya-aprobado' })
  })
  const liberarYa = () => correr(async () => {
    setAvance('Devolviendo el depósito…'); const r = await liberar(a.red!.escrow!)
    anotar(a.id, { liberacion: r.tx }, x => { x.estado = 'cerrado'; x.resultado = { inquilino: Math.round(x.monto * 0.997 * 1e7) / 1e7, dueno: 0, via: 'automatico', fecha: new Date().toISOString() } })
  })
  const recibe = usd(Math.round(a.monto * 0.997 * 1e7) / 1e7)
  const ultimo = (k: PasoRed) => t[k] && t[k] !== 'ya-aprobado' ? <p className="ultimo-comprobante nota" role="status">✓ {NOMBRE_PASO[k]} · <VerTx h={t[k]!} /></p> : null
  const pantalla = [
    null,
    <><h2>Obtener USDC de prueba</h2><ObtenerUsdc objetivo={a.monto} onListo={r => anotar(a.id, r.txs, x => { x.red!.inquilino = r.g; x.red!.inquilinoPrueba = true; if (Number(r.saldo) >= a.monto) x.red!.usdcListo = true })} /></>,
    <>{ultimo('compra')}<h2>Depositar en la cuenta segura</h2>
      <p>{usd(a.monto)} de prueba quedan bloqueados en una cuenta segura (escrow) de Trustless Work en la red de prueba de Stellar. Lockumi firma el depósito por el {minuscula(INQUILINO_PRUEBA)}.</p>
      {boton(`Depositar ${usd(a.monto)}`, depositarYa)}<p className="nota">Tarda entre 20 y 60 segundos.</p></>,
    <>{ultimo('deposito')}<h2>El dueño de prueba aprueba</h2>
      <p>Al terminar el alquiler, si todo está bien, el dueño aprueba devolver el depósito. Como es un {minuscula(DUENO_PRUEBA)}, Lockumi firma esa aprobación por él.</p>
      {boton('Aprobar la devolución', aprobarYa)}
      <div className="simulado-caja"><p className="nota"><Simulado /> ¿Y si hubiera un daño? El reclamo y la persona mediadora son simulados en esta demo: no se registran en la red de prueba.</p></div></>,
    <>{ultimo('aprobacion')}<h2>Devolver el depósito</h2>
      <p>El dueño de prueba ya aprobó. Lockumi libera el depósito de la cuenta segura al inquilino. Trustless Work descuenta 0,3 %: llegan {recibe} de prueba.</p>
      {boton('Devolver el depósito', liberarYa)}</>,
    <>{ultimo('liberacion')}<span className="chip chip--exito">✓ Terminado</span><h2>Depósito devuelto</h2>
      <p>El inquilino de prueba recibió {recibe} de prueba en la red de prueba de Stellar. Todos los pasos quedaron registrados:</p></>,
  ][paso]
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <h1 className="h-lugar">{a.direccion}</h1>
    <div className="paso-cab"><p className="paso-cab__n">{paso >= 5 ? 'Terminado' : `Paso ${paso + 1} de 5`}</p><p className="paso-cab__t">{PASOS_SOLO[Math.min(paso, 4)]}</p>
      <div className="pasos-solo" aria-hidden="true">{PASOS_SOLO.map((_, i) => <span key={i} className={i < paso ? 'hecho' : i === paso ? 'actual' : ''} />)}</div></div>
    <div className="detalle"><div className="detalle__principal pila">
      <div className="glass glass--fuerte tarjeta pila">{pantalla}<Error m={err} /></div>
      <Cuentas a={a} />
    </div>
    <aside className="detalle__lado pila"><Comprobantes a={a} /></aside></div>
  </main>
}
export { TOPE_USDC, conectarBilletera }
