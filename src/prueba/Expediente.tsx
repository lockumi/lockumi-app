// Paso 14 · «Descargar el expediente (demo)» con el aviso de la B.11 antes de descargar (un paso por pantalla). Solo con la prueba completa.
import { useState } from 'react'
import type { Alquiler } from '../types'
import { ahoraDe } from '../store'
import { AVISO_EXPEDIENTE, BOTON_EXPEDIENTE, MARCA_EXPEDIENTE, descargarExpediente } from './expediente'

export function Expediente({ a }: { a: Alquiler }) {
  const [paso, setPaso] = useState<'boton' | 'aviso' | 'listo'>('boton')
  if (paso === 'aviso') return <div className="expediente" role="dialog" aria-labelledby="exp-t">
    <h3 id="exp-t">Antes de descargar</h3>
    <p>{AVISO_EXPEDIENTE}</p>{/* LEGAL: revisar · B.11 */}
    <p className="nota">Cada página lleva la marca «{MARCA_EXPEDIENTE}». No incluye correos, teléfonos, identificaciones ni la dirección.</p>
    <div className="expediente__botones">
      <button type="button" className="boton boton--pc" onClick={() => { void descargarExpediente(a, ahoraDe(a)).finally(() => setPaso('listo')) }}>Descargar</button>
      <button type="button" className="boton boton--secundario" onClick={() => setPaso('boton')}>Cancelar</button>
    </div></div>
  return <div className="pila">
    <button type="button" className="boton boton--pc boton--ancho" onClick={() => setPaso('aviso')}>{BOTON_EXPEDIENTE}</button>
    {paso === 'listo' && <p className="nota" role="status">Listo: el expediente quedó en tus descargas. Si no lo ves, revisa la carpeta de descargas del navegador o vuelve a tocar el botón.</p>}
  </div>
}
