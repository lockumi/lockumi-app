-- Katherine (26/10/2026, 2:26 a. m.) y Legal (2:27 a. m.): sin bloqueos ni avisos para las cuentas que no aceptaron el perfil. La aceptación
-- solo ocurre con la casilla de los Términos de la pantalla de inicio. Se quita el disparador que impedía crear un alquiler o unirse a uno
-- sin perfil (y su mensaje). Sin perfil no hay perfil público y sus alquileres no cuentan: eso sigue igual (lk_cuenta_para_reputacion).
-- Volver atrás: supabase/revert/20261026030000_sin_bloqueo_perfil_revert.sql.
drop trigger if exists lk_sin_perfil_tras_encendido on public.lk_participantes;
drop function if exists public.lk_sin_perfil_tras_encendido();
