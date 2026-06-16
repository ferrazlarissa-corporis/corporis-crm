# Ponte OS → Corporis Finance (Fase 6)

Posting unidirecional e idempotente: o Corporis OS reconhece receitas no Corporis
Finance. **Não funde bancos.** Ver `CLAUDE-OS.md §4` e `docs/data-model.md §6`.

## Componentes (lado OS — já no código)

- Migration `financeiro_finance_bridge_config`: tabela `financeiro.finance_map`
  (pilar → `chart_code`), semeada `pilates→1.01`, `pilates_gestante→1.01`, `fisio_pelvica→1.03`.
- `src/lib/finance/post-income.ts`: `postAccrual` (reconhecimento) e `settleIncome`
  (liquidação). **No-op** se as envs `FINANCE_*` faltarem.
- Fiação: `criarVenda` → `postAccrual` do 1º lançamento; `marcarLancamentoRecebido`
  → `settleIncome`; cron `/api/cron/mensalidades` (mensal, dia 1) gera as competências
  seguintes e dispara `postAccrual`.

## Regime: competência (2 fases)

| Fase | Gatilho no OS | Finance |
| --- | --- | --- |
| Reconhecimento | lançamento `a_receber` criado | INSERT income · `event_date=competência` · `status='pending'` · `cash_date=vencimento` |
| Liquidação | lançamento vira `recebido` | UPDATE mesma tx · `cash_date=recebido_at` · `status='cleared'` |

Idempotência: índice único `(organization_id, source, external_id)` no Finance;
`external_id = financeiro.lancamento.id`; `source = 'corporis_os'`.

## Pré-requisitos (lado Finance) — AÇÃO NECESSÁRIA

### 1. Migration no projeto Finance (ampliar `source`)

O OS posta com `source = 'corporis_os'`. Aplicar no **projeto Finance**:

```sql
-- Ajustar a lista existente conforme o check atual de transactions.source
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check
  check (source in ('manual', 'import', 'recurring', 'corporis_os'));
```

> Confirmar os valores já aceitos antes de recriar o check (não remover os existentes).

Índice único (NÃO-parcial — o upsert `ON CONFLICT` exige índice completo; NULLs em
`external_id` não colidem por padrão, então não quebra transações existentes):

```sql
create unique index if not exists transactions_org_source_external_uidx
  on public.transactions (organization_id, source, external_id);
```

### 2. Variáveis de ambiente (`.env.local` do OS + Vercel)

```
FINANCE_SUPABASE_URL=          # URL do projeto Supabase do Finance
FINANCE_SERVICE_ROLE_KEY=      # service role do Finance (server-side apenas)
FINANCE_ORG_ID=                # organization_id da Corporis no Finance
FINANCE_DEFAULT_ACCOUNT_ID=    # account_id que recebe as receitas
```

### 3. Confirmar o schema do Finance

A função assume em `public`:
- `transactions(organization_id, account_id, category_id, type, amount, description,
  event_date, cash_date, status, source, external_id)` — `type='income'`,
  `status ∈ {'pending','cleared'}`.
- `chart_of_accounts(id, organization_id, code)` — busca `category_id` por `code`.

Se nomes diferirem, ajustar `src/lib/finance/post-income.ts`.

## Teste de fumaça (após envs)

1. Nova venda no OS → conferir uma `transactions` `pending` no Finance com
   `external_id` = id do lançamento, `event_date` = competência.
2. Marcar o lançamento como recebido → a MESMA tx vira `cleared` com `cash_date`.
3. Repetir a venda/recebimento não duplica (índice único).
