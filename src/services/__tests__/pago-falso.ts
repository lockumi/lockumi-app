// Paso 22 · lo que el pago idempotente (api/_lib/tw.ts devolverAlInquilino) pide además de TW: el bloqueo en la base
// (20261026000000: lk_tomar_pago, lk_anotar_pago_pendiente, lk_soltar_pago) y el estado del escrow en Trustless Work.
export interface OpcionesPago {
  cid: string; monto: number; receiver: string; releaseSigner: string; disputeResolver: string
  flags?: { disputed?: boolean; released?: boolean; resolved?: boolean }; balance?: number; tomar?: boolean
}
export function pagoFalso(o: OpcionesPago) {
  return (url: string): Response | null => {
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 })
    if (url.endsWith('/rest/v1/rpc/lk_tomar_pago')) return ok(o.tomar ?? true)
    if (url.endsWith('/rest/v1/rpc/lk_anotar_pago_pendiente')) return ok(true)
    if (url.endsWith('/rest/v1/rpc/lk_soltar_pago')) return new Response(null, { status: 204 })
    if (url.includes('/helper/get-escrow-by-contract-ids')) return ok([{ contractId: o.cid, balance: o.balance ?? o.monto,
      roles: { receiver: o.receiver, releaseSigner: o.releaseSigner, disputeResolver: o.disputeResolver }, flags: { disputed: false, released: false, resolved: false, ...o.flags } }])
    return null
  }
}
