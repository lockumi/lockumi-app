-- Arreglo (26/10/2026, aprobado por Katherine a las 3:07 p. m. CR): la persona invitada abrió el link en un aparato con la sesión del
-- dueño abierta y el alquiler quedó con el correo del dueño como dueño y como inquilino. Ahora la base rechaza que el inquilino sea la
-- MISMA cuenta que el dueño o tenga un correo del dueño (sin mayúsculas ni espacios), mirando también los correos verificados de la
-- cuenta que acepta (lk_correos_verificados, incluido el código por correo de Cavos) y el correo real de Apple (lk_correos_reales).
-- La guarda es un disparador en lk_participantes: vale para lk_aceptar_invitacion, lk_aceptar_invitacion_con_terminos y
-- /api/codigo-correo. Solo al insertar: las filas que ya existen no se tocan (ni al vincular alquileres).
-- lk_ver_invitacion devuelve además `es_dueno` (solo dice si la sesión que pregunta es el dueño; no muestra correos).
-- Volver atrás: supabase/revert/20261026100000_invitacion_no_dueno_revert.sql.

-- Correos de una parte: el correo con el que quedó (email_cavos) y su correo de Apple (oculto y real, lk_correos_reales); con
-- p_verificados, también los correos verificados de la cuenta (lk_correos_verificados, incluido el código por correo de Cavos).
create or replace function public.lk_correos_de_parte(p_usuario uuid, p_correo text, p_verificados boolean) returns setof text
language sql stable security definer set search_path = public as $$
  with base as (
    select public.lk_normalizar_correo(p_correo) c
    union select correo from public.lk_correos_verificados where p_verificados and usuario = p_usuario
    union select correo_real from public.lk_correos_reales where usuario = p_usuario
    union select correo_apple from public.lk_correos_reales where usuario = p_usuario
  )
  select c from base where c is not null
  union select r.correo_real from public.lk_correos_reales r join base b on r.correo_apple = b.c
  union select r.correo_apple from public.lk_correos_reales r join base b on r.correo_real = b.c
$$;

-- ¿Esta cuenta (con este correo) es el dueño del alquiler? La misma cuenta, o un correo en común: del dueño, el correo con el que
-- creó el alquiler y su Apple; de quien acepta, ese correo, los verificados de su cuenta y su Apple.
create or replace function public.lk_es_el_dueno(p_contrato uuid, p_usuario uuid, p_correo text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lk_participantes d
    where d.contrato_id = p_contrato and d.rol = 'dueno'
      and (d.usuario = p_usuario
        or exists (select 1 from public.lk_correos_de_parte(d.usuario, d.email_cavos, false) x
                   where x in (select y from public.lk_correos_de_parte(p_usuario, p_correo, true) y)))
  )
$$;

create or replace function public.lk_inquilino_no_dueno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol = 'inquilino' and public.lk_es_el_dueno(new.contrato_id, new.usuario, new.email_cavos) then
    -- Texto aprobado por Katherine (26/10/2026, 3:07 p. m.), el mismo que muestra la app
    raise exception 'Este link es para la otra persona. Cierra sesión o ábrelo en otro dispositivo.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists lk_inquilino_no_dueno on public.lk_participantes;
create trigger lk_inquilino_no_dueno before insert on public.lk_participantes
  for each row execute function public.lk_inquilino_no_dueno();

-- Igual que 20261026010000 (mismo texto y misma lógica); solo agrega `es_dueno` para la sesión que pregunta.
create or replace function public.lk_ver_invitacion(p_contrato uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.invitacion_hash is null or c.invitacion_hash <> encode(sha256(convert_to(p_token, 'utf8')), 'hex') or c.invitacion_expira < now() then
    -- LEGAL: revisado (26/10/2026, texto literal de Legal)
    raise exception 'Esta invitación ya no está disponible. Si todavía la necesitas, pídele al dueño que te envíe una nueva.' using errcode = '42501';
  end if;
  return jsonb_build_object('direccion', c.direccion, 'monto', c.monto, 'inicio', c.inicio, 'fin', c.fin, 'reglas', c.reglas,
    'email_inquilino', c.email_inquilino, 'email_dueno', (select email_cavos from public.lk_participantes where contrato_id = c.id and rol = 'dueno'),
    'es_dueno', auth.uid() is not null and public.lk_es_el_dueno(c.id, auth.uid(), null));
end $$;

revoke all on function public.lk_correos_de_parte(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.lk_es_el_dueno(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.lk_inquilino_no_dueno() from public, anon, authenticated;
