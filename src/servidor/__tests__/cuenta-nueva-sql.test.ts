// 20261026200000_cuenta_nueva.sql en PGlite (migraciones reales) y su revert: historial, número de cuenta, alquileres sin escrow
// pasan a la cuenta nueva, con escrow o depósito NO se tocan solos, y solo el servidor puede llamarlas.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const YO = '00000000-0000-4000-8000-0000000000a1', OTRO = '00000000-0000-4000-8000-0000000000b2'
const VIEJA = 'G' + 'A'.repeat(55), NUEVA = 'G' + 'B'.repeat(55), ESCROW = 'C' + 'A'.repeat(55)
let db: PGlite
let fs: { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
async function contrato(estado: string, x: { escrow?: boolean; liquidado?: boolean; rol?: 'dueno' | 'inquilino'; usuario?: string } = {}) {
  const id = crypto.randomUUID()
  await db.query(`insert into public.lk_contratos(id, creado_por, direccion, monto, inicio, fin, estado, escrow_contract_id, liquidacion_tx) values ($1, $2, 'Casa', 20, current_date, current_date + 40, $3, $4, $5)`,
    [id, x.usuario ?? YO, estado, x.escrow ? ESCROW : null, x.liquidado ? 'f'.repeat(64) : null])
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar) values ($1, $2, $3, 'yo@correo.com', $4)`, [id, x.rol ?? 'dueno', x.usuario ?? YO, VIEJA])
  return id
}
const dir = async (id: string) => (await db.query<{ d: string }>('select direccion_stellar d from public.lk_participantes where contrato_id = $1', [id])).rows[0].d
beforeAll(async () => {
  fs = await import(['node', 'fs'].join(':')) as typeof fs
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('lk_cuenta_nueva', () => {
  it('guarda la cuenta vieja, sube el número y pasa solo los alquileres sin cuenta segura ni depósito', async () => {
    const sin = await contrato('firmas'), pend = await contrato('pendiente_pago'), conEscrow = await contrato('pendiente_pago', { escrow: true }), pagado = await contrato('en_curso', { escrow: true }), cerrado = await contrato('cerrado', { escrow: true, liquidado: true })
    const r = (await db.query<{ r: { generacion: number; sin_escrow: number } }>('select public.lk_cuenta_nueva($1, $2) r', [YO, NUEVA])).rows[0].r
    expect(r).toEqual({ generacion: 2, sin_escrow: 2 })
    expect([await dir(sin), await dir(pend)]).toEqual([NUEVA, NUEVA])
    expect([await dir(conEscrow), await dir(pagado), await dir(cerrado)]).toEqual([VIEJA, VIEJA, VIEJA])   // no se tocan solos
    const h = await db.query<{ direccion_stellar: string; reemplazada_por: string }>('select direccion_stellar, reemplazada_por from public.lk_cuentas_historial where usuario = $1', [YO])
    expect(h.rows).toEqual([{ direccion_stellar: VIEJA, reemplazada_por: NUEVA }])
    await db.query(`select set_config('test.uid', $1, false)`, [YO])
    expect((await db.query<{ g: number }>('select public.lk_mi_generacion() g')).rows[0].g).toBe(2)
  })
  it('es idempotente en el historial y no toca alquileres de otra persona', async () => {
    const ajeno = await contrato('firmas', { usuario: OTRO })
    await db.query('select public.lk_cuenta_nueva($1, $2)', [YO, 'G' + 'C'.repeat(55)])
    expect((await db.query('select 1 from public.lk_cuentas_historial where usuario = $1', [YO])).rows.length).toBe(2)   // la B también queda en el historial
    expect(await dir(ajeno)).toBe(VIEJA)
    expect((await db.query<{ g: number }>('select generacion g from public.lk_cuenta_generacion where usuario = $1', [YO])).rows[0].g).toBe(3)
  })
  it('lk_asignar_cuenta pasa un alquiler con escrow sin liquidar, y no uno cerrado', async () => {
    const e = await contrato('pendiente_pago', { escrow: true }), c = await contrato('cerrado', { escrow: true, liquidado: true })
    expect((await db.query<{ r: boolean }>('select public.lk_asignar_cuenta($1, $2, $3) r', [e, YO, NUEVA])).rows[0].r).toBe(true)
    expect((await db.query<{ r: boolean }>('select public.lk_asignar_cuenta($1, $2, $3) r', [c, YO, NUEVA])).rows[0].r).toBe(false)
    expect(await dir(e)).toBe(NUEVA); expect(await dir(c)).toBe(VIEJA)
  })
  it('solo el servidor las llama; la persona solo lee su número', async () => {
    const q = async (rol: string, sql: string) => { await db.exec(`set role ${rol}`); try { await db.query(sql); return true } catch { return false } finally { await db.exec('reset role') } }
    expect(await q('authenticated', `select public.lk_cuenta_nueva('${YO}', '${NUEVA}')`)).toBe(false)
    expect(await q('anon', `select public.lk_asignar_cuenta('${crypto.randomUUID()}', '${YO}', '${NUEVA}')`)).toBe(false)
    expect(await q('authenticated', 'select public.lk_mi_generacion()')).toBe(true)
    expect(await q('anon', 'select public.lk_mi_generacion()')).toBe(false)
    expect(await q('authenticated', 'select * from public.lk_cuentas_historial')).toBe(false)   // sin políticas
  })
  it('el revert quita todo y deja el resto', async () => {
    await db.exec(fs.readFileSync('supabase/revert/20261026200000_cuenta_nueva_revert.sql', 'utf8'))
    const t = await db.query<{ n: string }>(`select count(*)::text n from pg_proc where proname in ('lk_cuenta_nueva','lk_asignar_cuenta','lk_mi_generacion')`)
    expect(t.rows[0].n).toBe('0')
    expect((await db.query('select 1 from public.lk_contratos')).rows.length).toBeGreaterThan(0)
  })
})
