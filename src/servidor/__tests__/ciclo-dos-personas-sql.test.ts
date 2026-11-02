// Matriz de caminos (27/10/2026) · el ciclo de un alquiler de dos personas, paso a paso, con las funciones reales del servidor
// (todas las migraciones en PGlite) y como las llama la app (rol `authenticated`, una sesión por persona). Cubre lo que no tenía prueba:
//  · #62: aceptar sin cuenta Stellar → lk_actualizar_direccion (solo mi fila, solo antes del escrow);
//  · acta de entrada y de salida: cualquier cambio (foto, estado de un ítem, nota) borra las firmas de ESA etapa y las otras no se tocan;
//  · lk_firmar con el acta incompleta, lk_iniciar_salida, lk_registrar_escrow y lk_registrar_pago en orden.
// Es solo lectura de diseño: no cambia ninguna migración. Documentado en docs/matriz-caminos.md.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { Keypair } from '@stellar/stellar-sdk'
import { estadoFirma, type Firmas } from '../../flujo'
import { atender, ErrorTw, type Entorno } from '../../../api/_lib/tw'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-0000000003d1', INQ = '00000000-0000-4000-8000-0000000003a1', OTRA = '00000000-0000-4000-8000-0000000003f1'
const CORREO = 'inquilina.demo@lockumi.com', ESC = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
const G_DUENO = 'G' + 'A'.repeat(55), G_INQ = 'G' + 'B'.repeat(55)
const DECL = 'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
/** Llama una función como la app: sesión de `uid` y rol `authenticated`. */
async function rpc<T = unknown>(uid: string, fn: string, ...args: unknown[]): Promise<T> {
  await como(uid); await db.exec('set role authenticated')
  try { return (await db.query<{ r: T }>(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(', ')}) r`, args)).rows[0]!.r } finally { await db.exec('reset role') }
}
const estado = async (id: string) => (await uno<{ e: string }>('select estado e from public.lk_contratos where id = $1', [id]))!.e
const firmas = async (id: string, etapa: string): Promise<Firmas> => {
  const r = await db.query<{ rol: 'dueno' | 'inquilino' }>('select rol from public.lk_firmas where contrato_id = $1 and etapa = $2', [id, etapa])
  return Object.fromEntries(r.rows.map(x => [x.rol, 'firmado'])) as Firmas
}
const n = async (id: string, etapa: string) => Object.keys(await firmas(id, etapa)).length
const MSG_FALTA = /Antes de confirmar, cada espacio necesita una foto y todo marcado/
const CERRADO = /Este paso ya no está abierto/

async function verificar(uid: string, correo: string) {
  await db.query(`insert into auth.users(id) values ($1) on conflict do nothing`, [uid])
  await db.query(`insert into public.lk_correos_verificados(usuario, correo, metodo) values ($1, $2, 'email') on conflict do nothing`, [uid, correo])
}
/** Dueño crea e invita; el inquilino acepta (con o sin su cuenta Stellar). */
async function alquiler(o: { direccionInq?: string | null; aceptar?: boolean } = {}) {
  const { direccionInq = null, aceptar = true } = o
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  const r = await rpc<{ id: string; token: string }>(DUENO, 'lk_crear_contrato_invitando', 'Casa de prueba', 10, hoy, fin, ['No fumar'], CORREO, 'dueno@lockumi.com', DECL, G_DUENO)
  if (aceptar) await rpc(INQ, 'lk_aceptar_invitacion', r.id, r.token, CORREO, direccionInq)
  return r
}
const dirDe = async (id: string, rol: string) => (await uno<{ d: string | null }>('select direccion_stellar d from public.lk_participantes where contrato_id = $1 and rol = $2', [id, rol]))!.d
/** Llega a «fotos de entrada» con el depósito guardado, por el camino real: firmas → escrow → pago. */
async function hastaFotosEntrada(o: Parameters<typeof alquiler>[0] = {}) {
  const r = await alquiler({ direccionInq: G_INQ, ...o })
  await rpc(INQ, 'lk_firmar', r.id, 'contrato'); await rpc(DUENO, 'lk_firmar', r.id, 'contrato')
  await rpc(DUENO, 'lk_registrar_escrow', r.id, ESC, 'a'.repeat(64)); await rpc(INQ, 'lk_registrar_pago', r.id, 'b'.repeat(64))
  return r.id
}
let seq = 0
const foto = (uid: string, id: string, etapa: 'entrada' | 'salida' | 'reclamo', cuarto: number) =>
  rpc(uid, 'lk_registrar_foto', id, etapa, cuarto, `${id}/${etapa}/${++seq}.jpg`, String(seq).padStart(64, 'c'), new Date().toISOString(), null, 'camara', false)
const marcar = (uid: string, id: string, etapa: 'entrada' | 'salida', cuarto: number, item: number, e = 'bien') => rpc(uid, 'lk_editar_item', id, etapa, cuarto, item, e, null)
/** Una foto por espacio y todo «Bien»: lo que hace una persona para dejar el acta completa. */
async function completarActa(uid: string, id: string, etapa: 'entrada' | 'salida') {
  for (let c = 0; c < 4; c++) { await foto(uid, id, etapa, c); for (let i = 0; i < 3; i++) await marcar(uid, id, etapa, c, i) }
}

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.exec('grant usage on schema public to authenticated')
  await verificar(INQ, CORREO); await verificar(DUENO, 'dueno@lockumi.com'); await verificar(OTRA, 'otra@lockumi.com')
}, 60_000)

describe('#62 · aceptar sin la cuenta Stellar y guardarla después (lk_actualizar_direccion)', () => {
  it('aceptar sin cuenta (sesión de Cavos caducada) deja la fila del inquilino sin dirección; guardarla afecta solo SU fila', async () => {
    const r = await alquiler({ direccionInq: null })
    expect(await dirDe(r.id, 'inquilino')).toBeNull(); expect(await dirDe(r.id, 'dueno')).toBe(G_DUENO)
    await rpc(INQ, 'lk_actualizar_direccion', r.id, G_INQ)
    expect(await dirDe(r.id, 'inquilino')).toBe(G_INQ); expect(await dirDe(r.id, 'dueno')).toBe(G_DUENO)
  })
  it('el dueño guarda la suya sin tocar la del inquilino; una persona ajena al alquiler no puede guardar ninguna', async () => {
    const r = await alquiler({ direccionInq: null })
    await rpc(DUENO, 'lk_actualizar_direccion', r.id, 'G' + 'C'.repeat(55))
    expect(await dirDe(r.id, 'dueno')).toBe('G' + 'C'.repeat(55)); expect(await dirDe(r.id, 'inquilino')).toBeNull()
    await expect(rpc(OTRA, 'lk_actualizar_direccion', r.id, G_INQ)).rejects.toThrow()
    expect(await dirDe(r.id, 'inquilino')).toBeNull()
  })
  it('con la cuenta segura creada ya no se puede cambiar (55000): el depósito está atado a esas cuentas', async () => {
    const r = await alquiler({ direccionInq: null })
    await rpc(INQ, 'lk_firmar', r.id, 'contrato'); await rpc(DUENO, 'lk_firmar', r.id, 'contrato')
    await rpc(INQ, 'lk_actualizar_direccion', r.id, G_INQ)                       // antes del escrow: se puede
    await rpc(DUENO, 'lk_registrar_escrow', r.id, ESC, 'a'.repeat(64))
    await expect(rpc(INQ, 'lk_actualizar_direccion', r.id, 'G' + 'D'.repeat(55))).rejects.toThrow(/El depósito ya está creado/)
    await expect(rpc(DUENO, 'lk_actualizar_direccion', r.id, 'G' + 'D'.repeat(55))).rejects.toThrow(/El depósito ya está creado/)
    expect(await dirDe(r.id, 'inquilino')).toBe(G_INQ)
  })
})

describe('el orden del ciclo: contrato → depósito → fotos de entrada → en curso → salida → plazo de reclamos', () => {
  it('el inquilino no firma antes de aceptar; pagar sin cuenta segura se rechaza; el pago se registra una sola vez', async () => {
    const r = await alquiler({ aceptar: false })
    await expect(rpc(DUENO, 'lk_firmar', r.id, 'contrato')).rejects.toThrow(/El inquilino todavía no aceptó la invitación/)
    await rpc(INQ, 'lk_aceptar_invitacion', r.id, r.token, CORREO, G_INQ)
    await rpc(INQ, 'lk_firmar', r.id, 'contrato'); expect(await estado(r.id)).toBe('firmas')
    await expect(rpc(INQ, 'lk_firmar', r.id, 'contrato')).rejects.toThrow(/Ya firmaste/)
    await rpc(DUENO, 'lk_firmar', r.id, 'contrato'); expect(await estado(r.id)).toBe('pendiente_pago')
    await expect(rpc(INQ, 'lk_registrar_pago', r.id, 'b'.repeat(64))).rejects.toThrow(/Falta crear la cuenta segura del depósito/)
    await expect(rpc(INQ, 'lk_registrar_escrow', r.id, ESC, 'a'.repeat(64))).rejects.toThrow()          // solo el dueño registra la cuenta segura
    await rpc(DUENO, 'lk_registrar_escrow', r.id, ESC, 'a'.repeat(64))
    await rpc(INQ, 'lk_registrar_pago', r.id, 'b'.repeat(64)); expect(await estado(r.id)).toBe('fotos_entrada')
    await expect(rpc(INQ, 'lk_registrar_pago', r.id, 'b'.repeat(64))).rejects.toThrow(CERRADO)
    await expect(rpc(DUENO, 'lk_registrar_escrow', r.id, ESC, 'a'.repeat(64))).rejects.toThrow(/ya estaba creado|no está abierto/)
  })
  it('confirmar con el acta incompleta se rechaza; con una foto por espacio y todo marcado, se acepta; con las dos firmas empieza el alquiler', async () => {
    const id = await hastaFotosEntrada()
    await expect(rpc(INQ, 'lk_firmar', id, 'entrada')).rejects.toThrow(MSG_FALTA)
    await foto(INQ, id, 'entrada', 0); await expect(rpc(INQ, 'lk_firmar', id, 'entrada')).rejects.toThrow(MSG_FALTA)   // falta marcar y los demás espacios
    await completarActa(INQ, id, 'entrada')
    await rpc(INQ, 'lk_firmar', id, 'entrada'); expect(await estado(id)).toBe('fotos_entrada')
    await rpc(DUENO, 'lk_firmar', id, 'entrada'); expect(await estado(id)).toBe('en_curso')
    // en curso el acta de entrada ya no se toca (y no se borra nada)
    await expect(marcar(DUENO, id, 'entrada', 0, 0, 'detalle')).rejects.toThrow(CERRADO)
    await expect(foto(DUENO, id, 'entrada', 0)).rejects.toThrow(/Ahora no se pueden agregar fotos/)
    expect(await n(id, 'entrada')).toBe(2)
  })
  it('las fotos de salida solo empiezan desde «en curso»; confirmadas por los dos, empieza el plazo de reclamos', async () => {
    const id = await hastaFotosEntrada()
    await expect(rpc(INQ, 'lk_iniciar_salida', id)).rejects.toThrow(CERRADO)                     // todavía en fotos de entrada
    await completarActa(INQ, id, 'entrada'); await rpc(INQ, 'lk_firmar', id, 'entrada'); await rpc(DUENO, 'lk_firmar', id, 'entrada')
    await expect(rpc(OTRA, 'lk_iniciar_salida', id)).rejects.toThrow()                           // una persona ajena no puede
    await rpc(INQ, 'lk_iniciar_salida', id); expect(await estado(id)).toBe('salida')
    await expect(rpc(DUENO, 'lk_iniciar_salida', id)).rejects.toThrow(CERRADO)                   // una sola vez
    await expect(rpc(INQ, 'lk_firmar', id, 'salida')).rejects.toThrow(MSG_FALTA)
    await completarActa(DUENO, id, 'salida'); await rpc(DUENO, 'lk_firmar', id, 'salida'); await rpc(INQ, 'lk_firmar', id, 'salida')
    expect(await estado(id)).toBe('ventana_reclamo')
    // desde la regla «Recibí la casa o 2 días» (c-plazos-textos-sql): al entregar queda la fecha de entrega y el plazo de 7 días empieza después
    expect(await uno<{ ent: boolean; ini: boolean }>('select entregado_en is not null ent, ventana_inicio is not null ini from public.lk_contratos where id = $1', [id])).toEqual({ ent: true, ini: false })
  })
})

describe('(b) el acta cambia → se borran las firmas de esa etapa (diseño, lk_editar_item / lk_registrar_foto) y nadie queda trabado', () => {
  it('el inquilino confirmó y el dueño agrega UNA foto: se borra la firma del inquilino (la del dueño aún no existía) y el estado no avanza', async () => {
    const id = await hastaFotosEntrada()
    await completarActa(INQ, id, 'entrada'); await rpc(INQ, 'lk_firmar', id, 'entrada')
    expect(await firmas(id, 'entrada')).toEqual({ inquilino: 'firmado' })
    await foto(DUENO, id, 'entrada', 1)
    expect(await firmas(id, 'entrada')).toEqual({}); expect(await estado(id)).toBe('fotos_entrada')
  })
  it('lo mismo con volver a marcar un ítem (aunque quede igual) y con cambiar la nota de un espacio', async () => {
    const id = await hastaFotosEntrada()
    await completarActa(INQ, id, 'entrada')
    await rpc(INQ, 'lk_firmar', id, 'entrada'); await marcar(DUENO, id, 'entrada', 0, 0, 'bien')       // mismo estado de antes
    expect(await n(id, 'entrada')).toBe(0)
    await rpc(INQ, 'lk_firmar', id, 'entrada'); await rpc(DUENO, 'lk_editar_item', id, 'entrada', 2, null, null, 'Rayón pequeño en la puerta')
    expect(await n(id, 'entrada')).toBe(0)
    await rpc(INQ, 'lk_firmar', id, 'entrada'); await marcar(DUENO, id, 'entrada', 3, 1, 'detalle')
    expect(await n(id, 'entrada')).toBe(0)
  })
  it('se borran las firmas de las DOS personas (confirmó el dueño y el inquilino agrega una foto) y solo las de esa etapa: las del contrato siguen', async () => {
    const id = await hastaFotosEntrada()
    await completarActa(DUENO, id, 'entrada'); await rpc(DUENO, 'lk_firmar', id, 'entrada')
    await foto(INQ, id, 'entrada', 0)
    expect(await n(id, 'entrada')).toBe(0); expect(await n(id, 'contrato')).toBe(2)
    // además, la foto del reclamo no es del acta: no borra firmas (solo el dueño y solo en el plazo de reclamos)
    await expect(foto(DUENO, id, 'reclamo', 0)).rejects.toThrow(/Ahora no se pueden agregar fotos/)
  })
  it('no queda trabado: a quien se le borró la firma ve «Te toca firmar» (con el botón), a la otra persona le sigue «Firmaste»; al volver a confirmar los dos, empieza el alquiler', async () => {
    const id = await hastaFotosEntrada()
    await completarActa(INQ, id, 'entrada'); await rpc(INQ, 'lk_firmar', id, 'entrada'); await rpc(DUENO, 'lk_firmar', id, 'entrada')
    expect(await estado(id)).toBe('en_curso')                                                   // control: sin cambios no se borra nada
    const otro = await hastaFotosEntrada()
    await completarActa(INQ, otro, 'entrada'); await rpc(INQ, 'lk_firmar', otro, 'entrada')
    expect(estadoFirma(await firmas(otro, 'entrada'), 'inquilino').tipo).toBe('esperando')
    await foto(DUENO, otro, 'entrada', 0)                                                        // el dueño cambia el acta: la firma del inquilino se borra
    const f = await firmas(otro, 'entrada')
    expect(estadoFirma(f, 'inquilino')).toEqual({ tipo: 'te-toca', texto: 'Te toca firmar' }); expect(estadoFirma(f, 'dueno').tipo).toBe('te-toca')
    await rpc(DUENO, 'lk_firmar', otro, 'entrada')
    expect(estadoFirma(await firmas(otro, 'entrada'), 'inquilino').tipo).toBe('te-toca')         // al inquilino le toca de nuevo
    expect(estadoFirma(await firmas(otro, 'entrada'), 'dueno').tipo).toBe('esperando')
    await rpc(INQ, 'lk_firmar', otro, 'entrada'); expect(await estado(otro)).toBe('en_curso')
  })
  it('la etapa de salida se comporta igual', async () => {
    const id = await hastaFotosEntrada()
    await completarActa(INQ, id, 'entrada'); await rpc(INQ, 'lk_firmar', id, 'entrada'); await rpc(DUENO, 'lk_firmar', id, 'entrada')
    await rpc(INQ, 'lk_iniciar_salida', id); await completarActa(INQ, id, 'salida'); await rpc(INQ, 'lk_firmar', id, 'salida')
    await marcar(DUENO, id, 'salida', 0, 0, 'detalle')
    expect(await n(id, 'salida')).toBe(0); expect(await estado(id)).toBe('salida')
    await rpc(INQ, 'lk_firmar', id, 'salida'); await rpc(DUENO, 'lk_firmar', id, 'salida'); expect(await estado(id)).toBe('ventana_reclamo')
  })
})

// (c) #62 de punta a punta SIN red real: la base es la de verdad (PGlite con todas las migraciones) y el servidor es api/_lib/tw.ts (atender) leyendo
// ese alquiler; Horizon y Supabase REST son un fetch falso. La parte de la pantalla (activarCuenta llama a servidor.actualizarCuenta → lk_actualizar_direccion)
// está en src/services/__tests__/deposito-trustline.test.ts; aquí se prueba lo que pasa en el servidor DESPUÉS de esa llamada.
describe('(c) #62: aceptar sin cuenta → volver a entrar → «Pagar» (paso activar-cuenta del servidor)', () => {
  const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: Keypair.random().secret(), SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's' }
  /** Supabase REST falso que lee de PGlite el alquiler tal como lo guardó la base; Horizon dice que la cuenta todavía no existe. */
  const red = (id: string, uid: string) => (async (url: string) => {
    const j = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status })
    if (url.endsWith('/auth/v1/user')) return j({ id: uid })
    if (url.includes('/rest/v1/lk_contratos?id=eq.')) {
      const r = await uno<{ k: unknown }>(`select to_jsonb(c) || jsonb_build_object('lk_participantes', (select jsonb_agg(jsonb_build_object('rol', p.rol, 'usuario', p.usuario, 'direccion_stellar', p.direccion_stellar)) from public.lk_participantes p where p.contrato_id = c.id)) k from public.lk_contratos c where c.id = $1`, [id])
      return j([r!.k])
    }
    if (url.startsWith('https://horizon-testnet.stellar.org/accounts/')) return j({}, 404)
    return j({}, 404)
  }) as typeof fetch
  const pedido = (id: string) => ({ accion: 'activar-cuenta', contrato: id, paso: 'estado' }) as never
  const GI = Keypair.random().publicKey(), GD = Keypair.random().publicKey()
  const nuevo = async () => {
    const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    const r = await rpc<{ id: string; token: string }>(DUENO, 'lk_crear_contrato_invitando', 'Casa de prueba', 10, hoy, fin, ['No fumar'], CORREO, 'dueno@lockumi.com', DECL, GD)
    await rpc(INQ, 'lk_aceptar_invitacion', r.id, r.token, CORREO, null)                       // acepta SIN billetera conectada
    await rpc(INQ, 'lk_firmar', r.id, 'contrato'); await rpc(DUENO, 'lk_firmar', r.id, 'contrato')
    return r.id
  }
  it('SIN el arreglo (nadie guarda la cuenta): el servidor contesta 409 «Falta la cuenta Stellar del inquilino.» (lo que vio la prueba real de las 9:59)', async () => {
    const id = await nuevo()
    const e = await atender(ENV, pedido(id), 'Bearer t', red(id, INQ)).catch(x => x)
    expect(e).toBeInstanceOf(ErrorTw); expect(e.estado).toBe(409); expect(e.message).toBe('Falta la cuenta Stellar del inquilino.')
  })
  it('CON el arreglo (el cliente guarda la cuenta de la billetera conectada con lk_actualizar_direccion antes de preguntar): el servidor sigue y dice qué falta de la cuenta', async () => {
    const id = await nuevo()
    await rpc(INQ, 'lk_actualizar_direccion', id, GI)
    expect(await atender(ENV, pedido(id), 'Bearer t', red(id, INQ))).toEqual({ listo: false, estado: 'sin-cuenta' })
    expect(await dirDe(id, 'inquilino')).toBe(GI)
  })
  it('el dueño sin cuenta guardada recibe el mismo 409 con SU texto, y la cuenta del inquilino no lo arregla', async () => {
    const id = await nuevo()
    await rpc(INQ, 'lk_actualizar_direccion', id, GI)
    await db.query(`update public.lk_participantes set direccion_stellar = null where contrato_id = $1 and rol = 'dueno'`, [id])
    const e = await atender(ENV, pedido(id), 'Bearer t', red(id, DUENO)).catch(x => x)
    expect(e).toBeInstanceOf(ErrorTw); expect(e.message).toBe('Falta la cuenta Stellar del dueño.')
  })
  it('U4 (27/10): dueño que creó y firmó sin cuenta; con el arreglo guarda la suya (al firmar o al abrir el depósito con sesión) y el inquilino ya no recibe 409', async () => {
    const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    const r = await rpc<{ id: string; token: string }>(DUENO, 'lk_crear_contrato_invitando', 'Casa sin cuenta del dueño', 10, hoy, fin, ['No fumar'], CORREO, 'dueno@lockumi.com', DECL, null)
    await rpc(INQ, 'lk_aceptar_invitacion', r.id, r.token, CORREO, GI)
    await rpc(INQ, 'lk_firmar', r.id, 'contrato'); await rpc(DUENO, 'lk_firmar', r.id, 'contrato')
    expect(await dirDe(r.id, 'dueno')).toBeNull()
    // el servidor lee la cuenta del dueño con la misma función que usa «pagar» (cuenta() en api/_lib/tw.ts): 409, lo que vio la prueba real de las 11:36 (d475db0a)
    const e = await atender(ENV, pedido(r.id), 'Bearer t', red(r.id, DUENO)).catch(x => x)
    expect(e).toBeInstanceOf(ErrorTw); expect(e.message).toBe('Falta la cuenta Stellar del dueño.')
    await rpc(DUENO, 'lk_actualizar_direccion', r.id, GD)                                            // ya firmado y sin cuenta segura: se permite
    expect(await dirDe(r.id, 'dueno')).toBe(GD); expect(await dirDe(r.id, 'inquilino')).toBe(GI)     // solo cambia la suya
    expect(await atender(ENV, pedido(r.id), 'Bearer t', red(r.id, DUENO))).toEqual({ listo: false, estado: 'sin-cuenta' })
    expect(await atender(ENV, pedido(r.id), 'Bearer t', red(r.id, INQ))).toEqual({ listo: false, estado: 'sin-cuenta' })
  })
})
