-- Paso 21 · Aceptar una invitación solo con el correo invitado VERIFICADO para esta sesión (Legal, 25/10/2026, 10:10 p. m.).
-- Antes (20261017000000_lockumi_e2e.sql:197) se comparaba p_email_cavos, el correo que MANDA la app: quien tuviera el link podía escribir
-- el correo invitado llamando a la API. Ahora cuenta solo lk_correos_verificados (sesión, correo), que escribe el servidor con la clave
-- de servicio después de comprobar el inicio de sesión (api/verificar-correo.ts y api/codigo-correo.ts, rama paso19-reputacion).
-- Se mantiene: token guardado solo como huella SHA-256, un solo uso, 7 días (lk_invitacion_7_dias) y el dueño no puede aceptar.
-- p_email_cavos se conserva en la firma (la app publicada lo sigue mandando) pero NO se usa para decidir: se guarda el correo verificado.
-- DEPENDENCIA: lk_correos_verificados y lk_normalizar_correo son de 20261025140000_reputacion.sql (aplicada en producción, todavía no
-- en master). Aquí se crean solo si faltan, con la MISMA definición, para que master y las pruebas funcionen sin la reputación; en una
-- base que ya la tiene no cambian nada. Idempotente. Sin quien llene la tabla (la reputación sin publicar), NADIE puede aceptar: ver
-- docs/invitacion-enlace.md («Orden para publicar»).
create or replace function public.lk_normalizar_correo(p text) returns text language sql immutable as $$ select nullif(lower(btrim(p)), '') $$;
-- La referencia a auth.users va solo si existe (en Supabase siempre; en las pruebas con PGlite no hay auth.users).
do $$ begin
  if to_regclass('public.lk_correos_verificados') is null then
    create table public.lk_correos_verificados (
      usuario uuid not null,
      correo text not null check (correo = lower(btrim(correo))),
      metodo text not null check (metodo in ('google', 'apple', 'email')),
      verificado_en timestamptz not null default now(),
      primary key (usuario, correo)
    );
    if to_regclass('auth.users') is not null then
      alter table public.lk_correos_verificados add constraint lk_correos_verificados_usuario_fkey foreign key (usuario) references auth.users(id) on delete cascade;
    end if;
  end if;
end $$;
alter table public.lk_correos_verificados enable row level security;
revoke all on public.lk_correos_verificados from anon, authenticated;

create or replace function public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text default null) returns void
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke all on function public.lk_aceptar_invitacion(uuid, text, text, text) from public, anon;
grant execute on function public.lk_aceptar_invitacion(uuid, text, text, text) to authenticated;
