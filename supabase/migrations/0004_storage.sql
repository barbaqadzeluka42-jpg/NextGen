-- NEXTGEN · 0004 · Storage: private bucket for project images
-- Files live under "<user_id>/<random>.<ext>". The bucket is PRIVATE: the app serves
-- short-lived signed URLs, and RLS only lets visitors read images of APPROVED projects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "project images: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "project images: read approved, own or admin" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'project-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.is_admin()
      or exists (
        select 1 from public.projects p
         where p.image_path = storage.objects.name and p.moderation_status = 'approved')
    )
  );

create policy "project images: delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  );
