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
        ? "Conversa assumida por humano — IA pausada"
        : "Conversa devolvida para o agente IA",
      meta:     { modo: parsed.data.modo },
    });
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

  try {
    await sendTextMessage({ phone: telefone, text: parsed.data.text });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar mensagem." };
  }

  const { data: msg, error: msgErr } = await db
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      direcao:         "saida",
      autor:           "humano",
      conteudo:        parsed.data.text,
      tipo:            "texto",
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
