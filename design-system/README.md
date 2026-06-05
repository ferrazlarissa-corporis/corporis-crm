# Corporis Design System

> *Movimente-se com propósito.*

Design system for **Corporis Fisioterapia e Pilates** — a boutique fisiotherapy and pilates clinic in Xanxerê, Santa Catarina (Brazil). Founded 2021 by **Larissa Ferraz** and **Tainara Fracasso**. Three pillars: pilates terapêutico, pilates para gestantes, fisioterapia pélvica.

The system is intentionally narrow. The palette is six closed primitives. The type pairing is fixed. The tone is calm, feminine, technical-without-being-cold. "Acho que ficaria legal um azulzinho aqui" is not a proposal — it's a temptation. Resista.

---

## Sources

This system was synthesized from two documents the user provided. Both are kept verbatim under `reference/`:

| File | Role |
| ---- | ---- |
| `reference/DLS-Primitives.md` | **Canonical** — DLS Primitives v1.0. Defines the token set, color/type/spacing primitives, component rules, governance. This is the source of truth. |
| `reference/Brand-Identity.md` | **Strategic** — Brand Identity Guide v1.0. Mission/vision/audience/voice/tone. Note the older color tokens (Linen, Terracotta, Cormorant Garamond) — superseded by the DLS Primitives, kept for tone and audience context only. |

No Figma or codebase was attached.

## Logo files

The three official lockup variations live in `assets/`:

| Token | File | Use |
| ----- | ---- | --- |
| `logo-cores` | `assets/logo-cores.png` | Primary — over Fundo Claro, beige, white |
| `logo-branco` | `assets/logo-branco.png` | Over dark backgrounds (Espresso, dark sections) |
| `logo-preto` | `assets/logo-preto.png` | Monochrome — print, stamps, B&W |

Construction: a pilates ball + a curved dashed line (spine + movement) + the soft "corporis" wordmark + the "fisioterapia & pilates" descriptor in Bege. Safe area is a 5×5 grid; the logo occupies the 3×3 center with one cell of breathing room on every side. **Never** rotate, recolor, crop, or apply effects.

---

## Index

```
/colors_and_type.css   ← all CSS variables (color, type, spacing, radius, shadow, motion)
/fonts/README.md       ← font installation guide + Olicy substitution notes
/assets/               ← logo lockups (cores, branco, preto)
/reference/            ← original primitive + brand identity docs
/preview/              ← Design System tab cards (one HTML per token group)
/ui_kits/site/         ← Corporis institutional site recreation (Nav → Hero → Services → Team → Booking)
/SKILL.md              ← packaged skill manifest for Agent Skills / Claude Code
```

---

## Content Fundamentals

### The three words

**Cuidadosa · Técnica · Acolhedora.** Every line of copy is filtered through these three. If a sentence is one but not the other two, rewrite it.

### Voice persona

The brand speaks like a **fisioterapeuta amiga** — the kind that listens before prescribing, explains the *why* of each movement, never makes the aluna feel bad for not getting it on the first try. Premium without being arrogant. Welcoming without being informal-to-the-point-of-cute.

### Writing principles

- **Acolhe primeiro, informa depois.** Recognize the dor or doubt before presenting the solution. "Sente dor lombar há mais de seis meses?" *before* "venha fazer pilates."
- **Específico, não vago.** Never "vamos cuidar de você" without saying how. Always "atendimento individual de 50 minutos com fisioterapeuta especializada."
- **Calma — sem caps lock, sem urgência fake, sem ponto de exclamação em excesso.** A urgência da saúde já é real.
- **Sem jargão hospitalar.** *Aluna*, not *paciente*. *Incômodo*, not *patologia*. *Atendimento*, not *consulta ambulatorial*.
- **Sem infantilização.** No diminutivos excessivos. No emoji as a crutch.

### Casing & person

- Sentence-case for everything except ALL-CAPS labels (`AULA EXPERIMENTAL`, `FISIO PÉLVICA`, footnote-style micro text).
- "Você," not "tu" or "vocês."
- "Aluna" (feminine) — the audience is overwhelmingly women. The brand is openly editorial-feminine; never neutered, never infantile.

### Emoji

**Almost never.** Not in posts, not in WhatsApp, not in marketing. The brand identity guide says emoji shouldn't function as "muleta de comunicação." A heart, a flower, or a single sunrise as an *occasional* signature in stories is the absolute ceiling — never punctuating bullet points or replacing words.

### Tone calibration by context

| Context | Tone |
| ------- | ---- |
| Instagram posts | Editorial, soft, questions that make the aluna recognize herself |
| Stories / behind-the-scenes | Informal, the fisio's own voice, unscripted ambient feel |
| Site institucional | Professional, claro, technical but legible — informs without scaring |
| WhatsApp | Warm, objective, prestativo — no robotic scripts |
| Pilates gestante | Extra-careful — emotional validation *before* technical information |
| Fisioterapia pélvica | Discreet, respectful — naturalizes the topic without exposure |

### Reference copy

```
HERO DO SITE
Movimente-se com propósito. Atendimento individual em fisioterapia
e pilates, no coração de Xanxerê.

POST INSTAGRAM (pilates)
Sua coluna está te avisando há quanto tempo? O pilates terapêutico
não é academia. É movimento prescrito por fisioterapeuta — para o
seu corpo, com o seu ritmo. Aula experimental gratuita.

FISIOTERAPIA PÉLVICA
Incontinência, dor na relação, recuperação pós-parto. A fisioterapia
pélvica trata o que muita gente ainda não fala — com técnica,
discrição e cuidado individual.

WHATSAPP DE BOAS-VINDAS
Olá! Aqui é da Corporis. Que bom ter você por aqui. Antes de
marcarmos sua aula experimental, posso te perguntar o que te
trouxe até a gente?
```

### What Corporis is NOT

| Not | Is |
| --- | -- |
| Academia genérica — "vem se exercitar" | Terapia pelo movimento, prescrita por fisioterapeuta |
| Estética sem ciência — promessa de medidas | Estética como consequência da saúde funcional |
| Tom hospitalar — "paciente", "patologia" | "Aluna", "incômodo", "atendimento" |
| Marketing agressivo — countdown, "últimas vagas!" | Relação de longo prazo, sem urgência fabricada |
| Promessa milagrosa — "fim das dores em 7 dias" | "Avaliamos seu caso e construímos um plano realista" |

---

## Visual Foundations

### Palette

A closed, terrosa palette. Six color primitives + their stated emotion + their permission slip.

- **`#F08353` Alaranjado** — primary. Wordmark, CTAs, the loudest moment per composition. *Movimento, alegria.*
- **`#F6A958` Tangerina** — variant of Alaranjado for hover, gradient pairs, *never* on the same composition competing with Alaranjado.
- **`#D2B06E` Bege** — premium gold accent. Section titles, ornamental setas, elegant nav.
- **`#EAD7AC` Bege Claro** — soft tint. The pilates ball in the logo. Card backgrounds, hover surfaces. **Never as text color.**
- **`#ACC095` Verde** — restricted. Saúde preventiva + fisio pélvica only. Also the UI success token. Not decorative.
- Neutros — `#FAFAF8` Fundo Claro (canvas — **never** `#FFFFFF`), `#D3D2CD` Cinza, `#7A6E68` Texto Médio, `#3A3530` Texto Escuro, `#2A1F1A` Espresso (dark canvas — **never** `#000000`).

Signal Coral / Sage Muted / Terracotta from the older Brand Identity doc are **superseded** by the DLS Primitives. They appear only in `reference/Brand-Identity.md`.

### Type

**Two faces. No third one.** Fixed roles, no swapping.

- **Display — Olicy Regular (400)** carries the brand voice. Hero, headlines, wordmark. The four pillars of the type system are *movimento · afeto · legibilidade · segurança.*
- **Body — Ubuntu (400 / 500)** carries everything else. Body, labels, UI, dados funcionais.

Labels: Ubuntu Medium, **ALL CAPS, tracked +2–3px**, in Bege when meta or in Texto Médio when truly secondary.

Hierarchy in headlines is created by **size and color contrast** — never by weight. Olicy stays at 400.

> ⚠️ **Substitution flag.** Olicy was not supplied. We're rendering with **Quicksand** (Google Fonts) as the closest free rounded humanist match. See `fonts/README.md` for the swap-in path. The wordmark in `assets/logo-cores.png` shows what the real face looks like — Quicksand is approximate, not exact.

### Spacing

Base-8 grid with one allowed exception at 4pt for icons and inline gaps. Tokens go `micro 4 → xs 8 → sm 16 → md 24 → std 32 → lg 40 → xl 64 → 2xl 96`. Component internal padding = `sm` (16). Default gap between components = `md` (24). `lg` and above are layout tokens — never inside a single component. `2xl` is reserved for full-bleed editorial layout — never in UI.

### Backgrounds

The clinic is luz natural, linho cru, cerâmica artesanal. Backgrounds reflect that:

- Default page canvas is **Fundo Claro** (`#FAFAF8`). A subtle warm secondary (`#F4EFE6`) is used for section alternation.
- Dark sections use **Espresso** with Fundo Claro or Bege Claro for text — never pure white on Espresso.
- One light radial wash of Bege Claro at hero / opening sections is OK ("luz natural de manhã"). Otherwise: solid color.
- **No gradients neon. No drop shadows excessivos. No paletas frias (azul, roxo, verde elétrico).**
- Texture: paper grain at 4–6% opacity is allowed as a quiet treatment on solid color. Geometric patterns / rigid grids / generated SVG patterns are out.

### Imagery

- **Real photography of the clinic and the team.** Light comes from the side, in the morning. Mulheres reais — alunas and professionals — in roupa neutra (linen, off-white, terracotta, oliva).
- **Avoid** stock photos of women smiling artificially, fluorescent lighting, gym mirrors, neon, sweat. No closes invasivos for fisio pélvica — sempre símbolos, tipografia, ilustrações suaves.
- Post-production: **tons quentes, leve dessaturação.** Never cool or hyper-saturated filters.

### Animation & easing

Soft and slow. No bounces, no springs, no parallax.

- `--duration-fast` 160ms, `--duration-base` 240ms, `--duration-slow` 420ms
- `--ease-soft` `cubic-bezier(0.4, 0, 0.2, 1)` for state transitions
- `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)` for entries
- Modal entry: fade backdrop 200ms + 12px slide-up of the modal at 280ms. No scale, no rotate.
- Hover on cards: 3px translate-Y up + soft shadow over 240ms. Not a lift, a suggestion.

### Hover & press states

- **Hover on text links and CTAs:** swap `Alaranjado` → `Tangerina`. Not opacity. Not underline.
- **Hover on cards:** `translateY(-3px)` + soft `shadow-md` appears. No background swap.
- **Hover on chips / outline buttons:** background fills to Bege Claro, border swaps to Tangerina. Calm.
- **Press / active:** no shrink, no scale-down. Reserved for buttons — slight background darkening to a Tangerina-Alaranjado mix.
- **Focus:** 3px Alaranjado soft-glow ring around inputs (`box-shadow: 0 0 0 3px rgba(240,131,83,0.15)`).

### Borders

Hairlines. `1px` is standard; service cards take `0.6px` to be even quieter. Border color is always **Cinza** (`#D3D2CD`) — never tinted with the brand color. No double borders, no dashed borders except as a divider treatment under metadata.

### Shadows

Three tokens. All low, all warm-shadowed (compositing against Texto Escuro at 4–8% alpha — not pure black). Never harsh, never blue-tinted.

- `shadow-sm` — resting card lift, 1px / 2px blur / 4% alpha
- `shadow-md` — hover, dropdown, 4px / 16px / 6% alpha
- `shadow-lg` — modal, panel, 12px / 32px / 8% alpha

No inner shadows. No glow. No emboss.

### Radii

Soft, never sharp. `xs 4` (badges) · `sm 6` (service cards) · `md 8` (buttons, inputs) · `lg 12` (panels, hero visual, modal) · `pill 999` (tags, avatar, success-check). 0px radius doesn't exist in this system.

### Layout rules

- Fixed nav on scroll, 22px vertical padding on canvas.
- Page max-width: untill 1440 — section padding `64px` horizontal at desktop.
- Section vertical rhythm: `96px` top/bottom (`space-2xl`). Reduce to `64px` only for tight stacks (e.g. testimonial right after services).
- Editorial sections head: eyebrow (Ubuntu Medium ALL CAPS, Bege) → h2 (Olicy 52px) → lead (Ubuntu Regular 18px, Texto Médio). Stack with `space-md` between elements.

### Transparency & blur

Used sparingly: only the modal backdrop (Espresso at 55% alpha). No glass / frosted nav. No translucent cards. Solid colors carry the weight.

### Color of imagery

Warm. Slightly desaturated. Mid-morning light. The brand identity guide is explicit: never cool tones, never hospital fluorescence, never gym neon.

### What a card looks like

Default service card: white surface (`#FFFFFF` — the only allowed exception to the "no pure white" rule, and only inside a card), `0.6px` Cinza border, `radius-sm` (6pt), 6pt accent bar at top in the service's color, `shadow-sm` at rest → `shadow-md` on hover with a 3px translate-Y up.

---

## Iconography

The DLS does **not** ship an icon font, sprite set, or named icon library. The provided documents don't reference one either. Today's iconographic surface area of the brand is:

- The **logo mark** itself — the pilates ball + dashed-curve spine + sun-dot — does almost all the iconic heavy lifting.
- **Bege setas** as ornamental wayfinding (e.g. "→ Saiba mais"). Inline glyph arrow `→` is the canonical character; no SVG.
- **ALL CAPS labels** in Ubuntu replace what a less-restrained brand would use icons for (badges, tags, status, service categories).
- **Emoji: no.** Already covered in Content Fundamentals.
- **Unicode glyphs:** OK as inline accents — `→` for action affordances, `·` as a separator between meta items, `×` as the modal close. Avoid `★`, `✓` as decorative (✓ is OK only for genuine success confirmation, in a Verde circle).

### When the design needs an icon (and the brand mark isn't right)

The DLS doesn't specify. Our recommendation — flagged for review:

> **Substitute** with [**Lucide**](https://lucide.dev/) at stroke-width 1.5, color Texto Escuro for default, Alaranjado for interactive. Lucide's humanist, rounded-stroke character is the closest free match for the brand's soft-rounded logotype and its "spa-not-hospital" tone. Heroicons and Feather are also acceptable but skew slightly more geometric.

> ❗ **Iconography is the biggest open question in this system.** The brand should commission a small custom set (10–15 icons) — services, schedule, location, profile, message, success/error — drawn at the same stroke weight and rounded terminals as the logo wordmark. Until then, Lucide is a stopgap, not a standard.

No icon assets ship with this repo because none were supplied.

---

## UI Kits

| Path | What it covers |
| ---- | -------------- |
| `ui_kits/site/` | Corporis institutional site — full landing (nav, hero, services, team, testimonial, footer) + a 3-step interactive booking flow for the *aula experimental gratuita*. |

The brand operates on Instagram, WhatsApp, the institutional site, and printed material. **Only the site is recreated** here — Instagram and WhatsApp surfaces are platforms, not products of ours, and material impresso wasn't supplied. Adding an Instagram carousel template kit is a clear next step (see Caveats below).

---

## Governance

All material is reviewed against `reference/DLS-Primitives.md`'s checklist. Token changes are owned by Larissa Ferraz. Don't introduce ad-hoc values without checking the checklist first.
