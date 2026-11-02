-- 27/10/2026 · Reputación con servidor: la app decidía si un alquiler cuenta mirando el perfil (REP-01) de LAS DOS partes en el
-- localStorage de ESTE navegador. La otra parte aceptó en su propio aparato, así que en dos aparatos nunca contaba nada
-- («Nuevo en Lockumi · 0 alquileres cerrados» con 2 cerrados por papel en la base). El servidor ya lo sabe (lk_cuenta_para_reputacion);
-- esta función se lo dice a la app, SOLO para los alquileres donde participa quien llama, sin correos ni datos de la otra parte:
--   cuenta = las dos partes tienen perfil (misma regla que lk_cuenta_para_reputacion)
--   desde  = la aceptación de perfil más tardía de las dos partes (lo cerrado antes no cuenta: Términos 1.13-demo, 15.1)
-- Solo lectura. Revertir: supabase/revert/20261027140000_reputacion_contraparte_revert.sql
create or replace function public.lk_reputacion_de_mis_alquileres()
returns table (contrato_id uuid, cuenta boolean, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id,
         public.lk_cuenta_para_reputacion(c.id),
         (select max(x.primera) from (
            select (select min(a.aceptado_en) from public.lk_reputacion_aceptaciones a
                     where a.usuario = p.usuario or a.correo in (select y from public.lk_correos_de(p.usuario) y)
                        or a.usuario in (select public.lk_uids_de_correo(y) from public.lk_correos_de(p.usuario) y)) as primera
              from public.lk_participantes p where p.contrato_id = c.id) x)
    from public.lk_contratos c
   where auth.uid() is not null
     and exists (select 1 from public.lk_participantes m where m.contrato_id = c.id and m.usuario = auth.uid())
$$;
revoke all on function public.lk_reputacion_de_mis_alquileres() from public, anon;
grant execute on function public.lk_reputacion_de_mis_alquileres() to authenticated;
