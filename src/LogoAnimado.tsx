import { useEffect, useState } from 'react'
import './logo-landing.css'
import { LOGO_LANDING_HTML } from './logoLandingMarkup'
/** Arte animado de la portada de lockumi.com, copiado literal (markup + CSS).
 *  La landing pone `.js` y luego `.listo` en <html>; aquí van en un contenedor propio. */
/** `estatico`: la bienvenida conserva la escena 3D completa, quieta. Las animaciones de hito no están aprobadas. */
export function LogoAnimado({ className = '', estatico = false }: { className?: string; estatico?: boolean }) {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    if (estatico) return
    let b = 0; const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setListo(true)) }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [estatico])
  // Lienzo fijo de 420px (tamaño del hero de lockumi.com en escritorio) escalado como un solo bloque.
  return <div className={'logo-escala ' + (estatico ? 'logo-escala--estatico ' : '') + className}>
    <div className={'logo-escala__lienzo js' + (!estatico && listo ? ' listo' : '') + ' logo-animado'}>
      <div className="portada__arte" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LOGO_LANDING_HTML }} />
    </div>
  </div>
}
