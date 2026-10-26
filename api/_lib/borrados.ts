// paso16-unido · Privacidad 1.7-demo en los alquileres con otra persona (Supabase). Legal, 25/10, arreglos 5 y 6:
//  * si la persona invitada no se une en 7 días, se borra su correo (lk_borrar_invitaciones_vencidas);
//  * 30 días después de cerrar un caso en la mediación se borran las fotos (bucket lk-fotos), las descripciones y los mensajes,
//    salvo que una parte pida guardarlos; se conservan los montos y el resultado (lk_mediacion_por_borrar → Storage →
//    lk_marcar_mediacion_borrada). Si Storage falla, ese caso no se marca y se reintenta en la próxima corrida.
// Escenario C (B2): corrida diaria en vercel.json («crons», 09:00 UTC = 3:00 a. m. de Costa Rica). Sin CRON_SECRET responde 401 y
// no hace nada. Antes de publicar: aplicar 20261025030000 y 20261025040000 (si no, lk_vencimientos falla y solo corren los borrados).
import { servicio, rpc, borrarObjetos } from './supabase.js'
import { procesarCorreos, vencerMediaciones, type Resultado } from './correos-c.js'
import { pagarDevoluciones, type SalidaDevoluciones } from './devoluciones.js'
import { sinSecretos } from './tw.js'

export const DIAS_MEDIACION = 30
export interface Vencimientos { automatico: number; mediacion: number }
export interface ResultadoBorrados { invitaciones: number; mediaciones: number; fallidos: string[]; vencimientos: Vencimientos | null; devoluciones?: SalidaDevoluciones; vencidas?: number | { error: string }; correos?: { enviados: number; omitidos: number; vencidas: number } | { error: string } }

export async function ejecutarBorrados(env: Record<string, string | undefined>, f: typeof fetch = fetch): Promise<ResultadoBorrados> {
  const inicio = Date.now()
  const s = servicio(env)
  if (!s) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor: no se borró nada.')
  // B2 (escenario C): plazos vencidos (5.3 d: 100 % al inquilino; 6.5 c / 6.5.1: regla o mediación). Si la migración
  // 20261025040000 no está aplicada, falla sola y los borrados siguen (vencimientos: null).
  let vencimientos: Vencimientos | null = null
  try { vencimientos = await rpc<Vencimientos>(s, 'lk_vencimientos', {}, f) } catch { vencimientos = null }
  const invitaciones = await rpc<number>(s, 'lk_borrar_invitaciones_vencidas', {}, f)
  const casos = await rpc<{ contrato_id: string; rutas: string[] | null }[]>(s, 'lk_mediacion_por_borrar', { p_dias: DIAS_MEDIACION }, f)
  let mediaciones = 0; const fallidos: string[] = []
  for (const c of casos ?? []) {
    const rutas = c.rutas ?? []
    if (rutas.length && !(await borrarObjetos(s, 'lk-fotos', rutas, f))) { fallidos.push(c.contrato_id); continue }
    if (await rpc<boolean>(s, 'lk_marcar_mediacion_borrada', { p_contrato: c.contrato_id, p_dias: DIAS_MEDIACION }, f)) mediaciones++
  }
  const r: ResultadoBorrados = { invitaciones: invitaciones ?? 0, mediaciones, fallidos, vencimientos }
  // Escenario C (docs/correos-c.md): la corrida diaria vence el plazo de la mediación (P-06) SIEMPRE, con o sin CORREOS_C (Legal 25/10,
  // 5:09 p. m., punto 3; Vercel Hobby solo permite un cron diario). Con CORREOS_C=1, además envía los correos pendientes.
  r.vencidas = await vencerMediaciones(env, {}, f).catch((e: unknown) => ({ error: e instanceof Error ? e.message : 'error' }))
  // Paso 22 (api/_lib/devoluciones.ts): paga en la red de prueba las devoluciones sin reclamo que siguen sin pagar (las que
  // lk_vencimientos acaba de cerrar y las de corridas anteriores), ANTES de los correos: así el COR-C-07 sale en la misma corrida.
  r.devoluciones = await pagarDevoluciones(env, { inicio }, f).catch((e: unknown) => ({ error: sinSecretos(e instanceof Error ? e.message : 'error', env) }))
  if (env.CORREOS_C === '1') r.correos = await procesarCorreos(env, {}, f).then((x: Resultado) => ({ enviados: x.enviados.length, omitidos: x.omitidos.length, vencidas: x.vencidas }), (e: unknown) => ({ error: e instanceof Error ? e.message : 'error' }))
  return r
}

/** Solo la corrida programada (Vercel Cron manda «Authorization: Bearer <CRON_SECRET>»). Sin CRON_SECRET no corre. */
export function autorizado(env: Record<string, string | undefined>, cabecera: string | null) {
  const secreto = env.CRON_SECRET?.trim()
  return !!secreto && cabecera === `Bearer ${secreto}`
}
