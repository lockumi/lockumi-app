-- Revierte 20261026200000_cuenta_nueva.sql. Las cuentas que ya se pasaron a la cuenta nueva NO vuelven solas: antes de revertir,
-- consulta lk_cuentas_historial (usuario, direccion_stellar vieja, reemplazada_por) si hay que devolverlas a mano.
drop function if exists public.lk_asignar_cuenta(uuid, uuid, text);
drop function if exists public.lk_cuenta_nueva(uuid, text);
drop function if exists public.lk_mi_generacion();
drop table if exists public.lk_cuenta_generacion;
drop table if exists public.lk_cuentas_historial;
