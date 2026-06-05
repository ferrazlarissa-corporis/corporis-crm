# Corporis — Site UI Kit

High-fidelity recreation of the Corporis institutional website (`clinicacorporis.app`). Built strictly against the DLS Primitives v1.0 — every color, type token and spacing value references the design system, not arbitrary values.

## What's here

- **`index.html`** — full interactive landing: nav → hero → services → team → testimonial → footer, with a 3-step Aula Experimental booking flow.
- **`Site.jsx`** — page sections: `Nav`, `Hero`, `Service`, `Services`, `Team`, `Testimonial`, `Footer`.
- **`BookingModal.jsx`** — interactive 3-step modal (name → reason chips → WhatsApp → confirmation). Calm transitions, Verde check on success, copy lifted from the brand's WhatsApp welcome script.
- **`styles.css`** — full layout system + components. Imports `colors_and_type.css` from the design system root.
- **`booking.css`** — modal chrome.

## Click-thru

1. Click **Aula experimental** in the nav, **Agendar aula experimental** in the hero, or any service card → opens the booking modal at step 1.
2. Fill name → continue → pick a reason chip → continue → fill WhatsApp → **Agendar** → confirmation step with Verde check.
3. Close at any time via the × or by clicking the backdrop.

## Tone applied

The booking copy follows the brand's voice fundamentals: acolhe primeiro (greets and uses the first name), pergunta antes de prescrever ("posso te perguntar o que te trouxe até a Corporis?"), nunca urgência fake. No countdowns, no "vagas limitadas," no "agende agora!". The success screen names the next step explicitly: contato em até 2h em horário comercial.

## Open placeholders (need real photography)

The hero visual and team portraits are intentionally left as labeled placeholders. The brand identity explicitly requires real photos of the clinic and team — stock photography is on the avoid list. Drop the real photos in `assets/photo-*` and swap them in.
