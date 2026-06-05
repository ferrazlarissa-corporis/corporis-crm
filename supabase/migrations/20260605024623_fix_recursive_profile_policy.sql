-- Avoid recursive RLS checks when policies need to know whether the
-- current user is an active staff member.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_active_staff(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.profiles p
    where p.id = user_id
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  );
$$;

revoke all on function private.is_active_staff(uuid) from public;
grant execute on function private.is_active_staff(uuid) to authenticated, service_role;

drop policy if exists "staff read all active profiles" on crm.profiles;

create policy "staff read all active profiles"
on crm.profiles for select
to authenticated
using (
  ativo = true
  and private.is_active_staff(auth.uid())
);

drop policy if exists "staff upload clinic assets" on storage.objects;

create policy "staff upload clinic assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'clinic-assets'
  and (storage.foldername(name))[1] = 'logos'
  and private.is_active_staff(auth.uid())
);
