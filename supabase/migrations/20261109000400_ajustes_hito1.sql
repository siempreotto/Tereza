-- Tereza · ajustes del Hito 1: el hogar nunca se queda sin admin.
create or replace function private.proteger_ultimo_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Si el hogar se está borrando (cascada), no aplica.
  if old.rol = 'admin' and (tg_op = 'DELETE' or new.rol <> 'admin')
     and exists (select 1 from public.households h where h.id = old.household_id) then
    if not exists (select 1 from public.members m where m.household_id = old.household_id and m.rol = 'admin' and m.id <> old.id) then
      raise exception 'El hogar necesita al menos una persona con rol admin' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;
revoke all on function private.proteger_ultimo_admin() from public;
create trigger members_ultimo_admin before update of rol or delete on public.members
  for each row execute function private.proteger_ultimo_admin();
