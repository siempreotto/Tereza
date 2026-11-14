-- Tereza · Hito 5: adjuntos de visitas en Storage (bucket privado). Ruta: {household_id}/{visit_id}/{archivo}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitas', 'visitas', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create or replace function private.carpeta_hogar(nombre text)
returns uuid language sql immutable set search_path = '' as $$
  select case when (storage.foldername(nombre))[1] ~ '^[0-9a-f-]{36}$' then ((storage.foldername(nombre))[1])::uuid end;
$$;
grant execute on function private.carpeta_hogar(text) to authenticated;

create policy visitas_select on storage.objects for select to authenticated
  using (bucket_id = 'visitas' and private.puede_salud(private.carpeta_hogar(name)));
create policy visitas_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'visitas' and private.puede_salud(private.carpeta_hogar(name)));
create policy visitas_delete on storage.objects for delete to authenticated
  using (bucket_id = 'visitas' and private.puede_salud(private.carpeta_hogar(name)));
