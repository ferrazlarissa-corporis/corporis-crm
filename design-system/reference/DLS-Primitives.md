# ***Corporis Design Language System — Guia de Primitivos***

*DLS Primitives · v1.0 · Referência Interna*

---

**Artefato Visual (PDF):** Corporis_DLS_Primitives.pdf

## ***Visão Geral***

*Primitivos são os design tokens fundamentais que mantêm a marca Corporis consistente em todas as superfícies — conteúdo digital, redes sociais, materiais impressos, comunicações de WhatsApp e site institucional. Eles codificam cor, tipografia e ritmo de espaçamento numa única fonte de verdade.*

*Primitivos são **variáveis globais** definidas no design system. Alterar o valor de um token propaga a mudança em toda superfície de comunicação da clínica. Sobrescrever primitivos localmente não é recomendado — cria fragmentação e não herdará futuras atualizações da marca.*

***Nota:** Ao iniciar um novo projeto visual, use este guia como referência viva. Nunca introduza valores ad-hoc de cor ou tipografia; se um token não existe para o seu caso de uso, consulte a responsável técnica (Larissa Ferraz) antes de criar.*

---

## ***Logo***

*A logo Corporis é construída a partir de três elementos combinados: **Bola de Pilates** (movimento e prática) + **Coluna Vertebral** (saúde e fisioterapia) + **Identidade da Marca** (o "C" característico). O resultado é um ícone que representa fluidez, postura e a continuidade entre fisioterapia e pilates.*

### ***Variações Oficiais***

| *Token* | *Arquivo* | *Uso* |
| ----- | ----- | ----- |
| *`logo-cores`* | *Corporis_Logo_Cores_Transparente.png* | *Uso principal — sobre fundos claros (#FAFAF8, branco, bege)* |
| *`logo-branco`* | *Corporis_Logo_Branco_Transparente.png* | *Sobre fundos escuros (#2A1F1A, Espresso, backgrounds dark)* |
| *`logo-preto`* | *Corporis_Logo_Preto_Transparente.png* | *Versão monocromática — impressão P&B, selos, carimbos* |

### ***Construção e Área de Segurança***

*A área de segurança segue um **grid 5×5**: o logo ocupa as 3 colunas e 3 linhas centrais, com 1 célula de respiro obrigatório em todos os lados.*

***Regras:***

* *Use apenas nas três variações oficiais: cores, branco e preto*
* *NÃO altere a cor do logo — use apenas as cores da paleta oficial*
* *NÃO gire o logo em nenhum ângulo*
* *NÃO corte ou recorte qualquer elemento do conjunto*
* *NÃO aplique sobre fotografia sem área de respiro adequada*
* *NÃO distorça, estique ou aplique sombras, contornos ou efeitos ao logo*
* *Em fundos escuros: use sempre a variação `logo-branco`, nunca `logo-cores`*

---

## ***Tipografia***

*O sistema tipográfico da Corporis usa duas typefaces com papéis fixos. Não substitua nem cruze a aplicação delas.*

| *Token* | *Typeface* | *Weight* | *Papel* |
| ----- | ----- | ----- | ----- |
| *`type-display-xl`* | *Olicy Regular* | *Regular (400)* | *Hero de campanha, wordmark, headlines full-bleed, capas de carrossel* |
| *`type-display-lg`* | *Olicy Regular* | *Regular (400)* | *Títulos de seção, aberturas editoriais, headers de slide* |
| *`type-display-md`* | *Olicy Regular* | *Regular (400)* | *Sub-headers, pull quotes, títulos de card, frases de impacto* |
| *`type-body-lg`* | *Ubuntu Regular* | *Medium (500)* | *Parágrafos de abertura, feature copy, texto de destaque* |
| *`type-body-md`* | *Ubuntu Regular* | *Regular (400)* | *Body padrão, descrições de serviço, conteúdo de site* |
| *`type-body-sm`* | *Ubuntu Regular* | *Regular (400)* | *Texto de apoio, footnotes, legendas, metadados* |
| *`type-ui-label`* | *Ubuntu Regular* | *Medium (500)* | *Labels de seção, tags, navegação — ALL CAPS, tracked +2–3px* |
| *`type-ui-value`* | *Ubuntu Regular* | *Regular (400)* | *Horários, endereços, dados de contato, preços* |
| *`type-ui-micro`* | *Ubuntu Regular* | *Regular (400)* | *Texto miúdo, CRP, avisos legais — ALL CAPS* |

***Regras:***

* *Olicy Regular carrega o peso da marca — é a assinatura visual em toda headline*
* *Ubuntu nunca é usada em headlines principais — sempre Olicy para impacto, Ubuntu para legibilidade*
* *Labels em Ubuntu são sempre ALL CAPS com letter-spacing +2–3px*
* *Hierarquia em headlines é criada por tamanho e contraste de cor, não por variação de weight*
* *Nunca introduza uma terceira typeface — consulte a responsável antes de criar*
* *Nunca use fontes genéricas (Arial, Times New Roman, Calibri, system fonts) em materiais de marca*
* *Os quatro pilares tipográficos da marca: **movimento · afeto · legibilidade · segurança***

---

## ***Cor***

*Cores são organizadas em seis primitivos fixos com papéis documentados. Sempre referencie um token nomeado; nunca use um valor hex solto sem referência ao sistema.*

### ***Alaranjado — Cor Principal***

| *Token* | *Nome* | *Hex* | *Emoção* | *Uso* |
| ----- | ----- | ----- | ----- | ----- |
| *`color-alaranjado`* | *Alaranjado* | *`#F08353`* | *movimento · alegria* | *Cor principal — wordmark, CTAs, destaques, elementos de maior impacto* |
| *`color-tangerina`* | *Tangerina* | *`#F6A958`* | *movimento · calor* | *Variação do alaranjado — hover states, gradientes suaves, pares de gradiente* |

### ***Dourados — Accent Premium***

| *Token* | *Nome* | *Hex* | *Emoção* | *Uso* |
| ----- | ----- | ----- | ----- | ----- |
| *`color-bege`* | *Bege* | *`#D2B06E`* | *flexibilidade · calma* | *Accent dourado — títulos de seção, setas, elementos de navegação elegante* |
| *`color-bege-claro`* | *Bege Claro* | *`#EAD7AC`* | *leveza · acolhimento* | *Ícone do logo (bola), cards, áreas de destaque suave, backgrounds de hover* |

### ***Verde — Saúde***

| *Token* | *Nome* | *Hex* | *Emoção* | *Uso* |
| ----- | ----- | ----- | ----- | ----- |
| *`color-verde`* | *Verde* | *`#ACC095`* | *confiança · juventude* | *Exclusivo para comunicação de saúde preventiva e fisioterapia pélvica* |

### ***Neutros — Base de Trabalho***

| *Token* | *Nome* | *Hex* | *Uso* |
| ----- | ----- | ----- | ----- |
| *`color-fundo-claro`* | *Fundo Claro* | *`#FAFAF8`* | *Background primário — todas as superfícies digitais* |
| *`color-cinza`* | *Cinza* | *`#D3D2CD`* | *Bordas, divisores, separadores, versão monocromática do logo* |
| *`color-texto-escuro`* | *Texto Escuro* | *`#3A3530`* | *Texto primário, headings em fundos claros* |
| *`color-texto-medio`* | *Texto Médio* | *`#7A6E68`* | *Texto secundário, metadados, legendas, timestamps* |
| *`color-espresso`* | *Espresso* | *`#2A1F1A`* | *Background escuro — dark sections, sidebar, rodapés* |

### ***Functional — UI States***

| *Token* | *Nome* | *Hex* | *Uso* |
| ----- | ----- | ----- | ----- |
| *`color-ui-success`* | *Success* | *`#ACC095`* | *Confirmação, estados completos — compartilha Verde* |
| *`color-ui-error`* | *Error* | *`#C0504A`* | *Erros, ações destrutivas* |
| *`color-ui-border`* | *Border* | *`#D3D2CD`* | *Bordas de input, divisores — compartilha Cinza* |
| *`color-ui-interactive`* | *Interactive* | *`#F08353`* | *Cor padrão de interação / link — compartilha Alaranjado* |
| *`color-ui-hover`* | *Hover* | *`#F6A958`* | *Hover e active states — compartilha Tangerina* |
| *`color-ui-disabled`* | *Disabled* | *`#D3D2CD`* | *Texto e elementos desabilitados* |

***Regras de Cor:***

* *`color-fundo-claro` é o background canônico claro — nunca use branco puro (`#FFFFFF`)*
* *`color-espresso` é o background canônico escuro — nunca use preto puro (`#000000`)*
* *`color-alaranjado` é a cor da marca — domina wordmark, CTAs e elementos de maior destaque*
* *`color-bege` é o acento premium — aparece em títulos editoriais e elementos de navegação elegante*
* *`color-verde` é exclusivo para comunicação de saúde preventiva e fisioterapia pélvica — não use decorativamente*
* *`color-tangerina` nunca compete com `color-alaranjado` na mesma composição — use como variação ou gradiente*
* *`color-bege-claro` é apenas background e tint — nunca aplique como cor de texto*
* *Nunca adicione cores fora deste sistema — a paleta é intencionalmente fechada e terrosa*

---

## ***Espaçamento***

*O espaçamento segue um **grid base-8**. Todos os valores são múltiplos de 8, com uma exceção micro de 4pt para contextos de ícones e elementos inline. Sempre use um token nomeado — nunca use valores arbitrários.*

| *Token* | *Valor* | *Uso* |
| ----- | ----- | ----- |
| *`space-none`* | *0pt* | *Zero explícito — use ao sobrescrever espaçamento herdado* |
| *`space-micro`* | *4pt* | *Padding de ícone, gaps de elemento inline, separações mínimas* |
| *`space-xs`* | *8pt* | *UI densa — gaps de tag, itens de lista compacta, ícone-para-label* |
| *`space-sm`* | *16pt* | *Padding interno padrão de componentes* |
| *`space-md`* | *24pt* | *Gap padrão entre componentes* |
| *`space-std`* | *32pt* | *Separação de seção dentro de uma view, padding de coluna* |
| *`space-lg`* | *40pt* | *Seções maiores de layout, respiro editorial* |
| *`space-xl`* | *64pt* | *Whitespace de nível de página, seções hero* |
| *`space-2xl`* | *96pt* | *Espaçamento editorial fullscreen — apenas layouts de campanha* |

***Regras de Espaçamento:***

* *Padding interno padrão para componentes de UI é `space-sm` (16pt)*
* *Gap padrão entre componentes é `space-md` (24pt)*
* *`space-lg` e acima são tokens de layout — não use dentro de um componente*
* *Ritmo vertical entre elementos de texto: `space-xs` (8pt) entre linhas, `space-sm` (16pt) entre blocos*
* *`space-2xl` é reservado para layouts editoriais full-bleed — nunca em UI*
* *Carrosséis de Instagram usam `space-lg` (40pt) como margem externa para respiro consistente*

---

## ***Componentes***

*Componentes são composições reutilizáveis construídas sobre os primitivos. Nunca modifique as propriedades base de um componente sem consultar o DLS.*

### ***Botões***

| *Token* | *Descrição* | *Cor de fundo* | *Cor de texto* | *Border-radius* |
| ----- | ----- | ----- | ----- | ----- |
| *`btn-primary`* | *Ação principal — Agendar, Confirmar* | *`color-alaranjado`* | *Branco* | *8pt* |
| *`btn-secondary`* | *Ação secundária — Saiba mais, Ver mais* | *Transparente* | *`color-alaranjado`* | *8pt (borda 1.2pt Alaranjado)* |
| *`btn-disabled`* | *Estado desabilitado* | *`color-cinza`* | *`color-texto-medio`* | *8pt* |

### ***Cards de Serviço***

*Cards usam fundo branco (`#FFFFFF`), borda `color-cinza` (0.6pt), border-radius 6pt. Accent bar no topo em 6pt de altura na cor do serviço:*

| *Serviço* | *Cor da accent bar* | *Token* |
| ----- | ----- | ----- |
| *Pilates* | *Alaranjado* | *`color-alaranjado`* |
| *Pilates Gestante* | *Verde* | *`color-verde`* |
| *Fisioterapia Pélvica* | *Bege* | *`color-bege`* |

### ***Badges e Labels***

*Badges usam Olicy Bold 7pt, ALL CAPS, border-radius 4pt, padding 8pt horizontal.*

| *Badge* | *Cor de fundo* | *Cor de texto* |
| ----- | ----- | ----- |
| *PILATES* | *`color-alaranjado`* | *Branco* |
| *FISIO PÉLVICA* | *`color-verde`* | *Branco* |
| *GESTANTES* | *`color-bege`* | *`color-texto-escuro`* |
| *NOVIDADE* | *`color-bege-claro`* | *`color-texto-escuro`* |
| *INATIVO* | *`color-cinza`* | *`color-texto-escuro`* |

---

## ***Primitivos de Redes Sociais***

*Tokens específicos para Instagram e comunicações digitais da Corporis.*

| *Token* | *Valor* | *Uso* |
| ----- | ----- | ----- |
| *`social-ratio-feed`* | *4:5 (1080×1350)* | *Posts de feed do Instagram, carrosséis* |
| *`social-ratio-story`* | *9:16 (1080×1920)* | *Stories, Reels* |
| *`social-ratio-thumb`* | *16:9 (1280×720)* | *Thumbnails de YouTube, capas de vídeo* |
| *`social-bg-light`* | *`color-fundo-claro`* | *Background padrão de carrossel — variante clara* |
| *`social-bg-dark`* | *`color-espresso`* | *Background padrão de carrossel — variante escura* |
| *`social-bg-accent`* | *`color-bege-claro`* | *Slides de gestantes, pós-parto, seções terapêuticas suaves* |
| *`social-headline`* | *`type-display-lg`* | *Capa de carrossel e slides-chave — Olicy Regular* |
| *`social-body`* | *`type-body-lg`* | *Texto de corpo em social — Ubuntu Medium 500* |
| *`social-label`* | *`type-ui-label`* | *Tags, datas, micro-copy — Ubuntu ALL CAPS* |
| *`social-margin`* | *`space-lg` (40pt)* | *Zona segura externa para todos os formatos sociais* |

***Regras de Social:***

* *Slides de capa usam background `color-fundo-claro` com headline `color-texto-escuro` em Olicy*
* *Slides de conteúdo alternam entre backgrounds `color-espresso` (escuro) e `color-fundo-claro` (claro)*
* *Slides escuros usam `color-fundo-claro` ou `color-bege-claro` para texto — nunca branco puro*
* *Destaques em slides escuros usam `color-alaranjado` como accent — no máximo uma vez por slide*
* *`color-verde` é reservado para posts de saúde preventiva e fisioterapia pélvica*
* *Comunicação sobre fisioterapia pélvica nunca usa imagens invasivas — apenas tipografia e ícones*
* *Nunca use gradientes neon, drop shadows excessivos ou paletas frias (azul, roxo, verde elétrico)*

---

## ***Voz e Tom***

*Os primitivos de linguagem da Corporis são tão importantes quanto os visuais. Toda peça de comunicação deve passar pelo filtro das três palavras da marca: **Cuidadosa · Técnica · Acolhedora.***

### ***Personalidade***

*"Uma fisioterapeuta amiga: escuta antes de prescrever, explica o porquê de cada movimento e nunca te faz sentir mal por não conseguir na primeira tentativa."*

### ***Calibração de Tom por Contexto***

| *Contexto* | *Tom* |
| ----- | ----- |
| *Instagram / Posts* | *Editorial, suave — perguntas que fazem a aluna se reconhecer na situação* |
| *Stories / Bastidores* | *Informal, voz da fisioterapeuta, ambiente real, sem roteiro* |
| *Site institucional* | *Profissional, claro, técnico mas legível — informa sem assustar* |
| *WhatsApp* | *Caloroso, objetivo, prestativo — sem scripts robóticos nem demora* |
| *Fisioterapia Pélvica* | *Discreto, respeitoso — naturaliza o tema com classe, sem tabu nem exposição* |
| *Gestantes* | *Extra cuidadoso — validação emocional antes da informação técnica* |

### ***Princípios de Escrita***

* *Acolhe primeiro, informa depois — reconheça a dor ou dúvida antes de apresentar a solução*
* *Específico, não vago — nunca "cuidamos de você" sem dizer como e com quem*
* *Calma, feminina, técnica — sem caps lock, sem urgência fake, sem ponto de exclamação em excesso*
* *Sem jargão hospitalar — "aluna", não "paciente"; "incômodo", não "patologia"*
* *Sem infantilização — nem diminutivos excessivos, nem emojis como muleta de comunicação*

### ***Copy de Referência***

```
HERO DO SITE
Movimente-se com propósito. Atendimento individual em fisioterapia
e pilates, no coração de Xanxerê.

POST INSTAGRAM — PILATES
Sua coluna está te avisando há quanto tempo? O pilates terapêutico
não é academia. É movimento prescrito por fisioterapeuta — para o
seu corpo, com o seu ritmo. Aula experimental gratuita.

FISIOTERAPIA PÉLVICA
Incontinência, dor na relação, recuperação pós-parto. A fisioterapia
pélvica trata o que muita gente ainda não fala — com técnica, discrição
e cuidado individual.

WHATSAPP DE BOAS-VINDAS
Olá! Aqui é da Corporis. Que bom ter você por aqui. Antes de marcarmos
sua aula experimental, posso te perguntar o que te trouxe até a gente?
```

---

## ***Usando Primitivos no Código / Design***

*Referencie tokens via CSS custom properties ou variáveis de design tool. Nunca hardcode valores de cor ou tipografia.*

```css
/* Cor */
background-color: var(--color-fundo-claro);    /* #FAFAF8 */
color: var(--color-texto-escuro);              /* #3A3530 */
border-color: var(--color-cinza);              /* #D3D2CD */
accent-color: var(--color-alaranjado);         /* #F08353 */

/* Tipografia — Display */
font-family: var(--type-display-xl-family);    /* Olicy Regular */
font-size: var(--type-display-xl-size);        /* 48–72px */

/* Tipografia — Body */
font-family: var(--type-body-md-family);       /* Ubuntu Regular */
font-size: var(--type-body-md-size);           /* 15–17px */
line-height: var(--type-body-md-leading);      /* 1.55–1.65 */

/* Tipografia — Labels */
font-family: var(--type-ui-label-family);      /* Ubuntu Regular */
font-size: var(--type-ui-label-size);          /* 7–8px */
text-transform: uppercase;
letter-spacing: 2px;

/* Espaçamento */
padding: var(--space-sm);                      /* 16pt */
gap: var(--space-md);                          /* 24pt */
margin-top: var(--space-lg);                   /* 40pt */
```

*Qualquer componente que contorne um primitivo cria risco de fragmentação. Futuras atualizações — um ajuste no tom do Alaranjado, uma mudança no grid de espaçamento, uma nova variação de logo — não propagarão para valores hardcoded.*

---

## ***Governança***

*Primitivos são mantidos por Larissa Ferraz (responsável técnica) e pela equipe da Corporis. Para propor um novo token ou alterar um valor existente:*

1. *Documente o caso de uso e por que nenhum token existente cobre a necessidade*
2. *Mostre todas as superfícies afetadas (Instagram, site, WhatsApp, material impresso)*
3. *Inclua comparações visuais antes/depois*
4. *Obtenha aprovação da Larissa antes da implementação*

### ***Checklist Rápido***

*Todo material externo deve ser verificado contra este guia antes de publicar:*

- [ ] *A paleta de cores está dentro dos 6 primitivos? (Alaranjado, Bege, Verde, Tangerina, Bege Claro, Cinza)*
- [ ] *Fundo usa `#FAFAF8` — nunca branco puro `#FFFFFF` nem preto puro `#000000`?*
- [ ] *A tipografia segue Olicy Regular (headlines) + Ubuntu Regular (corpo e labels)?*
- [ ] *O logo está em uma das 3 variações oficiais: cores, branco ou preto — sem rotação ou corte?*
- [ ] *A área de segurança do logo foi respeitada (grid 5×5, 1 célula de margem)?*
- [ ] *O tom é de uma profissional acolhedora — não é marketing agressivo nem frio hospitalar?*
- [ ] *Imagens seguem o mood board: movimento real, professora presente, ambiente luminoso?*
- [ ] *Comunicação sobre fisioterapia pélvica é discreta, respeitosa, sem exposição?*
- [ ] *CTAs usam Alaranjado como cor de ação — não outra cor não prevista?*

### ***O que Corporis NÃO é***

| *Não é* | *É* |
| ----- | ----- |
| *Academia genérica — "vem se exercitar"* | *Terapia pelo movimento, prescrita por fisioterapeuta* |
| *Estética sem ciência — promessa de redução de medidas* | *Estética como consequência da saúde funcional* |
| *Tom hospitalar — "paciente", "patologia"* | *"Aluna", "incômodo", "atendimento"* |
| *Marketing agressivo — countdown, "últimas vagas!"* | *Relação de longo prazo, sem urgência fabricada* |
| *Promessa milagrosa — "fim das dores em 7 dias"* | *"Avaliamos seu caso e construímos um plano realista"* |

*Mudanças em primitivos afetam toda superfície de comunicação simultaneamente. Trate com o mesmo rigor de uma mudança de identidade.*

*A paleta é intencionalmente fechada. "Acho que ficaria legal um azulzinho aqui" não é uma proposta de DLS — é uma tentação. Resista.*

---

*Corporis Fisioterapia & Pilates · Design Language System · DLS Primitives v1.0*
*Rua Coronel Santos Marinho, 347 — Sala 903 · Centro Médico Xanxerê · Xanxerê/SC*
*clinicacorporis.app · @corporisfisiopilates*
*Uso interno — referência para toda produção de conteúdo e comunicação da clínica.*
