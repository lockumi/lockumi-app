// Paso 19 · Legal, 25/10/2026, 4:23 p. m.: (1) el correo se verifica en el servidor contra el token de Cavos (api/verificar-correo.ts
// escribe lk_correos_verificados con la clave de servicio); hasta verificarlo, la descarga, el borrado y la aceptación lo RECHAZAN
// (cierre por defecto). (2) Dos correos en el mismo aparato: eliminar A nunca borra las filas de B (se filtra por CORREO, no por la
// sesión compartida). (3) Límite 4: lk_necesita_rep01 dice, por el correo verificado, si la persona todavía tiene que aceptar REP-01.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

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
const como = (u: string | null) => db.query(`select set_config('test.uid', $1, false)`, [u ?? ''])
const aparato = async () => { const u = uid(); await db.query('insert into auth.users(id) values ($1)', [u]); return u }
const contrato = async (estado = 'cerrado') => { const c = kid(); await db.query('insert into public.lk_contratos(id, estado) values ($1, $2)', [c, estado]); return c }
const entrar = (c: string, rol: string, usuario: string, correo: string) => db.query('insert into public.lk_participantes values ($1, $2, $3, $4)', [c, rol, usuario, correo])
/** Lo que hace api/verificar-correo.ts (con la clave de servicio) después de validar el token de Cavos. */
const verificar = (u: string, correo: string, metodo = 'google') => db.query('select public.lk_registrar_correo_verificado($1, $2, $3)', [u, correo, metodo])
const NO_VERIFICADO = /Ese correo no es el de tu cuenta en este aparato\. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo\./
const ACEPTAR_NO_VERIFICADO = /No pudimos leer el correo de tu cuenta\. Sal de Lockumi, vuelve a entrar con tu correo y acepta de nuevo\./

beforeAll(async () => {
  db = new PGlite(); await db.exec(PRELUDIO)
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
  await db.exec(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8'))
}, 30_000)

describe('correo verificado contra el token de Cavos (cierre por defecto)', () => {
  it('solo la clave de servicio registra un correo verificado (normalizado); la app no puede escribirlo ni leer la tabla', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const sql = fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')
    expect(sql).toMatch(/revoke all on public\.lk_correos_verificados from anon, authenticated/)
    expect(sql).toMatch(/revoke all on function public\.lk_registrar_correo_verificado\(uuid, text, text\) from public, anon, authenticated;\s*grant execute on function public\.lk_registrar_correo_verificado\(uuid, text, text\) to service_role/)
    const A = await aparato(); await verificar(A, ' Ana@Ejemplo.COM ')
    expect((await uno<{ c: string }>('select correo c from public.lk_correos_verificados where usuario = $1', [A])).c).toBe('ana@ejemplo.com')
    await expect(verificar(A, 'no-es-correo')).rejects.toThrow()
  })
  it('descarga: rechaza un correo sin verificar aunque sea el email_cavos de sus alquileres; con el correo verificado, sí', async () => {
    const A = await aparato(); await entrar(await contrato(), 'dueno', A, 'datos.v@ejemplo.com')
    await como(A)
    await expect(db.query(`select public.lk_mis_datos_reputacion('datos.v@ejemplo.com')`)).rejects.toThrow(NO_VERIFICADO)
    await expect(db.query(`select public.lk_mis_datos_reputacion()`)).rejects.toThrow(NO_VERIFICADO)
    await como(null); await verificar(A, 'datos.v@ejemplo.com'); await como(A)
    expect((await uno<{ d: { correo: string } }>(`select public.lk_mis_datos_reputacion('Datos.V@ejemplo.com') d`)).d.correo).toBe('datos.v@ejemplo.com')
    await como(null)
  })
  it('borrado: rechaza un correo sin verificar (no guarda ningún pedido); con el correo verificado, sí', async () => {
    const A = await aparato(); await entrar(await contrato(), 'dueno', A, 'borra.v@ejemplo.com')
    await como(A)
    await expect(db.query(`select public.lk_pedir_borrado_cuenta('borra.v@ejemplo.com')`)).rejects.toThrow(NO_VERIFICADO)
    await expect(db.query(`select public.lk_pedir_borrado_cuenta()`)).rejects.toThrow(NO_VERIFICADO)
    await como(null)
    expect((await uno<{ n: number }>(`select count(*)::int n from public.lk_solicitudes_borrado where usuario = $1`, [A])).n).toBe(0)
    await verificar(A, 'borra.v@ejemplo.com'); await como(A); await db.query(`select public.lk_pedir_borrado_cuenta('borra.v@ejemplo.com')`); await como(null)
    expect((await uno<{ n: number }>(`select count(*)::int n from public.lk_solicitudes_borrado where correo = 'borra.v@ejemplo.com'`)).n).toBe(1)
  })
  it('aceptación: rechaza un correo sin verificar (no guarda nada); con el correo verificado, sí', async () => {
    const A = await aparato(); await como(A)
    await expect(db.query(`select public.lk_aceptar_reputacion('acepta.v@ejemplo.com', '1.10-demo', '{a,b}')`)).rejects.toThrow(ACEPTAR_NO_VERIFICADO)
    await como(null)
    expect((await uno<{ n: number }>('select count(*)::int n from public.lk_reputacion_aceptaciones where usuario = $1', [A])).n).toBe(0)
    await verificar(A, 'acepta.v@ejemplo.com'); await como(A)
    expect((await uno<{ ok: boolean }>(`select public.lk_aceptar_reputacion('acepta.v@ejemplo.com', '1.10-demo', '{a,b}') ok`)).ok).toBe(true)
    await como(null)
  })
  it('el correo verificado de OTRA sesión no sirve en esta (cada aparato verifica el suyo)', async () => {
    const A = await aparato(), B = await aparato(); await verificar(A, 'otro.ap@ejemplo.com')
    await como(B)
    await expect(db.query(`select public.lk_mis_datos_reputacion('otro.ap@ejemplo.com')`)).rejects.toThrow(NO_VERIFICADO)
    await expect(db.query(`select public.lk_aceptar_reputacion('otro.ap@ejemplo.com', 'v', '{a}')`)).rejects.toThrow(ACEPTAR_NO_VERIFICADO)
    await como(null)
  })
  it('texto de Legal para «falta el texto» y marcas revisado', async () => {
    const A = await aparato(); await verificar(A, 'texto.v@ejemplo.com'); await como(A)
    await expect(db.query(`select public.lk_aceptar_reputacion('texto.v@ejemplo.com', 'v', '{}')`)).rejects.toThrow(/^No pudimos guardar tu aceptación\. Vuelve a abrir Lockumi y acepta de nuevo tu perfil de reputación\.$/)
    await como(null)
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    expect(fs.readFileSync('supabase/migrations/20261025140000_reputacion.sql', 'utf8')).not.toMatch(/LEGAL: revisar · ronda 25\/10 4:01/)
  })
})

describe('dos correos en el mismo aparato: eliminar A nunca borra lo de B', () => {
  it('A y B en la misma sesión; A pide eliminar (sin alquiler abierto) y la tarea corre: lo de B queda intacto', async () => {
    const U = await aparato()
    await verificar(U, 'a.comp@ejemplo.com'); await verificar(U, 'b.comp@ejemplo.com')
    await entrar(await contrato(), 'dueno', U, 'a.comp@ejemplo.com'); await entrar(await contrato(), 'inquilino', U, 'b.comp@ejemplo.com')
    // Cada uno entra con Cavos en el aparato (verifica) y queda como el correo activo de la sesión (límite (g), Legal 4:41).
    await verificar(U, 'a.comp@ejemplo.com'); await como(U); await db.query(`select public.lk_aceptar_reputacion('a.comp@ejemplo.com', 'v', '{a}')`)
    await verificar(U, 'b.comp@ejemplo.com'); await db.query(`select public.lk_aceptar_reputacion('b.comp@ejemplo.com', 'v', '{b}')`)
    await como(null)
    for (const c of ['a.comp@ejemplo.com', 'b.comp@ejemplo.com']) {
      await db.query(`insert into public.lk_reputacion_perfiles(usuario, correo, nombre_visible, canton) values ($1, $2, 'Ejemplo E.', 'Escazú')`, [U, c])
      await db.query(`insert into public.lk_reputacion_consentimientos(usuario, correo, rol, opcion, version, texto) values ($1, $2, 'dueno', 'destacados', 'v', '{x}')`, [U, c])
      await db.query(`insert into public.lk_reputacion_revisiones(usuario, correo, rol, contrato_id, texto, limite) values ($1, $2, 'inquilino', $3, 'Está mal', now())`, [U, c, await contrato()])
      await db.query(`insert into public.lk_reputacion_eventos(usuario, correo, rol, contrato_id, tipo, valor, ocurrio_en) values ($1, $2, 'dueno', $3, 'descuento_deposito', 3, now())`, [U, c, kid()])
    }
    const deB = async () => (await uno<Record<string, number>>(`select
      (select count(*)::int from public.lk_reputacion_perfiles where correo = 'b.comp@ejemplo.com') perfiles,
      (select count(*)::int from public.lk_reputacion_aceptaciones where correo = 'b.comp@ejemplo.com') aceptaciones,
      (select count(*)::int from public.lk_reputacion_consentimientos where correo = 'b.comp@ejemplo.com') consentimientos,
      (select count(*)::int from public.lk_reputacion_revisiones where correo = 'b.comp@ejemplo.com') revisiones,
      (select count(*)::int from public.lk_reputacion_eventos where correo = 'b.comp@ejemplo.com') eventos,
      (select count(*)::int from auth.users where id = $1) cuenta`, [U]))
    const antes = await deB()
    expect(antes.perfiles).toBe(1); expect(antes.aceptaciones).toBe(1)
    await verificar(U, 'a.comp@ejemplo.com'); await como(U); await db.query(`select public.lk_pedir_borrado_cuenta('a.comp@ejemplo.com')`); await como(null)
    await db.query(`update public.lk_solicitudes_borrado set fecha_limite = now() - interval '1 day' where correo = 'a.comp@ejemplo.com'`)
    await db.query('select public.lk_borrar_cuentas_pedidas()')
    expect(await deB()).toEqual(antes)
    const deA = await uno<Record<string, number>>(`select
      (select count(*)::int from public.lk_reputacion_perfiles where correo = 'a.comp@ejemplo.com') perfiles,
      (select count(*)::int from public.lk_reputacion_aceptaciones where correo = 'a.comp@ejemplo.com') aceptaciones,
      (select count(*)::int from public.lk_reputacion_consentimientos where correo = 'a.comp@ejemplo.com') consentimientos,
      (select count(*)::int from public.lk_reputacion_revisiones where correo = 'a.comp@ejemplo.com') revisiones,
      (select count(*)::int from public.lk_reputacion_eventos where correo = 'a.comp@ejemplo.com') eventos`)
    expect(deA).toEqual({ perfiles: 0, aceptaciones: 0, consentimientos: 0, revisiones: 0, eventos: 0 })
    // B sigue: su perfil se ve, puede crear alquileres y descargar lo suyo (sin nada de A)
    expect((await uno<{ v: boolean }>('select public.lk_perfil_visible($1) v', [U])).v).toBe(true)
    await entrar(await contrato('firmas'), 'dueno', U, 'b.comp@ejemplo.com')
    await verificar(U, 'b.comp@ejemplo.com'); await como(U)
    const d = (await uno<{ d: { aceptaciones: { correo: string }[]; perfiles: { correo: string }[] } }>(`select public.lk_mis_datos_reputacion('b.comp@ejemplo.com') d`)).d
    await como(null)
    expect(d.aceptaciones.map(x => x.correo)).toEqual(['b.comp@ejemplo.com']); expect(d.perfiles.map(x => x.correo)).toEqual(['b.comp@ejemplo.com'])
  })
  it('el pedido de A en el aparato compartido no bloquea a B ni oculta el perfil de B', async () => {
    const U = await aparato()
    await verificar(U, 'a.blq@ejemplo.com'); await verificar(U, 'b.blq@ejemplo.com')
    await entrar(await contrato(), 'dueno', U, 'a.blq@ejemplo.com')
    await db.query(`insert into public.lk_reputacion_perfiles(usuario, correo, nombre_visible, canton) values ($1, 'b.blq@ejemplo.com', 'Ejemplo E.', 'Escazú')`, [U])
    await verificar(U, 'a.blq@ejemplo.com'); await como(U); await db.query(`select public.lk_pedir_borrado_cuenta('a.blq@ejemplo.com')`); await como(null)
    await entrar(await contrato('firmas'), 'inquilino', U, 'b.blq@ejemplo.com')
    await expect(entrar(await contrato('firmas'), 'inquilino', U, 'a.blq@ejemplo.com')).rejects.toThrow(/Pediste eliminar tu cuenta/)
    expect((await uno<{ v: boolean }>('select public.lk_perfil_visible($1) v', [U])).v).toBe(true)
  })
  it('un alquiler abierto de B en el aparato compartido no frena el borrado de A', async () => {
    const U = await aparato()
    await verificar(U, 'a.abi@ejemplo.com'); await verificar(U, 'b.abi@ejemplo.com')
    await entrar(await contrato(), 'dueno', U, 'a.abi@ejemplo.com'); await entrar(await contrato('en_curso'), 'inquilino', U, 'b.abi@ejemplo.com')
    await verificar(U, 'a.abi@ejemplo.com'); await como(U)
    expect((await uno<{ f: Date | null }>(`select public.lk_pedir_borrado_cuenta('a.abi@ejemplo.com') f`)).f).not.toBeNull()
    await como(null)
  })
})

describe('límite 4: ¿tiene que aceptar REP-01? por el correo verificado (segundo aparato)', () => {
  it('aceptó en el aparato A → en el B (otra sesión, mismo correo verificado) ya no; persona nueva sí; con alquileres, no', async () => {
    const A = await aparato(), B = await aparato(), N = await aparato(), V = await aparato()
    await verificar(A, 'segundo@ejemplo.com'); await verificar(B, 'segundo@ejemplo.com'); await verificar(N, 'nueva.n@ejemplo.com'); await verificar(V, 'vieja.v@ejemplo.com')
    await como(A); await db.query(`select public.lk_aceptar_reputacion('segundo@ejemplo.com', 'v', '{a}')`)
    await como(B); expect((await uno<{ x: boolean }>(`select public.lk_necesita_rep01('segundo@ejemplo.com') x`)).x).toBe(false)
    await como(N); expect((await uno<{ x: boolean }>(`select public.lk_necesita_rep01('nueva.n@ejemplo.com') x`)).x).toBe(true)
    await como(null); await entrar(await contrato(), 'dueno', await aparato(), 'vieja.v@ejemplo.com')
    await como(V); expect((await uno<{ x: boolean }>(`select public.lk_necesita_rep01('vieja.v@ejemplo.com') x`)).x).toBe(false)
    await como(null)
  })
  it('sin correo verificado, rechaza (cierre por defecto) y la app no puede saber nada de otro correo', async () => {
    const X = await aparato(); await como(X)
    await expect(db.query(`select public.lk_necesita_rep01('segundo@ejemplo.com')`)).rejects.toThrow(NO_VERIFICADO)
    await como(null); await expect(db.query(`select public.lk_necesita_rep01('segundo@ejemplo.com')`)).rejects.toThrow(/Entra a tu cuenta/)
  })
})

describe('reglas de los alquileres con un correo sin verificar', () => {
  it('con la reputación encendida, un email_cavos sin verificar no usa la aceptación de otra persona con ese correo', async () => {
    const A = await aparato(), X = await aparato()
    await verificar(A, 'duena.real@ejemplo.com'); await como(A); await db.query(`select public.lk_aceptar_reputacion('duena.real@ejemplo.com', 'v', '{a}')`); await como(null)
    await db.query('insert into public.lk_reputacion_encendido default values on conflict do nothing')
    await expect(entrar(await contrato('firmas'), 'dueno', X, 'duena.real@ejemplo.com')).rejects.toThrow(/acepta tu perfil de reputación/)
    await entrar(await contrato('firmas'), 'dueno', A, 'duena.real@ejemplo.com')
    await db.query('delete from public.lk_reputacion_encendido')
  })
})
