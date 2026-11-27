import { IlustracionPendiente } from './ilustracion'

/** Espera de una transición que ya existe. No afirma éxito: eso lo decide quien llama, cuando la operación termina. */
export function EsperaVista({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="espera-vista" role="status" aria-live="polite">
    <IlustracionPendiente />
    <h2>{titulo}</h2>
    <p>{texto}</p>
    <div className="espera-vista__barra" aria-hidden="true"><span /></div>
  </div>
}
