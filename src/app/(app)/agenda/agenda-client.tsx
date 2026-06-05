"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, RotateCcw, X, CalendarDays } from "lucide-react";
import { addDays, format, differenceInMinutes, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentRow } from "@/lib/queries/appointments";
import type { AppointmentType, AppointmentStatus } from "@/types/database";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END   = 19;
const HOUR_PX    = 60;
const HOUR_COL_W = 56;

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType   = "pilates" | "gestante" | "pelvica";
type EventStatus = "confirmed" | "pending" | "no-show" | "cancelled";

interface CalEvent {
  id: string;
  day: number;       // 0=Mon … 5=Sat
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

function topFor(h: number, m: number): number {
  return ((h - HOUR_START) + m / 60) * HOUR_PX;
}

function parseTime(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [h, m];
}

function endTime(s: string, dur: number): string {
  const [h, m] = parseTime(s);
  const totalMin = h * 60 + m + dur;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

function mapAppointments(appts: AppointmentRow[], weekStart: Date): CalEvent[] {
  const mondayMs = startOfWeek(weekStart, { weekStartsOn: 1 }).getTime();

  return appts.flatMap((appt) => {
    const inicio = new Date(appt.inicio);
    const fim    = new Date(appt.fim);
    // compute weekday index (Mon=0 … Sat=5) relative to weekStart
    const weekDay = Math.round((inicio.getTime() - mondayMs) / 86400000);
    if (weekDay < 0 || weekDay > 5) return [];

    const s = format(inicio, "HH:mm");
    const dur = differenceInMinutes(fim, inicio);

    return [{
      id:           appt.id,
      day:          weekDay,
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
  weekStart: Date;
  todayIdx: number;
  nowH: number;
  nowM: number;
}

export default function AgendaClient({ initialEvents, weekStart: initialWeekStart, todayIdx, nowH, nowM }: AgendaClientProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Compute displayed week
  const weekStart = addDays(initialWeekStart, weekOffset * 7);
  const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d", { locale: ptBR })}–${format(weekEnd, "d MMM · yyyy", { locale: ptBR })}`;

  const WEEK_DAYS = Array.from({ length: 6 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      dow:  format(d, "EEE", { locale: ptBR }),
      date: format(d, "d"),
      mon:  format(d, "MMM", { locale: ptBR }),
    };
  });

  const EVENTS = mapAppointments(initialEvents, weekStart);
  const nowTop = topFor(nowH, nowM);

  const selectedEvt = selectedId !== null ? (EVENTS.find((e) => e.id === selectedId) ?? null) : null;

  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = Math.max(0, nowTop - 220);
    }
  }, [nowTop]);

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

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalH = (HOUR_END - HOUR_START) * HOUR_PX;

  const todayEvents = EVENTS.filter((e) => e.day === todayIdx && weekOffset === 0);
  const upcomingEvents = EVENTS.filter((e) => {
    if (weekOffset !== 0) return true;
    const [h, m] = parseTime(e.s);
    return e.day > todayIdx || (e.day === todayIdx && h * 60 + m > nowH * 60 + nowM);
  }).slice(0, 4);

  return (
    <div style={{ display: "grid", gridTemplateRows: "64px 1fr", height: "100dvh", overflow: "hidden" }} onClick={popoverPos ? closePopover : undefined}>
      {/* ── Topbar ── */}
      <header style={{ background: "var(--bg-1)", borderBottom: "0.6px solid var(--color-cinza)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, lineHeight: 1, color: "var(--color-texto-escuro)", letterSpacing: "-0.005em", margin: 0 }}>Agenda</h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <WnBtn label="Semana anterior" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft size={14} strokeWidth={1.7} /></WnBtn>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--color-texto-escuro)", padding: "0 10px", minWidth: 200, textAlign: "center" }}>{weekLabel}</span>
            <WnBtn label="Próxima semana" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight size={14} strokeWidth={1.7} /></WnBtn>
            <button onClick={() => setWeekOffset(0)} style={{ height: 28, padding: "0 12px", border: "0.6px solid var(--color-cinza)", background: weekOffset === 0 ? "var(--color-bege-claro)" : "#fff", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--color-texto-escuro)", cursor: "pointer" }}>Hoje</button>
          </div>
        </div>
        <PrimaryBtn><Plus size={14} strokeWidth={1.8} />Novo horário</PrimaryBtn>
      </header>

      {/* ── Agenda wrap ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 304px", minHeight: 0, overflow: "hidden" }}>
        {/* ── Calendar ── */}
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", minWidth: 0, borderRight: "0.6px solid var(--color-cinza)", background: "var(--bg-1)", overflow: "hidden" }}>
          {/* Days header */}
          <div style={{ display: "grid", gridTemplateColumns: `${HOUR_COL_W}px repeat(6, 1fr)`, borderBottom: "0.6px solid var(--color-cinza)", background: "var(--bg-1)", position: "relative", zIndex: 2 }}>
            <div />
            {WEEK_DAYS.map((d, i) => {
              const isToday = i === todayIdx && weekOffset === 0;
              const dayCount = EVENTS.filter((e) => e.day === i).length;
              return (
                <div key={i} style={{ padding: "10px 0 10px", textAlign: "center", borderLeft: "0.6px solid var(--color-cinza)" }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, letterSpacing: "1.4px", textTransform: "uppercase", color: isToday ? "var(--color-alaranjado)" : "var(--color-texto-medio)" }}>
                    {d.dow}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, lineHeight: 1.15, color: isToday ? "var(--color-alaranjado)" : "var(--color-texto-escuro)", margin: "2px 0 4px" }}>
                    {d.date}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, color: "var(--color-texto-medio)" }}>
                    <span style={{ fontWeight: 600, color: isToday ? "var(--color-alaranjado)" : "var(--color-texto-escuro)" }}>{dayCount}</span> aval.
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid scroll */}
          <div ref={gridScrollRef} className="crm-scrollbar" style={{ overflowY: "auto", position: "relative" }}>
            <div style={{ display: "grid", gridTemplateColumns: `${HOUR_COL_W}px repeat(6, 1fr)`, height: totalH, position: "relative" }}>
              {/* Hour labels + lines */}
              {hours.map((h) => (
                <div key={h} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: `${HOUR_COL_W}px repeat(6, 1fr)`, position: "absolute", top: (h - HOUR_START) * HOUR_PX, left: 0, right: 0, height: HOUR_PX, pointerEvents: "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 10, paddingTop: 3, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-texto-medio)", fontVariantNumeric: "tabular-nums" }}>
                    {`${String(h).padStart(2, "0")}h`}
                  </div>
                  {Array.from({ length: 6 }, (_, col) => (
                    <div key={col} style={{ borderLeft: "0.6px solid var(--color-cinza)", borderTop: "0.6px solid rgba(211,210,205,0.5)" }} />
                  ))}
                </div>
              ))}

              {/* Today indicator */}
              {todayIdx >= 0 && todayIdx <= 5 && weekOffset === 0 && (
                <div style={{ position: "absolute", top: nowTop, left: HOUR_COL_W + (todayIdx / 6) * (100 - HOUR_COL_W / 10) + "%", right: 0, height: 1.5, background: "var(--color-alaranjado)", opacity: 0.7, pointerEvents: "none", zIndex: 3 }} />
              )}

              {/* Events */}
              {EVENTS.map((evt) => {
                const [h, m] = parseTime(evt.s);
                const top   = topFor(h, m);
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
                      left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${evt.day} / 6 + 3px)`,
                      width: `calc((100% - ${HOUR_COL_W}px) / 6 - 6px)`,
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
        </div>

        {/* ── Right panel ── */}
        <aside className="crm-scrollbar" style={{ overflowY: "auto", background: "var(--bg-1)", padding: "22px 22px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Stats */}
          <section>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--color-bege)", margin: "0 0 12px" }}>
              {weekOffset === 0 ? "Hoje" : format(addDays(weekStart, todayIdx), "d 'de' MMM", { locale: ptBR })}
              <span style={{ color: "var(--color-texto-medio)", fontWeight: 400, letterSpacing: "0.3px", textTransform: "none", fontSize: 11, marginLeft: 8 }}>{todayEvents.length} avaliações</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Confirmadas", value: todayEvents.filter((e) => e.status === "confirmed").length, color: "var(--color-verde)" },
                { label: "A confirmar", value: todayEvents.filter((e) => e.status === "pending").length,   color: "var(--color-tangerina)" },
                { label: "Faltaram",    value: todayEvents.filter((e) => e.status === "no-show").length,   color: "var(--color-ui-error)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--bg-card)", border: "0.6px solid var(--color-cinza)", borderRadius: "var(--radius-md)", padding: "10px 10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, lineHeight: 1, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9.5, fontWeight: 500, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--color-texto-medio)", marginTop: 4 }}>{label}</div>
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
                        {evt.s} · {tk.label}
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
