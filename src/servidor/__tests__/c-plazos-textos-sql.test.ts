// PR #22 · lista de Legal (revision-marcas-pr22.md), puntos 5, 7 y 9: 20261025060000_c_plazos_y_textos.sql (sin aplicar) en PGlite.
// - 6.5 a/b: el plazo del dueño empieza con «Recibí la casa» o 2 días después de la entrega (lo que pase primero) y, si el último
//   día cae en domingo o feriado de ley (Código de Trabajo, art. 148), termina el siguiente día hábil. Solo el servidor.
// - 6.5 a: «Todo bien, devolver» en C: después de aprobar ya no se puede reclamar (también en el servidor) y se cierra al instante.
// - Eventos del historial con «USDC de prueba».
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { feriados, vencimiento, DIA_MS } from '../../../api/_lib/plazos'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001', INQ = '00000000-0000-4000-8000-000000000002', MED = '00000000-0000-4000-8000-000000000009'
const DECL = 'Declaro que esta persona sabe que la invito.'
const APROBADO = 'El dueño aprobó en la cadena devolver el depósito completo'
const SEMANA = 604800
let db: PGlite
const como = (uid: string | null) => db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
const eventos = async (id: string) => (await db.query<{ t: string }>('select texto t from public.lk_eventos where contrato_id = $1 order by id', [id])).rows.map(r => r.t)
const fila = async (id: string) => (await uno<{ estado: string; ventana_inicio: string | null; entregado_en: string | null; resultado: Record<string, unknown> | null }>(
  'select estado, ventana_inicio, entregado_en, resultado from public.lk_contratos where id = $1', [id]))!

async function crear(monto = 100) {
  await como(DUENO)
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const r = await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa de prueba', $4, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL, monto])
  const id = r!.r.id
  await db.query(`insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values ($1, 'inquilino', $2, 'invitada@correo.com')`, [id, INQ])
  return id
}
/** Entrega (los dos confirmaron las fotos de salida): pasa a ventana_reclamo como lo hace lk_firmar (ventana_inicio = now()). */
async function entregado(segundos = SEMANA) {
  const id = await crear()
  await db.query(`update public.lk_contratos set estado = 'salida', ventana_segundos = $2 where id = $1`, [id, segundos])
  await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', ventana_inicio = now() where id = $1`, [id])
  return id
}
const atrasar = (id: string, dias: number) => db.query(`update public.lk_contratos set entregado_en = now() - make_interval(days => $2) where id = $1`, [id, dias])
const fotoReclamo = (id: string) => db.query(`insert into public.lk_fotos(contrato_id, etapa, cuarto, por_rol, ruta, sha256, tomada_en, origen) values ($1, 'reclamo', 0, 'dueno', $2, repeat('b', 64), now(), 'camara')`, [id, id + '/reclamo/b.jpg'])
const finPlazo = async (inicio: string, seg: number) => +new Date((await uno<{ f: string }>('select public.lk_fin_plazo($1::timestamptz, $2) f', [inicio, seg]))!.f)

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
  await db.query(`insert into public.lk_mediadores values ($1, 'Mediación Lockumi')`, [MED])
}, 60_000)

describe('7) feriados y fin del plazo: el servidor usa la misma lista que api/_lib/plazos.ts', () => {
  it('lk_es_feriado coincide día por día con feriados() de 2026 a 2032 (art. 148, Jueves y Viernes Santo)', async () => {
    const sql = (await db.query<{ d: string }>(`select to_char(d, 'YYYY-MM-DD') d from generate_series('2026-01-01'::date, '2032-12-31'::date, interval '1 day') d where public.lk_es_feriado(d::date) order by d`)).rows.map(r => r.d)
    const ts = Array.from({ length: 7 }, (_, i) => Object.keys(feriados(2026 + i))).flat().sort()
    expect(sql).toEqual(ts)
    expect(sql).toContain('2027-03-25'); expect(sql).toContain('2027-03-26')   // Jueves y Viernes Santo 2027
  })
  it('lk_fin_plazo = vencimiento(): domingo → lunes; feriado → siguiente día hábil; plazos cortos no se mueven', async () => {
    const casos = ['2026-10-18T16:00:00Z', '2026-12-18T16:00:00Z', '2027-03-18T16:00:00Z', '2026-07-18T05:30:00Z', '2026-10-20T16:00:00Z']
    for (const i of casos) expect(await finPlazo(i, SEMANA)).toBe(vencimiento(+new Date(i), 7 * DIA_MS).fin)
    expect(await finPlazo('2026-10-18T16:00:00Z', SEMANA)).toBe(+new Date('2026-10-26T16:00:00Z'))   // domingo 25/10 → lunes 26/10
    expect(await finPlazo('2027-03-18T16:00:00Z', SEMANA)).toBe(+new Date('2027-03-27T16:00:00Z'))   // Jueves y Viernes Santo → sábado
    expect(await finPlazo('2026-10-18T16:00:00Z', 120)).toBe(+new Date('2026-10-18T16:02:00Z'))
  })
})

describe('7) inicio del plazo del dueño: «Recibí la casa» o 2 días después de la entrega', () => {
  it('al entregar, el plazo de 7 días no empieza: queda la entrega (entregado_en) y ventana_inicio vacío', async () => {
    const id = await entregado(); const f = await fila(id)
    expect(f.estado).toBe('ventana_reclamo'); expect(f.entregado_en).not.toBeNull(); expect(f.ventana_inicio).toBeNull()
  })
  it('con plazos cortos de prueba (no son días enteros), empieza al entregar, como antes', async () => {
    const f = await fila(await entregado(60)); expect(f.ventana_inicio).not.toBeNull()
  })
  it('«Recibí la casa» (solo el dueño, una vez) empieza el plazo y queda en el historial', async () => {
    const id = await entregado()
    await como(INQ); await expect(db.query('select public.lk_recibi_casa($1)', [id])).rejects.toThrow(/dueño/)
    await como(DUENO); await db.query('select public.lk_recibi_casa($1)', [id])
    expect((await fila(id)).ventana_inicio).not.toBeNull()
    expect((await eventos(id)).at(-1)).toBe('El dueño tocó «Recibí la casa». Empiezan sus 7 días naturales para reclamar')
    await expect(db.query('select public.lk_recibi_casa($1)', [id])).rejects.toThrow(/ya empezó/)
  })
  it('si pasaron los 2 días, el plazo ya empezó solo: «Recibí la casa» no lo reinicia', async () => {
    const id = await entregado(); await atrasar(id, 3)
    await como(DUENO); await expect(db.query('select public.lk_recibi_casa($1)', [id])).rejects.toThrow(/ya empezó/)
  })
  it('no cierra antes de 2 + 7 días desde la entrega; después sí, con «USDC de prueba» y la comisión', async () => {
    const id = await entregado(); await atrasar(id, 8)   // inicio automático hace 6 días: faltan ~1 día
    await como(INQ); expect((await uno<{ r: boolean }>('select public.lk_cerrar_sin_reclamo($1) r', [id]))!.r).toBe(false)
    await atrasar(id, 14)
    expect((await uno<{ r: boolean }>('select public.lk_cerrar_sin_reclamo($1) r', [id]))!.r).toBe(true)
    expect((await fila(id)).resultado).toMatchObject({ via: 'automatico', dueno: 0, inquilino: 100 })
    expect((await eventos(id)).at(-1)).toBe('Sin reclamos en el plazo: 100 USDC de prueba vuelven al inquilino, menos el 0,3 % de comisión de Trustless Work')
  })
  it('lk_vencimientos (cron diario) usa el mismo inicio y fin', async () => {
    const pronto = await entregado(); await atrasar(pronto, 8)
    const vencido = await entregado(); await atrasar(vencido, 14)
    await db.query('select public.lk_vencimientos()')
    expect((await fila(pronto)).estado).toBe('ventana_reclamo'); expect((await fila(vencido)).estado).toBe('cerrado')
    expect((await eventos(vencido)).at(-1)).toBe('Sin reclamos en el plazo: 100 USDC de prueba vuelven al inquilino, menos el 0,3 % de comisión de Trustless Work')
  })
  it('el reclamo se puede hacer hasta el fin del plazo (con el corrimiento) y no después', async () => {
    const id = await entregado(); await fotoReclamo(id); await atrasar(id, 14)
    await como(DUENO); await expect(db.query(`select public.lk_reclamar($1, 30, 'Pared manchada')`, [id])).rejects.toThrow(/plazo para reclamar ya terminó/)
    const ok = await entregado(); await fotoReclamo(ok); await atrasar(ok, 3)
    await db.query(`select public.lk_reclamar($1, 30, 'Pared manchada')`, [ok])
    expect((await eventos(ok)).at(-1)).toBe('El dueño reclamó 30 USDC de prueba')
  })
  it('el plazo del inquilino (silencio, 6.5 c) también corre con lk_fin_plazo', async () => {
    const d = (await db.query<{ d: string }>(`select pg_get_functiondef('public.lk_silencio_inquilino(uuid)'::regprocedure) d`)).rows[0].d
    expect(d).toMatch(/lk_fin_plazo\(k\.entregado_en, c\.ventana_segundos\)/)
  })
  it('la app puede leer entregado_en (columna con permiso de lectura)', async () => {
    expect((await uno<{ p: boolean }>(`select has_column_privilege('authenticated', 'public.lk_contratos', 'entregado_en', 'select') p`))!.p).toBe(true)
  })
})

describe('5) «Todo bien, devolver» en C: sin reclamo después y cierre al instante', () => {
  it('después de aprobar en la cadena, el servidor rechaza el reclamo', async () => {
    const id = await entregado(); await fotoReclamo(id); await atrasar(id, 3)
    await db.query('insert into public.lk_eventos(contrato_id, texto) values ($1, $2)', [id, APROBADO])
    await como(DUENO); await expect(db.query(`select public.lk_reclamar($1, 30, 'Pared manchada')`, [id])).rejects.toThrow(/ya no puedes reclamar/)
  })
  it('lk_cerrar_aprobado (solo service_role) cierra con «devuelto» y el 100 % al inquilino; sin aprobación no cierra', async () => {
    expect((await uno<{ p: boolean }>(`select has_function_privilege('authenticated', 'public.lk_cerrar_aprobado(uuid)', 'execute') p`))!.p).toBe(false)
    expect((await uno<{ p: boolean }>(`select has_function_privilege('service_role', 'public.lk_cerrar_aprobado(uuid)', 'execute') p`))!.p).toBe(true)
    const sin = await entregado()
    expect((await uno<{ r: boolean }>('select public.lk_cerrar_aprobado($1) r', [sin]))!.r).toBe(false)
    const id = await entregado()
    await db.query('insert into public.lk_eventos(contrato_id, texto) values ($1, $2)', [id, APROBADO])
    expect((await uno<{ r: boolean }>('select public.lk_cerrar_aprobado($1) r', [id]))!.r).toBe(true)
    expect(await fila(id)).toMatchObject({ estado: 'cerrado', resultado: { via: 'devuelto', dueno: 0, inquilino: 100 } })
    expect((await eventos(id)).at(-1)).toBe('El dueño tocó «Todo bien, devolver»: 100 USDC de prueba devueltos al inquilino')
    expect((await uno<{ r: boolean }>('select public.lk_cerrar_aprobado($1) r', [id]))!.r).toBe(false)   // una sola vez
  })
})

describe('9) eventos del historial con «USDC de prueba»', () => {
  it('pago, aceptación del reclamo, aceptaciones de la mediación y acuerdo registrado', async () => {
    const pago = await crear()
    await db.query(`update public.lk_contratos set estado = 'pendiente_pago' where id = $1`, [pago])
    await como(INQ); await db.query('select public.lk_registrar_pago($1, null)', [pago])
    expect((await eventos(pago)).at(-1)).toBe('Depósito de 100 USDC de prueba pagado y guardado')

    const acu = await entregado(); await fotoReclamo(acu); await atrasar(acu, 3)
    await como(DUENO); await db.query(`select public.lk_reclamar($1, 30, 'Pared manchada')`, [acu])
    await como(INQ); await db.query('select public.lk_responder_reclamo($1, true)', [acu])
    expect((await eventos(acu)).at(-1)).toBe('El inquilino aceptó el reclamo: 30 USDC de prueba al dueño y 70 USDC de prueba al inquilino')

    const med = await crear()
    await db.query(`insert into public.lk_reclamos(contrato_id, monto, motivo, respuesta) values ($1, 30, 'Pared manchada en la sala', 'rechazado')`, [med])
    await db.query(`update public.lk_contratos set estado = 'mediacion' where id = $1`, [med])
    await como(DUENO); await db.query('select public.lk_aceptar_acuerdo_mediacion($1, 20)', [med])
    expect((await eventos(med)).at(-1)).toBe('El dueño aceptó este reparto: 20 USDC de prueba al dueño y 80 USDC de prueba al inquilino')
    await como(INQ); await db.query('select public.lk_aceptar_acuerdo_mediacion($1, 20)', [med])
    await como(MED); await db.query(`select public.lk_decidir_mediacion($1, 20, 'Daño parcial')`, [med])
    expect((await eventos(med)).at(-1)).toBe('Acuerdo registrado: 20 USDC de prueba al dueño y 80 USDC de prueba al inquilino (aceptado por las dos partes) · Daño parcial')
  })
})
