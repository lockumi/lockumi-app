-- Volver atrás la migración 20261026000000_devolucion_automatica.sql (paso 22, devolución sin reclamo pagada por la corrida) en producción.
-- La migración solo AGREGA: 6 columnas en lk_contratos (pago_*) y 4 funciones nuevas (solo service_role). No cambia ninguna función ni
-- permiso que ya existía, así que volver atrás es quitarlas. No toca liquidacion_tx, estado, resultado ni lk_eventos: los pagos ya hechos
-- quedan registrados como siempre. Una transacción; quita su fila de schema_migrations.
-- ORDEN: 1) DEVOLUCION_CRON=0 en Vercel Production (o `git revert -m 1 <merge del paso 22>` y deploy nuevo) y esperar a que no haya un
-- pago en curso (pago_bloqueo_hasta < now() en todas las filas); 2) este archivo. Con el código del paso 22 y la base sin estas funciones,
-- «liberar» y «devolver-automatico» de /api/tw responden 503 (no pagan nada a medias).
begin;
drop function if exists public.lk_soltar_pago(uuid, uuid, text, boolean, boolean);
drop function if exists public.lk_anotar_pago_pendiente(uuid, uuid, text);
drop function if exists public.lk_tomar_pago(uuid, uuid, int);
drop function if exists public.lk_devoluciones_pendientes(int);
alter table public.lk_contratos
  drop column if exists pago_bloqueo_hasta,
  drop column if exists pago_bloqueo_token,
  drop column if exists pago_tx_pendiente,
  drop column if exists pago_intentos,
  drop column if exists pago_error,
  drop column if exists pago_revisar;
delete from supabase_migrations.schema_migrations where version = '20261026000000';
commit;
