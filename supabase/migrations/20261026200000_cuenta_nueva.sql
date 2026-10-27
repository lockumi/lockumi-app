-- 26/10/2026 (Katherine): cuenta nueva para quien perdió la llave de su billetera Cavos (testnet).
-- Lo llama SOLO el servidor (api/_lib/cuentaNueva.ts, acción «cuenta-nueva», con service_role), después de leer la sesión de la persona.
--  · lk_cuentas_historial: guarda las cuentas viejas (no se borra nada).
--  · lk_cuenta_generacion: número de la cuenta Cavos de la persona (1 = la de siempre). La app lo usa para escoger la cuenta al entrar.
--  · lk_cuenta_nueva: guarda la vieja en el historial, sube el número y pasa a la cuenta nueva los alquileres que todavía NO tienen
--    cuenta segura (escrow). Los que ya tienen cuenta segura los pasa el servidor uno por uno, DESPUÉS de cambiar los roles en
--    Trustless Work (lk_asignar_cuenta). Los que ya tienen depósito no se tocan.
-- Volver atrás: supabase/revert/20261026200000_cuenta_nueva_revert.sql (no se aplica en producción sin permiso de Katherine).
create table if not exists public.lk_cuentas_historial (
  id bigint generated always as identity primary key,
  usuario uuid not null,
  direccion_stellar text not null check (direccion_stellar ~ '^G[A-Z2-7]{55}$'),
  reemplazada_por text check (reemplazada_por is null or reemplazada_por ~ '^G[A-Z2-7]{55}$'),
  motivo text not null default 'llave-perdida',
  desde timestamptz not null default now(),
  unique (usuario, direccion_stellar)
);
alter table public.lk_cuentas_historial enable row level security;   -- sin políticas: solo el servidor (service_role) lo lee
create table if not exists public.lk_cuenta_generacion (
  usuario uuid primary key,
  generacion int not null default 1 check (generacion >= 1),
  actualizada_en timestamptz not null default now()
);
alter table public.lk_cuenta_generacion enable row level security;

-- La persona lee SOLO su número (sin él, 1).
create or replace function public.lk_mi_generacion() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select generacion from public.lk_cuenta_generacion where usuario = auth.uid()), 1)
$$;
revoke all on function public.lk_mi_generacion() from public, anon;
grant execute on function public.lk_mi_generacion() to authenticated;

create or replace function public.lk_cuenta_nueva(p_usuario uuid, p_direccion text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g int; n int;
begin
  if p_usuario is null or p_direccion !~ '^G[A-Z2-7]{55}$' then raise exception 'Cuenta no válida.' using errcode = '22023'; end if;
  insert into public.lk_cuentas_historial(usuario, direccion_stellar, reemplazada_por)
    select distinct p_usuario, direccion_stellar, p_direccion from public.lk_participantes
    where usuario = p_usuario and direccion_stellar is not null and direccion_stellar <> p_direccion
    on conflict (usuario, direccion_stellar) do nothing;
  insert into public.lk_cuenta_generacion(usuario, generacion) values (p_usuario, 2)
    on conflict (usuario) do update set generacion = public.lk_cuenta_generacion.generacion + 1, actualizada_en = now()
    returning generacion into g;
  update public.lk_participantes p set direccion_stellar = p_direccion
    from public.lk_contratos c
    where p.contrato_id = c.id and p.usuario = p_usuario and p.direccion_stellar is distinct from p_direccion
      and c.escrow_contract_id is null and c.liquidacion_tx is null and c.estado in ('firmas', 'pendiente_pago');
  get diagnostics n = row_count;
  return jsonb_build_object('generacion', g, 'sin_escrow', n);
end $$;
revoke all on function public.lk_cuenta_nueva(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_cuenta_nueva(uuid, text) to service_role;

-- Un alquiler con cuenta segura SIN depósito pasa a la cuenta nueva (el servidor ya cambió los roles en Trustless Work).
create or replace function public.lk_asignar_cuenta(p_contrato uuid, p_usuario uuid, p_direccion text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_direccion !~ '^G[A-Z2-7]{55}$' then return false; end if;
  update public.lk_participantes p set direccion_stellar = p_direccion
    from public.lk_contratos c
    where p.contrato_id = c.id and c.id = p_contrato and p.usuario = p_usuario
      and c.liquidacion_tx is null and c.estado in ('firmas', 'pendiente_pago');
  return found;
end $$;
revoke all on function public.lk_asignar_cuenta(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.lk_asignar_cuenta(uuid, uuid, text) to service_role;
