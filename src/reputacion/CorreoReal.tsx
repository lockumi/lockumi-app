// Correo real para avisos con Apple (26/10/2026, Katherine). Con Apple y un correo @privaterelay.appleid.com los correos de Lockumi no
// llegan (lockumi.com no está registrado en el relay de Apple). Dentro de «Crear alquiler» y de la invitación, un campo corto pide UNA
// vez un correo real y lo confirma con el código de 6 números de siempre (/api/codigo-correo, acción 'correo_real'). El servidor lo guarda
// para ESA cuenta de Apple (migración 20261026080000) y manda ahí los avisos. Sin pantallas nuevas: clases y textos de la app.
import { useEffect, useId, useState } from 'react'
import { servidor } from '../servidor/repositorio'
import { SEGUNDO_FACTOR } from './textos'
import { textoRespuesta } from './InvitacionCodigo'

export const ES_RELAY = /@privaterelay\.appleid\.com$/i
export const CORREO_REAL = {
  etiqueta: 'Correo para avisos',
  nota: 'Tu correo de Apple está oculto y no recibe los avisos de Lockumi. Escribe tu correo real y te enviamos un código.',
  enviar: 'Enviar código',
  enviado: (c: string) => `Te enviamos un código de 6 números a ${c}.`,
  confirmar: 'Confirmar correo',
  listo: (c: string) => `Listo. Los avisos llegarán a ${c}.`,
  invalido: SEGUNDO_FACTOR.errores.invalido,
} as const
const clave = (email: string) => 'lockumi.correo-real:' + email.trim().toLowerCase()
/** ¿Hay que pedir el correo real? Solo Apple con correo oculto y si la cuenta todavía no lo guardó. */
export const pedirCorreoReal = (email: string, s: Pick<Storage, 'getItem'> = localStorage) => ES_RELAY.test(email.trim()) && s.getItem(clave(email)) !== '1'

export function CorreoReal({ email, className = 'pila' }: { email: string; className?: string }) {
  const [pedir, setPedir] = useState(() => pedirCorreoReal(email)), id = useId()
  const [correo, setCorreo] = useState(''), [codigo, setCodigo] = useState(''), [paso, setPaso] = useState<'correo' | 'codigo' | 'listo'>('correo')
  const [err, setErr] = useState(''), [ocupado, setOcupado] = useState(false)
  // La cuenta ya lo guardó (en otro aparato): no se vuelve a preguntar.
  useEffect(() => { if (pedir) servidor.tengoCorreoReal().then(t => { if (t) { localStorage.setItem(clave(email), '1'); setPedir(false) } }).catch(() => { /* se pregunta */ }) }, [email, pedir])
  if (!pedir) return null
  const enviar = () => {
    const c = correo.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) || ES_RELAY.test(c)) { setErr(CORREO_REAL.invalido); return }
    if (ocupado) return; setOcupado(true); setErr('')
    servidor.codigoCorreo({ paso: 'pedir', accion: 'correo_real', correo: c })
      .then(r => { if (r.ok || r.cuerpo.motivo === 'minuto' || r.cuerpo.motivo === 'hora') { setPaso('codigo'); if (!r.ok) setErr(textoRespuesta(r.cuerpo)) } else setErr(textoRespuesta(r.cuerpo)) },
        () => setErr(SEGUNDO_FACTOR.errores.envio)).finally(() => setOcupado(false))
  }
  const confirmar = () => {
    if (ocupado || codigo.length !== 6) return; setOcupado(true); setErr('')
    servidor.codigoCorreo({ paso: 'confirmar', accion: 'correo_real', codigo })
      .then(r => { if (r.ok && r.cuerpo.hecho === true) { localStorage.setItem(clave(email), '1'); setPaso('listo') } else setErr(textoRespuesta(r.cuerpo)) },
        () => setErr(SEGUNDO_FACTOR.errores.envio)).finally(() => setOcupado(false))
  }
  const enter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); fn() } }
  if (paso === 'listo') return <p className="nota" role="status">{CORREO_REAL.listo(correo.trim().toLowerCase())}</p>
  return <section className={className} aria-labelledby={id + 't'}>
    {paso === 'correo' ? <>
      <label className={'campo' + (err ? ' campo--error' : '')}><span id={id + 't'}>{CORREO_REAL.etiqueta}</span>
        <input type="email" autoComplete="email" value={correo} onChange={e => setCorreo(e.target.value)} onKeyDown={enter(enviar)} placeholder="tu@correo.com"
          aria-invalid={!!err || undefined} aria-describedby={id + 'n'} /></label>
      <p id={id + 'n'} className="nota">{CORREO_REAL.nota}</p>
      <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={enviar}>{CORREO_REAL.enviar}</button>
    </> : <>
      <p id={id + 't'}>{CORREO_REAL.enviado(correo.trim().toLowerCase())}</p>
      <label className={'campo' + (err ? ' campo--error' : '')}><span>{SEGUNDO_FACTOR.campo}</span>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={enter(confirmar)}
          aria-invalid={!!err || undefined} /></label>
      <p className="nota">{SEGUNDO_FACTOR.nota}</p>
      <button type="button" className="boton boton--secundario" disabled={ocupado || codigo.length !== 6} onClick={confirmar}>{CORREO_REAL.confirmar}</button>
      <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={enviar}>{SEGUNDO_FACTOR.reenviar}</button>
    </>}
    {err && <p className="error" role="alert">{err}</p>}
  </section>
}
