-- Volver atrás la migración 20261026020000_terminos_113_reputacion.sql (mensaje del bloqueo que nombra los Términos 1.13-demo).
-- TODAVÍA NO SE APLICÓ a producción: queda listo para cuando se aplique (CONTRIBUTING.md, paso 22: cada migración con su vuelta atrás).
-- Devuelve lk_sin_perfil_tras_encendido al cuerpo de 20261025140000_reputacion.sql (el mensaje de REP-01). Las aceptaciones de la
-- 1.13-demo guardadas en lk_reputacion_aceptaciones se quedan: son consentimientos reales y siguen valiendo para lk_rep01_pendiente.
-- ORDEN: 1) `git revert -m 1` del merge y un deploy nuevo (vuelve la pantalla REP-01); 2) este archivo. Una transacción.
begin;
-- LEGAL: revisado (25/10) · texto literal de Legal (revisión de c887895)
create or replace function public.lk_sin_perfil_tras_encendido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.lk_sin_perfil_ni_alquileres(new.usuario, new.email_cavos) then
    raise exception 'Antes de crear un alquiler o unirte a uno, acepta tu perfil de reputación en la app. No tiene ningún costo.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
delete from supabase_migrations.schema_migrations where version = '20261026020000';
commit;
