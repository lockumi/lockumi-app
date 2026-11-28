import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { crearFoto } from './fotos'
import type { Foto, Rol } from './types'
import { Icono } from './ui'

/** Botón "Tomar foto": abre la cámara en vivo dentro de la app (no permite elegir de la galería).
 *  Si no se puede (sin permiso, sin cámara, navegador sin soporte), ofrece la cámara del teléfono como respaldo. */
export function TomarFoto({ por, onFoto, etiqueta = 'Tomar foto', principal = true }: { por: Rol; onFoto: (f: Foto) => void; etiqueta?: string; principal?: boolean }) {
  const [abierta, setAbierta] = useState(false); const [aviso, setAviso] = useState(''); const [ocupado, setOcupado] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const hayVivo = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
  const desdeArchivo = async (fl: FileList | null) => {
    const f = fl?.[0]; if (input.current) input.current.value = ''; if (!f) return
    setOcupado(true); setAviso('')
    try { onFoto(await crearFoto(f, 'archivo', por)) } catch { setAviso('No pudimos leer esa foto. Intenta tomarla de nuevo.') } finally { setOcupado(false) }
  }
  return <div className="tomar">
    <button type="button" className={'boton boton--ancho ' + (principal ? 'boton--primario boton--grande' : 'boton--secundario')} disabled={ocupado}
      onClick={() => hayVivo ? setAbierta(true) : input.current?.click()}>{ocupado ? 'Guardando…' : <><Icono id="i-camara" /> {etiqueta}</>}</button>
    {/* Respaldo: capture abre la cámara del teléfono; en computadora abre el explorador de archivos. Sin `multiple` (falla en Samsung Internet 29). */}
    <input ref={input} type="file" accept="image/*" capture="environment" className="sr" tabIndex={-1} aria-hidden="true" onChange={e => desdeArchivo(e.target.files)} />
    {aviso && <div className="aviso-campo" role="alert"><p>{aviso}</p>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => input.current?.click()}>Usar la cámara del teléfono</button></div>}
    {abierta && <VisorCamara onCerrar={() => setAbierta(false)}
      onFallo={m => { setAbierta(false); setAviso(m) }}
      onCaptura={async b => { setAbierta(false); setOcupado(true); try { onFoto(await crearFoto(b, 'camara', por)) } finally { setOcupado(false) } }} />}
  </div>
}

function VisorCamara({ onCerrar, onCaptura, onFallo }: { onCerrar: () => void; onCaptura: (b: Blob) => void; onFallo: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null); const [listo, setListo] = useState(false)
  useEffect(() => {
    let flujo: MediaStream | null = null; let vivo = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false })
      .then(s => { if (!vivo) { s.getTracks().forEach(t => t.stop()); return } flujo = s; if (video.current) { video.current.srcObject = s; void video.current.play() } })
      .catch(e => onFallo(e?.name === 'NotAllowedError' ? 'No tenemos permiso para usar la cámara. Actívalo en el navegador o usa la cámara del teléfono.'
        : e?.name === 'NotFoundError' ? 'No encontramos una cámara en este aparato. Puedes usar la cámara del teléfono.' : 'No pudimos abrir la cámara. Puedes usar la cámara del teléfono.'))
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    addEventListener('keydown', k)
    return () => { vivo = false; removeEventListener('keydown', k); flujo?.getTracks().forEach(t => t.stop()) }
  }, []) // eslint-disable-line
  const disparar = () => {
    const v = video.current; if (!v || !v.videoWidth) return
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0); c.toBlob(b => b && onCaptura(b), 'image/jpeg', 0.9)
  }
  return createPortal(<div className="camara" role="dialog" aria-modal="true" aria-label="Cámara">
    <div className="camara__marco">
      <video ref={video} playsInline muted onLoadedData={() => setListo(true)} />
      <div className="camara__barra">
        <button type="button" className="boton boton--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="camara__disparo" aria-label="Tomar foto" disabled={!listo} onClick={disparar}><span /></button>
        <span className="camara__equilibrio" aria-hidden="true" />
      </div>
    </div>
  </div>, document.body)
}
