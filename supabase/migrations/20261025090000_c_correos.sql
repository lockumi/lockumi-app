-- Escenario C (PR #22) · Correos del servidor COR-C-01 a COR-C-09 (lista de Legal: legal/correos-escenario-c.md). Sin aplicar.
-- SOLO AGREGA: 3 tablas nuevas, 9 funciones nuevas (ningún nombre existía antes) y permisos sobre ellas. No cambia ni borra
-- ningún dato ni ninguna función existente. Idempotente: se puede volver a aplicar.
--
-- * lk_correos_consentimiento: la casilla «Acepto que Lockumi me envíe avisos por correo» marcada, por alquiler y por papel
--   (quién, a qué correo, cuándo y el texto exacto). Desmarcarla borra la fila. Sin fila, el servidor no envía avisos a ese papel.
--   Los correos de servicio COR-C-08 y COR-C-09 (borrado de cuenta) no dependen de la casilla.
-- * lk_correos_enviados: registro de cada envío. «clave» es única: cada correo sale una sola vez por evento (también es la clave
--   de idempotencia de Resend). Guarda el estado (enviando/enviado/fallido), el id de Resend y, en COR-C-03, la apertura.
-- * lk_correos_pendientes(contrato, ahora): qué correo toca a quién según el estado del alquiler. «ahora» es el reloj del servidor;
--   las pruebas lo adelantan (reloj de prueba) para los recordatorios de los días 1, 4 y 6 sin esperar días reales.
-- * Solo la clave de servicio (api/_lib/correos-c.ts, desde /api/correo, /api/tw y el cron de /api/borrados) lee el registro,
--   calcula los pendientes y envía. La app solo guarda o borra su propia casilla (lk_guardar_consentimiento_correo) y la lee.

create table if not exists public.lk_correos_consentimiento (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  usuario uuid not null,
  para text not null check (para ~* '^[^\s@<>"'',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  texto text not null check (char_length(texto) between 10 and 300),
  aceptado_en timestamptz not null default now(),
  primary key (contrato_id, rol)
);

create table if not exists public.lk_correos_enviados (
  id bigint generated always as identity primary key,
  clave text not null unique check (char_length(clave) between 8 and 200),
  correo text not null check (correo ~ '^COR-C-0[0-9]$'),
  contrato_id uuid references public.lk_contratos(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino','mediacion','cuenta')),
  para text not null,
  estado text not null default 'enviando' check (estado in ('enviando','enviado','fallido')),
  resend_id text,
  token_hash text unique check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  abierto_en timestamptz,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);
-- P-06 (decisión de Producto, 25/10 4:16 p. m.): plazo de 3 días hábiles de la Mediación Lockumi (demo), de lunes a viernes sin
-- feriados de ley de Costa Rica. Al vencer SIN el mismo reparto aceptado por las dos partes: queda la fecha en vencido_en, un
-- evento en el historial y los correos COR-C-06 «sin acuerdo». NO se paga nada ni se aplica ninguna regla (en C la regla 6.5.1 no
-- se ofrece): el monto reclamado sigue retenido y la mediación sigue abierta (las partes todavía pueden aceptar el mismo reparto).
create table if not exists public.lk_mediacion_plazos (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,
  desde timestamptz not null,
  vence timestamptz not null,
  vencido_en timestamptz
);

create index if not exists lk_correos_enviados_contrato on public.lk_correos_enviados(contrato_id);

-- Suma n días hábiles (lunes a viernes, sin feriados de ley; hora de Costa Rica) a la misma hora. Igual que sumarHabiles (api/_lib/plazos.ts).
create or replace function public.lk_sumar_habiles(p_t timestamptz, p_n int) returns timestamptz
language plpgsql immutable set search_path = public as $$
declare x timestamptz := p_t; k int := 0;
begin
  if p_t is null then return null; end if;
  while k < p_n loop
    x := x + interval '1 day';
    if extract(dow from public.lk_dia_cr(x)) not in (0, 6) and not public.lk_es_feriado(public.lk_dia_cr(x)) then k := k + 1; end if;
  end loop;
  return x;
end $$;

-- ───────── La app: guardar o borrar SU casilla (el papel sale de la sesión, nunca del navegador) ─────────
create or replace function public.lk_guardar_consentimiento_correo(p_contrato uuid, p_para text, p_acepta boolean, p_texto text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato);
begin
  if r not in ('dueno','inquilino') then raise exception 'Solo el dueño o el inquilino del alquiler.' using errcode = '42501'; end if;
  if not coalesce(p_acepta, false) then
    delete from public.lk_correos_consentimiento where contrato_id = p_contrato and rol = r;
    return false;
  end if;
  if p_para is null or lower(trim(p_para)) !~* '^[^\s@<>"'',;]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$' then
    raise exception 'Revisa el correo: tiene que ser como nombre@correo.com.' using errcode = '22023'; end if;
  insert into public.lk_correos_consentimiento(contrato_id, rol, usuario, para, texto) values (p_contrato, r, auth.uid(), lower(trim(p_para)), trim(p_texto))
  on conflict (contrato_id, rol) do update set usuario = excluded.usuario, para = excluded.para, texto = excluded.texto, aceptado_en = now();
  return true;
end $$;

-- ───────── Solo el servidor ─────────
-- Qué correo toca a quién. El destinatario «mediacion» viene sin correo: lo pone el servidor (CORREO_MEDIACION).
create or replace function public.lk_correos_por_estado(p_contrato uuid default null, p_ahora timestamptz default now())
returns table (clave text, correo text, contrato_id uuid, rol text, para text, datos jsonb)
language plpgsql stable security definer set search_path = public as $$
declare c record; k public.lk_reclamos; ini timestamptz; fin timestamptz; fin_inq timestamptz; d int; via text; desde timestamptz; m public.lk_mediacion_plazos; aprobado boolean; motivo text;
begin
  for c in select * from public.lk_contratos x where (p_contrato is null or x.id = p_contrato)
             and x.estado in ('ventana_reclamo','reclamo','mediacion','cerrado') loop
    select * into k from public.lk_reclamos r where r.contrato_id = c.id;
    ini := coalesce(c.ventana_inicio, case when p_ahora >= c.entregado_en + interval '2 days' then c.entregado_en + interval '2 days' end);
    fin := public.lk_fin_plazo(ini, c.ventana_segundos);
    aprobado := exists (select 1 from public.lk_eventos e where e.contrato_id = c.id and e.texto = 'El dueño aprobó en la cadena devolver el depósito completo');
    via := c.resultado->>'via';
    -- COR-C-01 · empieza el plazo del dueño (los dos)
    if c.estado = 'ventana_reclamo' and ini is not null and not aprobado then
      return query select format('COR-C-01:%s:%s', c.id, s.rol), 'COR-C-01'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'inicio', ini, 'fin', fin, 'auto', c.ventana_inicio is null) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
    -- COR-C-02 · recordatorios al dueño, días 4 y 6 (el día N empieza N-1 días después del inicio; sin reclamo ni aprobación). El día 1 es la versión del dueño de COR-C-01
    -- (legal/correos-escenario-c.md). Los días se cuentan desde el inicio del plazo (P-03). Solo el último que ya toca.
    if c.estado = 'ventana_reclamo' and ini is not null and not aprobado and p_ahora < fin then
      d := case when p_ahora >= ini + make_interval(secs => c.ventana_segundos * 5 / 7.0) then 6
                when p_ahora >= ini + make_interval(secs => c.ventana_segundos * 3 / 7.0) then 4 end;
      if d is not null then
        return query select format('COR-C-02:%s:dueno:d%s', c.id, d), 'COR-C-02'::text, c.id, s.rol, s.para,
          jsonb_build_object('dia', d, 'deposito', c.monto, 'fin', fin) from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'dueno';
      end if;
    end if;
    if k.contrato_id is not null then
      fin_inq := public.lk_fin_plazo(k.entregado_en, c.ventana_segundos);
      -- COR-C-03 · aviso del reclamo al inquilino (con enlace que registra la apertura)
      if c.estado = 'reclamo' and k.respuesta is null then
        return query select format('COR-C-03:%s:inquilino', c.id), 'COR-C-03'::text, c.id, s.rol, s.para,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'fin', fin_inq) from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'inquilino';
        -- COR-C-04 · recordatorios al inquilino, días 4 y 6 de su plazo, si todavía no respondió (solo el último que ya toca)
        d := case when p_ahora >= k.entregado_en + make_interval(secs => c.ventana_segundos * 5 / 7.0) then 6
                  when p_ahora >= k.entregado_en + make_interval(secs => c.ventana_segundos * 3 / 7.0) then 4 end;
        if d is not null and p_ahora < fin_inq then
          return query select format('COR-C-04:%s:inquilino:d%s', c.id, d), 'COR-C-04'::text, c.id, s.rol, s.para,
            jsonb_build_object('dia', d, 'deposito', c.monto, 'reclamado', k.monto, 'fin', fin_inq, 'abierto', k.abierto_en is not null)
            from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'inquilino';
        end if;
      end if;
      -- COR-C-05 · el caso pasa a la mediación (los dos y la persona mediadora)
      if c.estado = 'mediacion' then
        motivo := case when k.respuesta = 'rechazado' then 'rechazo' else 'silencio' end;
        desde := coalesce(k.respondido_en, (select max(e.creado_en) from public.lk_eventos e where e.contrato_id = c.id and e.texto like '%Pasa a la Mediación Lockumi (demo)%'), p_ahora);
        select * into m from public.lk_mediacion_plazos x where x.contrato_id = c.id;
        if m.contrato_id is not null then desde := m.desde; end if;
        return query select format('COR-C-05:%s:%s', c.id, s.rol), 'COR-C-05'::text, c.id, s.rol, s.para,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'motivo', motivo, 'desde', desde, 'vence', coalesce(m.vence, public.lk_sumar_habiles(desde, 3))) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
        return query select format('COR-C-05:%s:mediacion', c.id), 'COR-C-05'::text, c.id, 'mediacion'::text, null::text,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'motivo', motivo, 'desde', desde, 'vence', coalesce(m.vence, public.lk_sumar_habiles(desde, 3)));
        -- COR-C-05 «recordatorio»: queda 1 día para el fin del plazo de la mediación (P-06)
        if m.contrato_id is not null and m.vencido_en is null and p_ahora >= m.vence - interval '1 day' and p_ahora < m.vence then
          return query select format('COR-C-05:%s:%s:recordatorio', c.id, s.rol), 'COR-C-05'::text, c.id, s.rol, s.para,
            jsonb_build_object('variante', 'recordatorio', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
          return query select format('COR-C-05:%s:mediacion:recordatorio', c.id), 'COR-C-05'::text, c.id, 'mediacion'::text, null::text,
            jsonb_build_object('variante', 'recordatorio', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence);
        end if;
        -- COR-C-06 «sin acuerdo»: venció el plazo de la mediación (P-06)
        if m.vencido_en is not null then
          return query select format('COR-C-06:%s:%s:vencida', c.id, s.rol), 'COR-C-06'::text, c.id, s.rol, s.para,
            jsonb_build_object('variante', 'vencida', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
          return query select format('COR-C-06:%s:mediacion:vencida', c.id), 'COR-C-06'::text, c.id, 'mediacion'::text, null::text,
            jsonb_build_object('variante', 'vencida', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence);
        end if;
      end if;
    end if;
    -- COR-C-06 · resultado de la mediación (los dos; Legal no prevé versión para la persona mediadora)
    if c.estado = 'cerrado' and via = 'mediacion' then
      return query select format('COR-C-06:%s:%s', c.id, s.rol), 'COR-C-06'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'dueno', (c.resultado->>'dueno')::numeric, 'inquilino', (c.resultado->>'inquilino')::numeric) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
    -- COR-C-07 · cierre sin mediación (a devuelto, b automático, c acuerdo): el depósito ya se movió en la red de prueba (los dos).
    -- El cierre de una mediación es COR-C-06 (legal/correos-escenario-c.md).
    if c.estado = 'cerrado' and via in ('devuelto','automatico','acuerdo') and coalesce(c.liquidacion_tx, '') ~ '^[0-9a-f]{64}$' then
      return query select format('COR-C-07:%s:%s', c.id, s.rol), 'COR-C-07'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'via', via, 'dueno', (c.resultado->>'dueno')::numeric, 'inquilino', (c.resultado->>'inquilino')::numeric)
        from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
  end loop;
end $$;

-- P-06 · Plazo de la mediación: lo crea la primera vez que ve el caso en mediación y lo vence (solo el servidor; el cron diario
-- y /api/correo lo llaman antes de calcular los correos). Devuelve cuántos casos vencieron en esta corrida.
create or replace function public.lk_mediacion_vencimientos(p_contrato uuid default null, p_ahora timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare c record; d timestamptz; n int := 0;
begin
  for c in select x.id from public.lk_contratos x where x.estado = 'mediacion' and (p_contrato is null or x.id = p_contrato) loop
    select coalesce(k.respondido_en, (select max(e.creado_en) from public.lk_eventos e where e.contrato_id = c.id and e.texto like '%Pasa a la Mediación Lockumi (demo)%'), p_ahora)
      into d from public.lk_reclamos k where k.contrato_id = c.id;
    insert into public.lk_mediacion_plazos(contrato_id, desde, vence) values (c.id, coalesce(d, p_ahora), public.lk_sumar_habiles(coalesce(d, p_ahora), 3))
    on conflict (contrato_id) do nothing;
    update public.lk_mediacion_plazos set vencido_en = p_ahora where contrato_id = c.id and vencido_en is null and vence <= p_ahora;
    if found then
      n := n + 1;
      -- LEGAL: revisar · evento del historial al vencer el plazo de la mediación (P-06)
      perform public.lk_evento(c.id, 'Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo) sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado sigue retenido y la mediación sigue abierta.');
    end if;
  end loop;
  return n;
end $$;

-- Lo que toca y todavía no salió (ni está saliendo): cada clave, una sola vez.
create or replace function public.lk_correos_pendientes(p_contrato uuid default null, p_ahora timestamptz default now())
returns table (clave text, correo text, contrato_id uuid, rol text, para text, datos jsonb)
language sql stable security definer set search_path = public as $$
  select p.* from public.lk_correos_por_estado(p_contrato, p_ahora) p
   where not exists (select 1 from public.lk_correos_enviados e where e.clave = p.clave
                      and (e.estado = 'enviado' or (e.estado = 'enviando' and e.creado_en >= now() - interval '15 minutes')))
   order by p.clave
$$;

-- Reserva el envío antes de llamar a Resend: true solo para el primero. Un envío fallido (o uno «enviando» de hace más de
-- 15 minutos, si el servidor se cortó) se puede volver a reservar; Resend usa la misma clave de idempotencia.
create or replace function public.lk_correo_reservar(p_clave text, p_correo text, p_contrato uuid, p_rol text, p_para text, p_token_hash text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.lk_correos_enviados(clave, correo, contrato_id, rol, para, token_hash) values (p_clave, p_correo, p_contrato, p_rol, lower(trim(p_para)), p_token_hash)
  on conflict (clave) do nothing;
  if found then return true; end if;
  update public.lk_correos_enviados set estado = 'enviando', para = lower(trim(p_para)), token_hash = coalesce(p_token_hash, token_hash), creado_en = now()
   where clave = p_clave and (estado = 'fallido' or (estado = 'enviando' and creado_en < now() - interval '15 minutes'));
  return found;
end $$;

create or replace function public.lk_correo_marcar(p_clave text, p_enviado boolean, p_resend_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.lk_correos_enviados set estado = case when p_enviado then 'enviado' else 'fallido' end, resend_id = coalesce(p_resend_id, resend_id),
         enviado_en = case when p_enviado then now() else enviado_en end
   where clave = p_clave and estado = 'enviando';
end $$;

-- COR-C-03: el inquilino abrió el aviso del reclamo desde el correo (el botón pasa por /api/correo?abrir=…). Queda la primera
-- apertura en el registro y, si todavía no la había, en lk_reclamos.abierto_en (lo mismo que lk_abrir_aviso_reclamo en la app).
create or replace function public.lk_correo_abierto(p_token_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare e public.lk_correos_enviados;
begin
  select * into e from public.lk_correos_enviados where token_hash = p_token_hash;
  if e.id is null then return null; end if;
  update public.lk_correos_enviados set abierto_en = now() where id = e.id and abierto_en is null;
  if e.correo = 'COR-C-03' and exists (select 1 from public.lk_contratos where id = e.contrato_id and estado = 'reclamo') then
    update public.lk_reclamos set abierto_en = now() where contrato_id = e.contrato_id and abierto_en is null;
    if found then perform public.lk_evento(e.contrato_id, 'El inquilino abrió el aviso del reclamo'); end if;
  end if;
  return e.contrato_id;
end $$;

-- Correos de servicio (COR-C-08 y COR-C-09): no dependen de la casilla. Una sola vez por pedido.
create or replace function public.lk_correo_cuenta_registrado(p_clave text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_correos_enviados where clave = p_clave and estado = 'enviado')
$$;

-- ───────── Permisos (solo sobre lo nuevo) ─────────
alter table public.lk_correos_consentimiento enable row level security;
alter table public.lk_correos_enviados enable row level security;
alter table public.lk_mediacion_plazos enable row level security;
revoke all on public.lk_mediacion_plazos from public, anon, authenticated;
grant select, insert, update, delete on public.lk_mediacion_plazos to service_role;
revoke all on public.lk_correos_consentimiento from public, anon, authenticated;
revoke all on public.lk_correos_enviados from public, anon, authenticated;
grant select (contrato_id, rol, para, aceptado_en) on public.lk_correos_consentimiento to authenticated;
drop policy if exists lk_mi_casilla on public.lk_correos_consentimiento;
create policy lk_mi_casilla on public.lk_correos_consentimiento for select to authenticated using (usuario = auth.uid());
grant select, insert, update, delete on public.lk_correos_consentimiento, public.lk_correos_enviados to service_role;
grant usage, select on sequence public.lk_correos_enviados_id_seq to service_role;

revoke all on function public.lk_guardar_consentimiento_correo(uuid, text, boolean, text) from public, anon;
grant execute on function public.lk_guardar_consentimiento_correo(uuid, text, boolean, text) to authenticated;
do $$ declare f text; begin
  foreach f in array array['public.lk_mediacion_vencimientos(uuid, timestamptz)', 'public.lk_correos_por_estado(uuid, timestamptz)', 'public.lk_correos_pendientes(uuid, timestamptz)', 'public.lk_correo_reservar(text, text, uuid, text, text, text)',
                           'public.lk_correo_marcar(text, boolean, text)', 'public.lk_correo_abierto(text)', 'public.lk_correo_cuenta_registrado(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
