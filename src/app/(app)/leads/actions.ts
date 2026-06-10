"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  FUNIL_LEAD_SELECT,
  mapLeadRowForFunil,
  type FunilLead,
  type FunilLeadQueryRow,
} from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";
import { gerarContextoFromMessages } from "@/lib/ai/contexto-server";
import type { ContextoAvaliacao } from "@/lib/ai/contexto";
import type { LeadStage, LeadInterest, LeadOrigin, Json } from "@/types/database";

const LEAD_STAGE_VALUES = ["novo","qualificacao","avaliacao_agendada","no_show","negociacao","convertido","perdido"] as const;
const APPOINTMENT_REQUIRED_STAGES = new Set<LeadStage>(["avaliacao_agendada", "no_show", "negociacao", "convertido"]);
const LEAD_STAGE_ORDER: Record<LeadStage, number> = {
  novo: 0,
  qualificacao: 1,
  avaliacao_agendada: 2,
  no_show: 3,
  negociacao: 4,
  convertido: 5,
  perdido: 6,
};

function stageRequiresAppointment(stage: LeadStage) {
  return APPOINTMENT_REQUIRED_STAGES.has(stage);
}

const STAGE_LABEL: Record<LeadStage, string> = {
  novo: "Novo",
  qualificacao: "Em qualificação",
  avaliacao_agendada: "Avaliação agendada",
  no_show: "No-show",
  negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
};

const createLeadSchema = z.object({
  nome:      z.string().min(2),
  telefone:  z.string().min(10),
  email:     z.string().email().optional().or(z.literal("")),
  estagio:   z.enum(LEAD_STAGE_VALUES).default("novo"),
  origem:    z.enum(["whatsapp","instagram","indicacao","google","outro"]).default("whatsapp"),
  interesse: z.enum(["pilates","pilates_gestante","fisio_pelvica","indefinido"]).default("indefinido"),
});

export type CreateLeadResult = { success: true; lead: FunilLead } | { success: false; error: string };

export async function createLead(formData: FormData): Promise<CreateLeadResult> {
  const raw = {
    nome:      formData.get("nome"),
    telefone:  formData.get("telefone"),
    email:     formData.get("email") ?? "",
    estagio:   formData.get("estagio") ?? "novo",
    origem:    formData.get("origem") ?? "whatsapp",
    interesse: formData.get("interesse") ?? "indefinido",
  };

  const parsed = createLeadSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados inválidos: " + parsed.error.message };
  if (stageRequiresAppointment(parsed.data.estagio as LeadStage)) {
    return { success: false, error: "Para criar lead nesta etapa, primeiro registre a lead em qualificação e confirme a data da avaliação." };
  }

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db.from("leads").insert({
    nome:      parsed.data.nome,
    telefone:  parsed.data.telefone,
    email:     parsed.data.email || null,
    estagio:   parsed.data.estagio as LeadStage,
    origem:    parsed.data.origem as LeadOrigin,
    interesse: parsed.data.interesse as LeadInterest,
  }).select(FUNIL_LEAD_SELECT).single();

  if (error) return { success: false, error: error.message };

  // Log activity
  await db.from("activities").insert({
    lead_id:  data.id,
    tipo:     "mudanca_estagio",
    descricao: `Lead criada no funil — estágio ${parsed.data.estagio}`,
    meta:     { estagio: parsed.data.estagio, origem: parsed.data.origem },
  });

  revalidatePath("/funil");
  revalidatePath("/dashboard");
  return { success: true, lead: mapLeadRowForFunil(data as FunilLeadQueryRow) };
}

const updateStageSchema = z.object({
  id:     z.string().uuid(),
  estagio: z.enum(LEAD_STAGE_VALUES),
  motivoPerda: z.string().optional(),
});

export type UpdateStageResult = { success: true } | { success: false; error: string };

export async function updateLeadStage(input: z.infer<typeof updateStageSchema>): Promise<UpdateStageResult> {
  const parsed = updateStageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  // Fetch current stage for activity log and transition guards.
  const { data: current, error: currentError } = await db.from("leads").select("estagio").eq("id", parsed.data.id).single();
  if (currentError || !current) return { success: false, error: currentError?.message ?? "Lead não encontrada." };

  const currentStage = current.estagio as LeadStage;
  const nextStage = parsed.data.estagio as LeadStage;

  if (LEAD_STAGE_ORDER[nextStage] < LEAD_STAGE_ORDER[currentStage]) {
    return { success: false, error: "Não é possível retroceder o funil arrastando o card." };
  }

  if (LEAD_STAGE_ORDER[currentStage] < LEAD_STAGE_ORDER.avaliacao_agendada && stageRequiresAppointment(nextStage)) {
    return { success: false, error: "Antes de avançar, confirme a data e hora da avaliação." };
  }

  if (nextStage === "no_show" && currentStage !== "avaliacao_agendada") {
    return { success: false, error: "No-show só pode receber leads que estavam em Avaliação agendada." };
  }

  const updatePayload: Record<string, unknown> = {
    estagio: nextStage,
    ultima_interacao_at: new Date().toISOString(),
  };
  if (nextStage === "perdido" && parsed.data.motivoPerda) {
    updatePayload.motivo_perda = parsed.data.motivoPerda;
  }

  const { error } = await db.from("leads").update(updatePayload).eq("id", parsed.data.id);
  if (error) return { success: false, error: error.message };

  const stageDescricao =
    nextStage === "convertido"
      ? "Convertida em aluna"
      : nextStage === "perdido"
        ? (parsed.data.motivoPerda ? `Lead perdida — ${parsed.data.motivoPerda}` : "Lead perdida")
        : `Movida de ${STAGE_LABEL[currentStage]} para ${STAGE_LABEL[nextStage]}`;

  await db.from("activities").insert({
    lead_id:  parsed.data.id,
    tipo:     "mudanca_estagio",
    descricao: stageDescricao,
    meta:     { de: currentStage, para: nextStage, milestone: nextStage === "convertido" || nextStage === "perdido" },
  });

  revalidatePath("/funil");
  revalidatePath("/dashboard");
  revalidatePath(`/leads/${parsed.data.id}`);
  return { success: true };
}

const addNoteSchema = z.object({
  leadId: z.string().uuid(),
  texto:  z.string().min(1),
});

export type AddNoteResult = { success: true } | { success: false; error: string };

export async function addNote(input: z.infer<typeof addNoteSchema>): Promise<AddNoteResult> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db.from("activities").insert({
    lead_id:  parsed.data.leadId,
    tipo:     "nota",
    descricao: parsed.data.texto,
    meta:     {},
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { success: true };
}

const updateLeadDataSchema = z.object({
  id:        z.string().uuid(),
  nome:      z.string().min(2).optional(),
  email:     z.string().email().optional().or(z.literal("")),
  interesse: z.enum(["pilates","pilates_gestante","fisio_pelvica","indefinido"]).optional(),
  responsavel_id: z.string().uuid().optional().nullable(),
});

export async function updateLeadData(input: z.infer<typeof updateLeadDataSchema>): Promise<UpdateStageResult> {
  const parsed = updateLeadDataSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { id, ...fields } = parsed.data;
  const updatePayload: Record<string, unknown> = { ultima_interacao_at: new Date().toISOString() };
  if (fields.nome)      updatePayload.nome = fields.nome;
  if (fields.email)     updatePayload.email = fields.email || null;
  if (fields.interesse) updatePayload.interesse = fields.interesse;
  if ("responsavel_id" in fields) updatePayload.responsavel_id = fields.responsavel_id;

  const { error } = await db.from("leads").update(updatePayload).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/leads/${id}`);
  return { success: true };
}

export async function archiveLead(leadId: string): Promise<UpdateStageResult> {
  const parsed = z.string().uuid().safeParse(leadId);
  if (!parsed.success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db
    .from("leads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) return { success: false, error: error.message };

  revalidatePath("/funil");
  revalidatePath("/dashboard");
  return { success: true };
}

export type GerarResumoResult =
  | { success: true; contexto: ContextoAvaliacao }
  | { success: false; error: string };

export async function gerarResumoContexto(leadId: string): Promise<GerarResumoResult> {
  const parsed = z.string().uuid().safeParse(leadId);
  if (!parsed.success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  // Conversa mais recente do lead
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", parsed.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conv) return { success: false, error: "Ainda não há conversa para resumir." };

  const { data: msgs } = await db
    .from("messages")
    .select("direcao, conteudo")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (!msgs || msgs.length === 0) {
    return { success: false, error: "Ainda não há conversa para resumir." };
  }

  let contexto: ContextoAvaliacao;
  try {
    contexto = await gerarContextoFromMessages(msgs);
  } catch {
    return { success: false, error: "Não foi possível gerar o resumo agora. Tente novamente." };
  }

  const { error } = await db
    .from("leads")
    .update({ contexto_avaliacao: contexto as unknown as Json })
    .eq("id", parsed.data);

  if (error) return { success: false, error: error.message };

  await db.from("activities").insert({
    lead_id: parsed.data,
    tipo: "sistema",
    descricao: "Resumo de avaliação gerado pela IA",
    meta: { fonte: "resumo_ia" },
  });

  revalidatePath(`/leads/${parsed.data}`);
  return { success: true, contexto };
}
