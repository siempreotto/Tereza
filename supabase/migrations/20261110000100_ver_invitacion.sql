-- Tereza · Hito 2: ver a qué hogar invita un enlace, antes de aceptarlo (con el token basta).
create or replace function public.ver_invitacion(p_token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'hogar', h.nombre,
    'rol', i.rol,
    'email', i.email,
    'invita', (select m.nombre_visible from public.members m where m.household_id = i.household_id and m.user_id = i.creada_por),
    'estado', case when i.aceptada_en is not null then 'usada' when i.vence_en < now() then 'vencida' else 'vigente' end
  )
  from public.invites i join public.households h on h.id = i.household_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
revoke execute on function public.ver_invitacion(text) from public, anon;
grant execute on function public.ver_invitacion(text) to authenticated;
