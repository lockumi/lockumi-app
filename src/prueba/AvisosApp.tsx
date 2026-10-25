// Avisos en la app (B.2, B.2b, B.3): cada aviso guarda cuándo se entregó y cuándo se abrió (en la app y por el enlace del correo).
// Abrir el aviso (desplegarlo) cuenta como apertura. El botón «Todo bien, devolver» solo abre la confirmación.
import type { Alquiler, Rol } from '../types'
import { store, ahoraDe } from '../store'
import { fechaHoraCR } from '../../api/_lib/plazos'
import { botonesAviso, type Plantilla } from '../../api/_lib/avisos'
import { abrirAviso } from './dueno'

const cr = (iso?: string) => iso ? `${fechaHoraCR(+new Date(iso))}, hora de Costa Rica` : '—'
export function AvisosApp({ a, rol, onAccion }: { a: Alquiler; rol: Rol; onAccion: (accion: 'ver' | 'confirmar-devolver') => void }) {
  const mios = (a.avisos ?? []).filter(v => v.para === rol)
  if (!mios.length) return null
  const abrir = (id: string) => store.cambiar(a.id, x => abrirAviso(x, id, 'app', ahoraDe(x)))
  return <section className="pila avisos-app" aria-labelledby="t-avisos">
    {/* LEGAL: revisado (24/10) · encabezado de la B.2 */}
    <h3 id="t-avisos">Avisos en la app: días 1, 4 y 6</h3>
    {[...mios].reverse().map(v => <details key={v.id} className="aviso-app" onToggle={e => { if ((e.target as HTMLDetailsElement).open) abrir(v.id) }}>
      <summary><strong>{v.dia === 'reparacion' ? '5 días antes de la salida' : `Día ${v.dia}`}</strong> · {v.asunto}{!v.abierto && <span className="chip chip--coral">Nuevo</span>}</summary>
      <p>{v.texto}</p>
      <div className="fila-botones">{botonesAviso(v.id as Plantilla).map(b => <button key={b.texto} type="button" className={'boton boton--chico ' + (b.accion === 'ver' ? 'boton--pc' : 'boton--secundario')} onClick={() => { abrir(v.id); onAccion(b.accion) }}>{b.texto}</button>)}</div>
      {/* LEGAL: revisar · registro visible en el detalle del caso */}
      <p className="nota">Entregado en la app: {cr(v.entregado)} · Abierto en la app: {cr(v.abierto)} · Abierto por el enlace del correo: {cr(v.abiertoCorreo)}</p>
    </details>)}
  </section>
}
