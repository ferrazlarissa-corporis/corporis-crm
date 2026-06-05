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
import type { LeadStage, LeadInterest, LeadOrigin } from "@/types/database";

const createLeadSchema = z.object({
  nome:      z.string().min(2),
  telefone:  z.string().min(10),
  email:     z.string().email().optional().or(z.literal("")),
  estagio:   z.enum(["novo","qualificacao","avaliacao_agendada","no_show","negociacao","convertido","perdido"]).default("novo"),
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
  estagio: z.enum(["novo","qualificacao","avaliacao_agendada","no_show","negociacao","convertido","perdido"]),
  motivoPerda: z.string().optional(),
});

export type UpdateStageResult = { success: true } | { success: false; error: string };

export async function updateLeadStage(input: z.infer<typeof updateStageSchema>): Promise<UpdateStageResult> {
  const parsed = updateStageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  // Fetch current stage for activity log
  const { data: current } = await db.from("leads").select("estagio").eq("id", parsed.data.id).single();

  const updatePayload: Record<string, unknown> = {
    estagio: parsed.data.estagio,
    ultima_interacao_at: new Date().toISOString(),
  };
  if (parsed.data.estagio === "perdido" && parsed.data.motivoPerda) {
    updatePayload.motivo_perda = parsed.data.motivoPerda;
  }

  const { error } = await db.from("leads").update(updatePayload).eq("id", parsed.data.id);
  if (error) return { success: false, error: error.message };

  await db.from("activities").insert({
    lead_id:  parsed.data.id,
    tipo:     "mudanca_estagio",
    descricao: `Movida de ${current?.estagio ?? "??"} para ${parsed.data.estagio}`,
    meta:     { de: current?.estagio, para: parsed.data.estagio },
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
