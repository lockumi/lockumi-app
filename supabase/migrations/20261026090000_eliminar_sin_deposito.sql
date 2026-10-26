-- 26/10/2026 (Katherine): el dueño puede eliminar un alquiler de dos personas mientras el depósito NO esté pagado, aunque la otra
-- persona ya haya aceptado o ya exista la cuenta segura (sin fondos). Lo llama SOLO el servidor (api/_lib/tw.ts, acción «eliminar»,
-- con service_role) DESPUÉS de leer en Trustless Work (validateOnChain) que la cuenta segura tiene saldo 0 o que no existe.
-- Aquí se vuelve a exigir: quien pide es el dueño, estado 'firmas' o 'pendiente_pago', sin liquidación ni pago en curso.
-- Revertir: supabase/revert/20261026090000_eliminar_sin_deposito_revert.sql
create or replace function public.lk_eliminar_sin_deposito(p_contrato uuid, p_usuario uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.id is null then return false; end if;
  if not exists (select 1 from public.lk_participantes p where p.contrato_id = c.id and p.rol = 'dueno' and p.usuario = p_usuario) then return false; end if;
  if c.estado not in ('firmas', 'pendiente_pago') or c.liquidacion_tx is not null or c.pago_tx_pendiente is not null then return false; end if;
  perform public.lk_borrar_alquiler(p_contrato);
  return true;
end $$;
revoke all on function public.lk_eliminar_sin_deposito(uuid, uuid) from public, anon, authenticated;
grant execute on function public.lk_eliminar_sin_deposito(uuid, uuid) to service_role;
