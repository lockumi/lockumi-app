// Paso 19 · La persona = el correo que Cavos ya autenticó (Legal, 25/10/2026, 4:01 p. m.), en 20261025140000_reputacion.sql
// (escrita, NO aplicada a producción). auth.uid() es una sesión anónima POR APARATO: aquí se prueba que el perfil, el bloqueo por
// borrado pendiente, la regla «sin REP-01 y sin alquileres», el borrado y la descarga siguen a la PERSONA (todas las sesiones con ese
// correo), con el correo normalizado (trim + minúsculas) y solo de lk_participantes.email_cavos o del correo de la sesión autenticada.
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
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, kid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!
const cuantos = async (tabla: string, uids: string[]) => (await uno<{ n: number }>(`select count(*)::int n from ${tabla} where ${tabla === 'auth.users' ? 'id' : 'usuario'} = any($1::uuid[])`, [uids])).n
const como = (u: string | null) => db.query(`select set_config('test.uid', $1, false)`, [u ?? ''])
const contrato = async (estado = 'cerrado', emailInquilino: string | null = null) => { const c = kid(); await db.query('insert into public.lk_contratos(id, estado, email_inquilino) values ($1, $2, $3)', [c, estado, emailInquilino]); return c }
/** Crear o aceptar un alquiler como lo hace la app: esa sesión ya verificó su correo (Legal 4:45: un email_cavos sin verificar no cuenta). */
const entrar = async (c: string, rol: string, usuario: string, correo: string) => { await verificar(usuario, correo); return db.query('insert into public.lk_participantes values ($1, $2, $3, $4)', [c, rol, usuario, correo]) }
const aparato = async (email: string | null = null) => { const u = uid(); await db.query('insert into auth.users(id, email) values ($1, $2)', [u, email]); return u }
/** Lo que hace api/verificar-correo.ts (clave de servicio) tras validar el token de Cavos (Legal, 25/10 4:23 p. m.: sin esto, se rechaza). */
const verificar = (u: string, correo: string) => db.query(`select public.lk_registrar_correo_verificado($1, $2, 'google', md5(random()::text) || md5(random()::text))`, [u, correo])
const conPerfil = async (u: string) => {
  await db.query(`insert into public.lk_reputacion_aceptaciones(usuario, version, texto) values ($1, '1.10-demo', '{a,b}')`, [u])
  await db.query(`insert into public.lk_reputacion_perfiles(usuario, nombre_visible, canton) values ($1, 'Ejemplo E.', 'Escazú')`, [u])
  await db.query(`insert into public.lk_reputacion_consentimientos(usuario, rol, opcion, version, texto) values ($1, 'dueno', 'destacados', 'v', '{x}')`, [u])
}
const evento = (u: string, rol: string, c: string) => db.query(`insert into public.lk_reputacion_eventos(usuario, rol, contrato_id, tipo, valor, ocurrio_en) values ($1, $2, $3, 'descuento_deposito', 3, now())`, [u, rol, c])
const revision = (u: string, c: string) => db.query(`insert into public.lk_reputacion_revisiones(usuario, rol, contrato_id, texto, limite) values ($1, 'inquilino', $2, 'Está mal', now())`, [u, c])
const BORRADO = /Pediste eliminar tu cuenta/, SIN_PERFIL = /Antes de crear un alquiler o unirte a uno, acepta tu perfil de reputación en la app\. No tiene ningún costo\./, OTRO_CORREO = /no es el de tu cuenta/

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
  await db.exec(CODIGO_DE_PRUEBA)   // segundo factor: ver codigo-de-prueba.ts
}, 30_000)

describe('el correo de la persona: solo el que Cavos ya autenticó, normalizado', () => {
  it('lk_correos_de: SOLO los correos verificados de la sesión, con trim y minúsculas (Legal 4:45: ni email_cavos sin verificar ni auth.users.email)', async () => {
    const a = await aparato(' Sesion@Ejemplo.com '), c = await contrato(); await entrar(c, 'dueno', a, '  Ana@Ejemplo.COM ')
    await db.query('insert into public.lk_participantes values ($1, $2, $3, $4)', [await contrato(), 'inquilino', a, 'sin.verificar@ejemplo.com'])
    const xs = (await db.query<{ c: string }>('select c from public.lk_correos_de($1) c order by 1', [a])).rows.map(r => r.c)
    expect(xs).toEqual(['ana@ejemplo.com'])
  })
  it('un correo escrito a mano (p. ej. el del inquilino invitado) no sirve para identificar a nadie', async () => {
    const a = await aparato(), c = await contrato('cerrado', 'escrito@ejemplo.com'); await entrar(c, 'dueno', a, 'dueno-a@ejemplo.com')
    expect((await db.query('select 1 from public.lk_uids_de_correo($1)', ['escrito@ejemplo.com'])).rows).toEqual([])
    await como(a)
    await expect(db.query(`select public.t_pedir_borrado_cuenta('escrito@ejemplo.com')`)).rejects.toThrow(OTRO_CORREO)
    await expect(db.query(`select public.t_mis_datos_reputacion('escrito@ejemplo.com')`)).rejects.toThrow(OTRO_CORREO)
    await como(null)
  })
})

describe('bloqueo por borrado pendiente: sigue a la persona en otro aparato', () => {
  it('pedido en el aparato A → en el aparato B (otra sesión anónima, mismo correo) no crea ni se une', async () => {
    const A = await aparato(), B = await aparato(), c = await contrato(); await entrar(c, 'inquilino', A, 'bloqueo@ejemplo.com'); await verificar(A, 'bloqueo@ejemplo.com')
    await como(A); await db.query(`select public.t_pedir_borrado_cuenta(' BLOQUEO@ejemplo.com ')`); await como(null)
    for (const correo of ['bloqueo@ejemplo.com', '  Bloqueo@Ejemplo.COM ']) for (const rol of ['dueno', 'inquilino'])
      await expect(entrar(await contrato('firmas'), rol, B, correo)).rejects.toThrow(BORRADO)
    await entrar(await contrato('firmas'), 'dueno', B, 'otra-persona@ejemplo.com')          // otra persona en ese aparato: sí
  })
  it('sin correo en el pedido, usa el único correo vinculado a la sesión', async () => {
    const A = await aparato(), B = await aparato(); await entrar(await contrato(), 'dueno', A, 'unico@ejemplo.com'); await verificar(A, 'unico@ejemplo.com')
    await como(A); await db.query('select public.t_pedir_borrado_cuenta()'); await como(null)
    expect((await uno<{ c: string }>('select correo c from public.lk_solicitudes_borrado where usuario = $1', [A])).c).toBe('unico@ejemplo.com')
    await expect(entrar(await contrato('firmas'), 'inquilino', B, 'unico@ejemplo.com')).rejects.toThrow(BORRADO)
  })
})

describe('el borrado llega a TODAS las sesiones con ese correo', () => {
  it('sin alquiler abierto: perfil, aceptación y vitrinas al instante; eventos, revisiones y cuentas en la tarea; nada de otras personas', async () => {
    const c1 = await contrato(), c2 = await contrato()
    const A = await aparato(), B = await aparato(), S = await aparato('Todo@Ejemplo.com'), OTRA = await aparato()
    await entrar(c1, 'dueno', A, 'todo@ejemplo.com'); await entrar(c2, 'inquilino', B, ' TODO@ejemplo.com'); await entrar(c2, 'dueno', OTRA, 'vecina@ejemplo.com')
    await verificar(S, 'todo@ejemplo.com')   // 4:45: el correo de auth.users solo cuenta si esa sesión lo verificó
    for (const u of [A, B, S, OTRA]) await conPerfil(u)
    await evento(A, 'dueno', c1); await evento(B, 'inquilino', c2); await revision(B, c2); await evento(OTRA, 'dueno', c2)
    await verificar(B, 'todo@ejemplo.com'); await como(B); await db.query(`select public.t_pedir_borrado_cuenta('todo@ejemplo.com')`); await como(null)
    for (const t of ['public.lk_reputacion_perfiles', 'public.lk_reputacion_aceptaciones', 'public.lk_reputacion_consentimientos']) expect(await cuantos(t, [A, B, S]), t).toBe(0)
    for (const u of [A, S]) expect((await uno<{ v: boolean }>('select public.lk_perfil_visible($1) v', [u])).v).toBe(false)
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    for (const t of ['public.lk_reputacion_eventos', 'public.lk_reputacion_revisiones', 'auth.users']) expect(await cuantos(t, [A, B, S]), t).toBe(0)
    for (const t of ['public.lk_reputacion_perfiles', 'public.lk_reputacion_eventos', 'auth.users']) expect(await cuantos(t, [OTRA]), t).toBe(1)
    const s = await uno<{ correo: string | null; hecho: boolean }>('select correo, hecho_en is not null hecho from public.lk_solicitudes_borrado where usuario = $1', [B])
    expect(s).toEqual({ correo: null, hecho: true })                       // la constancia queda sin datos personales
    expect(await cuantos('public.lk_participantes', [A, B])).toBe(2)        // los contratos y sus participantes no se tocan
  })
  it('excepción ya definida: con un alquiler abierto en CUALQUIER aparato, no se borra nada hasta que se cierra', async () => {
    const abierto = await contrato('en_curso'), cerrado = await contrato(), A = await aparato(), B = await aparato()
    await entrar(abierto, 'inquilino', A, 'abierto@ejemplo.com'); await entrar(cerrado, 'dueno', B, 'abierto@ejemplo.com')
    for (const u of [A, B]) await conPerfil(u)
    await verificar(B, 'abierto@ejemplo.com'); await como(B); expect((await uno<{ f: Date | null }>(`select public.t_pedir_borrado_cuenta('abierto@ejemplo.com') f`)).f).toBeNull(); await como(null)
    expect((await uno<{ a: boolean }>('select alquiler_abierto a from public.lk_solicitudes_borrado where usuario = $1', [B])).a).toBe(true)
    expect(await cuantos('public.lk_reputacion_perfiles', [A, B])).toBe(2)
    for (const u of [A, B]) expect((await uno<{ v: boolean }>('select public.lk_perfil_visible($1) v', [u])).v).toBe(false)   // pero no se muestra
    await db.query('select public.lk_borrar_cuentas_pedidas()'); expect(await cuantos('auth.users', [A, B])).toBe(2)
    await db.query(`update public.lk_contratos set estado = 'cerrado' where id = $1`, [abierto])
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    for (const t of ['public.lk_reputacion_perfiles', 'public.lk_reputacion_aceptaciones', 'auth.users']) expect(await cuantos(t, [A, B]), t).toBe(0)
  })
})

describe('descargar mis datos: desde el servidor, de todas las sesiones con ese correo', () => {
  it('junta lo de los dos aparatos, filtra por papel y no trae nada de otras personas', async () => {
    const c1 = await contrato(), c2 = await contrato(), A = await aparato(), B = await aparato(), OTRA = await aparato()
    await entrar(c1, 'dueno', A, 'datos@ejemplo.com'); await entrar(c2, 'inquilino', B, 'datos@ejemplo.com'); await entrar(c1, 'inquilino', OTRA, 'otra@ejemplo.com'); await entrar(c2, 'dueno', OTRA, 'otra@ejemplo.com')   // los dos alquileres cuentan: B tiene perfil por su correo (lo aceptó en A)
    await conPerfil(A); await conPerfil(OTRA); await evento(A, 'dueno', c1); await evento(B, 'inquilino', c2); await revision(B, c2); await evento(OTRA, 'inquilino', c1)
    await verificar(B, 'datos@ejemplo.com'); await como(B)
    type D = { correo: string; cuentas: number; perfiles: unknown[]; aceptaciones: unknown[]; vitrinas: unknown[]; eventos: { rol: string }[]; revisiones: unknown[]; solicitudes_borrado: unknown[] }
    const d = (await uno<{ d: D }>(`select public.t_mis_datos_reputacion(' Datos@Ejemplo.com ') d`)).d
    expect(d.correo).toBe('datos@ejemplo.com'); expect(d.cuentas).toBe(2)
    expect([d.perfiles.length, d.aceptaciones.length, d.vitrinas.length, d.eventos.length, d.revisiones.length]).toEqual([1, 1, 1, 2, 1])
    expect(JSON.stringify(d)).not.toContain(OTRA)
    const r = (await uno<{ d: D }>(`select public.t_mis_datos_reputacion('datos@ejemplo.com', 'dueno') d`)).d
    expect(r.eventos.map(e => e.rol)).toEqual(['dueno']); expect(r.revisiones).toEqual([])
    await como(null); await expect(db.query(`select public.t_mis_datos_reputacion('datos@ejemplo.com')`)).rejects.toThrow(/Entra a tu cuenta/)
  })
})

describe('regla «sin REP-01 y sin alquileres» por correo (con la reputación encendida)', () => {
  let conAlq = '', conRep = ''
  beforeAll(async () => {
    conAlq = await aparato(); conRep = await aparato('rep@ejemplo.com')
    await verificar(conRep, 'rep@ejemplo.com')   // 4:45: solo correos verificados
    await entrar(await contrato(), 'dueno', conAlq, 'alquileres@ejemplo.com'); await conPerfil(conRep)
    await db.query('insert into public.lk_reputacion_encendido default values')
  })
  it('persona nueva sin REP-01: bloqueada en el aparato A y también en el B', async () => {
    const A = await aparato(), B = await aparato()
    for (const u of [A, B]) await expect(entrar(await contrato('firmas'), 'dueno', u, 'nueva@ejemplo.com')).rejects.toThrow(SIN_PERFIL)
    expect((await uno<{ v: boolean }>(`select public.lk_sin_perfil_ni_alquileres($1, 'nueva@ejemplo.com') v`, [B])).v).toBe(true)
  })
  it('RIESGO (a): una cuenta nueva que aceptó REP-01 (lk_aceptar_reputacion, por correo normalizado) entra, en ese aparato y en otro', async () => {
    const A = await aparato(), B = await aparato(); await verificar(A, 'nueva.acepto@ejemplo.com'); await verificar(B, 'nueva.acepto@ejemplo.com')
    await como(A); expect((await uno<{ ok: boolean }>(`select public.lk_aceptar_reputacion(' Nueva.Acepto@Ejemplo.COM ', '1.10-demo', '{a,b}') ok`)).ok).toBe(true)
    await db.query(`select public.lk_aceptar_reputacion('nueva.acepto@ejemplo.com', 'otra', '{c}')`); await como(null)   // la segunda no cambia nada
    expect(await uno('select correo, version, texto from public.lk_reputacion_aceptaciones where usuario = $1', [A])).toEqual({ correo: 'nueva.acepto@ejemplo.com', version: '1.10-demo', texto: ['a', 'b'] })
    await entrar(await contrato('firmas'), 'dueno', A, 'nueva.acepto@ejemplo.com')
    await entrar(await contrato('firmas'), 'inquilino', B, ' NUEVA.ACEPTO@ejemplo.com')   // segundo aparato (correo verificado), sin aceptación propia
  })
  it('RIESGO (b): una cuenta con alquileres que entra desde un segundo aparato no se bloquea', async () => {
    const B = await aparato(); await verificar(B, 'alquileres@ejemplo.com')
    await entrar(await contrato('firmas'), 'dueno', B, ' Alquileres@Ejemplo.com ')
  })
  it('aceptó REP-01 en otro aparato (sesión con ese correo): entra', async () => {
    const B = await aparato(); await verificar(B, 'rep@ejemplo.com')
    await entrar(await contrato('firmas'), 'inquilino', B, 'rep@ejemplo.com')
    expect(conRep).not.toBe('')
  })
  it('lk_aceptar_reputacion: sin sesión, sin correo válido o sin texto, error que dice cómo seguir; con un borrado pendiente no guarda', async () => {
    const A = await aparato(); await verificar(A, 'x@ejemplo.com'); await verificar(A, 'alquileres@ejemplo.com'); await verificar(conAlq, 'alquileres@ejemplo.com')
    await como(null); await expect(db.query(`select public.lk_aceptar_reputacion('x@ejemplo.com', 'v', '{a}')`)).rejects.toThrow(/Entra a tu cuenta para aceptar/)
    await como(A)
    await expect(db.query(`select public.lk_aceptar_reputacion('no-es-correo', 'v', '{a}')`)).rejects.toThrow(/vuelve a entrar con tu correo y acepta de nuevo/)
    await expect(db.query(`select public.lk_aceptar_reputacion('x@ejemplo.com', 'v', '{}')`)).rejects.toThrow(/acepta de nuevo tu perfil/)
    await como(conAlq); await db.query(`select public.t_pedir_borrado_cuenta('alquileres@ejemplo.com')`)
    await como(A); expect((await uno<{ ok: boolean }>(`select public.lk_aceptar_reputacion('alquileres@ejemplo.com', 'v', '{a}') ok`)).ok).toBe(false)
    await como(null); expect(await cuantos('public.lk_reputacion_aceptaciones', [A])).toBe(0)
  })
})
