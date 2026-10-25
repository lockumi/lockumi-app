// paso16-unido · Una sola 1.7-demo que describe exactamente lo que está encendido (Legal, 25/10). Los textos de src/legal/v17/
// llevan bloques y frases condicionales que se resuelven ANTES de convertir el Markdown, así nunca llegan marcas a la pantalla:
//   <!-- si: dos-personas -->  …líneas…  <!-- fin -->      (solo con el modo de dos personas)
//   <!-- si no: correos -->    …líneas…  <!-- fin -->      (solo con los correos apagados)
//   {{dos-personas: frase}}  ·  {{!correos:frase}}         (dentro de una línea; el espacio tras «:» se respeta)
//   {{edicion}}                                            → «1.7-demo · 25 de octubre de 2026» (src/legal/version17.ts)
// Un interruptor desconocido o un bloque sin cerrar es un error: es mejor que falle la prueba a publicar un texto roto.
import { EDICION_V17 } from './version17'

export type Interruptor = 'dos-personas' | 'correos' | 'reputacion'
/** `reputacion` (paso 19) es opcional: apagado si no se indica. */
export type Interruptores = Record<Exclude<Interruptor, 'reputacion'>, boolean> & { reputacion?: boolean }
const NOMBRES: Interruptor[] = ['dos-personas', 'correos', 'reputacion']
const valor = (s: Interruptores, k: string) => { if (!(NOMBRES as string[]).includes(k)) throw new Error(`Interruptor desconocido en un texto legal: ${k}`); return !!s[k as Interruptor] }

export function condicional(txt: string, s: Interruptores): string {
  const pila: boolean[] = [], fuera: string[] = []
  for (const l of txt.split('\n')) {
    const si = l.match(/^\s*<!--\s*si( no)?:\s*([\w-]+)\s*-->\s*$/)
    if (si) { pila.push(valor(s, si[2]) !== !!si[1]); continue }
    if (/^\s*<!--\s*fin\s*-->\s*$/.test(l)) { if (!pila.length) throw new Error('«<!-- fin -->» sin bloque abierto'); pila.pop(); continue }
    if (pila.every(Boolean)) fuera.push(l)
  }
  if (pila.length) throw new Error('Bloque condicional sin «<!-- fin -->»')
  let r = fuera.join('\n').replace(/\{\{edicion\}\}/g, EDICION_V17), antes
  do { antes = r; r = r.replace(/\{\{(!?)([\w-]+):([^{}]*)\}\}/g, (_, no: string, k: string, f: string) => valor(s, k) !== !!no ? f : '') } while (r !== antes)
  if (/\{\{|\}\}/.test(r)) throw new Error('Marca condicional mal escrita en un texto legal')
  return r
}
