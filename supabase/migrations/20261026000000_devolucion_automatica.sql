-- Paso 22 · Devolución automática de verdad (Términos 1.7-demo 5.3 d): la corrida diaria (/api/borrados) PAGA en la red de prueba los
-- casos cerrados sin reclamo, aunque nadie abra el alquiler. La app («liberar» / «devolver-automatico» de /api/tw) y la corrida usan
-- el MISMO bloqueo, así que nunca pagan dos veces el mismo caso (ni a la vez ni en un reintento).
-- Solo la clave de servicio (service_role) llama estas funciones; las columnas nuevas no se dan a authenticated (lk_contratos tiene
-- permisos por columna desde 20261017000000), así que la app no las ve y nada cambia en pantalla.
-- NO aplicada en producción. Orden al publicar: esta migración ANTES del código de la rama paso22-devolucion-automatica.

alter table public.lk_contratos
  add column if not exists pago_bloqueo_hasta timestamptz,          -- hasta cuándo dura el bloqueo (más que maxDuration 60 s)
  add column if not exists pago_bloqueo_token uuid,                  -- quién lo tiene (cada pedido genera el suyo)
  add column if not exists pago_tx_pendiente text,                   -- hash de la transacción firmada, guardado ANTES de enviarla
  add column if not exists pago_intentos int not null default 0,     -- veces que alguien tomó el pago
  add column if not exists pago_error text,                          -- último error, corto y sin secretos (solo operación)
  add column if not exists pago_revisar boolean not null default false;  -- el escrow no cuadra: no se paga solo, lo mira una persona

/** Casos que hay que pagar: cerrados sin reclamo (vencido el plazo → «automatico», o aprobados por el dueño → «devuelto»), con escrow,
 *  sin hash de pago, sin marca de revisión y sin nadie pagándolos. Primero los más viejos. */
create or replace function public.lk_devoluciones_pendientes(p_limite int default 5)
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id from public.lk_contratos c
   where c.estado = 'cerrado'
     and c.resultado->>'via' in ('automatico', 'devuelto')
     and c.escrow_contract_id is not null
     and c.liquidacion_tx is null
     and not c.pago_revisar
     and (c.pago_bloqueo_hasta is null or c.pago_bloqueo_hasta < now())
     and not exists (select 1 from public.lk_reclamos r where r.contrato_id = c.id)
   order by c.actualizado_en, c.id
   limit greatest(1, least(coalesce(p_limite, 5), 50))
$$;

/** Toma el pago de UN caso (atómico): true solo para quien lo toma. Falla para el resto mientras el bloqueo esté vigente, si ya
 *  está pagado (liquidacion_tx), si no es un cierre sin reclamo o si está marcado para revisar. */
create or replace function public.lk_tomar_pago(p_contrato uuid, p_token uuid, p_segundos int default 300)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_token is null then raise exception 'falta p_token'; end if;
  if p_segundos is null or p_segundos < 61 or p_segundos > 3600 then raise exception 'p_segundos fuera de rango (61 a 3600)'; end if;
  update public.lk_contratos c
     set pago_bloqueo_hasta = now() + make_interval(secs => p_segundos), pago_bloqueo_token = p_token, pago_intentos = c.pago_intentos + 1
   where c.id = p_contrato
     and c.estado = 'cerrado'
     and c.resultado->>'via' in ('automatico', 'devuelto')
     and c.escrow_contract_id is not null
     and c.liquidacion_tx is null
     and not c.pago_revisar
     and (c.pago_bloqueo_hasta is null or c.pago_bloqueo_hasta < now())
     and not exists (select 1 from public.lk_reclamos r where r.contrato_id = c.id);
  get diagnostics n = row_count;
  return n = 1;
end $$;

/** Antes de ENVIAR: guarda el hash de la transacción firmada. Solo si el bloqueo sigue vigente (si venció, otro pudo tomarlo: no se
 *  envía). Si la red la acepta pero el servidor se corta antes de guardar liquidacion_tx, el próximo intento ve el escrow ya pagado y
 *  cierra con este hash en vez de pagar otra vez. */
create or replace function public.lk_anotar_pago_pendiente(p_contrato uuid, p_token uuid, p_tx text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_tx !~ '^[0-9a-f]{64}$' then raise exception 'p_tx no es un hash'; end if;
  update public.lk_contratos set pago_tx_pendiente = p_tx
   where id = p_contrato and liquidacion_tx is null and pago_bloqueo_token = p_token and pago_bloqueo_hasta > now();
  get diagnostics n = row_count;
  return n = 1;
end $$;

/** Suelta el bloqueo propio (al terminar o al fallar); el de otro pedido no se toca. p_error: corto y sin secretos; p_revisar: el escrow no cuadra, no se reintenta solo.
 *  p_esperar: la transacción YA se envió y falló o no se supo el resultado (p. ej. se agotó el tiempo): el bloqueo se queda hasta que
 *  vence (5 min), para que la red termine de decidir antes del próximo intento, que primero mira el escrow y el hash pendiente. */
create or replace function public.lk_soltar_pago(p_contrato uuid, p_token uuid, p_error text default null, p_revisar boolean default false, p_esperar boolean default false)
returns void language sql security definer set search_path = public as $$
  update public.lk_contratos
     set pago_bloqueo_hasta = case when coalesce(p_esperar, false) then pago_bloqueo_hasta else null end,
         pago_bloqueo_token = case when coalesce(p_esperar, false) then pago_bloqueo_token else null end,
         pago_error = left(p_error, 300), pago_revisar = pago_revisar or coalesce(p_revisar, false)
   where id = p_contrato and pago_bloqueo_token = p_token;   -- solo quien tiene el bloqueo lo suelta
$$;

revoke all on function public.lk_devoluciones_pendientes(int) from public, anon, authenticated;
revoke all on function public.lk_tomar_pago(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.lk_anotar_pago_pendiente(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.lk_soltar_pago(uuid, uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.lk_devoluciones_pendientes(int) to service_role;
grant execute on function public.lk_tomar_pago(uuid, uuid, int) to service_role;
grant execute on function public.lk_anotar_pago_pendiente(uuid, uuid, text) to service_role;
grant execute on function public.lk_soltar_pago(uuid, uuid, text, boolean, boolean) to service_role;
