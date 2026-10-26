-- Tus alquileres en cualquier dispositivo (26/10/2026, Katherine; aprobado por el Coordinador). «Tus alquileres» se ve por la sesión
-- anónima de Supabase de cada navegador (lk_participantes.usuario = auth.uid()): al entrar en otro navegador, la sesión nueva no veía
-- los alquileres de la persona. Ahora, tras un login cuyo correo verificó CAVOS (token de Google o Apple que /api/verificar-correo
-- valida en el servidor; el correo sale del token, nunca del cliente), el servidor llama a lk_vincular_alquileres y los lugares de esa
-- persona (dueño e inquilino) pasan a la sesión actual. NO vale un correo verificado solo con el código de Lockumi (metodo 'email', que
-- la base no distingue del enclave) ni uno sin verificar. Idempotente: la segunda vez no hay nada que mover. Solo la clave de servicio.
-- Se salta un alquiler si la sesión ya es parte de él (no se juntan los dos lugares en una sesión). Si los dos lugares tienen ese
-- correo, se trae solo el de dueño. Cada cambio queda en lk_vinculaciones (sin correos). Volver atrás: supabase/revert/20261026060000_vincular_alquileres_revert.sql.
create table if not exists public.lk_vinculaciones (
  id bigserial primary key,
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  rol text not null,
  usuario_antes uuid not null,
  usuario_nuevo uuid not null,
  en timestamptz not null default clock_timestamp()
);
alter table public.lk_vinculaciones enable row level security;   -- sin políticas: nadie la lee con anon/authenticated
revoke all on table public.lk_vinculaciones from public, anon, authenticated;
revoke all on sequence public.lk_vinculaciones_id_seq from public, anon, authenticated;

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
