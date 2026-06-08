"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ConversationMode } from "@/types/database";
import { sendTextMessage } from "@/lib/evolution/client";
import type { MessageRow } from "@/lib/queries/conversations";

const toggleHandoffSchema = z.object({
  conversationId: z.string().uuid(),
  modo: z.enum(["ia", "humano"]),
});

export type ToggleHandoffResult = { success: true } | { success: false; error: string };

export async function toggleHandoff(
  input: z.infer<typeof toggleHandoffSchema>
): Promise<ToggleHandoffResult> {
  const parsed = toggleHandoffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db
    .from("conversations")
    .update({ modo: parsed.data.modo as ConversationMode })
    .eq("id", parsed.data.conversationId);

  if (error) return { success: false, error: error.message };

  // Log handoff activity
  const { data: conv } = await db
    .from("conversations")
    .select("lead_id")
    .eq("id", parsed.data.conversationId)
    .single();

  if (conv) {
    await db.from("activities").insert({
      lead_id:  conv.lead_id,
      tipo:     "handoff",
      descricao: parsed.data.modo === "humano"
        ? "Conversa assumida por humano — Clara pausada"
        : "Conversa devolvida para a Clara",
      meta:     { modo: parsed.data.modo },
    });

    // Notificação WhatsApp quando handoff manual para humano
    if (parsed.data.modo === "humano") {
      try {
        const { data: config } = await db.from("agent_config").select("notificacao_handoff").single();
        const notif = config?.notificacao_handoff as { ativo?: boolean; numero?: string } | null;
        if (notif?.ativo && notif.numero) {
          const { data: lead } = await db.from("leads").select("nome, telefone").eq("id", conv.lead_id).single();
          if (lead) {
            const hora = new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
            });
            const texto = `*[Corporis CRM] Handoff necessário*\n\nLead: ${lead.nome}\nTelefone: ${lead.telefone}\nMotivo: Assumido manualmente pela equipe\nHorário: ${hora}\n\nAcesse o inbox para continuar.`;
            await sendTextMessage({ phone: notif.numero, text: texto });
          }
        }
      } catch { /* não bloqueia o handoff */ }
    }
  }

  revalidatePath("/inbox");
  return { success: true };
}

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function markConversationRead(
  input: z.infer<typeof markReadSchema>
): Promise<ToggleHandoffResult> {
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("conversations")
    .update({ nao_lida: false })
    .eq("id", parsed.data.conversationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inbox");
  return { success: true };
}

// ─── Send message ─────────────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().min(1).max(4096),
});

export type SendMessageResult =
  | { success: true; message: MessageRow }
  | { success: false; error: string };

function extractEvolutionMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const key = data.key;
  if (key && typeof key === "object" && typeof (key as Record<string, unknown>).id === "string") {
    return (key as Record<string, string>).id;
  }
  const message = data.message;
  if (message && typeof message === "object") {
    const messageKey = (message as Record<string, unknown>).key;
    if (messageKey && typeof messageKey === "object" && typeof (messageKey as Record<string, unknown>).id === "string") {
      return (messageKey as Record<string, string>).id;
    }
  }
  return null;
}

export async function sendMessage(
  input: z.infer<typeof sendMessageSchema>
): Promise<SendMessageResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data: conv } = await db
    .from("conversations")
    .select("id, lead_id, leads!inner(id, telefone)")
    .eq("id", parsed.data.conversationId)
    .single();

  if (!conv) return { success: false, error: "Conversa não encontrada." };

  const lead = Array.isArray(conv.leads) ? conv.leads[0] : conv.leads;
  const telefone = (lead as { telefone?: string })?.telefone;
  if (!telefone) return { success: false, error: "Telefone do lead não encontrado." };

  let evolutionMessageId: string | null = null;
  try {
    const sent = await sendTextMessage({ phone: telefone, text: parsed.data.text });
    evolutionMessageId = extractEvolutionMessageId(sent);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar mensagem." };
  }

  await db
    .from("conversations")
    .update({ modo: "humano", nao_lida: false })
    .eq("id", parsed.data.conversationId);

  const { data: msg, error: msgErr } = await db
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      direcao:         "saida",
      autor:           "humano",
      conteudo:        parsed.data.text,
      tipo:            "texto",
      evolution_message_id: evolutionMessageId,
    })
    .select("id, direcao, autor, conteudo, created_at, entregue_at, lida_at")
    .single();

  if (msgErr || !msg) return { success: false, error: "Mensagem enviada mas não gravada." };

  await db
    .from("leads")
    .update({ ultima_interacao_at: new Date().toISOString() })
    .eq("id", conv.lead_id);

  revalidatePath("/inbox");
  return { success: true, message: msg as MessageRow };
}
