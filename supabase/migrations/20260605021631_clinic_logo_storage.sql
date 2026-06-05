-- Clinic logo storage and singleton configuration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-assets',
  'clinic-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table crm.clinic_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  logo_url text,
  logo_path text,
  logo_mime_type text,
  logo_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_config_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

create trigger set_clinic_config_updated_at before update on crm.clinic_config
for each row execute function crm.set_updated_at();

alter table crm.clinic_config enable row level security;

create policy "staff read clinic config"
on crm.clinic_config for select
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff write clinic config"
on crm.clinic_config for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  id = '00000000-0000-0000-0000-000000000001'::uuid
  and exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff upload clinic assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'clinic-assets'
  and (storage.foldername(name))[1] = 'logos'
  and exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

insert into crm.clinic_config (id)
values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

grant all on table crm.clinic_config to authenticated, service_role;
