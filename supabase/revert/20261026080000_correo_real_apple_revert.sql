-- Revert de 20261026080000_correo_real_apple.sql: vuelve lk_correo_para_codigo, lk_codigo_nuevo y lk_vincular_alquileres a como
-- estaban (20261026040000 y 20261026070000), borra los códigos 'correo_real', las funciones y las tablas del correo real.
begin;
create or replace function public.lk_correo_para_codigo(p_usuario uuid, p_accion text) returns text
language sql stable security definer set search_path = public as $$
  select case when p_accion = 'verificar_correo' then public.lk_correo_pendiente(p_usuario)
              when p_accion = 'invitacion' then public.lk_invitacion_pendiente(p_usuario)
              else public.lk_correo_activo(p_usuario) end
$$;
revoke all on function public.lk_correo_para_codigo(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_para_codigo(uuid, text) to service_role;
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
create or replace function public.lk_vincular_alquileres(p_usuario uuid, p_correo text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_correo text := public.lk_normalizar_correo(p_correo); r record; t text; n integer := 0;
begin
  if p_usuario is null or v_correo is null then return 0; end if;
  -- El correo tiene que ser de ESTA sesión y verificado por Cavos recién (Google/Apple, o el código por correo de Cavos: 'cavos-email').
  if not exists (select 1 from public.lk_correos_verificados v where v.usuario = p_usuario and v.correo = v_correo
                 and v.metodo in ('google', 'apple', 'cavos-email') and v.verificado_en > clock_timestamp() - interval '10 minutes') then return 0; end if;
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
    -- Lo que la persona ya hizo en ESE alquiler (firmas, aceptaciones, ocultos…) sigue siendo suyo en la sesión nueva.
    foreach t in array array['lk_firmas', 'lk_aceptaciones_terminos', 'lk_aceptaciones_mediacion', 'lk_correos_consentimiento',
      'lk_declaraciones_invitacion', 'lk_invitaciones_verificadas', 'lk_ocultos', 'lk_reglas_651', 'lk_reputacion_eventos', 'lk_reputacion_revisiones'] loop
      if to_regclass('public.' || t) is not null then
        begin
          execute format('update public.%I set usuario = $1 where contrato_id = $2 and usuario = $3', t) using p_usuario, r.contrato_id, r.usuario;
        exception when unique_violation then null;   -- la sesión nueva ya tenía esa fila: se queda la suya
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
delete from public.lk_codigos_correo where accion = 'correo_real';
alter table public.lk_codigos_correo drop constraint if exists lk_codigos_correo_accion_check;
alter table public.lk_codigos_correo add constraint lk_codigos_correo_accion_check check (accion in ('eliminar', 'descargar', 'verificar_correo', 'invitacion'));
drop function if exists public.lk_tengo_correo_real();
drop function if exists public.lk_confirmar_correo_real(uuid);
drop function if exists public.lk_correo_real_pendiente(uuid);
drop function if exists public.lk_correo_real_por_confirmar(uuid, text);
drop function if exists public.lk_correo_aviso(text);
drop function if exists public.lk_correo_real_de(text);
drop function if exists public.lk_correo_apple_de_sesion(uuid);
drop table if exists public.lk_correos_reales_por_confirmar;
drop table if exists public.lk_correos_reales;
delete from supabase_migrations.schema_migrations where version = '20261026080000';
commit;
