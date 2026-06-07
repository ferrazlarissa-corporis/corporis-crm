import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage } from "@/lib/evolution/client";
import { AGENT_TOOLS, executeTool, type ToolInput } from "@/lib/ai/tools";
import { resolveModel } from "@/lib/ai/model";
import type { Json } from "@/types/database";

// Separador que o modelo usa para quebrar a resposta em mensagens curtas (bursts).
const BURST_DELIMITER = "---";
const MAX_BURSTS = 4;

interface ConversaExemplo {
  titulo?: string;
  dialogo?: { autor: "lead" | "clara"; texto: string }[];
}

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
  exemplos: Json,
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

  const exemplosArr = Array.isArray(exemplos) ? (exemplos as ConversaExemplo[]) : [];
  const exemplosStr = exemplosArr.length > 0
    ? "\n\n## Exemplos do jeito da Larissa (imite o tom e o ritmo, NÃO copie literalmente)\n" +
      exemplosArr
        .filter((ex) => Array.isArray(ex.dialogo) && ex.dialogo.length > 0)
        .map((ex) => {
          const head = ex.titulo ? `### ${ex.titulo}\n` : "";
          const body = (ex.dialogo ?? [])
            .map((t) => `${t.autor === "lead" ? "Lead" : "Clara"}: ${t.texto}`)
            .join("\n");
          return head + body;
        })
        .join("\n\n")
    : "";

  return `${personaPrompt}

## Contexto da aluna
- Nome: ${lead.nome}
- Interesse: ${lead.interesse}
- Estágio no funil: ${lead.estagio}
- Score de qualificação: ${lead.score_qualificacao ?? "não avaliado"}

## Quem é você
- Seu nome é Clara. Fale de forma natural, calorosa e pessoal — como a Larissa falaria no WhatsApp.
- NÃO se apresente espontaneamente como IA, robô, assistente virtual ou atendimento automático.
- Se a pessoa perguntar DIRETAMENTE se você é uma IA/robô/atendente automático, responda com honestidade e leveza, sem drama.

## Como escrever no WhatsApp (estilo humano)
- Responda em mensagens curtas, como uma pessoa digitando — não em um parágrafo único e longo.
- Separe cada mensagem por uma linha contendo apenas "${BURST_DELIMITER}".
- Use no máximo ${MAX_BURSTS} mensagens por resposta. Frases curtas, tom de conversa.
- Evite emojis em excesso (no máximo um, e só quando soar natural).

## Guardrails obrigatórios
- NUNCA prometa cura, resultado em prazo ou faça diagnóstico.
- NUNCA use "paciente" ou "patologia". Use "aluna" e "incômodo".
- Comunicação sobre fisioterapia pélvica: discreta e respeitosa.
- Sem urgência fabricada, sem "últimas vagas", sem CAPS LOCK.
- Em caso de dúvida clínica específica: use solicitar_handoff.
- Responda sempre em português brasileiro.
${exemplosStr}${faqStr}${handoffStr}`;
}

// Quebra a resposta do modelo em mensagens curtas (bursts).
function splitIntoBursts(text: string): string[] {
  return text
    .split(new RegExp(`\\n?\\s*${BURST_DELIMITER}\\s*\\n?`, "g"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, MAX_BURSTS);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const { provider, modelId } = resolveModel(config.model_provider, config.model_id);

  const systemPrompt = buildSystemPrompt(
    config.persona_prompt,
    config.faq,
    config.regras_handoff,
    config.exemplos_conversa,
    lead
  );

  const toolCtx = { leadId: lead.id, conversationId: conversation_id };
  let finalText = "";

  if (provider === "openai") {
    // ─── OpenAI agentic loop ──────────────────────────────────────────────────
    type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
    type OAIMsg =
      | { role: "system" | "user" | "assistant"; content: string }
      | { role: "assistant"; content: null; tool_calls: OAIToolCall[] }
      | { role: "tool"; tool_call_id: string; content: string };

    const oaiTools = AGENT_TOOLS.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));

    const oaiMessages: OAIMsg[] = [
      { role: "system", content: systemPrompt },
      ...(msgRows ?? []).map((m) => ({
        role: (m.direcao === "entrada" ? "user" : "assistant") as "user" | "assistant",
        content: m.conteudo,
      })),
    ];

    for (let turn = 0; turn < 5; turn++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: modelId, max_tokens: 1024, messages: oaiMessages, tools: oaiTools, tool_choice: "auto" }),
      });

      if (!res.ok) {
        console.error("[ai/reply] OpenAI error", res.status, await res.text().catch(() => ""));
        break;
      }

      const data = await res.json() as { choices: [{ finish_reason: string; message: { content: string | null; tool_calls?: OAIToolCall[] } }] };
      const msg = data.choices[0].message;

      if (msg.content) finalText = msg.content;

      if (data.choices[0].finish_reason === "stop" || !msg.tool_calls?.length) break;

      oaiMessages.push({ role: "assistant", content: null, tool_calls: msg.tool_calls });
      for (const tc of msg.tool_calls) {
        const input = JSON.parse(tc.function.arguments) as ToolInput;
        const result = await executeTool(tc.function.name, input, toolCtx);
        oaiMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }
  } else {
    // ─── Anthropic agentic loop ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let messages = [...anthropicMessages];

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

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input as ToolInput, toolCtx);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }

      messages = [
        ...messages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const,      content: toolResults },
      ];
    }
  }

  // Send and store reply — em mensagens curtas (bursts), como uma pessoa digitando.
  const bursts = splitIntoBursts(finalText);
  if (bursts.length > 0) {
    for (let i = 0; i < bursts.length; i++) {
      const chunk = bursts[i];

      // Pausa curta entre mensagens (levemente proporcional ao tamanho).
      if (i > 0) {
        const delay = Math.min(1400, 700 + chunk.length * 12);
        await sleep(delay);
      }

      await sendTextMessage({ phone: lead.telefone, text: chunk });

      await db.from("messages").insert({
        conversation_id,
        direcao:  "saida",
        autor:    "ia",
        conteudo: chunk,
        tipo:     "texto",
      });
    }

    await db.from("activities").insert({
      lead_id:  lead.id,
      tipo:     "mensagem",
      descricao: "Mensagem enviada pelo agente IA",
      meta:     { preview: bursts.join(" ").slice(0, 120), bursts: bursts.length },
    });
  }

  return NextResponse.json({ ok: true, model: modelId, bursts: bursts.length });
}
