-- Volver atrás 20261026060000_vincular_alquileres.sql: devuelve cada lugar movido a la sesión de antes (lk_vinculaciones, del más
-- nuevo al más viejo, solo si sigue en la sesión nueva), borra la función y la tabla, y quita su fila de schema_migrations. Una transacción.
begin;
do $$
declare r record; t text;
begin
  for r in select * from public.lk_vinculaciones order by id desc loop
    if exists (select 1 from public.lk_participantes where contrato_id = r.contrato_id and rol = r.rol and usuario = r.usuario_nuevo)
       and not exists (select 1 from public.lk_participantes where contrato_id = r.contrato_id and usuario = r.usuario_antes) then
      update public.lk_participantes set usuario = r.usuario_antes where contrato_id = r.contrato_id and rol = r.rol;
      foreach t in array array['lk_firmas', 'lk_aceptaciones_terminos', 'lk_aceptaciones_mediacion', 'lk_correos_consentimiento',
        'lk_declaraciones_invitacion', 'lk_invitaciones_verificadas', 'lk_ocultos', 'lk_reglas_651', 'lk_reputacion_eventos', 'lk_reputacion_revisiones'] loop
        if to_regclass('public.' || t) is not null then
          begin
            execute format('update public.%I set usuario = $1 where contrato_id = $2 and usuario = $3', t) using r.usuario_antes, r.contrato_id, r.usuario_nuevo;
          exception when unique_violation then null;
          end;
        end if;
      end loop;
    end if;
  end loop;
end $$;
drop function if exists public.lk_vincular_alquileres(uuid, text);
drop table if exists public.lk_vinculaciones;
delete from supabase_migrations.schema_migrations where version = '20261026060000';
commit;
