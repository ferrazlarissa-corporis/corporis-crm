"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, RotateCcw, X, CalendarDays } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentRow } from "@/lib/queries/appointments";
import {
  buildClinicSchedule,
  type ClinicHoursRow,
  type ClinicScheduleDay,
} from "@/lib/clinic-config";
import type { AppointmentType, AppointmentStatus } from "@/types/database";
import Link from "next/link";
import { getAgendaAppointments } from "./actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_PX    = 60;
const HOUR_COL_W = 56;

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType   = "pilates" | "gestante" | "pelvica";
type EventStatus = "confirmed" | "pending" | "no-show" | "cancelled";
type AgendaViewMode = "day" | "week" | "month";

interface CalEvent {
  id: string;
  dateKey: string;
  startDate: Date;
  s: string;         // "HH:MM" start
  dur: number;       // minutes
  type: EventType;
  name: string;
  leadId: string;
  profissional: string;
  status: EventStatus;
  observations?: string;
}

interface PopoverPos { left: number; top: number; }

interface ClosedSegment {
  startMinutes: number;
  endMinutes: number;
}

const VIEW_OPTIONS: { id: AgendaViewMode; label: string }[] = [
  { id: "day", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
];

// ─── Token maps ───────────────────────────────────────────────────────────────

const TK: Record<EventType, { color: string; bg: string; fg: string; label: string }> = {
  pilates:  { color: "var(--color-alaranjado)", bg: "rgba(240, 131, 83, 0.14)", fg: "#8C4A1A", label: "Avaliação Pilates"   },
  gestante: { color: "var(--color-verde)",      bg: "rgba(172, 192, 149, 0.30)", fg: "#4F6A3A", label: "Avaliação Gestante" },
  pelvica:  { color: "var(--color-bege)",       bg: "rgba(210, 176, 110, 0.28)", fg: "#6E5417", label: "Fisio Pélvica"     },
};

const TYPE_MAP: Record<AppointmentType, EventType> = {
  avaliacao_pilates:       "pilates",
  avaliacao_gestante:      "gestante",
  avaliacao_fisio_pelvica: "pelvica",
};

const STATUS_MAP: Record<AppointmentStatus, EventStatus> = {
  confirmado: "confirmed",
  agendado:   "pending",
  faltou:     "no-show",
  cancelado:  "cancelled",
  compareceu: "confirmed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topForMinutes(minutes: number, timelineStartMinutes: number): number {
  return ((minutes - timelineStartMinutes) / 60) * HOUR_PX;
}

function topFor(h: number, m: number, timelineStartMinutes: number): number {
  return topForMinutes(h * 60 + m, timelineStartMinutes);
}

function parseTime(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [h, m];
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function clinicDayIndexForDate(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getPeriodBounds(viewMode: AgendaViewMode, anchor: Date) {
  if (viewMode === "day") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }

  if (viewMode === "month") {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }

  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  };
}

function formatPeriodLabel(viewMode: AgendaViewMode, start: Date, end: Date) {
  if (viewMode === "day") {
    return format(start, "d MMM · yyyy", { locale: ptBR });
  }

  if (viewMode === "month") {
    return format(start, "MMMM · yyyy", { locale: ptBR });
  }

  return `${format(start, "d", { locale: ptBR })}–${format(end, "d MMM · yyyy", { locale: ptBR })}`;
}

function endTime(s: string, dur: number): string {
  const [h, m] = parseTime(s);
  const totalMin = h * 60 + m + dur;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

function getClosedSegments(day: ClinicScheduleDay, timelineStartMinutes: number, timelineEndMinutes: number): ClosedSegment[] {
  if (day.intervals.length === 0) {
    return [{ startMinutes: timelineStartMinutes, endMinutes: timelineEndMinutes }];
  }

  const segments: ClosedSegment[] = [];
  let cursor = timelineStartMinutes;

  day.intervals
    .map((interval) => ({
      startMinutes: Math.max(interval.startMinutes, timelineStartMinutes),
      endMinutes: Math.min(interval.endMinutes, timelineEndMinutes),
    }))
    .filter((interval) => interval.endMinutes > interval.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .forEach((interval) => {
      if (interval.startMinutes > cursor) {
        segments.push({ startMinutes: cursor, endMinutes: interval.startMinutes });
      }

      cursor = Math.max(cursor, interval.endMinutes);
    });

  if (cursor < timelineEndMinutes) {
    segments.push({ startMinutes: cursor, endMinutes: timelineEndMinutes });
  }

  return segments.filter((segment) => segment.endMinutes - segment.startMinutes >= 15);
}

function mapAppointments(appts: AppointmentRow[]): CalEvent[] {
  return appts.flatMap((appt) => {
    const inicio = new Date(appt.inicio);
    const fim    = new Date(appt.fim);

    const s = format(inicio, "HH:mm");
    const dur = differenceInMinutes(fim, inicio);

    return [{
      id:           appt.id,
      dateKey:      dateKey(inicio),
      startDate:    inicio,
      s,
      dur,
      type:         TYPE_MAP[appt.tipo],
      name:         appt.lead.nome,
      leadId:       appt.lead.id,
      profissional: appt.profissional?.nome ?? "—",
      status:       STATUS_MAP[appt.status],
      observations: appt.observacoes ?? undefined,
    }];
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PopBtn({ children, primary, danger }: { children: React.ReactNode; primary?: boolean; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ appearance: "none", border: `0.6px solid ${primary ? "var(--color-alaranjado)" : hov && danger ? "rgba(192,80,74,0.5)" : "var(--color-cinza)"}`, background: primary ? (hov ? "var(--color-tangerina)" : "var(--color-alaranjado)") : (hov && danger ? "rgba(192,80,74,0.06)" : hov ? "var(--color-bege-claro)" : "#fff"), color: primary ? "#fff" : (hov && danger ? "var(--color-ui-error)" : "var(--color-texto-escuro)"), borderRadius: "var(--radius-pill)", padding: "7px 12px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, letterSpacing: "0.2px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 160ms" }}>
      {children}
    </button>
  );
}

function EventPopover({ evt, pos, onClose }: { evt: CalEvent; pos: PopoverPos; onClose: () => void }) {
  const tk = TK[evt.type];
  const [h, m] = parseTime(evt.s);
  const startStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const profInitials = evt.profissional !== "—" ? evt.profissional.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "—";
  return (
    <div style={{ position: "fixed", left: pos.left, top: pos.top, width: 308, background: "#fff", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-lg)", boxShadow: "0 18px 50px rgba(58,53,48,0.14),0 4px 12px rgba(58,53,48,0.06)", zIndex: 50, overflow: "hidden", fontFamily: "var(--font-body)" }}>
      <button onClick={onClose} aria-label="Fechar" style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, border: 0, background: "transparent", color: "var(--color-texto-medio)", cursor: "pointer", borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <X size={13} strokeWidth={1.7} />
      </button>
      <div style={{ padding: "16px 18px 14px", borderBottom: "0.6px solid var(--color-cinza)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", padding: "3px 9px", borderRadius: "var(--radius-pill)", background: tk.bg, color: tk.fg, lineHeight: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "var(--radius-pill)", background: tk.color }} />
          {tk.label}
        </span>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, lineHeight: 1.15, color: "var(--color-texto-escuro)", margin: "10px 0 2px", letterSpacing: "-0.005em" }}>
          {evt.name}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-texto-medio)", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <CalendarDays size={12} strokeWidth={1.7} style={{ color: "var(--color-bege)" }} />
          {startStr} — {endTime(evt.s, evt.dur)}
          <span style={{ width: 2, height: 2, borderRadius: "var(--radius-pill)", background: "var(--color-cinza)" }} />
          {evt.dur} min
        </div>
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, letterSpacing: "0.2px", color: "var(--color-texto-medio)", padding: "4px 10px", background: "var(--bg-2)", borderRadius: "var(--radius-pill)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "var(--radius-pill)", background: evt.status === "confirmed" ? "var(--color-verde)" : evt.status === "no-show" ? "var(--color-ui-error)" : "var(--color-bege)" }} />
          {evt.status === "confirmed" ? "Confirmada" : evt.status === "no-show" ? "Faltou" : evt.status === "cancelled" ? "Cancelada" : "A confirmar"}
        </div>
      </div>
      <div style={{ padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 78, flexShrink: 0, fontSize: 10, fontWeight: 500, letterSpacing: "1.6px", textTransform: "uppercase", color: "var(--color-texto-medio)", paddingTop: 3 }}>Lead</span>
          <span style={{ fontSize: 13, color: "var(--color-texto-escuro)", lineHeight: 1.4, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {evt.name}
            <Link href={`/leads/${evt.leadId}`} style={{ color: "var(--color-alaranjado)", textDecoration: "none", fontWeight: 500, fontSize: 12 }}>abrir ficha →</Link>
          </span>
        </div>
        {evt.profissional !== "—" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ width: 78, flexShrink: 0, fontSize: 10, fontWeight: 500, letterSpacing: "1.6px", textTransform: "uppercase", color: "var(--color-texto-medio)", paddingTop: 3 }}>Profissional</span>
            <span style={{ fontSize: 13, color: "var(--color-texto-escuro)", lineHeight: 1.4, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "var(--radius-pill)", background: "rgba(240,131,83,0.18)", color: "#B85A2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 9, flexShrink: 0 }}>{profInitials}</span>
              {evt.profissional}
            </span>
          </div>
        )}
        {evt.observations && (
          <div style={{ background: "var(--bg-2)", borderLeft: "2px solid var(--color-bege)", borderRadius: "0 var(--radius-md) var(--radius-md) 0", padding: "10px 12px", fontSize: 12, color: "var(--color-texto-escuro)", lineHeight: 1.5 }}>
            {evt.observations}
          </div>
        )}
      </div>
      <div style={{ padding: "14px 18px 16px", borderTop: "0.6px solid var(--color-cinza)", background: "var(--bg-1)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <PopBtn primary><Check size={12} strokeWidth={1.8} />Confirmar</PopBtn>
        <PopBtn><RotateCcw size={12} strokeWidth={1.8} />Remarcar</PopBtn>
        <PopBtn danger><X size={12} strokeWidth={1.8} />Cancelar</PopBtn>
      </div>
    </div>
  );
}

function WnBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} style={{ width: 28, height: 28, border: "0.6px solid var(--color-cinza)", background: "#fff", borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-texto-medio)", flexShrink: 0, transition: "all 160ms" }}>
      {children}
    </button>
  );
}

function PrimaryBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--color-alaranjado)", color: "#fff", border: 0, borderRadius: "var(--radius-pill)", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface AgendaClientProps {
  initialEvents: AppointmentRow[];
  nowIso: string;
  nowH: number;
  nowM: number;
  clinicHours: ClinicHoursRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}

export default function AgendaClient({ initialEvents, nowIso, nowH, nowM, clinicHours, initialRangeStart, initialRangeEnd }: AgendaClientProps) {
  const todayDate = new Date(nowIso);
  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");
  const [periodAnchor, setPeriodAnchor] = useState<Date>(() => todayDate);
  const [appointments, setAppointments] = useState<AppointmentRow[]>(initialEvents);
  const [loadedRangeKey, setLoadedRangeKey] = useState(`${initialRangeStart}|${initialRangeEnd}`);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const { start: periodStart, end: periodEnd } = getPeriodBounds(viewMode, periodAnchor);
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();
  const periodRangeKey = `${periodStartIso}|${periodEndIso}`;
  const periodLabel = formatPeriodLabel(viewMode, periodStart, periodEnd);
  const isMonthView = viewMode === "month";

  const clinicSchedule = buildClinicSchedule(clinicHours);
  const visibleScheduleDays = viewMode === "day"
    ? [clinicSchedule[clinicDayIndexForDate(periodAnchor)]].filter(Boolean)
    : clinicSchedule.filter((day) => !day.off && day.intervals.length > 0);
  const timelineDays = visibleScheduleDays.map((scheduleDay) => {
    const date = viewMode === "day" ? periodStart : addDays(periodStart, scheduleDay.index);

    return {
      date,
      key: dateKey(date),
      scheduleDay,
    };
  });
  const visibleDayCount = Math.max(timelineDays.length, 1);
  const dayGridColumns = `${HOUR_COL_W}px repeat(${visibleDayCount}, minmax(0, 1fr))`;

  const allOpenIntervals = visibleScheduleDays.flatMap((day) => day.intervals);
  const timelineStartMinutes = allOpenIntervals.length > 0
    ? Math.floor(Math.min(...allOpenIntervals.map((interval) => interval.startMinutes)) / 60) * 60
    : 6 * 60;
  const timelineEndMinutes = allOpenIntervals.length > 0
    ? Math.ceil(Math.max(...allOpenIntervals.map((interval) => interval.endMinutes)) / 60) * 60
    : 21 * 60;

  const WEEK_DAYS = timelineDays.map(({ date, key, scheduleDay }) => {
    return {
      key,
      dow:  format(date, "EEE", { locale: ptBR }),
      date: format(date, "d"),
      mon:  format(date, "MMM", { locale: ptBR }),
      isToday: isSameDay(date, todayDate),
      scheduleDay,
    };
  });

  const timelineDayKeys = timelineDays.map((day) => day.key);
  const EVENTS = mapAppointments(appointments).filter((evt) => timelineDayKeys.includes(evt.dateKey));
  const periodEvents = mapAppointments(appointments)
    .filter((evt) => evt.startDate >= periodStart && evt.startDate <= periodEnd);
  const nowMinutes = nowH * 60 + nowM;
  const nowTop = topForMinutes(nowMinutes, timelineStartMinutes);
  const todayColumnIndex = timelineDayKeys.indexOf(dateKey(todayDate));
  const showNowIndicator = !isMonthView && todayColumnIndex >= 0 && nowMinutes >= timelineStartMinutes && nowMinutes <= timelineEndMinutes;

  const selectedEvt = selectedId !== null ? (periodEvents.find((e) => e.id === selectedId) ?? null) : null;

  useEffect(() => {
    let active = true;

    if (periodRangeKey === loadedRangeKey) return;

    setLoadingAppointments(true);
    getAgendaAppointments(periodStartIso, periodEndIso)
      .then((res) => {
        if (!active) return;

        if (res.success) {
          setAppointments(res.appointments);
          setLoadedRangeKey(periodRangeKey);
        }
      })
      .finally(() => {
        if (active) setLoadingAppointments(false);
      });

    return () => {
      active = false;
    };
  }, [loadedRangeKey, periodEndIso, periodRangeKey, periodStartIso]);

  useEffect(() => {
    setSelectedId(null);
    setPopoverPos(null);
  }, [periodRangeKey, viewMode]);

  useEffect(() => {
    if (!isMonthView && gridScrollRef.current) {
      gridScrollRef.current.scrollTop = Math.max(0, nowTop - 220);
    }
  }, [isMonthView, nowTop]);

  const handleEvtClick = useCallback((e: React.MouseEvent<HTMLElement>, evt: CalEvent) => {
    e.stopPropagation();
    if (selectedId === evt.id) { setSelectedId(null); setPopoverPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pw = 308; const margin = 14;
    const spaceRight = window.innerWidth - rect.right - margin;
    const left = spaceRight >= pw ? rect.right + margin : Math.max(4, rect.left - margin - pw);
    const top  = Math.min(Math.max(4, rect.top - 12), window.innerHeight - 480);
    setSelectedId(evt.id);
    setPopoverPos({ left, top });
  }, [selectedId]);

  const closePopover = useCallback(() => { setSelectedId(null); setPopoverPos(null); }, []);

  function movePeriod(delta: number) {
    setPeriodAnchor((current) => {
      if (viewMode === "day") return addDays(current, delta);
      if (viewMode === "month") return addMonths(current, delta);
      return addWeeks(current, delta);
    });
  }

  function selectViewMode(nextViewMode: AgendaViewMode) {
    setViewMode(nextViewMode);
    if (nextViewMode === "day") {
      setPeriodAnchor(todayDate);
    }
  }

  const timelineStartHour = timelineStartMinutes / 60;
  const timelineEndHour = timelineEndMinutes / 60;
  const hours = Array.from({ length: timelineEndHour - timelineStartHour }, (_, i) => timelineStartHour + i);
  const totalH = ((timelineEndMinutes - timelineStartMinutes) / 60) * HOUR_PX;

  const referenceNow = todayDate;
  const statEvents = periodEvents;
  const upcomingEvents = periodEvents
    .filter((evt) => periodEnd < referenceNow ? true : evt.startDate >= referenceNow)
    .slice(0, 4);
  const statsTitle = viewMode === "day"
    ? (isSameDay(periodAnchor, todayDate) ? "Hoje" : format(periodAnchor, "d MMM", { locale: ptBR }))
    : viewMode === "month"
      ? "Mês"
      : "Semana";
  const monthStart = startOfWeek(startOfMonth(periodAnchor), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(periodAnchor), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter((day) => visibleScheduleDays.some((scheduleDay) => scheduleDay.index === clinicDayIndexForDate(day)));
  const monthGridColumns = `repeat(${visibleDayCount}, minmax(0, 1fr))`;

  return (
    <div style={{ display: "grid", gridTemplateRows: "64px 1fr", height: "100dvh", overflow: "hidden" }} onClick={popoverPos ? closePopover : undefined}>
      {/* ── Topbar ── */}
      <header style={{ background: "var(--bg-1)", borderBottom: "0.6px solid var(--color-cinza)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, lineHeight: 1, color: "var(--color-texto-escuro)", letterSpacing: "-0.005em", margin: 0 }}>Agenda</h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <WnBtn label="Período anterior" onClick={() => movePeriod(-1)}><ChevronLeft size={14} strokeWidth={1.7} /></WnBtn>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--color-texto-escuro)", padding: "0 10px", minWidth: 200, textAlign: "center", textTransform: viewMode === "month" ? "capitalize" : "none" }}>
              {periodLabel}
            </span>
            <WnBtn label="Próximo período" onClick={() => movePeriod(1)}><ChevronRight size={14} strokeWidth={1.7} /></WnBtn>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 8, padding: 3, border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-pill)", background: "#fff" }}>
              {VIEW_OPTIONS.map((option) => {
                const active = viewMode === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectViewMode(option.id)}
                    style={{
                      height: 26,
                      border: 0,
                      borderRadius: "var(--radius-pill)",
                      background: active ? "var(--color-bege-claro)" : "transparent",
                      color: active ? "var(--color-texto-escuro)" : "var(--color-texto-medio)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      fontWeight: active ? 500 : 400,
                      padding: "0 11px",
                      transition: "all var(--duration-fast) var(--ease-soft)",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {loadingAppointments ? (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-texto-medio)", marginLeft: 8 }}>Carregando...</span>
            ) : null}
          </div>
        </div>
        <PrimaryBtn><Plus size={14} strokeWidth={1.8} />Novo horário</PrimaryBtn>
      </header>

      {/* ── Agenda wrap ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 304px", minHeight: 0, overflow: "hidden" }}>
        {/* ── Calendar ── */}
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", minWidth: 0, borderRight: "0.6px solid var(--color-cinza)", background: "var(--bg-1)", overflow: "hidden" }}>
          {isMonthView ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: monthGridColumns, borderBottom: "0.6px solid var(--color-cinza)", background: "var(--bg-1)" }}>
                {visibleScheduleDays.map((day) => (
                  <div key={day.day} style={{ padding: "12px 10px", borderLeft: "0.6px solid var(--color-cinza)", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, letterSpacing: "1.6px", textTransform: "uppercase", color: "var(--color-texto-medio)" }}>
                    {day.day.slice(0, 3)}
                  </div>
                ))}
              </div>

              <div className="crm-scrollbar" style={{ overflowY: "auto", minHeight: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: monthGridColumns, minHeight: "100%" }}>
                  {monthDays.map((day) => {
                    const key = dateKey(day);
                    const dayEvents = periodEvents.filter((evt) => evt.dateKey === key);
                    const muted = !isSameMonth(day, periodAnchor);
                    const closed = clinicSchedule[clinicDayIndexForDate(day)]?.off ?? false;
                    const today = isSameDay(day, todayDate);

                    return (
                      <div
                        key={key}
                        style={{
                          minHeight: 112,
                          padding: "10px 10px 9px",
                          borderLeft: "0.6px solid var(--color-cinza)",
                          borderBottom: "0.6px solid var(--color-cinza)",
                          background: closed ? "rgba(250,248,244,0.72)" : "var(--bg-1)",
                          opacity: muted ? 0.42 : 1,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                          <span style={{ width: 26, height: 26, borderRadius: "var(--radius-pill)", background: today ? "var(--color-alaranjado)" : "transparent", color: today ? "#fff" : "var(--color-texto-escuro)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1 }}>
                            {format(day, "d")}
                          </span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--color-texto-medio)", whiteSpace: "nowrap" }}>
                            {dayEvents.length ? `${dayEvents.length} aval.` : closed ? "Fechado" : ""}
                          </span>
                        </div>

                        <div style={{ display: "grid", gap: 5 }}>
                          {dayEvents.slice(0, 3).map((evt) => {
                            const tk = TK[evt.type];

                            return (
                              <button
                                key={evt.id}
                                type="button"
                                onClick={(e) => handleEvtClick(e, evt)}
                                style={{
                                  minWidth: 0,
                                  border: 0,
                                  borderLeft: `3px solid ${tk.color}`,
                                  borderRadius: "var(--radius-sm)",
                                  background: tk.bg,
                                  color: tk.fg,
                                  cursor: "pointer",
                                  fontFamily: "var(--font-body)",
                                  fontSize: 10.5,
                                  fontWeight: 500,
                                  lineHeight: 1.25,
                                  padding: "5px 7px",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {evt.s} · {evt.name}
                              </button>
                            );
                          })}
                          {dayEvents.length > 3 ? (
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--color-texto-medio)" }}>
                              +{dayEvents.length - 3} avaliações
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Days header */}
              <div style={{ display: "grid", gridTemplateColumns: dayGridColumns, borderBottom: "0.6px solid var(--color-cinza)", background: "var(--bg-1)", position: "relative", zIndex: 2 }}>
                <div />
                {WEEK_DAYS.map((d) => {
                  const dayCount = EVENTS.filter((e) => e.dateKey === d.key).length;
                  return (
                    <div key={d.key} style={{ padding: "10px 8px 10px", textAlign: "center", borderLeft: "0.6px solid var(--color-cinza)", minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: d.isToday ? "var(--color-alaranjado)" : "var(--color-texto-medio)" }}>
                        {d.dow}
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, lineHeight: 1.15, color: d.isToday ? "var(--color-alaranjado)" : "var(--color-texto-escuro)", margin: "2px 0 4px" }}>
                        {d.date}
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, color: "var(--color-texto-medio)" }}>
                        <span style={{ fontWeight: 600, color: d.isToday ? "var(--color-alaranjado)" : "var(--color-texto-escuro)" }}>{dayCount}</span> aval.
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid scroll */}
              <div ref={gridScrollRef} className="crm-scrollbar" style={{ overflowY: "auto", position: "relative" }}>
                <div style={{ display: "grid", gridTemplateColumns: dayGridColumns, height: totalH, position: "relative" }}>
                  {/* Hour labels + lines */}
                  {hours.map((h) => (
                    <div key={h} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: dayGridColumns, position: "absolute", top: topFor(h, 0, timelineStartMinutes), left: 0, right: 0, height: HOUR_PX, pointerEvents: "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 10, paddingTop: 3, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-texto-medio)", fontVariantNumeric: "tabular-nums" }}>
                        {`${String(h).padStart(2, "0")}h`}
                      </div>
                      {Array.from({ length: visibleDayCount }, (_, col) => (
                        <div key={col} style={{ borderLeft: "0.6px solid var(--color-cinza)", borderTop: "0.6px solid rgba(211,210,205,0.5)" }} />
                      ))}
                    </div>
                  ))}

                  {/* Closed periods */}
                  {visibleScheduleDays.flatMap((day, col) => (
                    getClosedSegments(day, timelineStartMinutes, timelineEndMinutes).map((segment) => {
                      const top = topForMinutes(segment.startMinutes, timelineStartMinutes);
                      const height = ((segment.endMinutes - segment.startMinutes) / 60) * HOUR_PX;
                      const showLabel = segment.endMinutes - segment.startMinutes >= 90;

                      return (
                        <div
                          key={`${day.index}-${segment.startMinutes}-${segment.endMinutes}`}
                          style={{
                            position: "absolute",
                            top,
                            height,
                            left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${col} / ${visibleDayCount})`,
                            width: `calc((100% - ${HOUR_COL_W}px) / ${visibleDayCount})`,
                            background: "repeating-linear-gradient(135deg, rgba(211, 210, 205, 0.18), rgba(211, 210, 205, 0.18) 8px, rgba(250, 248, 244, 0.64) 8px, rgba(250, 248, 244, 0.64) 16px)",
                            borderLeft: "0.6px solid var(--color-cinza)",
                            borderTop: "0.6px solid rgba(211,210,205,0.45)",
                            borderBottom: "0.6px solid rgba(211,210,205,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                            zIndex: 0,
                          }}
                        >
                          {showLabel ? (
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--color-texto-medio)", background: "rgba(255,255,255,0.72)", borderRadius: "var(--radius-pill)", padding: "3px 8px" }}>
                              Intervalo
                            </span>
                          ) : null}
                        </div>
                      );
                    })
                  ))}

                  {/* Today indicator */}
                  {showNowIndicator && (
                    <div
                      style={{
                        position: "absolute",
                        top: nowTop,
                        left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${todayColumnIndex} / ${visibleDayCount})`,
                        width: `calc((100% - ${HOUR_COL_W}px) / ${visibleDayCount})`,
                        height: 1.5,
                        background: "var(--color-alaranjado)",
                        opacity: 0.7,
                        pointerEvents: "none",
                        zIndex: 3,
                      }}
                    />
                  )}

                  {/* Events */}
                  {EVENTS.map((evt) => {
                    const [h, m] = parseTime(evt.s);
                    const columnIndex = timelineDayKeys.indexOf(evt.dateKey);
                    if (columnIndex < 0) return null;

                    const top   = topFor(h, m, timelineStartMinutes);
                    const height = Math.max(28, (evt.dur / 60) * HOUR_PX - 4);
                    const tk    = TK[evt.type];
                    const isSelected = evt.id === selectedId;
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => handleEvtClick(e, evt)}
                        style={{
                          position: "absolute",
                          top: top + 2,
                          height,
                          left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${columnIndex} / ${visibleDayCount} + 3px)`,
                          width: `calc((100% - ${HOUR_COL_W}px) / ${visibleDayCount} - 6px)`,
                          background: tk.bg,
                          borderLeft: `3px solid ${tk.color}`,
                          borderRadius: "var(--radius-md)",
                          padding: "5px 8px",
                          cursor: "pointer",
                          zIndex: isSelected ? 4 : 1,
                          boxShadow: isSelected ? `0 0 0 2px ${tk.color}` : "none",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500, color: tk.fg, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{evt.name}</div>
                        {height > 40 && (
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: tk.fg, opacity: 0.8, marginTop: 2 }}>
                            {evt.s} · {evt.dur}min
                            {evt.status === "no-show" && " · Faltou"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        <aside className="crm-scrollbar" style={{ minWidth: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg-1)", padding: "22px 22px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Stats */}
          <section>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 12px" }}>
              {statsTitle}
              <span style={{ color: "var(--color-texto-medio)", fontWeight: 400, letterSpacing: "0.3px", textTransform: "none", fontSize: 11, marginLeft: 8 }}>{statEvents.length} avaliações</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {[
                { label: "Confirmadas", value: statEvents.filter((e) => e.status === "confirmed").length, color: "var(--color-verde)" },
                { label: "A confirmar", value: statEvents.filter((e) => e.status === "pending").length,   color: "var(--color-tangerina)" },
                { label: "Faltaram",    value: statEvents.filter((e) => e.status === "no-show").length,   color: "var(--color-ui-error)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ minWidth: 0, background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 8px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, lineHeight: 1, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 8.5, fontWeight: 500, letterSpacing: "0.45px", textTransform: "uppercase", color: "var(--color-texto-medio)", marginTop: 6, whiteSpace: "nowrap", lineHeight: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming */}
          <section>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 12px" }}>Próximas</h3>
            {upcomingEvents.length === 0 ? (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-texto-medio)" }}>Nenhuma avaliação próxima.</p>
            ) : (
              upcomingEvents.map((evt) => {
                const tk = TK[evt.type];
                return (
                  <div key={evt.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "0.6px solid var(--color-cinza)" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "var(--radius-pill)", background: tk.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: tk.color }} />
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--color-texto-escuro)", lineHeight: 1.3 }}>{evt.name}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-texto-medio)", marginTop: 2 }}>
                        {viewMode === "day" ? evt.s : `${format(evt.startDate, "d MMM", { locale: ptBR })} · ${evt.s}`} · {tk.label}
                      </div>
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: evt.status === "confirmed" ? "var(--color-verde)" : "var(--color-bege)", flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </section>

          {/* Legend */}
          <section>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 12px" }}>Legenda</h3>
            {(Object.entries(TK) as [EventType, typeof TK[EventType]][]).map(([key, tk]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: tk.bg, border: `2px solid ${tk.color}`, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-texto-escuro)" }}>{tk.label}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {/* Popover */}
      {selectedEvt && popoverPos && (
        <EventPopover evt={selectedEvt} pos={popoverPos} onClose={closePopover} />
      )}
    </div>
  );
}
