// Preparación de cuentas para la prueba e2e en Stellar TESTNET (nada de mainnet).
//
//   node scripts/preparar-testnet.mjs --desechable
//       Crea una cuenta desechable, la crea la tesorería (LOCKUMI_TW_PLATAFORMA_SECRET en el entorno) y le abre la trustline de USDC de Circle (testnet).
//       Sirve para ensayar el flujo sin tocar billeteras de nadie.
//   node scripts/preparar-testnet.mjs --revisar G…
//       Solo lectura: dice si la cuenta existe, si tiene trustline de USDC y cuánto USDC y XLM tiene.
//   node scripts/preparar-testnet.mjs --activar G… --confirmo
//       La tesorería crea (con XLM de prueba) una cuenta que YA es de una persona (p. ej. la de Cavos del inquilino). Solo con --confirmo
//       y después de avisarle. La trustline de una cuenta de Cavos NO se puede abrir desde aquí (la llave está en el
//       vault): se abre en la app con el botón "Habilitar USDC de prueba" (wallet.addTrustline).
//
// Ojo: Trustless Work exige que approver (dueño), receiver (inquilino) y platformAddress EXISTAN y tengan trustline de USDC
// antes de desplegar el escrow (si no, responde 400 "could not be validated" / "does not have the required asset").
//
// Después: USDC de prueba en https://faucet.circle.com (Stellar Testnet, 20 USDC cada 2 h), pegando la dirección G….
// Fuentes: https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts
//          https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens
import { crearCuenta } from './crear-cuenta-testnet.mjs'
import { Keypair, Asset, Networks, Operation, TransactionBuilder, Horizon, BASE_FEE } from '@stellar/stellar-sdk'
const HZ = new Horizon.Server('https://horizon-testnet.stellar.org')
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')
const [modo, arg] = process.argv.slice(2), confirmo = process.argv.includes('--confirmo')
const esG = g => /^G[A-Z2-7]{55}$/.test(g ?? '')

const activar = g => crearCuenta(g, '20')
async function revisar(g) {
  try {
    const a = await HZ.loadAccount(g)
    const u = a.balances.find(b => b.asset_code === 'USDC' && b.asset_issuer === USDC.issuer)
    return { existe: true, xlm: a.balances.find(b => b.asset_type === 'native').balance, trustline: !!u, usdc: u?.balance ?? null }
  } catch (e) { if (e?.response?.status === 404) return { existe: false }; throw e }
}
async function trustline(kp) {
  const tx = new TransactionBuilder(await HZ.loadAccount(kp.publicKey()), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: USDC })).setTimeout(60).build()
  tx.sign(kp); return (await HZ.submitTransaction(tx)).hash
}
const faucet = g => `Ahora carga USDC: https://faucet.circle.com → Stellar Testnet → pega ${g} (20 USDC cada 2 h).`

if (modo === '--desechable') {
  const kp = Keypair.random(); console.log('Cuenta desechable:', kp.publicKey())
  console.log('Cuenta:', await activar(kp.publicKey()))
  console.log('Trustline USDC abierta, tx', await trustline(kp))
  console.log('Estado:', await revisar(kp.publicKey())); console.log(faucet(kp.publicKey()))
} else if (modo === '--revisar' && esG(arg)) {
  console.log(await revisar(arg))
} else if (modo === '--activar' && esG(arg)) {
  if (!confirmo) { console.error('Esta cuenta es de una persona. Avísale y vuelve a correrlo con --confirmo.'); process.exit(2) }
  console.log('Cuenta:', await activar(arg)); const r = await revisar(arg); console.log(r)
  console.log(r.trustline ? faucet(arg) : 'Falta la trustline: ábrela en la app con "Habilitar USDC de prueba" (la firma la pide Cavos).')
} else {
  console.log('Uso: --desechable | --revisar G… | --activar G… --confirmo'); process.exit(1)
}
