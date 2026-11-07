/** Inicio, Avisos, Ayuda y Perfil. Abajo en el teléfono; en la cabecera desde 960 px. */
export function Navegacion({ r, className = '' }: { r: string; className?: string }) {
  const items = [
    { href: '#/', id: '/', label: 'Inicio', d: ['M4 11 12 4l8 7', 'M6 10v9h12v-9'] },
    { href: '#/avisos', id: '/avisos', label: 'Avisos', d: ['M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9', 'M10 18a2 2 0 0 0 4 0'] },
    { href: '#/ayuda', id: '/ayuda', label: 'Ayuda', d: ['M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2.8-1.2 1.6', 'M12 17h.01'] },
    { href: '#/perfil', id: '/perfil', label: 'Perfil', d: ['M12 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M6 19.5c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5'] },
  ]
  return <nav className={'nav-app ' + className} aria-label="Secciones">
    {items.map(it => {
      const actual = it.id === '/' ? r === '/' : r === it.id || r.startsWith(it.id + '/')
      return <a key={it.id} href={it.href} aria-current={actual ? 'page' : undefined}>
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{it.d.map(p => <path key={p} d={p} />)}</svg>
        <span>{it.label}</span>
      </a>
    })}
  </nav>
}
