// Proceso de un botón que toca la red de prueba (movido tal cual desde screens/Detalle.tsx para usarlo también en src/prueba/).
import { useState } from 'react'
import { avisar, quitarAvisos, alertaErrorRed, ERROR_RED } from './alertas'

/** «24 oct 2026, 02:18 a. m.» ya termina en punto: no agregar otro. */
export const conPunto = (t: string) => t.endsWith('.') ? t : t + '.'
/** Botones que tocan la red de prueba: no se pueden tocar dos veces, muestran el avance y explican el error. */
export function useProceso() {
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  const correr = async (f: (av: (t: string) => void) => Promise<unknown>) => {
    if (ocupado) return; setOcupado(true); setErr(''); quitarAvisos(alertaErrorRed().paso)   // al volver a intentar, el aviso de error se va
    try { await f(setAvance) } catch (e) {
      const m = e instanceof Error && e.message ? e.message : 'No pudimos terminar este paso. Vuelve a tocar el botón.'
      setErr(m); if (m === ERROR_RED) avisar(alertaErrorRed())   // error de red (A12): también el aviso v2 de error (role=alert, no se esconde solo)
    } finally { setOcupado(false); setAvance('') }
  }
  // Con el error de red el aviso v2 ya lo anuncia (role=alert): el texto queda escrito en la pantalla sin anunciarse dos veces.
  return { ocupado, avance, err, correr, texto: (t: string) => ocupado ? (avance || 'Un momento…') : t, error: err ? <p className="error" role={err === ERROR_RED ? undefined : 'alert'}>{err}</p> : null }
}
export const NOTA_TIEMPO = <p className="nota">En la red de prueba esto tarda entre 20 y 60 segundos. No cierres esta pestaña.</p>
