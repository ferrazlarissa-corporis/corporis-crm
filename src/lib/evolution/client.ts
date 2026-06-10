import { z } from "zod";

// ─── Config ───────────────────────────────────────────────────────────────────

function evolutionConfig() {
  const baseUrl  = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
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

async function evoGet(path: string): Promise<unknown> {
  const { baseUrl, apiKey, instance } = evolutionConfig();
  const url = `${baseUrl}${path.replace("{instance}", instance)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { apikey: apiKey },
    cache: "no-store",
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

/**
 * Send a text message via Evolution API.
 * @param delayMs - If provided, shows "typing..." indicator for this many ms before sending.
 */
export async function sendTextMessage(input: SendTextInput, delayMs?: number): Promise<unknown> {
  const { phone, text } = sendTextSchema.parse(input);
  return evoFetch("/message/sendText/{instance}", {
    number: e164ToEvolution(phone),
    text,
    ...(delayMs ? { options: { delay: delayMs, presence: "composing" } } : {}),
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

// ─── Connection state ─────────────────────────────────────────────────────────

export async function getConnectionState(): Promise<"open" | "close" | "connecting"> {
  const data = await evoGet("/instance/connectionState/{instance}");
  const state = (data as Record<string, Record<string, string>>)?.instance?.state;
  if (state === "open" || state === "connecting") return state;
  return "close";
}

export interface InstanceInfo {
  profileName?: string;
  number?: string;
}

export async function getInstanceInfo(): Promise<InstanceInfo | null> {
  const { instance } = evolutionConfig();
  const data = await evoGet(`/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`);
  const list = Array.isArray(data) ? data : [];
  const found = list[0] as Record<string, unknown> | undefined;
  if (!found) return null;
  return {
    profileName: found.profileName as string | undefined,
    number: found.number as string | undefined,
  };
}

export async function connectInstance(): Promise<{ base64: string } | null> {
  const data = await evoGet("/instance/connect/{instance}");
  const d = data as Record<string, unknown>;
  const base64 = (d?.base64 ?? d?.code) as string | undefined;
  if (!base64) return null;
  return { base64 };
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export async function markAsRead(chatId: string): Promise<unknown> {
  return evoFetch("/chat/markMessageAsRead/{instance}", {
    readMessages: [{ remoteJid: chatId, fromMe: false, id: "" }],
  });
}

// ─── Fetch media as base64 ────────────────────────────────────────────────────

/**
 * Busca uma mensagem de mídia (áudio, imagem, doc) como base64 via Evolution API.
 * Retorna null em caso de erro — não bloqueia o fluxo principal.
 */
export async function fetchMediaBase64(
  key: { id: string; remoteJid: string; fromMe?: boolean }
): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const data = await evoFetch("/chat/getBase64FromMediaMessage/{instance}", {
      message: { key: { id: key.id, remoteJid: key.remoteJid, fromMe: key.fromMe ?? false } },
    }) as Record<string, unknown>;
    if (typeof data.base64 !== "string") return null;
    return { base64: data.base64, mimetype: (data.mimetype as string) ?? "audio/ogg" };
  } catch {
    return null;
  }
}

// ─── Presence / typing indicator ─────────────────────────────────────────────

/**
 * Sends a WhatsApp presence update ("composing" = typing indicator).
 * Best-effort — fails silently so it never blocks the reply flow.
 */
export async function sendPresence(
  phone: string,
  presence: "composing" | "recording" | "paused" | "available",
  delayMs = 5000,
): Promise<void> {
  try {
    // Evolution API v2: presence/delay são top-level, não dentro de `options`.
    await evoFetch("/chat/sendPresence/{instance}", {
      number: e164ToEvolution(phone),
      delay: delayMs,
      presence,
    });
  } catch {
    // non-critical
  }
}

// ─── Contact check ────────────────────────────────────────────────────────────

/**
 * Returns true if the JID (e.g. "5549999999999@s.whatsapp.net") is saved
 * in the WhatsApp instance's contact book. Returns false on error so AI
 * defaults to responding when the check is unavailable.
 */
export async function isContactSaved(jid: string): Promise<boolean> {
  const status = await getContactSavedStatus(jid);
  return status ?? false;
}

export async function getContactSavedStatus(jid: string): Promise<boolean | null> {
  try {
    // Evolution API v2: contacts use UUID as `id`; the JID lives in `remoteJid`
    const result = await evoFetch("/chat/findContacts/{instance}", { where: { remoteJid: jid } });
    const list = Array.isArray(result) ? result : [];
    return list.length > 0;
  } catch {
    return null;
  }
}
