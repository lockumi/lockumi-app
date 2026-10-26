-- Invitación con otro correo (26/10/2026, aprobado por Katherine): quien entró con Apple (o con otro correo) y abre una invitación
-- enviada a OTRO correo puede pedir el código de 6 números de Lockumi a ESE correo. Con el código correcto, la invitación se acepta
-- con la cuenta de la sesión y queda registrado que el correo invitado se verificó (lk_invitaciones_verificadas).
-- Mismas reglas del código (20261025140000, sección 7, y 20261025210000): solo la huella HMAC con pepper, 10 minutos, 5 intentos, un solo
-- uso, reenvío como mucho 1 por minuto y 5 por hora por correo. Sin un código confirmado para el correo invitado de ESE alquiler,
-- lk_aceptar_invitacion sigue rechazando a otro correo como antes. El correo invitado NO pasa a lk_correos_verificados (no cambia el
-- correo de la cuenta, ni la reputación, ni el segundo factor): solo vale para ESTA invitación. Idempotente. Volver atrás:
-- supabase/revert/20261026040000_invitacion_codigo_revert.sql.

-- 1. La acción nueva del código.
alter table public.lk_codigos_correo drop constraint if exists lk_codigos_correo_accion_check;
alter table public.lk_codigos_correo add constraint lk_codigos_correo_accion_check check (accion in ('eliminar', 'descargar', 'verificar_correo', 'invitacion'));

-- 2. Invitación por confirmar: la sesión pidió el código para el correo invitado de un alquiler (una por sesión, vale 1 hora).
create table if not exists public.lk_invitaciones_por_confirmar (
  usuario uuid primary key,
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  correo text not null check (correo = lower(btrim(correo))),
  creado_en timestamptz not null default clock_timestamp()
);
alter table public.lk_invitaciones_por_confirmar enable row level security;
revoke all on public.lk_invitaciones_por_confirmar from anon, authenticated;

-- 3. Correo invitado verificado con el código, para ESE alquiler y ESA sesión (lo lee lk_aceptar_invitacion).
create table if not exists public.lk_invitaciones_verificadas (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  usuario uuid not null,
  correo text not null check (correo = lower(btrim(correo))),
  verificado_en timestamptz not null default clock_timestamp(),
  primary key (contrato_id, usuario)
);
alter table public.lk_invitaciones_verificadas enable row level security;
revoke all on public.lk_invitaciones_verificadas from anon, authenticated;

-- Deja la invitación por confirmar y devuelve el correo invitado (al que va el código). Revisa lo mismo que aceptar: token con huella,
-- sin vencer (lk_ver_invitacion), sin inquilino todavía y que la sesión no sea el dueño. Solo la clave de servicio.
create or replace function public.lk_invitacion_por_confirmar(p_usuario uuid, p_contrato uuid, p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; v text;
begin
  if p_usuario is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);
  select * into c from public.lk_contratos where id = p_contrato;
  v := public.lk_normalizar_correo(c.email_inquilino);
  if v is null or exists (select 1 from public.lk_participantes where contrato_id = p_contrato and (usuario = p_usuario or rol = 'inquilino')) then
    raise exception 'Esta invitación ya no está disponible. Si todavía la necesitas, pídele al dueño que te envíe una nueva.' using errcode = '42501';
  end if;
  delete from public.lk_invitaciones_por_confirmar where creado_en < clock_timestamp() - interval '1 day';
  insert into public.lk_invitaciones_por_confirmar(usuario, contrato_id, correo, creado_en) values (p_usuario, p_contrato, v, clock_timestamp())
  on conflict (usuario) do update set contrato_id = excluded.contrato_id, correo = excluded.correo, creado_en = excluded.creado_en;
  return v;
end $$;
revoke all on function public.lk_invitacion_por_confirmar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.lk_invitacion_por_confirmar(uuid, uuid, text) to service_role;

create or replace function public.lk_invitacion_pendiente(p_usuario uuid) returns text
language sql stable security definer set search_path = public as $$
  select correo from public.lk_invitaciones_por_confirmar where usuario = p_usuario and creado_en > clock_timestamp() - interval '1 hour'
$$;
revoke all on function public.lk_invitacion_pendiente(uuid) from public, anon, authenticated;
grant execute on function public.lk_invitacion_pendiente(uuid) to service_role;

-- 4. A qué correo va el código: 'invitacion' → el correo invitado por confirmar; lo demás, como antes.
create or replace function public.lk_correo_para_codigo(p_usuario uuid, p_accion text) returns text
language sql stable security definer set search_path = public as $$
  select case when p_accion = 'verificar_correo' then public.lk_correo_pendiente(p_usuario)
              when p_accion = 'invitacion' then public.lk_invitacion_pendiente(p_usuario)
              else public.lk_correo_activo(p_usuario) end
$$;
revoke all on function public.lk_correo_para_codigo(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_para_codigo(uuid, text) to service_role;

-- lk_codigo_nuevo: igual que en 20261025210000, con la acción nueva.
create or replace function public.lk_codigo_nuevo(p_usuario uuid, p_correo text, p_accion text, p_huella text, p_sal text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_normalizar_correo(p_correo); n bigint;
begin
  if p_accion is null or p_accion not in ('eliminar', 'descargar', 'verificar_correo', 'invitacion') or p_huella !~ '^[0-9a-f]{64}$' or p_sal !~ '^[0-9a-f]{32}$' then
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
end $$;
revoke all on function public.lk_codigo_nuevo(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.lk_codigo_nuevo(uuid, text, text, text, text) to service_role;

-- 5. Con el código confirmado (hace menos de 2 minutos): lo usa (un solo uso) y registra el correo invitado verificado para ESE alquiler
-- y ESA sesión. Devuelve el id del alquiler. Sin código confirmado: 28000 y no se registra nada.
create or replace function public.lk_confirmar_invitacion_codigo(p_usuario uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare p public.lk_invitaciones_por_confirmar;
begin
  select * into p from public.lk_invitaciones_por_confirmar where usuario = p_usuario and creado_en > clock_timestamp() - interval '1 hour';
  if p_usuario is null or p.usuario is null then
    raise exception 'Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».'
      using errcode = '28000';
  end if;
  perform public.lk_usar_codigo(p_usuario, p.correo, 'invitacion');
  insert into public.lk_invitaciones_verificadas(contrato_id, usuario, correo, verificado_en) values (p.contrato_id, p_usuario, p.correo, clock_timestamp())
  on conflict (contrato_id, usuario) do update set correo = excluded.correo, verificado_en = excluded.verificado_en;
  delete from public.lk_invitaciones_por_confirmar where usuario = p_usuario;
  return p.contrato_id;
end $$;
revoke all on function public.lk_confirmar_invitacion_codigo(uuid) from public, anon, authenticated;
grant execute on function public.lk_confirmar_invitacion_codigo(uuid) to service_role;

-- 6. lk_aceptar_invitacion: igual que en 20261025230000, y además acepta si ESTA sesión verificó con el código el correo invitado de
-- ESTE alquiler en la última hora (lk_invitaciones_verificadas). Sin eso, otro correo sigue rechazado con el mismo texto.
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
