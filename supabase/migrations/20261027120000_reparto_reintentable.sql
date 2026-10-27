-- 27/10/2026 · Cierre sin pago (alquiler b10557f9): el reparto aceptado (acuerdo, o mediación con las dos aceptaciones) usa el MISMO
-- bloqueo idempotente que la devolución del paso 22 (20261026000000), así un pago que falló se puede reintentar sin pagar dos veces.
-- La base sigue cerrando el caso antes de la transacción (lk_responder_reclamo / lk_decidir_mediacion no cambian); «cerrado» con
-- liquidacion_tx vacío es el estado «por pagar», reintentable desde la app («repartir») y desde la corrida (REPARTOS_CRON=1).
-- Solo service_role. No cambia nada que vea la app (las columnas pago_* ya no se dan a authenticated).
-- Orden al publicar: esta migración ANTES del código de la rama cierre-pago-reintento (sin ella, «repartir» contesta 503 y no paga).

/** ¿Es un cierre que el servidor paga? Sin reclamo (automatico/devuelto) o con el reparto aceptado por las dos partes. */
create or replace function public.lk_cierre_por_pagar(c public.lk_contratos)
returns boolean language sql stable security definer set search_path = public as $$
  select c.estado = 'cerrado'
     and c.escrow_contract_id is not null
     and (
       (c.resultado->>'via' in ('automatico', 'devuelto') and not exists (select 1 from public.lk_reclamos r where r.contrato_id = c.id))
       or c.resultado->>'via' = 'acuerdo'
       or (c.resultado->>'via' = 'mediacion' and c.resultado->>'cierre' = 'dos_aceptan')
     )
$$;

create or replace function public.lk_tomar_pago(p_contrato uuid, p_token uuid, p_segundos int default 300)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_token is null then raise exception 'falta p_token'; end if;
  if p_segundos is null or p_segundos < 61 or p_segundos > 3600 then raise exception 'p_segundos fuera de rango (61 a 3600)'; end if;
  update public.lk_contratos c
     set pago_bloqueo_hasta = now() + make_interval(secs => p_segundos), pago_bloqueo_token = p_token, pago_intentos = c.pago_intentos + 1
   where c.id = p_contrato
     and public.lk_cierre_por_pagar(c)
     and c.liquidacion_tx is null
     and not c.pago_revisar
     and (c.pago_bloqueo_hasta is null or c.pago_bloqueo_hasta < now());
  get diagnostics n = row_count;
  return n = 1;
end $$;

/** Repartos aceptados por pagar (cerrados por acuerdo o por mediación con las dos aceptaciones, con escrow, sin hash de pago, sin marca
 *  de revisión y sin nadie pagándolos). Primero los más viejos. Solo lectura: la usan la corrida y el listado de operación. */
create or replace function public.lk_repartos_pendientes(p_limite int default 5)
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id from public.lk_contratos c
   where c.estado = 'cerrado'
     and (c.resultado->>'via' = 'acuerdo' or (c.resultado->>'via' = 'mediacion' and c.resultado->>'cierre' = 'dos_aceptan'))
     and c.escrow_contract_id is not null
     and c.liquidacion_tx is null
     and not c.pago_revisar
     and (c.pago_bloqueo_hasta is null or c.pago_bloqueo_hasta < now())
   order by c.actualizado_en, c.id
   limit greatest(1, least(coalesce(p_limite, 5), 50))
$$;

revoke all on function public.lk_cierre_por_pagar(public.lk_contratos) from public, anon, authenticated;
revoke all on function public.lk_tomar_pago(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.lk_repartos_pendientes(int) from public, anon, authenticated;
grant execute on function public.lk_cierre_por_pagar(public.lk_contratos) to service_role;
grant execute on function public.lk_tomar_pago(uuid, uuid, int) to service_role;
grant execute on function public.lk_repartos_pendientes(int) to service_role;
