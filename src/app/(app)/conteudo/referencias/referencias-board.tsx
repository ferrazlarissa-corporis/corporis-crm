"use client";

import { useState, useTransition } from "react";
import { Aperture, Clapperboard, FileText, Music2, Pin, Plus, User, X } from "lucide-react";
import type { TipoFonteReferencia } from "@/types/database";
import { createReferencia, deleteReferencia, virarIdeia } from "./actions";

type Pilar = { id: string; nome: string; cor_token: string; ativo: boolean };
type Referencia = {
  id: string;
  titulo: string;
  fonte: string | null;
  tipo_fonte: TipoFonteReferencia | null;
  pilar_id: string | null;
  tags: string[];
  por_que_funciona: string | null;
};

const TIPO_META: Record<TipoFonteReferencia, { label: string; icon: React.ReactNode }> = {
  instagram: { label: "Instagram", icon: <Aperture size={14} strokeWidth={1.6} /> },
  reels: { label: "Reels", icon: <Clapperboard size={14} strokeWidth={1.6} /> },
  tiktok: { label: "TikTok", icon: <Music2 size={14} strokeWidth={1.6} /> },
  artigo: { label: "Artigo", icon: <FileText size={14} strokeWidth={1.6} /> },
  pinterest: { label: "Pinterest", icon: <Pin size={14} strokeWidth={1.6} /> },
  perfil: { label: "Perfil concorrente", icon: <User size={14} strokeWidth={1.6} /> },
};

function ReferenciaCard({
  referencia,
  pilar,
  onVirarIdeia,
  onRemover,
  pending,
}: {
  referencia: Referencia;
  pilar: Pilar | undefined;
  onVirarIdeia: () => void;
  onRemover: () => void;
  pending: boolean;
}) {
  const tipo = referencia.tipo_fonte ? TIPO_META[referencia.tipo_fonte] : null;
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-5" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="flex items-center gap-2 text-text-secondary">
        {tipo?.icon}
        <span className="type-body-sm">{tipo?.label ?? "Referência"}</span>
      </div>

      <div
        className="flex h-24 items-center justify-center rounded-[var(--radius-md)]"
        style={{ background: "var(--bg-2)" }}
      >
        <span className="type-ui-micro text-text-secondary">
          PRINT · {(tipo?.label ?? "REFERÊNCIA").toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: pilar ? `var(--${pilar.cor_token})` : "var(--color-cinza)" }} />
          <span className="truncate text-[12px] text-text-secondary">{pilar?.nome ?? "Sem pilar"}</span>
        </div>
        <span className="type-body-sm shrink-0 text-text-secondary">{referencia.fonte}</span>
      </div>

      <p className="text-[15px] font-medium leading-snug text-text-primary">&quot;{referencia.titulo}&quot;</p>

      {referencia.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {referencia.tags.map((tag) => (
            <span key={tag} className="rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px]" style={{ background: "var(--bg-2)", color: "var(--color-texto-medio)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {referencia.por_que_funciona && (
        <div className="rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--bg-2)" }}>
          <p className="type-ui-label mb-1.5 text-[var(--color-bege)]">Por que funciona</p>
          <p className="type-body-sm italic text-text-secondary">{referencia.por_que_funciona}</p>
        </div>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onVirarIdeia}
          disabled={pending}
          className="flex-1 rounded-[var(--radius-pill)] bg-primary px-3 py-2 text-[12.5px] font-medium text-white disabled:opacity-70"
        >
          💡 Virar ideia
        </button>
        <button
          type="button"
          onClick={onRemover}
          disabled={pending}
          className="rounded-[var(--radius-pill)] border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-text-primary disabled:opacity-70"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

function SaveReferenciaPanel({ pilares, onClose, onSaved }: { pilares: Pilar[]; onClose: () => void; onSaved: (r: Referencia) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const titulo = String(form.get("titulo") ?? "").trim();
    const fonte = String(form.get("fonte") ?? "").trim();
    const tipo_fonte = String(form.get("tipo_fonte") ?? "instagram") as TipoFonteReferencia;
    const pilar_id = String(form.get("pilar_id") ?? "") || null;
    const tags = String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const por_que_funciona = String(form.get("por_que_funciona") ?? "").trim();

    startTransition(async () => {
      setError(null);
      const result = await createReferencia({ titulo, fonte, tipo_fonte, pilar_id, tags, por_que_funciona });
      if (result.success) {
        onSaved({ id: crypto.randomUUID(), titulo, fonte, tipo_fonte, pilar_id, tags, por_que_funciona });
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(42,31,26,0.45)" }} onClick={onClose}>
      <div className="flex h-full w-[420px] flex-col border-l border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-display text-xl text-text-primary">Salvar referência</h2>
          <button type="button" onClick={onClose} className="text-text-secondary"><X className="h-4 w-4" /></button>
        </div>

        <form id="save-referencia-form" onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Título</label>
            <input name="titulo" required maxLength={160} placeholder="Ex.: Carrossel que reformula uma crença" className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }} />
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Link ou @ da fonte</label>
            <input name="fonte" required maxLength={200} placeholder="@perfil ou link" className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }} />
            <p className="type-body-sm mt-1 text-text-secondary">O print da referência é anexado depois, na ficha.</p>
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Tipo</label>
            <select name="tipo_fonte" className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }}>
              {Object.entries(TIPO_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Pilar</label>
            <select name="pilar_id" className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }}>
              <option value="">Sem pilar</option>
              {pilares.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Tags (separadas por vírgula)</label>
            <input name="tags" placeholder="gancho forte, prova social" className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }} />
          </div>
          <div>
            <label className="type-ui-label mb-1.5 block text-[var(--color-bege)]">Por que funciona</label>
            <textarea name="por_que_funciona" placeholder="O que essa referência faz de diferente…" className="min-h-[70px] w-full resize-y rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-sunken)" }} />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ui-error)" }}>{error}</p>}
        </form>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-pill)] border border-border bg-card py-2.5 text-[13px] font-medium text-text-primary">
            Cancelar
          </button>
          <button
            type="submit"
            form="save-referencia-form"
            disabled={pending}
            className="flex-1 rounded-[var(--radius-pill)] bg-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-70"
          >
            {pending ? "Salvando…" : "Salvar referência"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReferenciasBoard({ initialReferencias, pilares }: { initialReferencias: Referencia[]; pilares: Pilar[] }) {
  const [referencias, setReferencias] = useState(initialReferencias);
  const [tab, setTab] = useState<"salvas" | "descobertas">("salvas");
  const [showPanel, setShowPanel] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pilarById = new Map(pilares.map((p) => [p.id, p]));

  function setPending(id: string, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleVirarIdeia(id: string) {
    setPending(id, true);
    virarIdeia(id).then(() => setPending(id, false));
  }

  function handleRemover(id: string) {
    setPending(id, true);
    setReferencias((prev) => prev.filter((r) => r.id !== id));
    deleteReferencia(id).then((result) => {
      if (!result.success) {
        setReferencias(initialReferencias);
      }
      setPending(id, false);
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-6">
        <div>
          <h1 className="font-display text-[26px] text-text-primary">Referências</h1>
          <p className="type-body-sm text-text-secondary">Swipe file: salve o que funciona e por que funciona.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-primary px-4 py-2.5 text-[13px] font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Salvar referência
        </button>
      </header>

      <div className="flex gap-1 border-b border-border px-8 pt-3">
        {[
          { id: "salvas" as const, label: "Salvas manualmente", count: referencias.length },
          { id: "descobertas" as const, label: "Descobertas", count: 0 },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 rounded-t-[var(--radius-md)] px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === t.id ? "var(--color-texto-escuro)" : "var(--color-texto-medio)",
              borderBottom: tab === t.id ? "2px solid var(--color-alaranjado)" : "2px solid transparent",
            }}
          >
            {t.label}
            <span className="rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px]" style={{ background: "var(--bg-2)" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "salvas" ? (
        <div className="crm-scrollbar flex-1 overflow-auto p-6">
          {referencias.length === 0 ? (
            <p className="type-body-sm p-8 text-center italic text-text-secondary">Nenhuma referência salva ainda.</p>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {referencias.map((r) => (
                <ReferenciaCard
                  key={r.id}
                  referencia={r}
                  pilar={r.pilar_id ? pilarById.get(r.pilar_id) : undefined}
                  pending={pendingIds.has(r.id)}
                  onVirarIdeia={() => handleVirarIdeia(r.id)}
                  onRemover={() => handleRemover(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span
            className="rounded-[var(--radius-pill)] px-3 py-1 text-[10px] font-medium uppercase tracking-[1.5px]"
            style={{ background: "var(--color-bege-claro)", color: "#6B5526" }}
          >
            Fase 2
          </span>
          <h3 className="font-display text-xl text-text-primary">Descoberta automática ainda não está ligada</h3>
          <p className="type-body-sm max-w-md text-text-secondary">
            Nesta fase, o rastreamento de referências é manual — salve o que te inspirar na aba &quot;Salvas
            manualmente&quot;. Em breve, esta aba vai sugerir referências de fora com base nos seus pilares e no
            que sua audiência procura.
          </p>
        </div>
      )}

      {showPanel && (
        <SaveReferenciaPanel
          pilares={pilares}
          onClose={() => setShowPanel(false)}
          onSaved={(r) => setReferencias((prev) => [r, ...prev])}
        />
      )}
    </div>
  );
}
