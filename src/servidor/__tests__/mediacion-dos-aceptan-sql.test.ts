// Escenario C (preparación, sin encender) · 20261025020000_mediacion_solo_dos_aceptan.sql (master, aplicada) + 20261025030000_regla_651.sql (C) en PGlite.
// LEGAL: revisar · lk_decidir_mediacion solo cierra un caso si constan las aceptaciones de las dos partes (mismo reparto).
// Las dos excepciones de Términos 2.2 b) (texto de Legal, 25/10) NO pasan por la mediación: la devolución automática del 100 % (5.3 d)
// es sin reclamo (lk_cerrar_sin_reclamo + api/_lib/tw.ts «devolver-automatico») y la Regla 6.5.1 se aplica antes, con el reclamo
// sin respuesta. Dentro de la mediación, sin las dos aceptaciones el caso sigue abierto y el depósito retenido.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002', MED = '00000000-0000-4000-8000-000000000009'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const ultimoEvento = async (id: string) => (await uno<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id desc limit 1', [id]))!.t
const estado = async (id: string) => (await uno<{ estado: string; resultado: { via: string; cierre: string; dueno: number; inquilino: number } | null }>('select estado, resultado from public.lk_contratos where id = $1', [id]))!

async function crear() {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const r = await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 100, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL])
  const id = r!.r.id
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
  return id
}
async function enMediacion(id?: string) {
  id ??= await crear()
  await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo, respuesta) values ($1, 30, 'Pared manchada en la sala', 'rechazado')`, [id])
  await db.query(`update public.lk_contratos set estado = 'mediacion' where id = $1`, [id])
  return id
}
const acepta = async (uid: string, id: string, monto: number) => { await como(uid); await db.query('select public.lk_aceptar_acuerdo_mediacion($1, $2)', [id, monto]) }
const registrar = async (id: string, monto: number) => { await como(MED); await db.query(`select public.lk_decidir_mediacion($1, $2, 'Daño parcial')`, [id, monto]) }

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.query(`insert into public.lk_mediadores values ($1, 'Mediación Lockumi')`, [MED])
}, 60_000)

describe('lk_decidir_mediacion: solo con las dos aceptaciones (escenario C)', () => {
  it('sin aceptaciones, la persona mediadora no puede cerrar el caso con un reparto', async () => {
    const id = await enMediacion()
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
    expect((await estado(id)).estado).toBe('mediacion')
  })
  it('con una sola aceptación tampoco', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20)
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
  })
  it('si las dos partes aceptaron repartos distintos, no cierra', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20); await acepta(INQ, id, 10)
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
  })
  it('con las dos aceptaciones del mismo reparto, cierra y lo registra', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 20); await acepta(INQ, id, 20)
    await registrar(id, 20)
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 20, inquilino: 80 } })
    expect(await ultimoEvento(id)).toBe('Acuerdo registrado: 20 USDC al dueño y 80 al inquilino (aceptado por las dos partes) · Daño parcial')
  })
  it('una parte puede cambiar su aceptación antes del cierre; el reparto registrado debe ser el aceptado por las dos', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 25); await acepta(INQ, id, 15); await acepta(DUENO, id, 15)
    await expect(registrar(id, 25)).rejects.toThrow(/aceptaciones de las dos partes/)
    await registrar(id, 15)
    expect((await estado(id)).resultado).toMatchObject({ cierre: 'dos_aceptan', dueno: 15 })
  })
  it('solo las partes aceptan, solo con el caso en mediación y dentro de lo reclamado', async () => {
    const id = await enMediacion()
    await expect(acepta(MED, id, 10)).rejects.toThrow(/No participas/)
    await expect(acepta(INQ, id, 31)).rejects.toThrow(/entre 0 y lo reclamado/)
    const otro = await crear()
    await expect(acepta(INQ, otro, 10)).rejects.toThrow(/no está en la Mediación/)
  })
  it('la persona mediadora tampoco puede cerrar sola con el 100 % al inquilino (la devolución automática de 5.3 d no pasa por la mediación)', async () => {
    const id = await enMediacion()
    await expect(registrar(id, 0)).rejects.toThrow(/aceptaciones de las dos partes/)
    expect(await estado(id)).toMatchObject({ estado: 'mediacion', resultado: null })
  })
  it('con las dos aceptaciones del 100 % al inquilino, sí cierra (es un acuerdo)', async () => {
    const id = await enMediacion()
    await acepta(DUENO, id, 0); await acepta(INQ, id, 0)
    await registrar(id, 0)
    expect(await estado(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'mediacion', cierre: 'dos_aceptan', dueno: 0, inquilino: 100 } })
  })
  it('con la Regla 6.5.1 aceptada al firmar, la persona mediadora tampoco impone un reparto en la mediación (la regla se aplica antes)', async () => {
    const id = await crear()
    await como(INQ); await db.query(`select public.lk_aceptar_regla_651($1, '1.9-demo')`, [id])
    expect(await uno('select usuario, version from public.lk_reglas_651 where contrato_id = $1', [id])).toEqual({ usuario: INQ, version: '1.9-demo' })
    await enMediacion(id)
    await expect(registrar(id, 20)).rejects.toThrow(/aceptaciones de las dos partes/)
    expect(await estado(id)).toMatchObject({ estado: 'mediacion', resultado: null })
  })
  it('la Regla 6.5.1 solo la acepta el inquilino, y solo antes de firmar', async () => {
    const id = await crear()
    await como(DUENO); await expect(db.query(`select public.lk_aceptar_regla_651($1, '1.9-demo')`, [id])).rejects.toThrow(/inquilino/)
    await db.query(`update public.lk_contratos set estado = 'en_curso' where id = $1`, [id])
    await como(INQ); await expect(db.query(`select public.lk_aceptar_regla_651($1, '1.9-demo')`, [id])).rejects.toThrow(/al firmar/)
  })
  it('nadie escribe directo en las tablas de aceptaciones', async () => {
    const r = await uno<{ a: boolean; b: boolean }>(`select has_table_privilege('authenticated', 'public.lk_aceptaciones_mediacion', 'insert') a, has_table_privilege('authenticated', 'public.lk_reglas_651', 'insert') b`)
    expect(r).toEqual({ a: false, b: false })
  })
})

// Legal (25/10, 1:16 a. m.): en C, un caso sin acuerdo sigue abierto y no hay liberación por plazo.
describe('escenario C: sin acuerdo, el caso sigue abierto y nada lo cierra por plazo', () => {
  const vencer = (id: string) => db.query(`update public.lk_contratos set ventana_inicio = now() - interval '60 days', ventana_segundos = 604800 where id = $1`, [id])
  const sinTocar = async (id: string) => expect(await estado(id)).toMatchObject({ estado: 'mediacion', resultado: null })
  it('el inquilino rechaza el reclamo: pasa a mediación, sin reparto ni cierre', async () => {
    const id = await crear()
    await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo) values ($1, 30, 'Pared manchada en la sala')`, [id])
    await db.query(`update public.lk_contratos set estado = 'reclamo' where id = $1`, [id])
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, false)', [id])
    await sinTocar(id)
  })
  it('la devolución automática (lk_cerrar_sin_reclamo) no cierra un caso con reclamo o en mediación, aunque el plazo haya vencido', async () => {
    const id = await enMediacion(); await vencer(id)
    for (const uid of [DUENO, INQ]) { await como(uid); expect((await uno<{ r: boolean }>('select public.lk_cerrar_sin_reclamo($1) r', [id]))!.r).toBe(false) }
    await sinTocar(id)
    const r = await crear()
    await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo) values ($1, 30, 'Pared manchada en la sala')`, [r])
    await db.query(`update public.lk_contratos set estado = 'reclamo' where id = $1`, [r]); await vencer(r)
    await como(INQ); expect((await uno<{ r: boolean }>('select public.lk_cerrar_sin_reclamo($1) r', [r]))!.r).toBe(false)
    expect((await estado(r)).estado).toBe('reclamo')
  })
  it('la corrida de /api/borrados no toca un caso abierto: no lo lista, no lo borra y no cambia estado ni resultado', async () => {
    const id = await enMediacion()
    await db.query(`update public.lk_contratos set actualizado_en = now() - interval '90 days', invitacion_expira = now() - interval '90 days' where id = $1`, [id])
    await como(null)
    await db.query('select public.lk_borrar_invitaciones_vencidas()')
    expect((await db.query<{ contrato_id: string }>('select contrato_id from public.lk_mediacion_por_borrar(0)')).rows.map(r => r.contrato_id)).not.toContain(id)
    expect((await uno<{ r: boolean }>('select public.lk_marcar_mediacion_borrada($1, 0) r', [id]))!.r).toBe(false)
    await sinTocar(id)
  })
  it('no se puede registrar una liquidación en la red de un caso abierto', async () => {
    const id = await enMediacion()
    await como(INQ); await expect(db.query(`select public.lk_registrar_liquidacion($1, 'tx')`, [id])).rejects.toThrow(/no está terminado/)
    await sinTocar(id)
  })
  it('B2 (opción 1 de Legal): solo cuatro funciones cierran un caso, y de la mediación solo sale con lk_decidir_mediacion', async () => {
    const fns = (await db.query<{ n: string; d: string }>(`select p.proname n, pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname like 'lk\_%'`)).rows
    const cierran = fns.filter(f => /update public\.lk_contratos set estado\s*=\s*'cerrado'/.test(f.d)).map(f => f.n).sort()
    expect(cierran).toEqual(['lk_cerrar_sin_reclamo', 'lk_decidir_mediacion', 'lk_responder_reclamo', 'lk_vencimientos'])
    const cerrar = fns.find(f => f.n === 'lk_cerrar_sin_reclamo')!.d, responder = fns.find(f => f.n === 'lk_responder_reclamo')!.d
    expect(cerrar).toMatch(/c\.estado <> 'ventana_reclamo'/); expect(responder).toMatch(/c\.estado <> 'reclamo'/)
    expect(fns.find(f => f.n === 'lk_silencio_inquilino')!.d).not.toMatch(/'cerrado'/)
    expect(fns.find(f => f.n === 'lk_vencimientos')!.d).toMatch(/where estado = 'ventana_reclamo' and now\(\) >/)
  })
})
