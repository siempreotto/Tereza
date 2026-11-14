-- Al eliminar una cuenta, sus registros en un hogar compartido se conservan sin autor (on delete set null).
alter table public.events alter column logged_by drop not null;
alter table public.measurements alter column logged_by drop not null;
alter table public.questions alter column creada_por drop not null;

-- Datos para decidir cómo eliminar la cuenta: por hogar, cuántos miembros y cuántos admins hay.
create or replace function public.mi_situacion_para_eliminar()
returns table (household_id uuid, nombre text, rol public.rol_miembro, miembros int, admins int)
language sql stable security definer set search_path = '' as $$
  select h.id, h.nombre, m.rol,
    (select count(*)::int from public.members x where x.household_id = h.id),
    (select count(*)::int from public.members x where x.household_id = h.id and x.rol = 'admin')
  from public.members m join public.households h on h.id = m.household_id
  where m.user_id = (select auth.uid());
$$;
revoke all on function public.mi_situacion_para_eliminar() from public, anon;
grant execute on function public.mi_situacion_para_eliminar() to authenticated;

-- Borra los hogares donde la persona es el único miembro (cascada a bebés, eventos y salud).
create or replace function public.borrar_hogares_propios()
returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with propios as (
    select m.household_id from public.members m
    where m.user_id = (select auth.uid())
      and (select count(*) from public.members x where x.household_id = m.household_id) = 1
  )
  delete from public.households h using propios p where h.id = p.household_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.borrar_hogares_propios() from public, anon;
grant execute on function public.borrar_hogares_propios() to authenticated;
