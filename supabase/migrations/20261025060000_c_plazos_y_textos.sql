-- Escenario C (PR #22; no se aplica ni se enciende hasta el OK de Katherine y de Legal). Lista de Legal (legal/revision-marcas-pr22.md):
-- 7) Plazos del servidor (Términos 6.5 a y b). El plazo del dueño empieza cuando toca «Recibí la casa» o 2 días después de la
--    entrega, lo que pase primero. Si el último día cae en domingo o en un feriado de ley de Costa Rica, termina el siguiente día
--    hábil (misma hora). Solo para plazos en días enteros: los plazos cortos de la red de prueba (VITE_VENTANA_SEGUNDOS) no se mueven
--    y empiezan al entregar, como antes. Es la misma regla que api/_lib/plazos.ts (vencimiento) y la misma lista de feriados:
--    Código de Trabajo de Costa Rica, art. 148 (reformado por la Ley 10050 del 25/10/2021),
--    http://www.pgrweb.go.cr/DOCS/NORMAS/1/NOVIGEN/L/1940-1949/1940-1944/1943/1F6D/149416.HTML: 1 ene, 11 abr, Jueves y Viernes
--    Santos, 1 may, 25 jul, 2 ago, 15 ago, 31 ago, 15 set, 1 dic y 25 dic. Calendario del MTSS 2026 sin traslados
--    (https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2026.pdf). Si una ley traslada un feriado, hay que
--    agregarlo aquí y en TRASLADOS de plazos.ts (src/servidor/__tests__/c-plazos-textos-sql.test.ts compara las dos listas).
-- 5) «Todo bien, devolver» en C (6.5 a): después de aprobar ya no se puede reclamar, y /api/tw cierra el caso con
--    lk_cerrar_aprobado y libera todo al inquilino en el mismo pedido.
-- 9) Eventos del historial con «USDC de prueba».

-- ── Feriados y fin de plazo (hora de Costa Rica: UTC-6 todo el año) ──
create or replace function public.lk_pascua(y int) returns date
language plpgsql immutable set search_path = public as $$
declare a int := y % 19; b int := y / 100; c int := y % 100; d int := b / 4; e int := b % 4; f int := (b + 8) / 25; g int := (b - f + 1) / 3;
  h int; i int; k int; l int; m int;
begin
  h := (19 * a + b - d - g + 15) % 30; i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  return make_date(y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end $$;

create or replace function public.lk_es_feriado(d date) returns boolean
language sql immutable set search_path = public as $$
  select to_char(d, 'MM-DD') in ('01-01', '04-11', '05-01', '07-25', '08-02', '08-15', '08-31', '09-15', '12-01', '12-25')
      or d in (public.lk_pascua(extract(year from d)::int) - 3, public.lk_pascua(extract(year from d)::int) - 2)
$$;

create or replace function public.lk_dia_cr(t timestamptz) returns date
language sql immutable set search_path = public as $$ select ((t at time zone 'UTC') - interval '6 hours')::date $$;

create or replace function public.lk_fin_plazo(p_inicio timestamptz, p_segundos int) returns timestamptz
language plpgsql immutable set search_path = public as $$
declare fin timestamptz := p_inicio + make_interval(secs => p_segundos);
begin
  if p_inicio is null then return null; end if;
  if p_segundos % 86400 <> 0 then return fin; end if;
  while extract(dow from public.lk_dia_cr(fin)) = 0 or public.lk_es_feriado(public.lk_dia_cr(fin)) loop fin := fin + interval '1 day'; end loop;
  return fin;
end $$;

-- ── Entrega e inicio del plazo del dueño ──
alter table public.lk_contratos add column if not exists entregado_en timestamptz;
grant select (entregado_en) on public.lk_contratos to authenticated;

-- Al pasar a ventana_reclamo (los dos confirmaron las fotos de salida: lk_firmar), queda la entrega. Con plazos en días enteros,
-- el plazo todavía no corre (ventana_inicio vacío hasta «Recibí la casa» o los 2 días).
create or replace function public.lk_al_entregar() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.estado = 'ventana_reclamo' and old.estado is distinct from 'ventana_reclamo' then
    new.entregado_en := coalesce(new.ventana_inicio, now());
    if new.ventana_segundos % 86400 = 0 then new.ventana_inicio := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists lk_al_entregar on public.lk_contratos;
create trigger lk_al_entregar before update of estado on public.lk_contratos for each row execute function public.lk_al_entregar();

/** Inicio del plazo del dueño: «Recibí la casa» o 2 días después de la entrega. */
create or replace function public.lk_inicio_plazo(c public.lk_contratos) returns timestamptz
language sql stable set search_path = public as $$ select coalesce(c.ventana_inicio, c.entregado_en + interval '2 days') $$;

create or replace function public.lk_recibi_casa(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  -- LEGAL: revisar · error (texto propio; no se ve en la app: el botón solo aparece antes de que empiece el plazo)
  if c.ventana_inicio is not null or now() >= c.entregado_en + interval '2 days' then
    raise exception 'Tu plazo para reclamar ya empezó.' using errcode = '55000'; end if;
  update public.lk_contratos set ventana_inicio = now() where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El dueño tocó «Recibí la casa». Empiezan sus %s días naturales para reclamar', c.ventana_segundos / 86400));
end $$;

-- ── Reclamo y cierres con el plazo nuevo ──
create or replace function public.lk_reclamar(p_contrato uuid, p_monto numeric, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' or now() > public.lk_fin_plazo(public.lk_inicio_plazo(c), c.ventana_segundos) then
    raise exception 'El plazo para reclamar ya terminó.' using errcode = '55000'; end if;
  -- 6.5 a): después de «Todo bien, devolver» (aprobado en la cadena) el dueño ya no puede reclamar en la app.
  -- LEGAL: revisar · error (texto propio con la frase de TEXTO_APROBADO_DOS)
  if exists (select 1 from public.lk_eventos where contrato_id = p_contrato and texto = 'El dueño aprobó en la cadena devolver el depósito completo') then
    raise exception 'Ya aprobaste la devolución completa y ya no puedes reclamar en la app.' using errcode = '55000'; end if;
  if p_monto <= 0 or p_monto > c.monto then raise exception 'El monto tiene que ser mayor que cero y no más que el depósito.' using errcode = '22023'; end if;
  if not exists (select 1 from public.lk_fotos where contrato_id = p_contrato and etapa = 'reclamo') then
    raise exception 'Agrega al menos una foto del daño.' using errcode = '22023'; end if;
  insert into public.lk_reclamos(contrato_id, monto, motivo) values (p_contrato, p_monto, trim(p_motivo));
  update public.lk_contratos set estado = 'reclamo' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El dueño reclamó %s USDC de prueba', trim_scale(p_monto)));
end $$;

create or replace function public.lk_cerrar_sin_reclamo(p_contrato uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' or public.lk_inicio_plazo(c) is null
     or now() <= public.lk_fin_plazo(public.lk_inicio_plazo(c), c.ventana_segundos) then return false; end if;
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','automatico','dueno',0,'inquilino',c.monto) where id = p_contrato;
  perform public.lk_evento(p_contrato, format('Sin reclamos en el plazo: %s USDC de prueba vuelven al inquilino, menos el 0,3 %% de comisión de Trustless Work', trim_scale(c.monto)));
  return true;
end $$;

-- «Todo bien, devolver» en C: lo llama /api/tw (service_role) justo después de anotar la aprobación del dueño en la cadena.
create or replace function public.lk_cerrar_aprobado(p_contrato uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado is distinct from 'ventana_reclamo' or exists (select 1 from public.lk_reclamos where contrato_id = p_contrato)
     or not exists (select 1 from public.lk_eventos where contrato_id = p_contrato and texto = 'El dueño aprobó en la cadena devolver el depósito completo') then return false; end if;
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','devuelto','dueno',0,'inquilino',c.monto) where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El dueño tocó «Todo bien, devolver»: %s USDC de prueba devueltos al inquilino', trim_scale(c.monto)));
  return true;
end $$;

create or replace function public.lk_silencio_inquilino(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; k public.lk_reclamos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  select * into k from public.lk_reclamos where contrato_id = p_contrato;
  if c.estado is distinct from 'reclamo' or k.contrato_id is null or k.respuesta is not null then return null; end if;
  if now() <= public.lk_fin_plazo(k.entregado_en, c.ventana_segundos) then return null; end if;
  update public.lk_contratos set estado = 'mediacion' where id = p_contrato;
  perform public.lk_evento(p_contrato, 'El inquilino no respondió a tiempo: regla no disponible en esta versión (6.5.1 d). Pasa a la Mediación Lockumi (demo)');
  return 'mediacion';
end $$;

create or replace function public.lk_vencimientos() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; n_auto int := 0; n_med int := 0;
begin
  for c in select * from public.lk_contratos where estado = 'ventana_reclamo'
    and now() > public.lk_fin_plazo(coalesce(ventana_inicio, entregado_en + interval '2 days'), ventana_segundos) for update loop
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','automatico','dueno',0,'inquilino',c.monto) where id = c.id;
    perform public.lk_evento(c.id, format('Sin reclamos en el plazo: %s USDC de prueba vuelven al inquilino, menos el 0,3 %% de comisión de Trustless Work', trim_scale(c.monto)));
    n_auto := n_auto + 1;
  end loop;
  for c in select id from public.lk_contratos where estado = 'reclamo' loop
    if public.lk_silencio_inquilino(c.id) = 'mediacion' then n_med := n_med + 1; end if;
  end loop;
  return jsonb_build_object('automatico', n_auto, 'mediacion', n_med);
end $$;

-- ── 9) Eventos con «USDC de prueba» (mismas funciones; solo cambia el texto) ──
create or replace function public.lk_registrar_pago(p_contrato uuid, p_tx text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'inquilino'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'pendiente_pago' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  if c.escrow_contract_id is null and p_tx is not null then raise exception 'Falta crear la cuenta segura del depósito.' using errcode = '55000'; end if;
  update public.lk_contratos set estado = 'fotos_entrada' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('Depósito de %s USDC de prueba pagado y guardado', trim_scale(c.monto)), p_tx);
end $$;

create or replace function public.lk_responder_reclamo(p_contrato uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'inquilino'); c public.lk_contratos; m numeric;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'reclamo' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  update public.lk_reclamos set respuesta = case when p_acepta then 'aceptado' else 'rechazado' end, respondido_en = now() where contrato_id = p_contrato;
  if p_acepta then
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','acuerdo','dueno',m,'inquilino',c.monto - m) where id = p_contrato;
    perform public.lk_evento(p_contrato, format('El inquilino aceptó el reclamo: %s USDC de prueba al dueño y %s USDC de prueba al inquilino', trim_scale(m), trim_scale(c.monto - m)));
  else
    update public.lk_contratos set estado = 'mediacion' where id = p_contrato;
    perform public.lk_evento(p_contrato, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora');
  end if;
end $$;

create or replace function public.lk_aceptar_acuerdo_mediacion(p_contrato uuid, p_monto_dueno numeric) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos; m numeric;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'mediacion' then raise exception 'Este alquiler no está en la Mediación Lockumi (demo).' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  if p_monto_dueno is null or p_monto_dueno < 0 or p_monto_dueno > m then raise exception 'El monto para el dueño debe estar entre 0 y lo reclamado.' using errcode = '22023'; end if;
  insert into public.lk_aceptaciones_mediacion(contrato_id, rol, usuario, monto_dueno) values (p_contrato, r, auth.uid(), p_monto_dueno)
  on conflict (contrato_id, rol) do update set usuario = excluded.usuario, monto_dueno = excluded.monto_dueno, aceptado_en = now();
  perform public.lk_evento(p_contrato, format('%s aceptó este reparto: %s USDC de prueba al dueño y %s USDC de prueba al inquilino', case r when 'dueno' then 'El dueño' else 'El inquilino' end, trim_scale(p_monto_dueno), trim_scale(c.monto - p_monto_dueno)));
end $$;

create or replace function public.lk_decidir_mediacion(p_contrato uuid, p_monto_dueno numeric, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; m numeric; cierre text; texto text;
begin
  if not public.lk_es_mediador() then raise exception 'Solo la persona mediadora puede registrar el acuerdo.' using errcode = '42501'; end if;
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'mediacion' then raise exception 'Este alquiler no está con mediador.' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  if p_monto_dueno < 0 or p_monto_dueno > m then raise exception 'El monto para el dueño debe estar entre 0 y lo reclamado.' using errcode = '22023'; end if;
  if (select count(*) from public.lk_aceptaciones_mediacion where contrato_id = p_contrato and monto_dueno = p_monto_dueno) <> 2 then
    raise exception 'Faltan las aceptaciones de las dos partes con este reparto. La persona mediadora no decide por las partes.' using errcode = '55000';
  end if;
  cierre := 'dos_aceptan'; texto := format('Acuerdo registrado: %s USDC de prueba al dueño y %s USDC de prueba al inquilino (aceptado por las dos partes)', trim_scale(p_monto_dueno), trim_scale(c.monto - p_monto_dueno));
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','mediacion','cierre',cierre,'dueno',p_monto_dueno,'inquilino',c.monto - p_monto_dueno) where id = p_contrato;
  perform public.lk_evento(p_contrato, texto || coalesce(' · ' || nullif(trim(p_motivo), ''), ''));
end $$;

revoke all on function public.lk_recibi_casa(uuid) from public, anon;
grant execute on function public.lk_recibi_casa(uuid) to authenticated;
revoke all on function public.lk_cerrar_aprobado(uuid) from public, anon, authenticated;
grant execute on function public.lk_cerrar_aprobado(uuid) to service_role;
revoke all on function public.lk_inicio_plazo(public.lk_contratos) from public, anon;
