-- Volver atrás la migración 20261026040000_invitacion_codigo.sql (invitación con otro correo y código) en producción.
-- Restaura lk_aceptar_invitacion, lk_correo_para_codigo y lk_codigo_nuevo EXACTAMENTE como estaban en producción antes de aplicarla
-- (pg_get_functiondef del 26/10/2026), con los mismos permisos; borra las funciones y tablas nuevas, los códigos 'invitacion' y vuelve
-- a poner la restricción de acciones. Quien ya aceptó con el código sigue en el alquiler (no se tocan lk_participantes).
-- Una transacción; quita su fila de schema_migrations. Úsese junto con `git revert -m 1 <merge>` y un deploy nuevo.
begin;
CREATE OR REPLACE FUNCTION public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.lk_contratos; v_correo text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);   -- huella del token, un solo uso y vencimiento
  select * into c from public.lk_contratos where id = p_contrato for update;
  if public.lk_rol(p_contrato) = 'dueno' then raise exception 'Eres el dueño de este alquiler. Comparte el link con el inquilino.' using errcode = '42501'; end if;
  v_correo := public.lk_normalizar_correo(c.email_inquilino);
  if v_correo is null or not exists (select 1 from public.lk_correos_verificados where usuario = auth.uid() and correo = v_correo) then
    if not exists (select 1 from public.lk_correos_verificados where usuario = auth.uid()) then
      -- LEGAL: revisado (25/10, 5:04 p. m.) · el mismo texto de la reputación (lk_participante_correo_verificado) cuando la sesión no tiene ningún correo verificado
      raise exception 'No pudimos confirmar el correo de tu cuenta. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.' using errcode = '28000';
    end if;
    -- LEGAL: revisado (25/10, 10:10 p. m.) · texto literal de Legal (paso 21)
    raise exception 'Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.' using errcode = '42501';
  end if;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar)
  values (p_contrato, 'inquilino', auth.uid(), v_correo, p_direccion_stellar);
  update public.lk_contratos set invitacion_hash = null where id = p_contrato;   -- un solo uso
  perform public.lk_evento(p_contrato, 'El inquilino aceptó la invitación');
end $function$
;
CREATE OR REPLACE FUNCTION public.lk_correo_para_codigo(p_usuario uuid, p_accion text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when p_accion = 'verificar_correo' then public.lk_correo_pendiente(p_usuario) else public.lk_correo_activo(p_usuario) end
$function$
;
CREATE OR REPLACE FUNCTION public.lk_codigo_nuevo(p_usuario uuid, p_correo text, p_accion text, p_huella text, p_sal text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c text := public.lk_normalizar_correo(p_correo); n bigint;
begin
  if p_accion is null or p_accion not in ('eliminar', 'descargar', 'verificar_correo') or p_huella !~ '^[0-9a-f]{64}$' or p_sal !~ '^[0-9a-f]{32}$' then
    raise exception 'Pedido de código inválido.' using errcode = '22023';   -- solo lo ve api/_lib/codigo-correo.ts
  end if;
  if p_usuario is null or c is null or c is distinct from public.lk_correo_para_codigo(p_usuario, p_accion) then return jsonb_build_object('error', 'correo'); end if;
  perform pg_advisory_xact_lock(hashtext('lk_codigo_nuevo:' || c));
  delete from public.lk_codigos_correo where creado_en < clock_timestamp() - interval '1 day';
  if exists (select 1 from public.lk_codigos_correo where correo = c and creado_en > clock_timestamp() - interval '1 minute') then
    return jsonb_build_object('error', 'minuto');
  end if;
  if (select count(*) from public.lk_codigos_correo where correo = c and creado_en > clock_timestamp() - interval '1 hour') >= 5 then
    return jsonb_build_object('error', 'hora');
  end if;
  update public.lk_codigos_correo set anulado_en = clock_timestamp()
    where usuario = p_usuario and correo = c and accion = p_accion and usado_en is null and anulado_en is null;
  insert into public.lk_codigos_correo(usuario, correo, accion, huella, sal, vence_en)
    values (p_usuario, c, p_accion, p_huella, p_sal, clock_timestamp() + interval '10 minutes') returning id into n;
  return jsonb_build_object('id', n);
end $function$
;
revoke all on function public.lk_aceptar_invitacion(uuid, text, text, text) from public, anon;
grant execute on function public.lk_aceptar_invitacion(uuid, text, text, text) to authenticated;
revoke all on function public.lk_correo_para_codigo(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_para_codigo(uuid, text) to service_role;
revoke all on function public.lk_codigo_nuevo(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.lk_codigo_nuevo(uuid, text, text, text, text) to service_role;
drop function if exists public.lk_confirmar_invitacion_codigo(uuid);
drop function if exists public.lk_invitacion_pendiente(uuid);
drop function if exists public.lk_invitacion_por_confirmar(uuid, uuid, text);
drop table if exists public.lk_invitaciones_verificadas;
drop table if exists public.lk_invitaciones_por_confirmar;
delete from public.lk_codigos_correo where accion = 'invitacion';
alter table public.lk_codigos_correo drop constraint if exists lk_codigos_correo_accion_check;
alter table public.lk_codigos_correo add constraint lk_codigos_correo_accion_check check (accion in ('eliminar', 'descargar', 'verificar_correo'));
delete from supabase_migrations.schema_migrations where version = '20261026040000';
commit;
