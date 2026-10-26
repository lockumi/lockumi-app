// PR #22 (c) · Casilla de la versión vigente dentro de la función de dos personas: el inquilino la marca para unirse y el dueño al
// crear el alquiler invitando. El servidor guarda quién la aceptó y cuándo (20261025050000_terminos_por_alquiler.sql).
import { forwardRef } from 'react'
import { CasillaLegal } from '../legal/CasillaLegal'
import { versionActual } from './version'

export const CasillaVersion = forwardRef<HTMLInputElement, { id: string; marcada: boolean; onCambio: (v: boolean) => void; error?: string | null }>(
  function CasillaVersion({ id, marcada, onCambio, error }, ref) {
    // Casilla de la versión vigente dentro de la función (Términos y Aviso de privacidad). Aprobada por Legal (25/10, 3:16 a. m.)
    return <CasillaLegal ref={ref} id={id} marcada={marcada} onCambio={onCambio} error={error}>
      Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos {versionActual()}</a> y el <a href="/privacidad" target="_blank" rel="noopener">Aviso de privacidad</a>
    </CasillaLegal>
  })
