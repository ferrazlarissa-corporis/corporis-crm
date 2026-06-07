import { NextResponse, type NextRequest } from "next/server";
import { unzipSync, strFromU8 } from "fflate";

export const maxDuration = 60;

// ─── WhatsApp chat parser ─────────────────────────────────────────────────────

const MSG_RE = /^\[(\d{2}\/\d{2}\/\d{4}),\s*(\d{2}:\d{2}:\d{2})\]\s+([^:]+):\s*([\s\S]*)$/;

function parseChat(text: string) {
  const msgs: { sender: string; content: string }[] = [];
  let cur: { sender: string; content: string } | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.replace(/[‎‏‪-‮﻿]/g, "").trim();
    if (!line) continue;
    const m = line.match(MSG_RE);
    if (m) {
      if (cur) msgs.push(cur);
      cur = { sender: m[3].trim(), content: m[4].trim() };
    } else if (cur) {
      cur.content += "\n" + line;
    }
  }
  if (cur) msgs.push(cur);
  return msgs;
}

const SYSTEM_PATTERNS = [
  /As mensagens e ligações são protegidas/,
  /está na sua lista de contatos/,
  /Esta conversa foi iniciada em/,
  /criptografia de ponta a ponta/,
  /Mensagem apagada/,
  /Você bloqueou este contato/,
  /Ligação de voz/,
  /Chamada de vídeo/,
];

function classify(content: string) {
  for (const p of SYSTEM_PATTERNS) if (p.test(content)) return { type: "system" as const };

  const audioM =
    content.match(/<anexado:\s*([\w.\-]+\.opus)>/i) ||
    content.match(/<anexado:\s*([\w.\-]+\.ogg)>/i)  ||
    content.match(/<anexado:\s*([\w.\-]+\.m4a)>/i)  ||
    content.match(/<anexado:\s*([\w.\-]+\.mp3)>/i);
  if (audioM) return { type: "audio" as const, filename: audioM[1] };

  if (
    /<anexado:\s*[\w.\-]+\.(webp|jpg|jpeg|png|gif)>/i.test(content) ||
    /imagem ocultada/i.test(content)   ||
    /figurinha omitida/i.test(content) ||
    /sticker omitido/i.test(content)
  ) return { type: "skip" as const };

  if (/documento omitido/i.test(content) || /<anexado:.*\.pdf>/i.test(content))
    return { type: "skip" as const };

  if (/^https?:\/\/\S+$/.test(content.trim())) return { type: "skip" as const };

  const text = content
    .replace(/\s*<Mensagem editada>\s*$/g, "")
    .replace(/<anexado:[^>]+>/g, "")
    .trim();

  return text ? { type: "text" as const, text } : { type: "skip" as const };
}

// ─── Whisper ─────────────────────────────────────────────────────────────────

async function transcribeAudio(data: Uint8Array, mimeType = "audio/ogg"): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, "audio.ogg");
    form.append("model", "whisper-1");
    form.append("language", "pt");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return null;
    const json = await res.json() as { text?: string };
    return json.text?.trim() || null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const file = formData.get("zip") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  let zipEntries: ReturnType<typeof unzipSync>;
  try {
    zipEntries = unzipSync(new Uint8Array(bytes));
  } catch {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }

  const chatEntry = Object.entries(zipEntries).find(([name]) => name.endsWith("_chat.txt"));
  if (!chatEntry) return NextResponse.json({ error: "no_chat_txt" }, { status: 422 });

  const chatText = strFromU8(chatEntry[1]);
  const rawMsgs  = parseChat(chatText);

  const titulo = file.name
    .replace(/\.zip$/i, "")
    .replace(/^WhatsApp Chat - /, "")
    .trim();

  const MAX_MESSAGES = 40;
  const dialogo: { autor: "lead" | "clara"; texto: string }[] = [];

  for (const msg of rawMsgs) {
    if (dialogo.length >= MAX_MESSAGES) break;

    const c = classify(msg.content);
    if (c.type === "system" || c.type === "skip") continue;

    const autor: "lead" | "clara" = msg.sender === "Corporis" ? "clara" : "lead";

    if (c.type === "audio") {
      const audioEntry = zipEntries[c.filename];
      if (audioEntry) {
        const transcript = await transcribeAudio(audioEntry);
        if (transcript) dialogo.push({ autor, texto: transcript });
      }
      continue;
    }

    if (c.type === "text") {
      dialogo.push({ autor, texto: c.text });
    }
  }

  if (dialogo.length === 0) {
    return NextResponse.json({ error: "empty_conversation" }, { status: 422 });
  }

  return NextResponse.json({ titulo, dialogo });
}
