import { z } from "zod";

// ─── Config ───────────────────────────────────────────────────────────────────

function evolutionConfig() {
  const baseUrl  = process.env.EVOLUTION_API_URL;
  const apiKey   = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!baseUrl || !apiKey || !instance) {
    throw new Error("Evolution API env vars missing (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE).");
  }
  return { baseUrl, apiKey, instance };
}

async function evoFetch(path: string, body: unknown): Promise<unknown> {
  const { baseUrl, apiKey, instance } = evolutionConfig();
  const url = `${baseUrl}${path.replace("{instance}", instance)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Phone helpers ────────────────────────────────────────────────────────────

/** Convert remoteJid ("5549999999999@s.whatsapp.net") to E.164 ("+5549999999999") */
export function jidToE164(jid: string): string {
  const phone = jid.split("@")[0];
  return phone.startsWith("+") ? phone : `+${phone}`;
}

/** Strip E.164 "+" prefix for Evolution API number field */
export function e164ToEvolution(e164: string): string {
  return e164.replace(/^\+/, "");
}

// ─── Message content extraction ───────────────────────────────────────────────

export function extractMessageText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  return (
    (m.conversation as string) ??
    (m.extendedTextMessage as Record<string, string> | undefined)?.text ??
    null
  );
}

// ─── Send text ────────────────────────────────────────────────────────────────

const sendTextSchema = z.object({
  phone: z.string().min(8),
  text:  z.string().min(1),
});

export type SendTextInput = z.infer<typeof sendTextSchema>;

export async function sendTextMessage(input: SendTextInput): Promise<unknown> {
  const { phone, text } = sendTextSchema.parse(input);
  return evoFetch("/message/sendText/{instance}", {
    number: e164ToEvolution(phone),
    text,
  });
}

// ─── Send template ────────────────────────────────────────────────────────────

export interface TemplateVar { type: string; text?: string }

export async function sendTemplate(
  phone: string,
  templateName: string,
  components: TemplateVar[] = [],
): Promise<unknown> {
  return evoFetch("/message/sendTemplate/{instance}", {
    number: e164ToEvolution(phone),
    template: {
      name: templateName,
      language: { code: "pt_BR" },
      components,
    },
  });
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export async function markAsRead(chatId: string): Promise<unknown> {
  return evoFetch("/chat/markMessageAsRead/{instance}", {
    readMessages: [{ remoteJid: chatId, fromMe: false, id: "" }],
  });
}
