import { lazy, Suspense, useEffect, useState } from 'react'
import { auth, guardarUsuario } from './services/auth'
import type { Usuario } from './types'
import { conAceptacion } from './legal/aceptacion'
import { rutaLegal } from './legal/documentos'
import { PaginaLegal } from './legal/PaginaLegal'
import { Pie } from './legal/Pie'
import { olvidarBilletera, probarFirma } from './services/billetera'
import { recordarFirmante, type EstadoFirmante } from './services/firmante'
import { Alertas } from './Alertas'
import { avisar, alertaIngreso, alertaIngresoFallo } from './alertas'
import { modoReal, hayRegreso } from './services/auth'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login, Entrando } from './screens/Login'
import { PuertaFirmante } from './screens/Firmante'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
import { ConfirmarAlquiler, ConfirmarReinicio } from './prueba/Eliminar'
import { modoPrueba, conServidor } from './servidor/config'
import { usarCuenta, salirDeCuenta } from './servidor/repositorio'
import { otraPestanaCambio } from './servidor/cuenta-sesion'
import { Invitacion } from './screens/Invitacion'
import { Ejemplo, useRecorridoPrimeraVez } from './screens/Ejemplo'
import { RUTA_EJEMPLO } from './recorrido'
import { useSincronizarPrueba } from './prueba/sincronizar'
import { guardarRegreso, tomarRegreso, esRutaInvitacion } from './regreso'
import { TITULO_INVITACION, SUBTITULO_INVITADO_SIN_SESION } from './prueba/invitacion'
// Paso 19 · Reputación: interruptor VITE_REPUTACION (apagado por defecto). Apagado, el código ni siquiera entra en el build.
const Reputacion = import.meta.env.VITE_REPUTACION === '1' ? lazy(() => import('./reputacion/Pantallas')) : null
// Legal (26/10/2026): sin pantalla aparte antes del login. El perfil se acepta con la casilla de los Términos 1.13-demo de la pantalla
// de inicio (solo cambia su texto; el login y Cavos siguen igual) y Pantallas.tsx lo registra al entrar.
const volver = tomarRegreso
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash()
  // La sesión del servidor es de la cuenta que entró (cuenta-sesion.ts): con otra cuenta se termina la anterior. Si otra pestaña entra
  // con otra cuenta, esta se recarga para no mostrar la lista ni el rol de una cuenta con el nombre de otra.
  const correoU = u?.email ?? ''
  if (conServidor && correoU) void usarCuenta(correoU)   // en el render (idempotente): antes de que la lista lea con la sesión anterior
  useEffect(() => {
    if (!conServidor || !correoU) return
    const f = (e: StorageEvent) => { if (otraPestanaCambio(e.key, e.newValue, correoU)) location.reload() }
    addEventListener('storage', f); return () => removeEventListener('storage', f)
  }, [correoU])
  useSincronizarPrueba()   // prueba completa (interruptor apagado en producción): avisos e inicio automático del plazo
  // Regreso de Google o Apple: mientras se confirma la sesión se ve «Entrando…» (no la pantalla Entrar);
  // si no termina, el error queda escrito en Entrar hasta que la persona vuelve a intentar o entra bien.
  const [regreso, setRegreso] = useState<'esperando' | 'fallo' | null>(() => !auth.actual() && hayRegreso() ? 'esperando' : null)
  // Al entrar, la aceptación de los Términos (guardada al marcar la casilla) se copia al usuario.
  // Firmante (26/10): al entrar, la billetera firma 'lockumi-login' (gratis). Si este dispositivo no puede firmar, no se entra:
  // se ve PuertaFirmante (abrir Lockumi en el dispositivo de origen). Solo se recuerda sí/no.
  const [puerta, setPuerta] = useState<{ x: Usuario; e: EstadoFirmante | 'probando' } | null>(null)
  const pasar = (x: Usuario) => { setPuerta(null); setU(guardarUsuario(conAceptacion(x))); avisar(alertaIngreso(modoReal)); location.hash = volver() }
  const probar = async (x: Usuario) => {
    setPuerta({ x, e: 'probando' }); const e = await probarFirma()
    if (e === 'puede' || e === 'no-firmante') recordarFirmante(x.email, e === 'puede')
    if (e === 'puede') return pasar(x)
    auth.olvidarUsuarioLocal(); setU(null); setPuerta({ x, e })   // sin entrar; la identidad de Cavos queda
  }
  const entro = (x: Usuario) => { setRegreso(null); void probar(x) }
  // Regreso del login con Google/Apple (solo en modo real con VITE_CAVOS_APP_ID). Si falla, se avisa (antes no se veía nada).
  useEffect(() => { auth.completarRegreso().then(x => { if (x) entro(x); else setRegreso(null) }).catch(() => { setRegreso('fallo'); avisar(alertaIngresoFallo()) }) }, [])
  const skip = <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
  // Textos legales: /terminos (ruta real, con reescritura en vercel.json) o #/terminos. Se ven con o sin sesión.
  const legal = rutaLegal(location.pathname) ?? rutaLegal(r)
  // Sin pantalla de volver a aceptar (pedido de Katherine, 24/10): con la sesión abierta se entra directo, aunque la versión aceptada sea anterior.
  useRecorridoPrimeraVez(u, r)   // se abre solo la primera vez, en Inicio
  if (legal) return <Fondo>{skip}<PaginaLegal slug={legal} /><Pie /></Fondo>
  // Si llegó por un link de invitación, se vuelve ahí después de entrar (también tras el regreso de Google o Apple).
  // paso21: también en localStorage por 30 min (src/regreso.ts) y, sin sesión, la pantalla Entrar dice que es una invitación.
  const invitado = !u && esRutaInvitacion(r)
  if (invitado) guardarRegreso(r)
  if (!u && regreso === 'esperando') return <Fondo>{skip}<Alertas /><Entrando /></Fondo>
  if (puerta) return <Fondo>{skip}<Alertas /><PuertaFirmante x={puerta.x} estado={puerta.e} reintentar={() => void probar(puerta.x)} otraCuenta={() => { setPuerta(null); auth.salir(); olvidarBilletera() }} /></Fondo>
  const entrar = <Login onOk={entro} error={regreso === 'fallo'} onReintento={() => setRegreso(null)} invitacion={invitado ? { titulo: TITULO_INVITACION, subtitulo: SUBTITULO_INVITADO_SIN_SESION } : undefined} />
  if (!u) return <Fondo>{skip}<Alertas />{entrar}<Pie /></Fondo>
  const conf = modoPrueba ? r.match(/^\/alquiler\/(.+)\/(eliminar|ocultar)$/) : null   // PROTOTIPO eliminar-alquiler
  const m = conf ? null : r.match(/^\/alquiler\/(.+)$/)
  const inv = r.match(/^\/invitacion\/([0-9a-f-]{36})\/([0-9a-f]{64})$/)
  const salir = () => { auth.salir(); olvidarBilletera(); if (conServidor) void salirDeCuenta(); setU(null) }
  const pantalla = conf ? <ConfirmarAlquiler id={conf[1]} u={u} que={conf[2] as 'eliminar' | 'ocultar'} /> : modoPrueba && r === '/reiniciar' ? <ConfirmarReinicio u={u} /> : r === '/crear' ? <Crear u={u} /> : r === RUTA_EJEMPLO ? <Ejemplo u={u} /> : inv ? <Invitacion id={inv[1]} token={inv[2]} u={u} salir={salir} /> : m ? <Detalle id={m[1]} u={u} /> : <Inicio u={u} />
  // El aviso va justo después de «Saltar al contenido»: es la 2.ª parada de Tab (sin robar el foco).
  return <Fondo comision={!!(inv || m)}>{skip}
    <Alertas />
    <Barra u={u} onSalir={salir} />
    {/* Paso 19: con VITE_REPUTACION=1 todas las pantallas pasan por la puerta obligatoria de la reputación. Apagado, este código no existe en el build. */}
    {Reputacion ? <Suspense fallback={<main id="contenido" tabIndex={-1} className="cont"><p className="nota">Cargando…</p></main>}><Reputacion u={u} r={r} salir={salir}>{pantalla}</Reputacion></Suspense> : pantalla}
    <Pie />
  </Fondo>
}

