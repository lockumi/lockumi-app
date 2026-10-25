// Pantallas del reclamo de la prueba completa (solo con el interruptor encendido): reclamo por rubros (6.4), respuesta del inquilino
// por rubro (6.4.4), propuesta automática SIMULADA (B.6), contador del inquilino (B.9), avisos 1/4/6 (B.2), regla del silencio
// (6.5 c) y «Se aplicó la propuesta automática» (B.10). Los mensajes de acción (avance, error de red) son los de useProceso.
import { useEffect, useState, type ReactNode } from 'react'
import './prueba.css'
import type { Alquiler, Rol, Rubro, RespuestaRubro, Foto } from '../types'
import { store, ahoraDe, DIA } from '../store'
import { acciones } from '../acciones'
import { modoPrueba, escrowReal } from '../servidor/config'
import { adelantoPermitido } from '../../api/_lib/red'
import { fechaHoraCR } from '../../api/_lib/plazos'
import { PRECIOS } from '../../api/_lib/precios'
import { useProceso, NOTA_TIEMPO } from '../proceso'
import { TomarFoto } from '../Camara'
import { FotoLista } from '../screens/Acta'
import { fotoEjemplo } from '../demoFotos'
import { Simulado } from '../ui'
import { calcular, totalReclamado, pruebasCompletas, MOTIVOS } from './propuesta'
import { abrirReclamo, silencio, nombreRubro, textoSeAplico } from './reclamos'
import { textoContador, simularDias } from './dueno'
import { plazoInquilino } from './avisos'
import { AvisosApp } from './AvisosApp'

const u = (n: number) => `${n.toLocaleString('es-CR', { maximumFractionDigits: 2 })} USDC de prueba`
const cr = (t: number) => `${fechaHoraCR(t)}, hora de Costa Rica`
const num = (s: string) => Number(s.replace(',', '.'))

// ── Dueño: reclamo por rubros ─────────────────────────────────────────────────────────────────
interface Borrador { ref: number; cantidad: string; motivo: Rubro['motivo']; descripcion: string; cuarto: number; fotos: Foto[]; factura: string }
const vacio = (): Borrador => ({ ref: 0, cantidad: '1', motivo: 'dano', descripcion: '', cuarto: 0, fotos: [], factura: '' })
const aRubro = (b: Borrador, i: number): Rubro => ({ id: 'r' + (i + 1), ref: b.ref, cantidad: num(b.cantidad) || 0, motivo: b.motivo, descripcion: b.descripcion, cuarto: b.cuarto, fotos: b.fotos, ...(num(b.factura) > 0 ? { factura: { monto: num(b.factura) } } : {}) })

export function FormRubros({ a, onCancelar }: { a: Alquiler; onCancelar: () => void }) {
  const p = useProceso(); const [lista, setLista] = useState<Borrador[]>([vacio()]); const [env, setEnv] = useState(false)
  const rubros = lista.map(aRubro), total = totalReclamado(a, rubros)
  const cambiar = (i: number, c: Partial<Borrador>) => setLista(l => l.map((b, k) => k === i ? { ...b, ...c } : b))
  const errores = rubros.map(r => [r.cantidad > 0 ? '' : 'Escribe una cantidad mayor que cero.', r.descripcion.trim().length < 10 ? 'Describe el daño en al menos 10 letras.' : '', r.fotos.length ? '' : 'Agrega al menos una foto de salida.'].filter(Boolean))
  const enviar = () => { setEnv(true); if (errores.some(e => e.length) || !(total > 0)) return; void p.correr(av => acciones.reclamarRubros!(a, rubros, av)) }
  // LEGAL: revisar · formulario del reclamo por rubros (textos de la 6.2, 6.4 y 6.4.1)
  return <div className="pila reclamo-rubros">
    <h2>Reclamo por rubros</h2>
    <p className="nota">Cada monto debe indicar su motivo (6.2) e ir con fotos y una factura o el precio de referencia (6.4). El desgaste normal nunca se cobra (Anexo 6-A).</p>
    {lista.map((b, i) => { const r = rubros[i], c = calcular(a, r), falta = pruebasCompletas(a, r)
      return <fieldset key={i} className="rubro pila"><legend>Rubro {i + 1}</legend>
        <label className="campo"><span>Qué se repara o repone</span><select value={b.ref} onChange={e => cambiar(i, { ref: Number(e.target.value) })}>
          {PRECIOS.map((x, k) => <option key={k} value={k}>{x.rubro} ({x.unidad})</option>)}<option value={-1}>Otro rubro (sin precio de referencia)</option></select></label>
        <label className="campo"><span>Cantidad</span><input inputMode="decimal" value={b.cantidad} onChange={e => cambiar(i, { cantidad: e.target.value })} /></label>
        <label className="campo"><span>Motivo (lista cerrada, 6.2)</span><select value={b.motivo} onChange={e => cambiar(i, { motivo: e.target.value as Rubro['motivo'] })}>
          {Object.entries(MOTIVOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <label className="campo"><span>Espacio del acta de entrada (foto de antes)</span><select value={b.cuarto} onChange={e => cambiar(i, { cuarto: Number(e.target.value) })}>
          {a.entrada.cuartos.map((q, k) => <option key={k} value={k}>{q.nombre}</option>)}</select></label>
        <label className="campo"><span>Descripción del daño</span><textarea rows={2} value={b.descripcion} onChange={e => cambiar(i, { descripcion: e.target.value })} placeholder="Ej.: mancha grande en la pared de la sala" /></label>
        <label className="campo"><span>Factura (USDC de prueba, opcional si hay precio de referencia)</span><input inputMode="decimal" value={b.factura} onChange={e => cambiar(i, { factura: e.target.value })} /></label>
        <FotoLista fotos={b.fotos} vacio="Sin fotos de salida de este rubro todavía." />
        <TomarFoto por="dueno" etiqueta="Tomar foto del daño" principal={false} onFoto={f => cambiar(i, { fotos: [...b.fotos, f] })} />
        <button type="button" className="enlace" onClick={() => cambiar(i, { fotos: [...b.fotos, { src: fotoEjemplo(a.entrada.cuartos[b.cuarto]?.nombre ?? 'Sala', 'salida', 0), por: 'dueno', fecha: new Date(ahoraDe(a)).toISOString(), tomadaEn: ahoraDe(a), origen: 'ejemplo' }] })}>Demo: usar una foto de ejemplo</button>
        <p className="nota">Cálculo (simulación): {c.razones.join(' ')} Monto: <strong>{u(c.reclamado)}</strong>.</p>
        <p className="nota">{falta.length ? `Pruebas incompletas: falta ${falta.join(', ')}.` : 'Pruebas completas (6.4.1).'}</p>
        {env && errores[i].map(t => <p key={t} className="error" role="alert">{t}</p>)}
        {lista.length > 1 && <button type="button" className="enlace" onClick={() => setLista(l => l.filter((_, k) => k !== i))}>Quitar este rubro</button>}
      </fieldset> })}
    <button type="button" className="boton boton--secundario" onClick={() => setLista(l => [...l, vacio()])}>Agregar otro rubro</button>
    <p><strong>Total reclamado: {u(total)}</strong> de un depósito de {u(a.monto)} (nunca más que el depósito, 6.6).</p>
    {p.error}
    <div className="pie-paso"><button type="button" className="boton boton--secundario" disabled={p.ocupado} onClick={onCancelar}>Cancelar</button>
      <button type="button" className="boton boton--pc boton--grande pie-paso__principal" disabled={p.ocupado} onClick={enviar}>{p.texto('Enviar reclamo')}</button></div>
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </div>
}

// ── Reclamo abierto: respuesta del inquilino, propuesta automática y silencio ──────────────────────────
function Rubros({ a, resp }: { a: Alquiler; resp?: Record<string, RespuestaRubro> }) {
  const rec = a.reclamo!
  return <ul className="pila rubros-lista">{(rec.rubros ?? []).map(r => { const c = calcular(a, r, resp?.[r.id])
    return <li key={r.id} className="rubro pila"><strong>{nombreRubro(r)} · {u(resp ? c.propuesto : c.reclamado)}</strong>
      <span className="nota">{MOTIVOS[r.motivo]} · {r.descripcion}</span>
      <div className="antes-despues"><div><span className="mini">Antes (entrada)</span><FotoLista fotos={a.entrada.cuartos[r.cuarto]?.fotos ?? []} /></div><div><span className="mini">Después (salida)</span><FotoLista fotos={r.fotos} /></div></div>
      <p className="nota">{c.razones.join(' ')}</p>
    </li> })}</ul>
}
function Propuesta({ a, rol }: { a: Alquiler; rol: Rol }) {
  const pr = a.reclamo!.propuesta!; const p = useProceso(); const yo = pr[rol]
  const votar = (si: boolean) => p.correr(av => acciones.votarPropuesta!(a, rol, si, av))
  // LEGAL: revisado (24/10) · B.6
  return <section className="pila propuesta-auto" aria-labelledby="t-propuesta">
    <div className="cab"><h2 id="t-propuesta">Propuesta automática (no es una decisión)</h2><Simulado texto="Demo: simulada, sin inteligencia artificial" /></div>
    <p>Esta propuesta compara las fotos, la tabla de desgaste y los precios (y las cotizaciones, si hay más de una). Para cada rubro verás: el motivo, las fotos de antes y después, el precio usado y la depreciación. Solo se aplica si los dos la aceptan{a.regla?.acepta ? ', salvo la Regla de propuesta automática si la aceptaste' : ''}. Si no hay acuerdo, el caso pasa a la Mediación Lockumi (demo).</p>
    <Rubros a={a} resp={a.reclamo!.respuestas} />
    <p><strong>Propuesta: dueño {u(pr.alDueno)} · inquilino {u(a.monto - pr.alDueno)}</strong></p>
    <div className="cuadro-real"><strong>En el servicio con dinero real (no disponible en la demo):</strong> la prepararía un sistema de inteligencia artificial de Google Cloud Vertex AI (Gemini), región [REGIÓN: la elige Katherine], que no puede usar tus fotos para entrenar modelos. No le enviaríamos nombres, correos ni direcciones. Podrías pedir que la revise una persona.</div>
    <p className="nota">Dueño: {pr.dueno === 'si' ? 'aceptó' : pr.dueno === 'no' ? 'no aceptó' : 'todavía no responde'} · Inquilino: {pr.inquilino === 'si' ? 'aceptó' : pr.inquilino === 'no' ? 'no aceptó' : 'todavía no responde'}</p>
    {p.error}
    {yo ? <p className="nota">Ya respondiste. {modoPrueba && rol === 'inquilino' ? 'Para responder como el dueño, toca «Ver la pantalla del dueño de prueba».' : ''}</p> : <div className="fila-botones">
      <button type="button" className="boton boton--pc" disabled={p.ocupado} onClick={() => void votar(true)}>{p.texto('Acepto esta propuesta')}</button>
      <button type="button" className="boton boton--secundario" disabled={p.ocupado} onClick={() => void votar(false)}>No acepto</button></div>}
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </section>
}
function Respuesta({ a }: { a: Alquiler }) {
  const rubros = a.reclamo!.rubros ?? []; const p = useProceso()
  const [r, setR] = useState<Record<string, { acepta: boolean; tipo: 'factura' | 'cotizacion'; monto: string; comercio: string }>>(() => Object.fromEntries(rubros.map(b => [b.id, { acepta: true, tipo: 'cotizacion', monto: '', comercio: '' }])))
  const cambiar = (id: string, c: Partial<(typeof r)[string]>) => setR(v => ({ ...v, [id]: { ...v[id], ...c } }))
  const resp: Record<string, RespuestaRubro> = Object.fromEntries(rubros.map(b => { const x = r[b.id]; return [b.id, x.acepta ? { acepta: true } : { acepta: false, ...(num(x.monto) >= 0 && x.monto.trim() && x.comercio.trim() ? { soporte: { tipo: x.tipo, monto: num(x.monto), comercio: x.comercio.trim() } } : {}) }] }))
  // LEGAL: revisar · respuesta por rubro (6.4.4: factura o cotización de un comercio inscrito)
  return <section className="pila" aria-labelledby="t-responder"><h3 id="t-responder">Tu respuesta, rubro por rubro</h3>
    {rubros.map(b => { const x = r[b.id]
      return <fieldset key={b.id} className="rubro pila"><legend>{nombreRubro(b)} · {u(calcular(a, b).reclamado)}</legend>
        <label className="casilla"><input type="radio" name={'r-' + b.id} checked={x.acepta} onChange={() => cambiar(b.id, { acepta: true })} /> Acepto este rubro</label>
        <label className="casilla"><input type="radio" name={'r-' + b.id} checked={!x.acepta} onChange={() => cambiar(b.id, { acepta: false })} /> No lo acepto</label>
        {!x.acepta && <>
          <label className="campo"><span>Si tienes una factura o una cotización más baja (opcional)</span><select value={x.tipo} onChange={e => cambiar(b.id, { tipo: e.target.value as 'factura' | 'cotizacion' })}><option value="cotizacion">Cotización</option><option value="factura">Factura</option></select></label>
          <label className="campo"><span>Monto (USDC de prueba)</span><input inputMode="decimal" value={x.monto} onChange={e => cambiar(b.id, { monto: e.target.value })} /></label>
          <label className="campo"><span>Comercio inscrito (nombre o número de contribuyente)</span><input value={x.comercio} onChange={e => cambiar(b.id, { comercio: e.target.value })} /></label>
        </>}
      </fieldset> })}
    {p.error}
    <button type="button" className="boton boton--pc boton--ancho boton--grande" disabled={p.ocupado} onClick={() => void p.correr(av => acciones.responderRubros!(a, resp, av))}>{p.texto('Enviar mi respuesta')}</button>
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </section>
}
export function ReclamoPC({ a, rol }: { a: Alquiler; rol: Rol }) {
  const rec = a.reclamo!; const [, tick] = useState(0); const p = useProceso()
  useEffect(() => { const t = setInterval(() => tick(k => k + 1), 30_000); return () => clearInterval(t) }, [])
  // Abrir la pantalla del reclamo cuenta como apertura (B.2 v4), solo para el inquilino.
  useEffect(() => { if (rol === 'inquilino' && !rec.pantallaAbierta) store.cambiar(a.id, x => abrirReclamo(x, ahoraDe(x))) }, [rol, a.id, rec.pantallaAbierta])
  const ahora = ahoraDe(a), s = silencio(a, ahora), pl = plazoInquilino(a)
  useEffect(() => { if (s) void p.correr(av => acciones.aplicarSilencio!(a, av)) }, [!!s, a.id]) // eslint-disable-line
  const avanzar = (n: number, texto: string) => { if (adelantoPermitido()) store.cambiar(a.id, x => simularDias(x, n), texto) }
  const irA = () => document.getElementById('t-responder')?.scrollIntoView({ block: 'center' })
  let cuerpo: ReactNode
  if (s) cuerpo = p.ocupado || !p.err ? <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>{p.avance || 'Venció el plazo para responder. Aplicando la regla…'}</p></div>
    : <>{p.error}<button type="button" className="boton boton--pc boton--ancho" onClick={() => void p.correr(av => acciones.aplicarSilencio!(a, av))}>Volver a intentar</button></>
  else if (rec.propuesta) cuerpo = <Propuesta a={a} rol={rol} />
  else cuerpo = <>
    {pl && <p className="cuenta-texto" role="timer">{rol === 'inquilino' ? textoContador('inquilino', a, ahora) : `El inquilino puede responder hasta el ${cr(pl.fin)}.`}</p>}
    {/* LEGAL: revisado (24/10) · 6.5 c */}
    <p className="nota">El silencio no significa que el inquilino acepte el reclamo. {a.regla?.acepta ? 'Si no responde, se aplica la Regla de propuesta automática solo si abrió al menos un aviso del reclamo; si no, el caso pasa a la Mediación Lockumi (demo).' : 'Si no responde, el caso pasa a la Mediación Lockumi (demo).'}</p>
    <Rubros a={a} />
    {rol === 'inquilino' ? <Respuesta a={a} /> : <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>Esperando que el inquilino responda tu reclamo.</p></div>}
  </>
  return <section className="pila reclamo-pc">
    <div className="cab"><h2>Reclamo del dueño · {u(rec.monto)}</h2>{modoPrueba && <Simulado texto="Propuesta y mediación simuladas" />}</div>
    {cuerpo}
    <AvisosApp a={a} rol={rol} onAccion={irA} />
    {adelantoPermitido() && !s && !rec.propuesta && pl && <section className="pila simulador" aria-labelledby="t-simulador-r">
      {/* LEGAL: revisar · simulador de días */}
      <h3 id="t-simulador-r">Simulador de días (solo red de prueba)</h3>
      <p className="nota">Reloj de la demo: {cr(ahora)}. Adelántalo para ver los avisos de cada día y qué pasa si el inquilino no responde; no cambia la hora real.</p>
      <div className="fila-botones">
        <button type="button" className="boton boton--secundario" onClick={() => avanzar(1, 'Solo red de prueba: el reloj de la demo avanzó 1 día')}>Avanzar 1 día</button>
        <button type="button" className="boton boton--secundario" onClick={() => { const n = Math.max(1, Math.ceil((pl.fin - ahora) / DIA)); avanzar(n, `Solo red de prueba: el reloj de la demo avanzó ${n} días, hasta el final del plazo`) }}>Ir al final del plazo</button>
      </div>
    </section>}
  </section>
}
/** B.10: debajo del monto, en «Terminado», cuando se aplicó la propuesta automática. */
export function SeAplico({ a }: { a: Alquiler }) {
  const t = textoSeAplico(a, a.resultado!)
  // LEGAL: revisado (24/10, v4) · B.10
  return <div className="pila se-aplico"><h3>Se aplicó la propuesta automática</h3><Simulado texto="Ejemplo" />
    <p>{t[0]}</p><p>{t[1]} <a href="#/terminos">Ver las condiciones (cláusula 6.5.1)</a></p><p>{t[2]}</p>
    <p className="nota">En la demo, no tiene efecto legal.</p></div>
}
