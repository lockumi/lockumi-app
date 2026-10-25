-- paso16-unido · Privacidad 1.7-demo en los alquileres con otra persona (modo de dos personas). Legal, 25/10, arreglos 5 y 6.
-- PENDIENTE DE APLICAR: el SUPABASE_ACCESS_TOKEN de la caja da 401. Ver docs/prueba-completa.md («Borrados en Supabase»).
-- Idempotente. No edita migraciones anteriores (no se sabe cuáles ya están aplicadas).
--
-- A) Invitaciones (7 días):
--    * lk_crear_contrato_invitando guarda la declaración de quien invita (quién, cuándo y el texto exacto que vio).
--    * lk_registrar_correo_invitacion (solo el servidor): un solo correo de invitación por alquiler, sin recordatorios,
--      solo al correo escrito en el alquiler y solo si hay declaración.
--    * lk_borrar_invitaciones_vencidas (solo el servidor): si la persona invitada no se une en 7 días, se borra su correo.
-- B) Mediación (30 días): las fotos (bucket lk-fotos, etapa «reclamo»), las descripciones y los mensajes de la mediación se
--    borran 30 días después de cerrar el caso, salvo que una parte pida guardarlos (lk_guardar_datos_mediacion).
--    Se conservan los montos y el resultado. Los objetos de Storage los borra api/borrados.ts con la Storage API
--    (el bucket no tiene política de borrado: solo la clave de servicio puede borrar).

-- ───────── A) Invitaciones ─────────
alter table public.lk_contratos alter column email_inquilino drop not null;   -- se borra a los 7 días si no se une

create table if not exists public.lk_declaraciones_invitacion (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,
  usuario uuid not null,
  email_cavos text not null,
  texto text not null check (char_length(texto) between 20 and 600),
  declarado_en timestamptz not null default now()
);
create table if not exists public.lk_correos_invitacion (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,   -- uno por alquiler: sin recordatorios
  enviado_en timestamptz not null default now()
);

create or replace function public.lk_crear_contrato_invitando(
  p_direccion text, p_monto numeric, p_inicio date, p_fin date, p_reglas text[], p_email_inquilino text,
  p_email_cavos text, p_declaracion text, p_direccion_stellar text default null, p_ventana_segundos int default 604800
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if p_declaracion is null or char_length(trim(p_declaracion)) < 20 then
    raise exception 'Marca la declaración sobre la persona que invitas.' using errcode = '22023'; end if;
  r := public.lk_crear_contrato(p_direccion, p_monto, p_inicio, p_fin, p_reglas, p_email_inquilino, p_email_cavos, p_direccion_stellar, p_ventana_segundos);
  insert into public.lk_declaraciones_invitacion(contrato_id, usuario, email_cavos, texto)
  values ((r->>'id')::uuid, auth.uid(), lower(trim(p_email_cavos)), p_declaracion);
  return r;
end $$;

create or replace function public.lk_registrar_correo_invitacion(p_contrato uuid, p_para text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.email_inquilino is null or c.email_inquilino <> lower(trim(p_para)) then return false; end if;
  if not exists (select 1 from public.lk_declaraciones_invitacion where contrato_id = p_contrato) then return false; end if;
  if exists (select 1 from public.lk_participantes where contrato_id = p_contrato and rol = 'inquilino') then return false; end if;
  insert into public.lk_correos_invitacion(contrato_id) values (p_contrato) on conflict do nothing;
  return found;
end $$;

create or replace function public.lk_borrar_invitaciones_vencidas() returns int
language plpgsql security definer set search_path = public as $$
declare v record; n int := 0;
begin
  for v in select c.id from public.lk_contratos c
            where c.email_inquilino is not null and c.invitacion_expira < now()
              and not exists (select 1 from public.lk_participantes p where p.contrato_id = c.id and p.rol = 'inquilino')
            for update loop
    update public.lk_contratos set email_inquilino = null, invitacion_hash = null where id = v.id;
    -- LEGAL: revisar · historial (texto propio, Privacidad 1.7-demo: «Si la persona invitada no se une en 7 días, borramos su correo.»)
    perform public.lk_evento(v.id, 'La persona invitada no se unió en 7 días. Se borró su correo.');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Un link nuevo necesita el correo otra vez si ya se borró (y una declaración nueva).
create or replace function public.lk_nueva_invitacion(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if exists (select 1 from public.lk_participantes where contrato_id = p_contrato and rol = 'inquilino') then
    raise exception 'El inquilino ya aceptó la invitación.' using errcode = '55000'; end if;
  if (select email_inquilino from public.lk_contratos where id = p_contrato) is null then
    raise exception 'Borramos el correo de la persona invitada porque no se unió en 7 días. Escríbelo otra vez para crear un link nuevo.' using errcode = '55000'; end if;
  update public.lk_contratos set invitacion_hash = encode(sha256(convert_to(v_token, 'utf8')), 'hex'), invitacion_expira = now() + interval '14 days' where id = p_contrato;
  perform public.lk_evento(p_contrato, 'Se generó un link de invitación nuevo (el anterior ya no sirve)');
  return v_token;
end $$;
create or replace function public.lk_nueva_invitacion(p_contrato uuid, p_email_inquilino text, p_declaracion text) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno');
begin
  if p_declaracion is null or char_length(trim(p_declaracion)) < 20 then
    raise exception 'Marca la declaración sobre la persona que invitas.' using errcode = '22023'; end if;
  if lower(trim(p_email_inquilino)) = (select email_cavos from public.lk_participantes where contrato_id = p_contrato and rol = 'dueno') then
    raise exception 'Ese es tu correo. Escribe el de la otra persona.' using errcode = '22023'; end if;
  update public.lk_contratos set email_inquilino = lower(trim(p_email_inquilino)) where id = p_contrato;
  insert into public.lk_declaraciones_invitacion(contrato_id, usuario, email_cavos, texto)
  select p_contrato, auth.uid(), email_cavos, p_declaracion from public.lk_participantes where contrato_id = p_contrato and rol = 'dueno'
  on conflict (contrato_id) do update set usuario = excluded.usuario, texto = excluded.texto, declarado_en = now();
  delete from public.lk_correos_invitacion where contrato_id = p_contrato;   -- invitación nueva: un correo nuevo
  return public.lk_nueva_invitacion(p_contrato);
end $$;

-- ───────── B) Mediación: borrado a los 30 días ─────────
alter table public.lk_contratos add column if not exists cerrado_en timestamptz;
create or replace function public.lk_marcar_cierre() returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado = 'cerrado' and (tg_op = 'INSERT' or old.estado is distinct from 'cerrado') then new.cerrado_en := coalesce(new.cerrado_en, now()); end if;
  return new;
end $$;
drop trigger if exists lk_marcar_cierre on public.lk_contratos;
create trigger lk_marcar_cierre before insert or update of estado on public.lk_contratos for each row execute function public.lk_marcar_cierre();

create table if not exists public.lk_datos_mediacion (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,
  guardar_por text check (guardar_por in ('dueno','inquilino')),
  guardar_en timestamptz,
  borrado_en timestamptz
);

-- Casos cerrados en la mediación (con la persona mediadora o con la simulación).
create or replace function public.lk_paso_por_mediacion(p_contrato uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_contratos c where c.id = p_contrato and c.estado = 'cerrado' and c.resultado->>'via' in ('mediacion','simulacion'))
$$;

-- LEGAL: revisado (25/10, 12:05 a. m.) · historial, texto exacto de Legal
create or replace function public.lk_guardar_datos_mediacion(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); d public.lk_datos_mediacion;
begin
  if not public.lk_paso_por_mediacion(p_contrato) then raise exception 'Este alquiler no se cerró en la mediación.' using errcode = '55000'; end if;
  select * into d from public.lk_datos_mediacion where contrato_id = p_contrato for update;
  if d.borrado_en is not null then raise exception 'Los datos de la mediación ya se borraron.' using errcode = '55000'; end if;
  if d.guardar_en is not null then return; end if;
  insert into public.lk_datos_mediacion(contrato_id, guardar_por, guardar_en) values (p_contrato, r, now())
  on conflict (contrato_id) do update set guardar_por = excluded.guardar_por, guardar_en = excluded.guardar_en;
  perform public.lk_evento(p_contrato, format('%s pidió guardar los datos de la mediación para un reclamo fuera de la app.', case r when 'dueno' then 'El dueño' else 'El inquilino' end));
end $$;

-- Solo el servidor: qué casos borrar y las rutas de sus fotos en el bucket lk-fotos.
create or replace function public.lk_mediacion_por_borrar(p_dias int default 30) returns table (contrato_id uuid, rutas text[])
language sql stable security definer set search_path = public as $$
  select c.id, coalesce((select array_agg(f.ruta order by f.ruta) from public.lk_fotos f where f.contrato_id = c.id and f.etapa = 'reclamo'), '{}')
    from public.lk_contratos c left join public.lk_datos_mediacion d on d.contrato_id = c.id
   where c.estado = 'cerrado' and c.resultado->>'via' in ('mediacion','simulacion')
     and coalesce(c.cerrado_en, c.actualizado_en) <= now() - make_interval(days => p_dias)
     and d.guardar_en is null and d.borrado_en is null
$$;

-- Solo el servidor, después de borrar los objetos de Storage: borra las filas de las fotos, la descripción del reclamo y los
-- mensajes (el comentario del acuerdo en el historial). Se conservan los montos y el resultado.
create or replace function public.lk_marcar_mediacion_borrada(p_contrato uuid, p_dias int default 30) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.lk_mediacion_por_borrar(p_dias) m where m.contrato_id = p_contrato) then return false; end if;
  delete from public.lk_fotos where contrato_id = p_contrato and etapa = 'reclamo';
  update public.lk_reclamos set motivo = 'Borrado a los 30 días.' where contrato_id = p_contrato;
  update public.lk_eventos set texto = regexp_replace(texto, ' · .*$', '')
   where contrato_id = p_contrato and (texto like 'Acuerdo registrado:%' or texto like 'La persona mediadora decidió:%');
  insert into public.lk_datos_mediacion(contrato_id, borrado_en) values (p_contrato, now())
  on conflict (contrato_id) do update set borrado_en = excluded.borrado_en;
  -- LEGAL: revisado (25/10, 12:05 a. m.) · historial, texto exacto de Legal (igual que src/prueba/borrado.ts)
  perform public.lk_evento(p_contrato, 'Se borraron las fotos, las descripciones y los mensajes de la Mediación Lockumi (demo), 30 días después de cerrar el caso. Se conservan los montos y el resultado.');
  return true;
end $$;

-- ───────── Permisos ─────────
do $$ declare t text; begin
  foreach t in array array['lk_declaraciones_invitacion','lk_correos_invitacion','lk_datos_mediacion'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.lk_datos_mediacion to authenticated;
drop policy if exists lk_ver on public.lk_datos_mediacion; create policy lk_ver on public.lk_datos_mediacion for select to authenticated using (public.lk_puede_ver(contrato_id));
grant select (cerrado_en) on public.lk_contratos to authenticated;

revoke all on function public.lk_crear_contrato_invitando(text, numeric, date, date, text[], text, text, text, text, int) from public, anon;
grant execute on function public.lk_crear_contrato_invitando(text, numeric, date, date, text[], text, text, text, text, int) to authenticated;
revoke all on function public.lk_nueva_invitacion(uuid, text, text) from public, anon;
grant execute on function public.lk_nueva_invitacion(uuid, text, text) to authenticated;
revoke all on function public.lk_guardar_datos_mediacion(uuid) from public, anon;
grant execute on function public.lk_guardar_datos_mediacion(uuid) to authenticated;
revoke all on function public.lk_paso_por_mediacion(uuid) from public, anon, authenticated;   -- interna
-- Solo la clave de servicio (api/borrados.ts y api/correo.ts):
do $$ declare f text; begin
  foreach f in array array['public.lk_registrar_correo_invitacion(uuid, text)', 'public.lk_borrar_invitaciones_vencidas()',
                           'public.lk_mediacion_por_borrar(int)', 'public.lk_marcar_mediacion_borrada(uuid, int)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
