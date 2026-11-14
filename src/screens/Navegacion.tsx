/** Abajo en el teléfono: Inicio, Alquileres, Avisos, Perfil (Alquileres con documento).
 *  En la cabecera, desde 960 px: Inicio, Avisos, Alquileres, Perfil (Alquileres con la llave).
 *  Ayuda no está aquí: el ? de la cabecera abre `#/ayuda`.
 *  Inicio (`#/`) es el resumen. Alquileres (`#/alquileres`) es el listado que ya existía.
 *  Dentro de un alquiler se marca Alquileres. */
const LLAVE = ['M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z', 'M16.5 7.5h.01']
const DOC = ['M7 3.5h7.2L19 8.2V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z', 'M14 3.5V8.5h5', 'M9 13h6', 'M9 17h4']

export function Navegacion({ r, className = '' }: { r: string; className?: string }) {
  const enAlquileres = r === '/alquileres' || r.startsWith('/alquiler/')
  const pie = !className.includes('nav-app--cabecera')
  const inicio = { href: '#/', id: 'inicio', label: 'Inicio', actual: r === '/', d: ['M4 11 12 4l8 7', 'M6 10v9h12v-9'] }
  const avisos = { href: '#/avisos', id: 'avisos', label: 'Avisos', actual: r === '/avisos' || r.startsWith('/avisos/'), d: ['M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9', 'M10 18a2 2 0 0 0 4 0'] }
  const alquileres = { href: '#/alquileres', id: 'alquileres', label: 'Alquileres', actual: enAlquileres, d: pie ? DOC : LLAVE }
  const perfil = { href: '#/perfil', id: 'perfil', label: 'Perfil', actual: r === '/perfil' || r.startsWith('/perfil/'), d: ['M12 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M6 19.5c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5'] }
  const items = pie ? [inicio, alquileres, avisos, perfil] : [inicio, avisos, alquileres, perfil]
  return <nav className={'nav-app ' + className} aria-label="Secciones">
    {items.map(it => <a key={it.id} href={it.href} aria-current={it.actual ? 'page' : undefined}>
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{it.d.map(p => <path key={p} d={p} />)}</svg>
      <span>{it.label}</span>
    </a>)}
  </nav>
}
