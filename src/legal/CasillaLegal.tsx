import { forwardRef, type ReactNode } from 'react'

/** Casilla obligatoria con enlace al texto legal (se abre en otra pestaña para no perder lo que se está haciendo). */
export const CasillaLegal = forwardRef<HTMLInputElement, { id: string; marcada: boolean; onCambio: (v: boolean) => void; error?: string | null; nota?: ReactNode; children: ReactNode }>(
  function CasillaLegal({ id, marcada, onCambio, error, nota, children }, ref) {
    return <div className={'casilla-legal' + (error ? ' casilla-legal--error' : '')}>
      <label className="casilla-legal__fila">
        <input ref={ref} type="checkbox" id={id} name={id} required checked={marcada}
          aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined}
          onChange={e => onCambio(e.target.checked)} />
        <span>{children}</span>
      </label>
      {nota && <p className="nota casilla-legal__nota">{nota}</p>}
      {error && <p id={id + '-error'} className="error casilla-legal__error" role="alert">{error}</p>}
    </div>
  })
