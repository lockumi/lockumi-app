-- Volver atrás 20261026070000_vincular_cavos_email.sql: 'cavos-email' vuelve a 'email', las dos funciones vuelven a la versión anterior
-- (20261025210000 y 20261026060000) y el método vuelve a google/apple/email. Una transacción; quita su fila de schema_migrations.
begin;
create or replace function public.lk_confirmar_correo_pendiente(p_usuario uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_correo_pendiente(p_usuario);
begin
  if p_usuario is null or c is null then
    raise exception 'Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».'
      using errcode = '28000';
  end if;
  perform public.lk_usar_codigo(p_usuario, c, 'verificar_correo');
  insert into public.lk_correos_verificados(usuario, correo, metodo, verificado_en) values (p_usuario, c, 'email', clock_timestamp())
  on conflict (usuario, correo) do update set metodo = excluded.metodo, verificado_en = excluded.verificado_en;
  delete from public.lk_correos_por_confirmar where usuario = p_usuario;
  return c;
end $$;
revoke all on function public.lk_confirmar_correo_pendiente(uuid) from public, anon, authenticated;
grant execute on function public.lk_confirmar_correo_pendiente(uuid) to service_role;
create or replace function public.lk_vincular_alquileres(p_usuario uuid, p_correo text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_correo text := public.lk_normalizar_correo(p_correo); r record; t text; n integer := 0;
begin
  if p_usuario is null or v_correo is null then return 0; end if;
  -- El correo tiene que ser de ESTA sesión y verificado por Cavos (Google/Apple) recién: lo registró el mismo pedido.
  if not exists (select 1 from public.lk_correos_verificados v where v.usuario = p_usuario and v.correo = v_correo
                 and v.metodo in ('google', 'apple') and v.verificado_en > clock_timestamp() - interval '10 minutes') then return 0; end if;
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
update public.lk_correos_verificados set metodo = 'email' where metodo = 'cavos-email';
alter table public.lk_correos_verificados drop constraint if exists lk_correos_verificados_metodo_check;
alter table public.lk_correos_verificados add constraint lk_correos_verificados_metodo_check check (metodo in ('google', 'apple', 'email'));
delete from supabase_migrations.schema_migrations where version = '20261026070000';
commit;
