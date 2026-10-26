// Mediación de la prueba completa (solo con el interruptor encendido): Mediación Lockumi (demo) B.7 con cupo de 10 (B.12),
// «Resolver el reclamo (simulación)» con confirmación (B.14), la parte no reclamada (6.3 f) y «Otras vías (fuera de la app)».
// En la demo nadie del equipo atiende el caso: el reparto se elige con el botón de simulación (6.8 b).
import { useState } from 'react'
import './prueba.css'
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe } from '../store'
import { acciones } from '../acciones'
import { escrowReal } from '../servidor/config'
import { fechaHoraCR } from '../../api/_lib/plazos'
import { useProceso, NOTA_TIEMPO } from '../proceso'
import { Simulado } from '../ui'
import { esHash } from '../services/comprobantes'
import { VerTx } from '../screens/Real'
import { pedirMediacion, noUsarMediacion, plazoMediacion, repartoValido, textoConfirmar, textoResultado, textoNoReclamado } from './mediacion'
import { AvisosApp } from './AvisosApp'
import { registrarConsentimiento, CASILLA_MEDIACION } from './consentimientos'
import { deDosPersonas } from '../servidor/config'
import { versionAlquiler } from './version'
import { desde17 } from '../legal/versiones'
import { pasoPorMediacion, datosMediacion, guardarMediacion, textoGuardar, DIAS_BORRADO } from './borrado'

const u = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
const r2 = (n: number) => Math.round(n * 100) / 100

/** paso16-unido (Legal, 25/10, arreglo 2): B.7 en un solo aparato. Es solo la simulación: sin casilla ni «Pedir mediación», y
 *  ninguna persona del equipo interviene (6.8 b). La B.7 con la casilla de la sección C queda para los alquileres con otra persona. */
function B7UnAparato() {
  // LEGAL: revisado (25/10, 12:05 a. m.) · B.7 en un solo aparato, texto exacto de Legal
  return <section className="pila mediacion-b7" aria-labelledby="t-b7">
    <h3 id="t-b7">Mediación Lockumi (demo)</h3>
    <p><strong>Mediación Lockumi (demo):</strong> es una simulación. El reparto se elige con el botón «Resolver el reclamo (simulación)» y solo se hace si los dos lo aceptan. <strong>No tiene efecto legal, no es una mediación según la Ley 7727 y no tiene costo.</strong> Si no hay acuerdo, el monto sigue guardado y pueden ir a los tribunales.</p>
    <div className="cuadro-real"><strong>En el servicio con dinero real (no disponible en la demo):</strong> la mediación tendría un costo, que se informaría antes de firmar.</div>{/* LEGAL: revisado (25/10, lista de Legal) · se quitó el marcador [PENDIENTE] (Katherine, 24/10) */}
  </section>
}
function B7({ a, rol }: { a: Alquiler; rol: Rol }) {
  const [ok, setOk] = useState(false); const m = a.reclamo!.mediacion
  // Paso 16: el consentimiento queda registrado en el momento de usar la mediación (casilla de la B.7).
  const pedir = () => store.cambiar(a.id, x => { registrarConsentimiento(x, 'mediacion', rol, CASILLA_MEDIACION, ahoraDe(x)); pedirMediacion(x, store.todos(), ahoraDe(x)) })
  if (m?.estado === 'sin-cupo') return <section className="pila aviso-app" aria-labelledby="t-sin-cupo">
    {/* LEGAL: revisado (24/10, v3) · B.12 */}
    <h3 id="t-sin-cupo">Mediación Lockumi (demo) sin cupo</h3>
    <p>La Mediación Lockumi (demo) no tiene cupo en este momento: ya atiende el máximo de 10 casos. Tu caso queda como «sin acuerdo». Eso no perjudica a nadie: no se reparte nada sin que los dos lo acepten y nadie pierde sus derechos. El depósito de prueba sigue bloqueado en la cuenta segura. Pueden seguir conversando en la app, llegar a un acuerdo o usar el botón «Resolver el reclamo (simulación)». También siguen abiertas las vías de siempre: la conciliación o mediación en un centro autorizado, el arbitraje si los dos lo firman, o los tribunales. En la demo, nada de esto tiene efecto legal.</p>
  </section>
  if (m?.estado === 'pedida') { const fin = plazoMediacion(a)!
    // LEGAL: revisado (25/10, lista de Legal) · estado «pedida» (texto propio con la 6.8 b)
    return <section className="pila aviso-app" aria-labelledby="t-pedida"><h3 id="t-pedida">Mediación Lockumi (demo) pedida</h3>
      <p>Respondemos en un plazo de 3 días hábiles: hasta el {fechaHoraCR(fin)}, hora de Costa Rica.</p>
      {deDosPersonas(a) ? <p className="nota">Una persona del equipo de Lockumi les ayudará a buscar un acuerdo. No decide por ustedes: el reparto solo se aplica si los dos lo aceptan. Si no hay acuerdo, el depósito de prueba sigue retenido.</p>
        : <p className="nota">En esta prueba, nadie del equipo atiende el caso: el reparto se elige con «Resolver el reclamo (simulación)» (cláusula 6.8 b).</p>}</section> }
  if (m?.estado === 'no-usar') return <p className="nota">Prefirieron no usar la Mediación Lockumi (demo). {/* LEGAL: revisado (25/10, lista de Legal) */}</p>
  // LEGAL: revisado (24/10) · B.7
  return <section className="pila mediacion-b7" aria-labelledby="t-b7">
    <h3 id="t-b7">Mediación Lockumi (demo)</h3>
    <p>Una persona del equipo de Lockumi les ayuda a buscar un acuerdo. <strong>No decide por ustedes.</strong> No es mediadora certificada ni neutral: es parte de Lockumi. Lockumi no gana nada con el resultado del reclamo. En el servicio con dinero real, quien pagaría la suscripción sería el inquilino. Esto es una demo: <strong>no tiene efecto legal, no es una mediación según la Ley 7727 y no tiene costo.</strong> El reparto solo se hace si los dos lo aceptan. Si no hay acuerdo, el monto sigue guardado y pueden ir a los tribunales. Respondemos en un plazo de 3 días hábiles (máximo 10 casos en la demo).</p>
    <div className="cuadro-real"><strong>En el servicio con dinero real (no disponible en la demo):</strong> la mediación tendría un costo, que se informaría antes de firmar.</div>{/* LEGAL: revisado (25/10, lista de Legal) · se quitó el marcador [PENDIENTE] (Katherine, 24/10) */}
    <p className="nota">En la demo: simulación, no se cobra.</p>
    <label className="casilla"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> {CASILLA_MEDIACION}</label>
    <div className="fila-botones"><button type="button" className="boton boton--pc" disabled={!ok} onClick={pedir}>Pedir mediación</button>
      <button type="button" className="boton boton--secundario" onClick={() => store.cambiar(a.id, x => noUsarMediacion(x, ahoraDe(x)))}>Prefiero no usarla</button></div>
  </section>
}
function B14({ a }: { a: Alquiler }) {
  const rec = a.reclamo!; const p = useProceso()
  const [d, setD] = useState(String(r2(rec.monto / 2))); const [conf, setConf] = useState(false)
  const alD = Number(d.replace(',', '.')), ok = repartoValido(a, alD), alI = r2(a.monto - alD)
  // LEGAL: revisado (24/10, v4) · B.14 y 6.7
  return <section className="pila resolver-sim" aria-labelledby="t-b14">
    <div className="cab"><h3 id="t-b14">¿Cómo se reparte el depósito de prueba?</h3><Simulado texto="Simulación" /></div>
    <p>En la demo, la propuesta automática es simulada: no usa inteligencia artificial ni envía datos a ningún proveedor, y el reparto se elige con el botón «Resolver el reclamo (simulación)».</p>
    <p><strong>Lo que sigue:</strong> En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».</p>
    <label className="campo"><span>Para el dueño (máximo lo reclamado: {u(rec.monto)})</span><input inputMode="decimal" value={d} onChange={e => { setD(e.target.value); setConf(false) }} /></label>
    <p>Dueño: {ok ? u(r2(alD)) : '—'} · Inquilino: {ok ? u(alI) : '—'} · Total del depósito de prueba: {u(a.monto)}</p>
    {!ok && <p className="error" role="alert">El dueño no puede recibir más de lo que reclamó ni menos de 0. {/* LEGAL: revisado (25/10, lista de Legal) */}</p>}
    <p className="nota">{textoNoReclamado(a)}</p>
    {p.error}
    {!conf ? <button type="button" className="boton boton--pc boton--ancho boton--grande" disabled={!ok} onClick={() => setConf(true)}>Resolver el reclamo (simulación)</button>
      : <div className="pila confirmar" role="dialog" aria-labelledby="t-conf-b14"><h4 id="t-conf-b14">¿Resolver el reclamo así?</h4><p>{textoConfirmar(r2(alD), alI)}</p>
        <div className="fila-botones"><button type="button" className="boton boton--pc" disabled={p.ocupado} onClick={() => void p.correr(av => acciones.resolverSimulacion!(a, r2(alD), av))}>{p.texto('Sí, resolver (simulación)')}</button>
          <button type="button" className="boton boton--secundario" disabled={p.ocupado} onClick={() => setConf(false)}>Cancelar</button></div></div>}
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </section>
}
export function MediacionPC({ a, rol }: { a: Alquiler; rol: Rol }) {
  const rec = a.reclamo!
  return <section className="pila mediacion-pc">
    {/* LEGAL: revisado (25/10, lista de Legal) · título y resumen (texto propio) */}
    <div className="cab"><h2>Sin acuerdo: reclamo de {u(rec.monto)}</h2><Simulado texto="Mediación y reparto simulados" /></div>
    {rec.propuesta && <p className="nota">Propuesta automática (simulación): dueño {u(rec.propuesta.alDueno)} · inquilino {u(r2(a.monto - rec.propuesta.alDueno))}. No hubo acuerdo.</p>}
    {deDosPersonas(a) ? <B7 a={a} rol={rol} /> : <B7UnAparato />}
    {!(deDosPersonas(a) && a.reclamo?.mediacion?.estado === 'pedida') && <B14 a={a} />}
    {/* LEGAL: revisado (24/10) · B.7, tarjetas */}
    <section className="pila" aria-labelledby="t-vias"><h3 id="t-vias">Otras vías (fuera de la app)</h3>
      <ul className="lista-vias pila">
        <li><strong>Mediación o conciliación:</strong> en un centro autorizado por el Ministerio de Justicia. Ayuda, no decide.</li>
        <li><strong>Arbitraje:</strong> solo si los dos lo firman.</li>
        <li><strong>Tribunales:</strong> cualquiera de los dos puede ir.</li>
      </ul></section>
    <AvisosApp a={a} rol={rol} onAccion={() => document.getElementById("t-b14")?.scrollIntoView({ block: "center" })} />
  </section>
}
/** B.14: aviso del resultado en «Terminado» (a las dos partes). */
export function ResueltoSimulacion({ a }: { a: Alquiler }) {
  const r = a.resultado!, h = a.red?.txs.resolucion
  // LEGAL: revisado (24/10, v4) · B.14 (aviso del resultado)
  return <div className="pila aviso-app"><h3>Reclamo resuelto (simulación)</h3><p>{textoResultado(r.dueno, r.inquilino)}</p>
    {esHash(h) && <VerTx h={h} />}</div>
}

// LEGAL: revisado (25/10, 12:52 a. m.) · nota de un solo aparato, texto exacto de Legal (los datos están en el navegador)
const NOTA_DATOS_LOCAL = `Las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo) se borran de tu navegador ${DIAS_BORRADO} días después de cerrar el caso. Se conservan los montos y el resultado. Si los necesitas para un reclamo fuera de la app, toca «Guardar los datos de la mediación» para que no se borren, y descarga el expediente.`
// LEGAL: revisado (25/10, lista de Legal) · alquileres con otra persona (servidor, escenario C): los borra Lockumi, por eso «pide que los guardemos»
const NOTA_DATOS_SERVIDOR = `Las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo) se borran ${DIAS_BORRADO} días después de cerrar el caso. Se conservan los montos y el resultado. Si los necesitas para un reclamo fuera de la app, escríbenos a business.applockumi@gmail.com antes de que pasen esos ${DIAS_BORRADO} días para que los guardemos.`
/** Nota «Datos de la mediación»: en el navegador (un solo aparato) o en el servidor (con otra persona). */
export const notaDatosMediacion = (a: Alquiler): string => deDosPersonas(a) ? NOTA_DATOS_SERVIDOR : NOTA_DATOS_LOCAL

/** paso16-unido (arreglo 3): en «Terminado», una parte puede pedir que se guarden los datos de la mediación para un reclamo fuera
 *  de la app (si no, se borran 30 días después de cerrar el caso). Queda en el historial. */
export function GuardarDatosMediacion({ a, rol }: { a: Alquiler; rol: Rol }) {
  if (!desde17(versionAlquiler(a)) || deDosPersonas(a) || !pasoPorMediacion(a)) return null   // con otra persona: lo hace el servidor
  const d = datosMediacion(a)
  if (d.borrado) return null
  // LEGAL: revisado (25/10, lista de Legal) · texto propio basado en la Privacidad 1.7-demo (conservación); la línea del historial es de Legal
  if (d.guardar) return <p className="nota" role="status">{textoGuardar(d.guardar.por)}</p>
  return <section className="pila guardar-mediacion" aria-labelledby="t-guardar-med">
    <h3 id="t-guardar-med">Datos de la mediación</h3>
    <p className="nota">{notaDatosMediacion(a)}</p>
    <button type="button" className="boton boton--secundario boton--ancho" onClick={() => store.cambiar(a.id, x => guardarMediacion(x, rol, ahoraDe(x)))}>Guardar los datos de la mediación</button>
  </section>
}
