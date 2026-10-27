// ¿Puede la billetera de Cavos firmar XDR de Soroban hechas por otro (como las que devuelve Trustless Work)?
// Prueba en Stellar testnet con cuentas DESECHABLES (nunca billeteras de usuarios):
//   - Clave de control de Cavos local (WebCryptoControlKey, la misma clase que usa el kit) como dueña de la cuenta G.
//   - La XDR la arma "otro" (simulada y preparada con el RPC, igual que una API), y se firma con el método REAL
//     CavosStellar.prototype.signXdr de @cavos/kit 0.4.2 (en producción lo único distinto es que la clave vive en el vault).
// Uso: node scripts/probar-firma-cavos.mjs
import { CavosStellar } from '@cavos/kit/stellar'
import { WebCryptoControlKey } from '../node_modules/@cavos/kit/dist/chunk-CEOXXKEN.mjs' // misma clase que usa el kit (no se exporta)
import { crearCuenta } from './crear-cuenta-testnet.mjs'
import { Keypair, Networks, rpc, TransactionBuilder, Operation, Asset, Address, nativeToScVal, BASE_FEE, Horizon } from '@stellar/stellar-sdk'
const RPC = new rpc.Server('https://soroban-testnet.stellar.org'); const HZ = new Horizon.Server('https://horizon-testnet.stellar.org')
const fondear = g => crearCuenta(g, '100')   // la tesorería crea la cuenta (sin Friendbot; LOCKUMI_TW_PLATAFORMA_SECRET en el entorno)
const control = await WebCryptoControlKey.create(); const G = control.publicAddress()
const otra = Keypair.random()
console.log('Cuenta Cavos (desechable):', G, '\nCuenta B (desechable):     ', otra.publicKey())
await Promise.all([fondear(G), fondear(otra.publicKey())])
const billetera = Object.assign(Object.create(CavosStellar.prototype), { address: G, control,
  adapter: { passphrase: Networks.TESTNET, latestLedger: async () => (await RPC.getLatestLedger()).sequence } })
billetera.requireControl = () => control
const XLM_SAC = Asset.native().contractId(Networks.TESTNET)
async function armar(origen, de, a, cantidad) {   // como lo haría una API: invoca, simula y prepara; devuelve la XDR sin firmar
  const cuenta = await RPC.getAccount(origen)
  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.invokeContractFunction({ contract: XLM_SAC, function: 'transfer', args: [new Address(de).toScVal(), new Address(a).toScVal(), nativeToScVal(cantidad, { type: 'i128' })] }))
    .setTimeout(180).build()
  return (await RPC.prepareTransaction(tx)).toXDR()
}
async function enviar(xdrFirmada) {
  const tx = TransactionBuilder.fromXDR(xdrFirmada, Networks.TESTNET); const s = await RPC.sendTransaction(tx)
  if (s.status === 'ERROR') return { ok: false, detalle: s.errorResult?.result().switch().name ?? JSON.stringify(s) }
  for (let i = 0; i < 30; i++) { const r = await RPC.getTransaction(s.hash); if (r.status !== 'NOT_FOUND') return { ok: r.status === 'SUCCESS', hash: s.hash, detalle: r.status }; await new Promise(z => setTimeout(z, 1000)) }
  return { ok: false, hash: s.hash, detalle: 'timeout' }
}
const xA = await armar(G, G, otra.publicKey(), 10_000_000n)
const rA = await enviar(await billetera.signXdr(xA)); console.log('A · origen = cuenta Cavos (modelo Trustless Work):', rA.ok ? 'OK' : 'FALLA', rA.hash ?? '', rA.detalle)
const xB = await armar(otra.publicKey(), G, otra.publicKey(), 10_000_000n)
const tB = TransactionBuilder.fromXDR(await billetera.signXdr(xB), Networks.TESTNET); const n = tB.signatures.length
tB.sign(otra); const rB = await enviar(tB.toXDR())
console.log('B · Cavos firma solo su autorización (otro es origen):', rB.ok ? 'OK' : 'FALLA', rB.hash ?? '', rB.detalle, `(firmas de sobre de signXdr: ${n})`)
const xB2 = await armar(otra.publicKey(), G, otra.publicKey(), 10_000_000n)
const tB2 = TransactionBuilder.fromXDR(await billetera.signXdr(xB2), Networks.TESTNET); tB2.signatures.length = 0; tB2.sign(otra)
const rB2 = await enviar(tB2.toXDR()); console.log('B2 · igual que B sin la firma de sobre sobrante:', rB2.ok ? 'OK' : 'FALLA', rB2.hash ?? '', rB2.detalle)
console.log('Saldo final de la cuenta Cavos:', (await HZ.loadAccount(G)).balances.find(b => b.asset_type === 'native').balance)
