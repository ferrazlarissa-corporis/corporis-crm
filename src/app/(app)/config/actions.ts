"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── Agent config ──────────────────────────────────────────────────────────────

const agentConfigSchema = z.object({
  ativo:                z.boolean(),
  persona_prompt:       z.string().min(10),
  mensagem_fora_horario: z.string(),
  horario_atendimento:  z.record(z.string(), z.string()),
  faq:                  z.array(z.object({ q: z.string(), a: z.string() })),
  regras_handoff:       z.array(z.string()),
});

export type AgentConfigInput = z.infer<typeof agentConfigSchema>;
export type ConfigResult = { success: true } | { success: false; error: string };

export async function updateAgentConfig(input: AgentConfigInput): Promise<ConfigResult> {
  const parsed = agentConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db.from("agent_config").update({
    ativo:                 parsed.data.ativo,
    persona_prompt:        parsed.data.persona_prompt,
    mensagem_fora_horario: parsed.data.mensagem_fora_horario,
    horario_atendimento:   parsed.data.horario_atendimento,
    faq:                   parsed.data.faq,
    regras_handoff:        parsed.data.regras_handoff,
  }).neq("id", "00000000-0000-0000-0000-000000000000"); // update the singleton

  if (error) return { success: false, error: error.message };

  revalidatePath("/config/agente");
  return { success: true };
}

// ─── Message templates ─────────────────────────────────────────────────────────

const templateSchema = z.object({
  nome:      z.string().min(1),
  categoria: z.enum(["lembrete", "confirmacao", "reativacao", "boas_vindas"]),
  conteudo:  z.string().min(1),
  aprovado_whatsapp:      z.boolean().default(false),
  whatsapp_template_name: z.string().optional(),
});

export async function createTemplate(input: z.infer<typeof templateSchema>): Promise<ConfigResult> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("message_templates").insert({
    nome:      parsed.data.nome,
    categoria: parsed.data.categoria,
    conteudo:  parsed.data.conteudo,
    aprovado_whatsapp:      parsed.data.aprovado_whatsapp,
    whatsapp_template_name: parsed.data.whatsapp_template_name ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}

export async function deleteTemplate(id: string): Promise<ConfigResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("message_templates").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}

// ─── User management ──────────────────────────────────────────────────────────

export async function toggleUserActive(userId: string, ativo: boolean): Promise<ConfigResult> {
  if (!z.string().uuid().safeParse(userId).success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("profiles").update({ ativo }).eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}
