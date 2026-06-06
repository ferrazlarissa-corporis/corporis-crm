import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage } from "@/lib/evolution/client";
import { AGENT_TOOLS, executeTool, type ToolInput } from "@/lib/ai/tools";
import { chooseAgentModel } from "@/lib/ai/model";
import type { Json } from "@/types/database";

// ─── Schema ───────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
});

// ─── Business hours ───────────────────────────────────────────────────────────

function isWithinBusinessHours(schedule: Json): boolean {
  const s = schedule as Record<string, string>;
  // Vercel runs UTC — convert to São Paulo time before checking hours
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0) return false;

  const range = day === 6 ? s.sabado : s.segunda_sexta;
  if (!range) return false;

  const [startStr, endStr] = range.split("-");
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM]     = endStr.split(":").map(Number);
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins   = endH * 60 + endM;
  return nowMins >= startMins && nowMins < endMins;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  personaPrompt: string,
  faq: Json,
  regrasHandoff: Json,
  lead: { nome: string; interesse: string; estagio: string; score_qualificacao: number | null }
): string {
  const faqStr = Array.isArray(faq) && faq.length > 0
    ? "\n\n## FAQ\n" + (faq as { q: string; a: string }[])
        .map((item) => `P: ${item.q}\nR: ${item.a}`)
        .join("\n\n")
    : "";

  const handoffStr = Array.isArray(regrasHandoff)
    ? `\n\n## Gatilhos de handoff (use a tool solicitar_handoff nestes casos)\n- ${(regrasHandoff as string[]).join("\n- ")}`
    : "";

  return `${personaPrompt}

## Contexto da aluna
- Nome: ${lead.nome}
- Interesse: ${lead.interesse}
- Estágio no funil: ${lead.estagio}
- Score de qualificação: ${lead.score_qualificacao ?? "não avaliado"}

## Guardrails obrigatórios
- NUNCA prometa cura, resultado em prazo ou faça diagnóstico.
- NUNCA use "paciente" ou "patologia". Use "aluna" e "incômodo".
- Comunicação sobre fisioterapia pélvica: discreta e respeitosa.
- Sem urgência fabricada, sem "últimas vagas", sem CAPS LOCK.
- Em caso de dúvida clínica específica: use solicitar_handoff.
- Responda sempre em português brasileiro.
${faqStr}${handoffStr}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Accept calls from internal webhook (via CRON_SECRET) or without auth in dev
  const auth = request.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { conversation_id } = parsed.data;
  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");

  // Load agent config
  const { data: config } = await db.from("agent_config").select("*").single();
  if (!config?.ativo) {
    return NextResponse.json({ ok: true, skipped: "agent_inactive" });
  }

  // Load conversation + lead
  const { data: conv } = await db
    .from("conversations")
    .select("id, modo, leads!inner(id, nome, telefone, interesse, estagio, score_qualificacao)")
    .eq("id", conversation_id)
    .single();

  if (!conv || conv.modo !== "ia") {
    return NextResponse.json({ ok: true, skipped: "not_ia_mode" });
  }

  const leadRow = Array.isArray(conv.leads) ? conv.leads[0] : conv.leads;
  if (!leadRow) return NextResponse.json({ error: "lead_not_found" }, { status: 404 });

  const lead = leadRow as {
    id: string; nome: string; telefone: string;
    interesse: string; estagio: string; score_qualificacao: number | null;
  };

  // Check business hours (after confirming we have a lead to message)
  if (!isWithinBusinessHours(config.horario_atendimento)) {
    if (config.mensagem_fora_horario) {
      await sendTextMessage({ phone: lead.telefone, text: config.mensagem_fora_horario });
    }
    return NextResponse.json({ ok: true, skipped: "outside_hours" });
  }

  // Load last 20 messages
  const { data: msgRows } = await db
    .from("messages")
    .select("direcao, conteudo")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true })
    .limit(20);

  const anthropicMessages: Anthropic.Messages.MessageParam[] = (msgRows ?? []).map((m) => ({
    role: m.direcao === "entrada" ? ("user" as const) : ("assistant" as const),
    content: m.conteudo,
  }));

  if (
    anthropicMessages.length === 0 ||
    anthropicMessages[anthropicMessages.length - 1].role !== "user"
  ) {
    return NextResponse.json({ ok: true, skipped: "no_user_message" });
  }

  const lastUserMsg = String(anthropicMessages[anthropicMessages.length - 1].content ?? "");
  const modelKey = chooseAgentModel(lastUserMsg);
  const modelId  = modelKey === "claude-sonnet"
    ? "claude-sonnet-4-6"
    : "claude-haiku-4-5-20251001";

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(
    config.persona_prompt,
    config.faq,
    config.regras_handoff,
    lead
  );

  // Agentic loop
  let messages = [...anthropicMessages];
  let finalText = "";

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model:      modelId,
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      AGENT_TOOLS,
      messages,
    });

    const textBlocks    = response.content.filter((b) => b.type === "text");
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b) => (b as Anthropic.Messages.TextBlock).text).join(" ");
    }

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) break;

    // Execute tools
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(block.name, block.input as ToolInput);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages = [
      ...messages,
      { role: "assistant" as const, content: response.content },
      { role: "user" as const,      content: toolResults },
    ];
  }

  // Send and store reply
  if (finalText.trim()) {
    await sendTextMessage({ phone: lead.telefone, text: finalText.trim() });

    await db.from("messages").insert({
      conversation_id,
      direcao:  "saida",
      autor:    "ia",
      conteudo: finalText.trim(),
      tipo:     "texto",
    });

    await db.from("activities").insert({
      lead_id:  lead.id,
      tipo:     "mensagem",
      descricao: "Mensagem enviada pelo agente IA",
      meta:     { preview: finalText.slice(0, 120) },
    });
  }

  return NextResponse.json({ ok: true, model: modelId });
}
