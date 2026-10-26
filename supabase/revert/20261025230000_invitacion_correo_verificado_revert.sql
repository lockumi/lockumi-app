-- Volver atrás la migración 20261025230000_invitacion_correo_verificado.sql (paso 21, invitación v3) en producción.
-- Restaura lk_aceptar_invitacion EXACTAMENTE como estaba en producción antes de aplicarla (pg_get_functiondef del 25/10/2026, 10:58 p. m. CR):
-- vuelve a decidir con el correo que manda la app (p_email_cavos), sin mirar lk_correos_verificados. Mismos permisos que antes
-- (postgres y authenticated; ni public ni anon). No toca lk_normalizar_correo (230000 la redefine con el mismo cuerpo) ni
-- lk_correos_verificados (es de la reputación, 20261025140000; 230000 solo la crea si falta). Una transacción; quita su fila de schema_migrations.
-- Úsese junto con `git revert -m 1 <merge del paso 21>` y un deploy nuevo (la app v3 con la base vieja sigue aceptando, pero sin el control de Legal).
begin;
CREATE OR REPLACE FUNCTION public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.lk_contratos;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);
  select * into c from public.lk_contratos where id = p_contrato for update;
  if public.lk_rol(p_contrato) = 'dueno' then raise exception 'Eres el dueño de este alquiler. Comparte el link con el inquilino.' using errcode = '42501'; end if;
  if lower(trim(p_email_cavos)) <> c.email_inquilino then
    raise exception 'Esta invitación es para %. Entra con ese correo.', c.email_inquilino using errcode = '42501';
  end if;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar)
  values (p_contrato, 'inquilino', auth.uid(), lower(trim(p_email_cavos)), p_direccion_stellar);
  update public.lk_contratos set invitacion_hash = null where id = p_contrato;   -- un solo uso
  perform public.lk_evento(p_contrato, 'El inquilino aceptó la invitación');
end $function$
;
revoke all on function public.lk_aceptar_invitacion(uuid, text, text, text) from public, anon;
grant execute on function public.lk_aceptar_invitacion(uuid, text, text, text) to authenticated;
delete from supabase_migrations.schema_migrations where version = '20261025230000';
commit;
