// SIN USO desde el 24/10/2026 (pedido de Katherine): App.tsx ya no muestra esta pantalla. Se conserva para el PR 10 (ver PLAN.md).
// Volver a aceptar con la sesión abierta (spec docs/reaceptacion.md, 19e8a44). Sale al abrir la app con sesión si la aceptación
// guardada de los Términos o del Aviso de privacidad no es la versión vigente (misma comparación exacta que «Entrar»).
// Bloquea: sin la barra de arriba ni «Salir». Al aceptar, sigue a la pantalla que se estaba abriendo (no cambia la ruta).
import { useState } from 'react'
import type { Usuario } from '../types'
import { TERMINOS, PRIVACIDAD, CONSENTIMIENTO_PRIVACIDAD, fechaLegible, type DocLegal } from './documentos'
import { aceptoVersion, guardarAceptacion, conAceptacion, type ClaveLegal } from './aceptacion'
import { guardarUsuario } from '../services/auth'
import { CasillaLegal } from './CasillaLegal'
import { Hoja } from '../screens/Crear'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
const LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'septiembre', 'octubre', 'noviembre', 'diciembre']
/** «24 de octubre de 2026» → «24 oct 2026». */
const corta = (f: string | null) => { const m = f?.match(/(\d{1,2}) de ([a-z]+) de (\d{4})/i); if (!m) return f ?? ''
  const i = LARGO.indexOf(m[2].toLowerCase()); const mes = i < 0 ? m[2] : MESES[i > 8 ? i - 1 : i]; return `${m[1]} ${mes} ${m[3]}` }
// LEGAL: revisado (24/10) · docs/reaceptacion.md v2 (con los 3 ajustes de Legal). La versión y la fecha salen del documento.
export const TITULO_REACEPTACION = `Actualizamos los Términos y el Aviso de privacidad (versión ${TERMINOS.version}, ${corta(TERMINOS.fecha)}).`

const VERSION: Record<ClaveLegal, string> = { terminos: TERMINOS.version, privacidad: PRIVACIDAD?.version ?? '' }
/** ¿Hay que volver a aceptar? (falta la versión vigente de los Términos o del Aviso de privacidad). */
export const necesitaReaceptar = () => !aceptoVersion('terminos', VERSION.terminos) || (!!PRIVACIDAD && !aceptoVersion('privacidad', VERSION.privacidad))
/** Guarda las dos aceptaciones (versión y fecha ISO 8601) y las copia al usuario (`lockumi.usuario`). */
export function aceptarVersiones(u: Usuario, ahora = new Date()): Usuario {
  guardarAceptacion('terminos', VERSION.terminos, ahora)
  if (PRIVACIDAD) guardarAceptacion('privacidad', VERSION.privacidad, ahora)
  return guardarUsuario(conAceptacion(u))
}

export function Reaceptacion({ u, onListo }: { u: Usuario; onListo: (u: Usuario) => void }) {
  const [marcas, setMarcas] = useState({ terminos: false, privacidad: !PRIVACIDAD })
  const [hoja, setHoja] = useState<DocLegal | null>(null)
  const listo = marcas.terminos && marcas.privacidad
  // Un toque abre el documento en una hoja (las casillas no cambian); con Ctrl/Cmd o clic medio, en otra pestaña.
  const abrir = (d: DocLegal) => (e: React.MouseEvent) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); setHoja(d) }
  const c = CONSENTIMIENTO_PRIVACIDAD
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app reaceptacion">
    <p className="centro"><img src="/img/logo-lockumi.svg" alt="" width={56} height={56} /></p>
    <h1 className="entrada-app__titulo">{TITULO_REACEPTACION}</h1>
    <p>Para seguir usando Lockumi, revísalos y acéptalos.</p>
    <p className="nota">Qué cambió: ahora explicamos con más detalle quién firma cada paso en la red de prueba (tú, tu billetera o la cuenta de Lockumi).</p>
    <div className="casillas-legales">
      <CasillaLegal id="reacepto-terminos" marcada={marcas.terminos} onCambio={v => setMarcas(m => ({ ...m, terminos: v }))}>
        Acepto los <a href="/terminos" target="_blank" rel="noopener" onClick={abrir(TERMINOS)}>Términos y condiciones</a></CasillaLegal>
      {PRIVACIDAD && <CasillaLegal id="reacepto-privacidad" marcada={marcas.privacidad} onCambio={v => setMarcas(m => ({ ...m, privacidad: v }))}>
        {c.antes}<a href="/privacidad" target="_blank" rel="noopener" onClick={abrir(PRIVACIDAD)}>{c.enlace}</a>{c.despues}</CasillaLegal>}
    </div>
    <button type="button" className="boton boton--primario boton--ancho" disabled={!listo} onClick={() => onListo(aceptarVersiones(u))}>Aceptar y seguir</button>
    <Hoja id="reacepto-doc" titulo={hoja?.titulo ?? ''} abierta={!!hoja} onCerrar={() => setHoja(null)}>
      {hoja && <div className="na-hoja__texto legal__texto">
        <p><strong>Versión {hoja.version}</strong>{hoja.fecha && <> · {fechaLegible(hoja.fecha)}</>}</p>
        <div dangerouslySetInnerHTML={{ __html: hoja.html }} />
      </div>}
      <button type="button" className="boton boton--primario boton--ancho na-hoja__listo" onClick={() => setHoja(null)}>Cerrar</button>
    </Hoja>
  </main>
}
