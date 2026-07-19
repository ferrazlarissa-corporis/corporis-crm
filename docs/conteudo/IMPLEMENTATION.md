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
- [ ] Templates de slide em JSX renderizados via Satori → PNG (fundo IA + camada de texto/marca).
- [ ] `sharp` para composição final e exportação.
- [ ] Texto do slide editável sem precisar regenerar o fundo.
**Feito quando:** trocar o texto de um slide já composto gera novo PNG em segundos, sem chamar a IA de novo.

## M9 — Editor de post (tela principal)
- [ ] Integrar M7 + M8 na tela "Editor de post" (trilha de slides + prévia + geração + versões).
- [ ] Reordenar slides, adicionar/remover.
- [ ] Seletor de versão (v1, v2, v3…) por slide.
**Feito quando:** dá pra montar um carrossel de 6 slides do zero, regenerar um fundo e comparar versões.

## M10 — Legenda, hashtags e link rastreável
- [ ] Geração de legenda no tom acolhedor (Anthropic SDK), com CTA de agendamento.
- [ ] Geração de hashtags.
- [ ] Criação do link rastreável (`cta_lead` / short code) por post.
**Feito quando:** o post tem legenda, hashtags e um link `/l/{short_code}` funcional.

## M11 — Gate de conformidade (COFFITO + LGPD)
- [ ] Implementar as regras de bloqueio/alerta do §8 do CLAUDE.md como função de validação.
- [ ] UI da faixa de conformidade (verde/âmbar/vermelho) no editor.
- [ ] Bloquear "Enviar para aprovação" enquanto houver `bloqueio` aberto.
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
