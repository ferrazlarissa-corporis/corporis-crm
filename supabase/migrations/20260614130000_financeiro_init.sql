-- Corporis OS — Fase 3: contas a receber do OS (sinalização manual, sem gateway).
-- NÃO é o Corporis Finance (contabilidade gerencial, projeto à parte).

create type financeiro.lancamento_status as enum ('a_receber', 'recebido', 'atrasado');

create table financeiro.lancamento (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete restrict,
  matricula_id uuid references vendas.matricula(id) on delete set null,
  competencia date not null,
  descricao text not null,
  valor numeric(14,2) not null,
  vencimento date not null,
  status financeiro.lancamento_status not null default 'a_receber',
  recebido_at timestamptz,
  finance_tx_external_id text,         -- id usado no posting ao Finance (idempotência)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lancamento_pessoa_idx on financeiro.lancamento(pessoa_id);
create index lancamento_matricula_idx on financeiro.lancamento(matricula_id);
create index lancamento_status_idx on financeiro.lancamento(status);
create index lancamento_competencia_idx on financeiro.lancamento(competencia);

create trigger set_lancamento_updated_at before update on financeiro.lancamento
for each row execute function core.set_updated_at();

alter table financeiro.lancamento enable row level security;
create policy "staff manage lancamento" on financeiro.lancamento for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on all tables in schema financeiro to authenticated, service_role;

-- DRE local é só uma VIEW de leitura (DRE consolidado fica no Finance).
create view financeiro.resumo_mensal as
  select date_trunc('month', competencia)::date as mes,
         sum(valor) filter (where status = 'recebido')  as recebido,
         sum(valor) filter (where status <> 'recebido')  as em_aberto
  from financeiro.lancamento
  group by 1;

grant select on financeiro.resumo_mensal to authenticated, service_role;
