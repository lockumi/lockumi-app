-- Paso 19 · Reputación (interruptor VITE_REPUTACION, apagado). ARCHIVO SOLAMENTE: NO se aplicó a producción
-- (proyecto sddgjnuvxzkrhhuczuly). Antes de aplicarlo hace falta el visto bueno de Legal y de Katherine (docs/reputacion.md).
-- Hoy app.lockumi.com no llama a estas funciones.
--
-- Qué hace:
--   1. Perfil público (se crea con la cuenta) y la aceptación de REP-01 + REP-01b, en una pantalla aparte antes de crear la cuenta,
--      con versión, fecha y hora y el texto aceptado (Ley 8968; legal/reputacion-textos-para-producto.md, regla 5). Vitrinas opcionales.
--   1b. Revisiones pedidas (REP-11): acuse con fecha y hora, «En revisión» y respuesta en 5 días hábiles; nota de hasta 300 caracteres.
--   2. Eventos negativos (dueño: reclamo indebido; inquilino: descuento del depósito) que se borran a los 10 años.
--   5. Con la reputación encendida, una cuenta sin REP-01 y sin alquileres no entra a un alquiler hasta aceptar REP-01.
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
-- REP-01 (y REP-01b, mayoría de edad): una fila por cuenta. No se puede retirar sin eliminar la cuenta.
create table if not exists public.lk_reputacion_aceptaciones (
  usuario uuid primary key references auth.users(id) on delete cascade,
  version text not null,                        -- p. ej. 'reputacion-1.0-demo · 25/10/2026 2:24 p. m.'
  texto text[] not null,                        -- el texto exacto que vio y aceptó
  aceptado_en timestamptz not null default now() -- fecha y hora
);
-- Vitrinas (REP-06, opcionales): una fila por papel y opción. LEGAL: revisado (25/10)
create table if not exists public.lk_reputacion_consentimientos (
  usuario uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  opcion text not null check (opcion in ('destacados','nuevos')),
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
-- REP-11: revisiones pedidas. Mientras no se resuelven, ese alquiler no cuenta y el puntaje público dice «En revisión».
create table if not exists public.lk_reputacion_revisiones (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  contrato_id uuid not null,
  texto text not null check (char_length(btrim(texto)) > 0),
  nota text check (nota is null or char_length(nota) <= 300),   -- derecho de respuesta
  pedida_en timestamptz not null default now(),
  limite timestamptz not null,                                  -- 5 días hábiles (lk_fecha_limite_borrado)
  resuelta_en timestamptz
);
alter table public.lk_reputacion_aceptaciones enable row level security;
alter table public.lk_reputacion_revisiones enable row level security;
drop policy if exists lk_rep_acept_propia on public.lk_reputacion_aceptaciones;
create policy lk_rep_acept_propia on public.lk_reputacion_aceptaciones for select using (usuario = auth.uid());
drop policy if exists lk_rep_rev_propias on public.lk_reputacion_revisiones;
create policy lk_rep_rev_propias on public.lk_reputacion_revisiones for select using (usuario = auth.uid());
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
  pedido_en timestamptz not null default now(), -- fecha y hora del pedido (definitivo: no hay forma de deshacerlo)
  alquiler_abierto boolean not null default false, -- tenía un alquiler abierto al pedirlo (REP-09, respuesta final de Legal)
  cierre_en timestamptz,                         -- con alquiler abierto: cuándo se cerró el último; desde ahí corren los 5 días hábiles
  fecha_limite timestamptz,                      -- null mientras espera el cierre del alquiler abierto
  hecho_en timestamptz,
  con_perfil boolean not null default false      -- tenía perfil de reputación (REP-01) al pedirlo: sus alquileres pasados siguen contando
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

-- Alquiler abierto (REP-09, respuesta final de Legal): depósito guardado, plazo para reclamar o mediación en curso
-- (igual que ESTADOS_ABIERTOS en src/reputacion/borrado.ts).
create or replace function public.lk_tiene_alquiler_abierto(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_participantes p join public.lk_contratos c on c.id = p.contrato_id
    where p.usuario = p_usuario and c.estado in ('fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion'))
$$;
revoke all on function public.lk_tiene_alquiler_abierto(uuid) from public, anon, authenticated;

-- La persona pide eliminar su cuenta (gratis y DEFINITIVO: no hay función para deshacerlo). El perfil deja de mostrarse al instante:
-- se borran ya el perfil y los consentimientos. Sin alquiler abierto, la fecha límite es de 5 días hábiles desde el pedido; con uno,
-- queda en null y la tarea la fija cuando se cierra el último (5 días hábiles desde el cierre). Devuelve la fecha límite (o null).
-- ¿Se muestra el perfil? Nunca si la persona pidió eliminar su cuenta (aunque falte cerrar un alquiler). Toda consulta pública del
-- perfil (vitrina, enlace público) tiene que pasar por aquí.
create or replace function public.lk_perfil_visible(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_reputacion_perfiles where usuario = p_usuario)
     and not exists (select 1 from public.lk_solicitudes_borrado where usuario = p_usuario)
$$;
revoke all on function public.lk_perfil_visible(uuid) from public;
grant execute on function public.lk_perfil_visible(uuid) to anon, authenticated;

create or replace function public.lk_pedir_borrado_cuenta() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); lim timestamptz; abierto boolean;
begin
  if u is null then raise exception 'Entra a tu cuenta para eliminarla.' using errcode = '28000'; end if;
  abierto := public.lk_tiene_alquiler_abierto(u);
  insert into public.lk_solicitudes_borrado(usuario, alquiler_abierto, fecha_limite, con_perfil)
  values (u, abierto, case when abierto then null else public.lk_fecha_limite_borrado(now()) end,
          exists (select 1 from public.lk_reputacion_aceptaciones where usuario = u))
  on conflict (usuario) do nothing;                         -- un segundo pedido no cambia nada del primero
  -- El perfil deja de mostrarse al instante (lk_perfil_visible). Con un alquiler abierto NO se borra nada de la cuenta hasta que se
  -- cierra (Legal, revisión del PR #26, regla 6); sin alquiler abierto, se borra ya lo público y la cuenta en la tarea programada.
  if not abierto then
    delete from public.lk_reputacion_consentimientos where usuario = u;
    delete from public.lk_reputacion_aceptaciones where usuario = u;
    delete from public.lk_reputacion_perfiles where usuario = u;
  end if;
  select fecha_limite into lim from public.lk_solicitudes_borrado where usuario = u;
  return lim;
end $$;
revoke all on function public.lk_pedir_borrado_cuenta() from public;
grant execute on function public.lk_pedir_borrado_cuenta() to authenticated;

-- Tarea programada (cada hora): termina los borrados pedidos y borra lo negativo de más de 10 años.
-- Corre mucho antes del límite: el plazo de 5 días hábiles es el máximo, no una espera.
-- Con un alquiler abierto no borra nada hasta que se cierra el último (los datos solo sirven para cerrarlo). Nunca borra los contratos
-- ni sus participantes: la otra parte sigue viendo el contrato y el historial.
create or replace function public.lk_borrar_cuentas_pedidas() returns int
language plpgsql security definer set search_path = public as $$
declare s record; n int := 0; cierre timestamptz;
begin
  for s in select usuario, fecha_limite from public.lk_solicitudes_borrado where hecho_en is null for update skip locked loop
    if s.fecha_limite is null then
      if public.lk_tiene_alquiler_abierto(s.usuario) then continue; end if;
      select coalesce(max(c.actualizado_en), now()) into cierre from public.lk_participantes p join public.lk_contratos c on c.id = p.contrato_id
        where p.usuario = s.usuario and c.estado = 'cerrado';
      update public.lk_solicitudes_borrado set cierre_en = cierre, fecha_limite = public.lk_fecha_limite_borrado(cierre) where usuario = s.usuario;
    end if;
    delete from public.lk_reputacion_eventos where usuario = s.usuario;
    delete from public.lk_reputacion_consentimientos where usuario = s.usuario;
    delete from public.lk_reputacion_aceptaciones where usuario = s.usuario;
    delete from public.lk_reputacion_revisiones where usuario = s.usuario;
    delete from public.lk_reputacion_perfiles where usuario = s.usuario;
    delete from auth.users where id = s.usuario;          -- la cuenta (las tablas con FK a auth.users se borran en cascada)
    update public.lk_solicitudes_borrado set hecho_en = now() where usuario = s.usuario;
    n := n + 1;
  end loop;
  -- 10 años (regla 8 de legal/reputacion-textos-para-producto.md).
  delete from public.lk_reputacion_eventos where ocurrio_en < now() - interval '10 years';
  return n;
end $$;
revoke all on function public.lk_borrar_cuentas_pedidas() from public, anon, authenticated;

-- 4. Cuentas anteriores a la 1.10-demo y borrados pendientes (Legal, ronda del 25/10/2026) ------------------------------------
-- Una cuenta anterior (sin aceptación de REP-01) no tiene perfil. Un alquiler cuenta para la reputación solo si LAS DOS partes tienen
-- (o tenían, si pidieron eliminar su cuenta) perfil: un alquiler entre una cuenta anterior y una nueva no cuenta para ninguna.
create or replace function public.lk_tiene_perfil_reputacion(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_reputacion_aceptaciones where usuario = p_usuario)
      or exists (select 1 from public.lk_solicitudes_borrado where usuario = p_usuario and con_perfil)
$$;
create or replace function public.lk_cuenta_para_reputacion(p_contrato uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_participantes where contrato_id = p_contrato and rol = 'dueno')
     and exists (select 1 from public.lk_participantes where contrato_id = p_contrato and rol = 'inquilino')
     and not exists (select 1 from public.lk_participantes where contrato_id = p_contrato and not public.lk_tiene_perfil_reputacion(usuario))
$$;
revoke all on function public.lk_tiene_perfil_reputacion(uuid) from public, anon, authenticated;
revoke all on function public.lk_cuenta_para_reputacion(uuid) from public, anon, authenticated;
-- Ningún evento de un alquiler que no cuenta llega a guardarse (se descarta en silencio, para las dos partes).
create or replace function public.lk_rep_evento_cuenta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.lk_cuenta_para_reputacion(new.contrato_id) then return null; end if;
  return new;
end $$;
drop trigger if exists lk_rep_evento_cuenta on public.lk_reputacion_eventos;
create trigger lk_rep_evento_cuenta before insert on public.lk_reputacion_eventos for each row execute function public.lk_rep_evento_cuenta();

-- Con un pedido de borrado pendiente, la cuenta no crea ni se une a alquileres nuevos (lk_crear_contrato, lk_crear_contrato_invitando
-- y lk_aceptar_invitacion agregan participantes). Los alquileres abiertos siguen igual: sus filas ya existen.
-- LEGAL: revisado (25/10) · texto literal de Legal (d)
create or replace function public.lk_sin_alquileres_nuevos_si_borra() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.lk_solicitudes_borrado where usuario = new.usuario and hecho_en is null) then
    raise exception 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists lk_sin_alquileres_nuevos_si_borra on public.lk_participantes;
create trigger lk_sin_alquileres_nuevos_si_borra before insert on public.lk_participantes for each row execute function public.lk_sin_alquileres_nuevos_si_borra();

-- 5. Cuentas sin REP-01 y sin alquileres (Legal, respuesta a 6c71866, 25/10/2026 3:47 p. m.) ----------------------------------------
-- Las sesiones son anónimas por aparato (auth.uid()) y no hay fecha de creación de la cuenta que sirva: la regla es «sin aceptación de
-- REP-01 y sin alquileres» → no entra a un alquiler (crear ni unirse); en la app ve antes la pantalla previa de siempre. Una cuenta
-- anterior con alquileres sigue igual. Solo rige con la reputación encendida: el día del encendido se inserta UNA fila aquí
-- (así, aplicar la migración antes no cambia nada para nadie).
create table if not exists public.lk_reputacion_encendido (
  id boolean primary key default true check (id),
  encendido_en timestamptz not null default now()
);
alter table public.lk_reputacion_encendido enable row level security;
revoke all on public.lk_reputacion_encendido from anon, authenticated;
create or replace function public.lk_sin_perfil_ni_alquileres(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_reputacion_encendido)
     and not exists (select 1 from public.lk_reputacion_aceptaciones where usuario = p_usuario)
     and not exists (select 1 from public.lk_participantes where usuario = p_usuario)
$$;
revoke all on function public.lk_sin_perfil_ni_alquileres(uuid) from public, anon, authenticated;
-- LEGAL: revisar · ronda 25/10 3:47 · mensaje del servidor (texto propio; en la app se ve antes la pantalla previa de siempre)
create or replace function public.lk_sin_perfil_tras_encendido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.lk_sin_perfil_ni_alquileres(new.usuario) then
    raise exception 'Para crear o unirte a un alquiler, primero acepta tu perfil de reputación: abre Lockumi y marca las dos casillas de «Antes de crear tu cuenta: tu perfil de reputación».'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists lk_sin_perfil_tras_encendido on public.lk_participantes;
create trigger lk_sin_perfil_tras_encendido before insert on public.lk_participantes for each row execute function public.lk_sin_perfil_tras_encendido();

-- Programación con pg_cron si la extensión está instalada; si no, se deja escrito y hay que programarla a mano (docs/reputacion.md).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lk_borrar_cuentas_pedidas', '7 * * * *', 'select public.lk_borrar_cuentas_pedidas()');
  else
    raise notice 'pg_cron no está instalado: programar public.lk_borrar_cuentas_pedidas() cada hora (docs/reputacion.md).';
  end if;
end $$;
