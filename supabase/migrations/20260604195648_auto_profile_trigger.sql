-- Auto-create crm.profiles when a new auth.users row is inserted.
-- Uses security definer in public schema (standard Supabase pattern).
-- Trigger functions cannot be called directly via PostgREST.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into crm.profiles (id, nome, email, role, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'staff',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for users who signed up before this trigger existed
insert into crm.profiles (id, nome, email, role, ativo)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  u.email,
  'staff',
  true
from auth.users u
on conflict (id) do nothing;

-- Allow authenticated staff to read all active profiles (needed for lead owner display)
create policy "staff read all active profiles"
on crm.profiles for select
to authenticated
using (
  ativo = true
  and exists (
    select 1 from crm.profiles own
    where own.id = auth.uid() and own.ativo = true
  )
);
