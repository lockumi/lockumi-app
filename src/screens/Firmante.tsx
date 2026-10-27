// Firmante (26/10/2026): qué se ve cuando este dispositivo no puede firmar con la billetera de la cuenta, y el pedido de
// volver a entrar cuando la sesión se perdió (pestaña nueva o vencida). Reusa la entrada (Entrando), la tarjeta y los botones.
import { useEffect, useState, type ReactNode } from 'react'
import { Entrando, Hoja } from './Login'
import { LogoAnimado } from '../LogoAnimado'
import { TEXTOS_FIRMANTE as T, esTextoSinSesion, type EstadoFirmante } from '../services/firmante'
import { TEXTOS_LLAVE as L, asegurarLlave, recuperarConLlave } from '../services/llave'
import { haySesionFirma, olvidarBilletera } from '../services/billetera'
import { auth, volverAEntrar } from '../services/auth'
import { guardarRegreso } from '../regreso'
import type { Usuario } from '../types'

/** Al entrar: «probando» = «Entrando a tu cuenta…»; «no-firmante» = este dispositivo no tiene la llave de la cuenta: se recupera
 *  con la llave de acceso; «sin-llave» = la cuenta no tiene llave de acceso: se crea antes de entrar (paso obligatorio);
 *  «sin-sesion» = volver a entrar; «error» = reintentar. Nunca se entra a la app desde aquí sin firmar y sin llave. */
export function PuertaFirmante({ x, estado, reintentar, otraCuenta }: { x: Usuario; estado: EstadoFirmante | 'probando'; reintentar: () => void; otraCuenta: () => void }) {
  if (estado === 'probando' || estado === 'puede') return <Entrando />
  const titulo = estado === 'no-firmante' ? T.titulo : estado === 'sin-llave' ? L.crearTitulo : estado === 'sin-sesion' ? T.sesionTitulo : T.errorTitulo
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app">
    <LogoAnimado className="entrada-app__arte marca-c__arte" />
    <h2 className="entrada-app__titulo">{titulo}</h2>
    <section className="glass tarjeta pila" aria-live="polite">
      {estado === 'no-firmante' && <><p>{L.conLlave}</p><BotonLlave modo="entrar" email={x.email} alListo={reintentar} /></>}
      {estado === 'sin-llave' && <><p>{L.crear}</p><BotonLlave modo="crear" email={x.email} alListo={reintentar} /></>}
      {estado === 'sin-sesion' && <><p>{T.sesion}</p><VolverAEntrar u={x} /></>}
      {estado === 'error' && <><p>{T.error}</p>
        <button type="button" className="boton boton--primario boton--ancho" onClick={reintentar}>{T.reintentar}</button></>}
    </section>
    <button type="button" className="boton boton--secundario boton--ancho" onClick={otraCuenta}>{T.otraCuenta}</button>
  </main>
}

/** Botón de la llave de acceso (crearla o entrar con ella). Si algo falla, el mismo texto corto dice cómo resolverlo. */
export function BotonLlave({ modo, email, alListo }: { modo: 'crear' | 'entrar'; email: string; alListo: () => void }) {
  const [ocupado, setOcupado] = useState(false); const [error, setError] = useState('')
  const tocar = async () => {
    setOcupado(true); setError('')
    const r = await (modo === 'crear' ? asegurarLlave(email) : recuperarConLlave(email))
    setOcupado(false)
    if (r.ok) alListo(); else setError(r.mensaje)
  }
  return <>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="button" className="boton boton--primario boton--ancho" disabled={ocupado} onClick={() => void tocar()}>
      {modo === 'crear' ? (ocupado ? L.creando : L.crearBoton) : (ocupado ? L.entrando : L.entrarBoton)}</button>
  </>
}

/** «Entrar de nuevo» con un clic: guarda este paso (el alquiler) y vuelve aquí después de entrar. Con correo abre la hoja del código. */
export function VolverAEntrar({ u, alVolver }: { u: Pick<Usuario, 'email' | 'metodo'>; alVolver?: () => void }) {
  const [hoja, setHoja] = useState(false); const [yendo, setYendo] = useState(false)
  const ir = () => { guardarRegreso(location.hash.replace(/^#/, '')); if (volverAEntrar(u.metodo)) setYendo(true); else setHoja(true) }
  return <>
    <button type="button" className="boton boton--primario boton--ancho" disabled={yendo} onClick={ir}>{yendo ? T.entrando : T.entrar}</button>
    {hoja && <Hoja correo={u.email} onCerrar={() => setHoja(false)} onOk={() => { setHoja(false); olvidarBilletera(); alVolver?.() }} />}
  </>
}

/** Antes de pagar o de firmar el contrato: si esta pestaña perdió la sesión y no se pudo reponer (sesionCavos.ts), primero «Entrar de nuevo». */
export function useSesionFirma(activo: boolean) {
  const [ok, setOk] = useState<boolean | null>(activo ? null : true); const [n, setN] = useState(0)
  useEffect(() => { if (!activo) { setOk(true); return } let vivo = true; void haySesionFirma().then(v => { if (vivo) setOk(v) }); return () => { vivo = false } }, [activo, n])
  return { ok, revisar: () => setN(k => k + 1) }
}
export function PedirEntrar({ u, alVolver }: { u: Pick<Usuario, 'email' | 'metodo'>; alVolver: () => void }) {
  return <div className="glass tarjeta pila" role="alert">
    <p><strong>{T.sesionTitulo}</strong></p><p className="nota">{T.sesion}</p>
    <VolverAEntrar u={u} alVolver={alVolver} />
  </div>
}
/** Envuelve el botón de pagar o de firmar: sin sesión en esta pestaña, en su lugar «Vuelve a entrar para seguir». */
export function ConSesion({ activo, children }: { activo: boolean; children: ReactNode }) {
  const { ok, revisar } = useSesionFirma(activo); const u = auth.actual()
  if (ok === false && u) return <PedirEntrar u={u} alVolver={revisar} />
  return <>{children}</>
}
/** Error del pago o de una acción del depósito: si la sesión se cerró, el mismo «Entrar de nuevo» (vuelve a este alquiler). */
export function ErrorPago({ m }: { m: string }) {
  const u = auth.actual()
  return <>{m}{esTextoSinSesion(m) && u && <VolverAEntrar u={u} />}</>
}
