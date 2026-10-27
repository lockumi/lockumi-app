// Crea una cuenta de PRUEBA en Stellar testnet desde la tesorería de Lockumi (createAccount firmado por la plataforma).
// Reemplaza a Friendbot en los scripts (26/10/2026). Necesita en el entorno LOCKUMI_TW_PLATAFORMA_SECRET (la misma variable que
// usa el servidor; nunca se imprime). Solo testnet. Si la cuenta ya existe, no hace nada.
// Uso en un script:  import { crearCuenta } from './crear-cuenta-testnet.mjs';  await crearCuenta(G, '20')
import { Keypair, Networks, Operation, TransactionBuilder, Horizon } from '@stellar/stellar-sdk'
const HZ = new Horizon.Server('https://horizon-testnet.stellar.org')
export async function crearCuenta(g, xlm = '20') {
  const secreto = process.env.LOCKUMI_TW_PLATAFORMA_SECRET?.trim()
  if (!secreto) throw new Error('Falta LOCKUMI_TW_PLATAFORMA_SECRET en el entorno: la tesorería de Lockumi crea las cuentas de prueba (ya no se usa Friendbot).')
  try { await HZ.loadAccount(g); return 'ya existía' } catch (e) { if (e?.response?.status !== 404) throw e }
  const P = Keypair.fromSecret(secreto)
  for (let i = 1; ; i++) {
    const t = new TransactionBuilder(await HZ.loadAccount(P.publicKey()), { fee: '1000', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.createAccount({ destination: g, startingBalance: String(xlm) })).setTimeout(60).build()
    t.sign(P)
    try { await HZ.submitTransaction(t); return `creada con ${xlm} XLM de prueba desde la tesorería` }
    catch (e) { if (i < 4 && /bad_?seq/i.test(JSON.stringify(e?.response?.data?.extras?.result_codes ?? '')) ) { await new Promise(r => setTimeout(r, 300 * i)); continue } throw e }
  }
}
