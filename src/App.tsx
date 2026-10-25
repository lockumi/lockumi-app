import { useEffect, useState } from 'react'
import { auth, guardarUsuario } from './services/auth'
import type { Usuario } from './types'
import { conAceptacion } from './legal/aceptacion'
import { rutaLegal } from './legal/documentos'
import { PaginaLegal } from './legal/PaginaLegal'
import { Pie } from './legal/Pie'
import { olvidarBilletera } from './services/billetera'
import { Alertas } from './Alertas'
import { avisar, alertaIngreso, alertaIngresoFallo } from './alertas'
import { modoReal, hayRegreso } from './services/auth'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login, Entrando } from './screens/Login'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
import { Invitacion } from './screens/Invitacion'
import { Ejemplo, useRecorridoPrimeraVez } from './screens/Ejemplo'
import { RUTA_EJEMPLO } from './recorrido'
const volver = () => { const v = sessionStorage.getItem('lockumi.regreso'); sessionStorage.removeItem('lockumi.regreso'); return v ?? '/' }
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash()
  // Regreso de Google o Apple: mientras se confirma la sesión se ve «Entrando…» (no la pantalla Entrar);
  // si no termina, el error queda escrito en Entrar hasta que la persona vuelve a intentar o entra bien.
  const [regreso, setRegreso] = useState<'esperando' | 'fallo' | null>(() => !auth.actual() && hayRegreso() ? 'esperando' : null)
  // Al entrar, la aceptación de los Términos (guardada al marcar la casilla) se copia al usuario.
  const entro = (x: Usuario) => { setRegreso(null); setU(guardarUsuario(conAceptacion(x))); avisar(alertaIngreso(modoReal)); location.hash = volver() }
  // Regreso del login con Google/Apple (solo en modo real con VITE_CAVOS_APP_ID). Si falla, se avisa (antes no se veía nada).
  useEffect(() => { auth.completarRegreso().then(x => { if (x) entro(x); else setRegreso(null) }).catch(() => { setRegreso('fallo'); avisar(alertaIngresoFallo()) }) }, [])
  const skip = <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
  // Textos legales: /terminos (ruta real, con reescritura en vercel.json) o #/terminos. Se ven con o sin sesión.
  const legal = rutaLegal(location.pathname) ?? rutaLegal(r)
  // Sin pantalla de volver a aceptar (pedido de Katherine, 24/10): con la sesión abierta se entra directo, aunque la versión aceptada sea anterior.
  useRecorridoPrimeraVez(u, r)   // se abre solo la primera vez, en Inicio
  if (legal) return <Fondo>{skip}<PaginaLegal slug={legal} /><Pie /></Fondo>
  // Si llegó por un link de invitación, se vuelve ahí después de entrar (también tras el regreso de Google o Apple).
  if (!u && r.startsWith('/invitacion/')) sessionStorage.setItem('lockumi.regreso', r)
  if (!u && regreso === 'esperando') return <Fondo>{skip}<Alertas /><Entrando /></Fondo>
  if (!u) return <Fondo>{skip}<Alertas /><Login onOk={entro} error={regreso === 'fallo'} onReintento={() => setRegreso(null)} /><Pie /></Fondo>
  const m = r.match(/^\/alquiler\/(.+)$/)
  const inv = r.match(/^\/invitacion\/([0-9a-f-]{36})\/([0-9a-f]{64})$/)
  // El aviso va justo después de «Saltar al contenido»: es la 2.ª parada de Tab (sin robar el foco).
  return <Fondo>{skip}
    <Alertas />
    <Barra u={u} onSalir={() => { auth.salir(); olvidarBilletera(); setU(null) }} />
    {r === '/crear' ? <Crear u={u} /> : r === RUTA_EJEMPLO ? <Ejemplo u={u} /> : inv ? <Invitacion id={inv[1]} token={inv[2]} u={u} /> : m ? <Detalle id={m[1]} u={u} /> : <Inicio u={u} />}
    <Pie />
  </Fondo>
}

