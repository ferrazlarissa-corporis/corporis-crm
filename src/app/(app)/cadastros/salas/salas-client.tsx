"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Layers, Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/corporis/stat-card";
import { cn } from "@/lib/utils";
import { PILAR_LABEL, PILAR_OPTIONS } from "@/lib/cadastros-labels";
import type { SalaRow, SalaStats } from "@/lib/queries/salas";
import type { Pilar } from "@/types/database";
import {
  createSala,
  deleteSala,
  toggleSalaAtiva,
  updateSala,
  type SalaInput,
} from "../actions";

type StatusFilter = "todos" | "ativas" | "inativas";
type FormState = { nome: string; capacidade: number; equipamentos: string; pilares: Pilar[]; ativo: boolean };

const EMPTY: FormState = { nome: "", capacidade: 4, equipamentos: "", pilares: [], ativo: true };

export function SalasClient({ salas, stats }: { salas: SalaRow[]; stats: SalaStats }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalaRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return salas.filter((s) => {
      if (status === "ativas" && !s.ativo) return false;
      if (status === "inativas" && s.ativo) return false;
      if (q && !s.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [salas, busca, status]);

  function openCreate() {
    setEditing(null); setForm(EMPTY); setError(null); setOpen(true);
  }
  function openEdit(s: SalaRow) {
    setEditing(s);
    setForm({
      nome: s.nome,
      capacidade: s.capacidade,
      equipamentos: s.equipamentos.join(", "),
      pilares: s.pilares,
      ativo: s.ativo,
    });
    setError(null); setOpen(true);
  }

  function toInput(f: FormState): SalaInput {
    return {
      nome: f.nome,
      capacidade: f.capacidade,
      equipamentos: f.equipamentos.split(",").map((e) => e.trim()).filter(Boolean),
      pilares: f.pilares,
      ativo: f.ativo,
    };
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateSala(editing.id, toInput(form)) : await createSala(toInput(form));
      if (!result.success) { setError(result.error); return; }
      setOpen(false); router.refresh();
    });
  }
  function handleToggle(s: SalaRow) {
    startTransition(async () => { await toggleSalaAtiva(s.id, !s.ativo); router.refresh(); });
  }
  function handleDelete(s: SalaRow) {
    if (!confirm(`Excluir a sala "${s.nome}"?`)) return;
    startTransition(async () => {
      const r = await deleteSala(s.id);
      if (!r.success) alert(r.error);
      router.refresh();
    });
  }
  function togglePilar(p: Pilar) {
    setForm((f) => ({
      ...f,
      pilares: f.pilares.includes(p) ? f.pilares.filter((x) => x !== p) : [...f.pilares, p],
    }));
  }

  const filtersActive = busca !== "" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Estrutura física</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Cadastre salas, equipamentos e pilares compatíveis.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              A capacidade da sala ajuda a respeitar o limite físico de cada espaço, separando Pilates,
              Fisio pélvica e avaliação.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nova sala
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Salas ativas" value={stats.ativas} hint="espaços disponíveis na agenda" icon={<DoorOpen className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Capacidade total" value={stats.capacidadeTotal} hint="lugares somados entre as salas" icon={<Layers className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Equipamentos" value={stats.equipamentos} hint="tipos distintos cadastrados" icon={<Wrench className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar sala por nome" className="h-10 max-w-xs" />
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {(["todos", "ativas", "inativas"] as StatusFilter[]).map((s) => (
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
          {filtered.length} {filtered.length === 1 ? "sala" : "salas"}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhuma sala encontrada</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}cadastre a primeira sala da clínica.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nova sala
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className={cn("flex flex-col p-5", !s.ativo && "opacity-70")}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl leading-tight text-text-primary">{s.nome}</h3>
                  <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium",
                    s.ativo ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]" : "bg-accent-soft text-text-secondary")}>
                    {s.ativo ? "Ativa" : "Inativa"}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">Capacidade</p>
                  <p className="mt-1 font-display text-2xl leading-none text-text-primary">{s.capacidade}</p>
                </div>

                {s.pilares.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.pilares.map((p) => (
                      <span key={p} className="rounded-[var(--radius-pill)] bg-accent-soft px-2.5 py-0.5 text-[11px] text-text-primary">
                        {PILAR_LABEL[p]}
                      </span>
                    ))}
                  </div>
                ) : null}

                {s.equipamentos.length > 0 ? (
                  <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                    {s.equipamentos.join(" · ")}
                  </p>
                ) : null}

                <div className="mt-5 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <button onClick={() => openEdit(s)} className="font-medium text-text-primary hover:text-primary">Editar</button>
                  <button onClick={() => handleToggle(s)} className="text-text-secondary hover:text-text-primary">
                    {s.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(s)} className="ml-auto text-text-secondary hover:text-error">Excluir</button>
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
        title={editing ? "Editar sala" : "Nova sala"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending}>{pending ? "Salvando…" : "Salvar sala"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

          <FormField label="Nome da sala">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Estúdio Pilates 01" autoFocus />
          </FormField>

          <FormField label="Capacidade (lugares)">
            <Input type="number" min={1} max={20} value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })} />
          </FormField>

          <FormField label="Pilares compatíveis">
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

          <FormField label="Equipamentos (separados por vírgula)">
            <Input value={form.equipamentos} onChange={(e) => setForm({ ...form, equipamentos: e.target.value })} placeholder="Reformer, Cadillac, Chair, Barrel" />
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
