# IMPLEMENTATION.md — Corporis Conteúdo

Sequência de implementação do módulo. Siga **um milestone por vez**, nessa ordem — cada um
depende do anterior. Marque as caixas conforme for concluindo; isso é o que dá ao Claude Code
(e a você) visibilidade de onde parou entre sessões.

> Antes de cada milestone maior (M6 em diante), vale rodar em **plan mode** primeiro e revisar
> o plano antes de deixar o Claude Code executar. Depois de fechar um milestone, **commit**
> antes de seguir para o próximo — isso mantém o estado do código e o checklist sincronizados.

Contexto completo de decisões, schema e regras: ver `@CLAUDE.md` nesta mesma pasta.

---

## M0 — Fundação do módulo
- [x] Criar a rota `app/conteudo` (ou equivalente) dentro do Corporis OS.
- [x] RLS no Supabase restrita a Bruno e Larissa (reaproveitar auth do OS).
- [x] Criar bucket público `corporis-conteudo` no Supabase Storage.
- [x] Instalar dependências: `@vercel/og`, `sharp`, SDKs Gemini/OpenAI/Anthropic.
- [x] Variáveis de ambiente (§10 do CLAUDE.md).
**Feito quando:** rota vazia sobe, autenticação funciona, upload de teste no bucket é acessível por URL pública.

## M1 — Schema & seed
- [x] Migrations Supabase para todas as tabelas do schema `conteudo` (§4 do CLAUDE.md).
- [x] Seed dos 7 pilares editoriais (§7).
- [x] Seed dos templates de slide base (capa, conteúdo, citação, CTA).
**Feito quando:** todas as tabelas existem, RLS testada, seed visível via Supabase Studio.

## M2 — Design tokens do módulo
- [x] Extrair os tokens reais (cor, tipografia, espaçamento) das telas já geradas no Claude Design.
- [x] Atualizar §3 do CLAUDE.md com os hexes definitivos (hoje são proposta).
- [x] Configurar tokens no Tailwind v4 do módulo, reaproveitando shadcn/ui do OS.
**Feito quando:** um componente de teste renderiza com a paleta e tipografia definitivas.

## M3 — Configurações (pilares, marca, tom de voz)
- [x] CRUD de `pilar_editorial`.
- [x] Tela de edição dos tokens de marca com preview. *(decisão: aba Marca é só leitura — cor de marca não é editável em nenhuma tela do OS hoje, ver §5.4 do CLAUDE.md raiz; preview é estático, não reage a edição de token)*
- [x] Campo de tom de voz que alimenta os prompts de IA. *(campo salvo em `conteudo.marca_config`; consumo pelo prompt de IA entra quando a geração de copy for implementada, M10)*
**Feito quando:** dá pra criar/editar/desativar um pilar e ver o preview mudar.

## M4 — Banco de ideias
- [x] CRUD de `ideia` (manual).
- [x] "Colar referência" → cria ideia a partir de link.
- [x] Botão "Gerar sugestões" via Anthropic SDK, a partir dos pilares ativos. *(chamada real à API não testada nesta sessão — validado só o parsing/schema; testar com uso real)*
**Feito quando:** as 3 origens (manual, importada, sugerida) aparecem corretamente na tela.

## M5 — Referências (swipe file)
- [x] CRUD de `referencia` (manual).
- [x] Aba "Descobertas" como estado "em breve" (Fase 2).
- [x] Ação "Virar ideia" cria registro em `ideia`.
**Feito quando:** salvar uma referência e transformá-la em ideia funciona ponta a ponta.

## M6 — Calendário editorial
- [x] Grid semanal/mensal de `slot_calendario`. *(grid mensal — cada semana é uma linha; navegação mês a mês por querystring)*
- [x] Criar slot ao clicar em dia vazio; reagendar por drag-and-drop.
- [x] Filtro por pilar e status.
**Feito quando:** dá pra ver a semana com ~5 slots coloridos por pilar e mover um post entre dias.

## M7 — Motor de geração de imagem
- [x] Prompt builder: briefing + pilar + template → prompt de imagem.
- [x] Router de provedor: Gemini (padrão) / OpenAI (premium), com fallback em caso de erro.
- [x] `geracao_imagem` com versionamento (cada "gerar de novo" cria nova versão, sem apagar as anteriores).
**Verificado ponta a ponta de verdade** (não só tsc): gerou imagem real via OpenAI,
subiu pro bucket, URL pública respondeu 200, linha `pronto` no banco. **Gemini
(provedor padrão) está com quota 0 / billing não habilitado na chave atual** —
fallback pro OpenAI entrou em ação sozinho. Resolver o billing do Google AI
Studio/Cloud antes de depender do Gemini em produção.
**Feito quando:** um job de geração salva a imagem no bucket e aparece na tabela com status correto.

## M8 — Composição de slides (Satori)
- [x] Templates de slide em JSX renderizados via Satori → PNG (fundo IA + camada de texto/marca).
- [x] `sharp` para composição final e exportação.
- [x] Texto do slide editável sem precisar regenerar o fundo.
**Verificado ponta a ponta de verdade**: `comporSlide()` compõe um slide `capa` sem
fundo (cai no degradê do pilar) em ~250-700ms, e um slide `cta` com fundo real
(imagem fotográfica via URL, buscada pelo próprio Satori) com o mesmo tempo — nenhum
dos dois chama IA. Editar o texto e recompor sobrescreve o mesmo arquivo (mesmo
path, sem versionar — quem versiona é o fundo, no M7). 4 templates (capa, conteúdo,
citação, cta) renderizados e conferidos visualmente contra o mockup `Editor de
post.html` (proporções, tipografia, eyebrow, pill de CTA — fiéis). Fontes reais
(Quicksand 400, Ubuntu 400/500) baixadas do Google Fonts e commitadas em
`src/lib/ai/imagem/fonts/*.ttf` — Satori não lê `@font-face`/CSS, precisa do
binário. Scrim escuro (`rgba` sobre a imagem) adicionado sobre o fundo pra garantir
contraste do texto branco em fotos reais da IA — o mockup não precisava disso
porque simulava o fundo com degradê já escuro, mas fundo fotográfico real não
garante contraste sozinho.

**Dois bugs do Satori encontrados e corrigidos nesta sessão** (documentar pra não
cair de novo): (1) o shorthand CSS `inset: 0` é silenciosamente ignorado pelo
Satori — o elemento fica com tamanho zero e nada é desenhado; precisa dos 4 eixos
explícitos (`top/right/bottom/left: 0`). (2) `sharp(...).png({ quality: N })` liga
quantização de paleta (com dithering) e cria manchas/bandas visíveis em qualquer
degradê suave — usar `compressionLevel` (sem perda) em vez de `quality` pra PNG.
**Feito quando:** trocar o texto de um slide já composto gera novo PNG em segundos, sem chamar a IA de novo.

## M9 — Editor de post (tela principal)
- [x] Integrar M7 + M8 na tela "Editor de post" (trilha de slides + prévia + geração + versões).
- [x] Reordenar slides, adicionar/remover.
- [x] Seletor de versão (v1, v2, v3…) por slide.
**Rota:** `/conteudo/posts/[id]`. Entrada real: "Transformar em post" no Banco de
ideias (M4) agora navega direto pro editor do post recém-criado (`transformarEmPost`
passou a retornar `postId`). Adicionado `post.publico_alvo` (text livre, mesmo
padrão de `ideia.publico_alvo`) — campo do mockup que a tabela `post` não tinha.

Layout 3 colunas fiel ao mockup (rail de slides com drag-and-drop via
`@dnd-kit/sortable`, prévia central, painel de briefing) + rodapé de gate. Duas
adaptações conscientes em relação ao mockup: (1) texto do slide agora é editado em
inputs abaixo da prévia, não via `contenteditable` sobreposto à imagem — porque
nossa prévia é o PNG real já composto (M8), não um mock em CSS ao vivo; (2) os
botões duplicados "Gerar de novo"/"Gerar fundo" do mockup (que chamavam a mesma
função) viraram um único botão com label dinâmico. Legenda/hashtags/link
rastreável/toggles LGPD e o gate de conformidade aparecem como placeholders "em
breve" — são o escopo do M10/M11, mesmo padrão já usado na aba "Descobertas" do M5.

**Verificado ponta a ponta de verdade**: SSR real da página via `fetch` autenticado
(usuário de teste criado via Admin API, sessão via password grant, cookie
`sb-127-auth-token` no formato do `@supabase/ssr`) contra o Supabase local — HTTP
200, título/briefing/público-alvo pré-preenchidos corretos, sem regressão nas
outras rotas do módulo. Lógica das server actions mais arriscadas replicada e
testada à parte: reorder em duas fases (evita colisão com a unique `(post_id,
ordem)`) confirmado com uma reordenação real de 3 slides; `gerarFundo` completo
(prompt → IA real via OpenAI, ~41s, Gemini seguia com quota 0 → fallback → link do
`fundo_geracao_id` → recompor) confirmado ponta a ponta com URL pública 200.
**Feito quando:** dá pra montar um carrossel de 6 slides do zero, regenerar um fundo e comparar versões.

## M10 — Legenda, hashtags e link rastreável
- [x] Geração de legenda no tom acolhedor (Anthropic SDK), com CTA de agendamento.
- [x] Geração de hashtags.
- [x] Criação do link rastreável (`cta_lead` / short code) por post.
**Implementação:** `gerarLegendaEHashtags` (posts/[id]/actions.ts) usa o mesmo padrão
do `generateIdeiaSuggestions` do M4 (Anthropic + tom de marca + regras
inquebráveis + roteiro dos slides como contexto), retorna JSON `{legenda,
hashtags}`. Hashtags editáveis manualmente (chips, adicionar/remover). Link
rastreável: `cta_lead` criado junto com o post em `transformarEmPost` (short code
de 6 chars, alfabeto sem caracteres ambíguos, `src/lib/short-code.ts`), exibido
como `{NEXT_PUBLIC_APP_URL}/l/{short_code}` com botão copiar. Rota pública
`src/app/l/[short_code]/route.ts` (fora de `(app)`/`(auth)` — mesmo padrão do
`anamnese/[token]` já existente no OS): valida o código, incrementa `cliques`,
resolve o pilar do post e redireciona (307) pro WhatsApp da clínica
(`crm.clinic_config.telefone`) com mensagem pré-preenchida mencionando o pilar;
código inválido ou não encontrado cai num fallback genérico em vez de 404 (link
de marketing não deve virar dead-end). `pessoa_id`/`virou_agendamento` em
`cta_lead` ficam pro M14 (atribuição de lead).

**Verificado ponta a ponta de verdade**: legenda+hashtags gerados via Anthropic
real (não just parsing), redirect público testado sem cookie (rota pública de
verdade) confirmando Location correto pro wa.me com o pilar certo na mensagem e
incremento real do contador de cliques no banco, fallback genérico testado com
código inexistente, e SSR autenticado da página confirmando legenda/hashtags/link
renderizados.
**Feito quando:** o post tem legenda, hashtags e um link `/l/{short_code}` funcional.

## M11 — Gate de conformidade (COFFITO + LGPD)
- [x] Implementar as regras de bloqueio/alerta do §8 do CLAUDE_1.md como função de validação.
- [x] UI da faixa de conformidade (verde/âmbar/vermelho) no editor.
- [x] Bloquear "Enviar para aprovação" enquanto houver `bloqueio` aberto.
**Implementação:** `src/lib/conteudo/gate.ts` — `avaliarConformidade()` é uma
função pura (sem I/O), usada tanto no client (footer reativo, recalcula a cada
edição de texto/toggle, sem round-trip) quanto no server (`enviarParaAprovacao`,
que nunca confia no client — revalida tudo contra o banco). 7 regras fixas
(3 bloqueio + 2 alerta COFFITO, 1 bloqueio + 1 alerta LGPD), heurística por
palavra-chave normalizada (sem acento/caixa) — documentado no código como
heurística, não NLP. Adicionado `post.lgpd_usa_depoimento` +
`post.lgpd_consentimento_ref` (toggle + campo de referência, mockup só tinha os 2
toggles mas o schema pede uma referência de texto, não só booleano). Toda
tentativa de envio grava as 7 linhas em `checklist_conformidade` (audit trail
cumulativo, nunca sobrescreve) e só transiciona `post.status → em_aprovacao` se
não houver bloqueio.
**Verificado ponta a ponta de verdade**: casos unitários das duas frases do
"Feito quando" (cura garantida / depoimento sem referência) confirmados bloqueando;
fluxo real gravando no banco (texto ruim → recusado, 7 linhas persistidas, status
inalterado → texto corrigido → aceito, 14 linhas acumuladas, status vira
`em_aprovacao`); SSR autenticado confirmando toggle LGPD, faixa COFFITO/LGPD e
estado "Enviado para aprovação" renderizados.
**Feito quando:** um texto com "cura garantida" é barrado; um depoimento sem `consentimento_lgpd_ref` é barrado.

## M12 — Prévia & aprovação
- [ ] Mock fiel do post (frame de feed, carrossel navegável).
- [ ] Ações: Aprovar / Gerar de novo / Reprovar (com motivo).
- [ ] Atualização de status na máquina de estados (§6).
**Feito quando:** aprovar um post muda o status e ele aparece como "Aprovado" no calendário.

## M13 — Export do pacote (publicação manual — Fase 1)
- [ ] Botão que gera um pacote para download: PNGs dos slides + legenda + hashtags + link.
**Feito quando:** o pacote baixado tem tudo pronto para colar no Instagram manualmente.

## M14 — Métricas & atribuição de leads
- [ ] Ponte com `core.pessoa` do Corporis OS: lead que clicou no link e virou agendamento marca `origem_post_id`.
- [ ] Dashboard: ranking "posts que mais trouxeram leads".
- [ ] Entrada manual de alcance/saves/impressões (marcado como "manual" até a Fase 2).
- [ ] Botão "Aprender com os melhores" → transforma top posts em novas ideias.
**Feito quando:** um lead de teste que passou pelo link aparece atribuído ao post certo no ranking.

## M15 — Polish & QA
- [ ] Responsivo mobile em todas as telas.
- [ ] Foco de teclado visível, estados vazios revisados.
- [ ] Passagem ponta a ponta com Bruno e Larissa: ideia → post publicado manualmente → lead atribuído.
**Feito quando:** um post real passa pelo fluxo inteiro sem gambiarra manual fora do sistema.

---

## Fase 2 (não entra nesta sequência)
Auto-publish via Graph API · n8n para cron de publicação e coleta de insights · descoberta
automática de referências · stories/reels. Ver §9 do CLAUDE.md.
