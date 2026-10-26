// PROTOTIPO · 20261026010000_eliminar_ocultar_reiniciar.sql en PGlite (migraciones reales). Incluye los casos negativos:
// no se elimina con depósito ni con la otra persona ya unida, no se elimina lo de otra persona y reiniciar no toca a otras
// personas ni las cuentas de garantía.
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
const YO = '00000000-0000-4000-8000-0000000000a1', OTRA = '00000000-0000-4000-8000-0000000000b2', INQ = '00000000-0000-4000-8000-0000000000c3'
const ESCROW = 'C' + 'A'.repeat(55)
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string) => db.query(`select set_config('test.uid', $1, false)`, [uid])
const existe = async (id: string) => (await db.query('select 1 from public.lk_contratos where id = $1', [id])).rows.length === 1
const oculto = async (id: string, u: string) => (await db.query('select 1 from public.lk_ocultos where contrato_id = $1 and usuario = $2', [id, u])).rows.length === 1
async function crear(dueno: string, dir: string, x: { unido?: boolean; estado?: string; escrow?: boolean; liquidado?: boolean } = {}) {
  await como(dueno)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const id = (await db.query<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando($1, 20, $2::date, $3::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $4) r`, [dir, hoy, fin, DECL])).rows[0].r.id
  if (x.unido) await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
  await db.query(`update public.lk_contratos set estado = $2, escrow_contract_id = $3, liquidacion_tx = $4 where id = $1`,
    [id, x.estado ?? 'firmas', x.escrow ? ESCROW : null, x.liquidado ? 'f'.repeat(64) : null])
  return id
}
beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('eliminar', () => {
  it('el dueño elimina antes de que la otra persona acepte y sin depósito; la invitación deja de existir', async () => {
    const id = await crear(YO, 'Casa ejemplo 1'); await como(YO)
    await db.query('select public.lk_eliminar_alquiler($1)', [id])
    expect(await existe(id)).toBe(false)
    expect((await db.query('select 1 from public.lk_eventos where contrato_id = $1', [id])).rows.length).toBe(0)
  })
  it('NO con la otra persona ya unida', async () => {
    const id = await crear(YO, 'Casa ejemplo 2', { unido: true }); await como(YO)
    await expect(db.query('select public.lk_eliminar_alquiler($1)', [id])).rejects.toThrow(/Ya no se puede eliminar/); expect(await existe(id)).toBe(true)
  })
  it('NO con depósito o cuenta de garantía (ningún estado con dinero)', async () => {
    for (const x of [{ estado: 'pendiente_pago', escrow: true }, { estado: 'en_curso', escrow: true }, { estado: 'reclamo', escrow: true }, { estado: 'cerrado', escrow: true }]) {
      const id = await crear(YO, 'Casa ejemplo 3', x); await como(YO)
      await expect(db.query('select public.lk_eliminar_alquiler($1)', [id])).rejects.toThrow(); expect(await existe(id)).toBe(true)
    }
  })
  it('NO el de otra persona, ni el inquilino', async () => {
    const id = await crear(OTRA, 'Casa de otra persona')
    await como(YO); await expect(db.query('select public.lk_eliminar_alquiler($1)', [id])).rejects.toThrow(/No participas/)
    const id2 = await crear(OTRA, 'Casa con inquilino', { unido: true })
    await como(INQ); await expect(db.query('select public.lk_eliminar_alquiler($1)', [id2])).rejects.toThrow(/le corresponde al dueño/)
    expect(await existe(id) && await existe(id2)).toBe(true)
  })
  it('sin permiso de borrar directo en las tablas (todo pasa por la función)', async () => {
    const id = await crear(YO, 'Casa ejemplo 4'); await db.exec('set role authenticated')
    await expect(db.query('delete from public.lk_contratos where id = $1', [id])).rejects.toThrow(/permission denied/)
    await expect(db.query('insert into public.lk_ocultos(contrato_id, usuario) values ($1, $2)', [id, YO])).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
})

describe('ocultar', () => {
  it('solo de MI lista: la otra parte lo sigue viendo y no se borra nada', async () => {
    const id = await crear(YO, 'Casa ejemplo 5', { unido: true, estado: 'cerrado', escrow: true, liquidado: true }); await como(YO)
    await db.query('select public.lk_ocultar_alquiler($1)', [id])
    expect(await oculto(id, YO)).toBe(true); expect(await oculto(id, INQ)).toBe(false); expect(await existe(id)).toBe(true)
    await db.query('select public.lk_ocultar_alquiler($1, false)', [id]); expect(await oculto(id, YO)).toBe(false)
  })
  it('NO con un depósito guardado (en curso, reclamo o cerrado sin devolver todavía)', async () => {
    for (const x of [{ estado: 'en_curso', escrow: true }, { estado: 'mediacion', escrow: true }, { estado: 'cerrado', escrow: true }, { estado: 'pendiente_pago', escrow: true }]) {
      const id = await crear(YO, 'Casa ejemplo 6', { unido: true, ...x }); await como(YO)
      await expect(db.query('select public.lk_ocultar_alquiler($1)', [id])).rejects.toThrow(/depósito guardado/); expect(await oculto(id, YO)).toBe(false)
    }
  })
  it('NO uno de otra persona', async () => {
    const id = await crear(OTRA, 'Casa de otra persona 2', { estado: 'cerrado' }); await como(YO)
    await expect(db.query('select public.lk_ocultar_alquiler($1)', [id])).rejects.toThrow(/No participas/)
  })
})

describe('reiniciar mi demo', () => {
  it('solo los de esta sesión; elimina sin depósito, oculta lo cerrado y deja lo que tiene dinero; no toca otras personas ni garantías', async () => {
    await db.exec('delete from public.lk_contratos')
    const sinDep = await crear(YO, 'R sin depósito'), unido = await crear(YO, 'R unido', { unido: true }),
      cerrado = await crear(YO, 'R cerrado', { unido: true, estado: 'cerrado', escrow: true, liquidado: true }),
      conDinero = await crear(YO, 'R en curso', { unido: true, estado: 'en_curso', escrow: true }),
      ajeno = await crear(OTRA, 'R de otra persona'), ajenoCerrado = await crear(OTRA, 'R de otra cerrado', { estado: 'cerrado' })
    const antes = (await db.query<{ e: string }>('select escrow_contract_id e from public.lk_contratos where id = $1', [conDinero])).rows[0].e
    await como(YO)
    const r = (await db.query<{ r: Record<string, number> }>('select public.lk_reiniciar_mi_demo() r')).rows[0].r
    expect(r).toEqual({ eliminados: 1, ocultos: 2, quedan: 1 })
    expect(await existe(sinDep)).toBe(false)
    expect(await oculto(unido, YO) && await oculto(cerrado, YO)).toBe(true)
    expect(await oculto(unido, INQ)).toBe(false)                           // la otra parte lo sigue viendo
    expect(await existe(conDinero) && !(await oculto(conDinero, YO))).toBe(true)
    expect((await db.query<{ e: string; s: string }>('select escrow_contract_id e, estado s from public.lk_contratos where id = $1', [conDinero])).rows[0]).toEqual({ e: antes, s: 'en_curso' })
    expect(await existe(ajeno) && await existe(ajenoCerrado)).toBe(true)
    expect(await oculto(ajenoCerrado, OTRA)).toBe(false)
    await como(INQ); expect((await db.query<{ r: Record<string, number> }>('select public.lk_reiniciar_mi_demo() r')).rows[0].r).toEqual({ eliminados: 0, ocultos: 2, quedan: 1 })
  })
})
