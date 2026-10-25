// Paso 19 · Tarjeta de entrada en Inicio (solo con VITE_REPUTACION=1). Usa las clases de «¿Primera vez?»: no carga CSS nuevo.
import { ENTRADA } from './entrada-textos'

export function EntradaReputacion() {
  return <section className="glass tarjeta primera-vez" aria-labelledby="rp-e-t">
    <div><h2 id="rp-e-t">{ENTRADA.titulo}</h2><p className="nota">{ENTRADA.texto}</p></div>
    <a className="boton boton--secundario" href="#/perfil">{ENTRADA.boton}</a>
  </section>
}
