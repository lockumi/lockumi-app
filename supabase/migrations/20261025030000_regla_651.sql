-- Escenario C (preparación; no se aplica ni se enciende hasta el OK de Katherine y de Legal).
-- Va después de 20261025020000_mediacion_solo_dos_aceptan.sql (master, ya aplicada en producción): esa migración trae
-- lk_aceptaciones_mediacion, lk_aceptar_acuerdo_mediacion y lk_decidir_mediacion (solo con las dos aceptaciones). Aquí queda
-- solo lo del escenario C: la aceptación por separado de la Regla de propuesta automática (6.5.1) al firmar.
-- Legal, 25/10, 1:50 a. m. (opción 1): en dos personas solo se guarda la aceptación; la regla no se aplica sola (ver 20261025040000).

create table if not exists public.lk_reglas_651 (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,
  usuario uuid not null,
  version text not null check (char_length(version) between 1 and 40),
  aceptada_en timestamptz not null default now()
);

-- LEGAL: revisar · la Regla 6.5.1 se acepta por separado, solo el inquilino y solo antes de firmar el contrato.
create or replace function public.lk_aceptar_regla_651(p_contrato uuid, p_version text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  perform public.lk_exigir_rol(p_contrato, 'inquilino');
  select * into c from public.lk_contratos where id = p_contrato;
  if c.estado <> 'firmas' then raise exception 'La Regla de propuesta automática (6.5.1) solo se acepta al firmar el contrato.' using errcode = '55000'; end if;
  insert into public.lk_reglas_651(contrato_id, usuario, version) values (p_contrato, auth.uid(), p_version)
  on conflict (contrato_id) do update set usuario = excluded.usuario, version = excluded.version, aceptada_en = now();
  perform public.lk_evento(p_contrato, 'El inquilino aceptó por separado la Regla de propuesta automática (6.5.1).');
end $$;

alter table public.lk_reglas_651 enable row level security;
revoke all on public.lk_reglas_651 from anon, authenticated;
grant select on public.lk_reglas_651 to authenticated;
drop policy if exists lk_ver on public.lk_reglas_651; create policy lk_ver on public.lk_reglas_651 for select to authenticated using (public.lk_puede_ver(contrato_id));
revoke all on function public.lk_aceptar_regla_651(uuid, text) from public, anon;
grant execute on function public.lk_aceptar_regla_651(uuid, text) to authenticated;
