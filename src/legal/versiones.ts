// Escenario C (preparación) · Una versión de los Términos y del Aviso de privacidad por escenario encendido, cada una con su fecha.
// Cuando un interruptor cambia el texto visible, sube la versión: A (prueba completa) → 1.7-demo; B (A + VITE_CORREOS) → 1.8-demo;
// C (A + B + VITE_DOS_PERSONAS) → 1.9-demo. Al subir no hay pantalla que bloquee: un aviso en la app (avisoNuevaVersion) y una
// casilla dentro de la función nueva (casillaDeFuncion). Un alquiler firmado conserva su versión salvo que los dos acepten.
import type { Interruptor, Interruptores } from './condicional'
import { V17, FECHA_V17 } from './version17'

export interface VersionLegal { version: string; fecha: string; escenario: 'A' | 'B' | 'C'; interruptores: Interruptores }
// LEGAL: revisar · fechas de la 1.8-demo y la 1.9-demo: poner la del día en que se encienda cada escenario.
// 1.9-demo: «25 de octubre de 2026» es provisional; cambiarla por la fecha real de encendido (real switch-on date) de C.
export const VERSIONES: VersionLegal[] = [
  { version: V17, fecha: FECHA_V17, escenario: 'A', interruptores: { 'dos-personas': false, correos: false } },
  { version: '1.8-demo', fecha: '1 de noviembre de 2026', escenario: 'B', interruptores: { 'dos-personas': false, correos: true } },
  { version: '1.9-demo', fecha: '25 de octubre de 2026', escenario: 'C', interruptores: { 'dos-personas': true, correos: true } },
]
const ORDEN = ['1.6-demo', ...VERSIONES.map(v => v.version)]
/** Posición de una versión (1.6-demo = 0); una versión desconocida va al final para no tratarla como vieja. */
export const ordenVersion = (v: string) => { const i = ORDEN.indexOf(v); return i < 0 ? ORDEN.length : i }
export const datosVersion = (v: string) => VERSIONES.find(x => x.version === v)
/** Versión que describe lo encendido. El modo de dos personas siempre lleva la 1.9-demo (sus textos son los de C). */
export const versionVigente = (s: Interruptores): string => s['dos-personas'] ? '1.9-demo' : s.correos ? '1.8-demo' : V17
/** «1.8-demo · 1 de noviembre de 2026»; solo para la 1.7-demo y posteriores. */
export const edicionDe = (v: string): string | undefined => { const d = datosVersion(v); return d && `${d.version} · ${d.fecha}` }
export const desde17 = (v: string) => ordenVersion(v) >= ordenVersion(V17)

/** Aviso que no bloquea (tarjeta en «Tus alquileres») para quien aceptó una 1.7-demo o posterior más vieja que la vigente.
 *  Sin aceptación o con la 1.6-demo: lo pide «Entrar», como en el paso 16. */
// LEGAL: revisar · aviso de nueva versión (texto propio basado en la cláusula 12)
export function avisoNuevaVersion(aceptada: string | undefined, s: Interruptores): string | null {
  const vig = versionVigente(s)
  if (!aceptada || !desde17(aceptada) || ordenVersion(aceptada) >= ordenVersion(vig)) return null
  return `Actualizamos los Términos y el Aviso de privacidad (versión ${edicionDe(vig)}). Puedes seguir usando la app. Lo nuevo te lo pedimos con una casilla dentro de cada función.`
}

/** Casilla, dentro de cada función nueva, que acepta lo que agrega su versión (sin marcar; la función no sigue sin ella). */
// LEGAL: revisar · textos de las casillas dentro de cada función
export function casillaDeFuncion(f: Interruptor): { version: string; texto: string } {
  const version = f === 'correos' ? '1.8-demo' : '1.9-demo'
  const para = f === 'correos' ? 'recibir los avisos del alquiler simulado por correo' : 'simular un alquiler con otra persona'
  return { version, texto: `Acepto lo que agrega la versión ${edicionDe(version)} de los Términos y del Aviso de privacidad para ${para}.` }
}
