// Botón corto para quien no puede firmar con su cuenta anterior (llave perdida). Mismos estilos de siempre: sin cambios de diseño.
import { useState } from 'react'
import { crearCuentaNueva, OFRECER_CUENTA_NUEVA } from '../services/cuentaNueva'

export function CuentaNueva() {
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState(''); const [listo, setListo] = useState(false)
  const crear = async () => {
    setOcupado(true); setErr('')
    try { await crearCuentaNueva(setAvance); setListo(true) }
    catch (e) { setErr(e instanceof Error && e.message ? e.message : 'No pudimos crear tu cuenta nueva. Intenta de nuevo en un momento.') }
    finally { setOcupado(false); setAvance('') }
  }
  if (listo) return <p className="nota" role="status">Listo: tu cuenta nueva está activa. Vuelve a tocar el botón de pagar.</p>
  return <>
    <p className="nota">{OFRECER_CUENTA_NUEVA}</p>
    <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => void crear()}>{ocupado ? (avance || 'Un momento…') : 'Crear cuenta nueva'}</button>
    {err && <p className="error" role="alert">{err}</p>}
  </>
}
