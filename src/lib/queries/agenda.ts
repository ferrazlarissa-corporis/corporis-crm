import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus, AppointmentType, AgendaCategoria, Pilar } from "@/types/database";

export type AgendaEvent = {
  id: string;
  inicio: string;
  fim: string;
  status: AppointmentStatus;
  categoria: AgendaCategoria;
  tipo: AppointmentType;
  observacoes: string | null;
  clienteNome: string;
  pessoaId: string | null;
  leadId: string | null;
  servicoId: string | null;
  servicoNome: string | null;
  corToken: string | null;
  capacidadeSlot: number | null;
  pilar: Pilar | null;
  salaId: string | null;
  salaNome: string | null;
  profissionalNome: string | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getAgendaCompleta(start: Date, end: Date): Promise<AgendaEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, inicio, fim, status, categoria, tipo, observacoes, lead_id, pessoa_id, servico_id, sala_id, leads:lead_id(nome), profiles:profissional_id(nome)")
    .gte("inicio", start.toISOString())
    .lte("inicio", end.toISOString())
    .order("inicio", { ascending: true });

  if (error || !data) return [];

  type Raw = {
    id: string; inicio: string; fim: string; status: AppointmentStatus; categoria: AgendaCategoria;
    tipo: AppointmentType; observacoes: string | null; lead_id: string | null; pessoa_id: string | null;
    servico_id: string | null; sala_id: string | null;
    leads: { nome: string } | { nome: string }[] | null;
    profiles: { nome: string } | { nome: string }[] | null;
  };
  const rows = data as Raw[];

  // Lookups cross-schema (PostgREST não embeda crm→core).
  const servicoIds = [...new Set(rows.map((r) => r.servico_id).filter((v): v is string => Boolean(v)))];
  const salaIds = [...new Set(rows.map((r) => r.sala_id).filter((v): v is string => Boolean(v)))];
  const pessoaIds = [...new Set(rows.map((r) => r.pessoa_id).filter((v): v is string => Boolean(v)))];

  const [servicosRes, salasRes, pessoasRes] = await Promise.all([
    servicoIds.length
      ? supabase.schema("core").from("servico").select("id, nome, cor_token, capacidade_slot, pilar").in("id", servicoIds)
      : Promise.resolve({ data: [] }),
    salaIds.length ? supabase.schema("core").from("sala").select("id, nome").in("id", salaIds) : Promise.resolve({ data: [] }),
    pessoaIds.length ? supabase.schema("core").from("pessoa").select("id, nome").in("id", pessoaIds) : Promise.resolve({ data: [] }),
  ]);

  const servicoMap = new Map((servicosRes.data ?? []).map((s) => [s.id, s as { id: string; nome: string; cor_token: string; capacidade_slot: number; pilar: Pilar }]));
  const salaMap = new Map((salasRes.data ?? []).map((s) => [s.id, (s as { nome: string }).nome]));
  const pessoaMap = new Map((pessoasRes.data ?? []).map((p) => [p.id, (p as { nome: string }).nome]));

  return rows.map((r) => {
    const servico = r.servico_id ? servicoMap.get(r.servico_id) ?? null : null;
    const leadNome = (one(r.leads) as { nome: string } | null)?.nome ?? null;
    const pessoaNome = r.pessoa_id ? pessoaMap.get(r.pessoa_id) ?? null : null;
    return {
      id: r.id,
      inicio: r.inicio,
      fim: r.fim,
      status: r.status,
      categoria: r.categoria,
      tipo: r.tipo,
      observacoes: r.observacoes,
      clienteNome: pessoaNome ?? leadNome ?? "Sem nome",
      pessoaId: r.pessoa_id,
      leadId: r.lead_id,
      servicoId: r.servico_id,
      servicoNome: servico?.nome ?? null,
      corToken: servico?.cor_token ?? null,
      capacidadeSlot: servico?.capacidade_slot ?? null,
      pilar: servico?.pilar ?? null,
      salaId: r.sala_id,
      salaNome: r.sala_id ? salaMap.get(r.sala_id) ?? null : null,
      profissionalNome: (one(r.profiles) as { nome: string } | null)?.nome ?? null,
    };
  });
}

export type AgendaOptions = {
  servicos: { id: string; nome: string; pilar: Pilar; cor_token: string; capacidade_slot: number; duracao_min: number }[];
  salas: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
};

export async function getAgendaOptions(): Promise<AgendaOptions> {
  const supabase = await createClient();
  const [servicosRes, salasRes, pessoasRes] = await Promise.all([
    supabase.schema("core").from("servico").select("id, nome, pilar, cor_token, capacidade_slot, duracao_min").eq("ativo", true).order("nome"),
    supabase.schema("core").from("sala").select("id, nome").eq("ativo", true).order("nome"),
    supabase.schema("core").from("pessoa").select("id, nome").is("archived_at", null).neq("status", "inativo").order("nome"),
  ]);
  return {
    servicos: (servicosRes.data ?? []) as AgendaOptions["servicos"],
    salas: (salasRes.data ?? []) as AgendaOptions["salas"],
    pessoas: (pessoasRes.data ?? []) as AgendaOptions["pessoas"],
  };
}
