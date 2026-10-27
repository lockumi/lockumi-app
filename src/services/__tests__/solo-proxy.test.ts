import { describe, it, expect, beforeEach } from 'vitest'
import { Keypair, Account, TransactionBuilder, Operation, Networks, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { atenderSolo, conReintento, hmacSha256, configSolo, duenoDe, inquilinoPruebaDe, permisoDe, limitar, reiniciarLimites, type Entorno, type Escrow } from '../../../api/_lib/solo'
import { PASSPHRASE_TESTNET, PASSPHRASE_MAINNET, TOPE_USDC, MONTO_MAX_USDC, montoValido, mensajeSaldoPropio, exigirTestnet, USDC } from '../../../api/_lib/red'
import { TEXTO_ONCHAIN } from '../../../api/_lib/tw'

const P = Keypair.random(), SEED = 'semilla-de-prueba-'.padEnd(48, 'x')
const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave-de-prueba', LOCKUMI_TW_PLATAFORMA_SECRET: P.secret(), LOCKUMI_DEMO_SEED: SEED }
const C = configSolo(ENV)
const ID = '11111111-2222-4333-8444-555555555555', ESC = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
const INQ = Keypair.random(), DUENO = duenoDe(C, ID)
const xdrDe = (origen: string, metodo: string, contrato = ESC) => new TransactionBuilder(new Account(origen, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: contrato, function: metodo, args: [new Address(origen).toScVal(), nativeToScVal(1, { type: 'i128' })] }))
  .setTimeout(60).build()
const escrow = (x: Partial<Escrow> = {}): Escrow => ({ contractId: ESC, signer: P.publicKey(), engagementId: ID, title: TEXTO_ONCHAIN, amount: 2, balance: 0,
  roles: { approver: DUENO.publicKey(), serviceProvider: P.publicKey(), platformAddress: P.publicKey(), releaseSigner: P.publicKey(), disputeResolver: P.publicKey(), receiver: INQ.publicKey() },
  trustline: { address: USDC.issuer }, milestones: [{ status: 'Pending', approved: false }], flags: { disputed: false, released: false, resolved: false }, inconsistencies: { inconsistencyFound: false }, ...x })

function simular(e: Escrow = escrow(), usdc: string | null = '5') {
  const llamadas: { url: string; cuerpo?: Record<string, unknown> }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body && String(init.body).startsWith('{') ? JSON.parse(String(init.body)) : undefined; llamadas.push({ url, cuerpo })
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.includes('/helper/get-escrow-by-contract-ids')) return ok([e])
    if (url.endsWith('/helper/send-transaction')) return ok({ status: 'SUCCESS', contractId: ESC })
    if (url.endsWith('/deployer/single-release')) return ok({ unsignedTransaction: new TransactionBuilder(new Account(P.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.invokeContractFunction({ contract: ESC, function: 'deploy', args: [] })).setTimeout(60).build().toXDR() })
    if (url.endsWith('fund-escrow')) return ok({ unsignedTransaction: xdrDe(String(cuerpo!.signer), 'fund_escrow').toXDR() })
    if (url.endsWith('change-milestone-status')) return ok({ unsignedTransaction: xdrDe(P.publicKey(), 'change_milestone_status').toXDR() })
    if (url.endsWith('approve-milestone')) return ok({ unsignedTransaction: xdrDe(String(cuerpo!.approver), 'approve_milestone').toXDR() })
    if (url.endsWith('release-funds')) return ok({ unsignedTransaction: xdrDe(P.publicKey(), 'release_funds').toXDR() })
    if (url.endsWith('dispute-escrow')) return ok({ unsignedTransaction: xdrDe(String(cuerpo!.signer), 'dispute_escrow').toXDR() })
    if (url.endsWith('resolve-dispute')) return ok({ unsignedTransaction: xdrDe(String(cuerpo!.disputeResolver), 'resolve_dispute').toXDR() })
    if (url.includes('horizon-testnet.stellar.org/accounts/')) return ok({ id: url.split('/').pop(), sequence: '1', balances: usdc === null ? [] : [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer, balance: usdc }] })
    if (url.endsWith('/transactions')) return ok({ hash: 'ab'.repeat(32) })
    return new Response('no', { status: 404 })
  }) as typeof fetch
  return { f, llamadas }
}
const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
const ir = (p: Record<string, unknown>, s = simular(), ip = '1.2.3.4') => atenderSolo(ENV, p as never, ip, s.f, { espera: 0 })
beforeEach(() => reiniciarLimites())

describe('fase 1 · solo testnet (condición 2 de Legal)', () => {
  it('el passphrase fijo es el de testnet', () => { expect(PASSPHRASE_TESTNET).toBe(Networks.TESTNET); expect(PASSPHRASE_TESTNET).not.toBe(PASSPHRASE_MAINNET) })
  it('rechaza el passphrase de la red principal', () => expect(() => configSolo({ ...ENV, STELLAR_NETWORK_PASSPHRASE: Networks.PUBLIC })).toThrow(/red de prueba/))
  it('rechaza la API de Trustless Work de mainnet', () => expect(() => configSolo({ ...ENV, TRUSTLESS_WORK_BASE_URL: 'https://api.trustlesswork.com' })).toThrow())
  it('rechaza Horizon de mainnet', () => expect(() => configSolo({ ...ENV, HORIZON_URL: 'https://horizon.stellar.org' })).toThrow())
  it('exigirTestnet solo acepta servicios de testnet', () => {
    expect(() => exigirTestnet(PASSPHRASE_TESTNET, 'https://dev.api.trustlesswork.com', 'https://horizon-testnet.stellar.org')).not.toThrow()
    expect(() => exigirTestnet(PASSPHRASE_MAINNET)).toThrow(); expect(() => exigirTestnet(PASSPHRASE_TESTNET, 'https://api.trustlesswork.com')).toThrow()
    expect(() => exigirTestnet(PASSPHRASE_TESTNET, 'https://dev.api.trustlesswork.com.evil.com')).toThrow()
  })
  it('todas las llamadas salientes van a servicios de testnet', async () => {
    const s = simular(); await ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2 }, s)
    for (const l of s.llamadas) expect(l.url).toMatch(/^https:\/\/(dev\.api\.trustlesswork\.com|horizon-testnet\.stellar\.org)\//)
  })
  it('una transacción armada para la red principal se interpreta con el passphrase de testnet (su firma no vale)', async () => {
    const t = new TransactionBuilder(new Account(INQ.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.PUBLIC })
      .addOperation(Operation.invokeContractFunction({ contract: ESC, function: 'fund_escrow', args: [] })).setTimeout(60).build(); t.sign(INQ)
    // leerTx usa siempre el passphrase de testnet: el origen se lee igual, pero la firma no vale en testnet y el hash es otro
    const r = await ir({ accion: 'enviar-deposito', escrow: ESC, signedXdr: t.toXDR() })
    expect(r.tx).not.toBe(hex(t.hash()))
  })
})

describe('tope de 20 USDC solo para los USDC de Lockumi; con cuenta propia, el saldo real (máximo 50 000)', () => {
  it('montoValido', () => {
    expect(TOPE_USDC).toBe(20); expect(MONTO_MAX_USDC).toBe(50_000)
    for (const m of [20, 0.5, 1e-7]) expect(montoValido(m, TOPE_USDC)).toBe(true); for (const m of [20.0000001, 21, 0, -1, NaN, Infinity, '5', 1e-8]) expect(montoValido(m, TOPE_USDC)).toBe(false)
    for (const m of [50_000, 500, 1000]) expect(montoValido(m)).toBe(true); expect(montoValido(50_000.01)).toBe(false)
  })
  it('cuenta propia: desplegar 500 pasa si el saldo real alcanza; si no, mensaje claro; más de 50 000 se rechaza', async () => {
    const s = simular(escrow(), '600'); await ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 500 }, s)
    expect(s.llamadas.find(l => l.url.endsWith('/deployer/single-release'))!.cuerpo!.amount).toBe(500)
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 500, origen: 'propia' }, simular(escrow(), '50'))).rejects.toThrow('Tu cuenta tiene 50,00 USDC de prueba y el depósito es de 500,00. Carga más USDC de prueba en tu cuenta y vuelve a tocar el botón.')
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 50_001 }, simular(escrow(), '60000'))).rejects.toThrow(/máximo 50/)
  })
  it('cuenta propia: fondear arma el depósito de 500 para la dirección de la persona y revisa su saldo', async () => {
    const r = await ir({ accion: 'fondear', escrow: ESC, inquilino: INQ.publicKey() }, simular(escrow({ amount: 500 }), '500'))
    expect(typeof r.unsignedXdr).toBe('string')
    await expect(ir({ accion: 'fondear', escrow: ESC, inquilino: INQ.publicKey() }, simular(escrow({ amount: 500 }), '499.5'))).rejects.toThrow(/Tu cuenta tiene 499,50 USDC de prueba/)
    await expect(ir({ accion: 'fondear', escrow: ESC, inquilino: INQ.publicKey() }, simular(escrow({ amount: 60_000 }), '70000'))).rejects.toThrow(/máximo/)
  })
  it('con «Obtener USDC de prueba» (tesorería) el depósito sigue con tope de 20', async () => {
    const T = 'e'.repeat(64), e = escrow({ amount: 50 }); e.roles = { ...e.roles, receiver: inquilinoPruebaDe(C, T).publicKey() }
    const s = simular(e, '500')
    await expect(ir({ accion: 'fondear-prueba', escrow: ESC, token: T }, s)).rejects.toThrow(/máximo 20 USDC de prueba/)
    expect(s.llamadas.filter(l => l.url.endsWith('/transactions'))).toHaveLength(0)
  })
  it('mensaje al crear con cuenta propia', () => expect(mensajeSaldoPropio(12.5)).toBe('Tu cuenta tiene 12,50 USDC de prueba. Escribe un monto de 12,50 o menos, o usa «Obtener USDC de prueba».'))
  it('la tesorería envía al inquilino de prueba solo lo que falta, sin pasar del tope', async () => {
    const s = simular(escrow(), '500'); const llam = s.llamadas
    const f = (async (url: string, init?: RequestInit) => url.includes('/accounts/') && !url.includes(P.publicKey())
      ? new Response(JSON.stringify({ id: url.split('/').pop(), sequence: '1', balances: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer, balance: '3' }] }))
      : s.f(url, init)) as typeof fetch
    const r = await atenderSolo(ENV, { accion: 'cuenta-prueba', token: 'c'.repeat(64), monto: 20 }, 'ip', f)
    expect(r.via).toBe('tesoreria')
    const env = llam.filter(l => l.url.endsWith('/transactions'))
    expect(env).toHaveLength(1)
    await expect(ir({ accion: 'cuenta-prueba', token: 'c'.repeat(64), monto: 25 })).rejects.toThrow(/hasta 20/)
  })
  it('el cliente no deposita más del máximo y no pide más de 20 a Lockumi', async () => {
    const { depositar, obtenerUsdc } = await import('../solo')
    await expect(depositar(ID, 50_001)).rejects.toThrow(/máximo 50/); await expect(obtenerUsdc(25)).rejects.toThrow(/hasta 20/)
  })
})

// Caso del 20/10/2026 (Katherine, con sesión de Google): la pestaña se abrió antes de publicar la recarga automática y su app vieja
// pidió crear la cuenta segura sin recargar la cuenta de prueba en 0. Ahora el servidor recarga él mismo en la ruta de Lockumi.
describe('desplegar con «USDC de prueba de Lockumi»: el servidor completa la cuenta de prueba antes de revisar el saldo', () => {
  const T = 'd'.repeat(64), G = inquilinoPruebaDe(C, T).publicKey()
  /** Horizon simulado: la cuenta de prueba empieza con `inicial` USDC y sube cuando la tesorería le paga. */
  function conSaldo(inicial: string) {
    const s = simular(escrow(), '300'); let saldo = inicial; const pagos: string[] = []
    const f = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/accounts/' + G)) return new Response(JSON.stringify({ id: G, sequence: '1', balances: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer, balance: saldo }] }))
      if (url.endsWith('/transactions') && init?.body) { const t = TransactionBuilder.fromXDR(decodeURIComponent(String(init.body).slice(3)), Networks.TESTNET) as import('@stellar/stellar-sdk').Transaction
        const op = t.operations[0] as { type: string; destination?: string; amount?: string }; if (op.type === 'payment' && op.destination === G) { pagos.push(op.amount!); saldo = String(Number(saldo) + Number(op.amount)) } }
      return s.f(url, init)
    }) as typeof fetch
    return { f, s, pagos }
  }
  it('cuenta ya usada en 0 USDC: la tesorería envía el monto y se crea la cuenta segura', async () => {
    const x = conSaldo('0')
    const r = await atenderSolo(ENV, { accion: 'desplegar', contrato: ID, inquilino: G, monto: 2, origen: 'lockumi', token: T }, 'ip', x.f, { espera: 0 })
    expect(x.pagos).toEqual(['2.0000000']); expect(r.escrow).toBe(ESC); expect(r.compraTx).toBe('ab'.repeat(32))
    expect(x.s.llamadas.some(l => l.url.endsWith('/deployer/single-release'))).toBe(true)
  })
  it('si ya tiene el monto, no envía nada', async () => {
    const x = conSaldo('5')
    const r = await atenderSolo(ENV, { accion: 'desplegar', contrato: ID, inquilino: G, monto: 2, origen: 'lockumi', token: T }, 'ip', x.f, { espera: 0 })
    expect(x.pagos).toEqual([]); expect(r.compraTx).toBeNull()
  })
  it('el token tiene que ser el de esa cuenta de prueba y el monto, de 20 o menos', async () => {
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2, origen: 'lockumi', token: T })).rejects.toThrow(/no coincide.*Recarga la página/)
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: G, monto: 2, origen: 'lockumi' })).rejects.toThrow(/Recarga la página/)
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: G, monto: 25, origen: 'lockumi', token: T })).rejects.toThrow(/máximo 20/)
  })
  it('pestaña con la versión vieja (sin «origen») y cuenta en 0: explica que hay que recargar la página', async () => {
    await expect(ir({ accion: 'desplegar', contrato: ID, inquilino: G, monto: 2 }, simular(escrow(), '0'))).rejects.toThrow(
      'Tu cuenta tiene 0,00 USDC de prueba y el depósito es de 2,00. Lockumi se actualizó: recarga esta página y vuelve a tocar «Pagar». Así Lockumi pone los USDC de prueba en tu cuenta antes de crear el depósito.')
  })
})

describe('fase 1 · sin datos personales en la cadena (condición 4)', () => {
  it('el título y la descripción son fijos y el engagementId es el uuid', async () => {
    const s = simular(); await ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2, direccion: 'Calle 5, casa 12, Escazú' }, s)
    const c = s.llamadas.find(l => l.url.endsWith('/deployer/single-release'))!.cuerpo!
    expect(c.title).toBe(TEXTO_ONCHAIN); expect(c.description).toBe(TEXTO_ONCHAIN); expect(c.engagementId).toBe(ID)
    expect(JSON.stringify(c)).not.toMatch(/Escaz|Calle|@/)
    expect((c.roles as Record<string, string>).approver).toBe(DUENO.publicKey()); expect((c.roles as Record<string, string>).receiver).toBe(INQ.publicKey())
  })
  it('la evidencia lleva solo texto fijo y la huella SHA-256', async () => {
    const s = simular(escrow({ balance: 2 })); await ir({ accion: 'aprobar', escrow: ESC, huella: 'f'.repeat(64) }, s)
    expect(s.llamadas.find(l => l.url.endsWith('change-milestone-status'))!.cuerpo!.newEvidence).toBe('Acta de salida firmada por ambas partes · sha256:' + 'f'.repeat(64))
    await expect(ir({ accion: 'aprobar', escrow: ESC, huella: 'ana@correo.com' }, simular(escrow({ balance: 2 })))).rejects.toThrow(/huella/)
  })
})

describe('fase 1 · llaves solo en el servidor (condición 1)', () => {
  it('HMAC-SHA256 coincide con el vector de RFC 4231 (caso 2)', () => {
    const e = new TextEncoder()
    expect(hex(hmacSha256(e.encode('Jefe'), e.encode('what do ya want for nothing?')))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')
  })
  it('las cuentas de prueba se derivan de la semilla del servidor, por contrato y rol', () => {
    expect(duenoDe(C, ID).publicKey()).toBe(duenoDe(configSolo(ENV), ID).publicKey())
    expect(duenoDe(C, ID).publicKey()).not.toBe(duenoDe(C, '11111111-2222-4333-8444-555555555556').publicKey())
    expect(duenoDe(C, ID).publicKey()).not.toBe(duenoDe({ seed: 'otra-semilla'.padEnd(40, 'y') }, ID).publicKey())
    expect(inquilinoPruebaDe(C, 'a'.repeat(64)).publicKey()).not.toBe(duenoDe(C, 'a'.repeat(64)).publicKey())
  })
  it('ninguna respuesta lleva llaves secretas ni la semilla', async () => {
    const respuestas = [
      await ir({ accion: 'dueno', contrato: ID }, simular(escrow(), null)),
      await ir({ accion: 'cuenta-prueba', token: 'b'.repeat(64) }, simular(escrow(), '500')),
      await ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2 }),
      await ir({ accion: 'fondear', escrow: ESC, inquilino: INQ.publicKey() }),
      await ir({ accion: 'aprobar', escrow: ESC }, simular(escrow({ balance: 2 }))),
      await ir({ accion: 'liberar', escrow: ESC }, simular(escrow({ balance: 2, milestones: [{ status: 'Completed', approved: true }] }))),
    ]
    const j = JSON.stringify(respuestas)
    expect(j).not.toMatch(/S[A-Z2-7]{55}/); expect(j).not.toContain(SEED); expect(j).not.toContain('llave-de-prueba')
  })
  it('falta la semilla → 503 sin firmar nada', () => expect(() => configSolo({ ...ENV, LOCKUMI_DEMO_SEED: '' })).toThrow(/LOCKUMI_DEMO_SEED/))
})

describe('fase 1 · validaciones contra el escrow', () => {
  it('solo acciones permitidas', async () => { await expect(ir({ accion: 'transferir' })).rejects.toThrow(/no permitida/); await expect(ir({ accion: 'desplegar', contrato: 'no-uuid', inquilino: INQ.publicKey(), monto: 1 })).rejects.toThrow() })
  it('el receiver tiene que ser la billetera que firma el depósito', async () => {
    await expect(ir({ accion: 'fondear', escrow: ESC, inquilino: Keypair.random().publicKey() })).rejects.toThrow(/cuenta que lo recibe/)
    const otro = Keypair.random(), t = xdrDe(otro.publicKey(), 'fund_escrow'); t.sign(otro)
    await expect(ir({ accion: 'enviar-deposito', escrow: ESC, signedXdr: t.toXDR() })).rejects.toThrow(/cuenta que lo recibe/)
    const bien = xdrDe(INQ.publicKey(), 'fund_escrow'); bien.sign(INQ)
    expect((await ir({ accion: 'enviar-deposito', escrow: ESC, signedXdr: bien.toXDR() })).tx).toBe(hex(bien.hash()))
  })
  it('el depósito tiene que ser fund_escrow de ESTE escrow', async () => {
    const t = xdrDe(INQ.publicKey(), 'release_funds'); t.sign(INQ)
    await expect(ir({ accion: 'enviar-deposito', escrow: ESC, signedXdr: t.toXDR() })).rejects.toThrow(/inesperada/)
    const t2 = xdrDe(INQ.publicKey(), 'fund_escrow', 'CDGQH6AANVL7ODVAR6KVPMW7L7N3CQGZRBO6DC7WMNI7CFGXYAQH6H2Z'); t2.sign(INQ)
    await expect(ir({ accion: 'enviar-deposito', escrow: ESC, signedXdr: t2.toXDR() })).rejects.toThrow(/esta cuenta segura/)
  })
  it('un escrow que no creó Lockumi se rechaza', async () => {
    await expect(ir({ accion: 'liberar', escrow: ESC }, simular(escrow({ signer: Keypair.random().publicKey() })))).rejects.toThrow(/no es de Lockumi/)
    await expect(ir({ accion: 'aprobar', escrow: ESC }, simular(escrow({ balance: 2, roles: { ...escrow().roles, approver: Keypair.random().publicKey() } })))).rejects.toThrow(/dueño de prueba/)
  })
  it('aprobar exige el depósito completo', () => expect(ir({ accion: 'aprobar', escrow: ESC })).rejects.toThrow(/depósito completo/))
  it('la liberación solo va después de la aprobación', async () => {
    await expect(ir({ accion: 'liberar', escrow: ESC }, simular(escrow({ balance: 2 })))).rejects.toThrow(/aprobar la devolución/)
    await expect(ir({ accion: 'liberar', escrow: ESC }, simular(escrow({ balance: 0, flags: { released: true, disputed: false, resolved: false }, milestones: [{ status: 'Completed', approved: true }] })))).rejects.toThrow(/ya se devolvió/)
    const r = await ir({ accion: 'liberar', escrow: ESC }, simular(escrow({ balance: 2, milestones: [{ status: 'Completed', approved: true }] })))
    expect(r.receiver).toBe(INQ.publicKey())
  })
  it('la aprobación la firma el dueño de prueba y la evidencia la plataforma', async () => {
    const s = simular(escrow({ balance: 2 })); await ir({ accion: 'aprobar', escrow: ESC }, s)
    const enviadas = s.llamadas.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => TransactionBuilder.fromXDR(String(l.cuerpo!.signedXdr), Networks.TESTNET) as unknown as { source: string })
    expect(enviadas.map(t => t.source)).toEqual([P.publicKey(), DUENO.publicKey()])
  })
  it('límite de frecuencia por IP', () => {
    for (let i = 0; i < 12; i++) limitar('9.9.9.9', 'desplegar', 1000 + i)
    expect(() => limitar('9.9.9.9', 'desplegar', 2000)).toThrow(/muchas solicitudes/)
    expect(() => limitar('8.8.8.8', 'desplegar', 2000)).not.toThrow()
    for (let i = 0; i < 60; i++) limitar('7.7.7.7', 'fondear', 1000 + i)
    expect(() => limitar('7.7.7.7', 'fondear', 2000)).toThrow(/muchas solicitudes/)
    expect(() => limitar('7.7.7.7', 'fondear', 1000 + 11 * 60_000)).not.toThrow()
  })
})

describe('parte 2 · reclamo y reparto en la cuenta segura', () => {
  const enviadas = (s: ReturnType<typeof simular>) => s.llamadas.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => TransactionBuilder.fromXDR(String(l.cuerpo!.signedXdr), Networks.TESTNET) as unknown as { source: string })
  const PER = { permiso: permisoDe(C, ESC) }
  it('el reclamo lo firma el dueño de prueba y solo con el depósito completo', async () => {
    await expect(ir({ accion: 'disputar', escrow: ESC, ...PER })).rejects.toThrow(/depósito completo/)
    const s = simular(escrow({ balance: 2 })); expect((await ir({ accion: 'disputar', escrow: ESC, ...PER }, s)).tx).toMatch(/^[0-9a-f]{64}$/)
    expect(enviadas(s).map(t => t.source)).toEqual([DUENO.publicKey()])
    expect(await ir({ accion: 'disputar', escrow: ESC, ...PER }, simular(escrow({ balance: 2, flags: { disputed: true, released: false, resolved: false } })))).toEqual({ yaDisputado: true })
  })
  it('el reparto lo firma la plataforma, suma el saldo y no se repite', async () => {
    await expect(ir({ accion: 'resolver', escrow: ESC, alDueno: 1, reclamado: 2, ...PER }, simular(escrow({ balance: 2 })))).rejects.toThrow(/reclamo abierto/)
    const disputado = escrow({ balance: 2, flags: { disputed: true, released: false, resolved: false } })
    await expect(ir({ accion: 'resolver', escrow: ESC, alDueno: 2.5, reclamado: 2, ...PER }, simular(disputado))).rejects.toThrow(/más de lo que reclamó/)
    const s = simular(disputado); const r = await ir({ accion: 'resolver', escrow: ESC, alDueno: 0.4, reclamado: 2, ...PER }, s)
    expect(r).toMatchObject({ alDueno: 0.4, alInquilino: 1.6 }); expect(enviadas(s).map(t => t.source)).toEqual([P.publicKey()])
    const cuerpo = s.llamadas.find(l => l.url.endsWith('resolve-dispute'))!.cuerpo!
    expect(cuerpo.distributions).toEqual([{ address: DUENO.publicKey(), amount: 0.4 }, { address: INQ.publicKey(), amount: 1.6 }])
    const todo = simular(disputado); await ir({ accion: 'resolver', escrow: ESC, alDueno: 0, reclamado: 2, ...PER }, todo)
    expect(todo.llamadas.find(l => l.url.endsWith('resolve-dispute'))!.cuerpo!.distributions).toEqual([{ address: INQ.publicKey(), amount: 2 }])
    expect(await ir({ accion: 'resolver', escrow: ESC, alDueno: 1, reclamado: 2, ...PER }, simular(escrow({ balance: 0, flags: { disputed: true, released: false, resolved: true } })))).toEqual({ yaResuelto: true })
  })
})
describe('parte 2 · concurrencia (tx_bad_seq)', () => {
  it('reintenta con una transacción nueva si la secuencia quedó vieja, y se detiene ante otros errores', async () => {
    const s = simular(escrow({ balance: 2, milestones: [{ status: 'Completed', approved: true }] })); let fallas = 1
    const f = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/helper/send-transaction') && fallas-- > 0) return new Response(JSON.stringify({ message: 'Your transaction submission request has timed out' }), { status: 400 })
      if (url.includes('horizon-testnet.stellar.org/accounts/')) return new Response(JSON.stringify({ id: url.split('/').pop(), sequence: '9', balances: [] }))   // la secuencia ya la usó otra
      return s.f(url, init)
    }) as typeof fetch
    expect((await atenderSolo(ENV, { accion: 'liberar', escrow: ESC }, '5.5.5.5', f, { espera: 0 })).tx).toMatch(/^[0-9a-f]{64}$/)
    expect(s.llamadas.filter(l => l.url.endsWith('release-funds')).length).toBe(2)   // la transacción se pidió de nuevo
    let n = 0; await expect(conReintento(async () => { n++; throw new Error('otro error') }, 1)).rejects.toThrow('otro error'); expect(n).toBe(1)
    n = 0; await expect(conReintento(async () => { n++; throw new Error('tx_bad_seq') }, 1, 3)).rejects.toThrow(); expect(n).toBe(3)
  })
})

describe('modo con dos personas (LOCKUMI_DOS_PERSONAS=1): la persona mediadora resuelve los reclamos', () => {
  const M = Keypair.random()
  const ENV2: Entorno = { ...ENV, LOCKUMI_DOS_PERSONAS: '1', LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(), LOCKUMI_TW_MEDIADOR_SECRET: M.secret() }
  const enviadas = (s: ReturnType<typeof simular>) => s.llamadas.filter(l => l.url.endsWith('/helper/send-transaction')).map(l => TransactionBuilder.fromXDR(String(l.cuerpo!.signedXdr), Networks.TESTNET) as unknown as { source: string })
  it('sin el interruptor, todo sigue igual: resuelve la plataforma', () => {
    expect(configSolo(ENV).R).toBe(P.publicKey())
    expect(configSolo({ ...ENV, LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey(), LOCKUMI_TW_MEDIADOR_SECRET: M.secret() }).R).toBe(P.publicKey())
  })
  it('con el interruptor, la cuenta que resuelve disputas es la de la persona mediadora', () => expect(configSolo(ENV2).R).toBe(M.publicKey()))
  it('con el interruptor, faltar la cuenta o su llave lo dice claro', () => {
    expect(() => configSolo({ ...ENV, LOCKUMI_DOS_PERSONAS: '1' })).toThrow(/LOCKUMI_TW_MEDIADOR_PUBLICA/)
    expect(() => configSolo({ ...ENV, LOCKUMI_DOS_PERSONAS: '1', LOCKUMI_TW_MEDIADOR_PUBLICA: M.publicKey() })).toThrow(/LOCKUMI_TW_MEDIADOR_SECRET/)
    expect(() => configSolo({ ...ENV2, LOCKUMI_TW_MEDIADOR_SECRET: Keypair.random().secret() })).toThrow(/no coincide/)
  })
  it('el depósito nuevo nombra a la persona mediadora como disputeResolver', async () => {
    const s = simular(); await atenderSolo(ENV2, { accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2 } as never, '1.2.3.4', s.f, { espera: 0 })
    const roles = s.llamadas.find(l => l.url.endsWith('/deployer/single-release'))!.cuerpo!.roles as Record<string, string>
    expect(roles.disputeResolver).toBe(M.publicKey()); expect(roles.platformAddress).toBe(P.publicKey())
  })
  it('el reparto lo firma la persona mediadora', async () => {
    const e = escrow({ balance: 2, flags: { disputed: true, released: false, resolved: false } })
    e.roles.disputeResolver = M.publicKey()
    const s = simular(e); await atenderSolo(ENV2, { accion: 'resolver', escrow: ESC, alDueno: 0.4, reclamado: 1, permiso: permisoDe(configSolo(ENV2), ESC) } as never, '1.2.3.4', s.f, { espera: 0 })
    expect(s.llamadas.find(l => l.url.endsWith('resolve-dispute'))!.cuerpo!.disputeResolver).toBe(M.publicKey())
    expect(enviadas(s).map(t => t.source)).toEqual([M.publicKey()])
  })
  it('un depósito de antes del interruptor (disputeResolver = plataforma) lo sigue repartiendo la plataforma (bug 26/10: Error #12)', async () => {
    const e = escrow({ balance: 1, amount: 1, flags: { disputed: true, released: false, resolved: false } })
    const s = simular(e); const r = await atenderSolo(ENV2, { accion: 'resolver', escrow: ESC, alDueno: 0.5, reclamado: 1, permiso: permisoDe(configSolo(ENV2), ESC) } as never, '1.2.3.4', s.f, { espera: 0 })
    const cuerpo = s.llamadas.find(l => l.url.endsWith('resolve-dispute'))!.cuerpo!
    expect(cuerpo.disputeResolver).toBe(P.publicKey()); expect(enviadas(s).map(t => t.source)).toEqual([P.publicKey()])
    expect(cuerpo.distributions).toEqual([{ address: DUENO.publicKey(), amount: 0.5 }, { address: INQ.publicKey(), amount: 0.5 }]); expect(r).toMatchObject({ alDueno: 0.5, alInquilino: 0.5 })
  })
  it('si el disputeResolver no es una cuenta del servidor, no se reparte', async () => {
    const e = escrow({ balance: 1, flags: { disputed: true, released: false, resolved: false } }); e.roles.disputeResolver = Keypair.random().publicKey()
    const s = simular(e)
    await expect(atenderSolo(ENV2, { accion: 'resolver', escrow: ESC, alDueno: 0.5, reclamado: 1, permiso: permisoDe(configSolo(ENV2), ESC) } as never, '1.2.3.4', s.f, { espera: 0 })).rejects.toMatchObject({ estado: 403 })
    expect(s.llamadas.some(l => l.url.endsWith('resolve-dispute'))).toBe(false)
  })
})

// Legal (25/10, 1:24 a. m.): /api/solo «resolver» solo para quien está autorizado y solo con repartos de la fase 1.
// Modelo de un aparato: el navegador que creó el depósito. Prueba de eso: el «permiso» que devuelve «desplegar» (HMAC de la semilla
// del servidor con el escrow) o, en los depósitos con «USDC de prueba de Lockumi», el token de la cuenta de prueba que recibe el depósito.
// Repartos de la fase 1 (Términos 1.7-demo 6.3 e y f, 6.6, 6.7; repartoValido): el dueño recibe entre 0 y lo reclamado, y lo
// reclamado no supera el depósito; el inquilino recibe el resto.
describe('A1 · /api/solo resolver: solo el aparato autorizado y solo repartos de la fase 1', () => {
  const disputado = () => escrow({ balance: 2, flags: { disputed: true, released: false, resolved: false } })
  const resolvio = (s: ReturnType<typeof simular>) => s.llamadas.some(l => l.url.endsWith('resolve-dispute'))
  const TOKEN = 'ab'.repeat(32)
  it('«desplegar» devuelve el permiso de ese escrow (64 hex, distinto por escrow, sin llaves ni semilla)', async () => {
    const r = await ir({ accion: 'desplegar', contrato: ID, inquilino: INQ.publicKey(), monto: 2 })
    expect(r.permiso).toBe(permisoDe(C, ESC)); expect(r.permiso).toMatch(/^[0-9a-f]{64}$/)
    expect(permisoDe(C, 'C'.padEnd(56, 'A'))).not.toBe(r.permiso)
    expect(JSON.stringify(r)).not.toContain(SEED); expect(JSON.stringify(r)).not.toContain(P.secret())
    expect(permisoDe(configSolo({ ...ENV, LOCKUMI_DEMO_SEED: 'otra-semilla-'.padEnd(48, 'y') }), ESC)).not.toBe(r.permiso)
  })
  it('sin permiso ni token, o con uno ajeno, no reparte (403) y no llama a Trustless Work', async () => {
    for (const auth of [{}, { permiso: '0'.repeat(64) }, { permiso: permisoDe(C, 'C'.padEnd(56, 'B')) }, { token: TOKEN }, { permiso: 'x' }]) {
      const s = simular(disputado())
      await expect(ir({ accion: 'resolver', escrow: ESC, alDueno: 0.4, reclamado: 1, ...auth }, s)).rejects.toMatchObject({ estado: 403 })
      expect(resolvio(s)).toBe(false)
    }
  })
  it('con el token de la cuenta de prueba que recibe el depósito (depósitos ya creados con «USDC de prueba de Lockumi»), sí reparte', async () => {
    const e = disputado(); e.roles.receiver = inquilinoPruebaDe(C, TOKEN).publicKey()
    const s = simular(e); const r = await ir({ accion: 'resolver', escrow: ESC, alDueno: 0.5, reclamado: 1, token: TOKEN }, s)
    expect(r).toMatchObject({ alDueno: 0.5, alInquilino: 1.5 }); expect(resolvio(s)).toBe(true)
  })
  it('el dueño nunca recibe más de lo reclamado; lo reclamado es mayor que 0 y no supera el depósito', async () => {
    const PER = { permiso: permisoDe(C, ESC) }
    for (const [alDueno, reclamado] of [[1.5, 1], [-0.1, 1], [0.5, 0], [0.5, 2.5], [0.5, undefined], [0.5, Number.NaN], [0.12345678, 1]] as const) {
      const s = simular(disputado())
      await expect(ir({ accion: 'resolver', escrow: ESC, alDueno, reclamado, ...PER }, s)).rejects.toMatchObject({ estado: 400 })
      expect(resolvio(s)).toBe(false)
    }
    for (const [alDueno, reclamado] of [[1, 1], [0, 1], [2, 2], [0.25, 0.5]] as const) {
      const s = simular(disputado()); await ir({ accion: 'resolver', escrow: ESC, alDueno, reclamado, ...PER }, s); expect(resolvio(s)).toBe(true)
    }
  })
  it('abrir el reclamo (disputar) también exige el permiso o el token: nadie más bloquea un depósito ajeno', async () => {
    const s = simular(escrow({ balance: 2 }))
    await expect(ir({ accion: 'disputar', escrow: ESC }, s)).rejects.toMatchObject({ estado: 403 })
    expect(s.llamadas.some(l => l.url.endsWith('dispute-escrow'))).toBe(false)
    expect((await ir({ accion: 'disputar', escrow: ESC, permiso: permisoDe(C, ESC) }, simular(escrow({ balance: 2 })))).tx).toMatch(/^[0-9a-f]{64}$/)
  })
})
