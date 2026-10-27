// Camino feliz COMPLETO contra la API real de testnet de Trustless Work, con cuentas DESECHABLES (ninguna billetera de personas).
//   dueño e inquilino = cuentas Cavos desechables (clave WebCryptoControlKey del kit; firman con el signXdr REAL de @cavos/kit 0.4.2)
//   plataforma        = cuenta de testnet de Lockumi (platformAddress, serviceProvider, releaseSigner, disputeResolver)
// Pasos: cuentas + trustlines → USDC (DEX de testnet, XLM→USDC de Circle) → deploy → depósito → evidencia → aprobación → liberación.
// Uso: node scripts/e2e-testnet-tw.mjs [monto=2]
// Lee la llave de TRUSTLESS_WORK_API_KEY o de /workspace/lockumi/.secrets/trustless-testnet-api-key.txt, y la secreta de la
// plataforma de LOCKUMI_TW_PLATAFORMA_SECRET o de /workspace/lockumi/.secrets/plataforma-testnet.json. No imprime ninguna de las dos.
import { crearCuenta } from './crear-cuenta-testnet.mjs'
import { readFileSync } from 'node:fs'
import { CavosStellar, StellarAdapter } from '@cavos/kit/stellar'
import { WebCryptoControlKey, signTransactionWithControlKey } from '../node_modules/@cavos/kit/dist/chunk-CEOXXKEN.mjs' // mismas clases del kit (no exportadas)
import { Keypair, Asset, Networks, Operation, TransactionBuilder, Horizon, rpc, scValToNative, xdr, BASE_FEE } from '@stellar/stellar-sdk'

const SEC = '/workspace/lockumi/.secrets/'
const LLAVE = (process.env.TRUSTLESS_WORK_API_KEY || readFileSync(SEC + 'trustless-testnet-api-key.txt', 'utf8')).trim()
const PLAT = Keypair.fromSecret((process.env.LOCKUMI_TW_PLATAFORMA_SECRET || JSON.parse(readFileSync(SEC + 'plataforma-testnet.json', 'utf8')).secret).trim())
const TW = 'https://dev.api.trustlesswork.com', HZ = new Horizon.Server('https://horizon-testnet.stellar.org'), RPC = new rpc.Server('https://soroban-testnet.stellar.org')
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'), USDC_K = { code: 'USDC', issuer: USDC.issuer }
const MONTO = Number(process.argv[2] || 2)
const P = PLAT.publicKey(), pasos = []
const enlace = h => 'https://stellar.expert/explorer/testnet/tx/' + h
const anotar = (paso, hash, extra = '') => { pasos.push({ paso, hash }); console.log(`✔ ${paso}\n    ${enlace(hash)}${extra ? '\n    ' + extra : ''}`) }
const limpiar = t => String(t).split(LLAVE).join('[llave]')
const hashDe = x => TransactionBuilder.fromXDR(x, Networks.TESTNET).hash().toString('hex')

async function tw(ruta, cuerpo, metodo = 'POST') {
  const r = await fetch(TW + ruta, { method: metodo, headers: { 'content-type': 'application/json', 'x-api-key': LLAVE }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { texto: t } }
  if (!r.ok) throw new Error(`TW ${ruta} → ${r.status}: ${limpiar(t).slice(0, 500)}`)
  return j
}
async function confirmar(hash) {   // espera a que la red la incluya (Soroban RPC)
  for (let i = 0; i < 40; i++) {
    const r = await RPC.getTransaction(hash)
    if (r.status === 'SUCCESS') return r
    if (r.status === 'FAILED') throw new Error('La transacción falló en la red: ' + hash)
    await new Promise(z => setTimeout(z, 1500))
  }
  throw new Error('Tiempo de espera agotado: ' + hash)
}
async function enviarTw(signedXdr) {
  const r = await tw('/helper/send-transaction', { signedXdr }), h = hashDe(signedXdr)
  if (r.status && r.status !== 'SUCCESS') throw new Error('send-transaction: ' + limpiar(JSON.stringify(r)).slice(0, 400))
  return { r, h, res: await confirmar(h) }
}
const firmaPlataforma = x => { const t = TransactionBuilder.fromXDR(x, Networks.TESTNET); if (t.source !== P) throw new Error('XDR de plataforma con otro origen'); t.sign(PLAT); return t.toXDR() }

async function cuentaCavos(nombre) {
  const control = await WebCryptoControlKey.create(), G = control.publicAddress()
  await crearCuenta(G, '100')   // la tesorería crea la cuenta (sin Friendbot)
  const w = Object.assign(Object.create(CavosStellar.prototype), { address: G, control, adapter: new StellarAdapter({ network: 'stellar-testnet' }), statusValue: 'ready' })
  w.requireControl = w.requireReadyControl = () => control
  console.log(`· ${nombre} (Cavos desechable): ${G}`)
  return w
}
const usdcDe = async g => (await HZ.loadAccount(g)).balances.find(b => b.asset_code === 'USDC' && b.asset_issuer === USDC.issuer)?.balance ?? null
const estadoEscrow = async id => { try { const j = await tw(`/helper/get-escrow-by-contract-ids?contractIds[]=${id}&validateOnChain=true`, null, 'GET'); const e = Array.isArray(j) ? j[0] : j; return e ? { saldo: e.balance, flags: e.flags, hito: e.milestones?.[0] && { status: e.milestones[0].status, approved: e.milestones[0].approved } } : j } catch (e) { return String(e.message).slice(0, 160) } }

console.log(`Camino feliz Trustless Work · testnet · ${MONTO} USDC · ${new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })} (hora de Costa Rica)`)
console.log(`· plataforma: ${P}`)
const dueno = await cuentaCavos('dueño'), inq = await cuentaCavos('inquilino')

// 1) Trustlines de USDC (las exige TW para approver y receiver) con el addTrustline real del kit
anotar('Trustline USDC del dueño (Cavos addTrustline)', await dueno.addTrustline(USDC_K, { sponsored: false }))
anotar('Trustline USDC del inquilino (Cavos addTrustline)', await inq.addTrustline(USDC_K, { sponsored: false }))

// 2) USDC de Circle (testnet) para el inquilino: el faucet de Circle no tiene API pública sin credenciales, así que se compran en el DEX de testnet
{
  const t = new TransactionBuilder(await HZ.loadAccount(inq.address), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: String(Math.ceil(MONTO * 15)), destination: inq.address, destAsset: USDC, destAmount: String(MONTO), path: [] }))
    .setTimeout(60).build()
  await signTransactionWithControlKey(t, inq.control)
  const h = (await HZ.submitTransaction(t)).hash
  anotar(`Inquilino obtiene ${MONTO} USDC (DEX testnet, XLM→USDC de Circle)`, h, `saldo USDC del inquilino: ${await usdcDe(inq.address)}`)
}

// 3) Deploy del escrow (single-release), firma la plataforma
let contractId
{
  const j = await tw('/deployer/single-release', {
    signer: P, engagementId: 'lockumi-e2e-' + Date.now(), title: 'Depósito de garantía Lockumi (prueba e2e)',
    description: 'Prueba e2e en testnet con cuentas desechables. Vuelve al inquilino salvo reclamo.',
    roles: { approver: dueno.address, serviceProvider: P, platformAddress: P, releaseSigner: P, disputeResolver: P, receiver: inq.address },
    amount: MONTO, platformFee: 0, milestones: [{ description: 'Entrega del inmueble sin daños: acta de salida firmada por ambas partes' }],
    trustline: { address: USDC.issuer, symbol: 'USDC' },
  })
  const { r, h, res } = await enviarTw(firmaPlataforma(j.unsignedTransaction))
  contractId = r.contractId ?? r.escrow?.contractId
  if (!contractId && res.returnValue) { try { const v = scValToNative(res.returnValue); contractId = Array.isArray(v) ? v.find(x => typeof x === 'string' && x.startsWith('C')) : v } catch { /* */ } }
  anotar('Deploy del escrow (plataforma)', h, `contractId: ${contractId} · https://stellar.expert/explorer/testnet/contract/${contractId}`)
  if (!/^C[A-Z2-7]{55}$/.test(String(contractId))) throw new Error('No obtuve el contractId. Respuesta de send-transaction: ' + limpiar(JSON.stringify(r)).slice(0, 400))
}

// 4) Depósito: el inquilino firma con signXdr de Cavos
{
  const j = await tw('/escrow/single-release/fund-escrow', { contractId, signer: inq.address, amount: MONTO })
  const { h } = await enviarTw(await inq.signXdr(j.unsignedTransaction))
  anotar(`Depósito de ${MONTO} USDC al escrow (inquilino, Cavos signXdr)`, h, `USDC inquilino: ${await usdcDe(inq.address)} · escrow: ${JSON.stringify(await estadoEscrow(contractId))}`)
}

// 5) Evidencia: la plataforma (serviceProvider) marca el hito como completado
{
  const j = await tw('/escrow/single-release/change-milestone-status', { contractId, milestoneIndex: '0', newStatus: 'Completed', newEvidence: 'Acta de salida firmada por ambas partes (prueba e2e)', serviceProvider: P })
  anotar('Evidencia: hito "Completed" (plataforma)', (await enviarTw(firmaPlataforma(j.unsignedTransaction))).h)
}

// 6) Aprobación: el dueño (approver) firma con signXdr de Cavos
{
  const j = await tw('/escrow/single-release/approve-milestone', { contractId, milestoneIndex: '0', approver: dueno.address })
  anotar('Aprobación de la devolución (dueño, Cavos signXdr)', (await enviarTw(await dueno.signXdr(j.unsignedTransaction))).h)
}

// 7) Liberación: la plataforma (releaseSigner) libera al receiver (inquilino)
{
  const antes = await usdcDe(inq.address)
  const j = await tw('/escrow/single-release/release-funds', { contractId, releaseSigner: P })
  const { h } = await enviarTw(firmaPlataforma(j.unsignedTransaction))
  anotar('Liberación al inquilino (plataforma)', h, `USDC inquilino: ${antes} → ${await usdcDe(inq.address)} · escrow: ${JSON.stringify(await estadoEscrow(contractId))}`)
}
console.log('\nRESUMEN'); pasos.forEach((p, i) => console.log(`${i + 1}. ${p.paso}: ${enlace(p.hash)}`))
