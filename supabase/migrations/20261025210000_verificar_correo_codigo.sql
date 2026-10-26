-- Paso 19 · Correo por código con el token de correo de Cavos (Legal, 25/10/2026, 9:00 p. m.). NUEVA migración: 20261025140000 ya está
-- aplicada en producción y no se toca. Idempotente (se puede correr dos veces).
-- Por qué: el token de correo de Cavos (iss https://enclave.cavos.xyz) trae aud «cavos-email», la misma para TODAS las apps de Cavos.
-- La firma y la audiencia no prueban que el token salió de un inicio de sesión en Lockumi (un token de otra app de Cavos pasaría).
-- Con ese token, el correo ya NO se registra directo en lk_correos_verificados: el servidor (api/_lib/cavos-token.ts) lo deja «por
-- confirmar» y manda el código de 6 números de Lockumi a ESE correo (api/_lib/codigo-correo.ts, acción 'verificar_correo'). Solo con
-- el código correcto se registra: lk_confirmar_correo_pendiente usa lk_usar_codigo con la acción 'verificar_correo'.
-- Mismas reglas del código (sección 7 de 20261025140000): solo la huella HMAC con pepper, 10 minutos, 5 intentos, un solo uso, reenvío
-- como mucho 1 por minuto y 5 por hora por correo. Google y Apple no cambian (siguen con su nonce ligado a la app).

-- 1. La acción nueva del código.
alter table public.lk_codigos_correo drop constraint if exists lk_codigos_correo_accion_check;
alter table public.lk_codigos_correo add constraint lk_codigos_correo_accion_check check (accion in ('eliminar', 'descargar', 'verificar_correo'));

-- 2. Correo por confirmar: la sesión mostró un token de correo de Cavos válido, pero todavía no escribió el código. Uno por sesión.
-- No cuenta como verificado para nada (lk_correo_activo y lk_correo_verificado solo leen lk_correos_verificados). La app no la lee.
create table if not exists public.lk_correos_por_confirmar (
  usuario uuid primary key references auth.users(id) on delete cascade,
  correo text not null check (correo = lower(btrim(correo))),
  creado_en timestamptz not null default clock_timestamp()
);
alter table public.lk_correos_por_confirmar enable row level security;
revoke all on public.lk_correos_por_confirmar from anon, authenticated;

-- El correo por confirmar de la sesión (vale 1 hora; después hay que volver a entrar). null = no hay.
create or replace function public.lk_correo_pendiente(p_usuario uuid) returns text
language sql stable security definer set search_path = public as $$
  select correo from public.lk_correos_por_confirmar where usuario = p_usuario and creado_en > clock_timestamp() - interval '1 hour'
$$;
revoke all on function public.lk_correo_pendiente(uuid) from public, anon, authenticated;
grant execute on function public.lk_correo_pendiente(uuid) to service_role;

-- Deja el correo «por confirmar» con la huella del token (un solo uso, la misma tabla lk_tokens_usados de lk_registrar_correo_verificado).
-- Devuelve 'nuevo' (hay que mandar el código) o 'pendiente' (ese token ya dejó ESTE correo por confirmar en ESTA sesión, p. ej. la app se
-- recargó: no se manda otro código, la persona escribe el que ya le llegó o toca «Reenviar código»). Otro uso del token: 23505 (409).
create or replace function public.lk_correo_por_confirmar(p_usuario uuid, p_correo text, p_huella text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_normalizar_correo(p_correo);
begin
  if p_usuario is null or c is null or c !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or p_huella is null or p_huella !~ '^[0-9a-f]{64}$' then
    raise exception 'Correo, sesión o huella del token inválidos: no se registra nada.' using errcode = '22023';
  end if;
  delete from public.lk_tokens_usados where usado_en < now() - interval '2 days';
  delete from public.lk_correos_por_confirmar where creado_en < clock_timestamp() - interval '1 day';
  insert into public.lk_tokens_usados(huella) values (p_huella) on conflict do nothing;
  if not found then
    if public.lk_correo_pendiente(p_usuario) is not distinct from c then return 'pendiente'; end if;
    raise exception 'Ese token ya se usó: no se registra nada.' using errcode = '23505';   -- PostgREST: 409
  end if;
  insert into public.lk_correos_por_confirmar(usuario, correo, creado_en) values (p_usuario, c, clock_timestamp())
  on conflict (usuario) do update set correo = excluded.correo, creado_en = excluded.creado_en;
  return 'nuevo';
end $$;
revoke all on function public.lk_correo_por_confirmar(uuid, text, text) from public, anon, authenticated;
grant execute on function public.lk_correo_por_confirmar(uuid, text, text) to service_role;

-- 3. A qué correo va el código de cada acción: 'verificar_correo' → el correo por confirmar; 'eliminar' y 'descargar' → el verificado
-- ACTIVO (como antes).
create or replace function public.lk_correo_para_codigo(p_usuario uuid, p_accion text) returns text
language sql stable security definer set search_path = public as $$
  select case when p_accion = 'verificar_correo' then public.lk_correo_pendiente(p_usuario) else public.lk_correo_activo(p_usuario) end
$$;
revoke all on function public.lk_correo_para_codigo(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_correo_para_codigo(uuid, text) to service_role;

-- lk_codigo_nuevo y lk_codigo_intento de la sección 7, iguales salvo la acción nueva y el correo de cada acción (lk_correo_para_codigo).
create or replace function public.lk_codigo_nuevo(p_usuario uuid, p_correo text, p_accion text, p_huella text, p_sal text) returns jsonb
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke all on function public.lk_codigo_nuevo(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.lk_codigo_nuevo(uuid, text, text, text, text) to service_role;

create or replace function public.lk_codigo_intento(p_usuario uuid, p_accion text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_correo_para_codigo(p_usuario, p_accion); r public.lk_codigos_correo;
begin
  if c is null then return null; end if;
  select * into r from public.lk_codigos_correo
    where usuario = p_usuario and correo = c and accion = p_accion and usado_en is null and anulado_en is null
      and vence_en > clock_timestamp() and intentos < 5
    order by creado_en desc limit 1 for update;
  if not found then return null; end if;
  update public.lk_codigos_correo set intentos = intentos + 1 where id = r.id;
  return jsonb_build_object('id', r.id, 'huella', r.huella, 'sal', r.sal, 'correo', c);
end $$;
revoke all on function public.lk_codigo_intento(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_codigo_intento(uuid, text) to service_role;

-- 4. Con el código confirmado (lk_codigo_confirmar, hace menos de 2 minutos): usa el código (lk_usar_codigo, acción 'verificar_correo',
-- un solo uso) y SOLO entonces registra el correo como verificado (método 'email'). Sin código confirmado: 28000 y no se registra nada.
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
