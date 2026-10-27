-- Opción A (26/10/2026): prueba de billetera con Cavos antes de cada acción que mueve la cuenta segura (api/_lib/prueba-cavos.ts).
-- Cada prueba trae un nonce aleatorio de un solo uso: el servidor (service_role, /api/tw) lo inserta aquí al aceptarla; si ya
-- existe (409), la prueba se rechaza. No se guarda la firma ni el mensaje. Sin acceso para anon ni authenticated.
-- Volver atrás: supabase/revert/20261026110000_pruebas_cavos_revert.sql.
create table if not exists public.lk_pruebas_cavos (
  nonce text primary key check (nonce ~ '^[0-9a-f]{32}$'),
  usuario uuid not null,
  accion text not null check (accion in ('pagar', 'aprobar', 'repartir', 'liberar', 'devolver-automatico')),
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  usada_en timestamptz not null default now()
);
alter table public.lk_pruebas_cavos enable row level security;
revoke all on public.lk_pruebas_cavos from anon, authenticated;
grant select, insert on public.lk_pruebas_cavos to service_role;
