-- =============================================================================
-- 0009_storage_antojos.sql
-- Bucket privado para las fotos de "antojos" y sus políticas de acceso.
--
-- Convención de ruta: {user_id}/{antojo_id}.jpg — así una sola expresión de
-- políticas sirve para select/insert/update/delete, comparando el primer
-- segmento de la ruta (storage.foldername) con auth.uid().
--
-- Se aplica igual que las demás migraciones (CLI, `db push`, o pegada en el
-- SQL Editor del dashboard). Si el rol con el que corres migraciones no tiene
-- permiso de escritura sobre storage.buckets (poco común), el único paso
-- manual sería crear el bucket "antojos" como PRIVADO desde
-- Dashboard → Storage → New bucket; las políticas de abajo siguen aplicando.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('antojos', 'antojos', false)
on conflict (id) do nothing;

drop policy if exists antojos_storage_select on storage.objects;
create policy antojos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'antojos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists antojos_storage_insert on storage.objects;
create policy antojos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'antojos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists antojos_storage_update on storage.objects;
create policy antojos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'antojos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'antojos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists antojos_storage_delete on storage.objects;
create policy antojos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'antojos' and (storage.foldername(name))[1] = (select auth.uid())::text);
