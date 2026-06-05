"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ConversationMode } from "@/types/database";

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
