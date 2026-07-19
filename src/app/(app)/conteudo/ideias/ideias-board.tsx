"use client";

import { useCallback, useState, useTransition } from "react";
import { Link2, Plus, Sparkles, X } from "lucide-react";
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
import type { IdeiaOrigem, IdeiaStatus } from "@/types/database";
import {
  createIdeia,
  createIdeiaFromLink,
  generateIdeiaSuggestions,
  transformarEmPost,
  updateIdeiaStatus,
} from "./actions";

type Pilar = { id: string; nome: string; cor_token: string; ativo: boolean };
type Ideia = {
  id: string;
  titulo: string;
  angulo: string | null;
  publico_alvo: string | null;
  origem: IdeiaOrigem;
  status: IdeiaStatus;
  pilar_id: string | null;
};

const COLUMNS: { id: IdeiaStatus; label: string; dot: string }[] = [
  { id: "nova", label: "Nova", dot: "var(--status-nova)" },
  { id: "selecionada", label: "Selecionada", dot: "var(--status-selecionada)" },
  { id: "virou_post", label: "Virou post", dot: "var(--status-post)" },
  { id: "descartada", label: "Descartada", dot: "var(--status-descartada)" },
];

const ORIGEM_META: Record<IdeiaOrigem, { label: string; bg: string; fg: string; icon?: React.ReactNode }> = {
  manual: { label: "MANUAL", bg: "transparent", fg: "var(--color-texto-medio)" },
  import: { label: "IMPORTADA", bg: "transparent", fg: "var(--color-texto-medio)", icon: <Link2 size={11} strokeWidth={1.8} /> },
  sugestao: { label: "IA", bg: "var(--color-bege-claro)", fg: "#7A5E1F", icon: <Sparkles size={11} strokeWidth={1.8} /> },
};

function OrigemBadge({ origem }: { origem: IdeiaOrigem }) {
  const meta = ORIGEM_META[origem];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-medium uppercase tracking-[1.2px]"
      style={{
        background: meta.bg,
        color: meta.fg,
        border: meta.bg === "transparent" ? "0.6px solid var(--color-cinza)" : "none",
        fontFamily: "var(--font-body)",
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function PillButton({
  children,
  primary,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-[var(--radius-pill)] px-3 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-wait disabled:opacity-70"
      style={{
        fontFamily: "var(--font-body)",
        background: primary ? "var(--color-alaranjado)" : "var(--bg-card)",
        color: primary ? "#fff" : "var(--color-texto-escuro)",
        border: primary ? "none" : "0.6px solid var(--color-cinza)",
      }}
    >
      {children}
    </button>
  );
}

function IdeiaCard({
  ideia,
  pilar,
  onAction,
  pending,
}: {
  ideia: Ideia;
  pilar: Pilar | undefined;
  onAction: (action: "selecionar" | "descartar" | "transformar" | "restaurar") => void;
  pending: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-border bg-card p-3.5 shadow-[var(--shadow-sm)]"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: pilar ? `var(--${pilar.cor_token})` : "var(--color-cinza)" }}
          />
          <span className="truncate text-[12px] text-text-secondary">{pilar?.nome ?? "Sem pilar"}</span>
        </div>
        <OrigemBadge origem={ideia.origem} />
      </div>

      <p className="text-[14.5px] font-medium leading-snug text-text-primary">{ideia.titulo}</p>
      {ideia.angulo ? <p className="type-body-sm italic text-text-secondary">{ideia.angulo}</p> : null}
      {ideia.publico_alvo ? (
        <span
          className="w-fit rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px]"
          style={{ background: "var(--bg-2)", color: "var(--color-texto-medio)", fontFamily: "var(--font-body)" }}
        >
          {ideia.publico_alvo}
        </span>
      ) : null}

      <div className="mt-1 flex gap-2">
        {ideia.status === "nova" && (
          <>
            <PillButton onClick={() => onAction("selecionar")} disabled={pending}>Selecionar</PillButton>
            <PillButton primary onClick={() => onAction("transformar")} disabled={pending}>Transformar em post</PillButton>
          </>
        )}
        {ideia.status === "selecionada" && (
          <>
            <PillButton onClick={() => onAction("descartar")} disabled={pending}>Descartar</PillButton>
            <PillButton primary onClick={() => onAction("transformar")} disabled={pending}>Transformar em post</PillButton>
          </>
        )}
        {ideia.status === "virou_post" && (
          <PillButton disabled>Ver post no calendário (em breve)</PillButton>
        )}
        {ideia.status === "descartada" && (
          <>
            <PillButton onClick={() => onAction("restaurar")} disabled={pending}>Restaurar</PillButton>
            <PillButton primary onClick={() => onAction("selecionar")} disabled={pending}>Selecionar</PillButton>
          </>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ id, disabled, children }: { id: string; disabled: boolean; children: () => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1, touchAction: "none" }}
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
      className="flex flex-1 flex-col gap-2.5 rounded-[var(--radius-md)] p-1 transition-colors"
      style={{ background: isOver ? "var(--color-bege-claro)" : "transparent", minHeight: 120 }}
    >
      {children}
    </div>
  );
}

function NewIdeiaModal({ pilares, onClose, onCreated }: { pilares: Pilar[]; onClose: () => void; onCreated: (ideia: Ideia) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const titulo = String(formData.get("titulo") ?? "").trim();
    const angulo = String(formData.get("angulo") ?? "").trim();
    const publico_alvo = String(formData.get("publico_alvo") ?? "").trim();
    const pilar_id = String(formData.get("pilar_id") ?? "") || null;

    startTransition(async () => {
      setError(null);
      const result = await createIdeia({ titulo, angulo, publico_alvo, pilar_id });
      if (result.success) {
        onCreated({ id: crypto.randomUUID(), titulo, angulo, publico_alvo, pilar_id, origem: "manual", status: "nova" });
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(42,31,26,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-[480px] rounded-[var(--radius-lg)] border border-border bg-card p-7 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-text-primary">Nova ideia</h2>
          <button type="button" onClick={onClose} className="text-text-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="type-ui-label mb-1.5 block text-text-secondary">Título</label>
            <input name="titulo" required maxLength={160} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none" />
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-text-secondary">Ângulo</label>
            <input name="angulo" maxLength={280} placeholder="Recorte específico da pauta" className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="type-ui-label mb-1.5 block text-text-secondary">Pilar</label>
              <select name="pilar_id" className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none">
                <option value="">Sem pilar</option>
                {pilares.filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="type-ui-label mb-1.5 block text-text-secondary">Público-alvo</label>
              <input name="publico_alvo" maxLength={120} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none" />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ui-error)" }}>{error}</p>}

          <div className="mt-1 flex justify-end gap-2.5 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-[var(--radius-pill)] border border-border bg-card px-4 py-2 text-[13px] font-medium text-text-primary">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="rounded-[var(--radius-pill)] bg-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-70">
              {pending ? "Criando…" : "Criar ideia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function IdeiasBoard({ initialIdeias, pilares }: { initialIdeias: Ideia[]; pilares: Pilar[] }) {
  const [ideias, setIdeias] = useState(initialIdeias);
  const [pasteValue, setPasteValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<IdeiaStatus | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pastePending, startPasteTransition] = useTransition();
  const [suggestPending, startSuggestTransition] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const pilarById = new Map(pilares.map((p) => [p.id, p]));

  const setPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const applyStatus = useCallback((id: string, status: IdeiaStatus) => {
    const prevIdeia = ideias.find((i) => i.id === id);
    if (!prevIdeia) return;
    setIdeias((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    setPending(id, true);
    updateIdeiaStatus({ id, status }).then((result) => {
      if (!result.success) {
        setIdeias((prev) => prev.map((i) => (i.id === id ? { ...i, status: prevIdeia.status } : i)));
      }
      setPending(id, false);
    });
  }, [ideias, setPending]);

  const handleAction = useCallback((ideia: Ideia, action: "selecionar" | "descartar" | "transformar" | "restaurar") => {
    if (action === "transformar") {
      setPending(ideia.id, true);
      setIdeias((prev) => prev.map((i) => (i.id === ideia.id ? { ...i, status: "virou_post" } : i)));
      transformarEmPost(ideia.id).then((result) => {
        if (!result.success) {
          setIdeias((prev) => prev.map((i) => (i.id === ideia.id ? { ...i, status: ideia.status } : i)));
        }
        setPending(ideia.id, false);
      });
      return;
    }
    const target: IdeiaStatus = action === "selecionar" ? "selecionada" : action === "descartar" ? "descartada" : "nova";
    applyStatus(ideia.id, target);
  }, [applyStatus, setPending]);

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    setOverCol(event.over ? (String(event.over.id) as IdeiaStatus) : null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setOverCol(null);
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const newStatus = String(over.id) as IdeiaStatus;
    const ideia = ideias.find((i) => i.id === id);
    if (!ideia || ideia.status === newStatus || newStatus === "virou_post") return;
    applyStatus(id, newStatus);
  }, [ideias, applyStatus]);

  function handlePaste() {
    if (!pasteValue.trim()) return;
    startPasteTransition(async () => {
      const result = await createIdeiaFromLink({ url: pasteValue.trim() });
      if (result.success) {
        setPasteValue("");
        setIdeias((prev) => [
          { id: crypto.randomUUID(), titulo: pasteValue.trim().slice(0, 80), angulo: null, publico_alvo: null, pilar_id: null, origem: "import", status: "nova" },
          ...prev,
        ]);
      }
    });
  }

  function handleSuggest() {
    setSuggestError(null);
    startSuggestTransition(async () => {
      const result = await generateIdeiaSuggestions();
      if (!result.success) {
        setSuggestError(result.error);
        return;
      }
      // Server component revalidation won't refetch client state automatically;
      // simplest reliable path is a full reload of this route's data.
      window.location.reload();
    });
  }

  const activeIdeia = activeId ? ideias.find((i) => i.id === activeId) ?? null : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-6">
        <div>
          <h1 className="font-display text-[26px] text-text-primary">Banco de ideias</h1>
          <p className="type-body-sm text-text-secondary">Acumule e triê pautas antes de virarem post.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-primary px-4 py-2.5 text-[13px] font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nova ideia
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-3.5">
        <input
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder="Colar referência (link do Instagram, artigo, comentário de aluna…)"
          className="min-w-[320px] flex-1 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none"
        />
        <button
          type="button"
          onClick={handlePaste}
          disabled={pastePending || !pasteValue.trim()}
          className="rounded-[var(--radius-pill)] border border-border bg-card px-4 py-2 text-[12.5px] font-medium text-text-primary disabled:opacity-60"
        >
          {pastePending ? "Adicionando…" : "Adicionar"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {suggestError && <span className="text-xs" style={{ color: "var(--color-ui-error)" }}>{suggestError}</span>}
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggestPending}
            className="flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-2 text-[12.5px] font-medium disabled:opacity-70"
            style={{ background: "var(--color-bege-claro)", color: "#6B5526" }}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
            {suggestPending ? "Gerando…" : "Gerar sugestões"}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="crm-scrollbar min-w-0 flex-1 overflow-auto p-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(260px, 1fr))", minWidth: 1100 }}>
            {COLUMNS.map((col) => {
              const colIdeias = ideias.filter((i) => i.status === col.id);
              return (
                <section key={col.id} className="flex flex-col rounded-[var(--radius-lg)]" style={{ background: "var(--surface-sunken)" }}>
                  <header className="flex items-center gap-2.5 px-4 pb-3 pt-4">
                    <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: col.dot }} />
                    <span className="font-display text-[17px] text-text-primary">{col.label}</span>
                    <span
                      className="ml-auto rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: "var(--surface-raised)", color: "var(--color-texto-medio)" }}
                    >
                      {colIdeias.length}
                    </span>
                  </header>

                  <DroppableColumn id={col.id} isOver={overCol === col.id}>
                    <div className="flex flex-col gap-2.5 px-3 pb-3">
                      {colIdeias.length === 0 ? (
                        <p className="type-body-sm rounded-[var(--radius-md)] border border-dashed border-border p-4 text-center italic text-text-secondary">
                          Nada por aqui ainda.
                        </p>
                      ) : (
                        colIdeias.map((ideia) => (
                          <DraggableCard key={ideia.id} id={ideia.id} disabled={ideia.status === "virou_post"}>
                            {() => (
                              <IdeiaCard
                                ideia={ideia}
                                pilar={ideia.pilar_id ? pilarById.get(ideia.pilar_id) : undefined}
                                pending={pendingIds.has(ideia.id)}
                                onAction={(action) => handleAction(ideia, action)}
                              />
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
          {activeIdeia ? (
            <div style={{ width: 280 }}>
              <IdeiaCard
                ideia={activeIdeia}
                pilar={activeIdeia.pilar_id ? pilarById.get(activeIdeia.pilar_id) : undefined}
                pending={false}
                onAction={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showModal && (
        <NewIdeiaModal
          pilares={pilares}
          onClose={() => setShowModal(false)}
          onCreated={(ideia) => setIdeias((prev) => [ideia, ...prev])}
        />
      )}
    </div>
  );
}
