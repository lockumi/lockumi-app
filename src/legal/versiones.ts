// Escenario C (preparación) · Una versión de los Términos y del Aviso de privacidad por escenario encendido, cada una con su fecha.
// Cuando un interruptor cambia el texto visible, sube la versión: A (prueba completa) → 1.7-demo; B (A + VITE_CORREOS) → 1.8-demo;
// C (A + B + VITE_DOS_PERSONAS) → 1.9-demo. Al subir no hay aviso ni pantalla de volver a aceptar (decisión de Katherine, 25/10):
// una cuenta nueva acepta la versión vigente en «Entrar» y cada función nueva tiene su casilla (casillaDeFuncion). Un alquiler
// firmado conserva su versión salvo que los dos acepten.
import type { Interruptor, Interruptores } from './condicional'
import { V17, FECHA_V17 } from './version17'

export interface VersionLegal { version: string; fecha: string; escenario: 'A' | 'B' | 'C'; interruptores: Interruptores }
// LEGAL: revisado (25/10, lista de Legal) · fechas de la 1.8-demo y la 1.9-demo: poner la del día en que se encienda cada escenario.
// 1.9-demo: FECHA_V19 es la ÚNICA línea que hay que cambiar. Se pone la fecha real del día en que se encienda VITE_DOS_PERSONAS=1 en
// app.lockumi.com (formato «25 de octubre de 2026»). C se encendió en app.lockumi.com el 25/10/2026 a las 7:04 p. m. CR
// (deploy dpl_FuydsVHksKbrTRNmPcQTFDyDbKjr): desde entonces /terminos y /privacidad muestran la 1.9-demo con esta fecha.
// LEGAL: revisado (25/10, lista de Legal)
export const FECHA_V19 = '25 de octubre de 2026'
/** 1.8-demo (B, solo correos): fecha provisional de B. En C (B se enciende junto con C) se muestra FECHA_V19: ver casillaDeFuncion. */
export const FECHA_V18 = '1 de noviembre de 2026'
export const VERSIONES: VersionLegal[] = [
  { version: V17, fecha: FECHA_V17, escenario: 'A', interruptores: { 'dos-personas': false, correos: false } },
  { version: '1.8-demo', fecha: FECHA_V18, escenario: 'B', interruptores: { 'dos-personas': false, correos: true } },
  { version: '1.9-demo', fecha: FECHA_V19, escenario: 'C', interruptores: { 'dos-personas': true, correos: true } },
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

/** Casilla, dentro de cada función nueva, que acepta lo que agrega su versión (sin marcar; la función no sigue sin ella). */
// LEGAL: revisado (25/10, lista de Legal) · textos de las casillas dentro de cada función
// Con C encendido (s['dos-personas']), B se enciende a la vez: la 1.8-demo lleva la fecha de C (FECHA_V19), nunca una fecha futura.
export function casillaDeFuncion(f: Interruptor, s?: Interruptores): { version: string; texto: string } {
  const version = f === 'correos' ? '1.8-demo' : '1.9-demo'
  const para = f === 'correos' ? 'recibir los avisos del alquiler simulado por correo' : 'simular un alquiler con otra persona'
  const edicion = version === '1.8-demo' && s?.['dos-personas'] ? `${version} · ${FECHA_V19}` : edicionDe(version)
  return { version, texto: `Acepto lo que agrega la versión ${edicion} de los Términos y del Aviso de privacidad para ${para}.` }
}
