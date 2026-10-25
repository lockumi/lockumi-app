-- Escenario C (preparación; no se aplica ni se enciende hasta el OK de Katherine y de Legal). Idempotente.
-- Cada alquiler guarda en el servidor la versión de los Términos con la que se creó (un alquiler nuevo de C nace en la 1.9-demo y
-- nunca ofrece «pasar a la 1.9-demo»; los de antes quedan con terminos_version = null y conservan la suya, 1.6-demo).
-- También queda quién aceptó los Términos y el Aviso de privacidad de esa versión y cuándo: el dueño al crear y el inquilino al unirse.

alter table public.lk_contratos add column if not exists terminos_version text;
do $$ begin
  alter table public.lk_contratos add constraint lk_contratos_terminos_version check (terminos_version ~ '^1\.[0-9]+-demo$');
exception when duplicate_object then null; end $$;
grant select (terminos_version) on public.lk_contratos to authenticated;

create table if not exists public.lk_aceptaciones_terminos (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  rol text not null check (rol in ('dueno', 'inquilino')),
  usuario uuid not null,
  version text not null check (version ~ '^1\.[0-9]+-demo$'),
  aceptado_en timestamptz not null default now(),
  primary key (contrato_id, rol)
);
alter table public.lk_aceptaciones_terminos enable row level security;
revoke all on public.lk_aceptaciones_terminos from anon, authenticated;
grant select on public.lk_aceptaciones_terminos to authenticated;
drop policy if exists lk_ver on public.lk_aceptaciones_terminos;
create policy lk_ver on public.lk_aceptaciones_terminos for select to authenticated using (public.lk_puede_ver(contrato_id));

create or replace function public.lk_exigir_version_terminos(p_version text) returns void
language plpgsql immutable set search_path = public as $$
begin
  if p_version is null or p_version !~ '^1\.[0-9]+-demo$' then
    raise exception 'Acepta los Términos y el Aviso de privacidad para seguir.' using errcode = '22023'; end if;
end $$;

-- LEGAL: revisar · el dueño acepta los Términos de la versión vigente y el Aviso de privacidad al crear el alquiler.
create or replace function public.lk_crear_contrato_con_terminos(
  p_direccion text, p_monto numeric, p_inicio date, p_fin date, p_reglas text[], p_email_inquilino text,
  p_email_cavos text, p_declaracion text, p_terminos_version text, p_direccion_stellar text default null, p_ventana_segundos int default 604800
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; v_id uuid;
begin
  perform public.lk_exigir_version_terminos(p_terminos_version);
  r := public.lk_crear_contrato_invitando(p_direccion, p_monto, p_inicio, p_fin, p_reglas, p_email_inquilino, p_email_cavos, p_declaracion, p_direccion_stellar, p_ventana_segundos);
  v_id := (r->>'id')::uuid;
  update public.lk_contratos set terminos_version = p_terminos_version where id = v_id;
  insert into public.lk_aceptaciones_terminos(contrato_id, rol, usuario, version) values (v_id, 'dueno', auth.uid(), p_terminos_version);
  perform public.lk_evento(v_id, format('El dueño aceptó los Términos %s y el Aviso de privacidad.', p_terminos_version));
  return r;
end $$;

-- LEGAL: revisar · el inquilino solo se une aceptando los Términos de la versión del alquiler y el Aviso de privacidad.
create or replace function public.lk_aceptar_invitacion_con_terminos(
  p_contrato uuid, p_token text, p_email_cavos text, p_terminos_version text, p_direccion_stellar text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v text;
begin
  perform public.lk_exigir_version_terminos(p_terminos_version);
  select terminos_version into v from public.lk_contratos where id = p_contrato;
  if v is not null and v <> p_terminos_version then
    raise exception 'Acepta los Términos % de este alquiler para unirte.', v using errcode = '22023'; end if;
  perform public.lk_aceptar_invitacion(p_contrato, p_token, p_email_cavos, p_direccion_stellar);
  insert into public.lk_aceptaciones_terminos(contrato_id, rol, usuario, version) values (p_contrato, 'inquilino', auth.uid(), p_terminos_version)
  on conflict (contrato_id, rol) do update set usuario = excluded.usuario, version = excluded.version, aceptado_en = now();
  perform public.lk_evento(p_contrato, format('El inquilino aceptó los Términos %s y el Aviso de privacidad.', p_terminos_version));
end $$;

revoke all on function public.lk_exigir_version_terminos(text) from public, anon;
revoke all on function public.lk_crear_contrato_con_terminos(text, numeric, date, date, text[], text, text, text, text, text, int) from public, anon;
grant execute on function public.lk_crear_contrato_con_terminos(text, numeric, date, date, text[], text, text, text, text, text, int) to authenticated;
revoke all on function public.lk_aceptar_invitacion_con_terminos(uuid, text, text, text, text) from public, anon;
grant execute on function public.lk_aceptar_invitacion_con_terminos(uuid, text, text, text, text) to authenticated;

-- Legal, 25/10, 2:53 a. m. (Términos 1.9-demo, 6.5.1 d): en la versión con dos personas la Regla de propuesta automática no se
-- ofrece al firmar. Ningún alquiler del servidor (todos son de dos personas) la guarda como aceptada: la función de 030000 ya no
-- escribe en lk_reglas_651 y nadie más puede (sin insert para authenticated).
-- LEGAL: revisar
create or replace function public.lk_aceptar_regla_651(p_contrato uuid, p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'La Regla de propuesta automática no se ofrece en esta versión (6.5.1 d).' using errcode = '55000';
end $$;
revoke all on function public.lk_aceptar_regla_651(uuid, text) from public, anon;
grant execute on function public.lk_aceptar_regla_651(uuid, text) to authenticated;
