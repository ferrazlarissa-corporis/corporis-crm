-- Corporis OS — Fase 2: módulo vendas (planos, vendas, matrículas, contratos).
-- RLS reutiliza private.is_active_staff(auth.uid()); updated_at via core.set_updated_at().

create type vendas.plano_tipo       as enum ('recorrente', 'personalizado');
create type vendas.periodicidade    as enum ('mensal', 'trimestral', 'semestral', 'anual', 'avulso');
create type vendas.matricula_status as enum ('ativa', 'pausada', 'cancelada');
create type vendas.contrato_status  as enum ('rascunho', 'enviado', 'assinado', 'cancelado');

create table vendas.plano (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo vendas.plano_tipo not null default 'recorrente',
  valor numeric(14,2) not null,
  periodicidade vendas.periodicidade not null default 'mensal',
  sessoes_semana int,
  servicos jsonb not null default '[]'::jsonb,   -- [servico_id...]
  pilar core.pilar,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendas.venda (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  plano_id uuid references vendas.plano(id) on delete restrict,
  valor numeric(14,2) not null,
  desconto numeric(14,2) not null default 0,
  data date not null default current_date,
  vendedor_id uuid references crm.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendas.matricula (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  plano_id uuid not null references vendas.plano(id) on delete restrict,
  venda_id uuid references vendas.venda(id) on delete set null,
  inicio date not null default current_date,
  renovacao date,
  dia_vencimento int check (dia_vencimento between 1 and 28),
  status vendas.matricula_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK pendente em crm.appointments (coluna criada na migration da agenda).
alter table crm.appointments
  add constraint appointments_matricula_fk
  foreign key (matricula_id) references vendas.matricula(id) on delete set null;

create table vendas.contrato_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  corpo text not null,                 -- {{cliente}}, {{plano}}, {{valor}}, {{vigencia}}, {{servicos}}, {{clinica}}
  pilares jsonb not null default '[]'::jsonb,
  planos jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendas.contrato (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  modelo_id uuid references vendas.contrato_modelo(id) on delete set null,
  venda_id uuid references vendas.venda(id) on delete set null,
  corpo_gerado text,
  status vendas.contrato_status not null default 'rascunho',
  zapsign_doc_id text,
  via_assinada_url text,
  enviado_at timestamptz,
  assinado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venda_pessoa_idx on vendas.venda(pessoa_id);
create index matricula_pessoa_idx on vendas.matricula(pessoa_id);
create index matricula_status_idx on vendas.matricula(status);
create index contrato_pessoa_idx on vendas.contrato(pessoa_id);

-- Triggers updated_at
create trigger set_plano_updated_at before update on vendas.plano
for each row execute function core.set_updated_at();
create trigger set_venda_updated_at before update on vendas.venda
for each row execute function core.set_updated_at();
create trigger set_matricula_updated_at before update on vendas.matricula
for each row execute function core.set_updated_at();
create trigger set_contrato_modelo_updated_at before update on vendas.contrato_modelo
for each row execute function core.set_updated_at();
create trigger set_contrato_updated_at before update on vendas.contrato
for each row execute function core.set_updated_at();

-- RLS
alter table vendas.plano           enable row level security;
alter table vendas.venda           enable row level security;
alter table vendas.matricula       enable row level security;
alter table vendas.contrato_modelo enable row level security;
alter table vendas.contrato        enable row level security;

create policy "staff manage plano" on vendas.plano for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage venda" on vendas.venda for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage matricula" on vendas.matricula for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage contrato_modelo" on vendas.contrato_modelo for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage contrato" on vendas.contrato for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on all tables in schema vendas to authenticated, service_role;
