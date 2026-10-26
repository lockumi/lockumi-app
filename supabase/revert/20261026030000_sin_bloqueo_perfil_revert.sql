-- Vuelve a poner el disparador de 20261026020000 (bloqueo sin perfil) y borra el registro de 20261026030000.
begin;
create or replace function public.lk_sin_perfil_tras_encendido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.lk_sin_perfil_ni_alquileres(new.usuario, new.email_cavos) then
    raise exception 'Antes de crear un alquiler o unirte a uno, acepta los Términos 1.13-demo, incluido tu perfil de reputación público, en la app. No tiene ningún costo.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists lk_sin_perfil_tras_encendido on public.lk_participantes;
create trigger lk_sin_perfil_tras_encendido before insert on public.lk_participantes for each row execute function public.lk_sin_perfil_tras_encendido();
delete from supabase_migrations.schema_migrations where version = '20261026030000';
commit;
