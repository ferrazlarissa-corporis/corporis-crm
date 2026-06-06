import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { jidToE164, extractMessageText } from "@/lib/evolution/client";

// ─── Payload schema ───────────────────────────────────────────────────────────

const webhookSchema = z.object({
  event:    z.string(),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      id:        z.string(),
      remoteJid: z.string(),
      fromMe:    z.boolean().optional().default(false),
    }),
    message:          z.unknown().optional(),
    pushName:         z.string().optional(),
    messageType:      z.string().optional(),
    messageTimestamp: z.number().optional(),
  }),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth — only enforce secret if EVOLUTION_WEBHOOK_SECRET is configured
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (expectedSecret) {
    const secret = request.headers.get("x-corporis-webhook-secret") ??
                   request.headers.get("x-webhook-secret");
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Parse
  const body = await request.json().catch(() => null);
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { event, data } = parsed.data;

  // Only handle incoming text messages
  // Evolution API v2 sends "messages.upsert"; accept uppercase variant too
  const normalizedEvent = event.toLowerCase().replace(/_/g, ".");
  if (normalizedEvent !== "messages.upsert" && normalizedEvent !== "message.any") {
    return NextResponse.json({ ok: true, skipped: event });
  }
  if (data.key.fromMe) {
    return NextResponse.json({ ok: true, skipped: "outgoing" });
  }

  const evolutionMessageId = data.key.id;
  const remoteJid          = data.key.remoteJid;
  const telefone           = jidToE164(remoteJid);
  const textContent        = extractMessageText(data.message);

  if (!textContent) {
    return NextResponse.json({ ok: true, skipped: "non-text" });
  }

  const supabase = createServiceRoleClient();
  const db       = supabase.schema("crm");

  // 3. Deduplicate
  const { data: existing } = await db
    .from("messages")
    .select("id")
    .eq("evolution_message_id", evolutionMessageId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 4. Upsert lead
  const nome = data.pushName ?? telefone;
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .upsert(
      { nome, telefone, ultima_interacao_at: new Date().toISOString() },
      { onConflict: "telefone", ignoreDuplicates: false }
    )
    .select("id, nome, estagio")
    .single();

  if (leadErr || !lead) {
    console.error("[webhook] lead upsert error:", leadErr);
    return NextResponse.json({ error: "lead_upsert_failed" }, { status: 500 });
  }

  // 5. Upsert conversation
  const window24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: conv, error: convErr } = await db
    .from("conversations")
    .upsert(
      {
        lead_id:            lead.id,
        evolution_chat_id:  remoteJid,
        janela_24h_expira_at: window24h,
        nao_lida:           true,
      },
      { onConflict: "evolution_chat_id", ignoreDuplicates: false }
    )
    .select("id, modo, status")
    .single();

  if (convErr || !conv) {
    console.error("[webhook] conv upsert error:", convErr);
    return NextResponse.json({ error: "conv_upsert_failed" }, { status: 500 });
  }

  // 6. Insert message
  await db.from("messages").insert({
    conversation_id:      conv.id,
    direcao:              "entrada",
    autor:                "lead",
    conteudo:             textContent,
    tipo:                 "texto",
    evolution_message_id: evolutionMessageId,
  });

  // 7. Log activity
  await db.from("activities").insert({
    lead_id:  lead.id,
    tipo:     "mensagem",
    descricao: `Mensagem recebida no WhatsApp`,
    meta:     { evolution_message_id: evolutionMessageId, preview: textContent.slice(0, 120) },
  });

  // 8. Trigger AI if mode = 'ia' and agent is active
  if (conv.modo === "ia") {
    const { data: agentConf } = await db
      .from("agent_config")
      .select("ativo")
      .single();

    if (agentConf?.ativo) {
      // Run after the response is sent. Unlike a bare fire-and-forget fetch,
      // after() keeps the serverless function alive until this completes,
      // so the internal call to /api/ai/reply is not killed on Vercel.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      after(async () => {
        try {
          const res = await fetch(`${appUrl}/api/ai/reply`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
            },
            body: JSON.stringify({ conversation_id: conv.id }),
          });
          if (!res.ok) {
            console.error("[webhook] ai/reply non-ok:", res.status, await res.text().catch(() => ""));
          }
        } catch (err) {
          console.error("[webhook] ai/reply fire error:", err);
        }
      });
    }
  }

  return NextResponse.json({ ok: true, conversation_id: conv.id });
}
