"use client";

import { useState, useRef, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { Ban, Check, ChevronLeft, ChevronRight, Plus, UserCheck, UserX } from "lucide-react";
import {
  addDays, addWeeks, endOfWeek, format, isSameDay,
  startOfDay, endOfDay, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  ServicoBadge,
  colorVarForToken,
} from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { buildClinicSchedule, type ClinicHoursRow } from "@/lib/clinic-config";
import type { CorToken } from "@/lib/cadastros-labels";
import type { AgendaEvent, AgendaOptions } from "@/lib/queries/agenda";
import type { AppointmentStatus, AppointmentType, Pilar } from "@/types/database";
import {
  criarAgendamento, getAgendaCompletaData, updateAppointmentStatus,
} from "./actions";

const HOUR_PX = 56;
const HOUR_COL_W = 52;
type ViewMode = "day" | "week";

const FALLBACK_COR: Record<AppointmentType, CorToken> = {
  avaliacao_pilates: "alaranjado",
  avaliacao_fisio_pelvica: "verde",
  avaliacao_acupuntura: "bege",
};

function colorVar(e: AgendaEvent): string {
  return colorVarForToken(e.corToken, FALLBACK_COR[e.tipo] ?? "alaranjado");
}
function bgFor(varStr: string): string {
  return `color-mix(in srgb, ${varStr} 16%, transparent)`;
}
function dateKey(d: Date) { return format(d, "yyyy-MM-dd"); }
function clinicDayIndex(d: Date) { const j = d.getDay(); return j === 0 ? 6 : j - 1; }

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: "A confirmar", confirmado: "Confirmado", compareceu: "Compareceu",
  faltou: "Faltou", cancelado: "Cancelado",
};
const STATUS_DOT: Record<AppointmentStatus, string> = {
  agendado: "var(--color-bege)", confirmado: "var(--color-verde)", compareceu: "var(--color-verde)",
  faltou: "var(--color-ui-error)", cancelado: "var(--color-cinza)",
};

type EventLayout = {
  laneIndex: number;
  laneCount: number;
};

type CalendarEventGroup = {
  id: string;
  dayKey: string;
  start: number;
  end: number;
  primary: AgendaEvent;
  events: AgendaEvent[];
};

function eventStartMinutes(e: AgendaEvent): number {
  const start = new Date(e.inicio);
  return start.getHours() * 60 + start.getMinutes();
}

function eventEndMinutes(e: AgendaEvent): number {
  const end = new Date(e.fim);
  const startMinutes = eventStartMinutes(e);
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return Math.max(startMinutes + 1, endMinutes);
}

function visualSlotKey(e: AgendaEvent): string {
  const start = new Date(e.inicio);
  return `${dateKey(start)}|${eventStartMinutes(e)}`;
}

function capacitySlotKey(e: AgendaEvent): string {
  return `${visualSlotKey(e)}|${e.servicoId ?? ""}|${e.salaId ?? ""}`;
}

function buildEventGroups(events: AgendaEvent[]): CalendarEventGroup[] {
  const groups = new Map<string, AgendaEvent[]>();

  for (const event of events) {
    const key = capacitySlotKey(event);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([id, group]) => {
    const eventsInSlot = [...group].sort((a, b) =>
      a.inicio.localeCompare(b.inicio) ||
      a.clienteNome.localeCompare(b.clienteNome) ||
      a.id.localeCompare(b.id),
    );
    const primary = eventsInSlot[0];
    return {
      id,
      dayKey: dateKey(new Date(primary.inicio)),
      start: eventStartMinutes(primary),
      end: Math.max(...eventsInSlot.map(eventEndMinutes)),
      primary,
      events: eventsInSlot,
    };
  }).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey) ||
    a.start - b.start ||
    (a.primary.servicoNome ?? "").localeCompare(b.primary.servicoNome ?? "") ||
    a.id.localeCompare(b.id),
  );
}

function buildEventLayout(groups: CalendarEventGroup[]): Map<string, EventLayout> {
  const byDay = new Map<string, CalendarEventGroup[]>();

  for (const group of groups) {
    const items = byDay.get(group.dayKey) ?? [];
    items.push(group);
    byDay.set(group.dayKey, items);
  }

  const layout = new Map<string, EventLayout>();

  for (const items of byDay.values()) {
    items.sort((a, b) =>
      a.start - b.start ||
      b.end - a.end ||
      a.primary.clienteNome.localeCompare(b.primary.clienteNome) ||
      a.id.localeCompare(b.id),
    );

    let cluster: typeof items = [];
    let clusterEnd = -1;

    function flushCluster() {
      if (cluster.length === 0) return;

      const laneEnds: number[] = [];
      const laneByEvent = new Map<string, number>();

      for (const item of cluster) {
        const openLane = laneEnds.findIndex((end) => end <= item.start);
        const laneIndex = openLane >= 0 ? openLane : laneEnds.length;
        laneEnds[laneIndex] = item.end;
        laneByEvent.set(item.id, laneIndex);
      }

      const laneCount = Math.max(1, laneEnds.length);
      for (const item of cluster) {
        layout.set(item.id, {
          laneIndex: laneByEvent.get(item.id) ?? 0,
          laneCount,
        });
      }

      cluster = [];
      clusterEnd = -1;
    }

    for (const item of items) {
      if (cluster.length > 0 && item.start >= clusterEnd) flushCluster();
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    }

    flushCluster();
  }

  return layout;
}

interface Props {
  initialEvents: AgendaEvent[];
  options: AgendaOptions;
  nowIso: string;
  clinicHours: ClinicHoursRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}

export default function AgendaClient({ initialEvents, options, nowIso, clinicHours, initialRangeStart, initialRangeEnd }: Props) {
  const today = useMemo(() => new Date(nowIso), [nowIso]);
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(today);
  const [events, setEvents] = useState<AgendaEvent[]>(initialEvents);
  const [loadedKey, setLoadedKey] = useState(`${initialRangeStart}|${initialRangeEnd}`);
  const [loading, setLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  const [pending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [pilar, setPilar] = useState<"" | Pilar>("");
  const [salaId, setSalaId] = useState<"" | string>("");

  const periodStart = view === "day" ? startOfDay(anchor) : startOfWeek(anchor, { weekStartsOn: 1 });
  const periodEnd = view === "day" ? endOfDay(anchor) : endOfWeek(anchor, { weekStartsOn: 1 });
  const rangeKey = `${periodStart.toISOString()}|${periodEnd.toISOString()}`;

  useEffect(() => {
    if (rangeKey === loadedKey) return;
    let active = true;
    setLoading(true);
    getAgendaCompletaData(periodStart.toISOString(), periodEnd.toISOString())
      .then((r) => { if (active && r.success) { setEvents(r.events); setLoadedKey(rangeKey); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [rangeKey, loadedKey, periodStart, periodEnd]);

  function reload() {
    startTransition(async () => {
      const r = await getAgendaCompletaData(periodStart.toISOString(), periodEnd.toISOString());
      if (r.success) setEvents(r.events);
    });
  }

  const schedule = buildClinicSchedule(clinicHours);
  const visibleDays = view === "day"
    ? [schedule[clinicDayIndex(anchor)]].filter(Boolean)
    : schedule.filter((d) => !d.off && d.intervals.length > 0);

  const timelineDays = visibleDays.map((sd) => {
    const date = view === "day" ? periodStart : addDays(periodStart, sd.index);
    return { date, key: dateKey(date), sd };
  });
  const dayCount = Math.max(timelineDays.length, 1);

  const allIntervals = visibleDays.flatMap((d) => d.intervals);
  const tStart = allIntervals.length ? Math.floor(Math.min(...allIntervals.map((i) => i.startMinutes)) / 60) * 60 : 6 * 60;
  const tEnd = allIntervals.length ? Math.ceil(Math.max(...allIntervals.map((i) => i.endMinutes)) / 60) * 60 : 21 * 60;
  const totalH = ((tEnd - tStart) / 60) * HOUR_PX;
  const hours = Array.from({ length: (tEnd - tStart) / 60 }, (_, i) => tStart / 60 + i);

  // Filtro aplicado
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return events.filter((e) => {
      if (e.status === "cancelado") return false;
      if (pilar && e.pilar !== pilar) return false;
      if (salaId && e.salaId !== salaId) return false;
      if (q && !e.clienteNome.toLowerCase().includes(q) && !(e.servicoNome ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, busca, pilar, salaId]);

  const dayKeys = timelineDays.map((d) => d.key);
  const periodEvents = filtered.filter((e) => dayKeys.includes(dateKey(new Date(e.inicio))));
  const eventGroups = buildEventGroups(periodEvents);
  const eventLayout = buildEventLayout(eventGroups);

  useEffect(() => {
    if (gridRef.current) {
      const nowMin = today.getHours() * 60 + today.getMinutes();
      gridRef.current.scrollTop = Math.max(0, ((nowMin - tStart) / 60) * HOUR_PX - 200);
    }
  }, [tStart, today]);

  function move(delta: number) {
    setAnchor((c) => (view === "day" ? addDays(c, delta) : addWeeks(c, delta)));
  }

  const periodLabel = view === "day"
    ? format(periodStart, "d 'de' MMMM yyyy", { locale: ptBR })
    : `${format(periodStart, "d")}–${format(periodEnd, "d MMM yyyy", { locale: ptBR })}`;

  const proximas = [...periodEvents]
    .filter((e) => new Date(e.inicio) >= today)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 5);

  const hojeEvents = events.filter((e) => isSameDay(new Date(e.inicio), today) && e.status !== "cancelado");

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      {/* Topbar */}
      <header className="border-b border-border px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[28px] leading-none text-text-primary">Agenda</h1>
            <div className="flex items-center gap-1">
              <button onClick={() => move(-1)} aria-label="Anterior" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-border text-text-secondary hover:bg-accent-soft"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[180px] px-2 text-center text-sm font-medium text-text-primary">{periodLabel}</span>
              <button onClick={() => move(1)} aria-label="Próximo" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-border text-text-secondary hover:bg-accent-soft"><ChevronRight className="h-4 w-4" /></button>
              <div className="ml-2 flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
                {(["day", "week"] as ViewMode[]).map((v) => (
                  <button key={v} onClick={() => { setView(v); if (v === "day") setAnchor(today); }}
                    className={cn("rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium transition-colors",
                      view === v ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary")}>
                    {v === "day" ? "Hoje" : "Semana"}
                  </button>
                ))}
              </div>
              {loading ? <span className="ml-2 text-xs text-text-secondary">Carregando…</span> : null}
            </div>
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" strokeWidth={2} />Novo agendamento</Button>
        </div>

        {/* Filtros */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou serviço" className="h-9 max-w-xs" />
          <select value={pilar} onChange={(e) => setPilar(e.target.value as "" | Pilar)} className="h-9 rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-text-primary">
            <option value="">Todas as áreas</option>
            <option value="pilates">Pilates</option>
            <option value="fisio_pelvica">Fisio pélvica</option>
            <option value="acupuntura">Acupuntura</option>
          </select>
          <select value={salaId} onChange={(e) => setSalaId(e.target.value)} className="h-9 rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-text-primary">
            <option value="">Todas as salas</option>
            {options.salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_300px] overflow-hidden">
        {/* Calendário */}
        <div className="grid grid-rows-[auto_1fr] overflow-hidden border-r border-border">
          {/* Header dos dias */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `${HOUR_COL_W}px repeat(${dayCount}, minmax(0,1fr))` }}>
            <div />
            {timelineDays.map(({ date, key }) => {
              const isToday = isSameDay(date, today);
              const count = eventGroups.filter((g) => g.dayKey === key).length;
              return (
                <div key={key} className="border-l border-border px-2 py-2 text-center">
                  <div className={cn("crm-label text-[10px] tracking-[1.2px]", isToday ? "text-primary" : "text-text-secondary")}>
                    {format(date, "EEE", { locale: ptBR })}
                  </div>
                  <div className={cn("font-display text-xl leading-tight", isToday ? "text-primary" : "text-text-primary")}>
                    {format(date, "d")}
                  </div>
                  <div className="text-[10px] text-text-secondary">{count} {count === 1 ? "bloco" : "blocos"}</div>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div ref={gridRef} className="relative overflow-y-auto crm-scrollbar">
            <div className="relative" style={{ height: totalH, display: "grid", gridTemplateColumns: `${HOUR_COL_W}px repeat(${dayCount}, minmax(0,1fr))` }}>
              {/* Linhas de hora */}
              {hours.map((h) => (
                <div key={h} className="pointer-events-none absolute left-0 right-0 grid" style={{ top: ((h * 60 - tStart) / 60) * HOUR_PX, height: HOUR_PX, gridTemplateColumns: `${HOUR_COL_W}px repeat(${dayCount}, minmax(0,1fr))` }}>
                  <div className="pr-2 pt-0.5 text-right text-[11px] tabular-nums text-text-secondary">{String(h).padStart(2, "0")}h</div>
                  {Array.from({ length: dayCount }, (_, c) => <div key={c} className="border-l border-t border-border/60" />)}
                </div>
              ))}

              {/* Eventos */}
              {eventGroups.map((group) => {
                const e = group.primary;
                const start = new Date(e.inicio);
                const col = dayKeys.indexOf(group.dayKey);
                if (col < 0) return null;
                const mins = group.start;
                const dur = Math.max(20, group.end - group.start);
                const top = ((mins - tStart) / 60) * HOUR_PX;
                const height = Math.max(26, (dur / 60) * HOUR_PX - 3);
                const c = colorVar(e);
                const layout = eventLayout.get(group.id) ?? { laneIndex: 0, laneCount: 1 };
                const laneGap = 4;
                const columnWidth = `(100% - ${HOUR_COL_W}px) / ${dayCount}`;
                const columnGutter = 5;
                const laneGapTotal = laneGap * (layout.laneCount - 1);
                const laneWidth = `(${columnWidth} - ${columnGutter}px - ${laneGapTotal}px) / ${layout.laneCount}`;
                const laneOffset = `(${laneWidth}) * ${layout.laneIndex} + ${laneGap * layout.laneIndex}px`;
                const maxNames = height > 58 ? 2 : 1;
                const visibleNames = group.events.slice(0, maxNames).map((item) => item.clienteNome).join(", ");
                const hiddenNames = Math.max(0, group.events.length - maxNames);
                const namesLabel = `${visibleNames}${hiddenNames > 0 ? ` +${hiddenNames}` : ""}`;
                const serviceLabel = e.servicoNome ?? "Agendamento";
                return (
                  <button key={group.id} onClick={() => setSelected(e)}
                    className="absolute overflow-hidden rounded-[var(--radius-md)] border px-2 py-1 text-left transition-shadow hover:shadow-[0_4px_14px_rgba(58,53,48,0.08)]"
                    aria-label={`${serviceLabel}: ${group.events.map((item) => item.clienteNome).join(", ")}`}
                    title={`${serviceLabel}: ${group.events.map((item) => item.clienteNome).join(", ")}`}
                    style={{
                      top: top + 1, height,
                      left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${col} / ${dayCount} + 2px + ${laneOffset})`,
                      width: `calc(${laneWidth})`,
                      background: bgFor(c),
                      borderColor: `color-mix(in srgb, ${c} 28%, transparent)`,
                      borderLeft: `3px solid ${c}`,
                    }}>
                    <div className="truncate text-[11px] font-medium text-text-primary">{format(start, "HH:mm")}</div>
                    <div className="truncate text-[11px] font-medium text-text-primary">{namesLabel}</div>
                    {height > 42 ? <div className="truncate text-[10px] text-text-secondary">{serviceLabel}</div> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel direito */}
        <aside className="overflow-y-auto crm-scrollbar bg-background px-5 py-6">
          <Section title="Hoje">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Atendimentos" value={hojeEvents.length} />
              <MiniStat label="Confirmados" value={hojeEvents.filter((e) => e.status === "confirmado" || e.status === "compareceu").length} />
            </div>
          </Section>

          <Section title="Próximas">
            {proximas.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum agendamento próximo.</p>
            ) : proximas.map((e) => (
              <button key={e.id} onClick={() => setSelected(e)} className="flex w-full items-center gap-3 border-b border-border py-2.5 text-left last:border-0">
                <span className="h-2 w-2 shrink-0 rounded-[var(--radius-pill)]" style={{ background: colorVar(e) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{e.clienteNome}</span>
                  <span className="block text-[11px] text-text-secondary">
                    {format(new Date(e.inicio), view === "day" ? "HH:mm" : "EEE HH:mm", { locale: ptBR })}{e.servicoNome ? ` · ${e.servicoNome}` : ""}
                  </span>
                </span>
                <span className="h-2 w-2 shrink-0 rounded-[var(--radius-pill)]" style={{ background: STATUS_DOT[e.status] }} />
              </button>
            ))}
          </Section>

          <Section title="Capacidade · serviços">
            {options.servicos.length === 0 ? (
              <p className="text-xs text-text-secondary">Cadastre serviços para definir capacidade.</p>
            ) : options.servicos.map((s) => (
              <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-2 py-1.5">
                <ServicoBadge nome={s.nome} corToken={s.cor_token} pilar={s.pilar} className="w-full min-w-0" />
                <span className="text-right text-[11px] tabular-nums text-text-secondary">{s.capacidade_slot}/slot</span>
              </div>
            ))}
          </Section>
        </aside>
      </div>

      {selected ? <EventPopover e={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); reload(); }} pending={pending} /> : null}
      {newOpen ? <NovoAgendamentoModal options={options} onClose={() => setNewOpen(false)} onScheduled={() => { setNewOpen(false); reload(); }} /> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="crm-label mb-3 text-[10px] tracking-[1.8px] text-accent">{title}</h3>
      {children}
    </section>
  );
}
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-border bg-card px-2.5 py-3 text-center">
      <div className="font-display text-2xl leading-none text-text-primary">{value}</div>
      <div className="mt-1.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">{label}</div>
    </div>
  );
}

// ─── Popover de detalhe ───────────────────────────────────────────────────────

function EventPopover({ e, onClose, onChanged, pending }: { e: AgendaEvent; onClose: () => void; onChanged: () => void; pending: boolean }) {
  const [busy, setBusy] = useState(false);
  const start = new Date(e.inicio);
  const end = new Date(e.fim);
  const serviceColor = colorVar(e);
  async function setStatus(status: AppointmentStatus) {
    setBusy(true);
    await updateAppointmentStatus({ id: e.id, status });
    onChanged();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="Agendamento"
      title={e.clienteNome}
      className="max-w-xl [&_footer]:px-5 [&_footer]:py-3 [&_h2]:text-[26px] [&_h2]:leading-tight [&_header]:px-5 [&_header]:pt-5"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" variant="ghost" onClick={() => setStatus("cancelado")} disabled={busy || pending}>
            <Ban className="h-4 w-4" strokeWidth={1.7} />
            Cancelar
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStatus("faltou")} disabled={busy || pending}>
              <UserX className="h-4 w-4" strokeWidth={1.7} />
              Faltou
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus("compareceu")} disabled={busy || pending}>
              <UserCheck className="h-4 w-4" strokeWidth={1.7} />
              Compareceu
            </Button>
            <Button size="sm" onClick={() => setStatus("confirmado")} disabled={busy || pending}>
              <Check className="h-4 w-4" strokeWidth={1.8} />
              Confirmar
            </Button>
          </div>
        </div>
      }>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {e.servicoNome ? (
            <ServicoBadge nome={e.servicoNome} corToken={e.corToken} pilar={e.pilar} />
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium leading-5 text-text-primary">
            <span className="h-1.5 w-1.5 rounded-[var(--radius-pill)]" style={{ background: STATUS_DOT[e.status] }} />
            {STATUS_LABEL[e.status]}
          </span>
        </div>

        <div
          className="rounded-[var(--radius-md)] border bg-background p-4"
          style={{
            borderColor: `color-mix(in srgb, ${serviceColor} 36%, var(--border))`,
            boxShadow: `inset 3px 0 0 ${serviceColor}`,
          }}
        >
          <p className="crm-label text-[10px] tracking-[1.4px] text-text-secondary">Quando</p>
          <p className="mt-1 text-lg font-medium leading-tight text-text-primary">
            {format(start, "EEEE, dd/MM", { locale: ptBR })}
          </p>
          <p className="mt-1 text-sm tabular-nums text-text-secondary">
            {format(start, "HH:mm")} as {format(end, "HH:mm")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {e.salaNome ? <DetailCell label="Sala" value={e.salaNome} /> : null}
          {e.profissionalNome ? <DetailCell label="Profissional" value={e.profissionalNome} /> : null}
        </div>

        {e.observacoes ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-accent-soft/40 px-3 py-2.5 text-sm text-text-primary">{e.observacoes}</div>
        ) : null}
        {e.pessoaId ? (
          <Link href={`/clientes/${e.pessoaId}`} className="inline-flex text-sm font-medium text-primary hover:underline">Abrir ficha do cliente →</Link>
        ) : e.leadId ? (
          <Link href={`/leads/${e.leadId}`} className="inline-flex text-sm font-medium text-primary hover:underline">Abrir ficha do lead →</Link>
        ) : null}
      </div>
    </Dialog>
  );
}

function DetailCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5">
      <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

// ─── Modal novo agendamento ───────────────────────────────────────────────────

const HORAS = Array.from({ length: 15 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINS = ["00", "30"];

function NovoAgendamentoModal({ options, onClose, onScheduled }: { options: AgendaOptions; onClose: () => void; onScheduled: () => void }) {
  const [pending, startTransition] = useTransition();
  const [pessoaId, setPessoaId] = useState("");
  const [servicoId, setServicoId] = useState(options.servicos[0]?.id ?? "");
  const [salaId, setSalaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("08");
  const [min, setMin] = useState("00");
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedServico = options.servicos.find((s) => s.id === servicoId) ?? null;

  function salvar() {
    setError(null);
    if (!pessoaId) { setError("Selecione um cliente."); return; }
    if (!servicoId) { setError("Selecione um serviço."); return; }
    const inicio = new Date(`${data}T${hora}:${min}:00`);
    if (Number.isNaN(inicio.getTime())) { setError("Data/hora inválida."); return; }
    startTransition(async () => {
      const r = await criarAgendamento({
        pessoa_id: pessoaId, servico_id: servicoId,
        sala_id: salaId || null, profissional_id: null,
        inicio: inicio.toISOString(), categoria: "sessao", observacoes: obs,
      });
      if (!r.success) { setError(r.error); return; }
      onScheduled();
    });
  }

  return (
    <Dialog open onClose={onClose} eyebrow="Agenda" title="Novo agendamento"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={salvar} disabled={pending}>{pending ? "Salvando…" : "Salvar agendamento"}</Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}
        <Field label="Cliente">
          <Select value={pessoaId} onChange={(e) => setPessoaId(e.target.value)}>
            <option value="">Selecione…</option>
            {options.pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Serviço">
            <Select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
              {options.servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
            {selectedServico ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ServicoBadge
                  nome={selectedServico.nome}
                  corToken={selectedServico.cor_token}
                  pilar={selectedServico.pilar}
                />
                <span className="text-xs text-text-secondary">{selectedServico.capacidade_slot}/slot</span>
              </div>
            ) : null}
          </Field>
          <Field label="Sala">
            <Select value={salaId} onChange={(e) => setSalaId(e.target.value)}>
              <option value="">Sem sala</option>
              {options.salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_90px_90px] gap-3">
          <Field label="Dia"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
          <Field label="Hora">
            <Select value={hora} onChange={(e) => setHora(e.target.value)}>{HORAS.map((h) => <option key={h} value={h}>{h}h</option>)}</Select>
          </Field>
          <Field label="Min">
            <Select value={min} onChange={(e) => setMin(e.target.value)}>{MINS.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
          </Field>
        </div>
        <Field label="Observação curta">
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
        </Field>
        <p className="text-xs text-text-secondary">A duração vem do serviço; a capacidade do horário é validada ao salvar.</p>
      </div>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">{label}</p>
      {children}
    </div>
  );
}
