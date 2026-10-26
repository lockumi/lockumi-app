// PR #22 (c) · Casilla de la versión vigente dentro de la función de dos personas: el inquilino la marca para unirse y el dueño al
// crear el alquiler invitando. El servidor guarda quién la aceptó y cuándo (20261025050000_terminos_por_alquiler.sql).
import { forwardRef } from 'react'
import { CasillaLegal } from '../legal/CasillaLegal'
import { versionActual } from './version'
import { rutaTerminos, rutaPrivacidad } from '../legal/documentos'

export const CasillaVersion = forwardRef<HTMLInputElement, { id: string; marcada: boolean; onCambio: (v: boolean) => void; error?: string | null }>(
  function CasillaVersion({ id, marcada, onCambio, error }, ref) {
    // Casilla de la versión vigente dentro de la función (Términos y Aviso de privacidad). Aprobada por Legal (25/10, 3:16 a. m.)
    // Legal (ronda 1.10, 25/10, 11:16 p. m.): los enlaces abren la MISMA versión que dice la casilla y que se guarda (la del alquiler,
    // desde C la 1.9-demo). Con la reputación encendida, /terminos es la 1.11-demo: la 1.9-demo está en /terminos-1-9 y la 1.10-demo en /terminos-1-10 (documentos.ts).
    const v = versionActual()
    return <CasillaLegal ref={ref} id={id} marcada={marcada} onCambio={onCambio} error={error}>
      Acepto los <a href={rutaTerminos(v)} target="_blank" rel="noopener">Términos {v}</a> y el <a href={rutaPrivacidad(v)} target="_blank" rel="noopener">Aviso de privacidad</a>
    </CasillaLegal>
  })
