// Pantalla del plazo del dueño de la prueba completa (B.4, B.2b, B.9 y el simulador de días). Reemplaza a «Ventana» solo con el
// interruptor encendido. Los mensajes de acción («Devolviendo el depósito…», el avance del botón y el error de red) son los mismos.
import { useEffect, useState, type ReactNode } from 'react'
import './prueba.css'
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe, DIA } from '../store'
import { acciones } from '../acciones'
import { modoPrueba, escrowReal } from '../servidor/config'
import { adelantoPermitido } from '../../api/_lib/red'
import { fechaHoraCR } from '../../api/_lib/plazos'
import { useProceso, NOTA_TIEMPO } from '../proceso'
import { textoContador, textoRecibir, CONFIRMAR_DEVOLVER, botonRecibir, botonDevolver, recibirCasa, inicioAuto, finVentana, vencido, simularDias } from './dueno'
import { AvisosApp } from './AvisosApp'
import { AvisosCorreo } from './AvisosCorreo'

const cr = (t: number) => `${fechaHoraCR(t)}, hora de Costa Rica`

export function PlazoDueno({ a, rol, reclamo, children }: { a: Alquiler; rol: Rol; reclamo: (cerrar: () => void) => ReactNode; children?: ReactNode }) {
  const [, tick] = useState(0); const [confirmar, setConfirmar] = useState(false); const [form, setForm] = useState(false); const p = useProceso()
  useEffect(() => { const t = setInterval(() => tick(k => k + 1), 30_000); return () => clearInterval(t) }, [])
  const ahora = ahoraDe(a), simulado = modoPrueba, fin = finVentana(a), termino = vencido(a, ahora)
  const devolver = () => p.correr(av => acciones.cerrarSinReclamo(a, av))
  // Al vencer el plazo sin reclamo, se devuelve todo (con escrow real: lo firma la cuenta de Lockumi en la red de prueba).
  useEffect(() => { if (termino && !a.reclamo && a.estado === 'ventana_reclamo') void devolver() }, [termino, a.id, a.reclamo]) // eslint-disable-line
  const avanzar = (n: number, texto: string) => { if (adelantoPermitido()) store.cambiar(a.id, x => simularDias(x, n), texto) }
  const irA = () => document.getElementById('plazo-acciones')?.scrollIntoView({ block: 'center' })

  const confirmacion = confirmar && <div className="pila confirmar" role="group" aria-labelledby="t-confirmar">
    {/* LEGAL: revisado (24/10) · B.4, confirmación */}
    <p id="t-confirmar"><strong>Se devolverá todo el depósito al inquilino ahora.</strong> {CONFIRMAR_DEVOLVER.replace('Se devolverá todo el depósito al inquilino ahora. ', '').split('no podrás reclamar en la app').reduce<ReactNode[]>((r, t, i) => i ? [...r, <strong key={i}>no podrás reclamar en la app</strong>, t] : [t], [])}</p>
    {p.error}
    <button type="button" className="boton boton--pc boton--ancho" disabled={p.ocupado} onClick={() => void p.correr(av => acciones.devolverTodo!(a, av))}>{p.texto('Sí, devolver todo')}</button>
    <button type="button" className="boton boton--secundario boton--ancho" disabled={p.ocupado} onClick={() => setConfirmar(false)}>Cancelar</button>
    {escrowReal && p.ocupado && NOTA_TIEMPO}
  </div>

  let cuerpo: ReactNode
  if (termino && !a.reclamo) cuerpo = p.ocupado || !p.err ? <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>{p.avance || 'Devolviendo el depósito…'}</p></div>
    : <>{p.error}<button type="button" className="boton boton--pc boton--ancho" onClick={() => void devolver()}>Volver a intentar la devolución</button></>
  else if (rol === 'dueno') {
    cuerpo = form ? reclamo(() => setForm(false)) : confirmacion || <div className="pila" id="plazo-acciones">
      {!a.ventanaInicio ? <><h2>¿Recibiste la casa?</h2><p>{textoRecibir(a).replace('¿Recibiste la casa? ', '')}</p></>
        : <><h2>Tu plazo para revisar y reclamar</h2><p className="cuenta-texto" role="timer">{textoContador('dueno', a, ahora)}</p>
          <p className="nota">Solo se puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si el plazo vence sin reclamo, se devuelve todo el depósito al inquilino.</p>{/* LEGAL: revisado (24/10) · frases de la B.2b */}</>}
      {simulado && <p className="nota">El dueño es una cuenta de prueba de Lockumi: estos botones simulan lo que haría.</p>}{/* LEGAL: revisar */}
      {!a.ventanaInicio && <button type="button" className="boton boton--pc boton--ancho boton--grande" onClick={() => store.cambiar(a.id, x => recibirCasa(x, ahoraDe(x)))}>{botonRecibir(simulado)}</button>}
      {a.ventanaInicio && <button type="button" className="boton boton--pc boton--ancho boton--grande" onClick={() => setForm(true)}>{simulado ? 'Simular: el dueño hace un reclamo' : 'Revisar y reclamar'}</button>}{/* LEGAL: revisar (simulado) · revisado (24/10) · B.2b «Revisar y reclamar» */}
      <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setConfirmar(true)}>{botonDevolver(simulado)}</button>
    </div>
  } else {
    // LEGAL: revisar · textos del inquilino durante el plazo del dueño
    cuerpo = <div className="pila" id="plazo-acciones"><h2>El dueño revisa la casa</h2>
      {!a.ventanaInicio ? <p>Entregaste la casa el {cr(+new Date(a.entrega!))}. El dueño tiene 7 días naturales para revisar y reclamar: empiezan cuando toque «Recibí la casa» o, si no lo toca, el {cr(inicioAuto(a)!)}.</p>
        : <p className="cuenta-texto" role="timer">El dueño puede reclamar hasta el {cr(fin!)}. Si no reclama, se te devuelve todo el depósito{modoPrueba ? ' de prueba' : ''}.</p>}
      {simulado && <p className="nota">Para probar lo que hace el dueño, toca «Ver la pantalla del dueño de prueba».</p>}
    </div>
  }
  return <section className="pila plazo-dueno">
    {cuerpo}
    <AvisosApp a={a} rol={rol} onAccion={acc => acc === 'confirmar-devolver' ? (setForm(false), setConfirmar(true)) : irA()} />
    <AvisosCorreo a={a} rol={rol} />{/* paso 11 */}
    {adelantoPermitido() && !termino && <section className="pila simulador" aria-labelledby="t-simulador">
      {/* LEGAL: revisar · simulador de días (aprobado: los avisos salen al adelantar) */}
      <h3 id="t-simulador">Simulador de días (solo red de prueba)</h3>
      <p className="nota">Reloj de la demo: {cr(ahora)}. Adelántalo para ver los avisos de cada día; no cambia la hora real.</p>
      <div className="fila-botones">
        <button type="button" className="boton boton--secundario" onClick={() => avanzar(1, 'Solo red de prueba: el reloj de la demo avanzó 1 día')}>Avanzar 1 día</button>
        {fin !== null && <button type="button" className="boton boton--secundario" onClick={() => { const n = Math.max(1, Math.ceil((fin - ahora) / DIA)); avanzar(n, `Solo red de prueba: el reloj de la demo avanzó ${n} días, hasta el final del plazo`) }}>Ir al final del plazo</button>}
      </div>
    </section>}
    {children}
  </section>
}
