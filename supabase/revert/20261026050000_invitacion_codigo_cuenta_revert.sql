-- Volver atrás 20261026050000_invitacion_codigo_cuenta.sql: lk_aceptar_invitacion vuelve a la de 20261026040000 (mismos permisos).
-- Una transacción; quita su fila de schema_migrations. Para volver atrás también 040000, después correr su revert.
begin;
create or replace function public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; v_correo text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);   -- huella del token, un solo uso y vencimiento
  select * into c from public.lk_contratos where id = p_contrato for update;
  if public.lk_rol(p_contrato) = 'dueno' then raise exception 'Eres el dueño de este alquiler. Comparte el link con el inquilino.' using errcode = '42501'; end if;
  v_correo := public.lk_normalizar_correo(c.email_inquilino);
  if v_correo is null or not (
       exists (select 1 from public.lk_correos_verificados where usuario = auth.uid() and correo = v_correo)
       or exists (select 1 from public.lk_invitaciones_verificadas where contrato_id = p_contrato and usuario = auth.uid() and correo = v_correo
                  and verificado_en > clock_timestamp() - interval '1 hour')) then
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
end $$;
revoke all on function public.lk_aceptar_invitacion(uuid, text, text, text) from public, anon;
grant execute on function public.lk_aceptar_invitacion(uuid, text, text, text) to authenticated;
delete from supabase_migrations.schema_migrations where version = '20261026050000';
commit;
