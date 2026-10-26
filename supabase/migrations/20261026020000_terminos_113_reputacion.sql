-- Términos 1.13-demo: el perfil de reputación se acepta con la casilla de los Términos (Legal y Katherine, 26/10/2026, 1:15 a. m.).
-- ARCHIVO SOLAMENTE: NO se aplicó a producción. Se aplica el día de la publicación, después del OK final de Legal.
-- Ya no hay pantalla aparte (REP-01): la app registra la aceptación del perfil con lk_aceptar_reputacion (mismo RPC, version
-- «1.13-demo · fecha» y el texto de la casilla). lk_rep01_pendiente NO cambia: no mira la versión, así que una fila de la 1.13-demo
-- cuenta igual que una de REP-01 y la fila de encendido sigue bloqueando solo a quien no aceptó nada y no tiene alquileres.
-- Los alquileres cerrados antes de que una cuenta tuviera perfil no cuentan: sus eventos se descartaron al cerrarse
-- (lk_rep_evento_cuenta, 20261025140000_reputacion.sql), así que tampoco cambia nada más.
-- Solo cambia el mensaje del bloqueo: ahora apunta a los Términos 1.13-demo (la casilla dentro de «Crear alquiler» y de la invitación).
-- Volver atrás: supabase/revert/20261026020000_terminos_113_reputacion_revert.sql.
-- LEGAL: revisado (25/10) mensaje base (revisión de c887895); 26/10: nombra los Términos 1.13-demo con las palabras de la casilla de Legal (a confirmar en el OK final de Legal)
create or replace function public.lk_sin_perfil_tras_encendido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.lk_sin_perfil_ni_alquileres(new.usuario, new.email_cavos) then
    raise exception 'Antes de crear un alquiler o unirte a uno, acepta los Términos 1.13-demo, incluido tu perfil de reputación público, en la app. No tiene ningún costo.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
