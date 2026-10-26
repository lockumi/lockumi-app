// Paso 19 · Tarjeta de entrada en Inicio (solo con VITE_REPUTACION=1). Usa las clases de «¿Primera vez?»: no carga CSS nuevo.
// Legal (revisión de 6e9210a, bloqueo 4): solo para una cuenta que aceptó REP-01; las cuentas que ya existían no tienen perfil.
// Lee el registro directo (sin cargar consentimiento.ts en Inicio).
import { ENTRADA } from './entrada-textos'
import { claveReputacion } from '../legal/version17'

const aceptoRep01 = (email: string) => { try { return !!JSON.parse(localStorage.getItem(claveReputacion(email)) ?? 'null')?.rep01 } catch { return false } }

export function EntradaReputacion({ email }: { email: string }) {
  if (!aceptoRep01(email)) return null
  return <section className="glass tarjeta primera-vez" aria-labelledby="rp-e-t">
    <div><h2 id="rp-e-t">{ENTRADA.titulo}</h2><p className="nota">{ENTRADA.texto}</p></div>
    <a className="boton boton--secundario" href="#/perfil">{ENTRADA.boton}</a>
  </section>
}
