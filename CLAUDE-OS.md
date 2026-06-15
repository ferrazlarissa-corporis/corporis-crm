# CLAUDE-OS.md — Corporis OS (evolução do Corporis CRM)

> **Documento companheiro do `CLAUDE.md`.** Não o substitui.
> Tudo no `CLAUDE.md` (stack, padrões de código §14, design system §5, RLS §8,
> agente §10, Evolution API §9, protocolo de tela §6) **continua valendo**.
> Este arquivo ativa o roadmap pós-MVP (`CLAUDE.md` §17, itens 1–3) e especifica
> o novo domínio: gestão de clientes, vendas, financeiro, prontuário e agenda completa.
>
> **Regra de ouro (herdada):** se algo não está documentado aqui nem no `CLAUDE.md`,
> pare e pergunte antes de implementar.

---

## 1. O que muda — e o que NÃO muda

O **Corporis CRM** vira o **Corporis OS**: um sistema único de gestão da clínica.
O CRM deixa de ser o produto inteiro e passa a ser **um módulo** (Relacionamento)
dentro do OS.

### Preservado integralmente — NÃO TOCAR sem instrução explícita

- **O agente Clara:** `crm.agent_config` (persona, `exemplos_conversa`, `model_id`,
  `faq`, `regras_handoff`) + `src/lib/ai/*` (`tools.ts`, `contexto.ts`,
  `contexto-server.ts`, `model.ts`, `whisper.ts`) + todas as migrations `clara_*`.
  Todo o treino é ativo de produção. Mudanças no agente só por pedido direto.
- **Schema `crm` e seus dados:** leads, conversations, messages, activities,
  campaigns, message_templates, agent_config. Evoluem por adição/migration,
  nunca por recriação destrutiva.
- **Evolution API / WhatsApp** (`CLAUDE.md` §9) e os **crons** (§11).
- **Design system** (`design-system/`, read-only) e os padrões de código (§14).

### Muda

- A identidade da pessoa sobe para um schema `core` (espinha `core.pessoa`).
- Entram os módulos Clientes, Agenda completa, Vendas, Financeiro, Cadastros,
  Prontuário/Clínico, Modelos de contrato.
- O Corporis Finance é absorvido (deixa de ser projeto separado — ver §4).
- A sidebar passa a agrupar os módulos (ver §6).

---

## 2. Estratégia de dados — substitui o `CLAUDE.md` §2

> ⚠️ Esta seção **supera** a §2 do `CLAUDE.md` ("projetos separados, integração por
> view read-only"). O plano agora é **unificação real** sobre uma instância única.

- **Instância única Supabase** (a do CRM atual) é o banco canônico do OS.
- **Schemas por módulo:** `core` · `crm` (existente) · `agenda` · `vendas` ·
  `financeiro` · `clinico`. Mantemos a convenção: `snake_case`, PK
  `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`,
  soft-delete via `archived_at`.
- **Espinha:** `core.pessoa` é o registro universal. `crm.leads` e os clientes
  apontam para ela via `pessoa_id`. **Nunca redigitar cadastro.**
- A regra antiga "nunca rodar migration fora do schema `crm`" é **relaxada**:
  migrations podem tocar qualquer schema do OS, mas **uma migration por módulo**
  e sempre com RLS na mesma migration.

### Migração da espinha (preserva 100% dos dados)

1. Criar `core.pessoa` e `core.endereco`.
2. Backfill: uma `core.pessoa` para cada `crm.leads` existente (chave de
   identidade = **telefone E.164**; `crm.leads` não tem CPF).
3. Adicionar `pessoa_id` (FK) em `crm.leads` e `crm.appointments`, preenchido no backfill.
4. Conversão de lead passa a setar `pessoa.status` em vez de só `leads.estagio`.

---

## 3. Modelo de domínio novo (estilo `CLAUDE.md` §7)

### `core.pessoa` — a espinha
- `id` · `nome` · `cpf` (nullable, único quando presente) · `nascimento`
- `telefone` (E.164) · `email` · `genero`
- `tipo` (enum: `aluna`, `paciente`, `ambos`) — define a terminologia na UI
- `status` (enum: `lead`, `cliente_ativo`, `inativo`)
- `pilar_principal` (enum: `pilates`, `pilates_gestante`, `fisio_pelvica`)
- `responsavel_id` (fk crm.profiles) · `consentimento_lgpd_at` · `archived_at`

### `core.endereco`
- `pessoa_id` (fk) · `cep` · `logradouro` · `numero` · `complemento` · `bairro` · `cidade` · `uf`

### `core.servico` — a capacidade da agenda mora aqui
- `id` · `nome` · `pilar` · `duracao_min`
- `capacidade_slot` (int) — **Pilates até 4; Fisio pélvica = 1**
- `cor_token` (text — nome do token da paleta) · `ativo`

### `core.sala`
- `id` · `nome` · `capacidade` · `equipamentos` (jsonb) · `pilares` (jsonb) · `ativo`

### `core.profissional`
- `id` · `profile_id` (fk crm.profiles, nullable) · `nome` · `especialidade`
- `crefito` · `pilares` (jsonb) · `disponibilidade` (jsonb — dias/horários) · `ativo`

### `agenda.agendamento` — evolui `crm.appointments`
> A tabela `crm.appointments` é **evoluída**, não recriada. Migration adiciona
> `pessoa_id`, `servico_id`, `sala_id`, `matricula_id` e generaliza `tipo`.
> As tools do agente (`agendar_avaliacao`, `consultar_horarios_disponiveis` em
> `src/lib/ai/tools.ts`) são atualizadas **na mesma migration/PR** para continuar
> funcionando: avaliação inicial vira um agendamento de `categoria = 'avaliacao'`.
- `id` · `pessoa_id` (fk core.pessoa) · `servico_id` · `sala_id` · `profissional_id`
- `inicio` · `fim` · `categoria` (enum: `avaliacao`, `sessao`, `experimental`)
- `status` (enum existente: `agendado`, `confirmado`, `compareceu`, `faltou`, `cancelado`)
- `matricula_id` (fk vendas.matricula, nullable) · `recorrencia` (jsonb, nullable)
- `lembrete_enviado_at` · `confirmacao_enviada_at` (preservados)

**Regra de capacidade:** ao agendar, validar contra `servico.capacidade_slot` —
Pilates aceita até 4 pessoas no mesmo `inicio/sala`; Fisio pélvica bloqueia se já há 1.

### `vendas.plano`
- `id` · `nome` · `tipo` (enum: `recorrente`, `personalizado`) · `valor`
- `periodicidade` (enum: `mensal`, `trimestral`, `semestral`, `anual`, `avulso`)
- `sessoes_semana` (int) · `servicos` (jsonb — serviços inclusos) · `ativo`

### `vendas.venda`
- `id` · `pessoa_id` · `plano_id` · `valor` · `desconto` · `data` · `vendedor_id` (fk profiles)
- alimenta a DRE.

### `vendas.matricula`
- `id` · `pessoa_id` · `plano_id` · `venda_id` · `inicio` · `renovacao`
- `dia_vencimento` (int) · `status` (enum: `ativa`, `pausada`, `cancelada`)
- gera recorrência na agenda e os lançamentos a receber.

### `vendas.contrato_modelo` — **novo, pedido do Bruno**
- `id` · `nome` · `corpo` (text com mesclagem `{{cliente}}`, `{{plano}}`, `{{valor}}`,
  `{{vigencia}}`, `{{servicos}}`, `{{clinica}}`…) · `pilares` (jsonb) · `planos` (jsonb — vínculo) · `ativo`

### `vendas.contrato`
- `id` · `pessoa_id` · `modelo_id` · `venda_id` · `corpo_gerado` (text)
- `status` (enum: `rascunho`, `enviado`, `assinado`, `cancelado`)
- `zapsign_doc_id` (text) · `via_assinada_url` · `enviado_at` · `assinado_at`

### `financeiro.lancamento` — sinalização manual nesta fase
- `id` · `pessoa_id` · `matricula_id` (nullable) · `competencia` · `descricao`
- `valor` · `vencimento` · `status` (enum: `a_receber`, `recebido`, `atrasado`)
- `recebido_at` (nullable). **Sem gateway de pagamento agora.**

### `financeiro.dre` (view derivada)
- Consolida `vendas.venda` + `financeiro.lancamento` por competência. View, não tabela.

### `clinico.anamnese`
- `id` · `pessoa_id` · `versao` · `dados` (jsonb estruturado) · `autor_id` · `atualizada_at`

### `clinico.prontuario` / `clinico.evolucao`
- `evolucao`: `id` · `pessoa_id` · `agendamento_id` (nullable) · `profissional_id`
  · `servico_id` · `texto` · `created_at`. Uma evolução por atendimento concluído.

### `clinico.documento`
- `id` · `pessoa_id` · `tipo` (enum: `exame`, `atestado`, `laudo`, `outro`)
- `nome` · `storage_path` (Supabase Storage, **URL assinada, nunca pública**) · `tamanho` · `uploaded_by`

---

## 4. Integração do Corporis Finance — POSTING, não merge

> Decisão tomada após inspeção do projeto `fin-corporis`. O Finance **não é**
> cobrança de cliente: é **contabilidade gerencial** (plano de contas, transações
> income/expense/transfer, contas bancárias, orçamento, importação de extrato,
> multi-org). **Não há entidade de pessoa/cliente para de-duplicar.**

Portanto **não fundimos os bancos**. O Finance permanece um **projeto Supabase
próprio**. A integração é uma **ponte de lançamento (posting), unidirecional**
OS → Finance:

- Quando um `financeiro.lancamento` do OS é reconhecido (ou recebido), o OS posta
  uma `public.transactions` (type `income`) no Finance, na categoria do
  `chart_of_accounts` correspondente ao pilar do plano.
- O plano de contas do Finance **já vem semeado** com as categorias certas:
  `1.01 Pilates`, `1.02 Fisioterapia`, `1.03 Fisio Pélvica`, `1.05 Primeira
  Consulta`, `1.06 Combo`. O mapa pilar → código vive em config (ver data-model).
- **Idempotência:** o Finance tem índice único `(organization_id, source,
  external_id)`. O OS posta com `external_id = lancamento.id` e um `source`
  próprio — repost não duplica.
- A aba **Financeiro da ficha** (a receber por aluna) é do **OS**. O **DRE
  consolidado** continua no **Finance**; o OS pode deep-link ou ler via API read-only.

Detalhe técnico completo (função de posting, config, env) no `docs/data-model.md`.
A integração antiga "view read-only" do `CLAUDE.md` §17.3 fica **descartada**.

---

## 5. Eventos de domínio (automações)

Implementados como triggers Postgres e/ou server actions, sempre gravando uma
`crm.activities` na timeline da pessoa quando relevante:

1. **Lead convertido** → `pessoa.status: lead → cliente_ativo`; abre checklist de
   onboarding (anamnese pendente, plano, contrato, 1º agendamento).
2. **Adesão a plano** (nova venda) → cria `vendas.venda` (→ DRE) +
   `vendas.matricula` (→ recorrência na agenda) + `vendas.contrato` (rascunho a
   partir de um `contrato_modelo`) + `financeiro.lancamento` a receber conforme periodicidade.
3. **Agendamento concluído** (`status = compareceu`) → cria `clinico.evolucao`
   pendente para o profissional.
4. **Plano cancelado/expirado** → recorrência para; pessoa pode ir a `inativo`.
5. **Contrato assinado** (webhook ZapSign) → `contrato.status = assinado`, guarda via.

---

## 6. Novos módulos, telas e navegação

### Sidebar agrupada (evolui a nav atual de `(app)`)

```
GESTÃO          Dashboard · Clientes · Agenda · Vendas
RELACIONAMENTO  Inbox · Funil · Agente de IA          (módulos atuais do CRM)
FINANCEIRO      Lançamentos · DRE
CADASTROS       Planos · Modelos de contrato · Serviços · Profissionais · Salas
(rodapé)        Configurações · usuário
```

### Mapa tela → rota → mockup (continua a numeração do `design-system/screens/`)

As telas novas seguem o **mesmo protocolo do `CLAUDE.md` §6.2**: prototipa-se o
HTML em `design-system/screens/NN Nome.html`, depois reimplementa-se em
React/shadcn consumindo os tokens. Prompts de Claude Design em `docs/prompts-telas.md`.

| # | Rota | Função |
| --- | --- | --- |
| 09 | `/clientes` | Lista de clientes (ativos/inativos, filtros por pilar) |
| 10 | `/clientes/novo` | Cadastro de cliente (multi-etapa + consentimento LGPD) |
| 11 | `/clientes/[id]` | Ficha do cliente — shell + abas (visão geral) |
| 12–17 | `/clientes/[id]` (abas) | Plano · Financeiro · Anamnese · Prontuário/Evoluções · Documentos · Contrato |
| 18 | `/agenda` | Agenda completa (evolui a tela 06: multi-serviço, capacidade por slot) |
| 19 | `/agenda` (modal) | Novo agendamento (valida capacidade Pilates 4 / Fisio 1) |
| 20 | `/agenda` (popover) | Detalhe do agendamento |
| 21 | `/vendas/planos` | Catálogo + cadastro de planos |
| 22 | `/vendas/nova` | Adesão a plano (wizard: cliente → plano → condições → revisão) |
| 23 | `/vendas` | Vendas/assinaturas ativas (MRR, cancelamentos) |
| 24 | `/cadastros/servicos` | Serviços (duração, **capacidade**, cor, pilar) |
| 25 | `/cadastros/profissionais` | Profissionais (CREFITO, pilares, disponibilidade) |
| 26 | `/cadastros/salas` | Salas (capacidade, equipamentos) |
| 27 | `/cadastros/contratos` | **Modelos de contrato** (campos de mesclagem, vínculo a planos) |
| 28 | `/dashboard` | Evolui a tela 02: + KPIs de gestão (ativos, ocupação, MRR, inadimplência) |
| 29 | `/clientes/onboarding` | Checklist ao converter lead |

---

## 7. Terminologia — aluna vs. paciente

- **Aluna** → contexto Pilates (incl. gestante). **Paciente** → Fisio pélvica.
- A UI escolhe o termo por `pessoa.tipo` / `pilar` do serviço ou plano; quando
  ambíguo, usa "cliente". O agente Clara **mantém o tom atual** do `CLAUDE.md` §13
  (fala "aluna", evita "paciente/patologia" no contato de captação) — isso não muda.

---

## 8. LGPD e dado clínico (estende `CLAUDE.md` §8)

Anamnese, prontuário, evoluções e documentos são **dado pessoal sensível de saúde**.

- RLS em todas as tabelas novas, escritas referenciando `crm.profiles.role`. Nesta
  fase só **admin** (igual ao MVP), mas a estrutura por papel já fica pronta —
  não reescrever policy depois, só ajustar a condição.
- **Log de auditoria** de leitura/edição das tabelas `clinico.*`.
- Documentos em **Supabase Storage** com URL assinada; bucket privado.
- **Retenção:** prontuário guardado por 20 anos (CFM/COFFITO) — sem hard-delete;
  usar `archived_at`.
- Consentimento LGPD captado no cadastro (campo `core.pessoa.consentimento_lgpd_at`)
  e referenciado no contrato.

---

## 9. Vendas → Financeiro e contratos

- Financeiro = **sinalização manual** nesta fase: lançamento marcado como
  `a_receber | recebido | atrasado`. Adesão gera os lançamentos pela periodicidade
  do plano. **Sem PSP/gateway agora** (evolução futura: Asaas + link de pagamento +
  webhook conciliando status + antecipação).
- **Modelos de contrato** (`vendas.contrato_modelo`): cadastro com campos de
  mesclagem, vinculados a planos/serviços. Ao gerar o contrato de uma pessoa,
  escolhe-se o modelo → sistema preenche → envia ao **ZapSign** (plano gratuito;
  confirmar limites antes de fechar) → webhook atualiza status e guarda a via.
- Semear **um modelo de contrato de exemplo** (placeholder, sem valor jurídico).

---

## 10. Escopo desta fase

DENTRO: espinha `core.pessoa` + migração; módulos Clientes, Agenda completa,
Vendas, Financeiro (sinalização), Cadastros, Clínico, Modelos de contrato;
absorção do Finance; eventos de domínio; telas 09–29.

FORA (evolução): PSP/pagamento online, antecipação de recebíveis, sync com Google
Calendar, multi-papel real ativado, relatórios avançados, app mobile.

Funcional **incremental**: cada tela vira mockup HTML → React ligado ao Supabase,
módulo a módulo. Não precisa estar tudo funcional de uma vez.

---

## 11. Como trabalhar (estende `CLAUDE.md` §18)

1. Vale tudo do `CLAUDE.md` §18 (design system, RLS, Zod, tom de marca, etc.).
2. **O agente e `src/lib/ai/*` são intocáveis** salvo pedido explícito; ao evoluir
   `appointments`, atualizar as tools do agente no mesmo PR e testar o fluxo de
   agendamento de avaliação ponta a ponta.
3. Migrations: uma por módulo, RLS junto, nunca destrutivas sobre dados existentes.
4. A espinha `core.pessoa` é a fonte única de identidade — todo módulo novo
   referencia `pessoa_id`, nunca duplica nome/telefone.
5. Em decisão não documentada aqui nem no `CLAUDE.md`: **pare e pergunte.**
6. Ao concluir um módulo, atualize este arquivo.

---

*Corporis OS · CLAUDE-OS.md v0.1 · Companheiro do CLAUDE.md · Documento vivo.*
