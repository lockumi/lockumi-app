// Red de prueba (Stellar testnet), por los MISMOS endpoints de la app: cuenta de prueba → dueño → escrow → depósito → aprobación → liberación.
// Comprobación (a): quién es el disputeResolver del escrow nuevo.
// Con el modo de dos personas encendido (LOCKUMI_DOS_PERSONAS=1 en producción desde el 25/10/2026), el esperado es el mediador:
// E2E_RESOLVER=mediador y E2E_MEDIADOR_PUBLICA (secreto LOCKUMI_TW_MEDIADOR_PUBLICA en Actions). Si el secreto no está, el depósito
// y la liberación se comprueban igual y la aserción del resolver falla con un mensaje claro (no se carga el secreto desde este PR).
import { test, expect } from '@playwright/test'
import { randomUUID, randomBytes } from 'node:crypto'
import { rpc, xdr, scValToNative, Address, Horizon } from '@stellar/stellar-sdk'
import { writeFileSync, mkdirSync } from 'node:fs'
const BASE = (process.env.E2E_BASE || 'https://app.lockumi.com').replace(/\/$/, '')
const api = async (cuerpo: object) => {
  // Reintento solo si la conexión se corta antes de la respuesta (red de la máquina de pruebas); los errores HTTP no se reintentan.
  let r: Response | undefined
  for (let i = 0; !r; i++) try { r = await fetch(BASE + '/api/solo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }) } catch (e) { if (i >= 2) throw e; await new Promise(f => setTimeout(f, 3000)) }
  const t = await r.text(); let j: Record<string, string>; try { j = JSON.parse(t) } catch { j = { error: t.slice(0, 200) } }
  if (!r.ok) throw new Error(`${(cuerpo as { accion: string }).accion} → ${r.status}: ${j.error}`); return j
}
const roles = async (id: string) => {
  const s = new rpc.Server('https://soroban-testnet.stellar.org')
  const d = await s.getLedgerEntries(xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({ contract: new Address(id).toScAddress(), key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Escrow')]), durability: xdr.ContractDataDurability.persistent() })))
  return scValToNative(d.entries[0].val.contractData().val()).roles as Record<string, string>
}
test.describe.configure({ mode: 'serial' })
test('depósito y devolución reales en la red de prueba + disputeResolver', async ({ browserName: _navegador }, info) => {
  test.skip(info.project.name !== 'inquilino', 'una sola corrida en la red de prueba por ejecución')
  test.setTimeout(300_000)
  const token = randomBytes(32).toString('hex'), contrato = randomUUID(), MONTO = 2
  const cp = await api({ accion: 'cuenta-prueba', token, monto: MONTO })
  await api({ accion: 'dueno', contrato })
  const dep = await api({ accion: 'desplegar', contrato, inquilino: cp.inquilino, monto: MONTO })
  await api({ accion: 'fondear-prueba', escrow: dep.escrow, token })
  await api({ accion: 'aprobar', escrow: dep.escrow })
  const lib = await api({ accion: 'liberar', escrow: dep.escrow })
  const tx = await new Horizon.Server('https://horizon-testnet.stellar.org').transactions().transaction(lib.tx).call()
  expect(tx.successful).toBe(true)
  for (const c of [{ accion: 'desplegar', contrato: randomUUID(), inquilino: cp.inquilino, monto: 20.5 }, { accion: 'liberar', escrow: dep.escrow }, { accion: 'transferir' }])
    await expect(api(c)).rejects.toThrow()
  const r = await roles(dep.escrow)
  const modoMediador = process.env.E2E_RESOLVER === 'mediador'
  const mediador = process.env.E2E_MEDIADOR_PUBLICA?.trim() || ''
  const esperado = modoMediador ? mediador : r.platform
  const res = { escrow: dep.escrow, liberacion: lib.tx, dispute_resolver: r.dispute_resolver, platform: r.platform, approver: r.approver,
    resolver_es_mediador: mediador ? r.dispute_resolver === mediador : null, modo: modoMediador ? 'mediador' : 'fase 1 (plataforma)' }
  mkdirSync('test-results', { recursive: true }); writeFileSync('test-results/red.json', JSON.stringify(res, null, 2))
  info.annotations.push({ type: 'disputeResolver', description: JSON.stringify(res) })
  if (modoMediador) {
    expect(mediador, 'Falta E2E_MEDIADOR_PUBLICA (secreto LOCKUMI_TW_MEDIADOR_PUBLICA en Actions): la clave pública del mediador. El depósito y la liberación sí se completaron; no se pudo comprobar que el disputeResolver sea el mediador.').toBeTruthy()
  } else {
    expect(esperado, 'el escrow no tiene plataforma').toBeTruthy()
  }
  expect(r.dispute_resolver).toBe(esperado)
})
