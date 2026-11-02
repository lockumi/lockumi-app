// Matriz 27/10 · camino 16: sin reclamo, devolución automática a los 7 días, con el plazo REAL de producción (604800 s), sin esperar 7 días:
// el inicio del plazo se pone en el pasado dentro de PGlite (migraciones reales). Nunca toca producción ni datos ajenos.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const PRELUDIO = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key, email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;`
const DUENO = '00000000-0000-4000-8000-000000000001'
const DECL = 'Declaro que la persona que invito sabe que la invito y acepta recibir el correo de invitación de Lockumi.'
const CID = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
const DIA = 86_400
let db: PGlite
const uno = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]

/** Alquiler en «ventana_reclamo». Sin `recibi`: la entrega fue hace `hace` segundos y el plazo empieza solo a los 2 días (20261025060000).
 *  Con `recibi`: el dueño tocó «Recibí la casa» hace `hace` segundos (el plazo de 7 días empezó ahí). */
async function enPlazo(hace: number, recibi = false) {
  await db.query(`select set_config('test.uid', $1, false)`, [DUENO])
  const hoy = new Date().toISOString().slice(0, 10), fin = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
  const { r } = (await uno<{ r: { id: string } }>(`select public.lk_crear_contrato_invitando('Casa 7 días', 10, $1::date, $2::date, '{}', 'invitada@correo.com', 'dueno@correo.com', $3) r`, [hoy, fin, DECL]))!
  await db.query(`update public.lk_contratos set estado = 'ventana_reclamo', escrow_contract_id = $2, ventana_inicio = now() - make_interval(secs => $3) where id = $1`, [r.id, CID, hace])
  if (recibi) await db.query(`update public.lk_contratos set ventana_inicio = now() - make_interval(secs => $2) where id = $1`, [r.id, hace])
  return r.id
}
const cerrar = async (id: string) => (await uno<{ ok: boolean }>('select public.lk_cerrar_sin_reclamo($1) ok', [id]))!.ok
const fila = (id: string) => uno<{ estado: string; resultado: { via: string; dueno: number; inquilino: number } | null; ventana_segundos: number }>('select estado, resultado, ventana_segundos from public.lk_contratos where id = $1', [id])
const pendientes = async () => (await db.query<{ id: string }>('select id from public.lk_devoluciones_pendientes(50) id')).rows.map(x => x.id)

beforeAll(async () => {
  const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string; readdirSync(p: string): string[] }
  db = new PGlite(); await db.exec(PRELUDIO)
  for (const m of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + m, 'utf8'))
}, 60_000)

describe('camino 16 · devolución automática a los 7 días (plazo real, sin esperar)', () => {
  it('el plazo por defecto de un alquiler nuevo es de 7 días (604800 s)', async () => {
    const id = await enPlazo(0); expect((await fila(id))!.ventana_segundos).toBe(7 * DIA)
  })
  for (const [nombre, recibi, dias] of [['con «Recibí la casa»: 7 días desde ese toque', true, 7], ['sin «Recibí la casa»: el plazo empieza solo a los 2 días de la entrega (7 + 2)', false, 9]] as const)
    it(`${nombre}; una hora antes no cierra; pasado, cierra con el 100 % al inquilino y queda para pagar una sola vez`, async () => {
      const antes = await enPlazo(dias * DIA - 3600, recibi)
      expect(await cerrar(antes)).toBe(false); expect((await fila(antes))!.estado).toBe('ventana_reclamo')
      // si el día 7 cae en domingo o feriado, el plazo pasa al siguiente día hábil (lk_fin_plazo): se busca el primer cierre posible
      let id = '', extra = 60
      for (; extra <= 3 * DIA; extra += DIA) { id = await enPlazo(dias * DIA + extra, recibi); if (await cerrar(id)) break }
      expect(extra).toBeLessThanOrEqual(3 * DIA)
      const f = (await fila(id))!
      expect(f.estado).toBe('cerrado'); expect(f.resultado).toMatchObject({ via: 'automatico', dueno: 0 }); expect(Number(f.resultado!.inquilino)).toBe(10)
      expect(await pendientes()).toContain(id)
      expect(await cerrar(id)).toBe(false)   // no se cierra dos veces
      const ev = await uno<{ n: number }>(`select count(*)::int n from public.lk_eventos where contrato_id = $1 and texto like 'Sin reclamos en el plazo:%'`, [id])
      expect(ev!.n).toBe(1)
    })
  it('con un reclamo abierto no se devuelve sola', async () => {
    const id = await enPlazo(7 * DIA + 60)
    await db.query(`update public.lk_contratos set estado = 'reclamo' where id = $1`, [id])
    expect(await cerrar(id)).toBe(false); expect(await pendientes()).not.toContain(id)
  })
})
