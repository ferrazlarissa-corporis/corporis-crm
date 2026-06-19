import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { jidToE164, extractMessageText, isContactSaved, getContactSavedStatus, fetchMediaBase64 } from "@/lib/evolution/client";
import { transcribeAudio } from "@/lib/ai/whisper";
import { isPhoneInBypassList } from "@/lib/phone";

// ─── Payload schema ───────────────────────────────────────────────────────────

const webhookSchema = z.object({
  event:    z.string(),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      id:            z.string(),
      remoteJid:     z.string(),
      // WhatsApp LID addressing: remoteJid comes as "<n>@lid" and the real phone
      // number lives in remoteJidAlt as "<phone>@s.whatsapp.net".
      remoteJidAlt:  z.string().optional(),
      addressingMode: z.string().optional(),
      fromMe:        z.boolean().optional().default(false),
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
  const rawRemoteJid       = data.key.remoteJid;
  // Resolve LID addressing to the real phone JID. When the chat is addressed via
  // "@lid", the actual "<phone>@s.whatsapp.net" is provided in remoteJidAlt.
  const isLid              = rawRemoteJid.endsWith("@lid") || data.key.addressingMode === "lid";
  const remoteJid          = isLid && data.key.remoteJidAlt ? data.key.remoteJidAlt : rawRemoteJid;
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

  if (!remoteJid.endsWith("@s.whatsapp.net")) {
    return NextResponse.json({ ok: true, skipped: "non_individual_chat" });
  }

  const supabase = createServiceRoleClient();
  const db       = supabase.schema("crm");
  const now      = new Date().toISOString();
  const resetSecret = process.env.AGENT_RESET_SECRET;
  const isResetCommand = Boolean(resetSecret && !fromMe && effectiveContent.trim() === resetSecret);

  // 3. Deduplicate
  const { data: existing } = await db
    .from("messages")
    .select("id")
    .eq("evolution_message_id", evolutionMessageId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 4. Find lead and agent config in parallel
  const [existingLeadResult, agentConfResult] = await Promise.all([
    db.from("leads")
      .select("id, nome, estagio")
      .eq("telefone", telefone)
      .maybeSingle(),
    db.from("agent_config")
      .select("ativo, apenas_desconhecidos, numeros_bypass")
      .single(),
  ]);

  const { data: existingLead, error: existingLeadErr } = existingLeadResult;
  const agentConf = agentConfResult.data;

  if (existingLeadErr) {
    console.error("[webhook] lead lookup error:", existingLeadErr);
    return NextResponse.json({ error: "lead_lookup_failed" }, { status: 500 });
  }

  const bypass = Array.isArray(agentConf?.numeros_bypass)
    ? (agentConf.numeros_bypass as string[])
    : [];
  const isBypassed = isPhoneInBypassList(telefone, bypass);
  // Bypass numbers re-enter the funnel (as a fresh lead) whenever they send the reset command
  const shouldRecreateLeadOnReset = isResetCommand && isBypassed;

  if (!existingLead) {
    if (fromMe) {
      return NextResponse.json({ ok: true, skipped: "outbound_without_existing_lead" });
    }

    if (!isBypassed && !shouldRecreateLeadOnReset) {
      const contactSaved = await getContactSavedStatus(remoteJid);
      if (contactSaved !== false) {
        return NextResponse.json({
          ok: true,
          skipped: contactSaved === true ? "known_contact_without_lead" : "contact_status_unavailable",
        });
      }
    }
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
  if (isResetCommand) {
    if (shouldRecreateLeadOnReset) {
      await db.from("leads").delete().eq("id", lead.id);

      const { data: freshLead, error: freshLeadErr } = await db
        .from("leads")
        .insert({
          nome: data.pushName?.trim() || lead.nome || telefone,
          telefone,
          estagio: "novo",
          interesse: "indefinido",
          score_qualificacao: null,
          ultima_interacao_at: now,
        })
        .select("id")
        .single();

      if (freshLeadErr || !freshLead) {
        console.error("[webhook] reset recreate lead error:", freshLeadErr);
        return NextResponse.json({ error: "reset_recreate_lead_failed" }, { status: 500 });
      }

      const { data: freshConv, error: freshConvErr } = await db
        .from("conversations")
        .insert({
          lead_id: freshLead.id,
          evolution_chat_id: remoteJid,
          modo: "ia",
          status: "aberta",
          nao_lida: false,
          janela_24h_expira_at: window24h,
        })
        .select("id")
        .single();

      if (freshConvErr || !freshConv) {
        console.error("[webhook] reset recreate conversation error:", freshConvErr);
        return NextResponse.json({ error: "reset_recreate_conversation_failed" }, { status: 500 });
      }

      await db.from("activities").insert({
        lead_id: freshLead.id,
        tipo: "sistema",
        descricao: "Lead de teste recriada do zero via comando secreto",
        meta: {
          comando: "reset",
          telefone,
          previous_lead_id: lead.id,
          previous_conversation_id: conv.id,
          conversation_id: freshConv.id,
        },
      });

      return NextResponse.json({
        ok: true,
        reset: true,
        recreated: true,
        lead_id: freshLead.id,
        conversation_id: freshConv.id,
      });
    }

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
  // Primeiro contato = nenhuma mensagem ainda nesta conversa (antes deste insert).
  const { count: priorMessages } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id);
  const isFirstContact = (priorMessages ?? 0) === 0;
  let triggerMessageId: string | null = null;

  if (fromMe) {
    const recentThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Check for Clara's outbound message echoed back by Evolution API
    const { data: recentAiMessage } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conv.id)
      .eq("direcao", "saida")
      .eq("autor", "ia")
      .eq("conteudo", effectiveContent)
      .is("evolution_message_id", null)
      .gte("created_at", recentThreshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAiMessage) {
      // Echo of Clara's message — just attach the evolution ID, don't flip mode
      await db
        .from("messages")
        .update({ evolution_message_id: evolutionMessageId })
        .eq("id", recentAiMessage.id);
      return NextResponse.json({ ok: true, synced_ai_message: true, conversation_id: conv.id });
    }

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
      // Genuine human reply from WhatsApp — insert and flip to human mode
      await db.from("messages").insert({
        conversation_id:      conv.id,
        direcao:              "saida",
        autor:                "humano",
        conteudo:             effectiveContent,
        tipo:                 isAudio ? "audio" : "texto",
        evolution_message_id: evolutionMessageId,
      });
      await db.from("conversations").update({ modo: "humano" }).eq("id", conv.id);
    }
  } else {
    const { data: insertedMessage, error: insertMessageErr } = await db.from("messages").insert({
      conversation_id:      conv.id,
      direcao:              "entrada",
      autor:                "lead",
      conteudo:             effectiveContent,
      tipo:                 isAudio ? "audio" : "texto",
      evolution_message_id: evolutionMessageId,
    }).select("id").single();

    if (insertMessageErr || !insertedMessage) {
      console.error("[webhook] message insert error:", insertMessageErr);
      return NextResponse.json({ error: "message_insert_failed" }, { status: 500 });
    }

    triggerMessageId = insertedMessage.id;
  }

  // 7. Log activity — só o primeiro contato vira marco; trocas seguintes vivem na tabela messages.
  if (isFirstContact) {
    await db.from("activities").insert({
      lead_id:  lead.id,
      tipo:     "mensagem",
      descricao: "Primeiro contato no WhatsApp",
      meta:     {
        evolution_message_id: evolutionMessageId,
        preview: effectiveContent.slice(0, 120),
        from_me: fromMe,
      },
    });
  } else if (!fromMe) {
    // Resposta de lead a uma campanha de reativação — registra uma única vez.
    const { data: lastCampaign } = await db
      .from("activities")
      .select("id, created_at, meta")
      .eq("lead_id", lead.id)
      .eq("tipo", "campanha")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isCampaignTarget =
      lastCampaign && !(lastCampaign.meta as { campanha_resposta?: boolean } | null)?.campanha_resposta;

    if (isCampaignTarget) {
      const { count: respondedAfter } = await db
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .eq("tipo", "campanha")
        .gt("created_at", lastCampaign.created_at);

      if ((respondedAfter ?? 0) === 0) {
        await db.from("activities").insert({
          lead_id:  lead.id,
          tipo:     "campanha",
          descricao: "Respondeu à campanha de reativação",
          meta:     { campanha_resposta: true },
        });
      }
    }
  }

  // 8. Trigger AI if mode = 'ia' (bypass numbers always reach Clara, even if the
  // conversation was flipped to 'humano' by a manual/synced reply — test line stays on IA).
  if (!fromMe && (conv.modo === "ia" || isBypassed)) {
    if (!isBypassed) {
      // Skip known contacts when filter is active
      if (agentConf?.apenas_desconhecidos) {
        const saved = await isContactSaved(remoteJid);
        if (saved) {
          return NextResponse.json({ ok: true, skipped: "known_contact", conversation_id: conv.id });
        }
      }
      // Skip if agent is globally disabled
      if (!agentConf?.ativo) {
        return NextResponse.json({ ok: true, skipped: "agent_inactive", conversation_id: conv.id });
      }
    }

    // Bypass numbers always reach Clara regardless of ativo or filters.
    // Call ai/reply synchronously — Evolution API tolerates the extra seconds
    // and this avoids relying on after() which may not keep the function alive on all plans.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      const res = await fetch(`${appUrl}/api/ai/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
        },
        body: JSON.stringify({
          conversation_id: conv.id,
          ...(triggerMessageId ? { trigger_message_id: triggerMessageId } : {}),
        }),
      });
      if (!res.ok) {
        console.error("[webhook] ai/reply non-ok:", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[webhook] ai/reply fire error:", err);
    }
  }

  return NextResponse.json({ ok: true, conversation_id: conv.id });
}
