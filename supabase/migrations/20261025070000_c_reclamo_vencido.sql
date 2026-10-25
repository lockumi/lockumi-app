-- PR #22 · escenario C · Legal 25/10, 4:33 a. m. CR (sobre e842e2b). Aplicada en producción (proyecto sddgjnuvxzkrhhuczuly) el 25/10/2026 a las 2:13 p. m. CR.
-- Términos 6.5 a) (dos personas): la devolución automática «puede tardar hasta 24 horas después de que vence el plazo» (cron diario
-- de lk_vencimientos). En ese tiempo el caso sigue en ventana_reclamo, pero el plazo ya venció: el servidor rechaza cualquier reclamo
-- nuevo con el fin calculado por 20261025060000 (lk_inicio_plazo + lk_fin_plazo, con domingos y feriados del art. 148).
-- Solo cambia lk_reclamar; el resto de 20261025060000 queda igual.

create or replace function public.lk_reclamar(p_contrato uuid, p_monto numeric, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' then raise exception 'El plazo para reclamar ya terminó.' using errcode = '55000'; end if;
  -- Vencido el plazo, aunque el cron todavía no haya devuelto el depósito (hasta 24 h).
  if now() > public.lk_fin_plazo(public.lk_inicio_plazo(c), c.ventana_segundos) then
    -- LEGAL: revisado (25/10, 4:56 a. m., Legal) · error 1 (se ve en el formulario del reclamo si el dueño lo envía después del fin del plazo)
    raise exception 'El plazo para reclamar ya terminó y ya no puedes reclamar en la app. El depósito se le devuelve al inquilino; puede tardar hasta 24 horas. Fuera de la app, aplica la cláusula 6.5 d).' using errcode = '55000'; end if;
  -- 6.5 a): después de «Todo bien, devolver» (aprobado en la cadena) el dueño ya no puede reclamar en la app.
  -- LEGAL: revisado (25/10, 4:56 a. m., Legal) · error 2
  if exists (select 1 from public.lk_eventos where contrato_id = p_contrato and texto = 'El dueño aprobó en la cadena devolver el depósito completo') then
    raise exception 'Ya aprobaste la devolución completa y ya no puedes reclamar en la app. Fuera de la app, aplica la cláusula 6.5 d).' using errcode = '55000'; end if;
  if p_monto <= 0 or p_monto > c.monto then raise exception 'El monto tiene que ser mayor que cero y no más que el depósito.' using errcode = '22023'; end if;
  if not exists (select 1 from public.lk_fotos where contrato_id = p_contrato and etapa = 'reclamo') then
    raise exception 'Agrega al menos una foto del daño.' using errcode = '22023'; end if;
  insert into public.lk_reclamos(contrato_id, monto, motivo) values (p_contrato, p_monto, trim(p_motivo));
  update public.lk_contratos set estado = 'reclamo' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El dueño reclamó %s USDC de prueba', trim_scale(p_monto)));
end $$;
