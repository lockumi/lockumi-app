import { useEffect, useState } from 'react'
import { VolverAEntrar } from './Firmante'
import { auth } from '../services/auth'
import { esTextoSinSesion } from '../services/firmante'
import { aprobarConLlave, consultarLlave, crearLlave, esTextoNoFirmante, olvidarBilletera } from '../services/billetera'
import { TEXTOS_LLAVE as T, debeOfrecer, guardarRegistro, leerRegistro, mensajeLlave, navegadorPermite, posponer, resultadoAprobar } from '../services/llave'

/** Oferta de un paso para crear la llave de acceso, justo después de entrar (este dispositivo ya puede firmar). */
export function OfertaLlave({ email, estado }: { email: string; estado: string }) {
  const [ver, setVer] = useState(false); const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(''); const [listo, setListo] = useState(false)
  useEffect(() => {
    let vivo = true
    const r = leerRegistro(email)
    if (estado === 'needs-device-approval' || r?.estado === 'creada' || !debeOfrecer({ registro: r, tieneLlave: false, estado, ahora: Date.now() })) return
    void consultarLlave().then(tiene => {
      if (!vivo) return
      if (tiene) guardarRegistro(email, { estado: 'creada' })
      setVer(debeOfrecer({ registro: r, tieneLlave: tiene, estado, ahora: Date.now() }))
    })
    return () => { vivo = false }
  }, [email, estado])
  if (listo) return <section className="glass tarjeta" aria-live="polite"><p className="nota" role="status">{T.creada}</p></section>
  if (!ver) return null
  const crear = async () => {
    setOcupado(true); setError('')
    try {
      if (!await navegadorPermite()) { setError(T.noSoporta); return }
      await crearLlave(); guardarRegistro(email, { estado: 'creada' }); setListo(true)
    } catch (e) { setError(mensajeLlave(e)) } finally { setOcupado(false) }
  }
  const ahoraNo = () => { guardarRegistro(email, posponer(leerRegistro(email), Date.now())); setVer(false) }
  return <section className="glass tarjeta" aria-labelledby="llave-t">
    <h2 id="llave-t" className="h3">{T.titulo}</h2>
    <p className="nota">{T.oferta}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="acciones">
      <button type="button" className="boton boton--primario" disabled={ocupado} onClick={crear}>{ocupado ? T.creando : T.crear}</button>
      <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={ahoraNo}>{T.ahoraNo}</button>
    </div>
  </section>
}

/** Botón para aprobar este dispositivo con la llave de acceso, y qué hacer si no hay llave. */
export function AprobarDispositivo({ alAprobar }: { alAprobar?: () => void }) {
  const [ocupado, setOcupado] = useState(false); const [msj, setMsj] = useState<{ t: string; ok?: boolean } | null>(null)
  const aprobar = async () => {
    setOcupado(true); setMsj(null)
    try {
      if (!await navegadorPermite()) { setMsj({ t: T.noSoporta }); return }
      const r = resultadoAprobar(await aprobarConLlave())
      if (r === 'aprobado') { setMsj({ t: T.aprobado, ok: true }); alAprobar?.() }
      else { olvidarBilletera(); setMsj({ t: r === 'sin-llave' ? T.sinLlave : T.noAbrio }) }
    } catch (e) { olvidarBilletera(); setMsj({ t: mensajeLlave(e) }) } finally { setOcupado(false) }
  }
  return <div className="aprobar-dispositivo">
    {msj && <p className={msj.ok ? 'nota' : 'error'} role={msj.ok ? 'status' : 'alert'}>{msj.t}</p>}
    {!msj?.ok && <div className="acciones">
      <button type="button" className="boton boton--primario" disabled={ocupado} onClick={aprobar}>{ocupado ? T.aprobando : T.aprobar}</button>
    </div>}
  </div>
}

/** Error de pago en pantalla: si es el de dispositivo no autorizado, suma el botón para aprobarlo. */
export function ErrorPago({ m, alAprobar }: { m: string | null | undefined; alAprobar?: () => void }) {
  if (!m) return null
  const u = esTextoSinSesion(m) ? auth.actual() : null
  return <><p className="error" role="alert">{m}</p>{esTextoNoFirmante(m) && <AprobarDispositivo alAprobar={alAprobar} />}{u && <VolverAEntrar u={u} alVolver={alAprobar} />}</>
}
