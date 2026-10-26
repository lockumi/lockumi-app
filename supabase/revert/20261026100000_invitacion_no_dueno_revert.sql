-- Vuelta atrás de 20261026100000_invitacion_no_dueno.sql: quita la guarda y deja lk_ver_invitacion como en 20261026010000.
drop trigger if exists lk_inquilino_no_dueno on public.lk_participantes;
drop function if exists public.lk_inquilino_no_dueno();
create or replace function public.lk_ver_invitacion(p_contrato uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.invitacion_hash is null or c.invitacion_hash <> encode(sha256(convert_to(p_token, 'utf8')), 'hex') or c.invitacion_expira < now() then
    -- LEGAL: revisado (26/10/2026, texto literal de Legal)
    raise exception 'Esta invitación ya no está disponible. Si todavía la necesitas, pídele al dueño que te envíe una nueva.' using errcode = '42501';
  end if;
  return jsonb_build_object('direccion', c.direccion, 'monto', c.monto, 'inicio', c.inicio, 'fin', c.fin, 'reglas', c.reglas,
    'email_inquilino', c.email_inquilino, 'email_dueno', (select email_cavos from public.lk_participantes where contrato_id = c.id and rol = 'dueno'));
end $$;
drop function if exists public.lk_es_el_dueno(uuid, uuid, text);
drop function if exists public.lk_correos_de_parte(uuid, text, boolean);
