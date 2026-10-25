// B.5 · Reglas de desgaste al crear el alquiler (Anexo 6-A de los Términos 1.7-demo). «Crear» queda inactivo hasta marcar la casilla (F.13).
import './prueba.css'
import { CasillaLegal } from '../legal/CasillaLegal'

// LEGAL: revisado (24/10) · B.5 y Anexo 6-A (A.7), palabra por palabra
export const INTRO_ANEXO = ['Antes de firmar, revisen juntos qué se cobra y qué no. ', 'El desgaste normal nunca se cobra.', ' Si quieren que el inquilino haga algunas reparaciones de uso, márquenlas aquí.'] as const
export const LISTA_A = 'pintura opaca o con roces leves; pocos agujeros pequeños para cuadros, si el contrato no los prohíbe; brillo gastado o rayas finas en los pisos de las zonas de paso; cortinas descoloridas por el sol; electrodomésticos que fallan por antigüedad; plantas que mueren por causas naturales; polvo normal de una mudanza; sarro moderado, empaques gastados o grifos que gotean por el uso; llavines gastados; defectos de construcción, goteras, filtraciones, sismos y otros casos fortuitos.'
export const REPARACIONES_B = ['Cambio de bombillos', 'Cambio de empaques de grifos', 'Limpieza de canoas', 'Mantenimiento del jardín']
export const NOTA_B = 'No aplica a la vivienda de interés social (Ley 7527, art. 91).'
export const LISTA_C = 'rayones grandes, manchas que no salen o pintura de otro color sin permiso; muchos huecos o anclajes grandes sin permiso; pisos quemados, quebrados o perforados; cortinas rotas, quemadas o faltantes; electrodomésticos golpeados o faltantes; suciedad grave o basura dejada; loza quebrada, inodoro tapado por objetos o moho por no avisar una fuga; llaves no devueltas o cerraduras forzadas; vidrios quebrados por golpe; tomacorrientes, apagadores o tapas faltantes; obras hechas sin permiso.'
export const CASILLA_ANEXO = 'Leímos y aceptamos el Anexo 6-A.'

export interface ValorAnexo { acepta: boolean; reparaciones: string[]; otra?: string }
export const OTRA_B = 'Otra que escriban las partes'
/** Reparaciones que se guardan: las marcadas y, si la escribieron, la otra. */
export const reparacionesDe = (v: ValorAnexo) => [...v.reparaciones, ...(v.otra?.trim() ? [v.otra.trim()] : [])]
export const registroAnexo = (reparaciones: string[], ahora = new Date()) => ({ acepta: ahora.toISOString(), reparaciones })

export function Anexo6A({ valor, onCambio }: { valor: ValorAnexo; onCambio: (v: ValorAnexo) => void }) {
  const marcar = (r: string, si: boolean) => onCambio({ ...valor, reparaciones: si ? [...valor.reparaciones, r] : valor.reparaciones.filter(x => x !== r) })
  return <section className="na-sec pila anexo" aria-labelledby="t-anexo">
    <h2 id="t-anexo" className="na-et">Anexo 6-A. Desgaste normal y daños</h2>
    <p>{INTRO_ANEXO[0]}<strong>{INTRO_ANEXO[1]}</strong>{INTRO_ANEXO[2]}</p>
    <p><strong>A. No se cobra (desgaste normal y paso del tiempo):</strong> {LISTA_A}</p>
    <fieldset className="anexo__b"><legend><strong>B. Reparaciones de uso que el contrato puede asignar al inquilino, solo si se marcan:</strong></legend>
      {REPARACIONES_B.map((r, i) => <label key={r} className="casilla-legal__fila"><input type="checkbox" id={'anexo-b-' + i} checked={valor.reparaciones.includes(r)} onChange={e => marcar(r, e.target.checked)} /><span>{r}</span></label>)}
      <label className="campo"><span>{OTRA_B} (opcional)</span><input type="text" id="anexo-b-otra" maxLength={120} value={valor.otra ?? ''} onChange={e => onCambio({ ...valor, otra: e.target.value })} /></label>
      <p className="nota">{NOTA_B}</p></fieldset>
    <p><strong>C. Se puede cobrar (daño), con pruebas completas:</strong> {LISTA_C}</p>
    <CasillaLegal id="acepto-anexo" marcada={valor.acepta} onCambio={v => onCambio({ ...valor, acepta: v })}>{CASILLA_ANEXO}</CasillaLegal>
  </section>
}
