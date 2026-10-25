// Paso 11 · «Recibir los avisos por correo»: el consentimiento se pide en el momento de uso, con la casilla sin marcar.
// Sin la casilla no se envía nada; los avisos siguen en la app. Solo con la prueba completa.
import { useEffect, useRef, useState } from 'react'
import type { Alquiler, Rol } from '../types'
import { store } from '../store'
import { CASILLA_CORREO, puedeEnviarAvisos, enviarCorreo, avisosPorEnviar, desactivarCorreo, guardarConsentimiento } from './correoAvisos'
import { datosAviso } from './avisos'
import type { Plantilla } from '../../api/_lib/avisos'

export function AvisosCorreo({ a, rol }: { a: Alquiler; rol: Rol }) {
  const guardado = a.correos?.[rol]
  const [correo, setCorreo] = useState(''); const [acepta, setAcepta] = useState(false)
  const [estado, setEstado] = useState<'' | 'enviando' | 'listo'>(''); const [error, setError] = useState('')
  // Envío automático: cada aviso nuevo que se entrega en la app sale también por correo (solo con la casilla marcada).
  const enCurso = useRef(new Set<string>())
  const pendientes = avisosPorEnviar(a, rol).map(v => v.id).join(',')
  useEffect(() => {
    const para = a.correos?.[rol]; if (!para) return
    for (const v of avisosPorEnviar(a, rol)) {
      if (enCurso.current.has(v.id)) continue
      enCurso.current.add(v.id)
      void enviarCorreo(para, a.id, true, { tipo: 'aviso', plantilla: v.id as Plantilla, datos: datosAviso(a, v.id as Plantilla) }).then(r => {
        if (r.ok) store.cambiar(a.id, x => { x.correosEnviados = { ...x.correosEnviados, [rol]: [...(x.correosEnviados?.[rol] ?? []), v.id] } }, 'Aviso enviado por correo')
        else enCurso.current.delete(v.id)
      })
    }
  }, [pendientes, a.id, rol]) // eslint-disable-line
  const desmarcar = () => {
    const para = guardado; store.cambiar(a.id, x => desactivarCorreo(x, rol), 'Avisos por correo desactivados'); setAcepta(false); setEstado('')
    if (para) void guardarConsentimiento(para, a.id, false)
  }
  if (guardado && estado !== 'enviando') return <div className="avisos-correo" role="status">
    <p><strong>Avisos por correo activados.</strong> Te escribiremos a la dirección que diste cuando haya un aviso nuevo de este alquiler. Los avisos también siguen en la app.</p>
    <label className="avisos-correo__casilla"><input type="checkbox" checked onChange={desmarcar} /> {CASILLA_CORREO}</label>{/* LEGAL: revisar · desmarcar detiene los envíos */}
    <p className="nota">Para dejar de recibirlos, desmarca la casilla. Seguirás viéndolos dentro de la app.</p></div>
  const enviar = async () => {
    setError('')
    if (!puedeEnviarAvisos(correo, acepta)) { setError(acepta ? 'Revisa el correo: tiene que ser como nombre@correo.com.' : 'Marca la casilla para recibir los avisos por correo. Si no quieres, no hace falta: los avisos siguen en la app.'); return }
    setEstado('enviando')
    const c = await guardarConsentimiento(correo, a.id, true)
    if (!c.ok) { setEstado(''); setError(c.error); return }
    const ultimo = [...(a.avisos ?? [])].reverse().find(v => v.para === rol && typeof v.dia === 'number')
    const r = ultimo ? await enviarCorreo(correo, a.id, acepta, { tipo: 'aviso', plantilla: ultimo.id as Plantilla, datos: datosAviso(a, ultimo.id as Plantilla) }) : { ok: true as const }
    if (!r.ok) { setEstado(''); setError(r.error); return }
    store.cambiar(a.id, x => { x.correos = { ...x.correos, [rol]: correo.trim() }; x.correosEnviados = { ...x.correosEnviados, [rol]: (x.avisos ?? []).filter(v => v.para === rol && v.entregado).map(v => v.id) } }, 'Avisos por correo activados'); setEstado('listo')
  }
  return <div className="avisos-correo">
    <h3>Recibir los avisos por correo</h3>
    <p>Opcional. Te enviamos los mismos avisos de la app: los días 1, 4 y 6 del plazo y si hay un reclamo. Sin la dirección ni fotos; solo montos de prueba, fechas y un enlace a la app.</p>
    <label className="campo"><span>Tu correo</span>
      <input type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" value={correo} onChange={e => setCorreo(e.target.value)} /></label>
    <label className="avisos-correo__casilla"><input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} /> {CASILLA_CORREO}</label>{/* LEGAL: revisar */}
    <button type="button" className="boton boton--pc boton--ancho" disabled={estado === 'enviando'} onClick={() => void enviar()}>{estado === 'enviando' ? 'Guardando…' : 'Recibir los avisos por correo'}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
