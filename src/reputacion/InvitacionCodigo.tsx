// Invitación con otro correo (26/10/2026, Katherine: «No hagas imagen solo arréglalo»). Quien abre una invitación con una cuenta de OTRO
// correo (p. ej. entró con Apple y el correo es privaterelay) ve a qué correo se envió (oculto) y puede pedir el código de 6 números de
// Lockumi a ESE correo (/api/codigo-correo, acción 'invitacion'). Con el código correcto, el servidor acepta la invitación con ESTA cuenta
// y registra que el correo invitado se verificó (migración 20261026040000). Sin diseño nuevo: la pantalla del código es CodigoCorreo
// (la del segundo factor) y los errores son los de siempre. Se carga solo con VITE_REPUTACION=1 (Invitacion.tsx).
import { useState } from 'react'
import { servidor } from '../servidor/repositorio'
import { CasillaVersion } from '../prueba/CasillaVersion'
import { textoInvitacionEnviada, correoOculto, BOTON_CODIGO_INVITACION } from '../prueba/invitacion'
import { CodigoCorreo } from './Pantallas'
import { SEGUNDO_FACTOR } from './textos'

export type ErrCodigo = { t: string; codigo: boolean }
export type Abierto = { correo: string; err: ErrCodigo | null }
const NO_ACEPTA = 'No pudimos aceptar la invitación. Intenta de nuevo.'   // el texto de siempre de Invitacion.tsx
/** El texto a mostrar para una respuesta de /api/codigo-correo: los del código (SEGUNDO_FACTOR.errores), o el de la base. */
export function textoRespuesta(c: Record<string, unknown>): string {
  const m = c.motivo
  if (typeof m === 'string' && m in SEGUNDO_FACTOR.errores) return SEGUNDO_FACTOR.errores[m as keyof typeof SEGUNDO_FACTOR.errores]
  return typeof c.error === 'string' && c.error ? c.error : NO_ACEPTA
}
/** Pide el código al correo invitado. Con «espera un minuto» (o una hora) igual abre la pantalla del código, con ese aviso. */
export async function pedirCodigoInvitacion(id: string, token: string): Promise<Abierto | { error: string }> {
  const r = await servidor.codigoCorreo({ paso: 'pedir', accion: 'invitacion', contrato: id, token }).catch(() => null)
  if (!r) return { error: SEGUNDO_FACTOR.errores.envio }
  const correo = typeof r.cuerpo.correo === 'string' ? r.cuerpo.correo : ''
  if (r.ok && correo) return { correo, err: null }
  if (correo && (r.cuerpo.motivo === 'minuto' || r.cuerpo.motivo === 'hora')) return { correo, err: { t: textoRespuesta(r.cuerpo), codigo: false } }
  return { error: textoRespuesta(r.cuerpo) }
}
/** Confirma el código; el servidor acepta la invitación con esta cuenta (mismas funciones que «Aceptar invitación»). */
export async function confirmarCodigoInvitacion(id: string, token: string, codigo: string, extra: { terminos_version?: string; direccion?: string }) {
  const r = await servidor.codigoCorreo({ paso: 'confirmar', accion: 'invitacion', codigo: codigo.replace(/\s+/g, ''), contrato: id, token, ...extra }).catch(() => null)
  if (!r) throw Object.assign(new Error(NO_ACEPTA), { codigo: false })
  if (!r.ok || r.cuerpo.hecho !== true) throw Object.assign(new Error(textoRespuesta(r.cuerpo)), { codigo: r.cuerpo.motivo === 'codigo' })
}

/** Donde antes se veía «Esta invitación es para otro correo…»: a qué correo se envió, la casilla de siempre y el botón del código. */
export function PedirCodigoInvitacion({ id, token, correo, casilla, acepta, setAcepta, abrir }: { id: string; token: string; correo: string; casilla: boolean
  acepta: boolean; setAcepta: (v: boolean) => void; abrir: (a: Abierto) => void }) {
  const [enviando, setEnviando] = useState(false), [err, setErr] = useState('')
  const pedir = () => { if (enviando) return; setEnviando(true); setErr('')
    pedirCodigoInvitacion(id, token).then(r => { if ('error' in r) { setErr(r.error); setEnviando(false) } else abrir(r) }) }
  return <>
    <p>{textoInvitacionEnviada(correo)}</p>
    {casilla && <CasillaVersion id="inv-terminos" marcada={acepta} onCambio={setAcepta} />}
    <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={enviando || (casilla && !acepta)} onClick={pedir}>{BOTON_CODIGO_INVITACION}</button>
    {err && <p className="error" role="alert">{err}</p>}
  </>
}

/** La pantalla del código (CodigoCorreo, la misma del segundo factor), con el correo invitado oculto. */
export function CodigoInvitacion({ id, token, abierto, extra, cancelar, listo }: { id: string; token: string; abierto: Abierto
  extra: () => Promise<{ terminos_version?: string; direccion?: string }>; cancelar: () => void; listo: () => void }) {
  const [a, setA] = useState(abierto), [enviando, setEnviando] = useState(false)
  const fallo = (e: unknown) => setA(x => ({ ...x, err: { t: e instanceof Error ? e.message : NO_ACEPTA, codigo: !!(e as { codigo?: boolean })?.codigo } }))
  return <CodigoCorreo c={{ accion: 'invitacion', correo: correoOculto(a.correo) }} err={a.err} enviando={enviando} cancelar={cancelar}
    confirmar={v => { if (enviando) return; setEnviando(true); setA(x => ({ ...x, err: null }))
      extra().then(x => confirmarCodigoInvitacion(id, token, v, x)).then(listo, e => { fallo(e); setEnviando(false) }) }}
    reenviar={() => { if (enviando) return; setEnviando(true); setA(x => ({ ...x, err: null }))
      pedirCodigoInvitacion(id, token).then(r => setA(x => 'error' in r ? { ...x, err: { t: r.error, codigo: false } } : r)).finally(() => setEnviando(false)) }} />
}
