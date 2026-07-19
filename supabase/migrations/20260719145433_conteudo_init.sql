-- Corporis OS — módulo Conteúdo (M0: fundação). Tabelas ficam pro M1.
-- Espelha o padrão de core_init.sql (fundação de schema) e clinico_init.sql (bucket + RLS).

create schema if not exists conteudo;
grant usage on schema conteudo to authenticated, service_role;

-- Bucket público: imagens geradas precisam de URL pública pro export/preview
-- e futura publicação (Fase 2).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'corporis-conteudo',
  'corporis-conteudo',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "staff read conteudo bucket"
on storage.objects for select to authenticated
using (bucket_id = 'corporis-conteudo' and private.is_active_staff(auth.uid()));

create policy "staff upload conteudo bucket"
on storage.objects for insert to authenticated
with check (bucket_id = 'corporis-conteudo' and private.is_active_staff(auth.uid()));

create policy "staff update conteudo bucket"
on storage.objects for update to authenticated
using (bucket_id = 'corporis-conteudo' and private.is_active_staff(auth.uid()));
