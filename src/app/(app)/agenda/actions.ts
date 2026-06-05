"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentType, AppointmentStatus } from "@/types/database";

const createAppointmentSchema = z.object({
  lead_id:       z.string().uuid(),
  inicio:        z.string().datetime({ offset: true }),
  fim:           z.string().datetime({ offset: true }),
  tipo:          z.enum(["avaliacao_pilates","avaliacao_fisio_pelvica","avaliacao_gestante"]),
  profissional_id: z.string().uuid().optional().nullable(),
  observacoes:   z.string().optional(),
});

export type CreateAppointmentResult = { success: true; id: string } | { success: false; error: string };

export async function createAppointment(
  input: z.infer<typeof createAppointmentSchema>
): Promise<CreateAppointmentResult> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos: " + parsed.error.message };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db.from("appointments").insert({
    lead_id:        parsed.data.lead_id,
    inicio:         parsed.data.inicio,
    fim:            parsed.data.fim,
    tipo:           parsed.data.tipo as AppointmentType,
    profissional_id: parsed.data.profissional_id ?? null,
    observacoes:    parsed.data.observacoes ?? null,
    status:         "agendado" as AppointmentStatus,
  }).select("id").single();

  if (error) return { success: false, error: error.message };

  // Update lead stage and log activity
  await Promise.all([
    db.from("leads").update({
      estagio: "avaliacao_agendada",
      ultima_interacao_at: new Date().toISOString(),
    }).eq("id", parsed.data.lead_id),
    db.from("activities").insert({
      lead_id:  parsed.data.lead_id,
      tipo:     "agendamento",
      descricao: `Avaliação agendada para ${new Date(parsed.data.inicio).toLocaleDateString("pt-BR")}`,
      meta:     { appointment_id: data.id, tipo: parsed.data.tipo },
    }),
  ]);

  revalidatePath("/agenda");
  revalidatePath("/funil");
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  return { success: true, id: data.id };
}

const updateStatusSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(["agendado","confirmado","compareceu","faltou","cancelado"]),
});

export type UpdateStatusResult = { success: true } | { success: false; error: string };

export async function updateAppointmentStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<UpdateStatusResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db
    .from("appointments")
    .update({ status: parsed.data.status as AppointmentStatus })
    .eq("id", parsed.data.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}
