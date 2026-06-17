"use client";

import Link from "next/link";
import { useState, useTransition, useCallback } from "react";
import {
  Aperture,
  CalendarDays,
  ChevronDown,
  Clock3,
  Globe,
  GripVertical,
  HelpCircle,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { FunilLead } from "@/lib/queries/leads";
import { validateAppointmentWithinClinicHours } from "@/lib/clinic-config";
import type { ClinicHoursRow } from "@/lib/clinic-config";
import { formatBrazilPhoneInput } from "@/lib/phone";
import { updateLeadStage, createLead } from "../leads/actions";
import { createAppointment } from "../agenda/actions";
import type { AppointmentType, LeadStage } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Interest = "pilates" | "pelvica" | "acupuntura";
type Origin = "whatsapp" | "instagram" | "indicacao" | "google" | "site";
type LastKind = "msg_ia" | "msg_hum" | "call" | "booked" | "no_show";
type StageId =
  | "novo"
  | "qual"
  | "agendada"
  | "no_show"
  | "negociacao"
  | "convertido"
  | "perdido";

interface LeadOwner {
  initials: string;
  name: string;
  bg: string;
  fg: string;
}

interface Lead {
  id: string;
  stage: StageId;
  name: string;
  interest: Interest;
  origin: Origin;
  score: number;
  createdAt: string;
  daysIn: number;
  owner: LeadOwner;
  last: LastKind;
  lastWhen: string;
  stale?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: { id: StageId; name: string; color: string; tight: boolean }[] = [
  { id: "novo",        name: "Novo",               color: "var(--color-bege)",        tight: false },
  { id: "qual",        name: "Em qualificação",     color: "var(--color-tangerina)",   tight: false },
  { id: "agendada",    name: "Avaliação agendada",  color: "var(--color-alaranjado)",  tight: false },
  { id: "no_show",     name: "No-show",             color: "var(--color-ui-error)",    tight: false },
  { id: "negociacao",  name: "Em negociação",       color: "#C97448",                  tight: false },
  { id: "convertido",  name: "Convertido",          color: "var(--color-verde)",       tight: true  },
  { id: "perdido",     name: "Perdido",             color: "var(--color-cinza)",       tight: true  },
];

const STAGE_GOALS: Record<StageId, string> = {
  novo: "Registrar a lead e garantir o primeiro contato rápido, entendendo de onde ela veio e qual necessidade trouxe até a clínica.",
  qual: "Entender o perfil, o interesse e a urgência da lead para confirmar se a avaliação faz sentido e qual serviço indicar.",
  agendada: "Manter a lead engajada até a avaliação, confirmar presença e reduzir o risco de falta.",
  no_show: "Recuperar a lead que faltou, entender o motivo da ausência e tentar reagendar com acolhimento.",
  negociacao: "Conduzir a decisão após a avaliação, tirar dúvidas, alinhar plano e horários e transformar interesse em matrícula.",
  convertido: "Lead virou aluna. Garantir início organizado, registro correto e continuidade do relacionamento.",
  perdido: "Registrar o motivo da perda e encerrar o atendimento com cuidado, mantendo possibilidade de reativação futura.",
};

const INTEREST_LABEL: Record<Interest, string> = {
  pilates: "Pilates",
  pelvica: "Fisio pélvica",
  acupuntura: "Acupuntura",
};

const INTEREST_STYLE: Record<Interest, { bg: string; color: string }> = {
  pilates:    { bg: "rgba(240,131,83,0.12)",  color: "#B85A2E" },
  pelvica:    { bg: "rgba(210,176,110,0.22)", color: "#7A5E1F" },
  acupuntura: { bg: "rgba(211,196,170,0.30)", color: "#6B5526" },
};

const ORIGIN_LABEL: Record<Origin, string> = {
  whatsapp:  "WhatsApp",
  instagram: "Instagram",
  indicacao: "Indicação",
  google:    "Google",
  site:      "Site",
};

// Maps UI StageId → DB LeadStage
const STAGE_TO_DB: Record<StageId, LeadStage> = {
  novo:        "novo",
  qual:        "qualificacao",
  agendada:    "avaliacao_agendada",
  no_show:     "no_show",
  negociacao:  "negociacao",
  convertido:  "convertido",
  perdido:     "perdido",
};

const STAGE_ORDER: Record<StageId, number> = {
  novo: 0,
  qual: 1,
  agendada: 2,
  no_show: 3,
  negociacao: 4,
  convertido: 5,
  perdido: 6,
};

const APPOINTMENT_DURATION_MINUTES = 50;
const OBSERVATIONS_REQUIRED_ERROR = "Registre uma observação antes de confirmar o agendamento.";
const APPOINTMENT_REQUIRED_STAGES = new Set<StageId>(["agendada", "no_show", "negociacao", "convertido"]);
const APPOINTMENT_HOUR_OPTIONS = Array.from({ length: 15 }, (_, index) => String(index + 6).padStart(2, "0"));
const APPOINTMENT_MINUTE_OPTIONS = ["00", "30"];

const APPOINTMENT_TYPE_BY_INTEREST: Record<Interest, AppointmentType> = {
  pilates: "avaliacao_pilates",
  pelvica: "avaliacao_fisio_pelvica",
  acupuntura: "avaliacao_acupuntura",
};

const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  avaliacao_pilates: "Avaliação Pilates",
  avaliacao_fisio_pelvica: "Avaliação Fisio Pélvica",
  avaliacao_acupuntura: "Avaliação Acupuntura",
};

const OWNER_PALETTE = [
  { bg: "var(--color-bege-claro)",        fg: "#6B5526" },
  { bg: "rgba(240,131,83,0.18)",          fg: "#B85A2E" },
  { bg: "rgba(172,192,149,0.30)",         fg: "#5F7948" },
  { bg: "rgba(122,110,104,0.18)",         fg: "#5A504B" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ownerColors(name: string) {
  return OWNER_PALETTE[name.charCodeAt(0) % OWNER_PALETTE.length];
}

function mapFunilLead(fl: FunilLead): Lead {
  const stageMap: Partial<Record<string, StageId>> = {
    qualificacao:      "qual",
    avaliacao_agendada: "agendada",
  };
  const interestMap: Partial<Record<string, Interest>> = {
    fisio_pelvica: "pelvica",
    acupuntura:    "acupuntura",
    indefinido:    "pilates",
  };

  const owner: LeadOwner = fl.responsavel
    ? {
        initials: fl.responsavel.nome
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase(),
        name: fl.responsavel.nome,
        ...ownerColors(fl.responsavel.nome),
      }
    : { initials: "IA", name: "Agente IA", bg: "rgba(210,176,110,0.30)", fg: "#7A5E1F" };

  return {
    id:        fl.id,
    stage:     (stageMap[fl.estagio] ?? fl.estagio) as StageId,
    name:      fl.nome,
    interest:  (interestMap[fl.interesse] ?? fl.interesse) as Interest,
    origin:    (fl.origem === "outro" ? "site" : fl.origem) as Origin,
    score:     fl.score_qualificacao,
    createdAt: fl.created_at,
    daysIn:    fl.daysIn,
    owner,
    last:      "msg_ia" as LastKind,
    lastWhen:  fl.lastWhen,
    stale:     fl.stale,
  };
}

function scoreBarColor(score: number) {
  if (score >= 75) return "var(--color-alaranjado)";
  if (score >= 55) return "var(--color-tangerina)";
  if (score >= 40) return "var(--color-bege)";
  return "var(--color-cinza)";
}

function daysLabel(days: number) {
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function nextAppointmentStartParts() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);

  if (date.getHours() < 6) {
    date.setHours(6, 0, 0, 0);
  }

  if (date.getHours() > 20) {
    date.setDate(date.getDate() + 1);
    date.setHours(6, 0, 0, 0);
  }

  const value = toDateTimeLocalValue(date);
  return {
    date: value.slice(0, 10),
    hour: value.slice(11, 13),
    minute: value.slice(14, 16),
  };
}

function stageRequiresAppointment(stage: StageId) {
  return APPOINTMENT_REQUIRED_STAGES.has(stage);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OriginIcon({ origin }: { origin: Origin }) {
  const cls = "h-3 w-3 shrink-0";
  const style = { color: "var(--color-bege)", strokeWidth: 1.6 };
  switch (origin) {
    case "whatsapp":  return <MessageCircle className={cls} style={style} />;
    case "instagram": return <Aperture className={cls} style={style} />;
    case "indicacao": return <Users className={cls} style={style} />;
    case "google":    return <Search className={cls} style={style} />;
    case "site":      return <Globe className={cls} style={style} />;
  }
}

function LastIcon({ kind }: { kind: LastKind }) {
  const cls = "h-[11px] w-[11px] shrink-0";
  switch (kind) {
    case "msg_ia":  return <MessageCircle className={cls} style={{ color: "#7A5E1F", strokeWidth: 1.7 }} />;
    case "msg_hum": return <MessageCircle className={cls} style={{ color: "var(--color-alaranjado)", strokeWidth: 1.7 }} />;
    case "call":    return <Phone className={cls} style={{ color: "var(--color-bege)", strokeWidth: 1.7 }} />;
    case "booked":  return <CalendarDays className={cls} style={{ color: "var(--color-bege)", strokeWidth: 1.7 }} />;
    case "no_show": return <X className={cls} style={{ color: "var(--color-bege)", strokeWidth: 1.7 }} />;
  }
}

function Avatar({ owner, size = "sm" }: { owner: LeadOwner; size?: "sm" | "xs" }) {
  const dim = size === "sm" ? 24 : 22;
  const fs  = size === "sm" ? "10px" : "9px";
  return (
    <div
      title={owner.name}
      style={{
        width: dim, height: dim,
        background: owner.bg, color: owner.fg,
        borderRadius: "var(--radius-pill)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-display)",
        fontSize: fs, lineHeight: 1,
      }}
    >
      {owner.initials}
    </div>
  );
}

function KanbanCard({
  lead,
  stageColor,
  action,
}: {
  lead: Lead;
  stageColor: string;
  action?: React.ReactNode;
}) {
  const interest = INTEREST_STYLE[lead.interest];
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-[240ms] ease-[cubic-bezier(.4,0,.2,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(58,53,48,0.08)]">
      <Link href={`/leads/${lead.id}`} className="block cursor-pointer !no-underline">
        <div style={{ height: "4px", background: stageColor }} />
        <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="flex items-start justify-between gap-2">
            <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500, color: "var(--color-texto-escuro)", lineHeight: 1.3 }}>
              {lead.name}
            </span>
            <span className="shrink-0 opacity-0 transition-opacity duration-[160ms] group-hover:opacity-100" style={{ color: "var(--color-texto-medio)" }} aria-hidden>
              <GripVertical className="h-3.5 w-3.5" style={{ strokeWidth: 1.6 }} />
            </span>
          </div>

          <div>
            <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--font-body)", fontSize: "9.5px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.3px", padding: "3px 8px", borderRadius: "var(--radius-xs)", lineHeight: 1.2, background: interest.bg, color: interest.color }}>
              {INTEREST_LABEL[lead.interest]}
            </span>
          </div>

          <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--color-texto-medio)", lineHeight: 1.2 }}>
            <OriginIcon origin={lead.origin} />
            {ORIGIN_LABEL[lead.origin]}
          </div>

          <div className="flex items-center justify-between gap-2" style={{ paddingTop: "2px" }}>
            <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ width: "36px", height: "4px", background: "var(--bg-2)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${lead.score}%`, background: scoreBarColor(lead.score), borderRadius: "var(--radius-pill)" }} />
              </div>
              <span style={{ fontWeight: 500, color: "var(--color-texto-escuro)" }}>
                {lead.score}
                <span style={{ color: "var(--color-texto-medio)", fontWeight: 400, fontSize: "10px" }}>/100</span>
              </span>
            </div>
            <div className="flex items-center gap-[5px]" style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontVariantNumeric: "tabular-nums", color: lead.stale ? "var(--color-ui-error)" : "var(--color-texto-medio)" }}>
              <Clock3 className="h-[11px] w-[11px] shrink-0" style={{ strokeWidth: 1.6, color: lead.stale ? "var(--color-ui-error)" : "var(--color-texto-medio)" }} />
              {daysLabel(lead.daysIn)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ padding: "10px 14px", borderTop: "0.6px solid var(--color-cinza)", background: "var(--bg-1)" }}>
          <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)" }}>
            <Avatar owner={lead.owner} size="sm" />
            <span>{lead.owner.name.split(" ")[0]}</span>
          </div>
          <div className="flex items-center gap-[5px]" style={{ fontFamily: "var(--font-body)", fontSize: "10.5px", color: "var(--color-texto-medio)", fontVariantNumeric: "tabular-nums" }}>
            <LastIcon kind={lead.last} />
            {lead.lastWhen}
          </div>
        </div>
      </Link>
      {action ? (
        <div style={{ padding: "10px 14px 12px", borderTop: "0.6px solid var(--color-cinza)", background: "var(--bg-card)" }}>
          {action}
        </div>
      ) : null}
    </article>
  );
}

function KanbanCardTight({ lead, stageColor }: { lead: Lead; stageColor: string }) {
  return (
    <Link href={`/leads/${lead.id}`} className="block !no-underline">
      <article className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-[240ms] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(58,53,48,0.08)] cursor-pointer"
        style={{ display: "grid", gridTemplateColumns: "4px 28px 1fr auto", alignItems: "center", gap: "10px", paddingRight: "12px" }}>
        <div style={{ width: "4px", height: "48px", background: stageColor }} />
        <div title={lead.owner.name} style={{ width: "22px", height: "22px", background: lead.owner.bg, color: lead.owner.fg, borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "9px", lineHeight: 1, flexShrink: 0, margin: "0 auto" }}>
          {lead.owner.initials}
        </div>
        <div className="min-w-0 flex flex-col" style={{ gap: "2px", padding: "10px 0" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, color: "var(--color-texto-escuro)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lead.name}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "10.5px", color: "var(--color-texto-medio)" }}>
            {INTEREST_LABEL[lead.interest]}{" "}
            · {ORIGIN_LABEL[lead.origin]}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "10.5px", color: "var(--color-texto-medio)", fontVariantNumeric: "tabular-nums" }}>
          {lead.score}
        </div>
      </article>
    </Link>
  );
}

function ColumnEmpty({ objective }: { objective: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[var(--radius-md)] px-[18px] py-7 text-center" style={{ border: "0.6px dashed var(--color-cinza)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" style={{ color: "var(--color-bege)" }}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--color-texto-escuro)", lineHeight: 1.2, marginTop: "2px" }}>
        Objetivo da etapa
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)", lineHeight: 1.5, maxWidth: "232px" }}>
        {objective}
      </div>
    </div>
  );
}

function StageGoalHelp({ stageName, objective }: { stageName: string; objective: string }) {
  return (
    <div className="group relative flex h-6 w-6 items-center justify-center">
      <button
        type="button"
        aria-label={`Objetivo da etapa ${stageName}`}
        className="flex h-6 w-6 cursor-help items-center justify-center rounded-[var(--radius-md)] transition-colors duration-[160ms]"
        style={{ background: "transparent", border: 0, color: "var(--color-texto-medio)" }}
      >
        <HelpCircle className="h-[13px] w-[13px]" style={{ strokeWidth: 1.7 }} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-8 z-30 w-[260px] rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-left opacity-0 shadow-[0_8px_24px_rgba(58,53,48,0.10)] transition-opacity duration-[160ms] group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--color-bege)", lineHeight: 1.2, marginBottom: "6px" }}>
          Objetivo
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)", lineHeight: 1.45 }}>
          {objective}
        </p>
      </div>
    </div>
  );
}

function RescheduleButton({
  pending,
  onReschedule,
}: {
  pending: boolean;
  onReschedule: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onReschedule();
      }}
      className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-[var(--radius-pill)] text-[12px] font-medium transition-colors duration-[160ms] disabled:cursor-wait disabled:opacity-70"
      style={{
        border: "0.6px solid rgba(240,131,83,0.45)",
        background: "rgba(240,131,83,0.10)",
        color: "var(--color-alaranjado)",
        fontFamily: "var(--font-body)",
      }}
    >
      {pending ? "Remarcando..." : "Remarcar"}
    </button>
  );
}

function ScheduleAppointmentModal({
  lead,
  clinicHours,
  onClose,
  onScheduled,
}: {
  lead: Lead;
  clinicHours: ClinicHoursRow[];
  onClose: () => void;
  onScheduled: (leadId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"inicio" | "observacoes" | null>(null);
  const appointmentType = APPOINTMENT_TYPE_BY_INTEREST[lead.interest];
  const isStartError = errorField === "inicio";
  const isObservationsError = errorField === "observacoes";
  const defaultStart = nextAppointmentStartParts();

  const clearStartError = () => {
    if (isStartError) {
      setError(null);
      setErrorField(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const dateValue = String(formData.get("data") ?? "");
    const hourValue = String(formData.get("hora") ?? "");
    const minuteValue = String(formData.get("minuto") ?? "");
    const startValue = dateValue && hourValue && minuteValue
      ? `${dateValue}T${hourValue}:${minuteValue}:00`
      : "";
    const observations = String(formData.get("observacoes") ?? "").trim();
    const start = new Date(startValue);

    if (!startValue || Number.isNaN(start.getTime())) {
      setError("Informe a data e hora da avaliação.");
      setErrorField("inicio");
      return;
    }

    const leadEntry = new Date(lead.createdAt);
    if (start < leadEntry) {
      setError("A data da avaliação deve ser igual ou posterior à data de entrada no funil.");
      setErrorField("inicio");
      return;
    }

    const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000);
    const isPast = start < new Date();
    if (!isPast) {
      const scheduleValidation = validateAppointmentWithinClinicHours(clinicHours, start, end);
      if (!scheduleValidation.ok) {
        setError(scheduleValidation.message);
        setErrorField("inicio");
        return;
      }
    }

    if (!observations) {
      setError(OBSERVATIONS_REQUIRED_ERROR);
      setErrorField("observacoes");
      return;
    }

    startTransition(async () => {
      setError(null);
      setErrorField(null);
      const result = await createAppointment({
        lead_id: lead.id,
        inicio: start.toISOString(),
        fim: end.toISOString(),
        tipo: appointmentType,
        observacoes: observations,
      });

      if (result.success) {
        onScheduled(lead.id);
        onClose();
      } else {
        setError(result.error);
        setErrorField(result.error.includes("horário") || result.error.includes("clínica") ? "inicio" : null);
      }
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(42,31,26,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "0.6px solid var(--color-cinza)", padding: "28px 28px 24px", width: 480, boxShadow: "var(--shadow-lg)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: "22px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 400, color: "var(--color-texto-escuro)", margin: 0 }}>
              Agendar avaliação
            </h2>
            <span style={{ display: "block", marginTop: "6px", fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)" }}>
              {lead.name} · {APPOINTMENT_TYPE_LABEL[appointmentType]}
            </span>
          </div>
          <button onClick={onClose} type="button" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--color-texto-medio)", padding: "4px" }}>
            <X className="h-4 w-4" style={{ strokeWidth: 1.6 }} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", display: "block", marginBottom: "6px" }}>
              Data e hora
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 88px 88px", gap: "10px" }}>
              <input
                name="data"
                type="date"
                required
                defaultValue={defaultStart.date}
                aria-invalid={isStartError}
                aria-describedby={isStartError ? "schedule-appointment-error" : undefined}
                onChange={clearStartError}
                style={{ width: "100%", border: isStartError ? "0.8px solid var(--color-ui-error)" : "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box", boxShadow: isStartError ? "0 0 0 3px rgba(205, 61, 54, 0.10)" : "none" }}
              />
              <select
                name="hora"
                defaultValue={defaultStart.hour}
                aria-label="Hora"
                aria-invalid={isStartError}
                onChange={clearStartError}
                style={{ width: "100%", border: isStartError ? "0.8px solid var(--color-ui-error)" : "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box", boxShadow: isStartError ? "0 0 0 3px rgba(205, 61, 54, 0.10)" : "none" }}
              >
                {APPOINTMENT_HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>{hour}h</option>
                ))}
              </select>
              <select
                name="minuto"
                defaultValue={defaultStart.minute}
                aria-label="Minutos"
                aria-invalid={isStartError}
                onChange={clearStartError}
                style={{ width: "100%", border: isStartError ? "0.8px solid var(--color-ui-error)" : "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box", boxShadow: isStartError ? "0 0 0 3px rgba(205, 61, 54, 0.10)" : "none" }}
              >
                {APPOINTMENT_MINUTE_OPTIONS.map((minute) => (
                  <option key={minute} value={minute}>{minute} min</option>
                ))}
              </select>
            </div>
            <span style={{ display: "block", marginTop: "6px", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)" }}>
              Duração padrão: {APPOINTMENT_DURATION_MINUTES} minutos.
            </span>
          </div>

          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
              <span>Observações</span>
              <span style={{ color: "var(--color-ui-error)", letterSpacing: "1.1px" }}>Obrigatório</span>
            </label>
            <textarea
              name="observacoes"
              rows={4}
              required
              aria-invalid={isObservationsError}
              aria-describedby={isObservationsError ? "schedule-appointment-error" : undefined}
              placeholder="Ex.: preferência de horário, contexto da conversa ou cuidado importante."
              onChange={() => {
                if (isObservationsError) {
                  setError(null);
                  setErrorField(null);
                }
              }}
              style={{ width: "100%", resize: "vertical", border: isObservationsError ? "0.8px solid var(--color-ui-error)" : "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box", lineHeight: 1.45, boxShadow: isObservationsError ? "0 0 0 3px rgba(205, 61, 54, 0.10)" : "none" }}
            />
          </div>

          {error && <p id="schedule-appointment-error" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-ui-error)", margin: 0 }}>{error}</p>}

          <div className="flex items-center justify-end" style={{ gap: "10px", paddingTop: "8px", borderTop: "0.6px solid var(--color-cinza)" }}>
            <button type="button" onClick={onClose} style={{ appearance: "none", border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", color: "var(--color-texto-escuro)", borderRadius: "var(--radius-pill)", padding: "9px 18px", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} style={{ appearance: "none", border: 0, background: pending ? "var(--color-tangerina)" : "var(--color-alaranjado)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "9px 18px", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: pending ? "wait" : "pointer" }}>
              {pending ? "Agendando..." : "Confirmar agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DnD Wrappers ─────────────────────────────────────────────────────────────

function DraggableCard({ id, children }: { id: string; children: () => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dndIsDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: dndIsDragging ? 0.5 : 1,
        cursor: dndIsDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      {children()}
    </div>
  );
}

function DroppableColumn({ id, children, isOver }: { id: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minHeight: "100px",
        transition: "background 160ms",
        background: isOver ? "rgba(240,131,83,0.04)" : "transparent",
        borderRadius: "var(--radius-md)",
        padding: isOver ? "4px" : "0",
      }}
    >
      {children}
    </div>
  );
}

// ─── New Lead Modal ────────────────────────────────────────────────────────────

function NewLeadModal({
  initialStage,
  onClose,
  onCreated,
}: {
  initialStage: StageId;
  onClose: () => void;
  onCreated: (lead: FunilLead, options?: { scheduleAfterCreate?: boolean }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const requiresScheduling = stageRequiresAppointment(initialStage);
  const creationStage: StageId = requiresScheduling ? "qual" : initialStage;
  const initialStageName = STAGES.find((stage) => stage.id === initialStage)?.name ?? "Novo";
  const creationStageName = STAGES.find((stage) => stage.id === creationStage)?.name ?? "Em qualificação";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      setError(null);
      const result = await createLead(formData);
      if (result.success) {
        onCreated(result.lead, { scheduleAfterCreate: requiresScheduling });
        form.reset();
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(42,31,26,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "0.6px solid var(--color-cinza)", padding: "28px 28px 24px", width: 480, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: "22px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 400, color: "var(--color-texto-escuro)", margin: 0 }}>Novo lead</h2>
            <span style={{ display: "block", marginTop: "6px", fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)" }}>
              {requiresScheduling
                ? `${initialStageName} exige avaliação. O lead entra em ${creationStageName} até confirmar a data.`
                : `Etapa inicial: ${initialStageName}`}
            </span>
          </div>
          <button onClick={onClose} type="button" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--color-texto-medio)", padding: "4px" }}>
            <X className="h-4 w-4" style={{ strokeWidth: 1.6 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input type="hidden" name="estagio" value={STAGE_TO_DB[creationStage]} />
          {[
            { name: "nome", label: "Nome", type: "text", placeholder: "Nome completo", required: true },
            { name: "telefone", label: "Telefone (WhatsApp)", type: "tel", placeholder: "(49) 99929-2140", required: true, hint: "Aceita com parênteses, hífen ou espaços. Salvamos como +55DDDNÚMERO." },
            { name: "email", label: "E-mail (opcional)", type: "email", placeholder: "email@exemplo.com", required: false },
          ].map(({ name, label, type, placeholder, required, hint }) => (
            <div key={name}>
              <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", display: "block", marginBottom: "6px" }}>
                {label}
              </label>
              <input
                name={name} type={type} placeholder={placeholder} required={required}
                inputMode={name === "telefone" ? "tel" : undefined}
                autoComplete={name === "telefone" ? "tel" : undefined}
                onBlur={name === "telefone" ? (event) => {
                  event.currentTarget.value = formatBrazilPhoneInput(event.currentTarget.value);
                } : undefined}
                style={{ width: "100%", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box" }}
              />
              {hint && (
                <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)" }}>
                  {hint}
                </p>
              )}
            </div>
          ))}

          {/* Data de entrada no funil */}
          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", display: "block", marginBottom: "6px" }}>
              Entrada no funil
            </label>
            <input
              name="data_entrada"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              style={{ width: "100%", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Origem + Interesse */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {[
              { name: "origem", label: "Origem", options: [["whatsapp","WhatsApp"],["instagram","Instagram"],["indicacao","Indicação"],["google","Google"],["outro","Outro"]] },
              { name: "interesse", label: "Interesse", options: [["indefinido","Indefinido"],["pilates","Pilates"],["fisio_pelvica","Fisio pélvica"],["acupuntura","Acupuntura"]] },
            ].map(({ name, label, options }) => (
              <div key={name}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", display: "block", marginBottom: "6px" }}>{label}</label>
                <select name={name} defaultValue={options[0][0]} style={{ width: "100%", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--color-texto-escuro)", background: "var(--bg-1)", outline: "none" }}>
                  {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {error && <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-ui-error)" }}>{error}</p>}

          <div className="flex items-center justify-end" style={{ gap: "10px", paddingTop: "8px", borderTop: "0.6px solid var(--color-cinza)" }}>
            <button type="button" onClick={onClose} style={{ appearance: "none", border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", color: "var(--color-texto-escuro)", borderRadius: "var(--radius-pill)", padding: "9px 18px", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} style={{ appearance: "none", border: 0, background: pending ? "var(--color-tangerina)" : "var(--color-alaranjado)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "9px 18px", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: pending ? "wait" : "pointer" }}>
              {pending ? "Criando..." : "Criar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FunilBoard({
  initialLeads,
  clinicHours,
}: {
  initialLeads: FunilLead[];
  clinicHours: ClinicHoursRow[];
}) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalStage, setModalStage] = useState<StageId>("novo");
  const [leads, setLeads] = useState(() => initialLeads.map(mapFunilLead));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    setOverStage(event.over ? (String(event.over.id) as StageId) : null);
  }, []);

  const openNewLeadModal = useCallback((stageId: StageId) => {
    setModalStage(stageId);
    setShowModal(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setOverStage(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStage = String(over.id) as StageId;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    if (STAGE_ORDER[newStage] < STAGE_ORDER[lead.stage]) return;

    if (newStage === "no_show" && lead.stage !== "agendada") {
      setSchedulingLead(lead);
      return;
    }

    if (STAGE_ORDER[lead.stage] < STAGE_ORDER.agendada && stageRequiresAppointment(newStage)) {
      setSchedulingLead(lead);
      return;
    }

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));

    startTransition(async () => {
      const result = await updateLeadStage({ id: leadId, estagio: STAGE_TO_DB[newStage] });
      if (!result.success) {
        // Revert on error
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: lead.stage } : l));
      }
    });
  }, [leads]);

  const handleReschedule = useCallback((leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.stage !== "no_show") return;
    setSchedulingLead(lead);
  }, [leads]);

  const handleScheduled = useCallback((leadId: string) => {
    setLeads((prev) => prev.map((item) => item.id === leadId
      ? { ...item, stage: "agendada", last: "booked", lastWhen: "agora", daysIn: 0, stale: false }
      : item
    ));
  }, []);

  const filteredLeads = search.trim()
    ? leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : leads;

  const totalAtivos = leads.filter((l) => l.stage !== "convertido" && l.stage !== "perdido").length;
  const convRate = leads.length > 0
    ? Math.round((leads.filter((l) => l.stage === "convertido").length / leads.length) * 100)
    : 0;

  const activeCard = activeId ? leads.find((l) => l.id === activeId) ?? null : null;

  return (
    <div className="grid h-dvh overflow-hidden" style={{ gridTemplateRows: "64px auto 1fr" }}>
      {/* ── Topbar ── */}
      <header className="flex items-center justify-between px-8" style={{ borderBottom: "0.6px solid var(--color-cinza)", background: "var(--bg-1)" }}>
        <div className="flex items-baseline gap-3.5">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "28px", lineHeight: 1, color: "var(--color-texto-escuro)", letterSpacing: "-0.005em", margin: 0 }}>
            Funil
          </h1>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-texto-medio)" }}>
            <strong style={{ color: "var(--color-texto-escuro)", fontWeight: 500 }}>{leads.length}</strong>{" "}
            leads no funil ·{" "}
            <strong style={{ color: "var(--color-texto-escuro)", fontWeight: 500 }}>{totalAtivos}</strong>{" "}
            ativos
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5" style={{ color: "var(--color-texto-medio)", strokeWidth: 1.6 }} />
            <input
              type="text"
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px] rounded-[var(--radius-pill)] py-2 pl-[34px] pr-3.5 text-[13px] outline-none transition-[border-color,box-shadow] duration-[160ms]"
              style={{ border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", fontFamily: "var(--font-body)", color: "var(--color-texto-escuro)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-alaranjado)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(240,131,83,0.15)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-cinza)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] px-3.5 py-2 transition-all duration-[160ms]" style={{ border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--color-texto-escuro)", letterSpacing: "0.2px" }}>
            <span style={{ color: "var(--color-texto-medio)", fontWeight: 400 }}>Origem:</span>{" "}Todas
            <ChevronDown className="h-3 w-3" style={{ color: "var(--color-texto-medio)", strokeWidth: 1.6 }} />
          </button>
          <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] px-3.5 py-2 transition-all duration-[160ms]" style={{ border: "0.6px solid var(--color-cinza)", background: "var(--bg-card)", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--color-texto-escuro)", letterSpacing: "0.2px" }}>
            <span style={{ color: "var(--color-texto-medio)", fontWeight: 400 }}>Interesse:</span>{" "}Todos
            <ChevronDown className="h-3 w-3" style={{ color: "var(--color-texto-medio)", strokeWidth: 1.6 }} />
          </button>
          <button type="button" onClick={() => openNewLeadModal("novo")} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] px-[18px] py-[9px] text-[13px] font-medium tracking-[0.3px] text-white transition-colors duration-[160ms]" style={{ background: "var(--color-alaranjado)", border: 0, fontFamily: "var(--font-body)" }}>
            <Plus className="h-3.5 w-3.5" style={{ strokeWidth: 1.8 }} />
            Novo lead
          </button>
        </div>
      </header>

      {/* ── Context bar ── */}
      <div className="flex items-center justify-between px-8" style={{ paddingTop: "18px", paddingBottom: "14px", gap: "24px" }}>
        <div className="flex items-baseline" style={{ gap: "28px" }}>
          {[
            { val: String(leads.length), label: "No funil" },
            { val: String(convRate), unit: "%", label: "Conv. global" },
          ].map(({ val, unit, label }) => (
            <div key={label} className="flex flex-col" style={{ gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "22px", lineHeight: 1, color: "var(--color-texto-escuro)", fontVariantNumeric: "tabular-nums" }}>
                {val}
                {unit && <span style={{ fontSize: "14px", color: "var(--color-texto-medio)", marginLeft: "2px" }}>{unit}</span>}
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-texto-medio)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--color-texto-medio)" }}>
          <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--color-bege)", strokeWidth: 1.6 }} />
          Todos os leads ativos
        </div>
      </div>

      {/* ── Board ── */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="crm-scrollbar min-h-0 overflow-auto" style={{ padding: "6px 32px 32px" }}>
          <div className="flex items-start" style={{ gap: "18px", minHeight: "100%" }}>
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
              const isOver = overStage === stage.id;
              const objective = STAGE_GOALS[stage.id];
              return (
                <section key={stage.id} className="flex flex-col" style={{ width: stage.tight ? "232px" : "304px", flexShrink: 0, minHeight: "100%" }}>
                  <header className="mb-1 flex items-center" style={{ gap: "10px", padding: "8px 4px 14px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", background: stage.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--color-texto-escuro)", textTransform: "uppercase", letterSpacing: "1.6px", lineHeight: 1 }}>
                      {stage.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--color-texto-medio)", background: "var(--bg-2)", padding: "2px 8px", borderRadius: "var(--radius-pill)", lineHeight: 1.4, fontVariantNumeric: "tabular-nums" }}>
                      {stageLeads.length}
                    </span>
                    <div className="ml-auto flex items-center" style={{ gap: "2px" }}>
                      <button
                        type="button"
                        aria-label={`Adicionar lead em ${stage.name}`}
                        onClick={() => openNewLeadModal(stage.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-md)] transition-all duration-[160ms]"
                        style={{ background: "transparent", border: 0, color: "var(--color-texto-medio)" }}
                      >
                        <Plus className="h-[13px] w-[13px]" style={{ strokeWidth: 1.7 }} />
                      </button>
                      <StageGoalHelp stageName={stage.name} objective={objective} />
                    </div>
                  </header>

                  <DroppableColumn id={stage.id} isOver={isOver}>
                    <div className="flex flex-col" style={{ gap: "12px", paddingBottom: "12px" }}>
                      {stageLeads.length === 0 ? (
                        <ColumnEmpty objective={objective} />
                      ) : stage.tight ? (
                        stageLeads.map((lead) => (
                          <DraggableCard key={lead.id} id={lead.id}>
                            {() => <KanbanCardTight lead={lead} stageColor={stage.color} />}
                          </DraggableCard>
                        ))
                      ) : (
                        stageLeads.map((lead) => (
                          <DraggableCard key={lead.id} id={lead.id}>
                            {() => (
                              <div className="flex flex-col" style={{ gap: "8px" }}>
                                <KanbanCard
                                  lead={lead}
                                  stageColor={stage.color}
                                  action={lead.stage === "no_show" ? (
                                    <RescheduleButton
                                      pending={schedulingLead?.id === lead.id}
                                      onReschedule={() => handleReschedule(lead.id)}
                                    />
                                  ) : undefined}
                                />
                              </div>
                            )}
                          </DraggableCard>
                        ))
                      )}
                    </div>
                  </DroppableColumn>
                </section>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div style={{ opacity: 0.9 }}>
              {STAGES.find((s) => s.tight && s.id === activeCard.stage) ? (
                <KanbanCardTight lead={activeCard} stageColor={STAGES.find((s) => s.id === activeCard.stage)?.color ?? "var(--color-bege)"} />
              ) : (
                <KanbanCard lead={activeCard} stageColor={STAGES.find((s) => s.id === activeCard.stage)?.color ?? "var(--color-bege)"} />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showModal && (
        <NewLeadModal
          initialStage={modalStage}
          onClose={() => setShowModal(false)}
          onCreated={(lead, options) => {
            setLeads((prev) => {
              const createdLead = mapFunilLead(lead);
              return [createdLead, ...prev.filter((item) => item.id !== createdLead.id)];
            });
            if (options?.scheduleAfterCreate) {
              setSchedulingLead(mapFunilLead(lead));
            }
          }}
        />
      )}

      {schedulingLead && (
        <ScheduleAppointmentModal
          lead={schedulingLead}
          clinicHours={clinicHours}
          onClose={() => setSchedulingLead(null)}
          onScheduled={handleScheduled}
        />
      )}
    </div>
  );
}
