# CLAUDE.md — Corporis CRM

> Documento mestre do projeto. O Claude Code lê este arquivo automaticamente em toda sessão.
> Toda decisão técnica, padrão de código, schema e regra de negócio vive aqui.
> **Regra de ouro:** se uma decisão não está documentada aqui, pare e pergunte antes de implementar.

---

## 1. O Projeto

**Corporis CRM** é o sistema de captação e conversão de novos pacientes da **Corporis Fisioterapia e Pilates** — clínica boutique em Xanxerê/SC. O MVP cobre o funil de aquisição: do primeiro contato no WhatsApp até a conversão em paciente avaliado.

O coração do sistema é um **agente de IA integrado ao WhatsApp** que qualifica leads, responde dúvidas, dispara lembretes/confirmações e roda campanhas de reativação — sempre com a opção de a recepção assumir a conversa (handoff humano).

### Escopo do MVP (não confundir com roadmap)

DENTRO do MVP:
- Inbox de WhatsApp com handoff IA ↔ humano
- Funil de leads (Kanban)
- Ficha do lead com timeline unificada
- Agenda própria de avaliações iniciais
- Agente de IA: qualificação, FAQ, lembretes/confirmações, campanhas de reativação
- Dashboard de captação
- Configurações do agente e do sistema

FORA do MVP (roadmap — não implementar agora):
- Gestão de pacientes ativos e planos de tratamento
- Prontuário / evolução clínica
- Financeiro (vive no projeto Corporis Finance)
- Multi-papel com permissões granulares (estrutura preparada, não ativada)
- App mobile nativo

### Princípio de produto

A Corporis **não é academia**. A comunicação do agente e toda a copy do sistema seguem o tom da marca: *cuidadosa, técnica, acolhedora*. O agente **nunca** promete cura, nunca usa urgência fabricada, nunca fala "paciente"/"patologia" — fala "aluna", "incômodo", "avaliação". Ver seção 13 (Persona do Agente).

---

## 2. Relação com o Corporis Finance

Este é um **projeto separado**, com repositório, deploy e ciclo de vida próprios. Compartilha **a mesma instância Supabase** do Corporis Finance.

- Cada projeto vive em seu próprio **schema** Postgres: este projeto usa o schema `crm`. O Finance usa o seu próprio schema.
- Nenhum projeto escreve nas tabelas do outro. Integração futura (ex.: lead convertido vira receita no Finance) será feita via **view read-only** exposta de um lado para o outro, nunca por escrita cruzada.
- Variáveis de ambiente do Supabase são as mesmas; o isolamento é por schema + RLS.

**Regra:** nunca rode migrations que toquem schemas fora de `crm`.

---

## 3. Stack Técnica

| Camada | Tecnologia | Versão alvo |
| --- | --- | --- |
| Framework | Next.js (App Router) | 15.x |
| Linguagem | TypeScript (strict) | 5.x |
| UI | React | 19.x |
| Estilo | Tailwind CSS | 4.x |
| Componentes | shadcn/ui | latest |
| Ícones | lucide-react | latest |
| Banco / Auth / Storage / Realtime | Supabase | cloud |
| ORM / acesso a dados | Supabase JS client + SQL (sem ORM pesado) | — |
| Validação de schema | Zod | latest |
| Formulários | React Hook Form | latest |
| Estado de servidor | TanStack Query | latest |
| Datas | date-fns (locale pt-BR) | latest |
| LLM | Anthropic SDK (`@anthropic-ai/sdk`) | latest |
| WhatsApp | Evolution API (self-hosted) | latest stable |
| Deploy app | Vercel | — |
| Deploy Evolution API | VPS própria, Docker Compose | — |
| Gerenciador de pacotes | pnpm | — |

### Por que estas escolhas

- **Next.js + Vercel:** SSR/RSC, deploy trivial, mesma base do Corporis Finance — consistência entre projetos.
- **Supabase:** Auth, Realtime (essencial para o inbox de chat ao vivo), RLS e Storage num só lugar; já é a base do Finance.
- **Evolution API em VPS:** mantém um processo persistente conectado ao WhatsApp — algo que serverless/Vercel não suporta. Roda em Docker numa VPS pequena.
- **Anthropic Claude:** melhor aderência ao tom de marca exigido e menor risco de alucinação em contexto de saúde.

---

## 4. Estrutura do Repositório

```
corporis-crm/
├── CLAUDE.md                       # este arquivo
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── components.json                 # config shadcn/ui
│
├── design-system/                  # FONTE DA VERDADE VISUAL (ver seção 5)
│   ├── SKILL.md                    # skill 'corporis-design' (invocável)
│   ├── README.md                   # referência completa de marca
│   ├── colors_and_type.css         # ★ todos os tokens canônicos
│   ├── assets/                     # logos PNG (cores, branco, preto)
│   ├── fonts/                      # Olicy self-hosted (ver README da pasta)
│   ├── preview/                    # cards isolados de cada token/componente
│   ├── screens/                    # ★ mockups HTML das 8 telas do MVP
│   ├── reference/
│   │   ├── DLS-Primitives.md       # DLS v1.0 — fonte de verdade dos tokens
│   │   └── Brand-Identity.md       # missão, voz, audiência
│   └── ui_kits/site/               # IGNORAR — é do site institucional, não do CRM
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/              # ref: design-system/screens/01 Login.html
│   │   ├── (app)/                  # rotas autenticadas — layout com sidebar
│   │   │   ├── dashboard/          # ref: 02 Dashboard.html
│   │   │   ├── inbox/              # ref: 03 Inbox WhatsApp.html
│   │   │   ├── funil/              # ref: 04 Funil.html
│   │   │   ├── leads/[id]/         # ref: 05 Ficha do Lead.html
│   │   │   ├── agenda/             # ref: 06 Agenda.html
│   │   │   └── config/
│   │   │       ├── agente/         # ref: 07 Agente de IA.html
│   │   │       └── sistema/        # ref: 08 Configurações.html
│   │   ├── api/
│   │   │   ├── webhook/whatsapp/   # recebe eventos da Evolution API
│   │   │   ├── ai/reply/           # gera resposta do agente
│   │   │   └── cron/               # lembretes, campanhas (Vercel Cron)
│   │   ├── layout.tsx
│   │   └── globals.css             # importa colors_and_type.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui — não editar manualmente sem necessidade
│   │   └── corporis/               # componentes próprios da marca
│   ├── lib/
│   │   ├── supabase/               # client browser + server + middleware
│   │   ├── evolution/              # wrapper da Evolution API
│   │   ├── ai/                     # agente: prompt, tools, orquestração
│   │   └── utils.ts
│   ├── hooks/
│   └── types/
│       └── database.ts             # tipos gerados do Supabase
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docker/
    └── evolution/                  # docker-compose da Evolution API (deploy VPS)
```

---

## 5. Design System — Pasta `design-system/`

A pasta `design-system/` é a **fonte da verdade visual** do projeto. É **read-only** do ponto de vista do desenvolvimento — o código consome dela; mudanças no design system só acontecem por instrução explícita e com diff visível.

### 5.1 O skill `corporis-design`

A pasta contém um **skill invocável** (`design-system/SKILL.md`, nome `corporis-design`, `user-invocable: true`). Sempre que a tarefa envolver qualquer decisão visual — implementar uma tela, criar um componente novo, ajustar estilos, escolher cor/tipografia — **invoque o skill `corporis-design`**. Ele carrega as regras de marca, os tokens e as não-negociáveis automaticamente.

### 5.2 Arquivos canônicos (referenciar, não copiar)

| Para... | Consulte |
| --- | --- |
| Tokens (cores, tipografia, spacing, radius, shadow, motion) | `design-system/colors_and_type.css` |
| DLS formal (definição de cada token) | `design-system/reference/DLS-Primitives.md` |
| Voz, tom, missão, audiência, "o que Corporis NÃO é" | `design-system/reference/Brand-Identity.md` |
| Visualização individual de cada token/componente | `design-system/preview/*.html` |
| Mockup de uma tela do MVP | `design-system/screens/0X Nome.html` |
| Logos (3 versões: cores, branco, preto) | `design-system/assets/` |
| Status da fonte Olicy e substituta atual | `design-system/fonts/README.md` |

### 5.3 Integração técnica dos tokens no projeto

**Princípio:** existe **uma única fonte da verdade** para tokens — `design-system/colors_and_type.css`. O `globals.css` do Next.js **importa** esse arquivo, não duplica valores.

```css
/* src/app/globals.css */
@import "../../design-system/colors_and_type.css";

/* daqui em diante, use as variáveis CSS via Tailwind / var() */
```

No Tailwind 4, mapeie os tokens para classes utilitárias via `@theme` referenciando as variáveis CSS — não redefina os valores hex.

**Nunca** redefina cor, fonte ou spacing em outro arquivo. Se um token que você precisa não existe em `colors_and_type.css`, **pare e pergunte** — provavelmente é um caso de extensão de aplicação (próxima seção).

### 5.4 Extensão de aplicação (tokens de software)

O DLS Corporis foi escrito para comunicação de marca. Para um CRM precisamos de tokens que ele não cobre — largura de sidebar, hover de linha de tabela, cores de gráfico. Quando esses tokens forem necessários:

1. Pare e pergunte ao usuário antes de criar.
2. Quando aprovado, adicione-os a um arquivo novo: **`design-system/app-tokens.css`** (não polua `colors_and_type.css`, que é da marca).
3. Importe-os no `globals.css` logo após o arquivo de marca.
4. Documente cada token novo neste `CLAUDE.md` (atualize esta seção).

Valores derivados sugeridos para tokens de aplicação (apenas referência — não criar antes de precisar):
- `--app-sidebar-width`, `--app-sidebar-collapsed`, `--app-topbar-height`
- `--surface-page` (= `--color-fundo-claro`), `--surface-raised` (= `#FFFFFF`, exceção controlada para cards), `--surface-sunken` (= `--color-bege-claro`)
- `--row-hover` (tint quente derivado do fundo), `--row-selected` (= `--color-bege-claro`)
- `--chart-1`..`--chart-5` (derivados da paleta, em ordem de uso: alaranjado, bege, verde, tangerina, texto-médio)

### 5.5 Não-negociáveis de marca (resumo — fonte completa no skill)

Estas regras são **inquebráveis** e estão duplicadas aqui apenas como guarda-corpo de leitura rápida. A fonte real é o skill `corporis-design`.

1. Background de página = `#FAFAF8`. **Nunca `#FFFFFF`** (exceto como superfície de card sobre o canvas).
2. Background escuro = `#2A1F1A`. **Nunca `#000000`**.
3. Apenas 6 primitivos de cor: Alaranjado, Tangerina, Bege, Bege Claro, Verde + neutros. **Verde restrito** a saúde preventiva / fisio pélvica.
4. Duas typefaces apenas: **Olicy** (display) + **Ubuntu** (body). Sem terceira fonte. Sem system fallback como primária.
5. Tom: *Cuidadosa · Técnica · Acolhedora.* Sem marketing agressivo, sem countdowns, sem "últimas vagas".
6. Emoji: praticamente nunca.
7. Fotografia: fotos reais da clínica e equipe. Stock só em último caso.

### 5.6 Sobre `ui_kits/site/`

A subpasta `design-system/ui_kits/site/` é uma recriação do **site institucional** da Corporis, **não do CRM**. **Ignorar.** Não consumir componentes, estilos nem padrões dali — eles foram pensados para um produto diferente (marketing público vs. ferramenta operacional interna).

---

## 6. Como Implementar Uma Tela

Esta é a seção mais importante para a fase de desenvolvimento. **Siga o protocolo abaixo toda vez que for implementar uma tela.**

### 6.1 Mapa Tela → Mockup → Rota

| # | Mockup de referência | Rota | Função |
| --- | --- | --- | --- |
| 01 | `design-system/screens/01 Login.html` | `/login` | Autenticação Supabase |
| 02 | `design-system/screens/02 Dashboard.html` | `/dashboard` | Visão de captação |
| 03 | `design-system/screens/03 Inbox WhatsApp.html` | `/inbox` | Conversas com handoff IA↔humano |
| 04 | `design-system/screens/04 Funil.html` | `/funil` | Kanban de leads |
| 05 | `design-system/screens/05 Ficha do Lead.html` | `/leads/[id]` | Detalhe + timeline unificada |
| 06 | `design-system/screens/06 Agenda.html` | `/agenda` | Slots de avaliação |
| 07 | `design-system/screens/07 Agente de IA.html` | `/config/agente` | Configuração do agente |
| 08 | `design-system/screens/08 Configurações.html` | `/config/sistema` | Usuários, WhatsApp, templates, clínica |

### 6.2 Protocolo de implementação

Os HTMLs em `design-system/screens/` são **referência visual e de comportamento, não código de produção**. Ao implementar uma tela:

1. **Invoque o skill `corporis-design`** para carregar as regras de marca.
2. **Abra o HTML correspondente** em `design-system/screens/`. Leia layout, hierarquia, copy, estados (hover, vazio, carregando, erro).
3. **Consulte componentes isolados** em `design-system/preview/` quando precisar do detalhe de um botão, badge, input, card.
4. **Reimplemente com a stack do projeto:** Next.js App Router + shadcn/ui + Tailwind 4, consumindo tokens via classes utilitárias / variáveis CSS de `colors_and_type.css`.
5. **Nunca copie HTML/CSS direto.** Traduza para componentes React idiomáticos. Server Components por padrão; `'use client'` só onde há interatividade.
6. **Preserve fielmente:** layout, hierarquia visual, copy em português, estados visuais. Pequenos ajustes funcionais (acessibilidade, responsividade, integração com dados reais) são esperados e bem-vindos.
7. **Em caso de divergência entre mockup e este `CLAUDE.md`:** o `CLAUDE.md` vence em decisões de produto/arquitetura; o mockup vence em decisões visuais. Em dúvida, pergunte.

### 6.3 Antes de marcar uma tela como pronta

Checklist mínimo:
- [ ] Layout fiel ao mockup em desktop 1440px
- [ ] Tokens consumidos apenas via variáveis CSS / classes do design system — zero hex hardcoded
- [ ] Copy idêntica à do mockup (ou melhor, dentro do tom da marca)
- [ ] Estados de hover, foco, vazio, carregando e erro implementados
- [ ] Tipagem TypeScript estrita, sem `any`
- [ ] Inputs externos validados com Zod
- [ ] Acessibilidade básica (labels, foco visível, navegação por teclado)
- [ ] Funciona com dados reais do Supabase (não só com mock)

---

## 7. Modelo de Dados (schema `crm`)

Todas as tabelas no schema `crm`. Convenções: `snake_case`, PK `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`, soft-delete via `archived_at` quando fizer sentido.

### `crm.profiles`
Usuários do sistema (espelha `auth.users`).
- `id` (uuid, = auth.users.id) · `nome` · `email` · `avatar_url`
- `role` (text, default `'staff'`) — **MVP usa só `staff`**. Valores futuros: `recepcao`, `profissional`, `gestao`. Campo já existe para não exigir migration depois.
- `ativo` (bool)

### `crm.leads`
O registro central — um lead/potencial aluna.
- `id` · `nome` · `telefone` (E.164, único) · `email` (nullable)
- `estagio` (enum: `novo`, `qualificacao`, `avaliacao_agendada`, `compareceu`, `convertido`, `perdido`)
- `origem` (enum: `whatsapp`, `instagram`, `indicacao`, `google`, `outro`)
- `interesse` (enum: `pilates`, `pilates_gestante`, `fisio_pelvica`, `indefinido`)
- `motivo_perda` (text, nullable — preenchido só se `estagio = perdido`)
- `score_qualificacao` (int 0–100, nullable — preenchido pela IA)
- `responsavel_id` (fk profiles, nullable)
- `ultima_interacao_at` (timestamptz)
- `archived_at` (nullable)

### `crm.conversations`
Uma conversa de WhatsApp (1 por lead, em geral).
- `id` · `lead_id` (fk) · `evolution_chat_id` (text — id do chat na Evolution API)
- `modo` (enum: `ia`, `humano`) — controla o handoff. `ia` = agente responde; `humano` = recepção assumiu.
- `status` (enum: `aberta`, `aguardando`, `resolvida`)
- `nao_lida` (bool)
- `janela_24h_expira_at` (timestamptz, nullable — controle da janela de sessão do WhatsApp)

### `crm.messages`
- `id` · `conversation_id` (fk) · `direcao` (enum: `entrada`, `saida`)
- `autor` (enum: `lead`, `ia`, `humano`, `sistema`)
- `conteudo` (text) · `tipo` (enum: `texto`, `imagem`, `audio`, `documento`, `template`)
- `media_url` (nullable) · `evolution_message_id` (text)
- `entregue_at` · `lida_at` (nullable)

### `crm.appointments`
Slots de avaliação inicial gratuita.
- `id` · `lead_id` (fk) · `inicio` (timestamptz) · `fim` (timestamptz)
- `tipo` (enum: `avaliacao_pilates`, `avaliacao_fisio_pelvica`, `avaliacao_gestante`)
- `status` (enum: `agendado`, `confirmado`, `compareceu`, `faltou`, `cancelado`)
- `profissional_id` (fk profiles, nullable) · `observacoes` (text)
- `lembrete_enviado_at` (nullable) · `confirmacao_enviada_at` (nullable)

### `crm.activities`
Timeline unificada da ficha do lead (eventos de qualquer natureza).
- `id` · `lead_id` (fk) · `tipo` (enum: `mensagem`, `mudanca_estagio`, `agendamento`, `nota`, `campanha`, `handoff`, `sistema`)
- `descricao` (text) · `meta` (jsonb) · `autor_id` (fk profiles, nullable)

### `crm.campaigns`
Campanhas de reativação de leads inativos.
- `id` · `nome` · `descricao`
- `segmento` (jsonb — critérios: dias inativo, estágio, interesse)
- `template_id` (fk message_templates) · `status` (enum: `rascunho`, `agendada`, `enviando`, `concluida`)
- `agendada_para` (timestamptz, nullable) · `total_alvos` · `total_enviados` · `total_respostas`

### `crm.message_templates`
Templates de mensagem (incl. templates aprovados do WhatsApp).
- `id` · `nome` · `categoria` (enum: `lembrete`, `confirmacao`, `reativacao`, `boas_vindas`)
- `conteudo` (text — com placeholders `{{nome}}`, `{{data}}` etc.)
- `aprovado_whatsapp` (bool) · `whatsapp_template_name` (text, nullable)

### `crm.agent_config`
Configuração do agente de IA (linha única, singleton).
- `id` · `persona_prompt` (text — system prompt base do agente)
- `ativo` (bool — liga/desliga o agente globalmente)
- `horario_atendimento` (jsonb) · `mensagem_fora_horario` (text)
- `faq` (jsonb — lista de pergunta/resposta que alimenta o agente)
- `regras_handoff` (jsonb — gatilhos que forçam passagem para humano)

---

## 8. Row Level Security (RLS)

**RLS ativo em todas as tabelas desde o início**, mesmo com 1 papel no MVP.

- MVP: qualquer usuário autenticado (`auth.role() = 'authenticated'`) com `profiles.ativo = true` tem acesso de leitura/escrita às tabelas operacionais.
- As policies são escritas **referenciando `profiles.role`** mesmo agora — no MVP a checagem é trivial (`role IN ('staff','recepcao','profissional','gestao')`), mas a estrutura já está pronta para restringir por papel sem reescrever policy, só ajustando a condição.
- `agent_config` e `message_templates`: leitura para todos; escrita preparada para restringir a `gestao` no futuro.
- Service role (usado pelos webhooks e rotas de IA no servidor) **bypassa RLS** — essas rotas nunca recebem input direto do usuário sem validação Zod.

**Regra:** nenhuma tabela sem RLS. Nenhuma policy `using (true)` sem comentário justificando.

---

## 9. Integração WhatsApp — Evolution API

A Evolution API roda em **Docker numa VPS própria** (não na Vercel — exige processo persistente).

### Fluxo de entrada (lead → sistema)
1. Lead manda mensagem no WhatsApp.
2. Evolution API dispara webhook → `POST /api/webhook/whatsapp`.
3. A rota valida o payload (Zod), identifica/cria o `lead` e a `conversation`, grava a `message`.
4. Se `conversation.modo = 'ia'` e o agente está `ativo` → chama `/api/ai/reply`.
5. Se `modo = 'humano'` → apenas marca `nao_lida` e notifica o inbox via Supabase Realtime.

### Fluxo de saída (sistema → lead)
- Toda mensagem de saída passa pelo wrapper `lib/evolution/`.
- Respeitar a **janela de 24h**: fora da janela, só `message_templates` aprovados.
- Gravar `evolution_message_id` para rastrear entrega/leitura.

### Segurança do webhook
- Validar um header secreto compartilhado (`EVOLUTION_WEBHOOK_SECRET`).
- A rota de webhook é idempotente — dedupe por `evolution_message_id`.

### Variáveis de ambiente
```
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
EVOLUTION_WEBHOOK_SECRET=
```

---

## 10. Agente de IA

### Arquitetura
- Rota `POST /api/ai/reply` recebe `conversation_id`, monta o contexto e chama o Claude via `@anthropic-ai/sdk`.
- **Modelo:** `claude-haiku` para a maioria das mensagens (rápido, barato); escalar para `claude-sonnet` quando a mensagem dispara raciocínio mais complexo (ex.: lead com várias dúvidas técnicas encadeadas). A escolha do modelo é uma função em `lib/ai/`.
- O system prompt vem de `crm.agent_config.persona_prompt` + FAQ + contexto do lead. Nunca hardcodar o prompt no código — ele é editável pela tela de Configurações do Agente.

### Tools do agente (function calling)
O agente tem ferramentas, não responde só texto:
- `consultar_horarios_disponiveis(tipo, periodo)` — lê `appointments`/agenda.
- `agendar_avaliacao(lead_id, slot, tipo)` — cria `appointment`.
- `atualizar_interesse(lead_id, interesse)` — classifica o lead.
- `registrar_score(lead_id, score, justificativa)` — qualificação 0–100.
- `solicitar_handoff(motivo)` — passa a conversa para humano (`modo = 'humano'`), notifica o inbox.

### Regras de handoff (gatilhos que forçam humano)
- Lead pede explicitamente falar com uma pessoa.
- Pergunta clínica específica que exige um profissional (ex.: "posso fazer pilates com hérnia de disco L5?").
- Reclamação, insatisfação ou tom emocional sensível.
- O agente "não sabe" — nunca inventa. Em dúvida, faz handoff.
- Configurável em `agent_config.regras_handoff`.

### Guardrails de conteúdo (não-negociáveis)
- **Nunca** promete cura, prazo de resultado ("fim das dores em X dias") ou diagnóstico.
- **Nunca** dá orientação clínica/prescrição — isso é handoff.
- Não fala "paciente"/"patologia"; fala "aluna", "incômodo", "avaliação".
- Comunicação de fisioterapia pélvica: discreta, respeitosa, sem exposição.
- Sem urgência fabricada, sem "últimas vagas", sem caps lock.

---

## 11. Automações (Vercel Cron)

Rotas em `/api/cron/*`, disparadas por Vercel Cron:
- **Lembrete de avaliação:** 24h antes do `appointment.inicio` — envia template `lembrete`.
- **Confirmação:** ~3h antes — envia template `confirmacao` com botão de confirmar/remarcar.
- **Reativação:** roda campanhas com `status = agendada` cujo `agendada_para` chegou; segmenta `leads` inativos pelos critérios e enfileira envios.
- Todo envio respeita a janela de 24h (usa templates aprovados).
- Toda automação grava uma `activity` na timeline do lead.

---

## 12. Telas do MVP

Mapeamento completo de tela → mockup → rota está na **seção 6.1**. Resumo aqui:

| # | Rota | Função |
| --- | --- | --- |
| 01 | `/login` | Autenticação Supabase. Sem cadastro público. |
| 02 | `/dashboard` | Leads novos, taxa de conversão, origem, funil resumido, agenda do dia. |
| 03 | `/inbox` | Lista de conversas + chat ao vivo, toggle IA/humano, Realtime. |
| 04 | `/funil` | Kanban dos 6 estágios, drag-and-drop, card de lead. |
| 05 | `/leads/[id]` | Dados, timeline unificada, conversa, agendamentos, notas, ações. |
| 06 | `/agenda` | Visão semana/dia dos slots de avaliação. |
| 07 | `/config/agente` | Persona, FAQ, regras de handoff, templates, campanhas. |
| 08 | `/config/sistema` | Usuários, conexão Evolution API, dados da clínica. |

---

## 13. Persona do Agente (referência de copy)

Fonte canônica: `design-system/reference/Brand-Identity.md`.

O agente fala como a marca Corporis: *cuidadosa, técnica, acolhedora* — "uma fisioterapeuta amiga que escuta antes de prescrever". Princípios:
- **Acolhe primeiro, informa depois.** Reconhece a dor/dúvida antes da solução.
- **Específico, não vago.** "Avaliação individual de 50 min com fisioterapeuta especializada" — não "vamos cuidar de você".
- **Calma e sem pressão.** Sem urgência fake, sem exclamação em excesso.
- Trata fisioterapia pélvica com discrição e classe.

Exemplo de boas-vindas (referência da marca):
> "Olá! Aqui é da Corporis. Que bom ter você por aqui. Antes de marcarmos sua aula experimental, posso te perguntar o que te trouxe até a gente?"

---

## 14. Padrões de Código

- **TypeScript strict.** Sem `any` — usar `unknown` + narrowing ou tipo correto.
- **Server Components por padrão.** `'use client'` só quando há interatividade/estado.
- **Data fetching:** Server Components leem direto do Supabase server client; mutações e dados em tempo real no client usam TanStack Query.
- **Validação:** todo input externo (webhook, form, query param) passa por Zod antes de tocar o banco.
- **Supabase:** três clients — browser (`lib/supabase/client.ts`), server (`server.ts`), middleware (`middleware.ts`). Service role só em rotas de servidor, nunca exposto ao browser.
- **Componentes:** shadcn/ui em `components/ui` (não editar à mão sem motivo); componentes de marca em `components/corporis`.
- **Estilo:** só tokens do design system, via classes Tailwind / variáveis CSS importadas de `colors_and_type.css`. **Zero cor hardcoded.** Se precisa de um token que não existe, ver seção 5.4.
- **Nomes:** código e tipos em inglês; **conteúdo de UI, enums de domínio e dados em português** (pt-BR). Datas com `date-fns` locale pt-BR.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`...).
- **Sem `console.log`** em código de produção — usar um logger simples ou remover.

---

## 15. Variáveis de Ambiente

```
# Supabase (compartilhado com Corporis Finance)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Evolution API
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
EVOLUTION_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

`.env.local` nunca vai para o repositório. Manter um `.env.example` atualizado.

---

## 16. MCPs Recomendados (para o desenvolvimento com Claude Code)

MCPs que aceleram o trabalho do Claude Code neste projeto:
- **Supabase MCP** — inspecionar schema, rodar queries, gerar tipos, aplicar migrations direto do Claude Code. O mais importante.
- **Filesystem MCP** — já nativo do Claude Code.
- **GitHub MCP** — issues, PRs, revisão (se o repo estiver no GitHub).
- **Context7 MCP** (ou similar) — documentação atualizada de Next.js 15 / Tailwind 4 / shadcn, evita código baseado em API antiga.
- **Playwright MCP** — testes de fluxo end-to-end das telas, opcional no MVP.

Configurar em `.mcp.json` na raiz. A Evolution API **não tem MCP** — a integração é via REST, encapsulada em `lib/evolution/`.

---

## 17. Roadmap Pós-MVP (não implementar agora)

Ordem sugerida de evolução:
1. **Multi-papel real** — ativar `recepcao`/`profissional`/`gestao` e restringir RLS por papel.
2. **Gestão de pacientes ativos** — planos de tratamento, pacotes, presença recorrente.
3. **Integração com o Corporis Finance** — lead convertido → receita no Finance via view read-only.
4. **Relatórios avançados** — coorte de conversão, ROI por origem, previsão de receita.
5. **Agente proativo** — IA inicia contato (follow-up automático de lead frio dentro da janela).
6. **App mobile** ou PWA para a recepção.

---

## 18. Como Trabalhar Neste Projeto (instruções ao Claude Code)

1. Leia este arquivo inteiro antes de qualquer tarefa.
2. **Para qualquer decisão visual, invoque o skill `corporis-design`** antes de codificar. Ele carrega as regras de marca e os tokens.
3. **Para implementar uma tela do MVP, siga o protocolo da seção 6.2** sem pular passos.
4. Nunca introduza cor, fonte ou espaçamento fora do design system. Nunca redefina tokens — consuma sempre de `design-system/colors_and_type.css`.
5. Nunca crie tabela sem RLS. Nunca rode migration fora do schema `crm`.
6. Todo input externo é validado com Zod antes de tocar o banco.
7. Respeite o escopo do MVP (seção 1). Funcionalidade de roadmap não entra "de brinde".
8. A copy do produto e do agente segue o tom da marca (seções 1 e 13) — cuidadosa, técnica, acolhedora; nunca "academia", nunca promessa de cura.
9. A pasta `design-system/ui_kits/site/` é do site institucional — **ignorar** ao desenvolver o CRM.
10. A pasta `design-system/` é **read-only** do ponto de vista do desenvolvimento. Mudanças ali só após instrução explícita e com diff visível.
11. Em dúvida sobre uma decisão não documentada aqui: **pare e pergunte.** Não improvise arquitetura.
12. Ao concluir uma feature, atualize este arquivo se alguma decisão nova foi tomada.

---

*Corporis CRM · CLAUDE.md v2.0 · Documento vivo — versionar junto com o código.*
