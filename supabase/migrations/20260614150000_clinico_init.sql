-- Corporis OS — Fase 4: módulo clínico (dado pessoal sensível de saúde — LGPD).
-- Sem hard-delete (retenção CFM/COFFITO 20 anos → archived_at). Documentos em bucket
-- privado, sempre servidos via URL assinada. Auditoria de acesso em clinico.acesso_log.

create type clinico.documento_tipo as enum ('exame', 'atestado', 'laudo', 'outro');

create table clinico.anamnese (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  versao int not null default 1,
  dados jsonb not null default '{}'::jsonb,
  autor_id uuid references crm.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clinico.evolucao (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  agendamento_id uuid references crm.appointments(id) on delete set null,
  profissional_id uuid references core.profissional(id) on delete set null,
  servico_id uuid references core.servico(id) on delete set null,
  texto text not null,
  created_at timestamptz not null default now()
);

create table clinico.documento (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  tipo clinico.documento_tipo not null default 'outro',
  nome text not null,
  storage_path text not null,          -- bucket PRIVADO; servir via createSignedUrl
  tamanho bigint,
  uploaded_by uuid references crm.profiles(id) on delete set null,
  archived_at timestamptz,             -- NUNCA hard-delete
  created_at timestamptz not null default now()
);

-- Auditoria de acesso ao dado clínico (preenchida pela camada de dados via service role).
create table clinico.acesso_log (
  id bigint generated always as identity primary key,
  pessoa_id uuid not null,
  tabela text not null,
  acao text not null check (acao in ('select', 'insert', 'update')),
  ator_id uuid,
  at timestamptz not null default now()
);

create index anamnese_pessoa_idx on clinico.anamnese(pessoa_id);
create index evolucao_pessoa_idx on clinico.evolucao(pessoa_id);
create index documento_pessoa_idx on clinico.documento(pessoa_id) where archived_at is null;
create index acesso_log_pessoa_idx on clinico.acesso_log(pessoa_id, at desc);

create trigger set_anamnese_updated_at before update on clinico.anamnese
for each row execute function core.set_updated_at();

alter table clinico.anamnese   enable row level security;
alter table clinico.evolucao   enable row level security;
alter table clinico.documento  enable row level security;
alter table clinico.acesso_log enable row level security;

create policy "staff manage anamnese" on clinico.anamnese for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage evolucao" on clinico.evolucao for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage documento" on clinico.documento for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff read acesso_log" on clinico.acesso_log for select to authenticated
using (private.is_active_staff(auth.uid()));

grant all on all tables in schema clinico to authenticated, service_role;

-- Bucket privado para documentos clínicos (espelha o padrão de clinic-assets).
insert into storage.buckets (id, name, public)
values ('clinico', 'clinico', false)
on conflict (id) do nothing;

create policy "staff read clinical docs"
on storage.objects for select to authenticated
using (bucket_id = 'clinico' and private.is_active_staff(auth.uid()));

create policy "staff upload clinical docs"
on storage.objects for insert to authenticated
with check (bucket_id = 'clinico' and private.is_active_staff(auth.uid()));

create policy "staff update clinical docs"
on storage.objects for update to authenticated
using (bucket_id = 'clinico' and private.is_active_staff(auth.uid()));
