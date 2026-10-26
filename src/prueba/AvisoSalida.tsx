// Aviso de reparación 5 días antes de la salida (Términos 1.7-demo, 6.1.1; B.3), en la app, para el inquilino, con sus fotos de
// entrada para comparar. Solo con el interruptor encendido. El aviso lo entrega `sincronizar` (avisos.ts: «reparacion-5»).
import './prueba.css'
import { Fragment } from 'react'
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe } from '../store'
import { adelantoPermitido } from '../../api/_lib/red'
import { fechaHoraCR } from '../../api/_lib/plazos'
import { FotoLista } from '../screens/Acta'
import { diasHastaAvisoSalida } from './avisos'
import { abrirAviso, simularDias } from './dueno'
// Legal (PR #33): «ver las reglas» abre los Términos que guardó ESTE alquiler (su versión, en su ruta), no los vigentes.
import { rutaTerminos } from '../legal/documentos'
import { versionAlquiler } from './version'

const cr = (iso?: string) => iso ? `${fechaHoraCR(+new Date(iso))}, hora de Costa Rica` : '—'

export function AvisoSalida({ a, rol }: { a: Alquiler; rol: Rol }) {
  const v = a.avisos?.find(x => x.id === 'reparacion-5' && x.para === rol)
  const faltan = diasHastaAvisoSalida(a, ahoraDe(a))
  const abrir = () => store.cambiar(a.id, x => abrirAviso(x, 'reparacion-5', 'app', ahoraDe(x)))
  return <>
    {v && <section className="pila avisos-app" aria-labelledby="t-aviso-salida">
      {/* LEGAL: revisado (24/10) · B.3 */}
      <h3 id="t-aviso-salida">Aviso en la app: 5 días antes de la salida</h3>
      <details className="aviso-app" onToggle={e => { if ((e.target as HTMLDetailsElement).open) abrir() }}>
        <summary><strong>5 días antes de la salida</strong> · {v.asunto}{!v.abierto && <span className="chip chip--coral">Nuevo</span>}</summary>
        <p>{v.texto.split('ver las reglas').map((t, i) => i === 0 ? t : <Fragment key={i}><a href={'#' + rutaTerminos(versionAlquiler(a))}>ver las reglas</a>{t}</Fragment>)}</p>
        <h4>Tus fotos de entrada</h4>
        {a.entrada.cuartos.map((c, i) => <div key={i} className="pila"><strong>{c.nombre}</strong><FotoLista fotos={c.fotos} vacio="Sin fotos de entrada de este espacio." /></div>)}
        {/* LEGAL: revisado (25/10, lista de Legal) · registro visible en el detalle del caso */}
        <p className="nota">Entregado en la app: {cr(v.entregado)} · Abierto en la app: {cr(v.abierto)}</p>
      </details>
    </section>}
    {!v && rol === 'inquilino' && adelantoPermitido() && faltan > 0 && <section className="pila simulador" aria-labelledby="t-sim-salida">
      {/* LEGAL: revisado (25/10, lista de Legal) · simulador de días */}
      <h3 id="t-sim-salida">Simulador de días (solo red de prueba)</h3>
      <p className="nota">Reloj de la demo: {fechaHoraCR(ahoraDe(a))}, hora de Costa Rica. Faltan {faltan === 1 ? '1 día' : `${faltan} días`} para el aviso de reparación (5 días antes de la salida). No cambia la hora real.</p>
      <button type="button" className="boton boton--secundario" onClick={() => store.cambiar(a.id, x => simularDias(x, faltan), `Solo red de prueba: el reloj de la demo avanzó ${faltan} días, hasta el aviso de 5 días`)}>Ir al aviso de 5 días</button>
    </section>}
  </>
}
