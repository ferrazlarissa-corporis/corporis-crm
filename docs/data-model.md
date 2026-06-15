# docs/data-model.md — Corporis OS

Plano de migrations concreto que liga o `CLAUDE-OS.md` ao código. Estende o banco
do CRM (instância canônica). Convenções herdadas do `CLAUDE.md` §7/§14: `snake_case`,
PK `uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`,
soft-delete via `archived_at`, **RLS em toda tabela na mesma migration que a cria**.

Ordem das migrations (uma por módulo). Nomes só ilustrativos; gerar com `supabase migration new`.

---

## 0. Convenções

- O CRM usa `crm.set_updated_at()`. Criamos um equivalente para os novos schemas.
- RLS desta fase: 1 papel real (admin), mas as policies já referenciam
  `crm.profiles.role` para restringir por papel no futuro sem reescrever (igual `CLAUDE.md` §8).
- Service role (server actions, webhooks, ponte Finance) bypassa RLS; todo input externo é validado com Zod antes do banco.

```sql
-- migration: core_init
create schema if not exists core;
create schema if not exists agenda;
create schema if not exists vendas;
create schema if not exists financeiro;
create schema if not exists clinico;

create or replace function core.set_updated_at() returns trigger
  language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- helper de papel reutilizado nas policies
create or replace function core.is_active_staff() returns boolean
  language sql stable as $$
  select exists (
    select 1 from crm.profiles p
    where p.id = auth.uid() and p.ativo = true
  );
$$;
```

---

## 1. `core` — espinha de identidade e cadastros mestres

```sql
-- migration: core_pessoa
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
create trigger pessoa_updated_at before update on core.pessoa
  for each row execute function core.set_updated_at();

create table core.endereco (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references core.pessoa(id) on delete cascade,
  cep text, logradouro text, numero text, complemento text,
  bairro text, cidade text, uf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger endereco_updated_at before update on core.endereco
  for each row execute function core.set_updated_at();

-- Serviço: a CAPACIDADE da agenda mora aqui
create table core.servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pilar core.pilar not null,
  duracao_min int not null default 50,
  capacidade_slot int not null default 1,   -- Pilates até 4; Fisio pélvica = 1
  cor_token text not null default 'alaranjado',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servico_capacidade_check check (capacidade_slot between 1 and 8)
);
create trigger servico_updated_at before update on core.servico
  for each row execute function core.set_updated_at();

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
create trigger sala_updated_at before update on core.sala
  for each row execute function core.set_updated_at();

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
create trigger profissional_updated_at before update on core.profissional
  for each row execute function core.set_updated_at();

-- RLS (mesma migration)
alter table core.pessoa       enable row level security;
alter table core.endereco     enable row level security;
alter table core.servico      enable row level security;
alter table core.sala         enable row level security;
alter table core.profissional enable row level security;

create policy core_pessoa_rw on core.pessoa
  for all using (core.is_active_staff()) with check (core.is_active_staff());
-- (idem para endereco/servico/sala/profissional — mesma policy)
```

### Migração da espinha (preserva dados do CRM)

```sql
-- migration: core_pessoa_backfill
alter table crm.leads add column if not exists pessoa_id uuid references core.pessoa(id);

-- 1 pessoa por lead existente (identidade = telefone E.164)
insert into core.pessoa (nome, telefone, email, status, pilar_principal, responsavel_id, created_at)
select l.nome, l.telefone, l.email,
       case when l.estagio = 'convertido' then 'cliente_ativo'::core.pessoa_status
            when l.estagio = 'perdido'    then 'inativo'::core.pessoa_status
            else 'lead'::core.pessoa_status end,
       nullif(l.interesse,'indefinido')::core.pilar,
       l.responsavel_id, l.created_at
from crm.leads l
where l.pessoa_id is null;

update crm.leads l set pessoa_id = p.id
from core.pessoa p where p.telefone = l.telefone and l.pessoa_id is null;

alter table crm.leads alter column pessoa_id set not null;
```

> `crm.leads` continua existindo (funil/aquisição); passa a ser uma faceta da Pessoa.

---

## 2. `agenda` — evolui `crm.appointments` (NÃO recria)

> ⚠️ As tools do agente em `src/lib/ai/tools.ts` (`agendar_avaliacao`,
> `consultar_horarios_disponiveis`) usam `crm.appointments`. Esta migration e a
> atualização dessas tools entram **no mesmo PR**. Avaliação inicial vira um
> agendamento de `categoria = 'avaliacao'`; o comportamento do agente não muda.

```sql
-- migration: agenda_evolui_appointments
create type agenda.categoria as enum ('avaliacao', 'sessao', 'experimental');

alter table crm.appointments
  add column if not exists pessoa_id     uuid references core.pessoa(id),
  add column if not exists servico_id    uuid references core.servico(id),
  add column if not exists sala_id        uuid references core.sala(id),
  add column if not exists matricula_id  uuid,                     -- FK adicionada após vendas
  add column if not exists categoria     agenda.categoria not null default 'avaliacao',
  add column if not exists recorrencia   jsonb;                    -- regra de repetição

-- backfill: liga ao pessoa_id do lead; mantém profissional_id, status, lembrete_* etc.
update crm.appointments a
set pessoa_id = l.pessoa_id
from crm.leads l where a.lead_id = l.id and a.pessoa_id is null;
```

**Regra de capacidade (na validação da server action / RPC de agendar):**
contar agendamentos ativos no mesmo `inicio` + `sala_id` para o `servico_id`;
recusar se `count >= servico.capacidade_slot`. Pilates → até 4; Fisio pélvica → 1.

---

## 3. `vendas`

```sql
-- migration: vendas_init
create type vendas.plano_tipo    as enum ('recorrente', 'personalizado');
create type vendas.periodicidade as enum ('mensal','trimestral','semestral','anual','avulso');
create type vendas.matricula_status as enum ('ativa','pausada','cancelada');
create type vendas.contrato_status  as enum ('rascunho','enviado','assinado','cancelado');

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
-- agora a FK pendente em appointments
alter table crm.appointments
  add constraint appointments_matricula_fk
  foreign key (matricula_id) references vendas.matricula(id) on delete set null;

create table vendas.contrato_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  corpo text not null,                 -- com {{cliente}}, {{plano}}, {{valor}}, {{vigencia}}, {{servicos}}, {{clinica}}
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
  enviado_at timestamptz, assinado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- + triggers updated_at e RLS (core.is_active_staff) em todas
```

### RPC de adesão (fan-out transacional) — evento §5.2 do CLAUDE-OS

Em vez de triggers encadeadas, uma função única chamada pela server action do wizard
de venda. Cria tudo numa transação:

```sql
-- migration: vendas_adesao_rpc
create or replace function vendas.criar_adesao(
  p_pessoa_id uuid, p_plano_id uuid, p_valor numeric, p_desconto numeric,
  p_dia_vencimento int, p_inicio date, p_modelo_contrato_id uuid, p_vendedor_id uuid
) returns uuid language plpgsql security definer as $$
declare v_venda_id uuid; v_matricula_id uuid; v_plano vendas.plano;
begin
  select * into v_plano from vendas.plano where id = p_plano_id;

  insert into vendas.venda(pessoa_id, plano_id, valor, desconto, data, vendedor_id)
    values (p_pessoa_id, p_plano_id, p_valor, p_desconto, p_inicio, p_vendedor_id)
    returning id into v_venda_id;

  insert into vendas.matricula(pessoa_id, plano_id, venda_id, inicio, dia_vencimento)
    values (p_pessoa_id, p_plano_id, v_venda_id, p_inicio, p_dia_vencimento)
    returning id into v_matricula_id;

  -- promove a pessoa a cliente ativo
  update core.pessoa set status = 'cliente_ativo' where id = p_pessoa_id and status <> 'cliente_ativo';

  -- 1º lançamento a receber (recorrência é gerada pelo cron mensal, ver §5)
  insert into financeiro.lancamento(pessoa_id, matricula_id, competencia, descricao, valor, vencimento, status)
    values (p_pessoa_id, v_matricula_id, date_trunc('month', p_inicio)::date,
            'Mensalidade ' || v_plano.nome, (p_valor - p_desconto),
            make_date(extract(year from p_inicio)::int, extract(month from p_inicio)::int, least(p_dia_vencimento,28)),
            'a_receber');

  -- contrato em rascunho a partir do modelo
  insert into vendas.contrato(pessoa_id, modelo_id, venda_id, status)
    values (p_pessoa_id, p_modelo_contrato_id, v_venda_id, 'rascunho');

  return v_venda_id;
end $$;
```

---

## 4. `financeiro` — contas a receber do OS (sinalização)

> Per-aluna. **Não** é o Corporis Finance (esse é a contabilidade gerencial, projeto à parte — ver §6).

```sql
-- migration: financeiro_init
create type financeiro.lancamento_status as enum ('a_receber','recebido','atrasado');

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
-- trigger updated_at + RLS

-- DRE local é só uma VIEW de leitura sobre vendas + lancamento (DRE consolidado fica no Finance)
create view financeiro.resumo_mensal as
  select date_trunc('month', competencia)::date as mes,
         sum(valor) filter (where status = 'recebido')  as recebido,
         sum(valor) filter (where status <> 'recebido')  as em_aberto
  from financeiro.lancamento group by 1;
```

---

## 5. `clinico` — dado sensível + auditoria (LGPD)

```sql
-- migration: clinico_init
create type clinico.documento_tipo as enum ('exame','atestado','laudo','outro');

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
  storage_path text not null,          -- bucket PRIVADO; servir via URL assinada
  tamanho bigint,
  uploaded_by uuid references crm.profiles(id) on delete set null,
  archived_at timestamptz,             -- NUNCA hard-delete (retenção CFM/COFFITO 20 anos)
  created_at timestamptz not null default now()
);

-- Auditoria de acesso ao dado clínico
create table clinico.acesso_log (
  id bigint generated always as identity primary key,
  pessoa_id uuid not null,
  tabela text not null,
  acao text not null check (acao in ('select','insert','update')),
  ator_id uuid,
  at timestamptz not null default now()
);
-- RLS em todas; clinico.* registra acesso via wrapper na camada de dados (lib/queries)
```

**Evento (§5.3 CLAUDE-OS):** ao marcar `crm.appointments.status = 'compareceu'`,
criar `clinico.evolucao` pendente (trigger ou na server action de concluir agendamento).

**Storage:** bucket privado `clinico`; sempre `createSignedUrl`, nunca público.

---

## 6. Ponte com o Corporis Finance (posting OS → Finance)

> Recomendado e independente de merge. **Precisa de você:** o `organization_id` da
> Corporis no Finance e o `account_id` que recebe as receitas. O resto está pronto.

### Config (no banco do OS)

```sql
-- migration: financeiro_finance_bridge_config
create table financeiro.finance_map (
  pilar core.pilar primary key,
  chart_code text not null          -- código do chart_of_accounts no Finance
);
insert into financeiro.finance_map(pilar, chart_code) values
  ('pilates','1.01'), ('pilates_gestante','1.01'), ('fisio_pelvica','1.03');
-- 'fisioterapia' genérica → '1.02'; 'primeira consulta' → '1.05'; 'combo' → '1.06' (ajustar conforme planos)
```

### Env novas (apontam para o PROJETO Finance)

```
FINANCE_SUPABASE_URL=         # URL do projeto Supabase do Finance
FINANCE_SERVICE_ROLE_KEY=     # service role do Finance (server-side apenas)
FINANCE_ORG_ID=               # organization_id da Corporis no Finance  ← VOCÊ INFORMA
FINANCE_DEFAULT_ACCOUNT_ID=   # account_id que recebe as receitas        ← VOCÊ INFORMA
```

### Regime: COMPETÊNCIA (decisão do Bruno)

Hoje o Finance é 100% caixa. A ponte do OS introduz competência **sem mudar o
schema do Finance** — a `transactions` já separa `event_date` (competência) de
`cash_date` (caixa) e tem `status` (`pending`/`cleared`). O posting é **em duas fases**:

| Fase | Gatilho no OS | O que faz no Finance |
| --- | --- | --- |
| **Reconhecimento** | `financeiro.lancamento` criado (`a_receber`) para a competência M | INSERT income, `event_date = competência`, `status = 'pending'`, `cash_date = vencimento` (provisório) |
| **Liquidação** | lançamento vira `recebido` | UPDATE da MESMA tx (por `org+source+external_id`): `cash_date = recebido_at`, `status = 'cleared'` |

Resultado: **competência** lê tudo por `event_date`; **caixa** segue lendo só
`cleared` por `cash_date` (a provisória de uma `pending` não entra no caixa).
Uma transação por lançamento/competência — recorrência mensal gera uma a cada mês (ver cron abaixo).

### Função de posting (server-side, idempotente)

`src/lib/finance/post-income.ts` — duas funções; ambas usam o service role do Finance via PostgREST:

```ts
// pseudo — fase 1: reconhecimento (accrual), na criação do lançamento a_receber
async function postAccrual(lancamento, pessoa, descricao) {
  await financeClient.from('transactions').insert({
    organization_id: FINANCE_ORG_ID,
    account_id: FINANCE_DEFAULT_ACCOUNT_ID,
    category_id: chartIdByCode(map[pessoa.pilar_principal]),  // 1.01 / 1.03 ...
    type: 'income',
    amount: lancamento.valor,
    description: `${pessoa.nome} · ${descricao}`,
    event_date: lancamento.competencia,   // competência = mês a que a receita pertence
    cash_date:  lancamento.vencimento,     // provisório; ignorado pelo regime de caixa enquanto 'pending'
    status: 'pending',
    source: 'corporis_os',
    external_id: lancamento.id,            // idempotência: (org, source, external_id) é único
  });
  // OS guarda finance_tx_external_id = lancamento.id
}

// pseudo — fase 2: liquidação (caixa), quando o lançamento vira 'recebido'
async function settleIncome(lancamento) {
  await financeClient.from('transactions')
    .update({ cash_date: lancamento.recebido_at, status: 'cleared' })
    .match({ organization_id: FINANCE_ORG_ID, source: 'corporis_os', external_id: lancamento.id });
}
```

> `source = 'corporis_os'` exige **uma migration no projeto Finance** ampliando o
> `check (source in (...))`. É a única alteração no Finance — combinamos antes de aplicar.
> Alternativa sem mexer no Finance: usar `source = 'recurring'` + `external_id`.
> O lado de **relatório em competência** (DRE por `event_date`) é construído no
> Finance por você; a ponte só preenche os campos certos.

### Cron de recorrência (gera competências futuras → dispara accrual)

`/api/cron/mensalidades` (Vercel Cron, mensal): para cada `vendas.matricula`
`ativa`, gera o `financeiro.lancamento` da próxima competência (se ainda não
existe) e chama `postAccrual`. Assim cada mês é reconhecido na sua competência,
e cada um é liquidado quando pago. Toda geração grava uma `crm.activities`.

O `external_id` no Finance e o `finance_tx_external_id` no OS fecham o rastro dos dois lados.

---

## 7. Ordem de aplicação sugerida

1. `core_init` → `core_pessoa` → `core_pessoa_backfill`
2. `agenda_evolui_appointments` (+ atualizar `lib/ai/tools.ts` no mesmo PR)
3. `vendas_init` → `vendas_adesao_rpc`
4. `financeiro_init`
5. `clinico_init`
6. `financeiro_finance_bridge_config` (+ env + `lib/finance/post-income.ts` com `postAccrual`/`settleIncome`)
7. `/api/cron/mensalidades` (gera competências mensais → dispara accrual)

Cada uma com RLS na própria migration; nada destrutivo sobre dados existentes;
dry-run + backup antes de rodar em produção.
