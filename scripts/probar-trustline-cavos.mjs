// Prueba con cuenta DESECHABLE: addTrustline real de @cavos/kit 0.4.2 (sin patrocinio) sobre una cuenta creada por la tesorería (LOCKUMI_TW_PLATAFORMA_SECRET en el entorno).
// Uso: node scripts/probar-trustline-cavos.mjs
import { crearCuenta } from './crear-cuenta-testnet.mjs'
import { CavosStellar, StellarAdapter } from '@cavos/kit/stellar'
import { WebCryptoControlKey } from '../node_modules/@cavos/kit/dist/chunk-CEOXXKEN.mjs'
const control = await WebCryptoControlKey.create(); const G = control.publicAddress(); console.log('Cuenta desechable:', G)
const adapter = new StellarAdapter({ network: 'stellar-testnet' })
const w = Object.assign(Object.create(CavosStellar.prototype), { address: G, control, adapter, statusValue: 'ready' })
w.requireReadyControl = () => control
console.log('Cuenta:', await crearCuenta(G, '20'))
const USDC = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }
console.log('addTrustline (sponsored:false):', await w.addTrustline(USDC, { sponsored: false }))
console.log('tokenBalance:', await w.tokenBalance(USDC))
