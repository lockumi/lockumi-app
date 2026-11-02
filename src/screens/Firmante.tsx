// Firmante (26/10/2026): qué se ve cuando este dispositivo no puede firmar con la billetera de la cuenta, y el pedido de
// volver a entrar cuando la sesión se perdió (pestaña nueva o vencida). Reusa la entrada (Entrando), la tarjeta y los botones.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Entrando, Hoja } from './Login'
import { LogoAnimado } from '../LogoAnimado'
import { TEXTOS_FIRMANTE as T, esTextoSinSesion, detalleFallo, type EstadoFirmante } from '../services/firmante'
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
  if (estado === 'sin-llave') return <LlaveAutomatica email={x.email} alListo={reintentar} otraCuenta={otraCuenta} />
  const titulo = estado === 'no-firmante' ? T.titulo : estado === 'sin-sesion' ? T.sesionTitulo : T.errorTitulo
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app">
    <LogoAnimado className="entrada-app__arte marca-c__arte" />
    <h2 className="entrada-app__titulo">{titulo}</h2>
    <section className="glass tarjeta pila" aria-live="polite">
      {estado === 'no-firmante' && <><p>{L.conLlave}</p><BotonLlave email={x.email} alListo={reintentar} /></>}
      {estado === 'sin-sesion' && <><p>{T.sesion}</p><VolverAEntrar u={x} /></>}
      {estado === 'error' && <><p>{T.error}</p>
        {detalleFallo() && <p className="nota">Detalle técnico: {detalleFallo()}</p>}
        <button type="button" className="boton boton--primario boton--ancho" onClick={reintentar}>{T.reintentar}</button></>}
    </section>
    <button type="button" className="boton boton--secundario boton--ancho" onClick={otraCuenta}>{T.otraCuenta}</button>
  </main>
}

/** Llave de acceso automática (27/10, como Meteorito con secureStep 'required'): con una cuenta que no tiene llave, la creación
 *  se lanza sola, sin pantalla ni botón. El vault de Cavos abre su propia ventana («Add a passkey» → «Create passkey», en su origen),
 *  y ese toque dentro del vault es el gesto que Safari exige para crear la passkey. Si no se completa (cancelada, bloqueada), la
 *  misma línea ofrece un toque para intentarlo de nuevo, también un gesto de la persona. Sin pantalla nueva: mismo estilo de Entrando. */
export function LlaveAutomatica({ email, alListo, otraCuenta }: { email: string; alListo: () => void; otraCuenta: () => void }) {
  const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(true); const lanzada = useRef(false)
  const crear = async () => {
    setOcupado(true); setError('')
    const r = await asegurarLlave(email)
    if (r.ok) alListo(); else { setOcupado(false); setError(r.mensaje) }
  }
  useEffect(() => { if (lanzada.current) return; lanzada.current = true; void crear() }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  return <main id="contenido" tabIndex={-1} className="cont cont--form entrada-app ingreso-cargando" aria-busy={ocupado}>
    <LogoAnimado className="entrada-app__arte marca-c__arte" />
    <p className="entrada-app__titulo" role="status">Entrando a tu cuenta…</p>
    <p className="nota">{L.auto}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {error && <button type="button" className="boton boton--secundario boton--ancho" onClick={() => void crear()}>{L.reintentar}</button>}
    {error && <button type="button" className="boton boton--secundario boton--ancho" onClick={otraCuenta}>{T.otraCuenta}</button>}
  </main>
}

/** Botón de la llave de acceso (crearla o entrar con ella). Si algo falla, el mismo texto corto dice cómo resolverlo. */
export function BotonLlave({ email, alListo }: { email: string; alListo: () => void }) {
  const [ocupado, setOcupado] = useState(false); const [error, setError] = useState('')
  const tocar = async () => {
    setOcupado(true); setError('')
    const r = await recuperarConLlave(email)
    setOcupado(false)
    if (r.ok) alListo(); else setError(r.mensaje)
  }
  return <>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="button" className="boton boton--primario boton--ancho" disabled={ocupado} onClick={() => void tocar()}>
      {ocupado ? L.entrando : L.entrarBoton}</button>
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
