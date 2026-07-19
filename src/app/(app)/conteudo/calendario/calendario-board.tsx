"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, isSameMonth, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { StatusSlot } from "@/types/database";
import { createSlot, deleteSlot, rescheduleSlot, updateSlot } from "./actions";

type Pilar = { id: string; nome: string; cor_token: string; ativo: boolean };
type Slot = {
  id: string;
  data: string;
  horario: string | null;
  pilar_sugerido: string | null;
  post_id: string | null;
  status: StatusSlot;
  post_titulo: string | null;
};

const STATUS_FILTERS: { id: StatusSlot; label: string; token: string }[] = [
  { id: "rascunho", label: "Rascunho", token: "--slot-draft" },
  { id: "aprovado", label: "Aprovado", token: "--slot-approved" },
  { id: "agendado", label: "Agendado", token: "--slot-scheduled" },
  { id: "publicado", label: "Publicado", token: "--slot-published" },
];

const STATUS_DOT: Record<StatusSlot, string> = {
  vazio: "var(--slot-empty)",
  rascunho: "var(--slot-draft)",
  agendado: "var(--slot-scheduled)",
  aprovado: "var(--slot-approved)",
  publicado: "var(--slot-published)",
};

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function Chip({ active, dot, onClick, children }: { active: boolean; dot?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-medium transition-colors"
      style={{
        background: active ? "var(--color-bege-claro)" : "var(--surface-sunken)",
        color: active ? "var(--color-texto-escuro)" : "var(--color-texto-medio)",
        border: active ? "0.6px solid var(--color-bege)" : "0.6px solid transparent",
      }}
    >
      {dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function SlotChip({ slot, pilar, onClick }: { slot: Slot; pilar: Pilar | undefined; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: slot.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
      className="flex cursor-grab items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1.5 text-[11px] font-medium"
      title={slot.post_titulo ?? pilar?.nome ?? "Slot"}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[var(--radius-xs)] py-0.5"
        style={{ borderLeft: `3px solid ${pilar ? `var(--${pilar.cor_token})` : "var(--color-cinza)"}`, paddingLeft: 6, background: "var(--surface-sunken)" }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[slot.status] }} />
        <span className="min-w-0 flex-1 truncate text-text-primary">{slot.post_titulo ?? pilar?.nome ?? "Novo slot"}</span>
      </div>
    </div>
  );
}

function DayCell({
  iso,
  inMonth,
  slots,
  pilarById,
  onAdd,
  onSlotClick,
}: {
  iso: string;
  inMonth: boolean;
  slots: Slot[];
  pilarById: Map<string, Pilar>;
  onAdd: () => void;
  onSlotClick: (slot: Slot) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  const dayDate = parseISO(iso);
  const today = isToday(dayDate);

  return (
    <div
      ref={setNodeRef}
      className="group flex min-h-[128px] flex-col gap-1.5 border-b border-r border-border p-2.5"
      style={{ background: isOver ? "var(--color-bege-claro)" : inMonth ? "transparent" : "var(--surface-sunken)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-display text-[15px] leading-none"
          style={
            today
              ? { color: "#fff", background: "var(--color-alaranjado)", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-pill)", fontSize: 12 }
              : { color: inMonth ? "var(--color-texto-escuro)" : "var(--color-cinza)" }
          }
        >
          {format(dayDate, "d")}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary opacity-0 transition-opacity group-hover:opacity-100"
          style={{ border: "1.5px dashed var(--color-cinza)" }}
          aria-label={`Criar slot em ${iso}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {slots.map((slot) => (
          <SlotChip key={slot.id} slot={slot} pilar={slot.pilar_sugerido ? pilarById.get(slot.pilar_sugerido) : undefined} onClick={() => onSlotClick(slot)} />
        ))}
      </div>
    </div>
  );
}

function SlotDetailPanel({
  slot,
  pilares,
  onClose,
  onSave,
  onDelete,
}: {
  slot: Slot;
  pilares: Pilar[];
  onClose: () => void;
  onSave: (patch: Partial<Slot>) => void;
  onDelete: () => void;
}) {
  const [pilarId, setPilarId] = useState(slot.pilar_sugerido ?? "");
  const [status, setStatus] = useState<StatusSlot>(slot.status);
  const [pending, setPending] = useState(false);

  function handleSave() {
    setPending(true);
    updateSlot({ id: slot.id, pilar_sugerido: pilarId || null, status }).then((result) => {
      setPending(false);
      if (result.success) {
        onSave({ pilar_sugerido: pilarId || null, status });
        onClose();
      }
    });
  }

  function handleDelete() {
    setPending(true);
    deleteSlot(slot.id).then((result) => {
      setPending(false);
      if (result.success) onDelete();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(42,31,26,0.45)" }} onClick={onClose}>
      <div className="w-[380px] rounded-[var(--radius-lg)] border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-text-primary">
            {slot.post_titulo ?? "Slot"} · {format(parseISO(slot.data), "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <button type="button" onClick={onClose} className="text-text-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Pilar sugerido</label>
            <select value={pilarId} onChange={(e) => setPilarId(e.target.value)} className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }}>
              <option value="">Sem pilar</option>
              {pilares.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusSlot)} className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }}>
              <option value="vazio">Vazio</option>
              <option value="rascunho">Rascunho</option>
              <option value="aprovado">Aprovado</option>
              <option value="agendado">Agendado</option>
              <option value="publicado">Publicado</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2 border-t border-border pt-4">
          <button type="button" onClick={handleDelete} disabled={pending} className="rounded-[var(--radius-pill)] border border-border px-4 py-2 text-[13px] font-medium disabled:opacity-70" style={{ color: "var(--color-ui-error)" }}>
            Remover
          </button>
          <button type="button" onClick={handleSave} disabled={pending} className="rounded-[var(--radius-pill)] bg-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-70">
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CalendarioBoard({
  year,
  month,
  monthLabel,
  gridStartIso,
  gridEndIso,
  initialSlots,
  pilares,
}: {
  year: number;
  month: number;
  monthLabel: string;
  gridStartIso: string;
  gridEndIso: string;
  initialSlots: Slot[];
  pilares: Pilar[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [activePilares, setActivePilares] = useState(new Set(pilares.map((p) => p.id)));
  const [activeStatuses, setActiveStatuses] = useState(new Set(STATUS_FILTERS.map((s) => s.id)));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const pilarById = useMemo(() => new Map(pilares.map((p) => [p.id, p])), [pilares]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const days = useMemo(() => {
    const start = parseISO(gridStartIso);
    const end = parseISO(gridEndIso);
    const result: string[] = [];
    let cur = start;
    while (cur <= end) {
      result.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }
    return result;
  }, [gridStartIso, gridEndIso]);

  const anchorMonth = month;

  const visibleSlots = slots.filter((s) => {
    const statusOk = s.status === "vazio" || activeStatuses.has(s.status as Exclude<StatusSlot, "vazio">);
    const pilarOk = !s.pilar_sugerido || activePilares.has(s.pilar_sugerido);
    return statusOk && pilarOk;
  });

  function togglePilar(id: string) {
    setActivePilares((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleStatus(id: StatusSlot) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setActivePilares(new Set(pilares.map((p) => p.id)));
    setActiveStatuses(new Set(STATUS_FILTERS.map((s) => s.id)));
  }

  const handleAdd = useCallback((iso: string) => {
    createSlot({ data: iso }).then((result) => {
      if (result.success && result.id) {
        setSlots((prev) => [...prev, { id: result.id!, data: iso, horario: null, pilar_sugerido: null, post_id: null, status: "vazio", post_titulo: null }]);
      }
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const slotId = String(active.id);
    const newIso = String(over.id);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.data === newIso) return;

    const prevIso = slot.data;
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, data: newIso } : s)));
    rescheduleSlot({ id: slotId, data: newIso }).then((result) => {
      if (!result.success) {
        setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, data: prevIso } : s)));
      }
    });
  }, [slots]);

  function prevHref() {
    const d = new Date(year, month - 1, 1);
    return `?ano=${d.getFullYear()}&mes=${d.getMonth() + 1}`;
  }
  function nextHref() {
    const d = new Date(year, month + 1, 1);
    return `?ano=${d.getFullYear()}&mes=${d.getMonth() + 1}`;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-6">
        <div>
          <h1 className="font-display text-[26px] capitalize text-text-primary">{monthLabel}</h1>
          <p className="type-body-sm text-text-secondary">Calendário editorial</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={prevHref()} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={`?ano=${new Date().getFullYear()}&mes=${new Date().getMonth() + 1}`} className="rounded-[var(--radius-pill)] border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-primary">
            Hoje
          </Link>
          <Link href={nextHref()} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 border-b border-border px-8 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-ui-label mr-1 text-[var(--color-bege)]">Pilar</span>
          {pilares.map((p) => (
            <Chip key={p.id} active={activePilares.has(p.id)} dot={`var(--${p.cor_token})`} onClick={() => togglePilar(p.id)}>
              {p.nome}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-ui-label mr-1 text-[var(--color-bege)]">Status</span>
          {STATUS_FILTERS.map((s) => (
            <Chip key={s.id} active={activeStatuses.has(s.id)} dot={`var(${s.token})`} onClick={() => toggleStatus(s.id)}>
              {s.label}
            </Chip>
          ))}
          <button type="button" onClick={clearFilters} className="ml-auto rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] text-text-secondary" style={{ border: "0.6px dashed var(--color-cinza)" }}>
            Limpar filtros
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border">
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((wd) => (
                <span key={wd} className="type-ui-label px-3.5 py-3 text-text-secondary">{wd}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((iso) => (
                <DayCell
                  key={iso}
                  iso={iso}
                  inMonth={isSameMonth(parseISO(iso), new Date(year, anchorMonth, 1))}
                  slots={visibleSlots.filter((s) => s.data === iso)}
                  pilarById={pilarById}
                  onAdd={() => handleAdd(iso)}
                  onSlotClick={(slot) => setSelectedSlot(slot)}
                />
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {selectedSlot && (
        <SlotDetailPanel
          slot={selectedSlot}
          pilares={pilares}
          onClose={() => setSelectedSlot(null)}
          onSave={(patch) => setSlots((prev) => prev.map((s) => (s.id === selectedSlot.id ? { ...s, ...patch } : s)))}
          onDelete={() => setSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id))}
        />
      )}
    </div>
  );
}
