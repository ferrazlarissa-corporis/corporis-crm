"use client";

import { useState, useRef, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addDays, addWeeks, differenceInMinutes, endOfWeek, format, isSameDay,
  startOfDay, endOfDay, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buildClinicSchedule, type ClinicHoursRow } from "@/lib/clinic-config";
import { COR_VAR, PILAR_LABEL, type CorToken } from "@/lib/cadastros-labels";
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
  const token = (e.corToken as CorToken) ?? FALLBACK_COR[e.tipo] ?? "alaranjado";
  return COR_VAR[token] ?? "var(--color-alaranjado)";
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

  // Ocupação por slot (inicio|servico|sala) → contagem
  const slotCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) {
      const k = `${e.inicio}|${e.servicoId ?? ""}|${e.salaId ?? ""}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [filtered]);

  const dayKeys = timelineDays.map((d) => d.key);
  const periodEvents = filtered.filter((e) => dayKeys.includes(dateKey(new Date(e.inicio))));

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
              const count = periodEvents.filter((e) => dateKey(new Date(e.inicio)) === key).length;
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
              {periodEvents.map((e) => {
                const start = new Date(e.inicio);
                const col = dayKeys.indexOf(dateKey(start));
                if (col < 0) return null;
                const mins = start.getHours() * 60 + start.getMinutes();
                const dur = Math.max(20, differenceInMinutes(new Date(e.fim), start));
                const top = ((mins - tStart) / 60) * HOUR_PX;
                const height = Math.max(26, (dur / 60) * HOUR_PX - 3);
                const c = colorVar(e);
                const slotKey = `${e.inicio}|${e.servicoId ?? ""}|${e.salaId ?? ""}`;
                const occ = slotCount.get(slotKey) ?? 1;
                const cap = e.capacidadeSlot ?? 1;
                return (
                  <button key={e.id} onClick={() => setSelected(e)}
                    className="absolute overflow-hidden rounded-[var(--radius-md)] px-2 py-1 text-left"
                    style={{
                      top: top + 1, height,
                      left: `calc(${HOUR_COL_W}px + (100% - ${HOUR_COL_W}px) * ${col} / ${dayCount} + 2px)`,
                      width: `calc((100% - ${HOUR_COL_W}px) / ${dayCount} - 5px)`,
                      background: bgFor(c), borderLeft: `3px solid ${c}`,
                    }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-medium text-text-primary">{format(start, "HH:mm")}</span>
                      <span className="shrink-0 rounded-[var(--radius-pill)] bg-card/70 px-1 text-[9px] font-medium text-text-secondary">{occ}/{cap}</span>
                    </div>
                    <div className="truncate text-[11px] text-text-primary">{e.clienteNome}</div>
                    {height > 42 && e.servicoNome ? <div className="truncate text-[10px] text-text-secondary">{e.servicoNome}</div> : null}
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
              <div key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="h-2.5 w-2.5 rounded-[var(--radius-pill)]" style={{ background: COR_VAR[(s.cor_token as CorToken) ?? "alaranjado"] }} />
                <span className="flex-1 truncate text-xs text-text-primary">{s.nome}</span>
                <span className="text-[11px] text-text-secondary">{s.capacidade_slot}/slot</span>
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
    <div className="rounded-[var(--radius-md)] border border-border bg-card p-3 text-center">
      <div className="font-display text-2xl leading-none text-text-primary">{value}</div>
      <div className="crm-label mt-1.5 text-[8.5px] tracking-[0.5px] text-text-secondary">{label}</div>
    </div>
  );
}

// ─── Popover de detalhe ───────────────────────────────────────────────────────

function EventPopover({ e, onClose, onChanged, pending }: { e: AgendaEvent; onClose: () => void; onChanged: () => void; pending: boolean }) {
  const [busy, setBusy] = useState(false);
  async function setStatus(status: AppointmentStatus) {
    setBusy(true);
    await updateAppointmentStatus({ id: e.id, status });
    onChanged();
  }
  return (
    <Dialog open onClose={onClose} eyebrow={e.servicoNome ?? "Agendamento"} title={e.clienteNome}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => setStatus("cancelado")} disabled={busy || pending}>Cancelar agend.</Button>
          <Button size="sm" variant="secondary" onClick={() => setStatus("faltou")} disabled={busy || pending}>Faltou</Button>
          <Button size="sm" variant="secondary" onClick={() => setStatus("compareceu")} disabled={busy || pending}>Compareceu</Button>
          <Button size="sm" onClick={() => setStatus("confirmado")} disabled={busy || pending}>Confirmar</Button>
        </>
      }>
      <div className="flex flex-col gap-3 text-sm">
        <Row label="Quando" value={`${format(new Date(e.inicio), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })} — ${format(new Date(e.fim), "HH:mm")}`} />
        {e.salaNome ? <Row label="Sala" value={e.salaNome} /> : null}
        {e.profissionalNome ? <Row label="Profissional" value={e.profissionalNome} /> : null}
        {e.pilar ? <Row label="Pilar" value={PILAR_LABEL[e.pilar]} /> : null}
        <Row label="Status" value={STATUS_LABEL[e.status]} />
        {e.observacoes ? (
          <div className="rounded-[var(--radius-md)] border-l-2 border-accent bg-accent-soft/40 px-3 py-2 text-xs text-text-primary">{e.observacoes}</div>
        ) : null}
        {e.pessoaId ? (
          <Link href={`/clientes/${e.pessoaId}`} className="text-xs font-medium text-primary hover:underline">Abrir ficha do cliente →</Link>
        ) : e.leadId ? (
          <Link href={`/leads/${e.leadId}`} className="text-xs font-medium text-primary hover:underline">Abrir ficha do lead →</Link>
        ) : null}
      </div>
    </Dialog>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="crm-label w-24 shrink-0 text-[10px] tracking-[1.2px] text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
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
