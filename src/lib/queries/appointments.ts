import { createClient } from "@/lib/supabase/server";
import type { AppointmentType, AppointmentStatus } from "@/types/database";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";

export type AppointmentRow = {
  id: string;
  lead: { id: string; nome: string };
  inicio: string;
  fim: string;
  tipo: AppointmentType;
  status: AppointmentStatus;
  profissional: { id: string; nome: string } | null;
  observacoes: string | null;
  lembrete_enviado_at: string | null;
  confirmacao_enviada_at: string | null;
};

type AppointmentQueryRow = {
  id: string;
  inicio: string;
  fim: string;
  tipo: AppointmentType;
  status: AppointmentStatus;
  observacoes: string | null;
  lembrete_enviado_at: string | null;
  confirmacao_enviada_at: string | null;
  leads: { id: string; nome: string } | { id: string; nome: string }[] | null;
  profiles: { id: string; nome: string } | { id: string; nome: string }[] | null;
};

function mapAppointmentRows(data: AppointmentQueryRow[]): AppointmentRow[] {
  return data.map((r) => {
    const lead = Array.isArray(r.leads) ? r.leads[0] : r.leads;
    const prof = Array.isArray(r.profiles) ? r.profiles[0] ?? null : (r.profiles ?? null);

    return {
      id: r.id,
      lead: { id: lead?.id ?? "", nome: lead?.nome ?? "" },
      inicio: r.inicio,
      fim: r.fim,
      tipo: r.tipo,
      status: r.status,
      profissional: prof ? { id: prof.id, nome: prof.nome } : null,
      observacoes: r.observacoes,
      lembrete_enviado_at: r.lembrete_enviado_at,
      confirmacao_enviada_at: r.confirmacao_enviada_at,
    };
  });
}

export async function getAppointmentsBetween(start: Date, end: Date): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db
    .from("appointments")
    .select("id, inicio, fim, tipo, status, observacoes, lembrete_enviado_at, confirmacao_enviada_at, leads!inner(id, nome), profiles:profissional_id(id, nome)")
    .gte("inicio", start.toISOString())
    .lte("inicio", end.toISOString())
    .order("inicio");

  if (error || !data) return [];

  return mapAppointmentRows(data as AppointmentQueryRow[]);
}

export async function getWeekAppointments(weekOffset = 0): Promise<AppointmentRow[]> {
  const ref = addWeeks(new Date(), weekOffset);
  const start = startOfWeek(ref, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(ref, { weekStartsOn: 1 });     // Sunday

  return getAppointmentsBetween(start, end);
}

export async function getLeadAppointments(leadId: string): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db
    .from("appointments")
    .select("id, inicio, fim, tipo, status, observacoes, lembrete_enviado_at, confirmacao_enviada_at, leads!inner(id, nome), profiles:profissional_id(id, nome)")
    .eq("lead_id", leadId)
    .order("inicio", { ascending: false });

  if (error || !data) return [];

  return mapAppointmentRows(data as AppointmentQueryRow[]);
}
