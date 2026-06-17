"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, CalendarRange, CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/corporis/stat-card";
import { cn } from "@/lib/utils";
import {
  PILAR_LABEL,
  PILAR_OPTIONS,
  DIAS,
  TURNOS,
  countTurnos,
  type Disponibilidade,
  type DiaSemana,
  type Turno,
} from "@/lib/cadastros-labels";
import type { ProfissionalRow, ProfissionalStats } from "@/lib/queries/profissionais";
import type { Pilar } from "@/types/database";
import {
  createProfissional,
  deleteProfissional,
  toggleProfissionalAtivo,
  updateProfissional,
  type ProfissionalInput,
} from "../actions";

type StatusFilter = "todos" | "ativos" | "inativos";
type FormState = {
  nome: string;
  especialidade: string;
  crefito: string;
  pilares: Pilar[];
  disponibilidade: Disponibilidade;
  ativo: boolean;
};

const EMPTY: FormState = {
  nome: "", especialidade: "", crefito: "", pilares: [], disponibilidade: {}, ativo: true,
};

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function ProfissionaisClient({ profissionais, stats }: { profissionais: ProfissionalRow[]; stats: ProfissionalStats }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [pilar, setPilar] = useState<"" | Pilar>("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfissionalRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return profissionais.filter((p) => {
      if (pilar && !p.pilares.includes(pilar)) return false;
      if (status === "ativos" && !p.ativo) return false;
      if (status === "inativos" && p.ativo) return false;
      if (q && !p.nome.toLowerCase().includes(q) && !(p.especialidade ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [profissionais, busca, pilar, status]);

  function openCreate() { setEditing(null); setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(p: ProfissionalRow) {
    setEditing(p);
    setForm({
      nome: p.nome,
      especialidade: p.especialidade ?? "",
      crefito: p.crefito ?? "",
      pilares: p.pilares,
      disponibilidade: p.disponibilidade,
      ativo: p.ativo,
    });
    setError(null); setOpen(true);
  }

  function handleSave() {
    setError(null);
    const input: ProfissionalInput = { ...form };
    startTransition(async () => {
      const r = editing ? await updateProfissional(editing.id, input) : await createProfissional(input);
      if (!r.success) { setError(r.error); return; }
      setOpen(false); router.refresh();
    });
  }
  function handleToggle(p: ProfissionalRow) {
    startTransition(async () => { await toggleProfissionalAtivo(p.id, !p.ativo); router.refresh(); });
  }
  function handleDelete(p: ProfissionalRow) {
    if (!confirm(`Excluir o profissional "${p.nome}"?`)) return;
    startTransition(async () => {
      const r = await deleteProfissional(p.id);
      if (!r.success) alert(r.error);
      router.refresh();
    });
  }
  function togglePilar(pl: Pilar) {
    setForm((f) => ({ ...f, pilares: f.pilares.includes(pl) ? f.pilares.filter((x) => x !== pl) : [...f.pilares, pl] }));
  }
  function toggleTurno(dia: DiaSemana, turno: Turno) {
    setForm((f) => {
      const atual = f.disponibilidade[dia] ?? [];
      const next = atual.includes(turno) ? atual.filter((t) => t !== turno) : [...atual, turno];
      const disp = { ...f.disponibilidade };
      if (next.length) disp[dia] = next; else delete disp[dia];
      return { ...f, disponibilidade: disp };
    });
  }

  const filtersActive = busca !== "" || pilar !== "" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Equipe e agenda</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Cadastre profissionais, pilares atendidos e disponibilidade semanal.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              A grade de manhã, tarde e noite informa à agenda quais profissionais podem receber cada aluna.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo profissional
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Profissionais ativos" value={stats.ativos} hint="na equipe atual" icon={<Stethoscope className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Turnos disponíveis" value={stats.turnosDisponiveis} hint="slots manhã/tarde/noite na semana" icon={<CalendarRange className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Com agenda" value={stats.comAgenda} hint="profissionais com disponibilidade definida" icon={<CalendarCheck className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou especialidade" className="h-10 max-w-xs" />
        <select
          value={pilar}
          onChange={(e) => setPilar(e.target.value as "" | Pilar)}
          className="h-10 rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-text-primary"
        >
          <option value="">Todas as áreas</option>
          {PILAR_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
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
          <button type="button" onClick={() => { setBusca(""); setPilar(""); setStatus("todos"); }}
            className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
            Limpar filtros
          </button>
        ) : null}
        <span className="ml-auto text-xs text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "profissional" : "profissionais"}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhum profissional encontrado</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}cadastre o primeiro profissional da equipe.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo profissional
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((p) => (
              <Card key={p.id} className={cn("flex flex-col p-5", !p.ativo && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-sm text-text-primary">
                    {initials(p.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-display text-lg leading-tight text-text-primary">{p.nome}</h3>
                      <span className={cn("shrink-0 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium",
                        p.ativo ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]" : "bg-accent-soft text-text-secondary")}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {p.especialidade ? <p className="text-xs text-text-secondary">{p.especialidade}</p> : null}
                    {p.crefito ? <p className="mt-0.5 text-[11px] text-text-secondary">CREFITO {p.crefito}</p> : null}
                  </div>
                </div>

                {p.pilares.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.pilares.map((pl) => (
                      <span key={pl} className="rounded-[var(--radius-pill)] bg-accent-soft px-2.5 py-0.5 text-[11px] text-text-primary">
                        {PILAR_LABEL[pl]}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Grade de disponibilidade */}
                <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border">
                  <table className="w-full border-collapse text-center text-[11px]">
                    <thead>
                      <tr className="bg-accent-soft/50 text-text-secondary">
                        <th className="py-1.5 font-medium" />
                        {DIAS.map((d) => <th key={d.value} className="py-1.5 font-medium">{d.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {TURNOS.map((t) => (
                        <tr key={t.value} className="border-t border-border">
                          <td className="py-1.5 pl-2 text-left text-text-secondary">{t.label}</td>
                          {DIAS.map((d) => {
                            const on = p.disponibilidade[d.value]?.includes(t.value);
                            return (
                              <td key={d.value} className="py-1.5">
                                <span className={cn("mx-auto block h-2.5 w-2.5 rounded-[var(--radius-pill)]",
                                  on ? "bg-primary" : "bg-border")} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <button onClick={() => openEdit(p)} className="font-medium text-text-primary hover:text-primary">Editar</button>
                  <button onClick={() => handleToggle(p)} className="text-text-secondary hover:text-text-primary">
                    {p.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(p)} className="ml-auto text-text-secondary hover:text-error">Excluir</button>
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
        title={editing ? "Editar profissional" : "Novo profissional"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending}>{pending ? "Salvando…" : "Salvar profissional"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

          <FormField label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Ana Paula Martins" autoFocus />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Especialidade">
              <Input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} placeholder="Fisioterapeuta pélvica" />
            </FormField>
            <FormField label="CREFITO">
              <Input value={form.crefito} onChange={(e) => setForm({ ...form, crefito: e.target.value })} placeholder="123456-F" />
            </FormField>
          </div>

          <FormField label="Pilares atendidos">
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

          <FormField label={`Disponibilidade semanal (${countTurnos(form.disponibilidade)} turnos)`}>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-accent-soft/50 text-text-secondary">
                    <th className="py-2 font-medium" />
                    {DIAS.map((d) => <th key={d.value} className="py-2 font-medium">{d.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TURNOS.map((t) => (
                    <tr key={t.value} className="border-t border-border">
                      <td className="py-2 pl-2 text-left text-text-secondary">{t.label}</td>
                      {DIAS.map((d) => {
                        const on = form.disponibilidade[d.value]?.includes(t.value);
                        return (
                          <td key={d.value} className="py-1">
                            <button type="button" onClick={() => toggleTurno(d.value, t.value)}
                              aria-pressed={on}
                              className={cn("mx-auto block h-6 w-6 rounded-[var(--radius-sm)] border transition-colors",
                                on ? "border-primary bg-primary" : "border-border bg-card hover:bg-accent-soft")} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
