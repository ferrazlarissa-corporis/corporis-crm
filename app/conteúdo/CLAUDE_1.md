# CLAUDE.md — Corporis Conteúdo

Módulo de **produção de conteúdo para Instagram** (carrossel + estático) do ecossistema
**Corporis OS**. Fase 1 foca em produzir posts on-brand, com aprovação interna e atribuição
de leads. Publicação automática e automações via n8n ficam para a Fase 2.

> **Nome interno:** `conteudo` (módulo do Corporis OS). Renomeável.
> **Sequência de implementação:** ver @IMPLEMENTATION.md nesta mesma pasta — siga um milestone por vez.

---

## 1. Decisões travadas (não reabrir sem avisar)

| # | Decisão |
|---|---------|
| Escopo | Módulo dentro do **Corporis OS** (mesma auth, Supabase, design system). Não é app separado. |
| Formatos | **Carrossel** (até 10 slides) e **estático** (1 imagem). Sem reels/vídeo/stories na Fase 1. |
| Composição | **Programática** (template nosso + IA só para fundo/ilustração). NÃO gerar slide com texto 100% por IA. |
| Volume | ~**5 posts/semana**. |
| Usuários | Apenas **Bruno** e **Larissa**. Aprovação **dentro do sistema**, sem fluxo externo/burocracia. |
| Fotos | Clínica tem banco de fotos. Conteúdo é **mix** (foto real + ilustração/fundo IA). |
| Público | **Feminino** em primeiro lugar. Pilates + **fisioterapia pélvica**. |
| Temas | Gestante (grande), dor lombar/ciático/postura, incontinência urinária, dispareunia (dor na relação). |
| Tom | **Acolhedor**, não técnico, fala com o cliente final (não com a concorrência). |
| Compliance | Gate obrigatório **COFFITO (Res. 516/2020) + LGPD** antes de aprovar. |
| Publicação | **Manual na Fase 1** (sistema entrega o pacote pronto). Auto-publish via Graph API = Fase 2. |
| Automação | n8n (VPS Hostinger) para cron de publicação/métricas = **Fase 2**. |
| Métrica nº 1 | **Agendamentos / leads** (não vaidade). Todo post carrega link rastreável. |
| IA de imagem | Router **Nano Banana (Gemini) como padrão** (eficiência) + **OpenAI GPT Image** como premium/fallback. |

---

## 2. Stack

- **App:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · tokens **OKLCH**.
- **Dados/Infra:** Supabase — Postgres · Auth · Realtime · **Storage** (bucket público, ver §4).
- **Composição de slide:** **Satori (`@vercel/og`)** para renderizar JSX → SVG → PNG com fontes próprias, + **`sharp`** para compor camadas (fundo IA + template) e processar/exportar.
- **Geração de imagem (fundo/ilustração):** router com dois provedores:
  - Primário: **Gemini** (Nano Banana — `gemini-2.5-flash-image` ou versão vigente). Bom texto/diagrama, barato, rápido.
  - Premium/fallback: **OpenAI** (`gpt-image-1`).
- **LLM (copy/ideias/prompts):** **Anthropic SDK** (mesmo padrão do OS).
- **Automação (Fase 2):** **n8n** no VPS Hostinger para agendar publicação e puxar insights.

> Por que Satori e não gerar o slide inteiro por IA: composição programática garante marca
> 100% consistente, texto sempre legível e **editável** (troca copy sem regenerar imagem).
> A IA entra só onde agrega — fundo, textura, ilustração.

---

## 3. Identidade visual de conteúdo (PROPOSTA — validar contra o feed real)

Herda a marca Corporis e adiciona um recorte **feminino/acolhedor** para a vertical pélvica e gestante.
Confirmar os hexes exatos com o design system do Corporis OS.

**Paleta (tokens):**
- `--marca-terracota` (primária, acolhimento): `#C9724F` *(confirmar com laranja do OS)*
- `--marca-areia` (fundo claro): `#F5EFE6`
- `--marca-salvia` (secundária, calma/saúde): `#7C9885`
- `--marca-blush` (**acento feminino — pélvica/gestante**): `#E8C5C0`
- `--marca-carvao` (texto): `#2E2A26`

O **blush** é a assinatura que diferencia a marca do "cream + terracota" genérico: usado com
restrição nos pilares de saúde pélvica e gestante.

**Tipografia:** Fraunces (display, soft serif, com restrição) + Ubuntu (corpo). Continuidade com o OS.

**Estilo de imagem:** foto real da clínica tratada com leve calor + ilustração/fundo IA em traço
suave e orgânico. Nada clínico-frio; nada estridente.

**Grid do feed:** alternância intencional entre foto humanizada, card educativo e peça ilustrada,
mantendo o blush/salvia como fio condutor visual.

---

## 4. Arquitetura de dados (schema `conteudo`)

Storage: bucket público **`corporis-conteudo`** (imagens geradas precisam de URL pública para o
export/preview e para a publicação da Fase 2).

Tabelas:

- **`pilar_editorial`** — `id, nome, descricao, cor_token, ativo`
- **`ideia`** — banco de ideias. `id, titulo, angulo, pilar_id, publico_alvo, origem (manual|import|sugestao), status (nova|selecionada|virou_post|descartada), notas, created_by`
- **`referencia`** — swipe file. `id, url, fonte, print_url, pilar_id, por_que_funciona, origem (manual|descoberta), tags[]`
- **`post`** — máquina de estados (ver §6). `id, titulo, formato (carrossel|estatico), pilar_id, ideia_id, briefing, legenda, hashtags[], status, aprovado_por, agendado_para, publicado_em`
- **`post_slide`** — `id, post_id, ordem, template_id, texto_titulo, texto_corpo, fundo_geracao_id, imagem_url`
- **`template_slide`** — `id, nome, tipo (capa|conteudo|citacao|cta), layout_json` *(`citacao` no lugar de `prova_social` — nome real usado no array `TEMPLATES` de `Editor de post.html`)*
- **`geracao_imagem`** (image jobs, suporta "gerar de novo"). `id, post_id, slide_id, prompt, provedor (gemini|openai), modelo, versao, status (fila|processando|pronto|erro), imagem_url, custo, created_at`
- **`checklist_conformidade`** — resultado do gate. `id, post_id, regra, resultado (ok|alerta|bloqueio), detalhe, consentimento_lgpd_ref`
- **`slot_calendario`** — `id, data, horario, pilar_sugerido, post_id (nullable), status`
- **`publicacao`** — `id, post_id, ig_media_id (Fase 2), publicado_em, canal`
- **`metrica`** — série temporal. `id, post_id, data, alcance, impressoes, curtidas, saves, comentarios, visitas_perfil, cliques_link`
- **`cta_lead`** — **atribuição**. `id, post_id, short_code, cliques, pessoa_id (FK core.pessoa do OS), virou_agendamento (bool), created_at`

**Ponte com o Corporis OS (one-way, mesma filosofia do `fin-corporis`):** cada post gera um link
rastreável (`/l/{short_code}` → fluxo de agendamento com `?src=ig&post={id}`). Quando o lead vira
`core.pessoa`, grava `origem_post_id`. Assim medimos **lead por post** já na Fase 1, sem depender
da Graph API.

---

## 5. Módulos funcionais

1. **Linha editorial** — pilares (§7), tom de voz, público-alvo por pilar.
2. **Banco de ideias** — entrada **manual** + **import** (colar referência que vira ideia) + sugestões da IA a partir dos pilares.
3. **Referências / swipe file** — salvar manualmente + descoberta (Fase 1 simples; robusta na Fase 2).
4. **Calendário editorial** — grade com slots, 5/semana, distribuição por pilar.
5. **Gerador de prompt** — a partir do briefing + pilar + template, monta o prompt de imagem (fundo/ilustração) para o provedor.
6. **Geração + prévia + regenerar** — `geracao_imagem` versionada; botão "gerar de novo" cria nova versão sem perder as anteriores.
7. **Composição de slides** — Satori aplica o template on-brand sobre o fundo; texto editável direto.
8. **Legenda + hashtags + hook** — geradas pela IA no tom acolhedor, com CTA de agendamento.
9. **Gate de conformidade** — roda §8 antes de permitir aprovação. `bloqueio` trava; `alerta` pede confirmação.
10. **Aprovação** — Bruno/Larissa aprovam dentro do sistema.
11. **Publicação (Fase 1)** — exporta o pacote: PNGs dos slides + legenda + hashtags + link rastreável, pronto para postar manual.
12. **Métricas** — Fase 1 com entrada manual/importação; foco em **leads atribuídos**. Fase 2 puxa insights via Graph API.
13. **Loop de aprendizado** — posts com mais leads/saves viram sugestões no banco de ideias.

---

## 6. Máquina de estados do `post`

```
rascunho → briefing → gerando → previa → em_aprovacao → aprovado → agendado → publicado
                          ↑__________________|  (gerar de novo / editar)
                                                     ↓
                                                 reprovado
estados transversais: erro · arquivado
```

- **gerando → previa:** ao concluir `geracao_imagem`.
- **previa → em_aprovacao:** exige gate de conformidade sem `bloqueio`.
- **em_aprovacao → aprovado:** ação de Bruno/Larissa.
- **"gerar de novo":** volta a `gerando` criando nova `versao`, preservando o histórico.

---

## 7. Pilares editoriais (definitivo — seedado em M1)

Tudo em PT-BR, tom acolhedor, falando com o cliente final. Foco no público feminino.

> Substitui a proposta original desta seção. Os 7 pilares abaixo são os que já
> estavam codificados nos mockups HTML (`app/conteúdo/*.html`, array `PILLARS`
> em `Corporis Conteúdo - Banco de ideias.html`), cada um com `cor_token` próprio
> na paleta (`--pillar-*`). Mantidos como fonte da verdade pra bater com as telas.

1. **Diástase abdominal** (`pillar-diastase`) — recuperação do abdômen no pós-parto.
2. **Fisio pélvica** (`pillar-pelvica`) — incontinência, dor na relação. Informativo, empático, **sem sensacionalismo**.
3. **Postura no trabalho** (`pillar-postura`) — dor lombar, ciático, postura de quem passa o dia sentada.
4. **Pilates gestante** (`pillar-gestante`) — preparo para o parto, recuperação, acompanhamento por fase da gestação.
5. **Pilates terapêutico** (`pillar-terapeutico`) — fortalecimento e reabilitação sob orientação individual.
6. **Saúde preventiva** (`pillar-preventiva`) — cuidado contínuo, antes do incômodo aparecer.
7. **Bastidores & equipe** (`pillar-bastidores`) — a Larissa, o ambiente, a equipe, humanização.

**Voz:** "você" direto, frases curtas, empatia com o desconforto, esperança realista.
Nunca prometer cura. Nunca alarmar. Especialmente cuidadoso nos pilares 1 e 2.

---

## 8. Gate de conformidade (COFFITO Res. 516/2020 + LGPD)

O sistema roda estas regras antes de liberar aprovação. `bloqueio` impede; `alerta` pede confirmação consciente.

**COFFITO / publicidade em saúde:**
- **Bloqueio:** promessa/garantia de resultado ou cura ("elimina a dor", "cura garantida", "resultado garantido").
- **Bloqueio:** sensacionalismo, "antes e depois" apelativo, apelo ao medo.
- **Bloqueio:** autopromoção como "a melhor/única", superioridade sobre outros profissionais.
- **Alerta:** indução a autodiagnóstico/autotratamento — deve orientar avaliação profissional individual.
- **Alerta:** afirmação clínica sem ressalva de que cada caso é avaliado individualmente.

**LGPD:**
- **Bloqueio:** imagem, vídeo ou depoimento de paciente **sem `consentimento_lgpd_ref`** registrado.
- **Alerta:** dado sensível de saúde identificável.

O checklist fica salvo em `checklist_conformidade` (auditável).

---

## 9. Roadmap

**Fase 1 (MVP):** identidade/brand kit · pilares · banco de ideias (manual + import + sugestão IA) ·
referências (manual + descoberta simples) · calendário · briefing → prompt → geração → prévia →
regenerar → aprovação · composição programática (Satori) · legenda/hashtags · gate de conformidade ·
export do pacote para postar manual · link rastreável + atribuição de lead no OS · métricas com entrada manual.

**Fase 2:** auto-publish no Instagram via **Graph API** (requer conta Business ligada a Página do
Facebook, app Meta com `instagram_content_publish` aprovado em App Review — 2 a 4 semanas; carrossel
= container pai + filhos, conta como 1 post; limite ~100 posts/24h; mídia precisa estar em URL
pública) · **n8n** para cron de publicação agendada e coleta de insights · descoberta automática de
referências · insights automáticos · sugestões do loop de aprendizado · stories/reels.

---

## 10. Convenções

- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `IG_*` (Fase 2).
- **Código:** TS strict, RSC por padrão, Server Actions para mutations, RLS no Supabase (só Bruno/Larissa).
- **Storage:** bucket público `corporis-conteudo`; nomear `posts/{post_id}/slide-{ordem}-v{versao}.png`.
- **Design:** reusar o design system do Corporis OS (tokens OKLCH, shadcn/ui, Fraunces/Ubuntu).
- **i18n:** PT-BR em toda a interface e conteúdo.

## 11. Fora de escopo (por ora)

Vídeo/reels · stories automáticos · TikTok/outras redes · publicação automática (Fase 2) · n8n (Fase 2).
