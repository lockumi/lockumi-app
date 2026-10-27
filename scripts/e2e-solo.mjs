// Prueba E2E REAL en Stellar testnet de la fase 1 (una sola persona, sin base de datos), por los MISMOS endpoints que usa la app.
//   inquilino = cuenta DESECHABLE con la clave WebCryptoControlKey de @cavos/kit, que firma con el signXdr REAL del kit
//   dueño     = cuenta de prueba derivada y custodiada por el servidor (/api/solo)
// Pasos: cuenta creada por la tesorería (LOCKUMI_TW_PLATAFORMA_SECRET en el entorno) → trustline (addTrustline del kit) → compra de USDC (path payment, firmado con signXdr) → dueño de prueba →
//        creación del escrow → depósito (signXdr) → evidencia + aprobación (servidor) → liberación → verificación en Horizon.
// Uso: BASE=https://… node scripts/e2e-solo.mjs [monto=2]   (BASE por defecto http://localhost:8787)
// Si la vista previa está protegida, VERCEL_BYPASS=<secreto de bypass> agrega el encabezado x-vercel-protection-bypass (no se imprime).
import { crearCuenta } from './crear-cuenta-testnet.mjs'
import { randomUUID } from 'node:crypto'
import { CavosStellar, StellarAdapter } from '@cavos/kit/stellar'
import { WebCryptoControlKey, signTransactionWithControlKey } from '../node_modules/@cavos/kit/dist/chunk-CEOXXKEN.mjs'
import { Asset, Networks, Operation, TransactionBuilder, Horizon } from '@stellar/stellar-sdk'

const BASE = (process.env.BASE || 'http://localhost:8787').replace(/\/$/, ''), MONTO = Number(process.argv[2] || 2)
const HZ = new Horizon.Server('https://horizon-testnet.stellar.org')
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')
const enlace = h => 'https://stellar.expert/explorer/testnet/tx/' + h, pasos = []
const anotar = (paso, h) => { pasos.push([paso, h]); console.log(`✔ ${paso}\n    ${enlace(h)}`) }
async function api(cuerpo) {
  const t0 = Date.now(); try { return await api0(cuerpo) } finally { console.log(`    (${cuerpo.accion}: ${((Date.now() - t0) / 1000).toFixed(1)} s)`) }
}
async function api0(cuerpo) {
  const h = { 'content-type': 'application/json' }; if (process.env.VERCEL_BYPASS) h['x-vercel-protection-bypass'] = process.env.VERCEL_BYPASS
  if (process.env.VERCEL_SHARE) h.cookie = await cookieCompartir()
  const r = await fetch(BASE + '/api/solo', { method: 'POST', headers: h, body: JSON.stringify(cuerpo) })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { error: t.slice(0, 200) } }
  if (!r.ok) throw new Error(`${cuerpo.accion} → ${r.status}: ${j.error}`); return j
}
// Vista previa protegida: con VERCEL_SHARE (el valor de ?_vercel_share= del enlace para compartir) se pide una vez la cookie de acceso.
let cookieP
const cookieCompartir = () => cookieP ??= fetch(BASE + '/?_vercel_share=' + process.env.VERCEL_SHARE, { redirect: 'manual' })
  .then(r => (r.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ') || Promise.reject(new Error('el enlace para compartir no devolvió cookie')))
const usdcDe = async g => (await HZ.loadAccount(g)).balances.find(b => b.asset_code === 'USDC' && b.asset_issuer === USDC.issuer)?.balance ?? null

console.log(`E2E fase 1 · ${BASE} · ${MONTO} USDC · ${new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })} (hora de Costa Rica)`)
let escrowId, G, libTx
if (process.argv.includes('--cavos')) {
const control = await WebCryptoControlKey.create(); G = control.publicAddress()
const inq = Object.assign(Object.create(CavosStellar.prototype), { address: G, control, adapter: new StellarAdapter({ network: 'stellar-testnet' }), statusValue: 'ready' })
inq.requireControl = inq.requireReadyControl = () => control
console.log('· inquilino desechable:', G)
await crearCuenta(G, '100')   // la tesorería crea la cuenta (sin Friendbot)
anotar('Trustline de USDC del inquilino (addTrustline del kit)', await inq.addTrustline({ code: 'USDC', issuer: USDC.issuer }, { sponsored: false }))
{ // compra de USDC de prueba: el mismo path payment que arma la app, con máximo a gastar, firmado con signXdr
  const q = await (await fetch(`https://horizon-testnet.stellar.org/paths/strict-receive?destination_asset_type=credit_alphanum4&destination_asset_code=USDC&destination_asset_issuer=${USDC.issuer}&destination_amount=${MONTO}&source_assets=native`)).json()
  const precio = Math.min(...q._embedded.records.map(r => Number(r.source_amount))), max = Math.min(60, Math.ceil(precio * 1.1 * 1e7) / 1e7)
  const t = new TransactionBuilder(await HZ.loadAccount(G), { fee: '1000', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: max.toFixed(7), destination: G, destAsset: USDC, destAmount: MONTO.toFixed(7), path: [] })).setTimeout(60).build()
  const firmada = TransactionBuilder.fromXDR(await inq.signXdr(t.toXDR()), Networks.TESTNET)
  anotar(`Compra de ${MONTO} USDC de prueba (máximo ${max} XLM)`, (await HZ.submitTransaction(firmada)).hash)
}
const contrato = randomUUID()
const d = await api({ accion: 'dueno', contrato }); console.log('· dueño de prueba (servidor):', d.dueno); if (d.trustlineTx) anotar('Trustline de USDC del dueño de prueba (servidor)', d.trustlineTx)
const dep = await api({ accion: 'desplegar', contrato, inquilino: G, monto: MONTO }); anotar('Creación del escrow (plataforma) · ' + dep.escrow, dep.tx)
const { unsignedXdr } = await api({ accion: 'fondear', escrow: dep.escrow, inquilino: G })
const fondeo = await api({ accion: 'enviar-deposito', escrow: dep.escrow, signedXdr: await inq.signXdr(unsignedXdr) }); anotar(`Depósito de ${MONTO} USDC (inquilino, signXdr)`, fondeo.tx)
const ap = await api({ accion: 'aprobar', escrow: dep.escrow, huella: 'a'.repeat(64) })
if (ap.evidenciaTx) anotar('Evidencia del acta (plataforma)', ap.evidenciaTx); anotar('Aprobación (dueño de prueba, servidor)', ap.aprobacionTx)
const antes = await usdcDe(G)
libTx = (await api({ accion: 'liberar', escrow: dep.escrow })).tx; anotar('Liberación al inquilino (plataforma)', libTx)
escrowId = dep.escrow
const tx0 = await HZ.transactions().transaction(libTx).call()
console.log(`· Horizon: liberación successful=${tx0.successful} · ledger ${tx0.ledger_attr} · USDC del inquilino ${antes} → ${await usdcDe(G)}`)
} else { // flujo de la app ahora: inquilino y dueño de prueba custodiados por el servidor, USDC desde la tesorería
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join(''), contrato = randomUUID()
  const cp = await api({ accion: 'cuenta-prueba', token, monto: MONTO }); G = cp.inquilino
  console.log(`· inquilino de prueba (servidor): ${G} · USDC ${cp.usdc} · vía ${cp.via}`)
  if (cp.trustlineTx) anotar('Trustline de USDC del inquilino de prueba (servidor)', cp.trustlineTx); if (cp.compraTx) anotar(`USDC de prueba al inquilino (${cp.via})`, cp.compraTx)
  const d = await api({ accion: 'dueno', contrato }); console.log('· dueño de prueba (servidor):', d.dueno); if (d.trustlineTx) anotar('Trustline de USDC del dueño de prueba (servidor)', d.trustlineTx)
  const dep = await api({ accion: 'desplegar', contrato, inquilino: G, monto: MONTO }); escrowId = dep.escrow; anotar('Creación del escrow (plataforma) · ' + dep.escrow, dep.tx)
  anotar(`Depósito de ${MONTO} USDC (inquilino de prueba, servidor)`, (await api({ accion: 'fondear-prueba', escrow: dep.escrow, token })).tx)
  const ap = await api({ accion: 'aprobar', escrow: dep.escrow }); if (ap.evidenciaTx) anotar('Evidencia (plataforma)', ap.evidenciaTx); anotar('Aprobación (dueño de prueba, servidor)', ap.aprobacionTx)
  const antes = await usdcDe(G)
  libTx = (await api({ accion: 'liberar', escrow: dep.escrow })).tx; anotar('Liberación al inquilino (plataforma)', libTx)
  console.log(`· USDC del inquilino de prueba ${antes} → ${await usdcDe(G)}`)
}
const tx = await HZ.transactions().transaction(libTx).call()
console.log(`· Horizon: liberación successful=${tx.successful} · ledger ${tx.ledger_attr} · ${tx.created_at} (UTC)`)
// validaciones negativas por los endpoints reales
for (const [nombre, cuerpo] of [['monto sobre el tope', { accion: 'desplegar', contrato: randomUUID(), inquilino: G, monto: 20.5 }], ['liberar dos veces', { accion: 'liberar', escrow: escrowId }], ['acción no permitida', { accion: 'transferir' }]])
  try { await api(cuerpo); console.log('✘ NO se rechazó:', nombre); process.exitCode = 1 } catch (e) { console.log(`✔ rechazado (${nombre}): ${String(e.message).slice(0, 120)}`) }
console.log('\nRESUMEN · escrow ' + escrowId); pasos.forEach(([p, h], i) => console.log(`${i + 1}. ${p}: ${enlace(h)}`))
if (!tx.successful) process.exitCode = 1
