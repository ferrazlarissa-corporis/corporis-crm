-- Anamnese pública: cliente preenche e assina sozinho via link (canvas + PDF client-side),
-- sem precisar de login. Rota pública valida token via service role (bypassa RLS).

alter table clinico.anamnese
  add column pdf_path text,
  add column assinado_at timestamptz,
  add column origem text not null default 'staff' check (origem in ('staff', 'publico'));

create table clinico.anamnese_convite (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  expira_em timestamptz not null,
  usado_at timestamptz,
  criado_por uuid references crm.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index anamnese_convite_pessoa_idx on clinico.anamnese_convite(pessoa_id);

alter table clinico.anamnese_convite enable row level security;

create policy "staff manage anamnese_convite" on clinico.anamnese_convite for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on clinico.anamnese_convite to authenticated, service_role;
