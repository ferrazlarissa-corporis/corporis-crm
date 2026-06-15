# docs/prompts-telas.md — Prompts de Claude Design (Corporis OS)

Telas **novas** do Corporis OS, na numeração que continua a de
`design-system/screens/` (o MVP do CRM ocupa 01–08). Cada prompt gera o **mockup
HTML** da tela; salve em `design-system/screens/NN Nome.html`. Depois implementa-se
em React/shadcn pelo **protocolo do `CLAUDE.md` §6.2** (nunca copiar HTML direto).

Como usar no Claude Design: com o skill **`corporis-design`** carregado, cole o
BLOCO BASE e em seguida o prompt da tela.

---

## BLOCO BASE (colar antes de cada tela)

> Você está desenhando uma tela nova do **Corporis OS**, que nasce como evolução do
> Corporis CRM. Use **estritamente** o design system Corporis (skill `corporis-design`):
> tokens de `colors_and_type.css`, Quicksand (display) + Ubuntu (corpo), ícones
> Lucide stroke 1.5, paleta terrosa fechada, canvas `#FAFAF8` (branco só dentro de
> card), Verde apenas em fisio pélvica, base-8, raios suaves, sombras baixas e
> quentes, movimento calmo. Sem emoji. pt-BR. Tom Cuidadosa · Técnica · Acolhedora.
>
> **Mantenha o mesmo shell das telas existentes 02–08:** sidebar 264px + topbar
> 64px, item ativo com fundo Bege Claro e barra Alaranjado 2px à esquerda. A
> navegação agora é **agrupada**: GESTÃO (Dashboard, Clientes, Agenda, Vendas) ·
> RELACIONAMENTO (Inbox, Funil, Agente de IA) · FINANCEIRO (Lançamentos, DRE) ·
> CADASTROS (Planos, Modelos de contrato, Serviços, Profissionais, Salas) · rodapé
> Configurações + bloco de usuário.
>
> **Terminologia:** aluna = Pilates/gestante; paciente = Fisio pélvica; "cliente"
> quando genérico. Dados de exemplo brasileiros e realistas. Entregue HTML estático
> fiel aos tokens, responsivo, pronto para virar componente React/shadcn.

---

## GESTÃO DE CLIENTES

**09 — Clientes (lista)** · `/clientes`
> Tela "Clientes" (nav ativo). Topbar: título, busca, botão Alaranjado "Novo
> cliente". Chips de filtro (Todos · Ativos · Inativos · Pilates · Gestante · Fisio
> pélvica) + contador. Tabela em card: Cliente (avatar+nome+badge aluna/paciente),
> Plano ativo, Profissional, Status (badge Ativo verde / Inativo cinza), Próximo
> agendamento, Financeiro (em dia / atrasado). Linha clicável, hover suave, ~8 linhas.

**10 — Cadastro de cliente** · `/clientes/novo`
> Formulário multi-etapa (stepper calmo): 1) Dados pessoais (nome, nascimento, CPF,
> telefone/WhatsApp, e-mail, gênero), 2) Endereço, 3) Contexto clínico inicial
> (pilar, queixa principal, origem/indicação), 4) Consentimento LGPD. Labels
> ALL-CAPS Bege, foco anel Alaranjado. Rodapé: Voltar (outline) + Avançar/Salvar
> (Alaranjado). Renderize a etapa 1.

**11 — Ficha do cliente (shell + Visão geral)** · `/clientes/[id]`
> Espelha o padrão da tela 05 (Ficha do Lead). Header: avatar grande, nome (display),
> badges (tipo, Status, pilar), contato rápido, ações (Editar · Novo agendamento ·
> Gerar contrato). Abas: Visão geral · Dados pessoais · Plano ativo · Financeiro ·
> Anamnese · Prontuário · Evoluções · Documentos · Contrato · Relatório. Renderize
> "Visão geral": cards (plano + vigência, próximos agendamentos, situação financeira,
> pendências de onboarding) + timeline curta de atividades.

**12 — Ficha: aba Plano ativo**
> Card do plano: nome, tipo (recorrente/personalizado), valor, periodicidade,
> sessões/semana, serviços inclusos, início, renovação, profissional. Ações:
> Renovar · Trocar · Cancelar. Abaixo, histórico de planos em lista discreta.

**13 — Ficha: aba Financeiro**
> Resumo (total no mês, em aberto, situação). Tabela de lançamentos: competência,
> descrição, valor, vencimento, status (badge a receber / recebido / atrasado),
> ação "Marcar como recebido". Deixe explícito que é **sinalização**, não cobrança.

**14 — Ficha: aba Anamnese**
> Formulário clínico em seções colapsáveis (queixa, histórico, cirurgias,
> medicamentos, gestação quando aplicável, atividade física, objetivos). Indicador
> de versão e data. Faixa discreta de confidencialidade. Botão "Salvar anamnese".

**15 — Ficha: abas Prontuário e Evoluções**
> Aba "Evoluções": timeline de atendimentos (data, profissional, serviço, texto).
> Botão "Nova evolução" abre editor (mostre aberto). Fisio pélvica com acentos
> Verde. Faixa de confidencialidade. 3–4 evoluções de exemplo.

**16 — Ficha: aba Documentos**
> Grade de cards de arquivo (exame/atestado/laudo) com ícone, nome, data, tamanho,
> ações (ver/baixar). Área de upload drag-and-drop discreta no topo. Nota de
> arquivos privados (URL assinada).

**17 — Ficha: aba Contrato**
> Timeline de estado (Rascunho → Enviado → Assinado). Card com dados do contrato
> (modelo usado, plano, valor, vigência). Botão "Gerar e enviar para assinatura"
> (ZapSign); quando assinado, link da via. Mostre o estado "Enviado, aguardando".

---

## AGENDA

**18 — Agenda completa** · `/agenda`
> Evolui a tela 06. Grade semanal 07:00–19:00 (1h=60px). Filtros: profissional,
> sala, pilar. Blocos por serviço (cores dos tokens). **Capacidade visível:** blocos
> de Pilates mostram lotação "3/4" e podem ter até 4 pessoas no mesmo slot (chip
> "AULA EXPERIMENTAL" quando houver); Fisio pélvica = 1/slot (Verde). Clique abre
> popover. Botão "Novo agendamento" (Alaranjado).

**19 — Novo agendamento (modal)** · `/agenda`
> Modal (backdrop Espresso 55%, slide-up 12px). Campos: cliente (busca puxa pessoa
> existente), serviço, profissional, sala, data/horário, recorrência (nenhuma /
> semanal / 2x semana), observações. Pilates: mostrar lugares livres no slot; Fisio:
> bloquear se já há 1. Opção "Aula experimental" (vincula lead). Cancelar + Confirmar.

**20 — Detalhe do agendamento (popover)** · `/agenda`
> Popover: serviço+cor, data/horário, profissional, sala, participantes do slot
> (avatares+nomes+tipo), plano vinculado, status. Ações: Concluir (gera evolução
> pendente) · Reagendar · Cancelar.

---

## VENDAS

**21 — Planos (catálogo + cadastro)** · `/vendas/planos`
> Cards de plano (nome, badge Recorrente/Personalizado, valor, periodicidade,
> sessões/semana, serviços, status), barra de acento no pilar. "Novo plano" abre
> painel lateral de cadastro com esses campos.

**22 — Nova venda / adesão (wizard)** · `/vendas/nova`
> Wizard: 1) cliente (busca), 2) plano (ou personalizado), 3) condições (valor,
> desconto, dia de vencimento, início), 4) revisão — mostra o que será criado:
> matrícula, lançamentos a receber e contrato (escolher modelo). Renderize a revisão
> com botão "Confirmar venda".

**23 — Vendas / assinaturas (lista)** · `/vendas`
> Cards de resumo (assinaturas ativas, MRR, cancelamentos no mês). Tabela: cliente,
> plano, valor, periodicidade, início, próxima cobrança, status (ativa/pausada/
> cancelada). Filtros por status e pilar.

---

## CADASTROS GERAIS

**24 — Serviços** · `/cadastros/servicos`
> Cadastro de serviços (a capacidade da agenda vem daqui). Lista/cards: nome, pilar,
> duração, **capacidade por slot** (Pilates até 4 / Fisio 1), cor (seletor da paleta
> da marca), vínculo com planos. Painel de cadastro.

**25 — Profissionais** · `/cadastros/profissionais`
> Cadastro: avatar, nome, especialidade, CREFITO, pilares atendidos,
> disponibilidade semanal (grade simples de dias/horários). Lista em cards + painel.

**26 — Salas** · `/cadastros/salas`
> Cadastro: nome, capacidade, equipamentos (chips), pilares compatíveis, status.
> Lista + painel.

**27 — Modelos de contrato** · `/cadastros/contratos`
> Lista de modelos (nome, planos/serviços vinculados, status). Editor de modelo:
> nome, corpo com campos de mesclagem destacados (`{{cliente}}`, `{{plano}}`,
> `{{valor}}`, `{{vigencia}}`, `{{servicos}}`, `{{clinica}}`), vínculo a planos/pilares.
> Pré-visualização do contrato preenchido ao lado.

---

## TRANSVERSAL

**28 — Dashboard de gestão** · `/dashboard`
> Evolui a tela 02. Linha de KPIs: Clientes ativos, Ocupação da agenda (semana),
> Receita recorrente (MRR), Inadimplência sinalizada, Conversão de leads. Abaixo:
> gráfico calmo de ocupação por dia, agendamentos de hoje, pendências
> (anamneses/contratos em aberto). Paleta terrosa; Verde só em sucesso/fisio.

**29 — Onboarding ao converter lead** · `/clientes/onboarding`
> Checklist que aparece quando a lead vira cliente: confirma dados herdados do funil
> + passos pendentes (Preencher anamnese · Definir plano · Gerar contrato · 1º
> agendamento), cada um com ação que leva à tela. Tom acolhedor, não burocrático.
