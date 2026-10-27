// Paso 22 · Migración 20261026000000_devolucion_automatica.sql probada en Postgres (PGlite): qué casos se pagan solos, el bloqueo
// atómico y exclusivo (app y corrida diaria nunca pagan dos veces), el hash pendiente, quién suelta el bloqueo y los permisos.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
async function caso(o: { estado?: string; via?: string | null; escrow?: string | null; tx?: string | null; reclamo?: boolean; cierre?: string } = {}) {
  await db.query(`select set_config('test.uid', $1, false)`, [DUENO])
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const { r } = (await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 20, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL]))!
  const via = o.via === undefined ? 'automatico' : o.via
  await db.query(`update public.lk_contratos set estado = $2, resultado = $3::jsonb, escrow_contract_id = $4, liquidacion_tx = $5 where id = $1`,
    [r.id, o.estado ?? 'cerrado', via ? JSON.stringify({ via, dueno: 0, inquilino: 20, ...o.cierre ? { cierre: o.cierre } : {} }) : null, o.escrow === undefined ? CID : o.escrow, o.tx ?? null])
  if (o.reclamo) await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo) values ($1, 5, 'Se rompió una ventana')`, [r.id])
  return r.id
}
const pendientes = async (n = 50) => (await db.query<{ id: string }>('select id from public.lk_devoluciones_pendientes($1) id', [n])).rows.map(x => x.id)
const tomar = async (id: string, token: string, s = 300) => (await uno<{ ok: boolean }>('select public.lk_tomar_pago($1, $2, $3) ok', [id, token, s]))!.ok
const anotar = async (id: string, token: string, tx: string) => (await uno<{ ok: boolean }>('select public.lk_anotar_pago_pendiente($1, $2, $3) ok', [id, token, tx]))!.ok
const soltar = (id: string, token: string, error: string | null = null, revisar = false, esperar = false) => db.query('select public.lk_soltar_pago($1, $2, $3, $4, $5)', [id, token, error, revisar, esperar])
const fila = (id: string) => uno<Record<string, unknown>>('select liquidacion_tx, pago_bloqueo_hasta, pago_bloqueo_token, pago_tx_pendiente, pago_intentos, pago_error, pago_revisar from public.lk_contratos where id = $1', [id])

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('paso 22 · migración 20261026000000 (devolución automática)', () => {
  it('solo salen los cerrados sin reclamo (automático o aprobado por el dueño), con escrow y sin pagar', async () => {
    const auto = await caso(), devuelto = await caso({ via: 'devuelto' })
    const acuerdo = await caso({ via: 'acuerdo' })
    const no = [await caso({ estado: 'ventana_reclamo', via: null }), await caso({ reclamo: true }), await caso({ via: 'mediacion' }),
      await caso({ tx: 'a'.repeat(64) }), await caso({ escrow: null }), await caso({ estado: 'reclamo', via: 'automatico' })]
    const p = await pendientes()
    expect(p).toEqual(expect.arrayContaining([auto, devuelto])); for (const id of [...no, acuerdo]) expect(p).not.toContain(id)
    for (const id of no) expect(await tomar(id, crypto.randomUUID())).toBe(false)   // tomar repite las mismas condiciones
    expect(await tomar(acuerdo, crypto.randomUUID())).toBe(true)   // 20261027120000: el reparto aceptado usa el mismo bloqueo (lk_repartos_pendientes)
    expect((await db.query('select * from public.lk_devoluciones_pendientes(1)')).rows).toHaveLength(1)
    expect((await db.query('select * from public.lk_devoluciones_pendientes(0)')).rows).toHaveLength(1)   // tope 1..50
  })

  it('tomar es exclusivo: el segundo pedido no lo toma mientras dure el bloqueo; vencido, sí', async () => {
    const id = await caso(), a = crypto.randomUUID(), b = crypto.randomUUID()
    const [x, y] = await Promise.all([tomar(id, a), tomar(id, b)])
    expect([x, y].filter(Boolean)).toHaveLength(1)
    const quien = x ? a : b, otro = x ? b : a
    expect(await tomar(id, otro)).toBe(false); expect(await pendientes()).not.toContain(id)
    expect((await fila(id))!).toMatchObject({ pago_bloqueo_token: quien, pago_intentos: 1 })
    await db.query(`update public.lk_contratos set pago_bloqueo_hasta = now() - interval '1 second' where id = $1`, [id])   // pasan 5 min
    expect(await pendientes()).toContain(id); expect(await tomar(id, otro)).toBe(true)
    expect((await fila(id))!).toMatchObject({ pago_bloqueo_token: otro, pago_intentos: 2 })
    await expect(tomar(id, crypto.randomUUID(), 30)).rejects.toThrow(/fuera de rango/)
    await expect(db.query('select public.lk_tomar_pago($1, null)', [id])).rejects.toThrow(/p_token/)
  })

  it('el hash pendiente solo lo anota quien tiene el bloqueo vigente, y solo si no está pagado', async () => {
    const id = await caso(), t = crypto.randomUUID(), h = 'b'.repeat(64)
    expect(await tomar(id, t)).toBe(true)
    expect(await anotar(id, crypto.randomUUID(), h)).toBe(false)
    await expect(anotar(id, t, 'no-es-hash')).rejects.toThrow(/hash/)
    expect(await anotar(id, t, h)).toBe(true); expect((await fila(id))!.pago_tx_pendiente).toBe(h)
    await db.query(`update public.lk_contratos set pago_bloqueo_hasta = now() - interval '1 second' where id = $1`, [id])
    expect(await anotar(id, t, 'c'.repeat(64))).toBe(false)   // el bloqueo venció: no se envía
  })

  it('soltar: solo quien tiene el bloqueo; «esperar» lo mantiene hasta que vence; «revisar» lo saca de la lista', async () => {
    const id = await caso(), t = crypto.randomUUID()
    expect(await tomar(id, t)).toBe(true)
    await soltar(id, crypto.randomUUID()); expect((await fila(id))!.pago_bloqueo_token).toBe(t)   // el de otro no se toca
    await soltar(id, t, 'x'.repeat(400), false, true)
    const f = (await fila(id))!; expect(f.pago_bloqueo_token).toBe(t); expect(String(f.pago_error)).toHaveLength(300); expect(await pendientes()).not.toContain(id)
    await soltar(id, t); expect((await fila(id))!).toMatchObject({ pago_bloqueo_token: null, pago_bloqueo_hasta: null, pago_error: null })
    expect(await pendientes()).toContain(id)
    const t2 = crypto.randomUUID(); expect(await tomar(id, t2)).toBe(true); await soltar(id, t2, 'no cuadra', true)
    expect((await fila(id))!.pago_revisar).toBe(true); expect(await pendientes()).not.toContain(id); expect(await tomar(id, crypto.randomUUID())).toBe(false)
  })

  it('solo la clave de servicio: la app (authenticated/anon) no llama las funciones ni ve las columnas nuevas', async () => {
    const id = await caso()
    for (const rol of ['authenticated', 'anon']) {
      await db.exec(`set role ${rol}`)
      try {
        await expect(db.query('select public.lk_devoluciones_pendientes(5)')).rejects.toThrow(/permission denied/)
        await expect(db.query('select public.lk_tomar_pago($1, $2)', [id, crypto.randomUUID()])).rejects.toThrow(/permission denied/)
        await expect(db.query('select public.lk_anotar_pago_pendiente($1, $2, $3)', [id, crypto.randomUUID(), 'e'.repeat(64)])).rejects.toThrow(/permission denied/)
        await expect(db.query('select public.lk_soltar_pago($1, $2)', [id, crypto.randomUUID()])).rejects.toThrow(/permission denied/)
        for (const col of ['pago_bloqueo_hasta', 'pago_bloqueo_token', 'pago_tx_pendiente', 'pago_intentos', 'pago_error', 'pago_revisar'])
          await expect(db.query(`select ${col} from public.lk_contratos limit 1`)).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
    await db.exec('set role service_role')
    try { expect(Array.isArray((await db.query('select * from public.lk_devoluciones_pendientes(5)')).rows)).toBe(true) } finally { await db.exec('reset role') }
  })
})

const repartos = async (n = 50) => (await db.query<{ id: string }>('select id from public.lk_repartos_pendientes($1) id', [n])).rows.map(x => x.id)
describe('27/10 · migración 20261027120000 (reparto aceptado reintentable, alquiler b10557f9)', () => {
  it('«cerrado» por acuerdo o por mediación con las dos aceptaciones, sin liquidacion_tx = por pagar (con reclamo, como siempre)', async () => {
    const acuerdo = await caso({ via: 'acuerdo', reclamo: true }), mediacion = await caso({ via: 'mediacion', cierre: 'dos_aceptan', reclamo: true })
    const no = [await caso({ via: 'mediacion', reclamo: true }), await caso({ via: 'regla_651', reclamo: true }), await caso({ via: 'acuerdo', tx: 'b'.repeat(64) }),
      await caso({ via: 'acuerdo', escrow: null }), await caso({ estado: 'mediacion', via: null, reclamo: true }), await caso({ estado: 'reclamo', via: 'acuerdo' }), await caso()]
    const p = await repartos()
    expect(p).toEqual(expect.arrayContaining([acuerdo, mediacion])); for (const id of no) expect(p).not.toContain(id)
    for (const id of no.slice(0, -1)) expect(await tomar(id, crypto.randomUUID())).toBe(false)
    expect(await pendientes()).not.toContain(acuerdo)   // la corrida de devoluciones no los toca
    const t = crypto.randomUUID(); expect(await tomar(acuerdo, t)).toBe(true); expect(await tomar(acuerdo, crypto.randomUUID())).toBe(false)
    expect(await repartos()).not.toContain(acuerdo)   // tomado: no sale mientras dure el bloqueo
    expect(await anotar(acuerdo, t, 'c'.repeat(64))).toBe(true)
    await db.query(`update public.lk_contratos set liquidacion_tx = $2 where id = $1`, [acuerdo, 'c'.repeat(64)]); await soltar(acuerdo, t)
    expect(await repartos()).not.toContain(acuerdo); expect(await tomar(acuerdo, crypto.randomUUID())).toBe(false)   // pagado: nunca otra vez
    await db.query(`update public.lk_contratos set pago_revisar = true where id = $1`, [mediacion])
    expect(await repartos()).not.toContain(mediacion); expect(await tomar(mediacion, crypto.randomUUID())).toBe(false)
  })
  it('solo service_role llama las funciones nuevas', async () => {
    for (const fn of ['lk_repartos_pendientes(integer)', 'lk_cierre_por_pagar(lk_contratos)', 'lk_tomar_pago(uuid,uuid,integer)']) {
      const r = (await uno<Record<string, boolean>>(`select has_function_privilege('authenticated', 'public.${fn}', 'execute') a, has_function_privilege('anon', 'public.${fn}', 'execute') b, has_function_privilege('service_role', 'public.${fn}', 'execute') s`))!
      expect(r).toEqual({ a: false, b: false, s: true })
    }
  })
})
