-- Correo real para avisos con Apple (26/10/2026, Katherine por el Coordinador, 10:18 a. m. CR). Con Apple y un correo
-- @privaterelay.appleid.com, los correos de Lockumi no llegan (lockumi.com no está registrado en el relay de Apple). La app pide UNA vez
-- un correo real, lo confirma con el código de 6 números de siempre (acción 'correo_real', 10 minutos, 5 intentos) y lo guarda para
-- ESA cuenta de Apple en lk_correos_reales (origen 'apple-real'). NO entra en lk_correos_verificados: no cambia el correo activo, ni
-- quién acepta invitaciones, ni la reputación. Se usa para:
--   · avisos y códigos: el servidor manda al correo real en vez del privaterelay (lk_correo_aviso);
--   · traer alquileres: lk_vincular_alquileres acepta el correo real SOLO si ESTA sesión tiene un token de Apple verificado en el
--     servidor (método 'apple', hace menos de 10 minutos) del correo de Apple que lo guardó. El código de invitación ('email') nunca trae.
-- La app nunca manda de qué cuenta es: el correo de Apple sale siempre del correo verificado ACTIVO de la sesión (lk_correo_activo).
-- Volver atrás: supabase/revert/20261026080000_correo_real_apple_revert.sql.

create table if not exists public.lk_correos_reales (
  correo_apple text primary key check (correo_apple like '%@privaterelay.appleid.com'),
  correo_real text not null check (correo_real !~* '@privaterelay\.appleid\.com$'),
  origen text not null default 'apple-real' check (origen = 'apple-real'),
  usuario uuid not null,
  verificado_en timestamptz not null default clock_timestamp()
);
alter table public.lk_correos_reales enable row level security;
revoke all on public.lk_correos_reales from anon, authenticated;

create table if not exists public.lk_correos_reales_por_confirmar (
  usuario uuid primary key,
  correo_apple text not null,
  correo_real text not null,
  creado_en timestamptz not null default clock_timestamp()
);
alter table public.lk_correos_reales_por_confirmar enable row level security;
revoke all on public.lk_correos_reales_por_confirmar from anon, authenticated;

alter table public.lk_codigos_correo drop constraint if exists lk_codigos_correo_accion_check;
alter table public.lk_codigos_correo add constraint lk_codigos_correo_accion_check check (accion in ('eliminar', 'descargar', 'verificar_correo', 'invitacion', 'correo_real'));

-- El correo de Apple de ESTA sesión: el verificado activo, solo si es privaterelay y lo verificó un token de Apple en el servidor.
create or replace function public.lk_correo_apple_de_sesion(p_usuario uuid) returns text
language sql stable security definer set search_path = public as $$
  select v.correo from public.lk_correos_verificados v
  where v.usuario = p_usuario and v.correo = public.lk_correo_activo(p_usuario) and v.metodo = 'apple' and v.correo like '%@privaterelay.appleid.com'
$$;
revoke all on function public.lk_correo_apple_de_sesion(uuid) from public, anon, authenticated;
grant execute on function public.lk_correo_apple_de_sesion(uuid) to service_role;

-- El correo real guardado para un correo (null si no hay). Solo el servidor.
create or replace function public.lk_correo_real_de(p_correo text) returns text
language sql stable security definer set search_path = public as $$
  select correo_real from public.lk_correos_reales where correo_apple = public.lk_normalizar_correo(p_correo)
$$;
revoke all on function public.lk_correo_real_de(text) from public, anon, authenticated;
grant execute on function public.lk_correo_real_de(text) to service_role;

-- A dónde mandar un aviso: el correo real si ese correo de Apple tiene uno guardado; si no, el mismo.
create or replace function public.lk_correo_aviso(p_correo text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(public.lk_correo_real_de(p_correo), public.lk_normalizar_correo(p_correo))
$$;
revoke all on function public.lk_correo_aviso(text) from public, anon, authenticated;
grant execute on function public.lk_correo_aviso(text) to service_role;

-- Deja el correo real «por confirmar» (1 hora). Error 28000 si la sesión no es de Apple con privaterelay; 22023 si el correo no sirve.
create or replace function public.lk_correo_real_por_confirmar(p_usuario uuid, p_correo text) returns text
language plpgsql security definer set search_path = public as $$
declare a text := public.lk_correo_apple_de_sesion(p_usuario); c text := public.lk_normalizar_correo(p_correo);
begin
  if a is null then raise exception 'Esta cuenta no es de Apple con correo oculto.' using errcode = '28000'; end if;
  if c is null or c !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or c ~* '@privaterelay\.appleid\.com$' then
    raise exception 'Correo inválido.' using errcode = '22023';
  end if;
  delete from public.lk_correos_reales_por_confirmar where creado_en < clock_timestamp() - interval '1 day';
  insert into public.lk_correos_reales_por_confirmar(usuario, correo_apple, correo_real, creado_en) values (p_usuario, a, c, clock_timestamp())
  on conflict (usuario) do update set correo_apple = excluded.correo_apple, correo_real = excluded.correo_real, creado_en = excluded.creado_en;
  return c;
end $$;
revoke all on function public.lk_correo_real_por_confirmar(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_real_por_confirmar(uuid, text) to service_role;

create or replace function public.lk_correo_real_pendiente(p_usuario uuid) returns text
language sql stable security definer set search_path = public as $$
  select p.correo_real from public.lk_correos_reales_por_confirmar p
  where p.usuario = p_usuario and p.creado_en > clock_timestamp() - interval '1 hour' and p.correo_apple = public.lk_correo_apple_de_sesion(p_usuario)
$$;
revoke all on function public.lk_correo_real_pendiente(uuid) from public, anon, authenticated;
grant execute on function public.lk_correo_real_pendiente(uuid) to service_role;

-- Con el código confirmado: lo usa (un solo uso) y SOLO entonces guarda el correo real para esa cuenta de Apple ('apple-real').
create or replace function public.lk_confirmar_correo_real(p_usuario uuid) returns text
language plpgsql security definer set search_path = public as $$
declare a text := public.lk_correo_apple_de_sesion(p_usuario); c text := public.lk_correo_real_pendiente(p_usuario);
begin
  if a is null or c is null then
    raise exception 'Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».'
      using errcode = '28000';
  end if;
  perform public.lk_usar_codigo(p_usuario, c, 'correo_real');
  insert into public.lk_correos_reales(correo_apple, correo_real, origen, usuario, verificado_en) values (a, c, 'apple-real', p_usuario, clock_timestamp())
  on conflict (correo_apple) do update set correo_real = excluded.correo_real, usuario = excluded.usuario, verificado_en = excluded.verificado_en;
  delete from public.lk_correos_reales_por_confirmar where usuario = p_usuario;
  return c;
end $$;
revoke all on function public.lk_confirmar_correo_real(uuid) from public, anon, authenticated;
grant execute on function public.lk_confirmar_correo_real(uuid) to service_role;

-- ¿La cuenta de esta sesión ya tiene el correo real? (la app no vuelve a preguntar). Solo mira auth.uid(); no devuelve correos.
create or replace function public.lk_tengo_correo_real() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_correos_reales where correo_apple = public.lk_correo_activo(auth.uid()))
$$;
revoke all on function public.lk_tengo_correo_real() from public, anon;
grant execute on function public.lk_tengo_correo_real() to authenticated, service_role;

-- A qué correo va el código: 'correo_real' → el correo real por confirmar; lo demás, como en 20261026040000.
create or replace function public.lk_correo_para_codigo(p_usuario uuid, p_accion text) returns text
language sql stable security definer set search_path = public as $$
  select case when p_accion = 'verificar_correo' then public.lk_correo_pendiente(p_usuario)
              when p_accion = 'invitacion' then public.lk_invitacion_pendiente(p_usuario)
              when p_accion = 'correo_real' then public.lk_correo_real_pendiente(p_usuario)
              else public.lk_correo_activo(p_usuario) end
$$;
revoke all on function public.lk_correo_para_codigo(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_para_codigo(uuid, text) to service_role;

-- lk_codigo_nuevo: igual que en 20261026040000, con la acción nueva.
create or replace function public.lk_codigo_nuevo(p_usuario uuid, p_correo text, p_accion text, p_huella text, p_sal text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_normalizar_correo(p_correo); n bigint;
begin
  if p_accion is null or p_accion not in ('eliminar', 'descargar', 'verificar_correo', 'invitacion', 'correo_real') or p_huella !~ '^[0-9a-f]{64}$' or p_sal !~ '^[0-9a-f]{32}$' then
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

-- lk_vincular_alquileres: igual que en 20261026070000, más el correo real ('apple-real') con el token de Apple de ESTA sesión.
create or replace function public.lk_vincular_alquileres(p_usuario uuid, p_correo text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_correo text := public.lk_normalizar_correo(p_correo); r record; t text; n integer := 0;
begin
  if p_usuario is null or v_correo is null then return 0; end if;
  -- El correo tiene que ser de ESTA sesión y verificado por Cavos recién (Google/Apple, o el código por correo de Cavos: 'cavos-email'),
  -- o el correo real guardado ('apple-real') de la cuenta de Apple que ESTA sesión verificó recién con su token.
  if not exists (select 1 from public.lk_correos_verificados v where v.usuario = p_usuario and v.correo = v_correo
                 and v.metodo in ('google', 'apple', 'cavos-email') and v.verificado_en > clock_timestamp() - interval '10 minutes')
     and not exists (select 1 from public.lk_correos_reales x join public.lk_correos_verificados v on v.correo = x.correo_apple
                 where x.correo_real = v_correo and x.origen = 'apple-real' and v.usuario = p_usuario and v.metodo = 'apple'
                   and v.verificado_en > clock_timestamp() - interval '10 minutes') then return 0; end if;
  for r in
    select p.contrato_id, p.rol, p.usuario from public.lk_participantes p
    where public.lk_normalizar_correo(p.email_cavos) = v_correo and p.usuario <> p_usuario
      and not exists (select 1 from public.lk_participantes q where q.contrato_id = p.contrato_id and q.usuario = p_usuario)
      -- Si la misma cuenta es dueña e inquilina del alquiler (una sesión solo puede tener un lugar): se trae el de DUEÑO (quien lo creó).
      and (p.rol = 'dueno' or not exists (select 1 from public.lk_participantes q where q.contrato_id = p.contrato_id and q.rol = 'dueno'
           and public.lk_normalizar_correo(q.email_cavos) = v_correo))
    order by p.contrato_id for update of p
  loop
    update public.lk_participantes set usuario = p_usuario where contrato_id = r.contrato_id and rol = r.rol;
    foreach t in array array['lk_firmas', 'lk_aceptaciones_terminos', 'lk_aceptaciones_mediacion', 'lk_correos_consentimiento',
      'lk_declaraciones_invitacion', 'lk_invitaciones_verificadas', 'lk_ocultos', 'lk_reglas_651', 'lk_reputacion_eventos', 'lk_reputacion_revisiones'] loop
      if to_regclass('public.' || t) is not null then
        begin
          execute format('update public.%I set usuario = $1 where contrato_id = $2 and usuario = $3', t) using p_usuario, r.contrato_id, r.usuario;
        exception when unique_violation then null;
        end;
      end if;
    end loop;
    insert into public.lk_vinculaciones(contrato_id, rol, usuario_antes, usuario_nuevo) values (r.contrato_id, r.rol, r.usuario, p_usuario);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.lk_vincular_alquileres(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_vincular_alquileres(uuid, text) to service_role;
