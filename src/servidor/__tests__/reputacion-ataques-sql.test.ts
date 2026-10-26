// Paso 19 · Legal, revisión de 96e931b (25/10/2026, 4:45 p. m.), BLOQUEANTE 1: lk_participantes.email_cavos lo escribe la app (no está
// verificado). Ataque probado por Legal: una sesión atacante crea un alquiler en_curso con email_cavos = el correo de la víctima → el
// borrado de la víctima quedaba sin fecha para siempre y sus filas aparecían en la descarga de la víctima.
// Ahora la persona sale SOLO de lk_correos_verificados; un email_cavos sin verificar para ESA sesión no cuenta para nada. Con la
// reputación encendida, además, no se puede crear ni aceptar un alquiler con un correo que esa sesión no verificó.
// También: token de un solo uso (huella), límite de intentos y search_path vacío en las funciones de fechas.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { CODIGO_DE_PRUEBA } from './codigo-de-prueba'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create table public.lk_contratos (id uuid primary key, estado text not null, actualizado_en timestamptz not null default now(), email_inquilino text);
  create table public.lk_participantes (contrato_id uuid not null, rol text not null, usuario uuid not null, email_cavos text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`
let n = 0
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const como = (u: string | null) => db.query(`select set_config('test.uid', $1, false)`, [u ?? ''])
const aparato = async () => { const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u]); return u }
const huella = () => Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
const verificar = (u: string, correo: string, h = huella()) => db.query(`select public.lk_registrar_correo_verificado($1, $2, 'google', $3)`, [u, correo, h])
/** Lo que hacen lk_crear_contrato / lk_crear_contrato_invitando / lk_aceptar_invitacion (insert con usuario = auth.uid()). */
async function alquiler(u: string, correo: string | null, estado = 'en_curso', rol = 'dueno') {
  const id = crypto.randomUUID()
  await db.query('insert into public.lk_contratos(id, estado) values ($1, $2)', [id, estado])
  await db.query('insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, $2, $3, $4)', [id, rol, u, correo])
  return id
}

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  await db.exec(CODIGO_DE_PRUEBA)   // segundo factor: ver codigo-de-prueba.ts
}, 30_000)

describe('BLOQUEANTE 1 · ataque con email_cavos sin verificar (reproducido)', () => {
  it('el alquiler en_curso del atacante con el correo de la víctima no frena su borrado ni entra en su descarga', async () => {
    const V = await aparato(), X = await aparato()
    await verificar(V, 'victima@ejemplo.com'); await verificar(X, 'atacante@ejemplo.com')
    await como(V); await db.query(`select public.lk_aceptar_reputacion('victima@ejemplo.com', 'v', '{a}')`); await como(null)
    // el atacante (reputación apagada: sin fila de encendido) crea un alquiler en_curso diciendo que es la víctima
    const k = await alquiler(X, 'victima@ejemplo.com')
    await db.query(`insert into public.lk_reputacion_revisiones(usuario, rol, contrato_id, texto, limite) values ($1, 'dueno', $2, 'Inyectado', now())`, [X, k])
    expect((await uno<{ c: string | null }>('select correo c from public.lk_reputacion_revisiones where contrato_id = $1', [k])).c).toBeNull()
    expect((await db.query<{ x: string }>('select x from public.lk_uids_de_correo($1) x', ['victima@ejemplo.com'])).rows.map(r => r.x)).toEqual([V])
    expect((await db.query<{ x: string }>('select x from public.lk_correos_de($1) x', [X])).rows.map(r => r.x)).toEqual(['atacante@ejemplo.com'])
    expect((await uno<{ a: boolean }>(`select public.lk_persona_tiene_alquiler_abierto(array[$1]::uuid[], 'victima@ejemplo.com') a`, [V])).a).toBe(false)
    await como(V)
    const d = (await uno<{ d: Record<string, unknown[]> }>('select public.t_mis_datos_reputacion() d')).d
    expect(JSON.stringify(d)).not.toContain('Inyectado')
    const f = (await uno<{ f: Date | null }>(`select public.t_pedir_borrado_cuenta('victima@ejemplo.com') f`)).f
    await como(null)
    expect(f).not.toBeNull()                                   // con fecha: el alquiler del atacante no cuenta como abierto
    expect((await uno<{ x: boolean | null }>('select alquiler_abierto x from public.lk_solicitudes_borrado where usuario = $1', [V])).x).toBe(false)
  })
  it('un email_cavos sin verificar no cuenta como «tiene alquileres» de la víctima (REP-01) ni le pone correo a sus eventos', async () => {
    const V = await aparato(), X = await aparato()
    await verificar(V, 'v2@ejemplo.com'); await alquiler(X, 'v2@ejemplo.com', 'cerrado')
    expect((await uno<{ p: boolean }>(`select public.lk_rep01_pendiente($1, 'v2@ejemplo.com') p`, [V])).p).toBe(true)
  })
  it('con la reputación encendida, crear o aceptar un alquiler exige que ESA sesión haya verificado ese correo', async () => {
    const X = await aparato(), V = await aparato()
    await verificar(X, 'atk3@ejemplo.com'); await verificar(V, 'v3@ejemplo.com')
    await como(X); await db.query(`select public.lk_aceptar_reputacion('atk3@ejemplo.com', 'v', '{a}')`); await como(null)
    await db.query('insert into public.lk_reputacion_encendido default values on conflict do nothing')
    try {
      await expect(alquiler(X, 'v3@ejemplo.com')).rejects.toThrow(/No pudimos confirmar el correo de tu cuenta\. Sal de Lockumi, vuelve a entrar con tu correo/)
      await expect(alquiler(X, 'V3@Ejemplo.com ', 'firmas', 'inquilino')).rejects.toThrow(/No pudimos confirmar el correo de tu cuenta/)
      await expect(alquiler(X, 'atk3@ejemplo.com')).resolves.toBeTruthy()
    } finally { await db.query('delete from public.lk_reputacion_encendido') }
    // apagada: igual que hoy en producción (escenario C no cambia), pero ese correo no cuenta para nada (pruebas de arriba)
    await expect(alquiler(X, 'v3@ejemplo.com')).resolves.toBeTruthy()
  })
})

describe('BLOQUEANTE 2 en la base · token de un solo uso y límite de intentos', () => {
  it('la misma huella de token no verifica dos veces (ni en otra sesión); sin huella válida no se registra', async () => {
    const A = await aparato(), B = await aparato(), h = huella()
    await verificar(A, 'uso1@ejemplo.com', h)
    await expect(verificar(A, 'uso1@ejemplo.com', h)).rejects.toThrow(/ya se usó/)
    await expect(verificar(B, 'uso1@ejemplo.com', h)).rejects.toThrow(/ya se usó/)
    await expect(db.query(`select public.lk_registrar_correo_verificado($1, 'uso2@ejemplo.com', 'google', 'corta')`, [A])).rejects.toThrow(/inválid/)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_correos_verificados where usuario = $1', [B])).n).toBe(0)
  })
  it('lk_intento_verificacion: deja pasar hasta el máximo en la ventana y después no', async () => {
    const r = []
    for (let i = 0; i < 3; i++) r.push((await uno<{ ok: boolean }>(`select public.lk_intento_verificacion('sesion:prueba', 2, interval '10 minutes') ok`)).ok)
    expect(r).toEqual([true, true, false])
    expect((await uno<{ ok: boolean }>(`select public.lk_intento_verificacion('sesion:otra', 2, interval '10 minutes') ok`)).ok).toBe(true)
  })
  it('las tablas de huellas e intentos y sus funciones son solo de la clave de servicio', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const sql = fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')
    expect(sql).toMatch(/revoke all on public\.lk_tokens_usados from anon, authenticated;/)
    expect(sql).toMatch(/revoke all on public\.lk_intentos_verificacion from anon, authenticated;/)
    expect(sql).toMatch(/grant execute on function public\.lk_intento_verificacion\(text, int, interval\) to service_role;/)
    expect(sql).toMatch(/grant execute on function public\.lk_registrar_correo_verificado\(uuid, text, text, text\) to service_role;/)
  })
})

describe('search_path vacío (Legal 4:45)', () => {
  it('lk_de_la_persona, lk_pascua, lk_es_feriado_cr y lk_fecha_limite_borrado fijan search_path = \'\' y siguen dando lo mismo', async () => {
    const r = await db.query<{ proname: string; c: string[] | null }>(`select proname, proconfig c from pg_proc where proname in ('lk_de_la_persona','lk_pascua','lk_es_feriado_cr','lk_fecha_limite_borrado') order by 1`)
    expect(r.rows.map(x => [x.proname, x.c])).toEqual(['lk_de_la_persona', 'lk_es_feriado_cr', 'lk_fecha_limite_borrado', 'lk_pascua'].map(p => [p, ['search_path=""']]))
    expect((await uno<{ d: string }>(`select public.lk_pascua(2026)::text d`)).d).toBe('2026-04-05')
    expect((await uno<{ f: boolean }>(`select public.lk_es_feriado_cr('2026-04-02') f`)).f).toBe(true)
    await db.exec('set search_path = pg_catalog')
    try { expect((await uno<{ d: string }>(`select (public.lk_fecha_limite_borrado('2026-10-23 12:00-06') at time zone 'America/Costa_Rica')::date::text d`)).d).toBe('2026-10-30') }
    finally { await db.exec('reset search_path') }
  })
})
