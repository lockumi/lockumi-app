-- Escenario C (PR #22) · Recordatorios COR-C-02 y COR-C-04 contados HACIA ATRÁS desde el vencimiento real (Legal 25/10/2026, 5:09 p. m.).
-- SOLO REEMPLAZA UNA FUNCIÓN: create or replace de public.lk_correos_por_estado (misma firma y mismos permisos de 20261025090000).
-- No crea, cambia ni borra tablas ni datos. Idempotente: se puede volver a aplicar.
--
-- Antes (20261025090000): «día 4» y «día 6» se contaban desde el inicio del plazo (ini + 3/7 y ini + 5/7). Si el fin del plazo se
-- corría por un domingo o un feriado (lk_fin_plazo), el «vence mañana» llegaba antes de tiempo. Ahora:
--   «día 6» (vence mañana):   p_ahora >= fin − ventana/7
--   «día 4» (quedan 3 días):  p_ahora >= fin − 3·ventana/7
-- COR-C-04 usa el fin del plazo del inquilino (fin_inq = lk_fin_plazo(entregado_en, ventana)); entregado_en es el momento en que
-- el dueño envió el reclamo (now() en lk_reclamar), y Legal lo acepta como inicio del plazo del inquilino (docs/correos-c.md).

create or replace function public.lk_correos_por_estado(p_contrato uuid default null, p_ahora timestamptz default now())
returns table (clave text, correo text, contrato_id uuid, rol text, para text, datos jsonb)
language plpgsql stable security definer set search_path = public as $$
declare c record; k public.lk_reclamos; ini timestamptz; fin timestamptz; fin_inq timestamptz; d int; via text; desde timestamptz; m public.lk_mediacion_plazos; aprobado boolean; motivo text;
begin
  for c in select * from public.lk_contratos x where (p_contrato is null or x.id = p_contrato)
             and x.estado in ('ventana_reclamo','reclamo','mediacion','cerrado') loop
    select * into k from public.lk_reclamos r where r.contrato_id = c.id;
    ini := coalesce(c.ventana_inicio, case when p_ahora >= c.entregado_en + interval '2 days' then c.entregado_en + interval '2 days' end);
    fin := public.lk_fin_plazo(ini, c.ventana_segundos);
    aprobado := exists (select 1 from public.lk_eventos e where e.contrato_id = c.id and e.texto = 'El dueño aprobó en la cadena devolver el depósito completo');
    via := c.resultado->>'via';
    -- COR-C-01 · empieza el plazo del dueño (los dos)
    if c.estado = 'ventana_reclamo' and ini is not null and not aprobado then
      return query select format('COR-C-01:%s:%s', c.id, s.rol), 'COR-C-01'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'inicio', ini, 'fin', fin, 'auto', c.ventana_inicio is null) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
    -- COR-C-02 · recordatorios al dueño (sin reclamo ni aprobación). Se cuentan HACIA ATRÁS desde el vencimiento real {vence} = fin
    -- (Legal 25/10, 5:09 p. m.): «día 4» = quedan 3 días (fin − 3/7 del plazo) y «día 6» = vence mañana (fin − 1/7 del plazo). Si el fin
    -- se corrió por un domingo o un feriado, los avisos se corren con él. El día 1 es la versión del dueño de COR-C-01. Solo el último que ya toca.
    if c.estado = 'ventana_reclamo' and ini is not null and not aprobado and p_ahora < fin then
      d := case when p_ahora >= fin - make_interval(secs => c.ventana_segundos * 1 / 7.0) then 6
                when p_ahora >= fin - make_interval(secs => c.ventana_segundos * 3 / 7.0) then 4 end;
      if d is not null then
        return query select format('COR-C-02:%s:dueno:d%s', c.id, d), 'COR-C-02'::text, c.id, s.rol, s.para,
          jsonb_build_object('dia', d, 'deposito', c.monto, 'fin', fin) from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'dueno';
      end if;
    end if;
    if k.contrato_id is not null then
      fin_inq := public.lk_fin_plazo(k.entregado_en, c.ventana_segundos);
      -- COR-C-03 · aviso del reclamo al inquilino (con enlace que registra la apertura)
      if c.estado = 'reclamo' and k.respuesta is null then
        return query select format('COR-C-03:%s:inquilino', c.id), 'COR-C-03'::text, c.id, s.rol, s.para,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'fin', fin_inq) from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'inquilino';
        -- COR-C-04 · recordatorios al inquilino si todavía no respondió, HACIA ATRÁS desde su vencimiento real fin_inq (Legal 25/10,
        -- 5:09 p. m.): «día 4» = quedan 3 días, «día 6» = vence mañana. Solo el último que ya toca.
        d := case when p_ahora >= fin_inq - make_interval(secs => c.ventana_segundos * 1 / 7.0) then 6
                  when p_ahora >= fin_inq - make_interval(secs => c.ventana_segundos * 3 / 7.0) then 4 end;
        if d is not null and p_ahora < fin_inq then
          return query select format('COR-C-04:%s:inquilino:d%s', c.id, d), 'COR-C-04'::text, c.id, s.rol, s.para,
            jsonb_build_object('dia', d, 'deposito', c.monto, 'reclamado', k.monto, 'fin', fin_inq, 'abierto', k.abierto_en is not null)
            from public.lk_correos_consentimiento s where s.contrato_id = c.id and s.rol = 'inquilino';
        end if;
      end if;
      -- COR-C-05 · el caso pasa a la mediación (los dos y la persona mediadora)
      if c.estado = 'mediacion' then
        motivo := case when k.respuesta = 'rechazado' then 'rechazo' else 'silencio' end;
        desde := coalesce(k.respondido_en, (select max(e.creado_en) from public.lk_eventos e where e.contrato_id = c.id and e.texto like '%Pasa a la Mediación Lockumi (demo)%'), p_ahora);
        select * into m from public.lk_mediacion_plazos x where x.contrato_id = c.id;
        if m.contrato_id is not null then desde := m.desde; end if;
        return query select format('COR-C-05:%s:%s', c.id, s.rol), 'COR-C-05'::text, c.id, s.rol, s.para,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'motivo', motivo, 'desde', desde, 'vence', coalesce(m.vence, public.lk_sumar_habiles(desde, 3))) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
        return query select format('COR-C-05:%s:mediacion', c.id), 'COR-C-05'::text, c.id, 'mediacion'::text, null::text,
          jsonb_build_object('deposito', c.monto, 'reclamado', k.monto, 'motivo', motivo, 'desde', desde, 'vence', coalesce(m.vence, public.lk_sumar_habiles(desde, 3)));
        -- COR-C-05 «recordatorio»: queda 1 día para el fin del plazo de la mediación (P-06)
        if m.contrato_id is not null and m.vencido_en is null and p_ahora >= m.vence - interval '1 day' and p_ahora < m.vence then
          return query select format('COR-C-05:%s:%s:recordatorio', c.id, s.rol), 'COR-C-05'::text, c.id, s.rol, s.para,
            jsonb_build_object('variante', 'recordatorio', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
          return query select format('COR-C-05:%s:mediacion:recordatorio', c.id), 'COR-C-05'::text, c.id, 'mediacion'::text, null::text,
            jsonb_build_object('variante', 'recordatorio', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence);
        end if;
        -- COR-C-06 «sin acuerdo»: venció el plazo de la mediación (P-06)
        if m.vencido_en is not null then
          return query select format('COR-C-06:%s:%s:vencida', c.id, s.rol), 'COR-C-06'::text, c.id, s.rol, s.para,
            jsonb_build_object('variante', 'vencida', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
          return query select format('COR-C-06:%s:mediacion:vencida', c.id), 'COR-C-06'::text, c.id, 'mediacion'::text, null::text,
            jsonb_build_object('variante', 'vencida', 'deposito', c.monto, 'reclamado', k.monto, 'vence', m.vence);
        end if;
      end if;
    end if;
    -- COR-C-06 · resultado de la mediación (los dos; Legal no prevé versión para la persona mediadora)
    if c.estado = 'cerrado' and via = 'mediacion' then
      return query select format('COR-C-06:%s:%s', c.id, s.rol), 'COR-C-06'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'dueno', (c.resultado->>'dueno')::numeric, 'inquilino', (c.resultado->>'inquilino')::numeric) from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
    -- COR-C-07 · cierre sin mediación (a devuelto, b automático, c acuerdo): el depósito ya se movió en la red de prueba (los dos).
    -- El cierre de una mediación es COR-C-06 (legal/correos-escenario-c.md).
    if c.estado = 'cerrado' and via in ('devuelto','automatico','acuerdo') and coalesce(c.liquidacion_tx, '') ~ '^[0-9a-f]{64}$' then
      return query select format('COR-C-07:%s:%s', c.id, s.rol), 'COR-C-07'::text, c.id, s.rol, s.para,
        jsonb_build_object('deposito', c.monto, 'via', via, 'dueno', (c.resultado->>'dueno')::numeric, 'inquilino', (c.resultado->>'inquilino')::numeric)
        from public.lk_correos_consentimiento s where s.contrato_id = c.id;
    end if;
  end loop;
end $$;
