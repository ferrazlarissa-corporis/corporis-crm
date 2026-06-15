-- Corporis OS — Fase 0: espinha de identidade e cadastros mestres (schema core).
-- core.pessoa é o registro universal; todo módulo aponta para ela via pessoa_id.

create type core.pessoa_tipo   as enum ('aluna', 'paciente', 'ambos');
create type core.pessoa_status as enum ('lead', 'cliente_ativo', 'inativo');
create type core.pilar         as enum ('pilates', 'pilates_gestante', 'fisio_pelvica');

create table core.pessoa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique,                      -- nullable; leads herdados não têm CPF
  nascimento date,
  telefone text,                        -- E.164 (chave de identidade herdada do CRM)
  email text,
  genero text,
  tipo core.pessoa_tipo not null default 'aluna',
  status core.pessoa_status not null default 'lead',
  pilar_principal core.pilar,
  responsavel_id uuid references crm.profiles(id) on delete set null,
  consentimento_lgpd_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index pessoa_telefone_uidx on core.pessoa(telefone) where telefone is not null;
create index pessoa_status_idx on core.pessoa(status) where archived_at is null;

create table core.endereco (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete cascade,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index endereco_pessoa_idx on core.endereco(pessoa_id);

-- Serviço: a CAPACIDADE da agenda mora aqui (Pilates até 4; Fisio pélvica = 1).
create table core.servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pilar core.pilar not null,
  duracao_min int not null default 50,
  capacidade_slot int not null default 1,
  cor_token text not null default 'alaranjado',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servico_capacidade_check check (capacidade_slot between 1 and 8)
);

create table core.sala (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  capacidade int not null default 1,
  equipamentos jsonb not null default '[]'::jsonb,
  pilares jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table core.profissional (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references crm.profiles(id) on delete set null,
  nome text not null,
  especialidade text,
  crefito text,
  pilares jsonb not null default '[]'::jsonb,
  disponibilidade jsonb not null default '{}'::jsonb,  -- { seg:[["07:00","12:00"]], ... }
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers updated_at
create trigger set_pessoa_updated_at before update on core.pessoa
for each row execute function core.set_updated_at();
create trigger set_endereco_updated_at before update on core.endereco
for each row execute function core.set_updated_at();
create trigger set_servico_updated_at before update on core.servico
for each row execute function core.set_updated_at();
create trigger set_sala_updated_at before update on core.sala
for each row execute function core.set_updated_at();
create trigger set_profissional_updated_at before update on core.profissional
for each row execute function core.set_updated_at();

-- RLS (mesma migration). Reutiliza private.is_active_staff(auth.uid()).
alter table core.pessoa       enable row level security;
alter table core.endereco     enable row level security;
alter table core.servico      enable row level security;
alter table core.sala         enable row level security;
alter table core.profissional enable row level security;

create policy "staff manage pessoa" on core.pessoa for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage endereco" on core.endereco for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage servico" on core.servico for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage sala" on core.sala for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage profissional" on core.profissional for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on all tables in schema core to authenticated, service_role;
