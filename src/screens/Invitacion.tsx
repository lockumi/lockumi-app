import { useEffect, useState } from 'react'
import { servidor } from '../servidor/repositorio'
import { conServidor as modoServidor } from '../servidor/config'
import { activarServidor } from '../store'
import { modoReal } from '../services/auth'
import { conectarBilletera } from '../services/billetera'
import { ir } from '../router'
import type { Usuario } from '../types'
import { usd, fecha } from '../ui'

type Datos = Awaited<ReturnType<typeof servidor.verInvitacion>>
/** Cuenta G… de Cavos, si se puede obtener (solo con login real). No bloquea si falla: se puede agregar después. */
export async function cuentaPropia(): Promise<string | undefined> {
  if (!modoReal) return undefined
  try { return (await conectarBilletera()).direccion } catch { return undefined }
}

export function Invitacion({ id, token, u }: { id: string; token: string; u: Usuario }) {
  const [d, setD] = useState<Datos | null>(null); const [err, setErr] = useState(''); const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (modoServidor) servidor.verInvitacion(id, token).then(setD).catch(e => setErr(e.message)) }, [id, token])
  if (!modoServidor) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta"><p>Las invitaciones funcionan solo con el servidor compartido.</p><a href="#/">Volver</a></div></main>
  const aceptar = async () => {
    setOcupado(true); setErr('')
    try { await servidor.aceptarInvitacion(id, token, u.email, await cuentaPropia()); activarServidor(); ir('/alquiler/' + id) }
    catch (e) { setErr(e instanceof Error ? e.message : 'No pudimos aceptar la invitación. Intenta de nuevo.'); setOcupado(false) }
  }
  return <main id="contenido" tabIndex={-1} className="cont cont--form" style={{ paddingBottom: 48 }}>
    <h1>Te invitaron a un alquiler</h1>
    <div className="glass glass--fuerte tarjeta pila">
      {!d && !err && <p className="nota">Cargando la invitación…</p>}
      {d && <>
        <ul className="lista resumen">
          <li><span>Lugar</span><strong>{d.direccion}</strong></li><li><span>Depósito</span><strong>{usd(Number(d.monto))}</strong></li>
          <li><span>Entrada</span><strong>{fecha(d.inicio)}</strong></li><li><span>Salida</span><strong>{fecha(d.fin)}</strong></li>
          <li><span>Dueño</span><strong className="cortar">{d.email_dueno}</strong></li></ul>
        {d.reglas?.length > 0 && <><p className="mini">Reglas</p><ul className="reglas">{d.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
        {u.email.toLowerCase() !== d.email_inquilino
          ? <p className="error" role="alert">Esta invitación es para {d.email_inquilino}. Sal y entra con ese correo.</p>
          : <><p>Si aceptas, entras como inquilino. Lo siguiente es firmar el contrato.</p>
            <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={aceptar}>{ocupado ? 'Aceptando…' : 'Aceptar invitación'}</button></>}
      </>}
      {err && <p className="error" role="alert">{err}</p>}
      <a href="#/" className="enlace">Ir a tus alquileres</a>
    </div>
  </main>
}
