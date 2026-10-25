-- Permisos de la clave de servicio (service_role) en las tablas lk_*.
-- En este proyecto, los privilegios por defecto de postgres dan a service_role solo Dxtm en las tablas nuevas
-- y nada en las secuencias. Sin esto, el servidor de Trustless Work (api/_lib/tw.ts) recibe 403 (42501)
-- al leer o escribir lk_contratos y lk_eventos.
-- No toca anon ni authenticated, ni waitlist ni waitlist_intentos.
-- Aplicada en producción (proyecto sddgjnuvxzkrhhuczuly) el 25/10/2026 a las 2:28 p. m. CR, con el OK de Katherine.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'lk\_%' loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
grant usage, select on sequence public.lk_eventos_id_seq to service_role;
