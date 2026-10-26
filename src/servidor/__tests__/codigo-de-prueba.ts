// Paso 19 · segundo factor (Legal 25/10/2026, 5:04 p. m.): lk_pedir_borrado_cuenta y lk_mis_datos_reputacion ahora exigen un código por
// correo CONFIRMADO (sección 7 de 20261025140000_reputacion.sql). Las pruebas SQL anteriores prueban OTRAS reglas (la persona, el
// correo verificado, los dos correos en un aparato…), así que llaman a estas envolturas, que primero dejan un código confirmado para
// el correo verificado ACTIVO de la sesión (lo que haría api/_lib/codigo-correo.ts después de un código correcto) y después llaman a la
// función real. Si la sesión no tiene correo verificado, no dejan nada y la función real rechaza como siempre.
// Las reglas del código en sí (hash, 10 minutos, 5 intentos, un solo uso, reenvíos, acción) están en segundo-factor-sql.test.ts.
export const CODIGO_DE_PRUEBA = `
create function public.t_codigo(p_accion text) returns void language sql as $$
  insert into public.lk_codigos_correo(usuario, correo, accion, huella, sal, vence_en, confirmado_en)
  select auth.uid(), public.lk_correo_activo(auth.uid()), p_accion, repeat('a', 64), repeat('b', 32), clock_timestamp() + interval '10 minutes', clock_timestamp()
  where auth.uid() is not null and public.lk_correo_activo(auth.uid()) is not null $$;
create function public.t_pedir_borrado_cuenta(p_correo text default null) returns timestamptz language plpgsql as $$
begin perform public.t_codigo('eliminar'); return public.lk_pedir_borrado_cuenta(p_correo); end $$;
create function public.t_mis_datos_reputacion(p_correo text default null, p_rol text default null) returns jsonb language plpgsql as $$
begin perform public.t_codigo('descargar'); return public.lk_mis_datos_reputacion(p_correo, p_rol); end $$;`
