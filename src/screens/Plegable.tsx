// paso21 (Katherine/Legal 25/10, 10:15 p. m.): plegable con el mismo aspecto que «Ver contrato completo» (ContratoDoc, .cp-abrir).
// Empieza CERRADO cada vez; un toque lo abre. Botón real con aria-expanded y aria-controls; lo de adentro queda `hidden` (no entra
// en el orden de Tab) y no cambia. Al imprimir se ve todo (@media print, como el contrato).
import { useId, useState, type ReactNode } from 'react'
import { Icono } from '../ui'

export function Plegable({ titulo, children, abierto: inicial = false, className = '' }: { titulo: string; children: ReactNode; abierto?: boolean; className?: string }) {
  const [abierto, setAbierto] = useState(inicial)
  const id = 'plegable-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return <div className={'plegable' + (className ? ' ' + className : '')}>
    <button type="button" className="cp-abrir" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(v => !v)}>
      <span className="cp-abrir__txt">{titulo}</span>
      <span className="cp-abrir__ico"><Icono id="i-chevron" /></span>
    </button>
    <div className="cp-completo" id={id} role="region" aria-label={titulo} hidden={!abierto}>{children}</div>
  </div>
}
