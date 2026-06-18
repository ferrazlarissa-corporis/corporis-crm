"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/corporis/stat-card";
import { PilarBadge } from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { PILAR_OPTIONS } from "@/lib/cadastros-labels";
import type {
  ContratoModeloRow,
  ContratoModeloStats,
  PlanoOption,
} from "@/lib/queries/contrato-modelos";
import type { Pilar } from "@/types/database";
import {
  createContratoModelo,
  deleteContratoModelo,
  toggleContratoModeloAtivo,
  updateContratoModelo,
  type ContratoModeloInput,
} from "../actions";

const MERGE_FIELDS = [
  { token: "{{cliente}}", label: "Cliente" },
  { token: "{{plano}}", label: "Plano" },
  { token: "{{valor}}", label: "Valor" },
  { token: "{{vigencia}}", label: "Vigência" },
  { token: "{{servicos}}", label: "Serviços" },
  { token: "{{clinica}}", label: "Clínica" },
];

const PREVIEW_SAMPLE: Record<string, string> = {
  "{{cliente}}": "Marina Lopes",
  "{{plano}}": "Pilates Duplo Semanal",
  "{{valor}}": "R$ 520,00 mensais",
  "{{vigencia}}": "12 meses, a partir de 15/07/2026",
  "{{servicos}}": "Pilates em aparelhos, avaliação inicial",
  "{{clinica}}": "Corporis Fisioterapia e Pilates",
};

function applyPreview(corpo: string): string {
  return corpo.replace(/\{\{\s*\w+\s*\}\}/g, (m) => PREVIEW_SAMPLE[m.replace(/\s/g, "")] ?? m);
}

type StatusFilter = "todos" | "ativos" | "inativos";
type FormState = { nome: string; corpo: string; pilares: Pilar[]; planos: string[]; ativo: boolean };

const EMPTY: FormState = { nome: "", corpo: "", pilares: [], planos: [], ativo: true };

export function ContratosClient({
  modelos,
  planos,
  stats,
}: {
  modelos: ContratoModeloRow[];
  planos: PlanoOption[];
  stats: ContratoModeloStats;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoModeloRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const planoNome = useMemo(() => new Map(planos.map((p) => [p.id, p.nome])), [planos]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      if (status === "ativos" && !m.ativo) return false;
      if (status === "inativos" && m.ativo) return false;
      if (q && !m.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [modelos, busca, status]);

  function openCreate() { setEditing(null); setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(m: ContratoModeloRow) {
    setEditing(m);
    setForm({ nome: m.nome, corpo: m.corpo, pilares: m.pilares, planos: m.planos, ativo: m.ativo });
    setError(null); setOpen(true);
  }

  function handleSave() {
    setError(null);
    const input: ContratoModeloInput = { ...form };
    startTransition(async () => {
      const r = editing ? await updateContratoModelo(editing.id, input) : await createContratoModelo(input);
      if (!r.success) { setError(r.error); return; }
      setOpen(false); router.refresh();
    });
  }
  function handleToggle(m: ContratoModeloRow) {
    startTransition(async () => { await toggleContratoModeloAtivo(m.id, !m.ativo); router.refresh(); });
  }
  function handleDelete(m: ContratoModeloRow) {
    if (!confirm(`Excluir o modelo "${m.nome}"?`)) return;
    startTransition(async () => {
      const r = await deleteContratoModelo(m.id);
      if (!r.success) alert(r.error);
      router.refresh();
    });
  }
  function togglePilar(p: Pilar) {
    setForm((f) => ({ ...f, pilares: f.pilares.includes(p) ? f.pilares.filter((x) => x !== p) : [...f.pilares, p] }));
  }
  function togglePlano(id: string) {
    setForm((f) => ({ ...f, planos: f.planos.includes(id) ? f.planos.filter((x) => x !== id) : [...f.planos, id] }));
  }
  function insertField(token: string) {
    setForm((f) => ({ ...f, corpo: f.corpo ? `${f.corpo} ${token}` : token }));
  }

  const filtersActive = busca !== "" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Vendas e assinatura digital</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Modele contratos com campos de mesclagem e prévia preenchida.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Os modelos podem ser vinculados a planos e pilares. Na adesão da venda, o sistema escolhe o
              modelo e preenche o contrato para assinatura digital.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo modelo
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Modelos ativos" value={stats.ativos} hint="disponíveis para gerar contratos" icon={<FileText className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Planos cobertos" value={stats.planosVinculados} hint="planos com modelo vinculado" icon={<Link2 className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Total de modelos" value={stats.total} hint="incluindo inativos" icon={<Layers className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar modelo por nome" className="h-10 max-w-xs" />
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {(["todos", "ativos", "inativos"] as StatusFilter[]).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={cn("rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary")}>
              {s}
            </button>
          ))}
        </div>
        {filtersActive ? (
          <button type="button" onClick={() => { setBusca(""); setStatus("todos"); }}
            className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
            Limpar filtros
          </button>
        ) : null}
        <span className="ml-auto text-xs text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "modelo" : "modelos"}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhum modelo encontrado</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}crie o primeiro modelo de contrato.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo modelo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <Card key={m.id} className={cn("flex flex-col p-5", !m.ativo && "opacity-70")}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg leading-tight text-text-primary">{m.nome}</h3>
                  <span className={cn("shrink-0 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium",
                    m.ativo ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]" : "bg-accent-soft text-text-secondary")}>
                    {m.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-text-secondary">
                  {applyPreview(m.corpo)}
                </p>

                {m.pilares.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.pilares.map((p) => (
                      <PilarBadge key={p} pilar={p} />
                    ))}
                  </div>
                ) : null}

                {m.planos.length > 0 ? (
                  <p className="mt-2 text-[11px] text-text-secondary">
                    {m.planos.map((id) => planoNome.get(id)).filter(Boolean).join(" · ") || `${m.planos.length} plano(s)`}
                  </p>
                ) : null}

                <div className="mt-5 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <button onClick={() => openEdit(m)} className="font-medium text-text-primary hover:text-primary">Editar</button>
                  <button onClick={() => handleToggle(m)} className="text-text-secondary hover:text-text-primary">
                    {m.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(m)} className="ml-auto text-text-secondary hover:text-error">Excluir</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Cadastro"
        title={editing ? "Editar modelo" : "Novo modelo de contrato"}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending}>{pending ? "Salvando…" : "Salvar modelo"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

          <FormField label="Nome do modelo">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Adesão recorrente — Pilates" autoFocus />
          </FormField>

          <FormField label="Campos de mesclagem (clique para inserir)">
            <div className="flex flex-wrap gap-1.5">
              {MERGE_FIELDS.map((f) => (
                <button key={f.token} type="button" onClick={() => insertField(f.token)}
                  className="rounded-[var(--radius-pill)] border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary">
                  {f.token}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Corpo do contrato">
            <Textarea
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
              placeholder="Pelo presente instrumento, {{cliente}} adere ao plano {{plano}}…"
              className="min-h-40"
            />
          </FormField>

          {form.corpo.trim() ? (
            <FormField label="Pré-visualização (dados de exemplo)">
              <div className="max-h-40 overflow-y-auto crm-scrollbar rounded-[var(--radius-md)] border border-border bg-accent-soft/40 px-3 py-2.5 text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
                {applyPreview(form.corpo)}
              </div>
            </FormField>
          ) : null}

          <FormField label="Pilares">
            <div className="flex flex-wrap gap-2">
              {PILAR_OPTIONS.map((p) => (
                <button key={p.value} type="button" onClick={() => togglePilar(p.value)}
                  className={cn("rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors",
                    form.pilares.includes(p.value) ? "border-primary bg-accent-soft text-text-primary" : "border-border text-text-secondary hover:bg-accent-soft")}>
                  {p.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Planos vinculados">
            {planos.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum plano cadastrado ainda. Vincule depois de criar planos.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {planos.map((p) => (
                  <label key={p.id}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 transition-colors",
                      form.planos.includes(p.id) ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft")}>
                    <input type="checkbox" className="sr-only" checked={form.planos.includes(p.id)} onChange={() => togglePlano(p.id)} />
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded-[var(--radius-xs)] border",
                      form.planos.includes(p.id) ? "border-primary bg-primary" : "border-border")}>
                      {form.planos.includes(p.id) ? <span className="h-1.5 w-1.5 rounded-[1px] bg-card" /> : null}
                    </span>
                    <span className="text-sm text-text-primary">{p.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </FormField>
        </div>
      </Dialog>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">{label}</p>
      {children}
    </div>
  );
}
