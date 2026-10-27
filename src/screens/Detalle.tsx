import { useEffect, useRef, useState } from 'react'
import { LogoAnimado } from '../LogoAnimado'
import { store, useAlquileres, obtener, ahoraDe, DIA, vistaDe, rolDe, fijarVista } from '../store'
import { acciones, plazoMs, textoPlazo } from '../acciones'
import { modoDe } from '../servidor/config'
import { pideSesionAntesDeFirmar } from './sesionFirma'
import { COMISION_TEXTO, usaCuentaPropia } from '../services/escrow'
import { abreviar } from '../services/billetera'
import { PagoReal, CierreReal, Comprobantes, Cuentas, UltimoComprobante, DetalleSolo, VerTx } from './Real'
import { esHash } from '../services/comprobantes'
import { servidor } from '../servidor/repositorio'
import { trustless } from '../services/trustless'
import { estadoAceptaciones, type Aceptacion } from '../servidor/aceptaciones'
import { modoReal } from '../services/auth'
import { NOMBRE_ROL, type Alquiler, type Rol, type Foto, type Usuario } from '../types'
import { fotoEjemplo } from '../demoFotos'
import { Demo, Simulado, Icono, LineaTiempo, usd, usdExacto, fecha, fechaHora, useDevolucionAutomatica, FIN_CONTADOR_AUTO, FIN_CONTADOR_SIN_CORRIDA, textoErrorDevolucion, RELOJ_ADELANTADO } from '../ui'
import { CuartoEditor, Firma, FotoLista, cuartoListo } from './Acta'
import { ContratoDoc } from './ContratoDoc'
import { ContratoCompacto, useEscritorio } from './ContratoCompacto'
import { TomarFoto } from '../Camara'
import { ETAPAS, etapaDe, pasoTexto, turno, otro, NOMBRE, ahoraPrueba } from '../flujo'
import { adelantoPermitido } from '../../api/_lib/red'
import { repartoCentimos } from '../../api/_lib/centimos'
import { avisar, alertaPorCambio, instantanea, type Instantanea } from '../alertas'
import { EsperaPago } from '../EsperaPago'
import { useProceso, conPunto, NOTA_TIEMPO } from '../proceso'
import { pruebaCompleta } from '../prueba/interruptor'
import { reglas17, puedeCambiarVersion } from '../prueba/version'
import { CambioVersion } from '../prueba/CambioVersion'
import { esDosPersonas, TEXTO_INVITACION_VENCE, TEXTO_CERRADO_AUTO, TEXTO_AUTO_DUENO, TEXTO_AUTO_INQUILINO, TEXTO_ACEPTARON_DOS, TITULO_RECLAMO_DOS, TEXTO_RECLAMO_DOS, TEXTO_PAGO_DOS, TEXTO_ESCROW_DOS, TEXTO_SOLOS_DOS, montoPrueba, llegaPrueba, notaComisionAuto, notaComisionReparto, llegaria } from '../prueba/dosPersonas'
import { ReglaPropuesta, registroRegla } from '../prueba/Regla'
import { correoInvitacionEnviado, linkNuevoSinCorreo, EVENTO_CORREO_INVITACION, textoEnlaceEnviado, BOTON_WHATSAPP, enlaceWhatsApp } from '../prueba/invitacion'
import { PlazoDueno } from '../prueba/PlazoDueno'
import { ReclamoPC, FormRubros, SeAplico } from '../prueba/ReclamoPC'
import { MediacionPC, ResueltoSimulacion, GuardarDatosMediacion } from '../prueba/MediacionPC'
import { Expediente } from '../prueba/Expediente'
import { AvisoSalida } from '../prueba/AvisoSalida'
import { etapaDeAvance, type EtapaPago } from '../espera'
import { venceMediacionC, textoPlazoMediacionC } from '../prueba/mediacion'
import { MasOpciones } from '../prueba/Eliminar'
import { modoPrueba as redDePrueba } from '../servidor/config'
import { ConSesion, ErrorPago } from './Firmante'
import { esTextoNoFirmante } from '../services/billetera'
import { esTextoSinSesion } from '../services/firmante'

type P = { a: Alquiler; rol: Rol }
const ahoraISO = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()
// LEGAL: revisado (25/10, P-05) · texto literal aprobado para la espera de la mediación en C (alquileres con otra persona)
export const ESPERA_MEDIACION_C = 'Ahora cada parte elige cómo repartir el depósito. Cuando las dos acepten el mismo reparto, la persona mediadora lo registra y liberamos los USDC de prueba, cada monto menos el 0,3 % de comisión de Trustless Work. La persona mediadora puede ayudarles a llegar a un acuerdo, pero no decide por ustedes.'
const Espera = ({ texto }: { texto: string }) => <div className="espera" role="status"><span className="espera__reloj" aria-hidden="true">⏳</span><p>{texto}</p></div>

export function Contrato({ a, rol }: P) {
  const { prueba: modoPrueba } = modoDe(a)
  // Prueba completa: antes de firmar, el inquilino decide la Regla de propuesta automática (B.1); queda registrada.
  // C (Legal, 25/10, 2:53 a. m.; Términos 1.9-demo, 6.5.1 d): en dos personas la regla no se ofrece ni se guarda; solo una nota sin casilla.
  if (reglas17(a) && !esDosPersonas(a) && rol === 'inquilino' && !a.regla && !a.contrato.firmas.inquilino)
    return <ReglaPropuesta onListo={acepta => store.cambiar(a.id, x => { x.regla = registroRegla(a.inquilinoEmail, a.id, acepta) }, acepta ? 'El inquilino aceptó la Regla de propuesta automática' : 'El inquilino no aceptó la Regla de propuesta automática')} />
  return <div className="pila">
    {/* C: nota «Si hay un reclamo» (Legal, 25/10, 2:53 a. m.; aprobada a las 3:16 a. m.), en el recuadro informativo de la devolución automática */}
    {esDosPersonas(a) && rol === 'inquilino' && !a.contrato.firmas.inquilino && <div className="auto-dos" role="note" aria-label={TITULO_RECLAMO_DOS}><p><strong>{TITULO_RECLAMO_DOS}</strong></p><p>{TEXTO_RECLAMO_DOS}</p></div>}
    <ContratoDoc a={a} />
    {modoPrueba && <p className="nota">El dueño es una cuenta de Lockumi para la demo: por eso no te pedimos su correo. Firma solo después de ti.</p>}
    {/* Firmante (26/10): en C, si esta pestaña perdió la sesión, primero «Entrar de nuevo» (después se paga con la billetera).
        U4 (27/10): también el dueño, solo si al alquiler le falta su cuenta Stellar (sesionFirma.ts) */}
    <ConSesion activo={pideSesionAntesDeFirmar(a, rol)}>
    <Firma key={'c-' + rol} a={a} que="contrato" rol={rol} titulo="Firmas del contrato"
      texto="Lee el contrato. Si estás de acuerdo, fírmalo." casilla="Leí el contrato y estoy de acuerdo." /></ConSesion>
  </div>
}

/** Paso del depósito. Parte 2: en modoVideo cambiar PagoSimulado por el depósito real (PagoReal ya existe para la red de prueba). */
export function Pago({ a, rol }: P) {
  const { solo: modoSolo, trustless: conTw } = modoDe(a)
  // U4 (27/10/2026), respaldo para alquileres que el dueño ya firmó sin su cuenta: al abrir el paso del depósito con sesión de Cavos,
  // se guarda la de su billetera si falta (en silencio; sin sesión no hace nada). Así el inquilino puede pagar sin el 409.
  useEffect(() => {
    if (conTw && rol === 'dueno' && a.miRol === 'dueno' && !a.escrowId && !a.cuentas?.dueno) void trustless.guardarCuentaSiFalta(a.id)
  }, [a.id, conTw, rol, a.miRol, a.escrowId, a.cuentas?.dueno])
  if (modoSolo) return <PagoReal a={a} rol={rol} />
  return <PagoSimulado a={a} rol={rol} />
}
function PagoSimulado({ a, rol }: P) {
  const { video: modoVideo, escrowReal } = modoDe(a)
  const p = useProceso()
  // Estado de espera v2: el paso sale del avance real de services/escrow.ts (sin temporizadores). `fallo` = paso en que falló.
  const [etapa, setEtapa] = useState<EtapaPago>(0); const [fallo, setFallo] = useState<EtapaPago>(0)
  const pagar = () => {
    if (p.ocupado) return
    let actual: EtapaPago = 1; setFallo(0); setEtapa(1)
    return p.correr(async av => {
      try { await acciones.pagar(a, t => { actual = etapaDeAvance(t); setEtapa(actual); av(t) }); setEtapa(3) }
      catch (x) { setFallo(actual); setEtapa(0); throw x }
    })
  }
  const dos = esDosPersonas(a)   // PR #22 (a): en C el depósito va a la red de prueba de Trustless Work; nada de «simulado»
  return <section className="pila"><div className="cab"><h2>Depósito</h2>{escrowReal || dos ? <span className="chip chip--neutro">Red de prueba</span> : modoVideo ? <Simulado /> : <Demo t="Pago simulado" />}</div>
    <div className="monto">{usd(a.monto)}</div>
    <p>El dinero queda guardado. El dueño no lo recibe ahora: se decide al final del alquiler.</p>
    {/* LEGAL: revisado (24/10) · «Ni el dueño ni el inquilino pueden sacarlos solos.» (las dos notas: cuenta propia y USDC de Lockumi) */}
    {rol === 'inquilino' ? <>
      {/* C (Legal, 25/10, 3:16 a. m.): la línea del pago y, después, la del escrow; sin «nadie puede sacarlo solo» */}
      {dos ? <p className="nota">{TEXTO_PAGO_DOS} {TEXTO_ESCROW_DOS}</p>
        : escrowReal && usaCuentaPropia(a) ? <p className="nota">Son USDC de prueba, sin valor, de tu cuenta ({abreviar(a.red!.inquilino!)}). {a.red!.firma === 'freighter' ? 'Freighter' : 'Tu cuenta Lockumi'} te pedirá confirmar el depósito; después quedan bloqueados en una cuenta segura de la red de prueba. Ni el dueño ni el inquilino pueden sacarlos solos.</p>
        : escrowReal ? <p className="nota">Son USDC de prueba, sin valor: Lockumi los pone en tu cuenta de prueba y quedan bloqueados en una cuenta segura de la red de prueba. Ni el dueño ni el inquilino pueden sacarlos solos.</p>
        : (!modoReal || modoVideo) && <p className="nota">Es una prueba: no se cobra nada.</p>}
      {/* Firmante (26/10): el error de firma o de sesión (con sesión cerrada, «Entrar de nuevo») */}
      {esTextoNoFirmante(p.err) || esTextoSinSesion(p.err) ? <ErrorPago m={p.err} /> : p.error}
      <ConSesion activo={modoDe(a).trustless && etapa === 0}>
      <EsperaPago etapa={etapa} fallo={fallo} etiqueta={`Pagar ${usd(a.monto)}`} onPagar={() => void pagar()} /></ConSesion>
    </> : <Espera texto="Esperando que el inquilino pague el depósito." />}
  </section>
}

/** Fotos de entrada o salida: un espacio por pantalla y al final la confirmación. */
function Fotos({ a, rol, cual }: P & { cual: 'entrada' | 'salida' }) {
  const acta = a[cual]!; const n = acta.cuartos.length
  const falta = acta.cuartos.findIndex(c => !cuartoListo(c))
  const [i, setI] = useState(acta.firmas[rol] || falta === -1 ? n : falta); const [err, setErr] = useState('')
  useEffect(() => { window.scrollTo(0, 0) }, [i])
  const firmaCuarto = JSON.stringify(acta.cuartos[i] ?? null)
  useEffect(() => { setErr('') }, [firmaCuarto])
  const siguiente = () => {
    const c = acta.cuartos[i]
    if (!c.fotos.length) return setErr('Falta una foto de este espacio. Toca "Tomar foto".')
    if (c.items.some(x => !x.estado)) return setErr('Marca "Bien" o "Con detalle" en cada punto de la lista.')
    setErr(''); setI(i + 1)
  }
  const titulo = cual === 'entrada' ? 'Fotos de entrada' : 'Fotos de salida'
  return <div className="pila">
    <div className="subpasos" aria-label={`${titulo}: parte ${Math.min(i + 1, n + 1)} de ${n + 1}`}>
      {Array.from({ length: n + 1 }, (_, k) => <span key={k} className={k < i ? 'hecho' : k === i ? 'actual' : ''} />)}</div>
    {i < n ? <>
      <p className="mini">{titulo} · Espacio {i + 1} de {n}</p>
      <CuartoEditor a={a} cual={cual} idx={i} rol={rol} />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="pie-paso">
        {i > 0 && <button type="button" className="boton boton--secundario" onClick={() => { setErr(''); setI(i - 1) }}>Atrás</button>}
        <button type="button" className="boton boton--primario boton--grande pie-paso__principal" onClick={siguiente}>{i + 1 < n ? 'Siguiente espacio' : 'Revisar y confirmar'}</button>
      </div>
    </> : <>
      <Firma key={cual + '-' + rol} a={a} que={cual} rol={rol} titulo={'Confirmar ' + titulo.toLowerCase()}
        texto={cual === 'entrada' ? 'Revisa que las fotos muestren cómo está el lugar hoy.' : 'Revisa que las fotos muestren cómo quedó el lugar.'}
        casilla={cual === 'entrada' ? 'Las fotos muestran cómo está el lugar al entrar.' : 'Las fotos muestran cómo quedó el lugar al salir.'} />
      <button type="button" className="enlace" onClick={() => setI(0)}>Ver o cambiar las fotos</button>
    </>}
  </div>
}

export function EnCurso({ a }: P) {
  return <section className="pila"><span className="chip chip--exito"><Icono id="i-candado" /> Depósito guardado</span>
    <h2>Alquiler en curso</h2><div className="monto">{usd(a.monto)}</div>
    {/* LEGAL: revisado (24/10). C: aprobado por Legal (25/10, 3:34 a. m.) */}
    <p>Del {fecha(a.inicio)} al {fecha(a.fin)}. {esDosPersonas(a) ? `El depósito sigue guardado. ${TEXTO_SOLOS_DOS}` : 'El depósito sigue guardado y ni el dueño ni el inquilino pueden tomarlo solos.'}</p>
    <p className="nota">Cuando el inquilino entregue el lugar, cualquiera de los dos puede empezar las fotos de salida.</p>
    <button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={() => void acciones.iniciarSalida(a)}>Empezar fotos de salida</button>
  </section>
}

export function Ventana({ a, rol }: P) {
  const { servidor: modoServidor, solo: modoSolo, video: modoVideo, escrowReal } = modoDe(a)
  const fin = +new Date(a.ventanaInicio!) + plazoMs(a); const [, tick] = useState(0); const [form, setForm] = useState(false); const p = useProceso(), auto = useDevolucionAutomatica()
  useEffect(() => { const t = setInterval(() => tick(k => k + 1), 30_000); return () => clearInterval(t) }, [])
  const resta = Math.max(0, fin - ahoraDe(a)); const dias = Math.floor(resta / DIA); const horas = Math.floor(resta % DIA / 3_600_000)
  // Al terminar el plazo sin reclamos se devuelve el depósito (con escrow real: aprobación del dueño de prueba + devolución).
  const devolver = () => p.correr(av => acciones.cerrarSinReclamo(a, av))
  // Solo red de prueba (fijo en el código, ver adelantoPermitido): adelanta el reloj de la app hasta el final del plazo.
  const adelantar = () => { if (adelantoPermitido()) store.cambiar(a.id, x => { x.diasSimulados += Math.ceil(resta / DIA) }, 'Solo red de prueba: se adelantó el plazo') }
  useEffect(() => { if (!modoSolo && resta === 0 && !a.reclamo) void devolver() }, [resta, a.id, a.reclamo]) // eslint-disable-line
  return <section className="pila"><h2>{textoPlazo(a)} para reclamos</h2>
    <div className="cuenta" role="timer"><span className="cuenta__n">{dias}</span> días <span className="cuenta__n">{horas}</span> horas{a.diasSimulados > 0 && <span className="reloj-adelantado">{RELOJ_ADELANTADO}</span>}</div>
    {modoSolo ? <p className="nota">En esta prueba no hay que esperar el plazo: si todo está bien, el dueño de prueba aprueba y el depósito vuelve al inquilino en la red de prueba.</p>
      // LEGAL: revisado (24/10) · ronda 6: «Si no hay reclamo, después de {plazo}…». La devolución la dispara la app abierta (efecto de arriba) y la firma el servidor de Lockumi
      : escrowReal ? <p className="nota">Termina el {conPunto(fechaHora(fin))} {auto ? FIN_CONTADOR_AUTO : FIN_CONTADOR_SIN_CORRIDA}</p>
      // LEGAL: revisado (25/10, lista de Legal) · C (alquileres de dos personas sin versión guardada): textos aprobados de la devolución automática, sin «demo local»
      : esDosPersonas(a) ? <p className="nota">Termina el {conPunto(fechaHora(fin))} {rol === 'dueno' ? TEXTO_AUTO_DUENO : TEXTO_AUTO_INQUILINO}</p>
      // LEGAL: revisado (24/10) · demo local sin red
      : <p className="nota">Termina el {conPunto(fechaHora(fin))} Si no hay reclamos, después de {textoPlazo(a)} el depósito se devuelve al inquilino. En esta demo local no hay red: es solo una simulación.</p>}
    {resta === 0 && !a.reclamo && !modoSolo && (p.ocupado ? <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>{p.avance || 'Devolviendo el depósito…'}</p></div>
      : p.err ? <>{escrowReal ? <p className="error" role="alert">{textoErrorDevolucion(p.err)}</p> : p.error}<button type="button" className="boton boton--primario boton--ancho" onClick={() => void devolver()}>Volver a intentar la devolución</button></> : null)}
    {modoSolo && <CierreReal a={a} rol={rol} />}
    {modoVideo && resta > 0 && rol === 'inquilino' && (form ? <FormReclamo a={a} onCancelar={() => setForm(false)} /> : <div className="pila">
      <p className="nota">La regla: el dueño tiene {textoPlazo(a)} para reclamar. Si no reclama, después de ese plazo el depósito se devuelve al inquilino.</p>{/* LEGAL: revisado (24/10) */}
      {adelantoPermitido() && <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={p.ocupado} onClick={adelantar}>Solo red de prueba: adelantar el plazo</button>}
      <button type="button" className="boton boton--secundario boton--ancho" disabled={p.ocupado} onClick={() => setForm(true)}>Hacer un reclamo como dueño de prueba</button>
      <p className="nota">«Adelantar el plazo» termina los {textoPlazo(a)} ahora y te devuelve el depósito. «Hacer un reclamo» lo haces en nombre del dueño de prueba.</p>
    </div>)}
    {resta > 0 && !(modoVideo && rol === 'inquilino') && (rol === 'dueno'
      ? (form ? <FormReclamo a={a} onCancelar={() => setForm(false)} /> : <>
        {/* LEGAL: revisado (24/10) · ronda 8. modoSolo: solo el alquiler de ejemplo del recorrido (DetalleSolo no tiene reclamo), sin red: reclamo y mediación simulados. Si no (modoVideo, producción): el reclamo abre una disputa real en la red de prueba (acciones.reclamar → escrow.disputar) */}
        {modoSolo ? <p className="nota">¿Encontraste un daño? Puedes reclamar. <Simulado /> En este ejemplo, el reclamo y la mediación son simulados: no se registran en la red de prueba ni bloquean ningún depósito.</p>
          : <p>¿Encontraste un daño que no estaba en las fotos de entrada? Puedes reclamar. Si todo está bien, no hagas nada.</p>}
        <button type="button" className={'boton boton--ancho ' + (modoSolo ? 'boton--secundario' : 'boton--primario boton--grande')} onClick={() => setForm(true)}>Reclamar un daño</button></>)
      : <Espera texto={`Esperando. Si el dueño no reclama, después de ${textoPlazo(a)} se te devuelve el depósito.`} />)}{/* LEGAL: revisado (24/10) */}
    <EscrowReal a={a} rol={rol} />
    {/* Adelanta el reloj de la app: al llegar a 0 corre la devolución de arriba (real en la red de prueba). La cuenta segura no tiene plazo propio. */}
    {!modoServidor && !modoSolo && resta > 0 && adelantoPermitido() && !(modoVideo && rol === 'inquilino') && <button type="button" className="enlace" disabled={p.ocupado} onClick={adelantar}>Solo red de prueba: adelantar el plazo</button>}
  </section>
}

function FormReclamo({ a, onCancelar }: { a: Alquiler; onCancelar: () => void }) {
  const { escrowReal } = modoDe(a)
  const p = useProceso()
  const [monto, setMonto] = useState(''); const [motivo, setMotivo] = useState(''); const [fotos, setFotos] = useState<Foto[]>([]); const [env, setEnv] = useState(false)
  const m = Number(monto.replace(',', '.'))
  const e = {
    monto: !monto.trim() ? 'Escribe cuánto reclamas.' : !(m > 0) ? 'El monto tiene que ser mayor que cero.' : escrowReal && Math.round(m * 100) !== m * 100 ? 'Usa como máximo 2 decimales (ej.: 0,50).' : m > a.monto ? `No puede ser más que el depósito (${usd(a.monto)}).` : '',
    motivo: motivo.trim().length < 10 ? 'Cuenta qué pasó en al menos 10 letras (ej.: "mancha en la pared de la sala").' : '',
    fotos: fotos.length ? '' : 'Agrega al menos una foto del daño. Toca "Tomar foto del daño".',
  }
  const enviar = () => {
    setEnv(true); if (e.monto || e.motivo || e.fotos) return
    void p.correr(av => acciones.reclamar(a, m, motivo.trim(), fotos, av))
  }
  return <div className="pila">
    <label className={'campo' + (env && e.monto ? ' campo--error' : '')}><span>¿Cuánto reclamas? ({escrowReal ? 'USDC de prueba' : 'USD'})</span><input inputMode="decimal" value={monto} onChange={x => setMonto(x.target.value)} />{env && e.monto && <small className="campo__error" role="alert">{e.monto}</small>}</label>
    <label className={'campo' + (env && e.motivo ? ' campo--error' : '')}><span>¿Qué pasó?</span><textarea rows={3} value={motivo} onChange={x => setMotivo(x.target.value)} placeholder="Ej.: mancha en la pared de la sala que no estaba al entrar" />{env && e.motivo && <small className="campo__error" role="alert">{e.motivo}</small>}</label>
    <FotoLista fotos={fotos} vacio="Sin fotos del daño todavía." />
    <TomarFoto por="dueno" etiqueta="Tomar foto del daño" principal={false} onFoto={f => setFotos(v => [...v, f])} />
    {<button type="button" className="enlace" onClick={() => setFotos(v => [...v, { src: fotoEjemplo('Sala', 'salida', 0), por: 'dueno', fecha: ahoraISO(a), tomadaEn: ahoraDe(a), origen: 'ejemplo' }])}>Demo: usar una foto de ejemplo</button>}
    {env && e.fotos && <p className="error" role="alert">{e.fotos}</p>}
    {p.error}
    <div className="pie-paso"><button type="button" className="boton boton--secundario" disabled={p.ocupado} onClick={onCancelar}>Cancelar</button>
      <button type="button" className="boton boton--primario boton--grande pie-paso__principal" disabled={p.ocupado} onClick={enviar}>{p.texto('Enviar reclamo')}</button></div>
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </div>
}

function Evidencia({ a }: { a: Alquiler }) {
  const r = a.reclamo!
  return <div className="pila"><div className="cab"><span className="mini">Reclamo del dueño · {fechaHora(r.fecha)}</span><span className="monto monto--chico">{usd(r.monto)}</span></div>
    <p>“{r.motivo}”</p><FotoLista fotos={r.fotos} /></div>
}

function Reclamo({ a, rol }: P) {
  const { solo: modoSolo, prueba: modoPrueba, video: modoVideo, escrowReal, servidor: modoServidor } = modoDe(a)
  const r = a.reclamo!; const p = useProceso()
  // B2 (dos personas): el inquilino deja registro de que abrió el reclamo (6.5 b) y, vencido su plazo, el servidor lo pasa a la mediación (6.5 c; en dos personas la 6.5.1 no se aplica sola).
  useEffect(() => { if (!modoServidor) return
    void (async () => { try { if (rol === 'inquilino') await acciones.abrirAvisoReclamo!(a); await acciones.aplicarSilencio!(a) } catch { /* se reintenta al volver a abrir */ } })()
  }, [modoServidor, rol, a.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const aceptar = () => p.correr(av => acciones.responder(a, true, av))
  return <section className="pila"><div className="cab"><h2>Reclamo del dueño</h2>{modoPrueba && <Simulado texto="Mediación simulada" />}</div>{/* LEGAL: revisado (24/10) */}<Evidencia a={a} />
    {/* LEGAL: revisado (24/10) · ronda 8. modoSolo: solo el alquiler de ejemplo (sin red, reclamo simulado). modoVideo (producción): disputa real en la red de prueba (acciones.reclamar → escrow.disputar) */}
    {modoSolo && <p className="nota">En este ejemplo, el reclamo es simulado: no se registra en la red de prueba ni bloquea ningún depósito. La mediación también es simulada.</p>}
    {modoVideo && <p className="nota">El dueño de prueba es una cuenta de Lockumi. Su reclamo quedó registrado en la cuenta segura de la red de prueba: el depósito no se mueve hasta que se resuelva.</p>}
    {rol === 'inquilino' ? <>
      <p>Si aceptas, recibes {usdExacto(llegaria(r.monto, a.monto).inquilino)} y el dueño {usdExacto(llegaria(r.monto, a.monto).dueno)}{escrowReal ? ` (menos ${COMISION_TEXTO} de comisión de la red de prueba)` : ''}. Si no estás de acuerdo, una persona mediadora revisa las fotos con ustedes y les ayuda a buscar un acuerdo.</p>{/* LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide */}
      {p.error}
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={p.ocupado} onClick={() => void aceptar()}>{p.texto('Aceptar reclamo')}</button>
      <button type="button" className="boton boton--secundario boton--ancho" disabled={p.ocupado} onClick={() => void p.correr(() => acciones.responder(a, false))}>No estoy de acuerdo</button>
      {escrowReal && p.ocupado && NOTA_TIEMPO}
    </> : <Espera texto="Esperando que el inquilino responda tu reclamo." />}
  </section>
}

function Mediacion({ a, rol }: P) {
  const { servidor: modoServidor, solo: modoSolo, prueba: modoPrueba, video: modoVideo, escrowReal } = modoDe(a)
  const r = a.reclamo!; const [panel, setPanel] = useState(false); const [aDueno, setAD] = useState(Math.round(r.monto / 2 * 100) / 100); const p = useProceso()
  const [mediador, setMediador] = useState(!modoServidor)
  useEffect(() => { if (modoServidor) servidor.esMediador().then(setMediador).catch(() => {}) }, [modoServidor])
  const decidir = () => p.correr(av => acciones.decidir(a, aDueno, undefined, av))
  // PR #22 (dos personas): estado de lo que aceptó cada parte; se relee cada 8 s, como el resto del alquiler.
  const [filas, setFilas] = useState<Aceptacion[]>([])
  const leer = () => servidor.aceptaciones(a.id).then(setFilas).catch(() => {})
  useEffect(() => { if (!modoServidor || mediador) return; void leer(); const t = setInterval(() => void leer(), 8000); return () => clearInterval(t) }, [modoServidor, mediador, a.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const est = estadoAceptaciones(rol, filas, a.monto)
  const vence = modoServidor ? venceMediacionC(a) : null
  const aceptar = () => p.correr(async () => { await acciones.aceptarAcuerdo!(a, aDueno); await leer() })
  return <section className="pila"><div className="cab"><h2>Con una persona mediadora</h2>{modoPrueba && <Simulado />}</div>
    {/* LEGAL: revisado (24/10) · el reparto sí se ejecuta en la red de prueba: acciones.decidir → escrow.resolver → /api/solo «resolver» (resolve_dispute) */}
    {modoSolo && <p className="nota">La mediación es simulada: el reparto que elijas se ejecuta con tokens de prueba, sin valor.</p>}
    {modoVideo && <p className="nota">En esta prueba la persona mediadora es simulada: decides tú con «Resolver el reclamo (simulación)». El reparto que elijas sí se hace de verdad en la red de prueba.</p>}
    {/* LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide */}
    <p>No hubo acuerdo. Una persona mediadora revisa con ustedes las fotos de entrada y salida y les ayuda a buscar un acuerdo sobre el reparto.</p>
    {/* LEGAL: revisado (25/10, P-05) · texto literal de la decisión P-05: cada parte elige el reparto; la persona mediadora no decide */}
    {!modoVideo && <Espera texto={modoServidor ? ESPERA_MEDIACION_C : 'No tienes que hacer nada. Te avisaremos cuando haya un acuerdo.'} />}
    {/* LEGAL: revisado (25/10, 5:01 p. m., Legal punto 1) · plazo de 3 días hábiles de la mediación de C (misma fecha que el servidor, P-06) */}
    {modoServidor && vence !== null && <p>{textoPlazoMediacionC(vence)}</p>}
    <Evidencia a={a} />
    {/* LEGAL: revisado (25/10, lista de Legal) · B2 (dos personas): cada parte acepta el reparto en la app; se cierra solo con las dos aceptaciones del mismo monto (2.2 b) */}
    {modoServidor && !mediador && <div className="pila">
      <label className="campo"><span>Reparto que aceptas: {usd(aDueno)} para el dueño · {usd(a.monto - aDueno)} para el inquilino</span>
        <input type="range" min={0} max={r.monto} step={0.01} value={aDueno} onChange={e => setAD(Number(e.target.value))} aria-valuetext={`${usd(aDueno)} para el dueño`} /></label>
      <button type="button" className="boton boton--primario boton--ancho" disabled={p.ocupado} onClick={() => void aceptar()}>{p.texto(rol === 'dueno' ? 'Acepto este reparto (dueño)' : 'Acepto este reparto (inquilino)')}</button>
      <p className="nota" role="status">{est.mia !== null ? `Aceptaste ${usd(est.mia)} para el dueño. ` : ''}{est.texto}</p>
      {p.error}</div>}
    {mediador && (!panel ? <button type="button" className={modoVideo ? 'boton boton--primario boton--ancho boton--grande' : 'enlace'} onClick={() => setPanel(true)}>{modoServidor ? 'Registrar el acuerdo' : modoVideo ? 'Resolver el reclamo (simulación)' : 'Demo: registrar el acuerdo'}</button>
      : <div className="mediador pila"><label className="campo"><span>Para el dueño: {usd(aDueno)} · para el inquilino: {usd(a.monto - aDueno)}</span>
          <input type="range" min={0} max={r.monto} step={escrowReal ? 0.01 : 10} value={aDueno} onChange={e => setAD(Number(e.target.value))} aria-valuetext={`${usd(aDueno)} para el dueño`} /></label>
        {p.error}
        <button type="button" className="boton boton--primario boton--ancho" disabled={p.ocupado} onClick={() => void decidir()}>{p.texto(modoVideo ? 'Confirmar el reparto' : 'Registrar el acuerdo')}</button>
        {escrowReal && p.ocupado && NOTA_TIEMPO}</div>)}
  </section>
}

/** Link para que el inquilino entre desde su propio aparato (solo con servidor compartido). */
export function Invitacion({ a }: { a: Alquiler }) {
  const [link, setLink] = useState(a.invitacion ?? ''); const [copiado, setCopiado] = useState(false); const [err, setErr] = useState('')
  const copiar = async () => { try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { setErr('No pudimos copiar. Mantén presionado el link para copiarlo.') } }
  const nuevo = async () => { try { setLink(await servidor.nuevaInvitacion(a.id)); linkNuevoSinCorreo(a.id); setErr('') } catch (e) { setErr(e instanceof Error ? e.message : 'No pudimos crear el link.') } }
  // paso21: si el correo de invitación salió, se dice a dónde; si no, solo el link con «Copiar link» y WhatsApp.
  const [enviado, setEnviado] = useState(() => correoInvitacionEnviado(a.id))
  useEffect(() => { const f = () => setEnviado(correoInvitacionEnviado(a.id)); addEventListener(EVENTO_CORREO_INVITACION, f); return () => removeEventListener(EVENTO_CORREO_INVITACION, f) }, [a.id])
  return <section className="glass tarjeta pila invitacion" aria-labelledby="inv-t">
    <h2 id="inv-t">Invita al inquilino</h2>
    <p className="nota">{enviado && <>{textoEnlaceEnviado(enviado)} </>}{TEXTO_INVITACION_VENCE}</p>
    {link ? <><label className="campo"><input readOnly value={link} aria-label="Link de invitación" onFocus={e => e.target.select()} /></label>
      <button type="button" className="boton boton--primario boton--ancho" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
      <a className="boton boton--secundario boton--ancho" href={enlaceWhatsApp(link)} target="_blank" rel="noopener noreferrer">{BOTON_WHATSAPP}</a></>
      : <p className="nota">Este aparato no tiene el link guardado.</p>}
    <button type="button" className="enlace" onClick={nuevo}>Crear un link nuevo (el anterior deja de servir)</button>
    {err && <p className="error" role="alert">{err}</p>}
  </section>
}

/** Solo con Trustless Work real (testnet): aprobación del dueño en la cadena y liberación al inquilino. */
const APROBADO = 'El dueño aprobó en la cadena devolver el depósito completo'
const enlaceTx = (tx: string) => 'https://stellar.expert/explorer/testnet/tx/' + tx
function EscrowReal({ a, rol }: P) {
  const { trustless: modoTrustless } = modoDe(a)
  const [ocupado, setOcupado] = useState(false); const [error, setError] = useState('')
  if (!modoTrustless || !a.escrowId) return null
  const aprobado = a.historial.some(e => e.texto === APROBADO)
  const correr = async (f: () => Promise<unknown>) => { setOcupado(true); setError(''); try { await f() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setOcupado(false) } }
  const err = error && <p className="error" role="alert">{error}</p>
  if (a.estado === 'ventana_reclamo') return rol === 'dueno' && !aprobado ? <div className="pila">
    {/* LEGAL: revisado (24/10) · ronda 8 (modo de dos personas, sin uso hoy: la billetera firma la aprobación, trustless.ts:28-30; la liberación la firma el servidor). BLOQUEO: antes de activarlo, Legal reescribe Términos 5.3 */}<p className="nota">Si todo está bien, aprueba ahora la devolución. Tu billetera te pedirá confirmar esta aprobación. La liberación del depósito la firma la cuenta de Lockumi.</p>
    <button type="button" className="boton boton--ancho" disabled={ocupado} onClick={() => void correr(() => acciones.aprobarDevolucion!(a))}>{ocupado ? 'Firmando…' : 'Todo está bien: aprobar la devolución'}</button>{err}</div>
    : aprobado ? <p className="nota">El dueño ya aprobó la devolución. Al terminar el plazo se libera el depósito.</p> : null
  // PR #22 (C): «devuelto» = el dueño aprobó y el servidor liberó al instante; si la red falló, aquí se reintenta.
  if (a.estado === 'cerrado' && (a.resultado?.via === 'automatico' || (esDosPersonas(a) && a.resultado?.via === 'devuelto'))) return a.liquidacionTx
    ? <p className="nota">Transferencia en Stellar testnet: <a href={enlaceTx(a.liquidacionTx)} target="_blank" rel="noreferrer">ver la transacción</a></p>
    : <div className="pila"><button type="button" className="boton boton--ancho" disabled={ocupado} onClick={() => void correr(() => acciones.cerrarSinReclamo(a))}>{ocupado ? 'Liberando…' : 'Liberar el depósito al inquilino'}</button>{err}</div>
  return null
}

export function Cerrado({ a, rol }: P) {
  const { escrowReal } = modoDe(a)
  const r = a.resultado!
  // Paso 7 (interruptor encendido, dos personas): devolución automática del 100 % al inquilino (Términos 1.7-demo 5.3 d).
  const auto2 = esDosPersonas(a) && r.via === 'automatico'
  // PR #22 (C): «Todo bien, devolver» entrega todo al inquilino al aprobar (menos el 0,3 % de la red de prueba).
  const dev2 = esDosPersonas(a) && r.via === 'devuelto'
  // PR #22 (d): en C la mediación solo se cierra con las dos aceptaciones.
  const dosAceptan = esDosPersonas(a) && r.via === 'mediacion' && r.cierre === 'dos_aceptan'
  const via = escrowReal && r.via === 'automatico' ? `No hubo reclamos en ${textoPlazo(a)}. El dueño de prueba aprobó y Lockumi devolvió el depósito en la red de prueba.` : { automatico: `No hubo reclamos en ${textoPlazo(a)}.`, acuerdo: 'Se pusieron de acuerdo en la app.', mediacion: esDosPersonas(a) ? 'Lo registró la persona mediadora con el reparto que aceptaron las dos partes.' : 'Lo decidió una persona mediadora.',
    // Solo con la prueba completa (interruptor apagado en producción: ningún alquiler llega a estas vías).
    propuesta: 'Se aplicó la propuesta automática.',   // LEGAL: revisado (24/10) · B.10 (título)
    simulacion: 'El reparto se eligió con «Resolver el reclamo (simulación)».',   // LEGAL: revisado (25/10, lista de Legal) · B.14
    devuelto: escrowReal ? 'El dueño de prueba tocó «Todo bien, devolver». Lockumi devolvió todo el depósito en la red de prueba.' : 'El dueño tocó «Todo bien, devolver».' }[r.via]   // LEGAL: revisado (25/10, lista de Legal)
  return <section className="pila cerrado"><LogoAnimado className="logo-pieza logo-pieza--esquina" />
    <span className="chip chip--exito"><Icono id="i-check" /> Terminado</span>
    {auto2 ? <><h2>Depósito devuelto</h2><span className="pill-auto">Devolución automática</span><p>{TEXTO_CERRADO_AUTO}</p></> : <><h2>Depósito devuelto</h2><p>{dosAceptan ? TEXTO_ACEPTARON_DOS : via}</p></>}
    {dosAceptan ? <ul className="lista"><li><span>Inquilino</span><strong>{llegaPrueba(repartoCentimos(r.dueno, r.inquilino).llegaInquilino)}</strong></li><li><span>Dueño</span><strong>{llegaPrueba(repartoCentimos(r.dueno, r.inquilino).llegaDueno)}</strong></li></ul>
      : auto2 || dev2 ? <ul className="lista"><li><span>Inquilino</span><strong>{llegaPrueba(repartoCentimos(0, r.inquilino).llegaInquilino)}</strong></li><li><span>Dueño</span><strong>{montoPrueba(r.dueno)}</strong></li></ul>
      : esDosPersonas(a) ? <ul className="lista"><li><span>Inquilino</span><strong>{llegaPrueba(repartoCentimos(r.dueno, r.inquilino).llegaInquilino)}</strong></li><li><span>Dueño</span><strong>{llegaPrueba(repartoCentimos(r.dueno, r.inquilino).llegaDueno)}</strong></li></ul>
      : <ul className="lista"><li><span>Inquilino</span><strong>{usdExacto(r.inquilino)}</strong></li><li><span>Dueño</span><strong>{usdExacto(r.dueno)}</strong></li></ul>}{/* una persona: r ya es lo que llegó (escrow.ts) */}
    <p className="nota">{fechaHora(r.fecha)}</p>
    {pruebaCompleta() && r.via === 'simulacion' && <ResueltoSimulacion a={a} />}
    {pruebaCompleta() && <GuardarDatosMediacion a={a} rol={rol} />}{/* paso16-unido: pedir guardar los datos (si no, se borran a los 30 días) */}
    {pruebaCompleta() && r.via === 'propuesta' && rol === 'inquilino' && <SeAplico a={a} />}
    {pruebaCompleta() && !!a.reclamo && <Expediente a={a} />}{/* paso 14 · B.11 */}{/* solo con la prueba completa (interruptor encendido) */}
    {(auto2 || dev2) && <p className="nota">{notaComisionAuto(r.inquilino)}</p>}{/* LEGAL: revisado (25/10, lista de Legal) */}
    {dosAceptan && <p className="nota">{notaComisionReparto(r.inquilino, r.dueno)}</p>}
    {dosAceptan && esHash(a.liquidacionTx) && <p className="nota">Reparto en la red de prueba: <VerTx h={a.liquidacionTx} /></p>}
    {escrowReal && !auto2 && <p className="nota">Montos que llegaron, ya con el {COMISION_TEXTO} de comisión de la red de prueba (Trustless Work).{r.via === 'mediacion' && <> La persona mediadora es simulada <Simulado />, pero el reparto se hizo en la red de prueba.</>}</p>}
    {escrowReal && [a.red?.txs.liberacion, a.red?.txs.resolucion].filter(esHash).map(h => <p key={h} className="nota">{h === a.red?.txs.liberacion ? 'Devolución' : 'Reparto'} en la red de prueba: <VerTx h={h} /></p>)}
    <EscrowReal a={a} rol={rol} />
  </section>
}

/** `ejemplo`: alquiler de ejemplo del recorrido guiado (solo lectura: sin red, sin avisos, sin el dueño de prueba automático). */
export function Detalle({ id, u, ejemplo }: { id: string; u: Usuario; ejemplo?: Alquiler }) {
  useAlquileres(); const a = ejemplo ?? obtener(id); const escritorio = useEscritorio()
  const { servidor: modoServidor, solo: modoSolo, prueba: modoPrueba, video: modoVideo, escrowReal } = modoDe(a) // cada alquiler con su modo: el de dos personas usa el servidor
  const real: Rol = a ? rolDe(a, u.email) : 'dueno'
  const rol: Rol = a ? vistaDe(a, u.email) : 'dueno'
  useEffect(() => { window.scrollTo(0, 0) }, [a?.estado, rol])
  // Red de prueba: el dueño de prueba firma/confirma solo apenas firmaste tú (también al abrir un alquiler que quedó esperando).
  const pendienteDueno = !ejemplo && !!a && modoPrueba && !modoSolo && (
    (a.estado === 'firmas' && !!a.contrato.firmas.inquilino && !a.contrato.firmas.dueno) ||
    (a.estado === 'fotos_entrada' && !!a.entrada.firmas.inquilino && !a.entrada.firmas.dueno) ||
    (a.estado === 'salida' && !!a.salida?.firmas.inquilino && !a.salida.firmas.dueno))
  useEffect(() => {
    if (!pendienteDueno) return
    const t = setTimeout(() => { void acciones.duenoPruebaAuto?.(obtener(id)!).catch(() => {}) }, 900)
    return () => clearTimeout(t)
  }, [pendienteDueno, id, a?.estado])
  // Aviso emergente después de cada paso (también cuando el dueño de prueba firma o confirma solo).
  const antes = useRef<Instantanea | null>(null)
  useEffect(() => {
    const x = antes.current; antes.current = a ? instantanea(a) : null
    if (x && a && !ejemplo) avisar(alertaPorCambio(x, a, rol, { prueba: modoPrueba, video: modoVideo, red: escrowReal }))
  })
  if (!a) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta">No encontramos ese alquiler. <a href="#/">Volver a tus alquileres</a></div></main>
  if (modoSolo && !ejemplo) return <DetalleSolo a={a} />
  const p = { a, rol }; const t = turno(a, rol); const etapa = etapaDe(a)
  const panel = {
    firmas: <Contrato {...p} />, pendiente_pago: <Pago {...p} />, fotos_entrada: <Fotos key={'e' + rol} {...p} cual="entrada" />,
    en_curso: reglas17(a) ? <><EnCurso {...p} /><AvisoSalida {...p} /></> : <EnCurso {...p} />, salida: <Fotos key={'s' + rol} {...p} cual="salida" />, // Prueba completa: «Recibí la casa», inicio a los 2 días, plazo con domingos y feriados, avisos 1/4/6 y simulador de días.
    ventana_reclamo: reglas17(a) ? <PlazoDueno a={a} rol={rol} reclamo={cerrar => modoServidor ? <FormReclamo a={a} onCancelar={cerrar} /> : <FormRubros a={a} onCancelar={cerrar} />}>{!esDosPersonas(a) && <EscrowReal a={a} rol={rol} />}</PlazoDueno> : <Ventana {...p} />,
    reclamo: reglas17(a) && !modoServidor ? <ReclamoPC {...p} /> : <Reclamo {...p} />, mediacion: reglas17(a) && !modoServidor ? <MediacionPC {...p} /> : <Mediacion {...p} />, cerrado: <Cerrado {...p} />,
  }[a.estado]
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    {ejemplo && <p className="ejemplo-cinta">Alquiler de ejemplo · solo para ver</p>}
    <h1 className="h-lugar">{a.direccion}</h1>
    {!modoServidor && !ejemplo && <div className="vista-demo" role="group" aria-label="Demo: cambiar de persona">
      <span>Estás viendo como <strong>{modoVideo && rol === 'dueno' ? 'dueño de prueba' : NOMBRE[rol]}</strong></span>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => fijarVista(id, otro(rol))}>{modoVideo ? (rol === 'inquilino' ? 'Ver la pantalla del dueño de prueba' : 'Volver a mi pantalla (inquilino)') : `Ver como ${NOMBRE[otro(rol)]}`}</button>
      <span className="demo">{modoSolo ? 'Una sola persona · red de prueba' : 'Demo en un solo aparato'}</span>
      {modoSolo && <Cuentas a={a} />}</div>}
    {modoServidor && rol === 'dueno' && a.inquilinoUnido === false && <Invitacion a={a} />}
    <div className="paso-cab"><p className="paso-cab__n">{a.estado === 'cerrado' ? 'Terminado' : pasoTexto(a)}</p><p className="paso-cab__t">{ETAPAS[etapa]}</p>
      <div className="barra-paso" aria-hidden="true"><span style={{ width: `${((etapa + (a.estado === 'cerrado' ? 1 : 0.5)) / ETAPAS.length) * 100}%` }} /></div></div>
    {a.estado !== 'firmas' && !escritorio && <div className="cc-arriba" inert={!!ejemplo}><ContratoCompacto a={a} como="barra" /></div>}
    <div className="detalle" inert={!!ejemplo}>
      <div className="detalle__principal pila">
        {modoVideo && <p className="ahora" role="status" aria-live="polite">{ahoraPrueba(a)}</p>}
        {modoVideo && a.historial.slice(-3).filter(h => h.texto.startsWith('El dueño de prueba') && h.texto.endsWith('automáticamente')).slice(-1).map(h => <p key={h.fecha + h.texto} className="nota auto-dueno">✓ {h.texto}.</p>)}
        <section className="turno" aria-label="Qué toca ahora" hidden={modoVideo}>
          <p><span className="turno__et">Te toca</span>{t.tu}</p>
          <p><span className="turno__et">Al {NOMBRE[otro(rol)]}</span>{t.otra}</p>
          <p><span className="turno__et">Qué sigue</span>{t.sigue}</p>
        </section>
        {escrowReal && <UltimoComprobante a={a} />}
        <div className="glass glass--fuerte tarjeta">{panel}</div>
        {puedeCambiarVersion(a) && !ejemplo && <CambioVersion a={a} rol={rol} />}{/* paso 16: solo con el interruptor encendido */}
      </div>
      <aside className="detalle__lado pila">
        {a.estado !== 'firmas' && escritorio && <ContratoCompacto a={a} como="tarjeta" />}
        {escrowReal && <Comprobantes a={a} />}
        <section className="glass tarjeta" aria-labelledby="t-estado" data-recorrido="pasos"><h3 id="t-estado">Los pasos</h3><LineaTiempo a={a} /></section>
        <details className="glass tarjeta detalles"><summary>Detalles</summary>
          <ul className="lista"><li><span>Dueño</span><span className="cortar">{a.duenoEmail}</span></li><li><span>Inquilino</span><span className="cortar">{a.inquilinoEmail}</span></li>
            <li><span>Depósito</span><span>{usd(a.monto)}</span></li><li><span>Fechas</span><span>{fecha(a.inicio)} → {fecha(a.fin)}</span></li></ul>
          {real !== rol && <p className="nota">Tu papel real en este alquiler: {NOMBRE_ROL[real].toLowerCase()}.</p>}
          <p className="mini" style={{ marginTop: 12 }}>Historial</p>
          <ol className="lista historial">{[...a.historial].reverse().map((h, i) => <li key={i}><span>{h.texto}</span><small className="nota">{fechaHora(h.fecha)}{esHash(h.tx) && <> · <a className="enlace" href={'https://stellar.expert/explorer/testnet/tx/' + h.tx} target="_blank" rel="noopener noreferrer">Ver comprobante en la red de prueba</a></>}</small></li>)}</ol>
        </details>
        {redDePrueba && !ejemplo && <MasOpciones a={a} u={u} />}{/* PROTOTIPO eliminar-alquiler (LEGAL: revisado 26/10) */}
      </aside>
    </div>
  </main>
}
