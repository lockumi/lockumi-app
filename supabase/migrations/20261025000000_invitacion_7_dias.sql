-- Paso 7 · modo de dos personas: la invitación vence en 7 días (texto aprobado por Legal, igual que el correo y la tarjeta del dueño).
-- lk_crear_contrato y lk_nueva_invitacion siguen poniendo su propio vencimiento; este disparador lo recorta a 7 días cada vez que
-- se crea o se renueva un link (cambia invitacion_hash). No toca los links que ya existen.
create or replace function public.lk_invitacion_7_dias() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.invitacion_hash is not null and (tg_op = 'INSERT' or new.invitacion_hash is distinct from old.invitacion_hash) then
    new.invitacion_expira := least(coalesce(new.invitacion_expira, now() + interval '7 days'), now() + interval '7 days');
  end if;
  return new;
end $$;

drop trigger if exists lk_invitacion_7_dias on public.lk_contratos;
create trigger lk_invitacion_7_dias before insert or update of invitacion_hash, invitacion_expira on public.lk_contratos
  for each row execute function public.lk_invitacion_7_dias();
