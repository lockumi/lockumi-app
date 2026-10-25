// Arma E2E.md (y el resumen del job) desde el reporte JSON de Playwright. Uso: node e2e/resumen.mjs <base> <evento>
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
const [base = 'https://app.lockumi.com', evento = 'manual'] = process.argv.slice(2)
const j = JSON.parse(readFileSync('test-results/resultados.json', 'utf8'))
const red = existsSync('test-results/red.json') ? JSON.parse(readFileSync('test-results/red.json', 'utf8')) : null
const filas = []
const recorrer = (s, ruta = []) => { for (const x of s.suites ?? []) recorrer(x, [...ruta, x.title]); for (const sp of s.specs ?? []) for (const t of sp.tests) {
  const r = t.results.at(-1); filas.push([[...ruta.filter(Boolean), sp.title].join(' › '), t.projectName, t.status === 'expected' ? '✔' : t.status === 'skipped' ? '—' : '✘', r ? (r.duration / 1000).toFixed(1) + ' s' : '']) } }
recorrer(j)
const hora = new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'medium', timeStyle: 'short' })
const ok = filas.filter(f => f[2] === '✔').length, mal = filas.filter(f => f[2] === '✘').length
let md = `# E2E automática\n\n- Hora: ${hora} (hora de Costa Rica)\n- URL: ${base}\n- Evento: ${evento}\n- Resultado: ${ok} ✔ · ${mal} ✘ · ${filas.length - ok - mal} omitidas\n`
if (red) md += `- Red de prueba: escrow ${red.escrow} · liberación https://stellar.expert/explorer/testnet/tx/${red.liberacion}\n- disputeResolver: ${red.dispute_resolver} (modo ${red.modo}; ¿es el mediador? ${red.resolver_es_mediador ?? 'sin clave pública configurada'})\n`
md += `\n| Prueba | Papel | Resultado | Duración |\n|---|---|---|---|\n` + filas.map(f => `| ${f.join(' | ')} |`).join('\n') + '\n\nCapturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».\n'
writeFileSync('E2E.md', md); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
console.log(`E2E: ${ok} ✔ · ${mal} ✘`)
