// Paso 22 · La devolución sin reclamo es automática de verdad: la corrida programada (/api/borrados, vercel.json «crons», cada hora) PAGA en la red
// de prueba los casos cerrados sin reclamo que siguen sin pagar, aunque nadie abra el alquiler. Mismo criterio que la app
// (src/acciones.ts:224-226): con la aprobación del dueño → «liberar»; sin ella → «devolver-automatico» (100 % al inquilino).
// Paga por el MISMO camino idempotente que /api/tw (devolverAlInquilino en api/_lib/tw.ts): bloqueo en la base + estado del escrow
// en Trustless Work antes de pagar. Un caso que falla no frena a los demás; el error se guarda y se registra sin secretos.
// Por corrida: hasta DEVOLUCIONES_POR_CORRIDA casos (5 por defecto, tope 20) y sin empezar uno nuevo después de
// DEVOLUCIONES_SEGUNDOS (30 por defecto) desde el inicio de la corrida (maxDuration 60 s en vercel.json). Lo que quede, en la próxima.
// Apagado: DEVOLUCION_CRON=0. Solo testnet (configuracion() rechaza otra API de Trustless Work).
import { devolucionAutomaticaEncendida } from './config-publica.js'
import { configuracion, contrato, devolverAlInquilino, modoDevolucion, pagarReparto, sinSecretos, ErrorRevisar, ErrorTw, type Entorno, type ModoDevolucion } from './tw.js'

export const POR_CORRIDA = 5, TOPE_POR_CORRIDA = 20, SEGUNDOS_CORRIDA = 30
export interface ResultadoDevoluciones {
  pendientes: number
  pagados: { contrato: string; modo: ModoDevolucion; tx: string; recuperado?: true }[]
  enCurso: string[]; yaPagados: string[]
  revisar: { contrato: string; motivo: string }[]
  fallidos: { contrato: string; error: string }[]
  sinTiempo: number
}
export type SalidaDevoluciones = ResultadoDevoluciones | { apagado: true } | { error: string }

const entero = (v: string | undefined, d: number, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : d }

export async function pagarDevoluciones(env: Entorno, o: { inicio?: number; reloj?: () => number; log?: (m: string) => void } = {}, f: typeof fetch = fetch): Promise<SalidaDevoluciones> {
  if (!devolucionAutomaticaEncendida(env)) return { apagado: true }
  const reloj = o.reloj ?? Date.now, inicio = o.inicio ?? reloj(), log = o.log ?? ((m: string) => console.error(m))
  const limite = entero(env.DEVOLUCIONES_POR_CORRIDA, POR_CORRIDA, 1, TOPE_POR_CORRIDA), seg = entero(env.DEVOLUCIONES_SEGUNDOS, SEGUNDOS_CORRIDA, 5, 800)
  let c: ReturnType<typeof configuracion>
  try { c = configuracion(env) } catch (e) { return { error: sinSecretos(e instanceof Error ? e.message : String(e), env) } }   // solo nombres de variables
  const r = await f(`${c.supa.url}/rest/v1/rpc/lk_devoluciones_pendientes`, { method: 'POST',
    headers: { apikey: c.supa.servicio, authorization: 'Bearer ' + c.supa.servicio, 'content-type': 'application/json' }, body: JSON.stringify({ p_limite: limite }) })
  if (!r.ok) return { error: r.status === 404 ? 'Falta la migración 20261026000000 (lk_devoluciones_pendientes): no se pagó nada.' : `lk_devoluciones_pendientes respondió ${r.status}: no se pagó nada.` }
  const ids = ((await r.json().catch(() => [])) as unknown[]).map(x => typeof x === 'string' ? x : String((x as Record<string, unknown>)?.lk_devoluciones_pendientes ?? (x as Record<string, unknown>)?.id ?? '')).filter(Boolean)
  const res: ResultadoDevoluciones = { pendientes: ids.length, pagados: [], enCurso: [], yaPagados: [], revisar: [], fallidos: [], sinTiempo: 0 }
  // De a uno (no en paralelo): las transacciones salen de la misma cuenta de la plataforma y chocarían por la secuencia.
  for (let i = 0; i < ids.length; i++) {
    if (reloj() - inicio > seg * 1000) { res.sinTiempo = ids.length - i; break }
    const id = ids[i]
    try {
      const k = await contrato(c, id, f)
      const modo = await modoDevolucion(c, k, f)
      const d = await devolverAlInquilino(c, k, modo, f)
      if (d.enCurso) res.enCurso.push(id)
      else if (d.yaExistia) res.yaPagados.push(id)
      else if (d.tx) res.pagados.push({ contrato: id, modo, tx: d.tx, ...(d.recuperado ? { recuperado: true as const } : {}) })
    } catch (e) {
      if (e instanceof ErrorRevisar) { res.revisar.push({ contrato: id, motivo: e.motivo }); log(`[devoluciones] ${id} para revisar: ${e.motivo}`); continue }
      const m = sinSecretos(e instanceof Error ? e.message : String(e), env)
      res.fallidos.push({ contrato: id, error: m }); log(`[devoluciones] ${id} falló${e instanceof ErrorTw ? ` (${e.estado})` : ''}: ${m}`)
    }
  }
  return res
}

// ── 27/10/2026 · Repartos aceptados que quedaron sin pagar (alquiler b10557f9: «cerrado» por acuerdo con liquidacion_tx vacío) ──
// Mismo camino idempotente que la app («repartir» → pagarReparto en api/_lib/tw.ts). Dos entradas, las dos solo con CRON_SECRET:
//  * la corrida (/api/borrados, cada hora) los paga sola, después de las devoluciones (apagado: REPARTOS_CRON=0);
//  * /api/borrados?reparto=<id> paga UNO a pedido de operación, y /api/borrados?reparto=pendientes solo los lista (no paga nada).
// Requiere la migración 20261027120000 (lk_tomar_pago con acuerdo/mediación y lk_repartos_pendientes).
export interface ResultadoRepartos {
  pendientes: number
  pagados: { contrato: string; tx: string; recuperado?: true }[]
  enCurso: string[]; yaPagados: string[]
  revisar: { contrato: string; motivo: string }[]
  fallidos: { contrato: string; error: string }[]
  sinTiempo: number
}
export type SalidaRepartos = ResultadoRepartos | { apagado: true } | { error: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function repartosPendientes(c: ReturnType<typeof configuracion>, limite: number, f: typeof fetch): Promise<string[] | { error: string }> {
  const r = await f(`${c.supa.url}/rest/v1/rpc/lk_repartos_pendientes`, { method: 'POST',
    headers: { apikey: c.supa.servicio, authorization: 'Bearer ' + c.supa.servicio, 'content-type': 'application/json' }, body: JSON.stringify({ p_limite: limite }) })
  if (!r.ok) return { error: r.status === 404 ? 'Falta la migración 20261027120000 (lk_repartos_pendientes): no se pagó nada.' : `lk_repartos_pendientes respondió ${r.status}: no se pagó nada.` }
  const j = await r.json().catch(() => []) as unknown
  return (Array.isArray(j) ? j : []).map(x => typeof x === 'string' ? x : String((x as Record<string, unknown>)?.lk_repartos_pendientes ?? (x as Record<string, unknown>)?.id ?? '')).filter(Boolean)
}

/** Paga los repartos de `ids` (o los pendientes), de a uno. `o.listar`: solo cuenta y devuelve los ids, sin pedir nada a Trustless Work. */
export async function pagarRepartos(env: Entorno, o: { inicio?: number; reloj?: () => number; log?: (m: string) => void; ids?: string[]; listar?: boolean } = {}, f: typeof fetch = fetch): Promise<SalidaRepartos | { pendientes: string[] }> {
  if (!o.ids && !o.listar && env.REPARTOS_CRON === '0') return { apagado: true }
  const reloj = o.reloj ?? Date.now, inicio = o.inicio ?? reloj(), log = o.log ?? ((m: string) => console.error(m))
  const limite = entero(env.DEVOLUCIONES_POR_CORRIDA, POR_CORRIDA, 1, TOPE_POR_CORRIDA), seg = entero(env.DEVOLUCIONES_SEGUNDOS, SEGUNDOS_CORRIDA, 5, 800)
  let c: ReturnType<typeof configuracion>
  try { c = configuracion(env) } catch (e) { return { error: sinSecretos(e instanceof Error ? e.message : String(e), env) } }
  if (o.ids && !o.ids.every(id => UUID.test(id))) return { error: 'El id del alquiler no es válido.' }
  const ids = o.ids ?? await repartosPendientes(c, o.listar ? TOPE_POR_CORRIDA : limite, f)
  if (!Array.isArray(ids)) return ids
  if (o.listar) return { pendientes: ids }
  const res: ResultadoRepartos = { pendientes: ids.length, pagados: [], enCurso: [], yaPagados: [], revisar: [], fallidos: [], sinTiempo: 0 }
  for (let i = 0; i < ids.length; i++) {
    if (reloj() - inicio > seg * 1000) { res.sinTiempo = ids.length - i; break }
    const id = ids[i]
    try {
      const d = await pagarReparto(c, await contrato(c, id, f), f)
      if (d.enCurso) res.enCurso.push(id)
      else if (d.yaExistia) res.yaPagados.push(id)
      else if (d.tx) res.pagados.push({ contrato: id, tx: d.tx, ...(d.recuperado ? { recuperado: true as const } : {}) })
    } catch (e) {
      if (e instanceof ErrorRevisar) { res.revisar.push({ contrato: id, motivo: e.motivo }); log(`[repartos] ${id} para revisar: ${e.motivo}`); continue }
      const m = sinSecretos(e instanceof Error ? e.message : String(e), env)
      res.fallidos.push({ contrato: id, error: m }); log(`[repartos] ${id} falló${e instanceof ErrorTw ? ` (${e.estado})` : ''}: ${m}`)
    }
  }
  return res
}
