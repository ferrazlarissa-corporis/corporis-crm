"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveStaff } from "@/lib/auth/staff";
import { postAccrual } from "@/lib/finance/post-income";
import {
  CLINIC_CONFIG_ID,
  normalizeClinicHours,
  validateAppointmentWithinClinicHours,
} from "@/lib/clinic-config";
import type { AppointmentType, Pilar } from "@/types/database";

export type VendaResult = {
  success: true;
  id?: string;
  matricula_id?: string;
  pessoa_id?: string;
  inicio?: string;
  fim?: string | null;
  sessoes_semana?: number | null;
  tipo?: "fixo" | "personalizado" | "avulso";
} | { success: false; error: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os dados do formulário.";
}

const PILAR = z.enum(["pilates", "fisio_pelvica", "acupuntura"]);
const PERIODICIDADE = z.enum(["mensal", "trimestral", "semestral", "anual", "avulso"]);
const PLANO_TIPO = z.enum(["fixo", "personalizado", "avulso"]);
const PILAR_TO_TIPO: Record<Pilar, AppointmentType> = {
  pilates: "avaliacao_pilates",
  fisio_pelvica: "avaliacao_fisio_pelvica",
  acupuntura: "avaliacao_acupuntura",
};

// ─── Planos (vendas.plano) ──────────────────────────────────────────────────────

const planoSchema = z.object({
  nome: z.string().trim().min(2).max(140),
  tipo: PLANO_TIPO,
  valor: z.coerce.number().min(0).max(1_000_000),
  periodicidade: PERIODICIDADE,
  sessoes_semana: z.coerce.number().int().min(0).max(14).nullable().default(null),
  servicos: z.array(z.string().uuid()).max(50).default([]),
  pilar: PILAR.nullable().default(null),
  ativo: z.boolean().default(true),
});

export type PlanoInput = z.infer<typeof planoSchema>;

export async function createPlano(input: PlanoInput): Promise<VendaResult> {
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("vendas")
    .from("plano")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id: data?.id };
}

export async function updatePlano(id: string, input: PlanoInput): Promise<VendaResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("plano").update(parsed.data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id };
}

export async function togglePlanoAtivo(id: string, ativo: boolean): Promise<VendaResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("plano").update({ ativo }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id };
}

// ─── Adesão / nova venda (vendas.criar_adesao RPC) ──────────────────────────────

const adesaoSchema = z
  .object({
    pessoa_id: z.string().uuid(),
    plano_id: z.string().uuid(),
    valor: z.coerce.number().min(0).max(1_000_000),
    desconto: z.coerce.number().min(0).max(1_000_000).default(0),
    dia_vencimento: z.coerce.number().int().min(1).max(28),
    inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida."),
    modelo_contrato_id: z.string().uuid().nullable().default(null),
    tipo: PLANO_TIPO,
    periodicidade: PERIODICIDADE.nullable().default(null),
    sessoes_semana: z.coerce.number().int().min(0).max(14).nullable().default(null),
    total_sessoes: z.coerce.number().int().min(1).max(500).nullable().default(null),
  })
  .refine((d) => d.tipo !== "fixo" || d.periodicidade != null, {
    message: "Selecione a periodicidade do plano fixo.",
    path: ["periodicidade"],
  })
  .refine((d) => d.tipo !== "personalizado" || (d.total_sessoes != null && d.total_sessoes >= 1), {
    message: "Informe o número de sessões do plano personalizado.",
    path: ["total_sessoes"],
  });

export type AdesaoInput = z.infer<typeof adesaoSchema>;

type MatriculaCriada = {
  id: string;
  pessoa_id: string;
  inicio: string;
  fim: string | null;
  sessoes_semana: number | null;
  tipo: "fixo" | "personalizado" | "avulso";
};

export async function criarVenda(input: AdesaoInput): Promise<VendaResult> {
  const parsed = adesaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.schema("vendas").rpc("criar_adesao", {
    p_pessoa_id: parsed.data.pessoa_id,
    p_plano_id: parsed.data.plano_id,
    p_valor: parsed.data.valor,
    p_desconto: parsed.data.desconto,
    p_dia_vencimento: parsed.data.dia_vencimento,
    p_inicio: parsed.data.inicio,
    p_modelo_contrato_id: parsed.data.modelo_contrato_id,
    p_vendedor_id: auth.profile.id,
    p_tipo: parsed.data.tipo,
    p_periodicidade: parsed.data.periodicidade,
    p_sessoes_semana: parsed.data.sessoes_semana,
    p_total_sessoes: parsed.data.total_sessoes,
  });

  if (error) return { success: false, error: error.message };
  const vendaId = typeof data === "string" ? data : undefined;

  // Ponte Finance: reconhece (accrual) o 1º lançamento criado pela RPC. Não bloqueia a venda.
  try {
    const db = auth.supabase;
    const [{ data: pessoa }, { data: lanc }] = await Promise.all([
      db.schema("core").from("pessoa").select("nome, pilar_principal").eq("id", parsed.data.pessoa_id).maybeSingle(),
      db.schema("financeiro").from("lancamento")
        .select("id, competencia, vencimento, valor, descricao")
        .eq("pessoa_id", parsed.data.pessoa_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (pessoa && lanc) {
      await postAccrual({
        lancamentoId: lanc.id,
        competencia: lanc.competencia,
        vencimento: lanc.vencimento,
        valor: lanc.valor,
        pessoaNome: pessoa.nome,
        pilar: (pessoa.pilar_principal as Pilar | null) ?? null,
        descricao: lanc.descricao,
      });
    }
  } catch {
    // posting é best-effort; falha aqui não invalida a adesão já persistida
  }

  revalidatePath("/vendas");
  revalidatePath("/clientes");

  const { data: matricula } = vendaId
    ? await auth.supabase
        .schema("vendas")
        .from("matricula")
        .select("id, pessoa_id, inicio, fim, sessoes_semana, tipo")
        .eq("venda_id", vendaId)
        .maybeSingle()
    : { data: null };
  const m = matricula as MatriculaCriada | null;

  return {
    success: true,
    id: vendaId,
    matricula_id: m?.id,
    pessoa_id: m?.pessoa_id ?? parsed.data.pessoa_id,
    inicio: m?.inicio ?? parsed.data.inicio,
    fim: m?.fim ?? null,
    sessoes_semana: m?.sessoes_semana ?? parsed.data.sessoes_semana,
    tipo: m?.tipo ?? parsed.data.tipo,
  };
}

// ─── Rotina fixa de sessões pós-venda ──────────────────────────────────────────

const horarioPlanoSchema = z.object({
  matricula_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  sala_id: z.string().uuid().nullable().default(null),
  slots: z.array(z.object({
    weekday: z.coerce.number().int().min(1).max(7),
    hour: z.coerce.number().int().min(0).max(23),
  })).min(1).max(14),
});

export type HorarioPlanoInput = z.infer<typeof horarioPlanoSchema>;
export type HorarioPlanoResult = { success: true; count: number } | { success: false; error: string };

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function weekdayFromDateKey(dateKey: string): number {
  const day = parseDateKey(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

function firstDateForWeekday(startKey: string, weekday: number): string {
  const diff = (weekday - weekdayFromDateKey(startKey) + 7) % 7;
  return addDaysKey(startKey, diff);
}

function appointmentDate(dateKey: string, hour: number): Date {
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:00:00-03:00`);
}

function formatAppointmentDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function criarHorariosPlano(input: HorarioPlanoInput): Promise<HorarioPlanoResult> {
  const parsed = horarioPlanoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };
  const supabase = auth.supabase;

  const { data: matricula, error: matriculaError } = await supabase
    .schema("vendas")
    .from("matricula")
    .select("id, pessoa_id, inicio, fim, status, tipo, sessoes_semana")
    .eq("id", d.matricula_id)
    .maybeSingle();
  if (matriculaError) return { success: false, error: matriculaError.message };
  if (!matricula) return { success: false, error: "Matrícula não encontrada." };
  if (matricula.status !== "ativa" || matricula.tipo !== "fixo" || !matricula.fim) {
    return { success: false, error: "A rotina fixa só pode ser criada para plano fixo ativo." };
  }

  const frequencia = matricula.sessoes_semana ?? 0;
  if (frequencia < 1) return { success: false, error: "A matrícula não tem frequência semanal definida." };
  if (d.slots.length !== frequencia) {
    return { success: false, error: `Defina ${frequencia} ${frequencia === 1 ? "horário" : "horários"} por semana.` };
  }

  const slotKeys = new Set(d.slots.map((slot) => `${slot.weekday}-${slot.hour}`));
  if (slotKeys.size !== d.slots.length) {
    return { success: false, error: "Não repita o mesmo dia e horário na rotina." };
  }

  const { count: existingCount } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("matricula_id", d.matricula_id)
    .in("status", ["agendado", "confirmado"]);
  if ((existingCount ?? 0) > 0) {
    return { success: false, error: "Esta matrícula já tem horários fixos na agenda." };
  }

  const { data: servico, error: servicoError } = await supabase
    .schema("core")
    .from("servico")
    .select("id, nome, pilar, capacidade_slot")
    .eq("id", d.servico_id)
    .eq("ativo", true)
    .maybeSingle();
  if (servicoError) return { success: false, error: servicoError.message };
  if (!servico) return { success: false, error: "Serviço não encontrado." };

  const { data: clinicConfig } = await supabase
    .schema("crm")
    .from("clinic_config")
    .select("funcionamento")
    .eq("id", CLINIC_CONFIG_ID)
    .maybeSingle();
  const clinicHours = normalizeClinicHours(clinicConfig?.funcionamento);

  const occurrences: { start: Date; slot: HorarioPlanoInput["slots"][number] }[] = [];
  for (const slot of d.slots) {
    let current = firstDateForWeekday(matricula.inicio, slot.weekday);
    while (current <= matricula.fim) {
      occurrences.push({ start: appointmentDate(current, slot.hour), slot });
      current = addDaysKey(current, 7);
    }
  }
  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
  if (occurrences.length === 0) return { success: false, error: "Nenhuma sessão cairia dentro da vigência do plano." };

  for (const { start } of occurrences) {
    const end = new Date(start.getTime() + 60 * 60_000);
    const validation = validateAppointmentWithinClinicHours(clinicHours, start, end);
    if (!validation.ok) return { success: false, error: `${formatAppointmentDate(start)}: ${validation.message}` };
  }

  const startIso = occurrences.map(({ start }) => start.toISOString());
  let existingQuery = supabase
    .schema("crm")
    .from("appointments")
    .select("inicio")
    .eq("servico_id", d.servico_id)
    .in("inicio", startIso)
    .in("status", ["agendado", "confirmado"]);
  existingQuery = d.sala_id ? existingQuery.eq("sala_id", d.sala_id) : existingQuery.is("sala_id", null);
  const { data: existingAppointments, error: existingError } = await existingQuery;
  if (existingError) return { success: false, error: existingError.message };

  const ocupacao = new Map<string, number>();
  for (const appointment of (existingAppointments ?? []) as { inicio: string }[]) {
    const key = new Date(appointment.inicio).toISOString();
    ocupacao.set(key, (ocupacao.get(key) ?? 0) + 1);
  }
  const novaOcupacao = new Map<string, number>();
  for (const { start } of occurrences) {
    const key = start.toISOString();
    novaOcupacao.set(key, (novaOcupacao.get(key) ?? 0) + 1);
  }
  for (const { start } of occurrences) {
    const key = start.toISOString();
    const total = (ocupacao.get(key) ?? 0) + (novaOcupacao.get(key) ?? 0);
    if (total > servico.capacidade_slot) {
      return {
        success: false,
        error: `${formatAppointmentDate(start)} já atingiu a capacidade do serviço (${servico.capacidade_slot}/slot).`,
      };
    }
  }

  const tipo = PILAR_TO_TIPO[servico.pilar as Pilar];
  const rows = occurrences.map(({ start, slot }) => {
    return {
      pessoa_id: matricula.pessoa_id,
      matricula_id: matricula.id,
      servico_id: d.servico_id,
      sala_id: d.sala_id,
      inicio: start.toISOString(),
      fim: new Date(start.getTime() + 60 * 60_000).toISOString(),
      tipo,
      categoria: "sessao" as const,
      status: "agendado" as const,
      recorrencia: {
        origem: "plano_fixo",
        matricula_id: matricula.id,
        weekday: slot.weekday,
        hour: slot.hour,
        generated_until: matricula.fim,
      },
      observacoes: "Sessão fixa do plano",
    };
  });

  const { error: insertError } = await supabase.schema("crm").from("appointments").insert(rows);
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${matricula.pessoa_id}`);
  revalidatePath("/vendas");
  return { success: true, count: rows.length };
}
