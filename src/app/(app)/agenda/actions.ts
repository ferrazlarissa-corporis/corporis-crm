"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentsBetween } from "@/lib/queries/appointments";
import { CLINIC_CONFIG_ID, normalizeClinicHours, validateAppointmentWithinClinicHours } from "@/lib/clinic-config";
import type { AppointmentType, AppointmentStatus, LeadStage } from "@/types/database";

const createAppointmentSchema = z.object({
  lead_id: z.string().uuid(),
  inicio: z.string().datetime({ offset: true }),
  fim: z.string().datetime({ offset: true }),
  tipo: z.enum(["avaliacao_pilates", "avaliacao_fisio_pelvica", "avaliacao_gestante"]),
  profissional_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().trim().min(1, "Registre uma observação antes de confirmar o agendamento."),
});

export type CreateAppointmentResult = { success: true; id: string } | { success: false; error: string };

export async function createAppointment(
  input: z.infer<typeof createAppointmentSchema>,
): Promise<CreateAppointmentResult> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos: " + parsed.error.message };

  const supabase = await createClient();
  const db = supabase.schema("crm");
  const { data: clinicConfig } = await db
    .from("clinic_config")
    .select("funcionamento")
    .eq("id", CLINIC_CONFIG_ID)
    .maybeSingle();
  const scheduleValidation = validateAppointmentWithinClinicHours(
    normalizeClinicHours(clinicConfig?.funcionamento),
    new Date(parsed.data.inicio),
    new Date(parsed.data.fim),
  );

  if (!scheduleValidation.ok) {
    return { success: false, error: scheduleValidation.message };
  }

  const { data, error } = await db.from("appointments").insert({
    lead_id: parsed.data.lead_id,
    inicio: parsed.data.inicio,
    fim: parsed.data.fim,
    tipo: parsed.data.tipo as AppointmentType,
    profissional_id: parsed.data.profissional_id ?? null,
    observacoes: parsed.data.observacoes ?? null,
    status: "agendado" as AppointmentStatus,
  }).select("id").single();

  if (error) return { success: false, error: error.message };

  // Update lead stage and log activity.
  await Promise.all([
    db.from("leads").update({
      estagio: "avaliacao_agendada",
      ultima_interacao_at: new Date().toISOString(),
    }).eq("id", parsed.data.lead_id),
    db.from("activities").insert({
      lead_id: parsed.data.lead_id,
      tipo: "agendamento",
      descricao: `Avaliação agendada para ${new Date(parsed.data.inicio).toLocaleDateString("pt-BR")}`,
      meta: { appointment_id: data.id, tipo: parsed.data.tipo },
    }),
  ]);

  revalidatePath("/agenda");
  revalidatePath("/funil");
  revalidatePath("/dashboard");
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  return { success: true, id: data.id };
}

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["agendado", "confirmado", "compareceu", "faltou", "cancelado"]),
});

export type UpdateStatusResult = { success: true } | { success: false; error: string };

export async function updateAppointmentStatus(
  input: z.infer<typeof updateStatusSchema>,
): Promise<UpdateStatusResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data: appointment, error: appointmentError } = await db
    .from("appointments")
    .select("lead_id")
    .eq("id", parsed.data.id)
    .single();

  if (appointmentError) return { success: false, error: appointmentError.message };

  const { error } = await db
    .from("appointments")
    .update({ status: parsed.data.status as AppointmentStatus })
    .eq("id", parsed.data.id);

  if (error) return { success: false, error: error.message };

  const stageByStatus: Partial<Record<AppointmentStatus, LeadStage>> = {
    compareceu: "negociacao",
    faltou: "no_show",
  };
  const nextStage = stageByStatus[parsed.data.status as AppointmentStatus];

  if (nextStage && appointment?.lead_id) {
    const { error: leadError } = await db.from("leads").update({
      estagio: nextStage,
      ultima_interacao_at: new Date().toISOString(),
    }).eq("id", appointment.lead_id);

    if (leadError) return { success: false, error: leadError.message };

    await db.from("activities").insert({
      lead_id: appointment.lead_id,
      tipo: "mudanca_estagio",
      descricao: parsed.data.status === "faltou"
        ? "Avaliação marcada como falta; lead movida para No-show"
        : "Avaliação marcada como compareceu; lead movida para Em negociação",
      meta: { appointment_id: parsed.data.id, status: parsed.data.status, estagio: nextStage },
    });

    revalidatePath("/funil");
    revalidatePath(`/leads/${appointment.lead_id}`);
  }

  if (parsed.data.status === "confirmado" && appointment?.lead_id) {
    await db.from("activities").insert({
      lead_id: appointment.lead_id,
      tipo: "agendamento",
      descricao: "Lead confirmou presença na avaliação",
      meta: { appointment_id: parsed.data.id, status: "confirmado" },
    });
    revalidatePath(`/leads/${appointment.lead_id}`);
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getAgendaAppointments(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { success: false as const, error: "Período inválido." };
  }

  const appointments = await getAppointmentsBetween(start, end);
  return { success: true as const, appointments };
}
