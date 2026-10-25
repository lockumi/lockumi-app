-- Escenario C (aplicada en producción (proyecto sddgjnuvxzkrhhuczuly) el 25/10/2026 a las 2:13 p. m. CR, con el OK de Katherine; C sigue apagado en la app).
-- B2 · alquileres de dos personas en el servidor (Legal, 25/10, 1:24 a. m.):
-- - Silencio del dueño (5.3 d y 6.5 a): si no aprueba ni reclama en su plazo, el 100 % vuelve al inquilino. Ya lo hace
--   lk_cerrar_sin_reclamo (via 'automatico', que /api/tw paga con «devolver-automatico» o «liberar»); aquí se agrega la corrida
--   diaria lk_vencimientos para que no dependa de que alguien abra el alquiler.
-- - Silencio del inquilino (6.5 c): vencido su plazo sin respuesta, el caso pasa a la Mediación Lockumi (demo) con el motivo
--   «regla no disponible en esta versión (6.5.1 d)» (Legal, 25/10, 2:53 a. m.; antes «pruebas incompletas (6.4.1)»). Legal, 25/10, 1:50 a. m. (opción 1): en dos personas la Regla 6.5.1 no se aplica sola por
--   ahora; no hay tope ni recorte del 30 % ni pago parcial. Solo cierran el acuerdo, la mediación con las dos aceptaciones
--   (20261025020000) y la devolución del 100 % al inquilino si el dueño no reclama.

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

-- Núcleo sin control de rol (lo usan lk_aplicar_silencio y lk_vencimientos). Devuelve 'mediacion' o null. Nunca cierra el caso.
create or replace function public.lk_silencio_inquilino(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; k public.lk_reclamos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  select * into k from public.lk_reclamos where contrato_id = p_contrato;
  if c.estado is distinct from 'reclamo' or k.contrato_id is null or k.respuesta is not null then return null; end if;
  if now() <= k.entregado_en + make_interval(secs => c.ventana_segundos) then return null; end if;
  update public.lk_contratos set estado = 'mediacion' where id = p_contrato;
  perform public.lk_evento(p_contrato, 'El inquilino no respondió a tiempo: regla no disponible en esta versión (6.5.1 d). Pasa a la Mediación Lockumi (demo)');
  return 'mediacion';
end $$;

-- Lo llama la app de cualquiera de los dos al abrir el reclamo (como lk_cerrar_sin_reclamo).
create or replace function public.lk_aplicar_silencio(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform public.lk_exigir_rol(p_contrato);
  return public.lk_silencio_inquilino(p_contrato);
end $$;

-- Corrida diaria (cron de /api/borrados con service_role): plazos del dueño vencidos (100 % al inquilino) y silencio del inquilino (mediación).
create or replace function public.lk_vencimientos() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; n_auto int := 0; n_med int := 0;
begin
  for c in select * from public.lk_contratos where estado = 'ventana_reclamo' and now() > ventana_inicio + make_interval(secs => ventana_segundos) for update loop
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','automatico','dueno',0,'inquilino',c.monto) where id = c.id;
    perform public.lk_evento(c.id, format('Sin reclamos en el plazo: %s USDC vuelven al inquilino', c.monto));
    n_auto := n_auto + 1;
  end loop;
  for c in select id from public.lk_contratos where estado = 'reclamo' loop
    if public.lk_silencio_inquilino(c.id) = 'mediacion' then n_med := n_med + 1; end if;
  end loop;
  return jsonb_build_object('automatico', n_auto, 'mediacion', n_med);
end $$;

revoke all on function public.lk_abrir_aviso_reclamo(uuid) from public, anon;
revoke all on function public.lk_aplicar_silencio(uuid) from public, anon;
revoke all on function public.lk_silencio_inquilino(uuid) from public, anon, authenticated;
revoke all on function public.lk_vencimientos() from public, anon, authenticated;
grant execute on function public.lk_abrir_aviso_reclamo(uuid) to authenticated;
grant execute on function public.lk_aplicar_silencio(uuid) to authenticated;
grant execute on function public.lk_vencimientos() to service_role;
