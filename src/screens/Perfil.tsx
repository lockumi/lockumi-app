import { useAlquileres } from '../store'
import { NOMBRE_ROL, type Usuario } from '../types'
import { hayPrivacidad } from '../legal/documentos'
import { iniciales, METODO, rolesDeCuenta } from './perfil-datos'

/** Datos de la sesión, roles que salen de los alquileres visibles y los enlaces legales que ya existen. Sin edición. */
export function Perfil({ u, onSalir }: { u: Usuario; onSalir: () => void }) {
  const roles = rolesDeCuenta(useAlquileres(), u.email)
  return <main id="contenido" tabIndex={-1} className="cont perfil">
    <header className="perfil__cab">
      <p className="perfil__ini" aria-hidden="true">{iniciales(u.nombre)}</p>
      <h1>{u.nombre}</h1>
      {roles.length > 0 && <ul className="perfil__roles" aria-label="Tus roles">
        {roles.map(r => <li key={r}><span className={'chip chip--mini ' + (r === 'dueno' ? 'chip--dueno' : 'chip--inquilino')}>{NOMBRE_ROL[r]}</span></li>)}
      </ul>}
    </header>
    <div className="perfil__menu">
      <details className="glass tarjeta perfil__datos">
        <summary id="perfil-datos">Datos</summary>
        <dl>
          <div><dt>Nombre</dt><dd>{u.nombre}</dd></div>
          <div><dt>Correo</dt><dd>{u.email}</dd></div>
          <div><dt>Acceso</dt><dd>{METODO[u.metodo]}</dd></div>
        </dl>
      </details>
      <nav className="glass tarjeta perfil__opciones" aria-label="Documentos y sesión">
        <a href="#/avisos">Avisos</a>
        <a href="/terminos">Términos y condiciones</a>
        {hayPrivacidad && <a href="/privacidad">Aviso de privacidad</a>}
        {import.meta.env.VITE_REPUTACION === '1' && <a href="#/perfil/llave">Mi Llave Lockumi</a>}
      </nav>
      <button type="button" className="boton boton--primario" onClick={onSalir}>Salir</button>
    </div>
  </main>
}
