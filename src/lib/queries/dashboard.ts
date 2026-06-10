import { createClient } from "@/lib/supabase/server";
import type { LeadStage, LeadOrigin, AppointmentType, AppointmentStatus } from "@/types/database";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export type DashboardKpis = {
  leadsNovos: number;
  leadsNovosPrev: number;
  conversasAbertas: number;
  avaliacoesAgendadas: number;
  totalLeads: number;
  convertidas: number;
};

export type FunnelStage = {
  estagio: LeadStage;
  label: string;
  count: number;
  color: string;
};

export type OriginStat = {
  origem: LeadOrigin;
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type TodayAppointment = {
  id: string;
  inicio: string;
  lead_nome: string;
  tipo: AppointmentType;
  status: AppointmentStatus;
};

export type AttentionLead = {
  id: string;
  nome: string;
  initials: string;
  tag: string;
  tone: "urgent" | "neutral";
  reason: string;
};

const STAGE_META: Record<LeadStage, { label: string; color: string }> = {
  novo: { label: "Novo", color: "var(--color-bege)" },
  qualificacao: { label: "Em qualificação", color: "var(--color-tangerina)" },
  avaliacao_agendada: { label: "Avaliação agendada", color: "var(--color-alaranjado)" },
  no_show: { label: "No-show", color: "var(--color-ui-error)" },
  negociacao: { label: "Em negociação", color: "#C97448" },
  convertido: { label: "Convertido", color: "var(--color-verde)" },
  perdido: { label: "Perdido", color: "var(--color-cinza)" },
};

const ORIGIN_META: Record<LeadOrigin, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "var(--color-alaranjado)" },
  instagram: { label: "Instagram", color: "var(--color-bege)" },
  indicacao: { label: "Indicação", color: "var(--color-tangerina)" },
  google: { label: "Google", color: "var(--color-texto-medio)" },
  outro: { label: "Outro", color: "var(--color-cinza)" },
};

const TIPO_LABEL: Record<AppointmentType, string> = {
  avaliacao_pilates: "Pilates terapêutico",
  avaliacao_gestante: "Pilates gestante",
  avaliacao_fisio_pelvica: "Fisioterapia pélvica",
};

export async function getDashboardStats() {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  const [
    leadsNovosCur,
    leadsNovosPrev,
    conversasAbertas,
    avaliacoesAgendadas,
    stageData,
    originData,
    todayData,
    attentionData,
  ] = await Promise.all([
    db.from("leads")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", weekAgo.toISOString()),
    db.from("leads")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", weekAgo.toISOString()),
    db.from("conversations")
      .select("*, leads!inner(archived_at)", { count: "exact", head: true })
      .eq("status", "aberta")
      .is("leads.archived_at", null),
    db.from("appointments")
      .select("*", { count: "exact", head: true })
      .in("status", ["agendado", "confirmado"] as AppointmentStatus[]),
    db.from("leads")
      .select("estagio")
      .is("archived_at", null),
    db.from("leads")
      .select("origem")
      .is("archived_at", null),
    db.from("appointments")
      .select("id, inicio, tipo, status, leads!inner(nome)")
      .gte("inicio", todayStart)
      .lte("inicio", todayEnd)
      .order("inicio"),
    db.from("leads")
      .select("id, nome, estagio, ultima_interacao_at")
      .is("archived_at", null)
      .not("estagio", "in", "(convertido,perdido)")
      .or(`ultima_interacao_at.lt.${threeDaysAgo.toISOString()},ultima_interacao_at.is.null`)
      .order("ultima_interacao_at", { nullsFirst: true })
      .limit(5),
  ]);

  // Funnel
  const stageCounts = (stageData.data ?? []).reduce(
    (acc, r) => { acc[r.estagio] = (acc[r.estagio] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const totalLeads = stageData.data?.length ?? 0;
  const convertidas = stageCounts["convertido"] ?? 0;

  const funnelByStage: FunnelStage[] = (Object.keys(STAGE_META) as LeadStage[]).map((s) => ({
    estagio: s,
    label: STAGE_META[s].label,
    count: stageCounts[s] ?? 0,
    color: STAGE_META[s].color,
  }));

  // Origins
  const originCounts = (originData.data ?? []).reduce(
    (acc, r) => { acc[r.origem] = (acc[r.origem] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const totalOrigins = Object.values(originCounts).reduce((a, b) => a + b, 0);
  const originBreakdown: OriginStat[] = (Object.keys(ORIGIN_META) as LeadOrigin[])
    .map((o) => ({
      origem: o,
      label: ORIGIN_META[o].label,
      count: originCounts[o] ?? 0,
      pct: totalOrigins > 0 ? Math.round(((originCounts[o] ?? 0) / totalOrigins) * 100) : 0,
      color: ORIGIN_META[o].color,
    }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count);

  // Today appointments
  const todayAppointments: TodayAppointment[] = (todayData.data ?? []).map((r) => {
    const lead = Array.isArray(r.leads) ? r.leads[0] : r.leads;
    return {
      id: r.id,
      inicio: format(new Date(r.inicio), "HH:mm"),
      lead_nome: lead?.nome ?? "—",
      tipo: r.tipo,
      status: r.status,
    };
  });

  // Attention leads
  const attentionLeads: AttentionLead[] = (attentionData.data ?? []).map((r) => {
    const initials = r.nome.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
    const isStale = !r.ultima_interacao_at || new Date(r.ultima_interacao_at) < threeDaysAgo;
    const tag = STAGE_META[r.estagio as LeadStage]?.label ?? String(r.estagio);
    const daysSince = r.ultima_interacao_at
      ? Math.floor((now.getTime() - new Date(r.ultima_interacao_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const reason = daysSince !== null
      ? `Sem movimentação há ${daysSince} dia${daysSince !== 1 ? "s" : ""}`
      : "Nunca teve interação registrada";

    return { id: r.id, nome: r.nome, initials, tag, tone: isStale ? "urgent" : "neutral", reason };
  });

  return {
    kpis: {
      leadsNovos: leadsNovosCur.count ?? 0,
      leadsNovosPrev: leadsNovosPrev.count ?? 0,
      conversasAbertas: conversasAbertas.count ?? 0,
      avaliacoesAgendadas: avaliacoesAgendadas.count ?? 0,
      totalLeads,
      convertidas,
    },
    funnelByStage,
    originBreakdown,
    todayAppointments,
    attentionLeads,
    todayLabel: format(now, "EEEE, d 'de' MMMM", { locale: ptBR }),
    TIPO_LABEL,
  };
}
