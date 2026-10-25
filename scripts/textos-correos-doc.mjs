import { createServer } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { TEXTOS } = await vite.ssrLoadModule('/api/_lib/textos-correos.ts')
const { sumarHabiles } = await vite.ssrLoadModule('/api/_lib/plazos.ts')
const src = readFileSync('api/_lib/textos-correos.ts', 'utf8').split('\n')
const linea = k => src.findIndex(l => l.includes(`'${k}': {`)) + 1
const pedido = Date.parse('2026-10-26T15:00:00Z')
const d = { deposito: 2, reclamado: 0.5, vence: Date.parse('2026-10-29T15:00:00Z'), auto: false, abierto: false, motivo: 'rechazo', dueno: 0.5, inquilino: 1.5, pedidoEn: pedido, eliminadoEn: Date.parse('2026-10-28T15:00:00Z'), limite: sumarHabiles(pedido, 5) }
const out = ['## Textos (generados desde `api/_lib/textos-correos.ts`, con datos de ejemplo)', '',
  'Datos de ejemplo: depósito 2,00, reclamo 0,50, reparto 0,50 / 1,50, vence el 29 oct 2026, 9:00 a. m. Hora en 12 h y montos con 2 decimales (Legal 25/10, 5:09 p. m., punto 8).', '']
for (const [k, t] of Object.entries(TEXTOS)) {
  out.push(`### ${k} · \`api/_lib/textos-correos.ts:${linea(k)}\` · **${t.legal === 'revisado' ? 'LEGAL: revisado (25/10)' : 'LEGAL: revisar'}**`, '',
    `- Asunto: ${t.asunto(d)}`,
    `- Botones: ${t.botones.length ? t.botones.map(b => `«${b.texto}»`).join(', ') : 'ninguno'} · nota: ${t.nota ?? 'ninguna'} · pie de baja: ${t.baja ? 'sí' : 'no (correo de servicio)'}`, '',
    `> ${t.cuerpo(d)}`, '')
}
const doc = readFileSync('docs/correos-c.md', 'utf8'), i = doc.indexOf('## Textos (generados')
writeFileSync('docs/correos-c.md', doc.slice(0, i) + out.join('\n'))
await vite.close()
