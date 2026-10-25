// Paso 19 · Segundo factor (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.): sección 7 de 20261025140000_reputacion.sql (escrita,
// NO aplicada a producción), probada en Postgres (PGlite). Código de 6 números por correo antes de «Eliminar mi cuenta» y «Descargar mis
// datos»: solo la huella (nunca el código), 10 minutos, 5 intentos, un solo uso, ligado a la acción, a la sesión y al correo verificado
// activo; reenvíos 1 por minuto y 5 por hora; RLS activo y la app no lee la huella. La comparación en tiempo constante está en
// codigo-correo-api.test.ts (se hace en el servidor, con el pepper que no está en la base).
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now(), email_inquilino text);
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
let n = 0, db: PGlite
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const como = (u: string | null) => db.query(`select set_config('test.uid', $1, false)`, [u ?? ''])
const H = (c: string) => c.repeat(64).slice(0, 64), S = 'ab'.repeat(16)
/** Una sesión (aparato) con su correo verificado, como la deja api/verificar-correo.ts. */
async function persona(correo: string) {
  const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u])
  await db.query(`select public.lk_registrar_correo_verificado($1, $2, 'google', md5(random()::text) || md5(random()::text))`, [u, correo])
  return u
}
const nuevo = async (u: string, correo: string, accion: string, huella = H('a')) =>
  (await uno<{ r: { id?: number; error?: string } }>('select public.lk_codigo_nuevo($1, $2, $3, $4, $5) r', [u, correo, accion, huella, S])).r
const intento = async (u: string, accion: string) => (await uno<{ r: { id: number; huella: string; sal: string; correo: string } | null }>('select public.lk_codigo_intento($1, $2) r', [u, accion])).r
const confirmar = async (id: number) => (await uno<{ r: boolean }>('select public.lk_codigo_confirmar($1) r', [id])).r
/** Pasa el tiempo para los códigos de un correo (mueve sus fechas hacia atrás). */
const atrasar = (correo: string, min: number) => db.query(`update public.lk_codigos_correo set creado_en = creado_en - ($2::float8 * interval '1 minute'), vence_en = vence_en - ($2::float8 * interval '1 minute'),
  confirmado_en = confirmado_en - ($2::float8 * interval '1 minute') where correo = $1`, [correo, min])
/** Lo que hace api/_lib/codigo-correo.ts con un código correcto: intento + confirmar. */
async function codigoCorrecto(u: string, correo: string, accion: string) { const r = await nuevo(u, correo, accion); const t = await intento(u, accion); expect(await confirmar(t!.id)).toBe(true); return r.id! }
const CODIGO_MAL = /Ese código no es correcto o ya venció\. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código»\./

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
}, 30_000)

describe('tabla lk_codigos_correo: solo la huella, RLS activo, la app no la lee', () => {
  it('no hay columna para el código; huella = 64 hex y sal = 32 hex (un código de 6 números no entra)', async () => {
    const cols = (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'lk_codigos_correo'`)).rows.map(r => r.column_name)
    expect(cols).not.toContain('codigo'); expect(cols).toEqual(expect.arrayContaining(['huella', 'sal', 'vence_en', 'intentos', 'confirmado_en', 'usado_en', 'anulado_en', 'accion', 'correo', 'usuario']))
    const u = await persona('tabla@ejemplo.com')
    await expect(db.query(`insert into public.lk_codigos_correo(usuario, correo, accion, huella, sal, vence_en) values ($1, 'tabla@ejemplo.com', 'eliminar', '123456', $2, now())`, [u, S])).rejects.toThrow()
    await expect(nuevo(u, 'tabla@ejemplo.com', 'eliminar', '482910')).rejects.toThrow(/inválido/)
    await expect(nuevo(u, 'tabla@ejemplo.com', 'borrar-todo')).rejects.toThrow(/inválido/)
  })
  it('RLS activo, sin políticas ni permisos: anon y authenticated no leen la tabla ni llaman a las funciones del código', async () => {
    expect((await uno<{ r: boolean }>(`select relrowsecurity r from pg_class where relname = 'lk_codigos_correo'`)).r).toBe(true)
    expect((await uno<{ n: number }>(`select count(*)::int n from pg_policies where tablename = 'lk_codigos_correo'`)).n).toBe(0)
    const u = await persona('rls@ejemplo.com'); await nuevo(u, 'rls@ejemplo.com', 'eliminar')
    for (const rol of ['anon', 'authenticated']) {
      await db.exec(`set role ${rol}`)
      try {
        await expect(db.query('select huella from public.lk_codigos_correo')).rejects.toThrow(/permission denied/)
        for (const f of [`lk_codigo_para('${u}')`, `lk_codigo_nuevo('${u}', 'rls@ejemplo.com', 'eliminar', '${H('b')}', '${S}')`, `lk_codigo_intento('${u}', 'eliminar')`, 'lk_codigo_confirmar(1)', 'lk_codigo_borrar(1)', `lk_usar_codigo('${u}', 'rls@ejemplo.com', 'eliminar')`])
          await expect(db.query(`select public.${f}`), `${rol}: ${f}`).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
    await db.exec('set role service_role')
    try { expect((await uno<{ r: string }>(`select public.lk_codigo_para('${u}') r`)).r).toBe('rls@ejemplo.com') } finally { await db.exec('reset role') }
  })
})

describe('pedir el código: solo al correo verificado activo, 1 por minuto y 5 por hora', () => {
  it('el código va al correo verificado ACTIVO de la sesión; otro correo o una sesión sin correo verificado → «correo»', async () => {
    const u = await persona('activo@ejemplo.com')
    expect(await nuevo(u, 'otro@ejemplo.com', 'eliminar')).toEqual({ error: 'correo' })
    const sin = uid(); await db.query('insert into auth.users(id) values ($1)', [sin])
    expect((await uno<{ r: string | null }>('select public.lk_codigo_para($1) r', [sin])).r).toBeNull()
    expect(await nuevo(sin, 'activo@ejemplo.com', 'eliminar')).toEqual({ error: 'correo' })
    expect((await nuevo(u, ' Activo@Ejemplo.com ', 'eliminar')).id).toBeGreaterThan(0)
    const r = await uno<{ correo: string; v: number }>(`select correo, extract(epoch from vence_en - creado_en)::int v from public.lk_codigos_correo where usuario = $1`, [u])
    expect(r).toEqual({ correo: 'activo@ejemplo.com', v: 600 })   // 10 minutos
  })
  it('reenviar: como mucho 1 por minuto (aunque sea otra acción u otra sesión con el mismo correo) y 5 por hora', async () => {
    const c = 'reenvio@ejemplo.com', u = await persona(c), otro = await persona(c)
    expect((await nuevo(u, c, 'eliminar')).id).toBeGreaterThan(0)
    expect(await nuevo(u, c, 'eliminar')).toEqual({ error: 'minuto' })
    expect(await nuevo(u, c, 'descargar')).toEqual({ error: 'minuto' })
    expect(await nuevo(otro, c, 'eliminar')).toEqual({ error: 'minuto' })
    for (let k = 2; k <= 5; k++) { await atrasar(c, 1.5); expect((await nuevo(u, c, 'eliminar')).id, `código ${k}`).toBeGreaterThan(0) }
    await atrasar(c, 1.5); expect(await nuevo(u, c, 'eliminar')).toEqual({ error: 'hora' })
    await atrasar(c, 55); expect((await nuevo(u, c, 'eliminar')).id).toBeGreaterThan(0)   // pasó la hora del primero
  })
  it('un código nuevo anula el anterior de ESA acción (el de la otra acción sigue)', async () => {
    const c = 'anula@ejemplo.com', u = await persona(c)
    const d = await nuevo(u, c, 'descargar', H('d')); await atrasar(c, 2)
    const e1 = await nuevo(u, c, 'eliminar', H('1')); await atrasar(c, 2)
    const e2 = await nuevo(u, c, 'eliminar', H('2'))
    const filas = (await db.query<{ id: number; anulado: boolean }>('select id, anulado_en is not null anulado from public.lk_codigos_correo where usuario = $1 order by id', [u])).rows
    expect(filas).toEqual([{ id: d.id, anulado: false }, { id: e1.id, anulado: true }, { id: e2.id, anulado: false }])
    expect((await intento(u, 'eliminar'))!.huella).toBe(H('2'))
  })
  it('si el correo no salió, lk_codigo_borrar lo quita (no sirve y no cuenta para los reenvíos)', async () => {
    const c = 'fallo@ejemplo.com', u = await persona(c), r = await nuevo(u, c, 'eliminar')
    await db.query('select public.lk_codigo_borrar($1)', [r.id]); expect(await intento(u, 'eliminar')).toBeNull()
    expect((await nuevo(u, c, 'eliminar')).id).toBeGreaterThan(0)
  })
})

describe('intentos: 10 minutos, 5 intentos, ligado a la acción, a la sesión y al correo', () => {
  it('cada intento suma 1 ANTES de comparar; con 5 intentos el código ya no sirve', async () => {
    const c = 'cinco@ejemplo.com', u = await persona(c); await nuevo(u, c, 'eliminar')
    for (let k = 1; k <= 5; k++) { const t = await intento(u, 'eliminar'); expect(t, `intento ${k}`).toMatchObject({ huella: H('a'), sal: S, correo: c }) }
    expect(await intento(u, 'eliminar')).toBeNull()
    expect((await uno<{ i: number }>('select intentos i from public.lk_codigos_correo where usuario = $1', [u])).i).toBe(5)
  })
  it('vencido a los 10 minutos: no hay intento ni se puede confirmar', async () => {
    const c = 'vence@ejemplo.com', u = await persona(c), r = await nuevo(u, c, 'descargar')
    await atrasar(c, 9); expect(await intento(u, 'descargar')).not.toBeNull()
    await atrasar(c, 1.1); expect(await intento(u, 'descargar')).toBeNull(); expect(await confirmar(r.id!)).toBe(false)
  })
  it('el código de «descargar» no sirve para «eliminar» (ni al revés), ni para otra sesión, ni si cambió el correo activo de la sesión', async () => {
    const c = 'accion@ejemplo.com', u = await persona(c), otra = await persona(c); await nuevo(u, c, 'descargar')
    expect(await intento(u, 'eliminar')).toBeNull(); expect(await intento(otra, 'descargar')).toBeNull()
    await db.query(`select public.lk_registrar_correo_verificado($1, 'segunda@ejemplo.com', 'google', md5(random()::text) || md5(random()::text))`, [u])
    expect(await intento(u, 'descargar')).toBeNull()   // la sesión ahora es de otra persona
  })
})

describe('la acción exige el código confirmado, una sola vez, de ESA acción', () => {
  it('lk_pedir_borrado_cuenta sin código: se rechaza y no se pide nada; con el código confirmado: se pide; otra vez: se rechaza (un solo uso)', async () => {
    const c = 'borra@ejemplo.com', u = await persona(c); await como(u)
    await expect(db.query(`select public.lk_pedir_borrado_cuenta($1)`, [c])).rejects.toThrow(CODIGO_MAL)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_solicitudes_borrado where correo = $1', [c])).n).toBe(0)
    await como(null); await codigoCorrecto(u, c, 'eliminar'); await como(u)
    await db.query(`select public.lk_pedir_borrado_cuenta($1)`, [c])
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_solicitudes_borrado where correo = $1', [c])).n).toBe(1)
    await expect(db.query(`select public.lk_pedir_borrado_cuenta($1)`, [c])).rejects.toThrow(CODIGO_MAL)
    await como(null)
    expect(await intento(u, 'eliminar')).toBeNull()   // usado: no hay más intentos
  })
  it('lk_mis_datos_reputacion: igual, y el código de «eliminar» no sirve para descargar', async () => {
    const c = 'datos@ejemplo.com', u = await persona(c)
    await codigoCorrecto(u, c, 'eliminar'); await como(u)
    await expect(db.query(`select public.lk_mis_datos_reputacion($1)`, [c])).rejects.toThrow(CODIGO_MAL)
    await como(null); await atrasar(c, 2); await codigoCorrecto(u, c, 'descargar'); await como(u)
    expect((await uno<{ d: { correo: string } }>(`select public.lk_mis_datos_reputacion($1) d`, [c])).d.correo).toBe(c)
    await expect(db.query(`select public.lk_mis_datos_reputacion($1)`, [c])).rejects.toThrow(CODIGO_MAL)
    await como(null)
  })
  it('un código sin confirmar (no lo escribieron bien) no sirve, y uno confirmado hace más de 2 minutos tampoco', async () => {
    const c = 'sinconf@ejemplo.com', u = await persona(c); await nuevo(u, c, 'eliminar'); await intento(u, 'eliminar')
    await como(u); await expect(db.query(`select public.lk_pedir_borrado_cuenta($1)`, [c])).rejects.toThrow(CODIGO_MAL); await como(null)
    const t = await intento(u, 'eliminar'); await confirmar(t!.id); await atrasar(c, 2.5)
    await como(u); await expect(db.query(`select public.lk_pedir_borrado_cuenta($1)`, [c])).rejects.toThrow(CODIGO_MAL); await como(null)
  })
  it('si la acción falla, se deshace todo y el código sigue confirmado (se puede reintentar sin pedir otro)', async () => {
    const c = 'reintento@ejemplo.com', u = await persona(c); await codigoCorrecto(u, c, 'descargar'); await como(u)
    await db.exec('begin'); await db.query(`select public.lk_mis_datos_reputacion($1)`, [c]); await db.exec('rollback')   // la acción falló después de usarlo
    expect((await uno<{ d: { correo: string } }>(`select public.lk_mis_datos_reputacion($1) d`, [c])).d.correo).toBe(c)
    await como(null)
  })
  it('borrar la cuenta borra también sus códigos', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')).toMatch(/delete from public\.lk_codigos_correo where correo = s\.correo;/)
  })
  it('textos: el error del código es el literal de Legal y queda «LEGAL: revisado (25/10, 5:04 p. m.)»', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const sql = fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')
    expect(sql).toMatch(/LEGAL: revisado \(25\/10, 5:04 p\. m\.\) · texto literal de Legal \(diseño del segundo factor\)\ncreate or replace function public\.lk_usar_codigo/)
    const disparador = sql.slice(sql.indexOf('create or replace function public.lk_participante_correo_verificado') - 200, sql.indexOf('No pudimos confirmar el correo de tu cuenta. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.'))
    expect(disparador).toMatch(/LEGAL: revisado \(25\/10, 5:04 p\. m\.\) · texto propio aprobado por Legal/); expect(disparador).not.toMatch(/LEGAL: revisar/)
  })
})
