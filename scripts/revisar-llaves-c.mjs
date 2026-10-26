// PR #22 · condición (a) para encender C: la llave mediadora es distinta de la de la plataforma P y está en otro secreto.
// Solo lectura y sin red (salvo --url). Nunca imprime un secreto: compara llaves PÚBLICAS y muestra sus últimos 4 caracteres.
//   node scripts/revisar-llaves-c.mjs            revisa las llaves del entorno (las que va a usar correr-c.sh)
//   node scripts/revisar-llaves-c.mjs --url https://app.lockumi.com   pregunta al servidor desplegado (GET /api/tw?revisar=llaves)
// Sale con 0 si está lista; 1 si son la misma llave, falta alguna o no coinciden.
import { createServer } from 'vite'
const A = process.argv.slice(2), i = A.indexOf('--url')
let r
if (i >= 0) {
  const base = (A[i + 1] || '').replace(/\/$/, '')
  const res = await fetch(base + '/api/tw?revisar=llaves', { headers: { accept: 'application/json' } }).catch(() => null)
  r = res ? await res.json().catch(() => null) : null
  if (!r || typeof r.ok !== 'boolean') { console.log(`No se pudo revisar en ${base} (¿está desplegado GET /api/tw?revisar=llaves?).`); process.exit(1) }
} else {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
  try { r = (await vite.ssrLoadModule('/api/_lib/tw.ts')).revisarLlaves(process.env) } finally { await vite.close() }
}
console.log(`  Plataforma ${r.plataforma ?? '(falta)'} · mediadora ${r.mediador ?? '(falta)'} · ${r.distintas === true ? 'DISTINTAS' : r.distintas === false ? 'IGUALES' : 'sin comparar'}` +
  `${r.publicaCoincide === false ? ' · la pública declarada no coincide' : ''}`)
for (const p of r.problemas ?? []) console.log('  - ' + p)
console.log(r.ok ? '  Llaves listas para C.' : '  NO están listas: no se corre nada real.')
process.exit(r.ok ? 0 : 1)
