-- Paso 19 · Reputación (interruptor VITE_REPUTACION, apagado). ARCHIVO SOLAMENTE: NO se aplicó a producción
-- (proyecto sddgjnuvxzkrhhuczuly). Antes de aplicarlo hace falta el visto bueno de Legal y de Katherine (docs/reputacion.md).
-- Hoy app.lockumi.com no llama a estas funciones.
--
-- Qué hace:
--   1. Perfil público y opciones aceptadas (consentimiento por papel, con versión, fecha y texto aceptado).
--   2. Eventos negativos (dueño: reclamo indebido; inquilino: descuento del depósito) que se borran a los 10 años.
--   3. Eliminar la cuenta (decisión de Katherine, 25/10/2026, 2:11 p. m.): gratis; el perfil deja de mostrarse al instante y todo
--      se borra en un máximo de 5 días hábiles (lunes a viernes, sin los feriados de Costa Rica).
--      No hay «Dejar de mostrar»: el perfil solo desaparece al eliminar la cuenta.
-- No edita migraciones anteriores. Se aplica dentro de una transacción.

-- 1. Perfil y consentimientos --------------------------------------------------------------------------------------------
create table if not exists public.lk_reputacion_perfiles (
  usuario uuid primary key references auth.users(id) on delete cascade,
  nombre_visible text not null check (char_length(nombre_visible) between 3 and 30),
  canton text not null,                         -- nunca barrio ni dirección
  creado_en timestamptz not null default now()
);
-- LEGAL: revisar · una fila por papel y opción; no se puede retirar sin eliminar la cuenta.
create table if not exists public.lk_reputacion_consentimientos (
  usuario uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  opcion text not null check (opcion in ('perfil','destacados','nuevos','puntaje')),
  version text not null,
  texto text[] not null,
  aceptado_en timestamptz not null default now(),
  primary key (usuario, rol, opcion)
);
-- 2. Eventos que bajan un puntaje (los calcula el servidor al cerrar un alquiler; ver src/reputacion/puntaje.ts) --------
create table if not exists public.lk_reputacion_eventos (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  contrato_id uuid not null,
  tipo text not null check (tipo in ('descuento_deposito','reclamo_indebido')),
  valor numeric(3,2) not null check (valor between 0 and 5),   -- lo que vale ese alquiler (de 0 a 5)
  ocurrio_en timestamptz not null
);
alter table public.lk_reputacion_perfiles enable row level security;
alter table public.lk_reputacion_consentimientos enable row level security;
alter table public.lk_reputacion_eventos enable row level security;
-- Cada persona lee lo suyo (C.5.2 «Ver mis datos de reputación»). Lo público se sirve por funciones, no por tablas.
drop policy if exists lk_rep_perfil_propio on public.lk_reputacion_perfiles;
create policy lk_rep_perfil_propio on public.lk_reputacion_perfiles for select using (usuario = auth.uid());
drop policy if exists lk_rep_consent_propio on public.lk_reputacion_consentimientos;
create policy lk_rep_consent_propio on public.lk_reputacion_consentimientos for select using (usuario = auth.uid());
drop policy if exists lk_rep_eventos_propios on public.lk_reputacion_eventos;
create policy lk_rep_eventos_propios on public.lk_reputacion_eventos for select using (usuario = auth.uid());

-- 3. Eliminar la cuenta en un máximo de 5 días hábiles -------------------------------------------------------------------
create table if not exists public.lk_solicitudes_borrado (
  usuario uuid primary key,                     -- sin FK: la fila queda como constancia (sin datos personales) después del borrado
  pedido_en timestamptz not null default now(),
  fecha_limite timestamptz not null,
  hecho_en timestamptz
);
alter table public.lk_solicitudes_borrado enable row level security;
drop policy if exists lk_borrado_propio on public.lk_solicitudes_borrado;
create policy lk_borrado_propio on public.lk_solicitudes_borrado for select using (usuario = auth.uid());

-- Domingo de Pascua (Meeus/Jones/Butcher), igual que src/reputacion/borrado.ts.
create or replace function public.lk_pascua(y int) returns date language plpgsql immutable as $$
declare a int := y % 19; b int := y / 100; c int := y % 100; d int := b / 4; e int := b % 4; f int := (b + 8) / 25; g int := (b - f + 1) / 3;
  h int; i int; k int; l int; m int;
begin
  h := (19 * a + b - d - g + 15) % 30; i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  return make_date(y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end $$;
-- Feriados de Costa Rica (Código de Trabajo, art. 148; calendario MTSS 2026). Incluye los de pago no obligatorio.
create or replace function public.lk_es_feriado_cr(d date) returns boolean language sql immutable as $$
  select to_char(d, 'MM-DD') in ('01-01','04-11','05-01','07-25','08-02','08-15','08-31','09-15','12-01','12-25')
      or d in (public.lk_pascua(extract(year from d)::int) - 3, public.lk_pascua(extract(year from d)::int) - 2)
$$;
-- Final del n.º día hábil después del día del pedido, en hora de Costa Rica.
create or replace function public.lk_fecha_limite_borrado(p_pedido timestamptz, p_dias int default 5) returns timestamptz language plpgsql immutable as $$
declare d date := (p_pedido at time zone 'America/Costa_Rica')::date; n int := 0;
begin
  while n < p_dias loop
    d := d + 1;
    if extract(isodow from d) < 6 and not public.lk_es_feriado_cr(d) then n := n + 1; end if;
  end loop;
  return ((d + 1)::timestamp at time zone 'America/Costa_Rica') - interval '1 millisecond';
end $$;

-- La persona pide eliminar su cuenta (gratis). El perfil deja de mostrarse al instante: se borran ya el perfil y los consentimientos.
create or replace function public.lk_pedir_borrado_cuenta() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); lim timestamptz;
begin
  if u is null then raise exception 'Entra a tu cuenta para eliminarla.' using errcode = '28000'; end if;
  insert into public.lk_solicitudes_borrado(usuario, fecha_limite) values (u, public.lk_fecha_limite_borrado(now()))
  on conflict (usuario) do nothing;                         -- un segundo pedido no corre el plazo
  delete from public.lk_reputacion_consentimientos where usuario = u;
  delete from public.lk_reputacion_perfiles where usuario = u;
  select fecha_limite into lim from public.lk_solicitudes_borrado where usuario = u;
  return lim;
end $$;
revoke all on function public.lk_pedir_borrado_cuenta() from public;
grant execute on function public.lk_pedir_borrado_cuenta() to authenticated;

-- Tarea programada (cada hora): termina los borrados pedidos y borra lo negativo de más de 10 años.
-- Corre mucho antes del límite: el plazo de 5 días hábiles es el máximo, no una espera.
create or replace function public.lk_borrar_cuentas_pedidas() returns int
language plpgsql security definer set search_path = public as $$
declare s record; n int := 0;
begin
  for s in select usuario from public.lk_solicitudes_borrado where hecho_en is null for update skip locked loop
    delete from public.lk_reputacion_eventos where usuario = s.usuario;
    delete from public.lk_reputacion_consentimientos where usuario = s.usuario;
    delete from public.lk_reputacion_perfiles where usuario = s.usuario;
    delete from auth.users where id = s.usuario;          -- la cuenta (las tablas con FK a auth.users se borran en cascada)
    update public.lk_solicitudes_borrado set hecho_en = now() where usuario = s.usuario;
    n := n + 1;
  end loop;
  -- LEGAL: revisar · 10 años (tope legal; legal/reputacion-textos.md, sección E).
  delete from public.lk_reputacion_eventos where ocurrio_en < now() - interval '10 years';
  return n;
end $$;
revoke all on function public.lk_borrar_cuentas_pedidas() from public, anon, authenticated;

-- Programación con pg_cron si la extensión está instalada; si no, se deja escrito y hay que programarla a mano (docs/reputacion.md).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lk_borrar_cuentas_pedidas', '7 * * * *', 'select public.lk_borrar_cuentas_pedidas()');
  else
    raise notice 'pg_cron no está instalado: programar public.lk_borrar_cuentas_pedidas() cada hora (docs/reputacion.md).';
  end if;
end $$;
