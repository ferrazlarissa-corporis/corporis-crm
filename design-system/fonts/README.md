# Fonts — Corporis

## Display: `Olicy Regular` — **MISSING / SUBSTITUTED**

The DLS Primitives spec requires **Olicy Regular** (a soft, rounded humanist sans that carries the brand voice in every headline and the wordmark). The font file was not provided with this design system.

**Temporary substitution:** [Quicksand](https://fonts.google.com/specimen/Quicksand) (Google Fonts), weights 400–700, loaded via `@import` in `colors_and_type.css`. Quicksand is the closest free match available for the soft rounded humanist character of the logo wordmark — but it is **not** Olicy and headlines will read subtly different until the real file is dropped in.

**To install the real Olicy:**
1. Drop the font files (`.woff2`, `.woff`, `.ttf`) into this `fonts/` folder, e.g. `Olicy-Regular.woff2`
2. Replace the Quicksand `@import` at the top of `colors_and_type.css` with a local `@font-face` declaration:

```css
@font-face {
  font-family: "Olicy";
  src: url("./fonts/Olicy-Regular.woff2") format("woff2"),
       url("./fonts/Olicy-Regular.woff")  format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

The `--font-display` token already lists `"Olicy"` first, so the local file will pick up automatically once added.

## Body: `Ubuntu`

[Ubuntu](https://fonts.google.com/specimen/Ubuntu) (Google Fonts), weights 300/400/500/700. Already loaded in `colors_and_type.css` via `@import`.
