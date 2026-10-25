// paso16-unido · Migración 20261025010000_paso16_unido.sql probada en Postgres (PGlite), con auth y storage simulados.
// Invitaciones: declaración guardada, un solo correo por alquiler, correo borrado a los 7 días. Mediación: borrado a los 30 días
// (fotos del bucket lk-fotos, descripción y mensajes), pedido de guardar y permisos solo para la clave de servicio.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key);   -- paso 19: la migración de reputación referencia auth.users
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
async function crear(decl: string | null = DECL) {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const r = await uno<{ r: { id: string; token: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', 20, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, decl])
  return r!.r
}

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  const { readFileSync } = fs, MIGRACIONES = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of MIGRACIONES) await db.exec(readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('invitaciones (arreglo 5)', () => {
  it('se guarda la declaración de quien invita: quién, cuándo y el texto exacto', async () => {
    const { id } = await crear()
    const d = await uno<{ usuario: string; email_cavos: string; texto: string; declarado_en: Date }>('select * from public.lk_declaraciones_invitacion where contrato_id = $1', [id])
    expect(d).toMatchObject({ usuario: DUENO, email_cavos: 'dueno@correo.com', texto: DECL }); expect(d!.declarado_en).toBeInstanceOf(Date)
    await expect(crear(null)).rejects.toThrow(/declaración/)
  })
  it('un solo correo de invitación por alquiler, solo al correo escrito y sin recordatorios', async () => {
    const { id } = await crear()
    const reg = async (para: string) => (await uno<{ ok: boolean }>('select public.lk_registrar_correo_invitacion($1, $2) ok', [id, para]))!.ok
    expect(await reg('otra@correo.com')).toBe(false)
    expect(await reg('Invitada@Correo.com')).toBe(true)
    expect(await reg('invitada@correo.com')).toBe(false)
  })
  it('si la persona invitada no se une en 7 días, se borra su correo (y el link)', async () => {
    const { id } = await crear(), { id: unido } = await crear()
    await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [unido, INQ])
    await db.query(`update public.lk_contratos set invitacion_expira = now() - interval '1 minute' where id = any($1)`, [[id, unido]])
    expect((await uno<{ n: number }>('select public.lk_borrar_invitaciones_vencidas() n'))!.n).toBeGreaterThanOrEqual(1)
    expect(await uno('select email_inquilino, invitacion_hash from public.lk_contratos where id = $1', [id])).toEqual({ email_inquilino: null, invitacion_hash: null })
    expect((await uno<{ e: string }>('select email_inquilino e from public.lk_contratos where id = $1', [unido]))!.e).toBe('invitada@correo.com')
    expect((await uno<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id desc limit 1', [id]))!.t).toBe('La persona invitada no se unió en 7 días. Se borró su correo.')
    await como(DUENO)
    await expect(db.query('select public.lk_nueva_invitacion($1)', [id])).rejects.toThrow(/Escríbelo otra vez/)
    await db.query('select public.lk_nueva_invitacion($1, $2, $3)', [id, 'nueva@correo.com', DECL])
    expect((await uno<{ e: string }>('select email_inquilino e from public.lk_contratos where id = $1', [id]))!.e).toBe('nueva@correo.com')
  })
})

describe('mediación: borrado a los 30 días (arreglo 6)', () => {
  async function cerrado(via: string, dias: number) {
    const { id } = await crear()
    await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
    await db.query(`insert into public.lk_fotos(contrato_id, etapa, por_rol, ruta, sha256, tomada_en, origen) values
      ($1::uuid, 'reclamo', 'dueno', $1::text || '/reclamo/a.jpg', repeat('a', 64), now(), 'camara'), ($1::uuid, 'entrada', 'dueno', $1::text || '/entrada/b.jpg', repeat('b', 64), now(), 'camara')`, [id])
    await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo, respuesta) values ($1, 5, 'Pared manchada en la sala', 'rechazado')`, [id])
    await db.query(`select public.lk_evento($1, 'Acuerdo registrado: 2 USDC al dueño y 18 al inquilino · comentario privado')`, [id])
    await db.query(`update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via', $2::text, 'dueno', 2, 'inquilino', 18) where id = $1`, [id, via])
    await db.query(`update public.lk_contratos set cerrado_en = now() - make_interval(days => $2) where id = $1`, [id, dias])
    return id
  }
  const porBorrar = async () => (await db.query<{ contrato_id: string; rutas: string[] }>('select * from public.lk_mediacion_por_borrar()')).rows
  it('lista solo los casos cerrados en la mediación hace 30 días o más, con las fotos del reclamo', async () => {
    const viejo = await cerrado('mediacion', 31), nuevo = await cerrado('mediacion', 5), acuerdo = await cerrado('acuerdo', 40)
    const l = await porBorrar(), ids = l.map(x => x.contrato_id)
    expect(ids).toContain(viejo); expect(ids).not.toContain(nuevo); expect(ids).not.toContain(acuerdo)
    expect(l.find(x => x.contrato_id === viejo)!.rutas).toEqual([`${viejo}/reclamo/a.jpg`])
  })
  it('borra las fotos, la descripción y los mensajes; conserva montos y resultado; deja el historial de Legal', async () => {
    const id = await cerrado('simulacion', 30)
    expect((await uno<{ ok: boolean }>('select public.lk_marcar_mediacion_borrada($1) ok', [id]))!.ok).toBe(true)
    expect((await db.query(`select etapa from public.lk_fotos where contrato_id = $1`, [id])).rows).toEqual([{ etapa: 'entrada' }])
    expect(await uno('select motivo, monto::float as monto from public.lk_reclamos where contrato_id = $1', [id])).toEqual({ motivo: 'Borrado a los 30 días.', monto: 5 })
    const ev = (await db.query<{ texto: string }>('select texto from public.lk_eventos where contrato_id = $1 order by id', [id])).rows.map(r => r.texto)
    expect(ev).toContain('Acuerdo registrado: 2 USDC al dueño y 18 al inquilino'); expect(ev.join()).not.toContain('comentario privado')
    expect(ev.at(-1)).toBe('Se borraron las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo), 30 días después de cerrar el caso. Se conservan los montos y el resultado.')
    expect((await uno<{ r: { dueno: number } }>('select resultado r from public.lk_contratos where id = $1', [id]))!.r.dueno).toBe(2)
    expect((await uno<{ ok: boolean }>('select public.lk_marcar_mediacion_borrada($1) ok', [id]))!.ok).toBe(false)
  })
  it('si una parte pide guardar los datos, no se borran y queda en el historial', async () => {
    const id = await cerrado('mediacion', 45)
    await como(INQ); await db.query('select public.lk_guardar_datos_mediacion($1)', [id])
    expect((await porBorrar()).map(x => x.contrato_id)).not.toContain(id)
    expect((await uno<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id desc limit 1', [id]))!.t).toBe('El inquilino pidió guardar los datos de la mediación para un reclamo fuera de la app.')
    expect((await uno<{ ok: boolean }>('select public.lk_marcar_mediacion_borrada($1) ok', [id]))!.ok).toBe(false)
  })
  it('las funciones de borrado y del correo solo las puede usar la clave de servicio', async () => {
    for (const f of ['lk_mediacion_por_borrar(integer)', 'lk_marcar_mediacion_borrada(uuid,integer)', 'lk_borrar_invitaciones_vencidas()', 'lk_registrar_correo_invitacion(uuid,text)']) {
      const r = await uno<{ a: boolean; s: boolean; n: boolean }>(`select has_function_privilege('authenticated', 'public.${f}', 'execute') a, has_function_privilege('service_role', 'public.${f}', 'execute') s, has_function_privilege('anon', 'public.${f}', 'execute') n`)
      expect(r).toEqual({ a: false, s: true, n: false })
    }
    expect((await uno<{ a: boolean }>(`select has_function_privilege('authenticated', 'public.lk_guardar_datos_mediacion(uuid)', 'execute') a`))!.a).toBe(true)
  })
})
