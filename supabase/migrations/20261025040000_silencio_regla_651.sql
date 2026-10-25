-- Escenario C (preparación; no se aplica ni se enciende hasta el OK de Katherine y de Legal).
-- B2 · alquileres de dos personas en el servidor (Legal, 25/10, 1:24 a. m.):
-- - Silencio del dueño (5.3 d y 6.5 a): si no aprueba ni reclama en su plazo, el 100 % vuelve al inquilino. Ya lo hace
--   lk_cerrar_sin_reclamo (via 'automatico', que /api/tw paga con «devolver-automatico» o «liberar»); aquí se agrega la corrida
--   diaria lk_vencimientos para que no dependa de que alguien abra el alquiler.
-- - Silencio del inquilino (6.5 c y 6.5.1): ANTES de la mediación se aplica la Regla de propuesta automática, con las mismas
--   condiciones que reglaAplica (src/prueba/propuesta.ts, usada por src/prueba/reclamos.ts:49): la aceptó aparte al firmar
--   (lk_reglas_651), abrió al menos un aviso del reclamo dentro del plazo, pruebas completas y monto ≤ 30 % del depósito.
--   Si falta algo, pasa a la mediación sin reparto (solo se cierra con las dos aceptaciones, 20261025020000).
-- LEGAL: revisar · en el servidor el reclamo no tiene rubros: la propuesta es el monto reclamado (≤ 30 %), y «pruebas completas»
-- es acta de entrada con fotos y firmada por los dos, foto del daño y descripción (la factura o el precio de referencia no se guardan).

alter table public.lk_reclamos add column if not exists entregado_en timestamptz not null default now();  -- aviso entregado en la app
alter table public.lk_reclamos add column if not exists abierto_en timestamptz;                           -- primera apertura del inquilino

-- El inquilino abre el aviso o la pantalla del reclamo: queda la primera apertura (6.5 b).
create or replace function public.lk_abrir_aviso_reclamo(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.lk_exigir_rol(p_contrato, 'inquilino');
  if not exists (select 1 from public.lk_contratos where id = p_contrato and estado = 'reclamo') then return; end if;
  update public.lk_reclamos set abierto_en = now() where contrato_id = p_contrato and abierto_en is null;
  if found then perform public.lk_evento(p_contrato, 'El inquilino abrió el aviso del reclamo'); end if;
end $$;

-- Núcleo sin control de rol (lo usan lk_aplicar_silencio y lk_vencimientos). Devuelve 'regla_651', 'mediacion' o null.
create or replace function public.lk_silencio_inquilino(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; k public.lk_reclamos; vence timestamptz; falta text;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  select * into k from public.lk_reclamos where contrato_id = p_contrato;
  if c.estado is distinct from 'reclamo' or k.contrato_id is null or k.respuesta is not null then return null; end if;
  vence := k.entregado_en + make_interval(secs => c.ventana_segundos);
  if now() <= vence then return null; end if;
  falta := case
    when not exists (select 1 from public.lk_reglas_651 where contrato_id = p_contrato) then 'el inquilino no aceptó la regla al firmar'
    when k.abierto_en is null or k.abierto_en > vence then 'el inquilino no abrió ningún aviso del reclamo'
    when not exists (select 1 from public.lk_fotos where contrato_id = p_contrato and etapa = 'entrada')
      or (select count(*) from public.lk_firmas where contrato_id = p_contrato and etapa = 'entrada') < 2
      or not exists (select 1 from public.lk_fotos where contrato_id = p_contrato and etapa = 'reclamo')
      or char_length(trim(k.motivo)) < 10 then 'faltan pruebas completas'
    when k.monto > round(c.monto * 0.30, 2) then 'el total supera el 30 % del depósito'
  end;
  if falta is null then
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','regla_651','dueno',k.monto,'inquilino',c.monto - k.monto) where id = p_contrato;
    perform public.lk_evento(p_contrato, format('Se aplicó la Regla de propuesta automática (6.5.1): %s USDC al dueño y %s al inquilino', k.monto, c.monto - k.monto));
    return 'regla_651';
  end if;
  update public.lk_contratos set estado = 'mediacion' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El inquilino no respondió a tiempo y no se aplica la Regla 6.5.1 (%s). Pasa a la Mediación Lockumi (demo)', falta));
  return 'mediacion';
end $$;

-- Lo llama la app de cualquiera de los dos al abrir el alquiler (como lk_cerrar_sin_reclamo).
create or replace function public.lk_aplicar_silencio(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform public.lk_exigir_rol(p_contrato);
  return public.lk_silencio_inquilino(p_contrato);
end $$;

-- Corrida diaria (cron de /api/borrados con service_role): plazos del dueño vencidos y silencio del inquilino.
create or replace function public.lk_vencimientos() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; r text; n_auto int := 0; n_regla int := 0; n_med int := 0;
begin
  for c in select * from public.lk_contratos where estado = 'ventana_reclamo' and now() > ventana_inicio + make_interval(secs => ventana_segundos) for update loop
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','automatico','dueno',0,'inquilino',c.monto) where id = c.id;
    perform public.lk_evento(c.id, format('Sin reclamos en el plazo: %s USDC vuelven al inquilino', c.monto));
    n_auto := n_auto + 1;
  end loop;
  for c in select id from public.lk_contratos where estado = 'reclamo' loop
    r := public.lk_silencio_inquilino(c.id);
    if r = 'regla_651' then n_regla := n_regla + 1; elsif r = 'mediacion' then n_med := n_med + 1; end if;
  end loop;
  return jsonb_build_object('automatico', n_auto, 'regla_651', n_regla, 'mediacion', n_med);
end $$;

revoke all on function public.lk_abrir_aviso_reclamo(uuid) from public, anon;
revoke all on function public.lk_aplicar_silencio(uuid) from public, anon;
revoke all on function public.lk_silencio_inquilino(uuid) from public, anon, authenticated;
revoke all on function public.lk_vencimientos() from public, anon, authenticated;
grant execute on function public.lk_abrir_aviso_reclamo(uuid) to authenticated;
grant execute on function public.lk_aplicar_silencio(uuid) to authenticated;
grant execute on function public.lk_vencimientos() to service_role;
