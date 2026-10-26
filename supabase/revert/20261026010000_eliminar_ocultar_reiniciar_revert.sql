-- Volver atrás la migración 20261026010000_eliminar_ocultar_reiniciar.sql (eliminar, ocultar y «Reiniciar mi demo»). TODAVÍA NO SE APLICÓ
-- a producción: este archivo queda listo para cuando se aplique (CONTRIBUTING.md, paso 22: cada migración con su vuelta atrás).
-- Quita las funciones nuevas y la tabla lk_ocultos (los alquileres ocultos vuelven a verse en la lista de cada persona) y devuelve
-- lk_ver_invitacion a su texto anterior, con el mismo cuerpo que 20261017000000_lockumi_e2e.sql:177-187 (la única definición en las
-- migraciones; antes de aplicarlo en producción, compararlo con pg_get_functiondef). Los alquileres YA eliminados no vuelven: el borrado
-- es real (Legal, revisión de c97585b). Una transacción; quita su fila de schema_migrations.
-- ORDEN: 1) `git revert` del merge y un deploy nuevo (la app sin estas pantallas); 2) este archivo. Con la app nueva y la base sin estas
-- funciones, «Eliminar», «Ocultar» y «Reiniciar mi demo» responden con un error y no cambian nada.
begin;
drop function if exists public.lk_reiniciar_mi_demo();
drop function if exists public.lk_ocultar_alquiler(uuid, boolean);
drop function if exists public.lk_eliminar_alquiler(uuid);
drop function if exists public.lk_borrar_alquiler(uuid);
drop function if exists public.lk_se_puede_ocultar(public.lk_contratos);
drop function if exists public.lk_se_puede_eliminar(public.lk_contratos);
drop function if exists public.lk_con_dinero(public.lk_contratos);
drop table if exists public.lk_ocultos;
create or replace function public.lk_ver_invitacion(p_contrato uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.invitacion_hash is null or c.invitacion_hash <> encode(sha256(convert_to(p_token, 'utf8')), 'hex') or c.invitacion_expira < now() then
    raise exception 'Este link de invitación no es válido o ya se usó. Pide uno nuevo al dueño.' using errcode = '42501';
  end if;
  return jsonb_build_object('direccion', c.direccion, 'monto', c.monto, 'inicio', c.inicio, 'fin', c.fin, 'reglas', c.reglas,
    'email_inquilino', c.email_inquilino, 'email_dueno', (select email_cavos from public.lk_participantes where contrato_id = c.id and rol = 'dueno'));
end $$;
delete from supabase_migrations.schema_migrations where version = '20261026010000';
commit;
