"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Copy,
  FileText,
  Filter,
  HelpCircle,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Send,
  Sun,
  UserCheck,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadDetail } from "@/lib/queries/leads";
import type { ActivityRow } from "@/lib/queries/activities";
import type { AppointmentRow } from "@/lib/queries/appointments";
import type { ActivityType, LeadInterest, LeadOrigin, LeadStage, AppointmentType } from "@/types/database";
import { CONTEXTO_FIELDS, hasContexto, type ContextoAvaliacao } from "@/lib/ai/contexto";
import { addNote, updateLeadStage, archiveLead, gerarResumoContexto } from "../actions";

// ─── Label maps ──────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<LeadStage, string> = {
  novo: "Novo",
  qualificacao: "Em qualificação",
  avaliacao_agendada: "Avaliação agendada",
  no_show: "No-show",
  negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STAGE_STYLE: Record<LeadStage, { bg: string; color: string; border: string; dot: string }> = {
  novo:               { bg: "rgba(210,176,110,0.12)", color: "#7A5E1F", border: "rgba(210,176,110,0.4)", dot: "var(--color-bege)" },
  qualificacao:       { bg: "rgba(246,169,88,0.16)",  color: "#8C4A1A", border: "rgba(246,169,88,0.5)",  dot: "var(--color-tangerina)" },
  avaliacao_agendada: { bg: "rgba(240,131,83,0.14)",  color: "#B85A2E", border: "rgba(240,131,83,0.4)", dot: "var(--color-alaranjado)" },
  no_show:            { bg: "rgba(209,76,68,0.12)",   color: "#9D2D27", border: "rgba(209,76,68,0.35)",   dot: "var(--color-ui-error)" },
  negociacao:         { bg: "rgba(201,116,72,0.14)",  color: "#803A15", border: "rgba(201,116,72,0.4)",  dot: "#C97448" },
  convertido:         { bg: "rgba(172,192,149,0.22)", color: "#5F7948", border: "rgba(172,192,149,0.5)", dot: "var(--color-verde)" },
  perdido:            { bg: "rgba(211,210,205,0.28)", color: "var(--color-texto-medio)", border: "var(--color-cinza)", dot: "var(--color-cinza)" },
};

const INTEREST_LABEL: Record<LeadInterest, string> = {
  pilates:       "Pilates",
  fisio_pelvica: "Fisioterapia pélvica",
  acupuntura:    "Acupuntura",
  indefinido:    "Interesse indefinido",
};

const INTEREST_STYLE: Record<LeadInterest, { bg: string; color: string }> = {
  pilates:       { bg: "rgba(240,131,83,0.12)",  color: "#B85A2E" },
  fisio_pelvica: { bg: "rgba(210,176,110,0.22)", color: "#7A5E1F" },
  acupuntura:    { bg: "rgba(211,196,170,0.30)", color: "#6B5526" },
  indefinido:    { bg: "rgba(211,210,205,0.18)", color: "var(--color-texto-medio)" },
};

const ORIGIN_LABEL: Record<LeadOrigin, string> = {
  whatsapp: "WhatsApp", instagram: "Instagram", indicacao: "Indicação", google: "Google", outro: "Outro",
};

const TIPO_LABEL: Record<AppointmentType, string> = {
  avaliacao_pilates:     "Avaliação Pilates",
  avaliacao_fisio_pelvica: "Avaliação Fisio Pélvica",
  avaliacao_acupuntura:  "Avaliação Acupuntura",
};

// ─── Timeline helpers ────────────────────────────────────────────────────────

type TlType = "msg-in" | "msg-out" | "stage" | "booking" | "handoff" | "note" | "campaign";

const ACTIVITY_TYPE_MAP: Record<ActivityType, TlType> = {
  mensagem:        "msg-in",
  mudanca_estagio: "stage",
  agendamento:     "booking",
  nota:            "note",
  campanha:        "campaign",
  handoff:         "handoff",
  sistema:         "stage",
};

const TL_ICON_STYLE: Record<TlType, { bg: string; border: string; color: string }> = {
  "msg-in":  { bg: "rgba(210,176,110,0.18)", border: "rgba(210,176,110,0.5)", color: "var(--color-bege)" },
  "msg-out": { bg: "rgba(240,131,83,0.14)",  border: "rgba(240,131,83,0.5)", color: "var(--color-alaranjado)" },
  stage:     { bg: "rgba(246,169,88,0.16)",  border: "rgba(246,169,88,0.5)", color: "var(--color-tangerina)" },
  booking:   { bg: "rgba(240,131,83,0.14)",  border: "rgba(240,131,83,0.5)", color: "var(--color-alaranjado)" },
  handoff:   { bg: "rgba(210,176,110,0.18)", border: "rgba(210,176,110,0.5)", color: "#7A5E1F" },
  note:      { bg: "var(--bg-2)", border: "var(--color-cinza)", color: "var(--color-texto-medio)" },
  campaign:  { bg: "rgba(172,192,149,0.22)", border: "rgba(172,192,149,0.55)", color: "#5F7948" },
};

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return `Hoje · ${format(d, "d 'de' MMM", { locale: ptBR })}`;
  if (isYesterday(d)) return `Ontem · ${format(d, "d 'de' MMM", { locale: ptBR })}`;
  return format(d, "d MMM · EEE", { locale: ptBR });
}

// Mantém só o primeiro contato entre as activities de mensagem (a mais antiga);
// trocas seguintes vivem na aba Conversa. Cobre leads antigos com timeline inchada.
function collapseMessages(activities: ActivityRow[]): ActivityRow[] {
  const messageActs = activities.filter((a) => a.tipo === "mensagem");
  if (messageActs.length <= 1) return activities;
  const firstContactId = messageActs.reduce((oldest, a) =>
    new Date(a.created_at) < new Date(oldest.created_at) ? a : oldest
  ).id;
  return activities.filter((a) => a.tipo !== "mensagem" || a.id === firstContactId);
}

function buildTimeline(activities: ActivityRow[]) {
  const byDay = new Map<string, ActivityRow[]>();
  for (const act of activities) {
    const key = format(new Date(act.created_at), "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    list.push(act);
    byDay.set(key, list);
  }
  return Array.from(byDay.entries()).map(([, acts]) => ({
    label: dayLabel(acts[0].created_at),
    events: acts.map((act) => ({
      tipo: ACTIVITY_TYPE_MAP[act.tipo],
      headline: act.descricao,
      autorName: act.autor?.nome ?? "Sistema",
      time: format(new Date(act.created_at), "HH:mm"),
    })),
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TlIconBox({ tipo }: { tipo: TlType }) {
  const s = TL_ICON_STYLE[tipo];
  const iconStyle = { strokeWidth: 1.7, color: s.color };
  const cls = "h-3.5 w-3.5";
  const icon = (() => {
    switch (tipo) {
      case "msg-in":  return <MessageCircle className={cls} style={iconStyle} />;
      case "msg-out": return <Send className={cls} style={iconStyle} />;
      case "stage":   return <Filter className={cls} style={iconStyle} />;
      case "booking": return <CalendarPlus className={cls} style={iconStyle} />;
      case "handoff": return <ArrowLeftRight className={cls} style={iconStyle} />;
      case "note":    return <FileText className={cls} style={iconStyle} />;
      case "campaign": return <Send className={cls} style={{ ...iconStyle, transform: "rotate(-15deg)" }} />;
    }
  })();
  return (
    <span style={{ width: 32, height: 32, borderRadius: "var(--radius-pill)", background: s.bg, border: `1.2px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
      {icon}
    </span>
  );
}

function Btn({ children, primary, small, iconOnly, disabled, onClick, style: extraStyle }: { children: React.ReactNode; primary?: boolean; small?: boolean; iconOnly?: boolean; disabled?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button type="button" disabled={disabled} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ appearance: "none", border: primary ? `0.6px solid ${hovered ? "var(--color-tangerina)" : "var(--color-alaranjado)"}` : `0.6px solid ${hovered ? "var(--color-tangerina)" : "var(--color-cinza)"}`, background: primary ? (hovered ? "var(--color-tangerina)" : "var(--color-alaranjado)") : (hovered ? "var(--color-bege-claro)" : "var(--bg-card)"), color: primary ? "#fff" : "var(--color-texto-escuro)", borderRadius: "var(--radius-pill)", padding: small ? (iconOnly ? "7px 9px" : "7px 12px") : (iconOnly ? "9px 11px" : "9px 16px"), fontFamily: "var(--font-body)", fontSize: small ? "12px" : "13px", fontWeight: 500, letterSpacing: "0.2px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: "8px", transition: "all 160ms cubic-bezier(.4,0,.2,1)", lineHeight: 1, ...extraStyle }}>
      {children}
    </button>
  );
}

function ContextoCard({ lead }: { lead: LeadDetail }) {
  const [contexto, setContexto] = useState<ContextoAvaliacao | null>(lead.contexto_avaliacao);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const result = await gerarResumoContexto(lead.id);
    setLoading(false);
    if (result.success) setContexto(result.contexto);
    else setError(result.error);
  };

  const filled = hasContexto(contexto);
  const updatedLabel = contexto?.atualizado_em
    ? formatDistanceToNow(new Date(contexto.atualizado_em), { locale: ptBR, addSuffix: true })
    : null;
  const fonteLabel =
    contexto?.fonte === "agente" ? "atualizado pela Clara"
    : contexto?.fonte === "resumo_ia" ? "resumo da IA"
    : null;

  return (
    <section style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-lg)", padding: "22px 22px 20px", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: 0 }}>
          Contexto para avaliação
        </h3>
        <span className="inline-flex items-center" style={{ gap: "5px", fontSize: "9.5px", fontWeight: 500, letterSpacing: "1.2px", textTransform: "uppercase", color: "#7A5E1F" }}>
          <Sun className="h-[11px] w-[11px]" style={{ strokeWidth: 1.7 }} />
          IA
        </span>
      </div>

      {filled ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {CONTEXTO_FIELDS.map(({ key, label }) => {
              const value = contexto?.[key] as string | null | undefined;
              return (
                <div key={key} className="min-w-0">
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: value ? "var(--color-texto-escuro)" : "var(--color-cinza)", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {value || "—"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between" style={{ gap: "8px", paddingTop: "14px", marginTop: "16px", borderTop: "0.6px solid var(--color-cinza)" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)" }}>
              {updatedLabel ? `Atualizado ${updatedLabel}${fonteLabel ? ` · ${fonteLabel}` : ""}` : fonteLabel}
            </span>
            <Btn small onClick={handleGenerate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />
              {loading ? "Gerando..." : "Atualizar"}
            </Btn>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)", lineHeight: 1.5, margin: 0 }}>
            Gere um resumo da conversa com a queixa, objetivo e pontos de atenção da aluna para preparar a avaliação.
          </p>
          <Btn primary small onClick={handleGenerate} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />
            {loading ? "Gerando resumo..." : "Gerar resumo com IA"}
          </Btn>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-ui-error)", marginTop: "10px" }}>{error}</p>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "timeline",      label: "Timeline",      Icon: Clock3      },
  { id: "conversa",      label: "Conversa",       Icon: MessageCircle },
  { id: "agendamentos",  label: "Agendamentos",   Icon: CalendarDays },
  { id: "notas",         label: "Notas",          Icon: FileText    },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface LeadClientProps {
  lead: LeadDetail;
  activities: ActivityRow[];
  appointments: AppointmentRow[];
}

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: "novo",               label: "Novo" },
  { value: "qualificacao",       label: "Em qualificação" },
  { value: "avaliacao_agendada", label: "Avaliação agendada" },
  { value: "no_show",            label: "No-show" },
  { value: "negociacao",         label: "Em negociação" },
  { value: "convertido",         label: "Convertido" },
  { value: "perdido",            label: "Perdido" },
];

export default function LeadClient({ lead, activities, appointments }: LeadClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const handleMoveStage = async (newStage: LeadStage) => {
    if (newStage === lead.estagio) { setStageOpen(false); return; }
    setStageLoading(true);
    setStageError(null);
    const result = await updateLeadStage({ id: lead.id, estagio: newStage });
    setStageLoading(false);
    setStageOpen(false);
    if (result.success) {
      router.refresh();
    } else {
      setStageError(result.error);
    }
  };

  const handleArchive = async () => {
    setMoreOpen(false);
    if (!confirm(`Arquivar ${lead.nome}? O lead será removido do funil.`)) return;
    const result = await archiveLead(lead.id);
    if (result.success) {
      router.push("/funil");
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    const result = await addNote({ leadId: lead.id, texto: note.trim() });
    setNoteSaving(false);
    if (result.success) {
      setNote("");
    } else {
      setNoteError(result.error);
    }
  };

  const initials = lead.nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const stageStyle = STAGE_STYLE[lead.estagio];
  const interestStyle = INTEREST_STYLE[lead.interesse];
  const score = lead.score_qualificacao ?? 0;
  const scorePct = Math.min(100, Math.max(0, score));

  const timelineActivities = collapseMessages(activities);
  const timeline = buildTimeline(timelineActivities);

  const nextAppt = appointments.find((a) =>
    ["agendado", "confirmado"].includes(a.status) && new Date(a.inicio) > new Date()
  );

  return (
    <div className="grid h-dvh overflow-hidden" style={{ gridTemplateRows: "64px 1fr" }}>
      {/* ── Topbar ── */}
      <header className="flex items-center justify-between px-8" style={{ borderBottom: "0.6px solid var(--color-cinza)", background: "var(--bg-1)" }}>
        <div className="inline-flex items-center" style={{ gap: "14px", fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>
          <Link href="/funil" className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] !no-underline transition-all duration-[160ms] hover:border-[var(--color-tangerina)] hover:bg-[var(--color-bege-claro)] hover:text-[var(--color-alaranjado)]" style={{ padding: "7px 14px 7px 10px", border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", color: "var(--color-texto-medio)", fontFamily: "var(--font-body)", fontSize: "12.5px", fontWeight: 500, letterSpacing: "0.2px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Voltar ao funil
          </Link>
          <span style={{ color: "var(--color-cinza)" }}>·</span>
          <span>{STAGE_LABEL[lead.estagio]}</span>
          <span style={{ color: "var(--color-cinza)" }}>›</span>
          <span style={{ color: "var(--color-texto-escuro)", fontWeight: 500 }}>{lead.nome}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Ajuda" style={{ width: 36, height: 36, borderRadius: "var(--radius-pill)", border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", color: "var(--color-texto-medio)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HelpCircle className="h-4 w-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="crm-scrollbar min-h-0 overflow-auto" style={{ padding: "24px 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: "28px", maxWidth: "1280px", margin: "0 auto" }}>

          {/* ── Main col ── */}
          <section className="min-w-0">
            {/* Lead header */}
            <header className="crm-card" style={{ padding: "28px 28px 22px", marginBottom: "22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "flex-start" }}>
                <div style={{ width: 72, height: 72, borderRadius: "var(--radius-pill)", background: "rgba(210,176,110,0.24)", color: "#7A5E1F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "28px", letterSpacing: "-0.01em", flexShrink: 0 }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "36px", lineHeight: 1.1, letterSpacing: "-0.005em", color: "var(--color-texto-escuro)", margin: "0 0 6px" }}>
                    {lead.nome}
                  </h1>
                  <div className="flex flex-wrap items-center" style={{ gap: "18px", marginTop: "6px" }}>
                    <span className="inline-flex items-center gap-2" style={{ fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: "12.5px", color: "var(--color-texto-medio)" }}>
                      <Phone className="h-[13px] w-[13px] shrink-0" style={{ strokeWidth: 1.6, color: "var(--color-bege)" }} />
                      {lead.telefone}
                      <span title="Copiar" style={{ color: "var(--color-cinza)", cursor: "pointer" }}>
                        <Copy className="h-3.5 w-3.5" style={{ strokeWidth: 1.6 }} />
                      </span>
                    </span>
                    {lead.email ? (
                      <span className="inline-flex items-center gap-2" style={{ fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: "12.5px", color: "var(--color-texto-medio)" }}>
                        <Mail className="h-[13px] w-[13px] shrink-0" style={{ strokeWidth: 1.6, color: "var(--color-bege)" }} />
                        {lead.email}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center" style={{ gap: "8px", marginTop: "14px" }}>
                    <span className="inline-flex items-center" style={{ gap: "7px", fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.3px", padding: "6px 12px 6px 10px", borderRadius: "var(--radius-pill)", lineHeight: 1, background: stageStyle.bg, color: stageStyle.color, border: `0.6px solid ${stageStyle.border}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: "var(--radius-pill)", background: stageStyle.dot, flexShrink: 0 }} />
                      {STAGE_LABEL[lead.estagio]}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.3px", padding: "6px 12px", borderRadius: "var(--radius-pill)", background: interestStyle.bg, color: interestStyle.color, lineHeight: 1 }}>
                      {INTEREST_LABEL[lead.interesse]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center" style={{ gap: "8px", marginTop: "22px", paddingTop: "20px", borderTop: "0.6px solid var(--color-cinza)" }}>
                <Btn primary onClick={() => router.push("/inbox")}>
                  <MessageCircle className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />Enviar mensagem
                </Btn>
                <Btn onClick={() => router.push("/agenda")}>
                  <CalendarDays className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />Agendar avaliação
                </Btn>
                {/* Mover no funil dropdown */}
                <div ref={stageRef} style={{ position: "relative" }}>
                  <Btn onClick={() => setStageOpen((v) => !v)} disabled={stageLoading}>
                    <Filter className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />
                    {stageLoading ? "Movendo..." : "Mover no funil"}
                  </Btn>
                  {stageOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", minWidth: 200, overflow: "hidden" }}
                      onMouseLeave={() => setStageOpen(false)}>
                      {STAGE_OPTIONS.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => handleMoveStage(value)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: value === lead.estagio ? "var(--color-bege-claro)" : "none", color: value === lead.estagio ? "var(--color-alaranjado)" : "var(--color-texto-escuro)", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: value === lead.estagio ? 500 : 400, border: 0, cursor: "pointer", textAlign: "left" }}
                          onMouseEnter={(e) => { if (value !== lead.estagio) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-bege-claro)"; }}
                          onMouseLeave={(e) => { if (value !== lead.estagio) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <span style={{ width: 6, height: 6, borderRadius: "var(--radius-pill)", background: STAGE_STYLE[value].dot, flexShrink: 0 }} />
                          {label}
                          {value === lead.estagio && <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--color-texto-medio)" }}>atual</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* More options dropdown */}
                <div ref={moreRef} style={{ position: "relative" }}>
                  <Btn iconOnly onClick={() => setMoreOpen((v) => !v)}>
                    <MoreHorizontal className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />
                  </Btn>
                  {moreOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", minWidth: 160, overflow: "hidden" }}
                      onMouseLeave={() => setMoreOpen(false)}>
                      <button type="button" onClick={handleArchive}
                        style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", color: "var(--color-ui-error)", fontFamily: "var(--font-body)", fontSize: "13px", border: 0, cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(209,76,68,0.07)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                        Arquivar lead
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {stageError && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-ui-error)", marginTop: "8px" }}>{stageError}</p>
              )}
            </header>

            {/* Tabs */}
            <div className="crm-card overflow-hidden">
              <nav role="tablist" className="flex items-center" style={{ borderBottom: "0.6px solid var(--color-cinza)", padding: "0 8px", background: "var(--bg-card)" }}>
                {TABS.map(({ id, label, Icon }) => (
                  <button key={id} role="tab" aria-selected={activeTab === id} type="button" onClick={() => setActiveTab(id)}
                    className="relative inline-flex items-center gap-2 px-4 py-[14px] text-[13px] transition-colors duration-[160ms]"
                    style={{ fontFamily: "var(--font-body)", fontWeight: activeTab === id ? 500 : 400, color: activeTab === id ? "var(--color-texto-escuro)" : "var(--color-texto-medio)", background: "none", border: 0, cursor: "pointer", borderBottom: activeTab === id ? "2px solid var(--color-alaranjado)" : "2px solid transparent", marginBottom: "-0.6px" }}>
                    <Icon className="h-3.5 w-3.5" style={{ strokeWidth: 1.6 }} />
                    {label}
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--color-texto-medio)", background: "var(--bg-2)", padding: "2px 6px", borderRadius: "var(--radius-pill)", lineHeight: 1.4 }}>
                      {id === "timeline" ? timelineActivities.length : id === "agendamentos" ? appointments.length : 0}
                    </span>
                  </button>
                ))}
              </nav>

              <div style={{ padding: "24px 28px" }}>
                {activeTab === "timeline" && (
                  timeline.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>Nenhuma atividade ainda.</p>
                  ) : (
                    <ul className="crm-tl-list">
                      {timeline.map((day) => (
                        <li key={day.label} style={{ marginBottom: "24px" }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-bege)", marginBottom: "14px" }}>
                            {day.label}
                          </div>
                          <ul className="crm-tl-list">
                            {day.events.map((evt, i) => {
                              return (
                                <li key={i} className="flex gap-3" style={{ marginBottom: "14px" }}>
                                  <TlIconBox tipo={evt.tipo} />
                                  <div className="min-w-0 pt-1.5">
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--color-texto-escuro)", lineHeight: 1.4 }}>{evt.headline}</div>
                                    <div className="flex items-center gap-2 mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)" }}>
                                      <span>{evt.autorName}</span>
                                      <span style={{ display: "inline-block", width: 3, height: 3, borderRadius: "var(--radius-pill)", background: "var(--color-cinza)" }} />
                                      <span>{evt.time}</span>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {activeTab === "conversa" && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>
                    Acesse o <Link href="/inbox" style={{ color: "var(--color-alaranjado)" }}>inbox</Link> para ver a conversa completa.
                  </p>
                )}
                {activeTab === "agendamentos" && (
                  appointments.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>Nenhum agendamento ainda.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {appointments.map((appt) => (
                        <div key={appt.id} style={{ border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", fontWeight: 500, color: "var(--color-texto-escuro)" }}>
                            {TIPO_LABEL[appt.tipo]} · {format(new Date(appt.inicio), "dd 'de' MMM · HH'h'mm", { locale: ptBR })}
                          </div>
                          {appt.profissional && (
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)", marginTop: "4px" }}>
                              com {appt.profissional.nome} · {appt.status}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
                {activeTab === "notas" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Adicionar nota interna..."
                      rows={4}
                      style={{ width: "100%", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", resize: "vertical", outline: "none" }}
                    />
                    {noteError && <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-ui-error)" }}>{noteError}</p>}
                    <button
                      type="button" onClick={handleSaveNote} disabled={noteSaving || !note.trim()}
                      style={{ alignSelf: "flex-start", appearance: "none", border: 0, background: noteSaving ? "var(--color-tangerina)" : "var(--color-alaranjado)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "9px 18px", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: noteSaving ? "wait" : "pointer", opacity: !note.trim() ? 0.5 : 1 }}
                    >
                      {noteSaving ? "Salvando..." : "Salvar nota"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Right sidebar ── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Contexto para avaliação */}
            <ContextoCard lead={lead} />

            {/* Score */}
            <section style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-lg)", padding: "22px 22px 20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 16px" }}>
                Score de qualificação
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "11px", marginLeft: "6px" }}>— score da IA</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "18px", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ width: 92, height: 92, borderRadius: "var(--radius-pill)", background: `conic-gradient(var(--color-alaranjado) ${scorePct}%, var(--bg-2) 0)`, display: "grid", placeItems: "center", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", inset: "8px", background: "var(--bg-card)", borderRadius: "var(--radius-pill)" }} />
                  <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "28px", color: "var(--color-texto-escuro)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{score}</span>
                    <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--color-texto-medio)", marginTop: "2px" }}>/100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, color: "var(--color-texto-escuro)", marginBottom: "4px" }}>
                    {score >= 75 ? "Encaixe alto" : score >= 50 ? "Encaixe médio" : score > 0 ? "Encaixe baixo" : "Sem avaliação"}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--color-texto-medio)", lineHeight: 1.4 }}>
                    {score > 0 ? `Pontuação registrada pelo agente de IA` : `O agente ainda não avaliou este lead`}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "12.5px", color: "var(--color-texto-escuro)", lineHeight: 1.55, padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-md)", borderLeft: "2px solid var(--color-bege)" }}>
                <div className="inline-flex items-center" style={{ gap: "5px", fontSize: "9.5px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "#7A5E1F", marginBottom: "6px" }}>
                  <Sun className="h-[11px] w-[11px]" style={{ strokeWidth: 1.7 }} />
                  Análise da IA
                </div>
                <br />
                {score > 0 ? "Qualificação realizada pelo agente de IA durante a conversa de WhatsApp." : "Nenhuma análise disponível ainda. O agente gerará um score durante a conversa."}
              </div>
            </section>

            {/* Dados */}
            <section style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-lg)", padding: "22px 22px 20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 16px" }}>Dados</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 18px" }}>
                {[
                  { label: "Origem",      value: ORIGIN_LABEL[lead.origem] },
                  { label: "Interesse",   value: INTEREST_LABEL[lead.interesse] },
                  { label: "Entrou em",   value: format(new Date(lead.created_at), "d MMM · HH:mm", { locale: ptBR }) },
                  { label: "Responsável", value: lead.responsavel?.nome ?? "— Agente IA" },
                  { label: "Telefone",    value: lead.telefone },
                  { label: "E-mail",      value: lead.email ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, letterSpacing: "1.6px", textTransform: "uppercase", color: "var(--color-texto-medio)", marginBottom: "5px" }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--color-texto-escuro)", lineHeight: 1.3, wordBreak: "break-word" }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Próximo passo */}
            <section style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-lg)", padding: "22px 22px 20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 16px" }}>Próximo passo</h3>
              {nextAppt ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: "16px", alignItems: "center", padding: "6px 0 14px" }}>
                    <div style={{ background: "var(--bg-2)", borderRadius: "var(--radius-md)", padding: "8px 0 10px", textAlign: "center", border: "0.6px solid var(--color-cinza)" }}>
                      <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "9.5px", fontWeight: 500, letterSpacing: "1.6px", textTransform: "uppercase", color: "var(--color-bege)" }}>
                        {format(new Date(nextAppt.inicio), "EEE", { locale: ptBR })}
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "26px", lineHeight: 1.1, color: "var(--color-texto-escuro)", marginTop: "1px", fontVariantNumeric: "tabular-nums" }}>
                        {format(new Date(nextAppt.inicio), "d")}
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--color-texto-medio)", textTransform: "lowercase", marginTop: "1px" }}>
                        {format(new Date(nextAppt.inicio), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", fontWeight: 500, color: "var(--color-texto-escuro)", lineHeight: 1.3, marginBottom: "4px" }}>
                        {TIPO_LABEL[nextAppt.tipo]} · {format(new Date(nextAppt.inicio), "HH'h'mm")}
                      </div>
                      {nextAppt.profissional && (
                        <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--color-texto-medio)", lineHeight: 1.45 }}>
                          <UserCheck className="h-[11px] w-[11px] shrink-0" style={{ strokeWidth: 1.7, color: "var(--color-bege)" }} />
                          com {nextAppt.profissional.nome}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--color-texto-medio)", lineHeight: 1.45, marginTop: "2px" }}>
                        <Clock3 className="h-[11px] w-[11px] shrink-0" style={{ strokeWidth: 1.7, color: "var(--color-bege)" }} />
                        50 minutos · {nextAppt.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex" style={{ gap: "8px", paddingTop: "12px", borderTop: "0.6px solid var(--color-cinza)" }}>
                    <Btn small><RefreshCw className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />Reagendar</Btn>
                    <Btn small><MessageCircle className="h-3.5 w-3.5" style={{ strokeWidth: 1.7 }} />Confirmar</Btn>
                  </div>
                </>
              ) : (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>
                  Nenhum agendamento próximo. <Link href="/agenda" style={{ color: "var(--color-alaranjado)" }}>Agendar avaliação</Link>
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
