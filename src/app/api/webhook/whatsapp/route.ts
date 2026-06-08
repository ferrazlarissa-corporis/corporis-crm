import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { jidToE164, extractMessageText, isContactSaved, fetchMediaBase64 } from "@/lib/evolution/client";
import { transcribeAudio } from "@/lib/ai/whisper";

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

  // Evolution API v2 sends "messages.upsert"; accept uppercase variant too.
  // `fromMe` messages are direct human replies from WhatsApp/Web and must be synced.
  const normalizedEvent = event.toLowerCase().replace(/_/g, ".");
  if (
    normalizedEvent !== "messages.upsert" &&
    normalizedEvent !== "message.any" &&
    normalizedEvent !== "send.message"
  ) {
    return NextResponse.json({ ok: true, skipped: event });
  }

  const fromMe             = data.key.fromMe;
  const evolutionMessageId = data.key.id;
  const remoteJid          = data.key.remoteJid;
  const telefone           = jidToE164(remoteJid);
  const textContent = extractMessageText(data.message);
  const isAudio     = !textContent && (
    data.messageType === "audioMessage" || data.messageType === "pttMessage"
  );

  let effectiveContent = textContent;

  if (isAudio) {
    const media = await fetchMediaBase64(data.key);
    if (media) {
      const transcript = await transcribeAudio(media.base64, media.mimetype);
      if (transcript) effectiveContent = transcript;
    }
  }

  if (!effectiveContent) {
    return NextResponse.json({ ok: true, skipped: "non-text" });
  }

  const supabase = createServiceRoleClient();
  const db       = supabase.schema("crm");
  const now      = new Date().toISOString();

  // 3. Deduplicate
  const { data: existing } = await db
    .from("messages")
    .select("id")
    .eq("evolution_message_id", evolutionMessageId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 4. Find or create lead
  const { data: existingLead, error: existingLeadErr } = await db
    .from("leads")
    .select("id, nome, estagio")
    .eq("telefone", telefone)
    .maybeSingle();

  if (existingLeadErr) {
    console.error("[webhook] lead lookup error:", existingLeadErr);
    return NextResponse.json({ error: "lead_lookup_failed" }, { status: 500 });
  }

  const { data: lead, error: leadErr } = existingLead
    ? await db
        .from("leads")
        .update({ ultima_interacao_at: now })
        .eq("id", existingLead.id)
        .select("id, nome, estagio")
        .single()
    : await db
        .from("leads")
        .insert({
          nome: data.pushName?.trim() || telefone,
          telefone,
          ultima_interacao_at: now,
        })
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
        nao_lida:           !fromMe,
        ...(fromMe ? { modo: "humano" as const } : {}),
      },
      { onConflict: "evolution_chat_id", ignoreDuplicates: false }
    )
    .select("id, modo, status")
    .single();

  if (convErr || !conv) {
    console.error("[webhook] conv upsert error:", convErr);
    return NextResponse.json({ error: "conv_upsert_failed" }, { status: 500 });
  }

  // 6. Reset command — intercept before storing message
  const resetSecret = process.env.AGENT_RESET_SECRET;
  if (resetSecret && !fromMe && effectiveContent.trim() === resetSecret) {
    await db.from("messages").delete().eq("conversation_id", conv.id);

    await db.from("leads").update({
      estagio:             "qualificacao",
      score_qualificacao:  null,
      interesse:           "indefinido",
      ultima_interacao_at: now,
    }).eq("id", lead.id);

    await db.from("conversations").update({ modo: "ia", nao_lida: false }).eq("id", conv.id);

    await db.from("activities").insert({
      lead_id:   lead.id,
      tipo:      "sistema",
      descricao: "Conversa resetada para teste via comando secreto",
      meta:      { comando: "reset", conversation_id: conv.id },
    });

    return NextResponse.json({ ok: true, reset: true });
  }

  // 7. Insert message
  if (fromMe) {
    const recentThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentManualMessage } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conv.id)
      .eq("direcao", "saida")
      .eq("autor", "humano")
      .eq("conteudo", effectiveContent)
      .is("evolution_message_id", null)
      .gte("created_at", recentThreshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentManualMessage) {
      await db
        .from("messages")
        .update({ evolution_message_id: evolutionMessageId })
        .eq("id", recentManualMessage.id);
    } else {
      await db.from("messages").insert({
        conversation_id:      conv.id,
        direcao:              "saida",
        autor:                "humano",
        conteudo:             effectiveContent,
        tipo:                 isAudio ? "audio" : "texto",
        evolution_message_id: evolutionMessageId,
      });
    }
  } else {
    await db.from("messages").insert({
      conversation_id:      conv.id,
      direcao:              "entrada",
      autor:                "lead",
      conteudo:             effectiveContent,
      tipo:                 isAudio ? "audio" : "texto",
      evolution_message_id: evolutionMessageId,
    });
  }

  // 7. Log activity
  await db.from("activities").insert({
    lead_id:  lead.id,
    tipo:     "mensagem",
    descricao: fromMe
      ? (isAudio ? "Áudio enviado manualmente pelo WhatsApp" : "Mensagem enviada manualmente pelo WhatsApp")
      : (isAudio ? "Áudio recebido no WhatsApp (transcrição automática)" : "Mensagem recebida no WhatsApp"),
    meta:     {
      evolution_message_id: evolutionMessageId,
      preview: effectiveContent.slice(0, 120),
      from_me: fromMe,
    },
  });

  // 8. Trigger AI if mode = 'ia' and agent is active
  if (!fromMe && conv.modo === "ia") {
    const { data: agentConf } = await db
      .from("agent_config")
      .select("ativo, apenas_desconhecidos, numeros_bypass")
      .single();

    // If filter is active, skip AI for contacts saved in the phone's address book,
    // unless the number is in the bypass list (test numbers, staff, etc.)
    if (agentConf?.apenas_desconhecidos) {
      const bypass = Array.isArray(agentConf.numeros_bypass)
        ? (agentConf.numeros_bypass as string[])
        : [];
      const isBypassed = bypass.includes(telefone);
      if (!isBypassed) {
        const saved = await isContactSaved(remoteJid);
        if (saved) {
          return NextResponse.json({ ok: true, skipped: "known_contact", conversation_id: conv.id });
        }
      }
    }

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
