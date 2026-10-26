// Legal (revisión de c97585b) · Fija la fecha de la 1.12-demo el día de la publicación (src/legal/fecha-v112.ts). Igual que fecha-1-12.mjs.
//   node scripts/fecha-1-12.mjs                         → la fecha de hoy en Costa Rica, p. ej. «26 de octubre de 2026»
//   node scripts/fecha-1-12.mjs "27 de octubre de 2026" → una fecha dada (mismo formato)
// Se corre justo antes del merge, se sube en el mismo PR y luego se hace el merge. Sin esto, el build de producción falla.
import { readFileSync, writeFileSync } from 'node:fs'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const hoyCR = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: 'numeric', day: 'numeric' })
  .formatToParts(new Date()).map(x => [x.type, x.value])); return `${+p.day} de ${MESES[+p.month - 1]} de ${p.year}` }
const fecha = process.argv[2] ?? hoyCR()
if (!/^\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}$/.test(fecha)) {
  console.error(`Fecha inválida: «${fecha}» (formato: «26 de octubre de 2026»)`); process.exit(1)
}
const ruta = new URL('../src/legal/fecha-v112.ts', import.meta.url)
const antes = readFileSync(ruta, 'utf8'), despues = antes.replace(/export const FECHA_V112 = '[^']*'/, `export const FECHA_V112 = '${fecha}'`)
if (antes === despues && !antes.includes(`'${fecha}'`)) { console.error('No encontré FECHA_V112 en src/legal/fecha-v112.ts'); process.exit(1) }
writeFileSync(ruta, despues); console.log(`FECHA_V112 = «${fecha}» (1.12-demo · ${fecha})`)
