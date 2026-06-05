---
name: corporis-design
description: Use this skill to generate well-branded interfaces and assets for Corporis Fisioterapia e Pilates, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key files

- `README.md` — full brand reference: Content Fundamentals, Visual Foundations, Iconography, what Corporis IS and IS NOT
- `colors_and_type.css` — all CSS tokens (colors, type, spacing, radius, shadow, motion). Drop-in via `@import`.
- `reference/DLS-Primitives.md` — canonical DLS v1.0, source of truth for every token
- `reference/Brand-Identity.md` — strategic mission/vision/audience/voice context (colors in this doc are superseded by DLS Primitives)
- `assets/` — three official logo lockups (cores, branco, preto)
- `fonts/README.md` — Olicy substitution status; load Quicksand from Google Fonts until the real Olicy file is supplied
- `ui_kits/site/` — pixel-fidelity recreation of the institutional site with an interactive booking flow
- `preview/` — small token cards (used by the Design System tab; also useful as inline references)

## Non-negotiables when designing for Corporis

1. Background is `#FAFAF8` (Fundo Claro). **Never `#FFFFFF`** except inside cards.
2. Dark canvas is `#2A1F1A` (Espresso). **Never `#000000`**.
3. Only six color primitives: Alaranjado, Tangerina, Bege, Bege Claro, Verde, plus neutros. Verde is restricted to saúde preventiva / fisio pélvica.
4. Two typefaces only: **Olicy** (display) + **Ubuntu** (body). No third face. No system fallback as a primary.
5. Tone is *Cuidadosa · Técnica · Acolhedora.* No marketing agressivo, no countdowns, no "últimas vagas!"
6. Emoji: effectively never.
7. Fotografia: clinic + team real photos. Stock = last resort.
