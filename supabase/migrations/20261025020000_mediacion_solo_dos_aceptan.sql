-- A2 (Legal, 25/10/2026, 1:24 a. m. CR): reemplaza en producción la lk_decidir_mediacion vieja (20261017000000 y
-- 20261024120000: la persona mediadora cerraba sola el caso) por la que solo cierra con las aceptaciones de las dos partes
-- con el mismo reparto. No depende del escenario C (la Regla 6.5.1 y su tabla quedan en la migración de C) y no cambia nada
-- visible: hoy app.lockumi.com corre en un solo aparato y no llama a estas funciones.
-- LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · la persona mediadora no decide: sin las dos aceptaciones el caso sigue abierto y el depósito retenido
-- (Términos 2.2 b y 6.8). La devolución automática del 100 % (5.3 d) y la Regla 6.5.1 no pasan por aquí.
-- Misma firma de lk_decidir_mediacion; no edita migraciones anteriores. Se aplica dentro de una transacción.

create table if not exists public.lk_aceptaciones_mediacion (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  usuario uuid not null,
  monto_dueno numeric(12,2) not null check (monto_dueno >= 0),
  aceptado_en timestamptz not null default now(),
  primary key (contrato_id, rol)
);

-- LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · cada parte acepta un reparto; puede cambiarlo mientras el caso siga en la mediación.
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
  perform public.lk_evento(p_contrato, format('%s aceptó este reparto: %s USDC al dueño y %s al inquilino', case r when 'dueno' then 'El dueño' else 'El inquilino' end, trim_scale(p_monto_dueno), trim_scale(c.monto - p_monto_dueno)));
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
  cierre := 'dos_aceptan'; texto := format('Acuerdo registrado: %s USDC al dueño y %s al inquilino (aceptado por las dos partes)', trim_scale(p_monto_dueno), trim_scale(c.monto - p_monto_dueno));
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','mediacion','cierre',cierre,'dueno',p_monto_dueno,'inquilino',c.monto - p_monto_dueno) where id = p_contrato;
  perform public.lk_evento(p_contrato, texto || coalesce(' · ' || nullif(trim(p_motivo), ''), ''));
end $$;

alter table public.lk_aceptaciones_mediacion enable row level security;
revoke all on public.lk_aceptaciones_mediacion from anon, authenticated;
grant select on public.lk_aceptaciones_mediacion to authenticated;
drop policy if exists lk_ver on public.lk_aceptaciones_mediacion; create policy lk_ver on public.lk_aceptaciones_mediacion for select to authenticated using (public.lk_puede_ver(contrato_id));
revoke all on function public.lk_aceptar_acuerdo_mediacion(uuid, numeric) from public, anon;
grant execute on function public.lk_aceptar_acuerdo_mediacion(uuid, numeric) to authenticated;
revoke all on function public.lk_decidir_mediacion(uuid, numeric, text) from public, anon;
grant execute on function public.lk_decidir_mediacion(uuid, numeric, text) to authenticated;
