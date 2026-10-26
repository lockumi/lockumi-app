-- PROTOTIPO · Eliminar, ocultar y «Reiniciar mi demo» (rama local eliminar-alquiler-propuesta, 26/10/2026).
-- ARCHIVO SOLAMENTE: NO se aplicó a producción. Espera el OK de Katherine (imagen) y de Legal (textos).
-- Reglas (Katherine, 25/10 11:38 p. m.: «sí» al concepto):
--   * Eliminar: solo el dueño, solo si la otra persona NO aceptó la invitación, el estado es 'firmas' y NO hay cuenta de garantía.
--     Borra el alquiler entero (las tablas hijas van en cascada). La invitación deja de funcionar.
--   * Ocultar: cualquier participante, SOLO de su propia lista (lk_ocultos); no borra nada ni cambia el alquiler para la otra parte.
--     Se puede si no hay dinero de por medio: antes del depósito (sin cuenta de garantía) o cerrado y ya liquidado.
--   * Reiniciar mi demo: aplica lo anterior a TODOS los alquileres de la sesión (auth.uid()) y deja los que tienen dinero en garantía.
--   * Nada de esto mueve fondos ni toca una cuenta de garantía en la red: solo filas de este servidor.
create table if not exists public.lk_ocultos (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  usuario uuid not null,
  oculto_en timestamptz not null default now(),
  primary key (contrato_id, usuario)
);
alter table public.lk_ocultos enable row level security;
revoke all on public.lk_ocultos from anon, authenticated;
grant select on public.lk_ocultos to authenticated;
drop policy if exists lk_ocultos_propios on public.lk_ocultos;
create policy lk_ocultos_propios on public.lk_ocultos for select to authenticated using (usuario = auth.uid());

-- ¿Hay o pudo haber dinero en garantía? Ante la duda, sí.
create or replace function public.lk_con_dinero(c public.lk_contratos) returns boolean language sql stable set search_path = public as $$
  select c.escrow_contract_id is not null and not (c.estado = 'cerrado' and c.liquidacion_tx is not null)
      or c.estado not in ('firmas', 'pendiente_pago', 'cerrado')
$$;
create or replace function public.lk_se_puede_eliminar(c public.lk_contratos) returns boolean language sql stable security definer set search_path = public as $$
  select c.estado = 'firmas' and c.escrow_contract_id is null
     and public.lk_rol(c.id) = 'dueno'
     and not exists (select 1 from public.lk_participantes p where p.contrato_id = c.id and p.rol = 'inquilino')
$$;
create or replace function public.lk_se_puede_ocultar(c public.lk_contratos) returns boolean language sql stable set search_path = public as $$
  select not public.lk_con_dinero(c)
$$;

create or replace function public.lk_eliminar_alquiler(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  perform public.lk_exigir_rol(p_contrato, 'dueno');
  select * into c from public.lk_contratos where id = p_contrato for update;
  if not public.lk_se_puede_eliminar(c) then
    raise exception 'Ya no se puede eliminar: la otra persona aceptó la invitación o ya empezó el depósito. Puedes ocultarlo de tu lista cuando no haya dinero guardado.' using errcode = '55000';
  end if;
  delete from public.lk_contratos where id = p_contrato;
end $$;

create or replace function public.lk_ocultar_alquiler(p_contrato uuid, p_ocultar boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  perform public.lk_exigir_rol(p_contrato);
  if not coalesce(p_ocultar, true) then delete from public.lk_ocultos where contrato_id = p_contrato and usuario = auth.uid(); return; end if;
  select * into c from public.lk_contratos where id = p_contrato;
  if not public.lk_se_puede_ocultar(c) then
    raise exception 'Este alquiler tiene un depósito guardado. Podrás ocultarlo cuando termine y se devuelva el depósito.' using errcode = '55000';
  end if;
  insert into public.lk_ocultos(contrato_id, usuario) values (p_contrato, auth.uid()) on conflict do nothing;
end $$;

-- Solo los alquileres de ESTA sesión (lk_participantes.usuario = auth.uid()). Devuelve {eliminados, ocultos, quedan}.
create or replace function public.lk_reiniciar_mi_demo() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; e int := 0; o int := 0; q int := 0;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  for c in select k.* from public.lk_contratos k join public.lk_participantes p on p.contrato_id = k.id
            where p.usuario = auth.uid() and not exists (select 1 from public.lk_ocultos x where x.contrato_id = k.id and x.usuario = auth.uid())
            for update of k loop
    if public.lk_se_puede_eliminar(c) then delete from public.lk_contratos where id = c.id; e := e + 1;
    elsif public.lk_se_puede_ocultar(c) then insert into public.lk_ocultos(contrato_id, usuario) values (c.id, auth.uid()) on conflict do nothing; o := o + 1;
    else q := q + 1; end if;
  end loop;
  return jsonb_build_object('eliminados', e, 'ocultos', o, 'quedan', q);
end $$;

revoke all on function public.lk_con_dinero(public.lk_contratos) from public, anon, authenticated;
revoke all on function public.lk_se_puede_eliminar(public.lk_contratos) from public, anon, authenticated;
revoke all on function public.lk_se_puede_ocultar(public.lk_contratos) from public, anon, authenticated;
revoke all on function public.lk_eliminar_alquiler(uuid) from public, anon;
revoke all on function public.lk_ocultar_alquiler(uuid, boolean) from public, anon;
revoke all on function public.lk_reiniciar_mi_demo() from public, anon;
grant execute on function public.lk_eliminar_alquiler(uuid) to authenticated;
grant execute on function public.lk_ocultar_alquiler(uuid, boolean) to authenticated;
grant execute on function public.lk_reiniciar_mi_demo() to authenticated;
