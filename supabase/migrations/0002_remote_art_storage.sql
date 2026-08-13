-- Artes de classes, cartas e criaturas. O conteúdo fica fora do computador local.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rupterya-art', 'rupterya-art', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

create policy "public read rupterya art"
on storage.objects for select
using (bucket_id = 'rupterya-art');

create policy "authenticated upload rupterya art"
on storage.objects for insert to authenticated
with check (bucket_id = 'rupterya-art');

create policy "authenticated update rupterya art"
on storage.objects for update to authenticated
using (bucket_id = 'rupterya-art')
with check (bucket_id = 'rupterya-art');
