-- LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide: textos de lk_decidir_mediacion.
-- No se sabe si 20261017000000_lockumi_e2e.sql ya se aplicó en el proyecto de Supabase, así que esa migración no se edita:
-- esta reemplaza solo la función (misma firma, misma lógica, mismos permisos); únicamente cambian dos textos.
-- Antes: 'Solo una persona mediadora puede decidir.' y 'La persona mediadora decidió: …'.
-- No toca nada de 20261024000000_lk_espacios.sql (rama agregar-espacio), que no redefine esta función.
create or replace function public.lk_decidir_mediacion(p_contrato uuid, p_monto_dueno numeric, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; m numeric;
begin
  if not public.lk_es_mediador() then raise exception 'Solo la persona mediadora puede registrar el acuerdo.' using errcode = '42501'; end if;
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'mediacion' then raise exception 'Este alquiler no está con mediador.' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  if p_monto_dueno < 0 or p_monto_dueno > m then raise exception 'El monto para el dueño debe estar entre 0 y lo reclamado.' using errcode = '22023'; end if;
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','mediacion','dueno',p_monto_dueno,'inquilino',c.monto - p_monto_dueno) where id = p_contrato;
  perform public.lk_evento(p_contrato, format('Acuerdo registrado: %s USDC al dueño y %s al inquilino%s', p_monto_dueno, c.monto - p_monto_dueno, coalesce(' · ' || nullif(trim(p_motivo), ''), '')));
end $$;
