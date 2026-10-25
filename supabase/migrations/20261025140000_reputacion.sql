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
-- Dos correos en el mismo aparato (Legal, 25/10/2026, 4:23 p. m.): cada fila lleva el correo de la persona y se borra POR CORREO, nunca
-- por la sesión compartida (auth.uid()). correo null = fila sin persona conocida: solo se borra con una sesión que no tiene otro correo.
create table if not exists public.lk_reputacion_perfiles (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  correo text check (correo is null or correo = lower(btrim(correo))),
  nombre_visible text not null check (char_length(nombre_visible) between 3 and 30),
  canton text not null,                         -- nunca barrio ni dirección
  creado_en timestamptz not null default now(),
  unique (usuario, correo)
);
-- REP-01 (y REP-01b, mayoría de edad): una fila por cuenta. No se puede retirar sin eliminar la cuenta.
create table if not exists public.lk_reputacion_aceptaciones (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  correo text check (correo is null or correo = lower(btrim(correo))), -- la persona: correo de Cavos normalizado (lk_aceptar_reputacion)
  version text not null,                        -- p. ej. 'reputacion-1.0-demo · 25/10/2026 2:24 p. m.'
  texto text[] not null,                        -- el texto exacto que vio y aceptó
  aceptado_en timestamptz not null default now(), -- fecha y hora
  unique (usuario, correo)                       -- una por persona en cada aparato (dos correos en un aparato: dos filas)
);
-- Vitrinas (REP-06, opcionales): una fila por papel y opción. LEGAL: revisado (25/10)
create table if not exists public.lk_reputacion_consentimientos (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  correo text check (correo is null or correo = lower(btrim(correo))),
  rol text not null check (rol in ('dueno','inquilino')),
  opcion text not null check (opcion in ('destacados','nuevos')),
  version text not null,
  texto text[] not null,
  aceptado_en timestamptz not null default now(),
  unique (usuario, correo, rol, opcion)
);
-- 2. Eventos que bajan un puntaje (los calcula el servidor al cerrar un alquiler; ver src/reputacion/puntaje.ts) --------
create table if not exists public.lk_reputacion_eventos (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  correo text check (correo is null or correo = lower(btrim(correo))),   -- si falta, se toma del email_cavos de ese alquiler
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
  correo text check (correo is null or correo = lower(btrim(correo))),   -- si falta, se toma del email_cavos de ese alquiler
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
drop policy if exists lk_rep_rev_propias on public.lk_reputacion_revisiones;
alter table public.lk_reputacion_perfiles enable row level security;
alter table public.lk_reputacion_consentimientos enable row level security;
alter table public.lk_reputacion_eventos enable row level security;
-- Cada persona lee lo suyo (C.5.2 «Ver mis datos de reputación»). Lo público se sirve por funciones, no por tablas.
-- Las políticas de lectura (por sesión Y por su correo verificado activo) se crean más abajo, después de lk_fila_de_mi_correo.
drop policy if exists lk_rep_perfil_propio on public.lk_reputacion_perfiles;
drop policy if exists lk_rep_consent_propio on public.lk_reputacion_consentimientos;
drop policy if exists lk_rep_eventos_propios on public.lk_reputacion_eventos;

-- 3. Eliminar la cuenta en un máximo de 5 días hábiles -------------------------------------------------------------------
create table if not exists public.lk_solicitudes_borrado (
  id bigint generated always as identity primary key,
  usuario uuid not null,                        -- sin FK: la fila queda como constancia (sin datos personales) después del borrado
  correo text,                                  -- la persona (correo de Cavos normalizado); se borra (null) al terminar el borrado
  pedido_en timestamptz not null default now(), -- fecha y hora del pedido (definitivo: no hay forma de deshacerlo)
  alquiler_abierto boolean not null default false, -- tenía un alquiler abierto al pedirlo (REP-09, respuesta final de Legal)
  cierre_en timestamptz,                         -- con alquiler abierto: cuándo se cerró el último; desde ahí corren los 5 días hábiles
  fecha_limite timestamptz,                      -- null mientras espera el cierre del alquiler abierto
  hecho_en timestamptz,
  con_perfil boolean not null default false      -- tenía perfil de reputación (REP-01) al pedirlo: sus alquileres pasados siguen contando
);
-- Un pedido pendiente por persona (correo) y aparato.
create unique index if not exists lk_solicitudes_borrado_pendiente on public.lk_solicitudes_borrado (usuario, correo) where hecho_en is null;
alter table public.lk_solicitudes_borrado enable row level security;
drop policy if exists lk_borrado_propio on public.lk_solicitudes_borrado;

-- La persona = el correo que Cavos ya autenticó (Legal, 25/10/2026, 4:01 p. m.) -------------------------------------------------
-- auth.uid() es una sesión anónima POR APARATO (src/servidor/repositorio.ts). La persona es su correo, normalizado (trim + minúsculas),
-- tomado SOLO de lo que la app guarda con la sesión de Cavos: lk_participantes.email_cavos (lk_crear_contrato y lk_aceptar_invitacion),
-- lk_reputacion_aceptaciones.correo (lk_aceptar_reputacion) y el correo de la sesión autenticada (auth.users.email; las anónimas no tienen).
-- Nunca un correo escrito a mano (p. ej. lk_contratos.email_inquilino, que escribe el dueño).
create or replace function public.lk_normalizar_correo(p text) returns text language sql immutable as $$ select nullif(lower(btrim(p)), '') $$;
-- Correos VERIFICADOS en el servidor (Legal, 25/10/2026, 4:23 p. m.): api/verificar-correo.ts valida el token que Cavos entregó al
-- iniciar sesión (firma con las llaves públicas del emisor, emisor, audiencia, vencimiento; docs/reputacion.md) y, solo entonces,
-- registra (sesión, correo) con la clave de servicio. La app no puede escribir ni leer esta tabla. Descargar, eliminar, aceptar REP-01
-- y lk_necesita_rep01 RECHAZAN un correo que no esté aquí para esta sesión (cierre por defecto).
create table if not exists public.lk_correos_verificados (
  usuario uuid not null references auth.users(id) on delete cascade,
  correo text not null check (correo = lower(btrim(correo))),
  metodo text not null check (metodo in ('google', 'apple', 'email')),
  verificado_en timestamptz not null default now(),
  primary key (usuario, correo)
);
alter table public.lk_correos_verificados enable row level security;
revoke all on public.lk_correos_verificados from anon, authenticated;
create or replace function public.lk_registrar_correo_verificado(p_usuario uuid, p_correo text, p_metodo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c text := public.lk_normalizar_correo(p_correo);
begin
  if p_usuario is null or c is null or c !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Correo o sesión inválidos: no se registra nada.' using errcode = '22023';   -- solo lo ve api/verificar-correo.ts
  end if;
  -- clock_timestamp(): la hora real de esta verificación (lk_correo_activo toma la última; now() sería la de la transacción).
  insert into public.lk_correos_verificados(usuario, correo, metodo, verificado_en) values (p_usuario, c, p_metodo, clock_timestamp())
  on conflict (usuario, correo) do update set metodo = excluded.metodo, verificado_en = excluded.verificado_en;
  return true;
end $$;
revoke all on function public.lk_registrar_correo_verificado(uuid, text, text) from public, anon, authenticated;
grant execute on function public.lk_registrar_correo_verificado(uuid, text, text) to service_role;
create or replace function public.lk_correo_verificado(p_usuario uuid, p_correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_correos_verificados where usuario = p_usuario and correo = public.lk_normalizar_correo(p_correo))
$$;
-- Los correos de una sesión.
create or replace function public.lk_correos_de(p_usuario uuid) returns setof text
language sql stable security definer set search_path = public, auth as $$
  select public.lk_normalizar_correo(email_cavos) from public.lk_participantes where usuario = p_usuario and public.lk_normalizar_correo(email_cavos) is not null
  union select correo from public.lk_reputacion_aceptaciones where usuario = p_usuario and correo is not null
  union select correo from public.lk_correos_verificados where usuario = p_usuario
  union select public.lk_normalizar_correo(email) from auth.users where id = p_usuario and public.lk_normalizar_correo(email) is not null
$$;
-- Todas las sesiones (aparatos) con un correo.
create or replace function public.lk_uids_de_correo(p_correo text) returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select usuario from public.lk_participantes where public.lk_normalizar_correo(email_cavos) = public.lk_normalizar_correo(p_correo)
  union select usuario from public.lk_reputacion_aceptaciones where correo = public.lk_normalizar_correo(p_correo)
  union select usuario from public.lk_correos_verificados where correo = public.lk_normalizar_correo(p_correo)
  union select id from auth.users where public.lk_normalizar_correo(email) = public.lk_normalizar_correo(p_correo)
$$;
-- La persona de esta sesión: esta sesión y todas las que tienen su correo.
create or replace function public.lk_uids_de_persona(p_usuario uuid, p_correo text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select p_usuario where p_usuario is not null union select x from public.lk_uids_de_correo(p_correo) x
$$;
-- Las sesiones de la persona que no tienen OTRO correo: solo esas se borran enteras y solo sus filas sin correo son de la persona.
create or replace function public.lk_uids_exclusivos(p_usuarios uuid[], p_correo text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select array(select x from unnest(p_usuarios) x
               where not exists (select 1 from public.lk_correos_de(x) e where e is distinct from public.lk_normalizar_correo(p_correo)))
$$;
-- ¿Esta fila es de la persona? Por su correo; sin correo, solo si la sesión no tiene otro (dos correos en un aparato: nunca la del otro).
create or replace function public.lk_de_la_persona(p_fila_usuario uuid, p_fila_correo text, p_correo text, p_exclusivos uuid[]) returns boolean
language sql immutable as $$
  select coalesce(p_fila_correo = p_correo, false) or (p_fila_correo is null and p_fila_usuario = any(p_exclusivos))
$$;
-- El correo con el que la app dice que entró la persona, solo si es el correo verificado ACTIVO de ESTA sesión (lk_correo_activo).
-- Sin correo: el activo. Si no hay ninguno verificado (o el pedido no es el activo, p. ej. el de la otra persona del aparato), se rechaza.
-- El correo verificado ACTIVO de una sesión (Legal, 25/10/2026, 4:41 p. m., límite (g)): el ÚLTIMO que api/verificar-correo.ts
-- verificó para ella, es decir, el de quien entró con Cavos por última vez en ese aparato (cada entrada vuelve a verificar y pone
-- verificado_en = now()). Con dos correos en un aparato, A y B nunca están activos a la vez: para leer lo de B hay que presentar un
-- token de Cavos válido de B. null si la sesión no tiene ninguno verificado.
create or replace function public.lk_correo_activo(p_usuario uuid) returns text
language sql stable security definer set search_path = public as $$
  select correo from public.lk_correos_verificados where usuario = p_usuario order by verificado_en desc, correo limit 1
$$;
create or replace function public.lk_correo_de_sesion(p_usuario uuid, p_correo text) returns text
language plpgsql stable security definer set search_path = public as $$
declare c text := public.lk_normalizar_correo(p_correo); a text := public.lk_correo_activo(p_usuario);
begin
  if c is null then c := a; end if;
  if c is null or c is distinct from a then
    -- LEGAL: revisado (25/10) · mensaje del servidor
    raise exception 'Ese correo no es el de tu cuenta en este aparato. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.' using errcode = '28000';
  end if;
  return c;
end $$;
revoke all on function public.lk_normalizar_correo(text) from public, anon, authenticated;
revoke all on function public.lk_correos_de(uuid) from public, anon, authenticated;
revoke all on function public.lk_uids_de_correo(text) from public, anon, authenticated;
revoke all on function public.lk_uids_de_persona(uuid, text) from public, anon, authenticated;
revoke all on function public.lk_correo_de_sesion(uuid, text) from public, anon, authenticated;
revoke all on function public.lk_correo_verificado(uuid, text) from public, anon, authenticated;
revoke all on function public.lk_uids_exclusivos(uuid[], text) from public, anon, authenticated;
revoke all on function public.lk_de_la_persona(uuid, text, text, uuid[]) from public, anon, authenticated;
revoke all on function public.lk_correo_activo(uuid) from public, anon, authenticated;

-- LECTURAS por el correo verificado de la sesión (Legal, 25/10/2026, 4:41 p. m., límite (g) de docs/reputacion.md) -------------------
-- ¿Esta fila (de esta sesión) es del correo verificado ACTIVO de la sesión? Sin correo verificado: nada (cierre por defecto).
-- Filas sin correo (anteriores): solo si la sesión no tiene otro correo (lk_uids_exclusivos); en un aparato con dos correos, ninguna.
-- Solo mira la sesión que llama (auth.uid()) y no devuelve correos: se puede dar a authenticated para usarla en las políticas.
create or replace function public.lk_fila_de_mi_correo(p_correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(a is not null and (p_correo = a or (p_correo is null and auth.uid() = any(public.lk_uids_exclusivos(array[auth.uid()], a)))), false)
  from (select public.lk_correo_activo(auth.uid()) a) s
$$;
revoke all on function public.lk_fila_de_mi_correo(text) from public, anon;
grant execute on function public.lk_fila_de_mi_correo(text) to authenticated;
create policy lk_rep_acept_propia on public.lk_reputacion_aceptaciones for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));
create policy lk_rep_rev_propias on public.lk_reputacion_revisiones for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));
create policy lk_rep_perfil_propio on public.lk_reputacion_perfiles for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));
create policy lk_rep_consent_propio on public.lk_reputacion_consentimientos for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));
create policy lk_rep_eventos_propios on public.lk_reputacion_eventos for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));
create policy lk_borrado_propio on public.lk_solicitudes_borrado for select to authenticated using (usuario = auth.uid() and public.lk_fila_de_mi_correo(correo));

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
-- La persona tiene un alquiler abierto en CUALQUIERA de sus sesiones: los de su correo (no los de OTRO correo en un aparato compartido)
-- y, por si acaso, los que no tienen correo en sus sesiones.
create or replace function public.lk_persona_tiene_alquiler_abierto(p_usuarios uuid[], p_correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_participantes p join public.lk_contratos c on c.id = p.contrato_id
    where c.estado in ('fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion')
      and (public.lk_normalizar_correo(p.email_cavos) = public.lk_normalizar_correo(p_correo)
           or (public.lk_normalizar_correo(p.email_cavos) is null and p.usuario = any(p_usuarios))))
$$;
revoke all on function public.lk_persona_tiene_alquiler_abierto(uuid[], text) from public, anon, authenticated;

-- La persona pide eliminar su cuenta (gratis y DEFINITIVO: no hay función para deshacerlo). El perfil deja de mostrarse al instante:
-- se borran ya el perfil y los consentimientos. Sin alquiler abierto, la fecha límite es de 5 días hábiles desde el pedido; con uno,
-- queda en null y la tarea la fija cuando se cierra el último (5 días hábiles desde el cierre). Devuelve la fecha límite (o null).
-- ¿Se muestra el perfil? Nunca si la persona pidió eliminar su cuenta (aunque falte cerrar un alquiler). Toda consulta pública del
-- perfil (vitrina, enlace público) tiene que pasar por aquí.
create or replace function public.lk_perfil_visible(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_reputacion_perfiles p where p.usuario = p_usuario
    and not exists (select 1 from public.lk_solicitudes_borrado s
                    where case when p.correo is not null then s.correo = p.correo   -- por la persona (también si lo pidió en otro aparato)
                               else s.usuario = p_usuario or s.correo in (select x from public.lk_correos_de(p_usuario) x) end))
$$;
revoke all on function public.lk_perfil_visible(uuid) from public;
grant execute on function public.lk_perfil_visible(uuid) to anon, authenticated;

-- p_correo: el correo con el que la persona entró con Cavos (la app manda el de la sesión, nunca uno escrito a mano; lk_correo_de_sesion).
-- Llega a TODAS las sesiones de la persona (Legal, 25/10 4:01 p. m.): una fila de pedido por sesión y, sin alquiler abierto en ninguna,
-- se borra ya lo público de todas.
-- Dos correos en un aparato: solo lo de ESE correo (Legal, 4:23 p. m.); nada de la otra persona.
create or replace function public.lk_pedir_borrado_cuenta(p_correo text default null) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); c text; us uuid[]; ex uuid[]; lim timestamptz; abierto boolean; perfil boolean;
begin
  if u is null then raise exception 'Entra a tu cuenta para eliminarla.' using errcode = '28000'; end if;
  c := public.lk_correo_de_sesion(u, p_correo);               -- solo un correo verificado contra el token de Cavos
  us := array(select x from public.lk_uids_de_persona(u, c) x);
  ex := public.lk_uids_exclusivos(us, c);
  abierto := public.lk_persona_tiene_alquiler_abierto(us, c);
  perfil := exists (select 1 from public.lk_reputacion_aceptaciones a where public.lk_de_la_persona(a.usuario, a.correo, c, ex));
  insert into public.lk_solicitudes_borrado(usuario, correo, alquiler_abierto, fecha_limite, con_perfil)
  select x, c, abierto, case when abierto then null else public.lk_fecha_limite_borrado(now()) end, perfil from unnest(us) x
  on conflict (usuario, correo) where hecho_en is null do nothing;   -- un segundo pedido no cambia nada del primero
  -- El perfil deja de mostrarse al instante (lk_perfil_visible). Con un alquiler abierto NO se borra nada de la cuenta hasta que se
  -- cierra (Legal, revisión del PR #26, regla 6); sin alquiler abierto, se borra ya lo público y la cuenta en la tarea programada.
  if not abierto then
    delete from public.lk_reputacion_consentimientos x where public.lk_de_la_persona(x.usuario, x.correo, c, ex);
    delete from public.lk_reputacion_aceptaciones x where public.lk_de_la_persona(x.usuario, x.correo, c, ex);
    delete from public.lk_reputacion_perfiles x where public.lk_de_la_persona(x.usuario, x.correo, c, ex);
  end if;
  select fecha_limite into lim from public.lk_solicitudes_borrado where usuario = u and correo = c and hecho_en is null;
  return lim;
end $$;
revoke all on function public.lk_pedir_borrado_cuenta(text) from public;
grant execute on function public.lk_pedir_borrado_cuenta(text) to authenticated;

-- Tarea programada (cada hora): termina los borrados pedidos y borra lo negativo de más de 10 años.
-- Corre mucho antes del límite: el plazo de 5 días hábiles es el máximo, no una espera.
-- Con un alquiler abierto no borra nada hasta que se cierra el último (los datos solo sirven para cerrarlo). Nunca borra los contratos
-- ni sus participantes: la otra parte sigue viendo el contrato y el historial.
create or replace function public.lk_borrar_cuentas_pedidas() returns int
language plpgsql security definer set search_path = public, auth as $$
declare s record; n int := 0; cierre timestamptz; us uuid[]; ex uuid[];
begin
  for s in select id, usuario, correo, fecha_limite from public.lk_solicitudes_borrado where hecho_en is null for update skip locked loop
    -- Ya lo hizo el pedido de otra sesión de la misma persona en esta misma vuelta.
    if not exists (select 1 from public.lk_solicitudes_borrado where id = s.id and hecho_en is null) then continue; end if;
    us := array(select x from public.lk_uids_de_persona(s.usuario, s.correo) x);
    ex := public.lk_uids_exclusivos(us, s.correo);
    if s.fecha_limite is null then
      if public.lk_persona_tiene_alquiler_abierto(us, s.correo) then continue; end if;
      select coalesce(max(c.actualizado_en), now()) into cierre from public.lk_participantes p join public.lk_contratos c on c.id = p.contrato_id
        where p.usuario = any(us) and c.estado = 'cerrado';
      update public.lk_solicitudes_borrado set cierre_en = cierre, fecha_limite = public.lk_fecha_limite_borrado(cierre)
        where (id = s.id or correo = s.correo) and hecho_en is null and fecha_limite is null;
    end if;
    -- Por CORREO (dos correos en un aparato: lo de la otra persona no se toca). Las sesiones que solo son de esta persona (ningún
    -- otro correo) se borran enteras; de las compartidas, solo las filas con este correo.
    delete from public.lk_reputacion_eventos x where public.lk_de_la_persona(x.usuario, x.correo, s.correo, ex);
    delete from public.lk_reputacion_consentimientos x where public.lk_de_la_persona(x.usuario, x.correo, s.correo, ex);
    delete from public.lk_reputacion_aceptaciones x where public.lk_de_la_persona(x.usuario, x.correo, s.correo, ex);
    delete from public.lk_reputacion_revisiones x where public.lk_de_la_persona(x.usuario, x.correo, s.correo, ex);
    delete from public.lk_reputacion_perfiles x where public.lk_de_la_persona(x.usuario, x.correo, s.correo, ex);
    delete from public.lk_correos_verificados where correo = s.correo;
    delete from auth.users where id = any(ex);            -- la cuenta (las tablas con FK a auth.users se borran en cascada)
    update public.lk_solicitudes_borrado set hecho_en = now(), correo = null   -- la constancia queda sin datos personales
      where (id = s.id or correo = s.correo) and hecho_en is null;
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
  select exists (select 1 from public.lk_reputacion_aceptaciones a
                 where a.usuario = p_usuario or a.correo in (select x from public.lk_correos_de(p_usuario) x)
                    or a.usuario in (select public.lk_uids_de_correo(x) from public.lk_correos_de(p_usuario) x))   -- aceptó en otro aparato
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
-- El correo de la persona en ese alquiler (email_cavos), para borrar y descargar por correo.
create or replace function public.lk_rep_fila_correo() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.correo is null then
    select public.lk_normalizar_correo(email_cavos) into new.correo from public.lk_participantes
      where contrato_id = new.contrato_id and usuario = new.usuario and rol = new.rol and email_cavos is not null limit 1;
  end if;
  return new;
end $$;
drop trigger if exists lk_rep_evento_correo on public.lk_reputacion_eventos;
create trigger lk_rep_evento_correo before insert on public.lk_reputacion_eventos for each row execute function public.lk_rep_fila_correo();
drop trigger if exists lk_rep_revision_correo on public.lk_reputacion_revisiones;
create trigger lk_rep_revision_correo before insert on public.lk_reputacion_revisiones for each row execute function public.lk_rep_fila_correo();
drop trigger if exists lk_rep_evento_cuenta on public.lk_reputacion_eventos;
create trigger lk_rep_evento_cuenta before insert on public.lk_reputacion_eventos for each row execute function public.lk_rep_evento_cuenta();

-- Con un pedido de borrado pendiente, la cuenta no crea ni se une a alquileres nuevos (lk_crear_contrato, lk_crear_contrato_invitando
-- y lk_aceptar_invitacion agregan participantes). Los alquileres abiertos siguen igual: sus filas ya existen.
-- LEGAL: revisado (25/10) · texto literal de Legal (d)
create or replace function public.lk_sin_alquileres_nuevos_si_borra() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Por la persona (Legal, 25/10 4:01 p. m.): también si el pedido se hizo desde otro aparato con el mismo correo de Cavos.
  -- Con correo, solo el pedido de ESE correo (dos correos en un aparato: el pedido de A no frena a B); sin correo, el de la sesión.
  if exists (select 1 from public.lk_solicitudes_borrado where hecho_en is null
             and case when public.lk_normalizar_correo(new.email_cavos) is null then usuario = new.usuario
                      else correo = public.lk_normalizar_correo(new.email_cavos) end) then
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
-- Por la persona (Legal, 25/10 4:01 p. m.): la aceptación de REP-01 cuenta si la hizo cualquier sesión con su correo; los alquileres,
-- si son con ese correo (con correo, no cuentan los de OTRO correo en un aparato compartido). Sin correo: solo esta sesión.
-- Desde las 4:23 p. m., el correo solo cuenta si está VERIFICADO para esta sesión: un email_cavos escrito a mano no usa la aceptación
-- de otra persona.
create or replace function public.lk_rep01_pendiente(p_usuario uuid, p_correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.lk_reputacion_aceptaciones a
                     where case when public.lk_normalizar_correo(p_correo) is null then a.usuario = p_usuario
                                else a.correo = public.lk_normalizar_correo(p_correo)
                                     or (a.correo is null and (a.usuario = p_usuario or a.usuario in (select public.lk_uids_de_correo(p_correo)))) end)
     and not exists (select 1 from public.lk_participantes
                     where case when public.lk_normalizar_correo(p_correo) is null then usuario = p_usuario
                                else public.lk_normalizar_correo(email_cavos) = public.lk_normalizar_correo(p_correo) end)
$$;
revoke all on function public.lk_rep01_pendiente(uuid, text) from public, anon, authenticated;
create or replace function public.lk_sin_perfil_ni_alquileres(p_usuario uuid, p_correo text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_reputacion_encendido)
     and public.lk_rep01_pendiente(p_usuario, case when public.lk_correo_verificado(p_usuario, p_correo) then p_correo end)
$$;
revoke all on function public.lk_sin_perfil_ni_alquileres(uuid, text) from public, anon, authenticated;
-- LEGAL: revisado (25/10) · texto literal de Legal (revisión de c887895)
create or replace function public.lk_sin_perfil_tras_encendido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.lk_sin_perfil_ni_alquileres(new.usuario, new.email_cavos) then
    raise exception 'Antes de crear un alquiler o unirte a uno, acepta tu perfil de reputación en la app. No tiene ningún costo.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists lk_sin_perfil_tras_encendido on public.lk_participantes;
create trigger lk_sin_perfil_tras_encendido before insert on public.lk_participantes for each row execute function public.lk_sin_perfil_tras_encendido();

-- 6. La persona por su correo: aceptar REP-01 y descargar los datos (Legal, 25/10/2026, 4:01 p. m.) -----------------------------------
-- Aceptar REP-01 en el servidor. La app la llama en modo servidor con el correo con el que la persona entró con Cavos (el mismo que manda
-- como p_email_cavos al crear o aceptar un alquiler). Sin esto, con la fila de encendido nadie nuevo podría crear un alquiler.
-- Una fila por correo y sesión; un segundo llamado no cambia la aceptación. Con un pedido de borrado pendiente de ESE correo no guarda
-- nada y devuelve false. El correo tiene que estar verificado para esta sesión (si no, se rechaza).
create or replace function public.lk_aceptar_reputacion(p_correo text, p_version text, p_texto text[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); c text := public.lk_normalizar_correo(p_correo);
begin
  -- LEGAL: revisado (25/10) · mensajes del servidor
  if u is null then raise exception 'Entra a tu cuenta para aceptar tu perfil de reputación.' using errcode = '28000'; end if;
  if c is null or c !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'No pudimos leer el correo de tu cuenta. Sal de Lockumi, vuelve a entrar con tu correo y acepta de nuevo.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_version), '') = '' or coalesce(cardinality(p_texto), 0) = 0 then
    raise exception 'No pudimos guardar tu aceptación. Vuelve a abrir Lockumi y acepta de nuevo tu perfil de reputación.' using errcode = '22023';
  end if;
  if c is distinct from public.lk_correo_activo(u) then   -- el correo verificado activo de la sesión (api/verificar-correo.ts)
    raise exception 'No pudimos leer el correo de tu cuenta. Sal de Lockumi, vuelve a entrar con tu correo y acepta de nuevo.' using errcode = '28000';
  end if;
  if exists (select 1 from public.lk_solicitudes_borrado where hecho_en is null and correo = c) then return false; end if;
  insert into public.lk_reputacion_aceptaciones(usuario, correo, version, texto) values (u, c, p_version, p_texto)
  on conflict (usuario, correo) do nothing;
  return true;
end $$;
revoke all on function public.lk_aceptar_reputacion(text, text, text[]) from public;
grant execute on function public.lk_aceptar_reputacion(text, text, text[]) to authenticated;

-- «Descargar mis datos» desde el servidor: todo lo de reputación de TODAS las sesiones de la persona (sin los identificadores internos).
-- p_rol: solo ese papel (Tus datos de reputación de un papel); null: todo (antes de eliminar la cuenta).
create or replace function public.lk_mis_datos_reputacion(p_correo text default null, p_rol text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); c text; us uuid[]; ex uuid[];
begin
  -- LEGAL: revisado (25/10) · mensaje del servidor
  if u is null then raise exception 'Entra a tu cuenta para descargar tus datos.' using errcode = '28000'; end if;
  c := public.lk_correo_de_sesion(u, p_correo);               -- solo un correo verificado contra el token de Cavos
  us := array(select x from public.lk_uids_de_persona(u, c) x);
  ex := public.lk_uids_exclusivos(us, c);                      -- dos correos en un aparato: nada de la otra persona
  return jsonb_build_object(
    'correo', c, 'cuentas', cardinality(us), 'generado_en', now(),
    'perfiles', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id') from public.lk_reputacion_perfiles x
                          where public.lk_de_la_persona(x.usuario, x.correo, c, ex)), '[]'::jsonb),
    'aceptaciones', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id') from public.lk_reputacion_aceptaciones x
                              where public.lk_de_la_persona(x.usuario, x.correo, c, ex)), '[]'::jsonb),
    'vitrinas', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id') from public.lk_reputacion_consentimientos x
                          where public.lk_de_la_persona(x.usuario, x.correo, c, ex) and (p_rol is null or x.rol = p_rol)), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id' order by x.ocurrio_en) from public.lk_reputacion_eventos x
                         where public.lk_de_la_persona(x.usuario, x.correo, c, ex) and (p_rol is null or x.rol = p_rol)), '[]'::jsonb),
    'revisiones', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id' order by x.pedida_en) from public.lk_reputacion_revisiones x
                            where public.lk_de_la_persona(x.usuario, x.correo, c, ex) and (p_rol is null or x.rol = p_rol)), '[]'::jsonb),
    'solicitudes_borrado', coalesce((select jsonb_agg(to_jsonb(x) - 'usuario' - 'id') from public.lk_solicitudes_borrado x
                                     where public.lk_de_la_persona(x.usuario, x.correo, c, ex)), '[]'::jsonb));
end $$;
revoke all on function public.lk_mis_datos_reputacion(text, text) from public;
grant execute on function public.lk_mis_datos_reputacion(text, text) to authenticated;

-- Límite 4 (ronda 25/10, 4:22 p. m.): ¿la persona todavía tiene que ver la pantalla previa de REP-01? Por su correo VERIFICADO, en
-- cualquier aparato: false si ya aceptó (en este o en otro aparato) o si ya tiene alquileres con ese correo. No depende del encendido:
-- la app la usa para no mostrar otra vez la pantalla a quien ya aceptó.
create or replace function public.lk_necesita_rep01(p_correo text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); c text;
begin
  if u is null then raise exception 'Entra a tu cuenta para aceptar tu perfil de reputación.' using errcode = '28000'; end if;
  c := public.lk_correo_de_sesion(u, p_correo);
  return public.lk_rep01_pendiente(u, c);
end $$;
revoke all on function public.lk_necesita_rep01(text) from public;
grant execute on function public.lk_necesita_rep01(text) to authenticated;

-- Programación con pg_cron si la extensión está instalada; si no, se deja escrito y hay que programarla a mano (docs/reputacion.md).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lk_borrar_cuentas_pedidas', '7 * * * *', 'select public.lk_borrar_cuentas_pedidas()');
  else
    raise notice 'pg_cron no está instalado: programar public.lk_borrar_cuentas_pedidas() cada hora (docs/reputacion.md).';
  end if;
end $$;
