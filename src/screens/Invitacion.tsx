import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { servidor } from '../servidor/repositorio'
import { conServidor as modoServidor, dosPersonas } from '../servidor/config'
import { CasillaVersion } from '../prueba/CasillaVersion'
import { versionActual } from '../prueba/version'
import { activarServidor } from '../store'
import { modoReal } from '../services/auth'
import { conectarBilletera } from '../services/billetera'
import { ir } from '../router'
import type { Usuario } from '../types'
import { usd, fecha } from '../ui'
import { TEXTO_OTRO_CORREO, TITULO_INVITACION, TITULO_PLEGABLE_REGLAS } from '../prueba/invitacion'
import { Plegable } from './Plegable'

type Datos = Awaited<ReturnType<typeof servidor.verInvitacion>>
// 26/10/2026 (Katherine): con otra cuenta (p. ej. Apple), el código de 6 números al correo invitado (src/reputacion/InvitacionCodigo.tsx).
// Usa /api/codigo-correo, que es de la reputación: solo con VITE_REPUTACION=1; apagado se ve TEXTO_OTRO_CORREO como antes.
const conCodigo = import.meta.env.VITE_REPUTACION === '1'
const PedirCodigo = conCodigo ? lazy(() => import('../reputacion/InvitacionCodigo').then(m => ({ default: m.PedirCodigoInvitacion }))) : null
const PantallaCodigo = conCodigo ? lazy(() => import('../reputacion/InvitacionCodigo').then(m => ({ default: m.CodigoInvitacion }))) : null
type Abierto = import('../reputacion/InvitacionCodigo').Abierto
/** Cuenta G… de Cavos, si se puede obtener (solo con login real). No bloquea si falla: se puede agregar después. */
export async function cuentaPropia(): Promise<string | undefined> {
  if (!modoReal) return undefined
  try { return (await conectarBilletera()).direccion } catch { return undefined }
}

/** Aceptar la invitación. En el modo de dos personas (escenario C), solo con la casilla de los Términos vigentes y el Aviso de privacidad. */
/** Legal (ronda 1.10, 25/10, 11:16 p. m.): `bloqueado` = el servidor respondió «Esta invitación es para otro correo»; mientras ese
 *  error está a la vista, «Aceptar invitación» queda desactivado (se sale de ahí volviendo a entrar con el correo invitado). */
export function ZonaAceptar({ marcada, onMarcar, ocupado, onAceptar, casilla = true, bloqueado = false }: { marcada: boolean; onMarcar: (v: boolean) => void; ocupado: boolean; onAceptar: () => void; casilla?: boolean; bloqueado?: boolean }) {
  return <><p>Si aceptas, entras como inquilino. Lo siguiente es firmar el contrato.</p>
    {casilla && <CasillaVersion id="inv-terminos" marcada={marcada} onCambio={onMarcar} />}
    <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado || bloqueado || (casilla && !marcada)} onClick={onAceptar}>{ocupado ? 'Aceptando…' : 'Aceptar invitación'}</button></>
}

/** Paso 21 (orden de publicación, docs/invitacion-enlace.md): antes de aceptar, el correo de la sesión se verifica en el servidor
 *  (api/verificar-correo; con correo y código de Cavos termina en «Revisa tu correo»). Solo con VITE_REPUTACION=1: apagado, el código
 *  de la reputación no entra en el build. Nunca lanza: si no se pudo, el servidor rechaza con un texto que dice cómo seguir. */
export async function asegurarCorreo(email: string) {
  if (import.meta.env.VITE_REPUTACION !== '1') return
  const { asegurarCorreo: asegurar } = await import('../reputacion/verificacion')
  await asegurar(email).catch(() => false)
}

/** Aceptar = primero asegurar el correo verificado en el servidor y después lk_aceptar_invitacion_con_terminos (migración 20261025230000). */
export async function aceptarConCorreo(id: string, token: string, email: string) {
  await asegurarCorreo(email)
  await servidor.aceptarInvitacion(id, token, email, await cuentaPropia(), dosPersonas ? versionActual() : undefined)
}

export function Invitacion({ id, token, u }: { id: string; token: string; u: Usuario }) {
  const [d, setD] = useState<Datos | null>(null); const [err, setErr] = useState(''); const [ocupado, setOcupado] = useState(false)
  const [acepta, setAcepta] = useState(false)   // escenario C: Términos vigentes y Aviso de privacidad
  const [codigo, setCodigo] = useState<Abierto | null>(null)   // la pantalla del código (otra cuenta)
  useEffect(() => { if (modoServidor) servidor.verInvitacion(id, token).then(setD).catch(e => setErr(e.message)) }, [id, token])
  if (!modoServidor) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta"><p>Las invitaciones funcionan solo con el servidor compartido.</p><a href="#/">Volver</a></div></main>
  const aceptar = async () => {
    setOcupado(true); setErr('')
    try { await aceptarConCorreo(id, token, u.email); activarServidor(); ir('/alquiler/' + id) }
    catch (e) { setErr(e instanceof Error ? e.message : 'No pudimos aceptar la invitación. Intenta de nuevo.'); setOcupado(false) }
  }
  if (codigo && PantallaCodigo) return <Suspense fallback={null}><PantallaCodigo id={id} token={token} abierto={codigo} cancelar={() => setCodigo(null)}
    extra={async () => { const direccion = await cuentaPropia(); return { ...(dosPersonas && { terminos_version: versionActual() }), ...(direccion && { direccion }) } }}
    listo={() => { activarServidor(); ir('/alquiler/' + id) }} /></Suspense>
  const otroCorreo = d?.email_inquilino && PedirCodigo
    ? <Suspense fallback={null}><PedirCodigo id={id} token={token} correo={d.email_inquilino} casilla={dosPersonas} acepta={acepta} setAcepta={setAcepta} abrir={setCodigo} /></Suspense> : undefined
  return <main id="contenido" tabIndex={-1} className="cont cont--form" style={{ paddingBottom: 48 }}>
    <h1 className="inv-titulo">{TITULO_INVITACION}</h1>
    <div className="glass glass--fuerte tarjeta pila">
      {!d && !err && <p className="nota">Cargando la invitación…</p>}
      {d && <CuerpoInvitacion d={d} u={u} acepta={acepta} setAcepta={setAcepta} ocupado={ocupado} aceptar={aceptar} bloqueado={err.includes(TEXTO_OTRO_CORREO)} otroCorreo={otroCorreo} />}
      {err && <p className="error" role="alert">{err}</p>}
      <a href="#/" className="enlace">Ir a tus alquileres</a>
    </div>
  </main>
}

/** paso21: lo que se ve con la invitación cargada. Resumen (lugar, depósito, fechas, dueño) a la vista; las reglas, plegadas y
 *  cerradas; la casilla de los Términos y el Aviso de privacidad (con sus enlaces) y «Aceptar invitación», siempre a la vista. */
export function CuerpoInvitacion({ d, u, acepta, setAcepta, ocupado, aceptar, bloqueado = false, otroCorreo }: { d: NonNullable<Datos>; u: Usuario; acepta: boolean; setAcepta: (v: boolean) => void; ocupado: boolean; aceptar: () => void; bloqueado?: boolean; otroCorreo?: ReactNode }) {
  return <>
    <ul className="lista resumen">
      <li><span>Lugar</span><strong>{d.direccion}</strong></li><li><span>Depósito</span><strong>{usd(Number(d.monto))}</strong></li>
      <li><span>Entrada</span><strong>{fecha(d.inicio)}</strong></li><li><span>Salida</span><strong>{fecha(d.fin)}</strong></li>
      <li><span>Dueño</span><strong className="cortar">{d.email_dueno}</strong></li></ul>
    {/* paso21: las reglas (solo lectura, sin campos) van plegadas y cerradas; la casilla, sus enlaces y «Aceptar invitación» quedan a la vista */}
    {d.reglas?.length > 0 && <Plegable titulo={TITULO_PLEGABLE_REGLAS}><ul className="reglas">{d.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul></Plegable>}
    {u.email.trim().toLowerCase() !== d.email_inquilino?.trim().toLowerCase()
      ? otroCorreo ?? <p className="error" role="alert">{TEXTO_OTRO_CORREO}</p>
      : <ZonaAceptar marcada={acepta} onMarcar={setAcepta} ocupado={ocupado} onAceptar={aceptar} casilla={dosPersonas} bloqueado={bloqueado} />}
  </>
}
