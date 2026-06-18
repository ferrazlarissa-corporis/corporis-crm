"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CalendarClock, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/corporis/stat-card";
import { GestanteBadge, PilarBadge, colorVarForToken, taxonomyAccentStyle } from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import {
  COR_OPTIONS,
  COR_VAR,
  PILAR_COR_PADRAO,
  PILAR_OPTIONS,
  type CorToken,
} from "@/lib/cadastros-labels";
import type { ServicoRow, ServicoStats } from "@/lib/queries/servicos";
import type { Pilar } from "@/types/database";
import {
  createServico,
  deleteServico,
  toggleServicoAtivo,
  updateServico,
  type ServicoInput,
} from "../actions";

type StatusFilter = "todos" | "ativos" | "inativos";
type GestanteFilter = "todas" | "gestante" | "nao_gestante";

const EMPTY_FORM: ServicoInput = {
  nome: "",
  pilar: "pilates",
  gestante: false,
  duracao_min: 50,
  capacidade_slot: 4,
  cor_token: "alaranjado",
  ativo: true,
};

export function ServicosClient({ servicos, stats }: { servicos: ServicoRow[]; stats: ServicoStats }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [pilar, setPilar] = useState<"" | Pilar>("");
  const [gestanteFilter, setGestanteFilter] = useState<GestanteFilter>("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServicoRow | null>(null);
  const [form, setForm] = useState<ServicoInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return servicos.filter((s) => {
      if (pilar && s.pilar !== pilar) return false;
      if (gestanteFilter === "gestante" && !s.gestante) return false;
      if (gestanteFilter === "nao_gestante" && s.gestante) return false;
      if (status === "ativos" && !s.ativo) return false;
      if (status === "inativos" && s.ativo) return false;
      if (q && !s.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [servicos, busca, pilar, gestanteFilter, status]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(s: ServicoRow) {
    setEditing(s);
    setForm({
      nome: s.nome,
      pilar: s.pilar,
      gestante: s.gestante,
      duracao_min: s.duracao_min,
      capacidade_slot: s.capacidade_slot,
      cor_token: (s.cor_token as CorToken) ?? "alaranjado",
      ativo: s.ativo,
    });
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateServico(editing.id, form)
        : await createServico(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleToggle(s: ServicoRow) {
    startTransition(async () => {
      await toggleServicoAtivo(s.id, !s.ativo);
      router.refresh();
    });
  }

  function handleDelete(s: ServicoRow) {
    if (!confirm(`Excluir o serviço "${s.nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteServico(s.id);
      if (!result.success) alert(result.error);
      router.refresh();
    });
  }

  const filtersActive = busca !== "" || pilar !== "" || gestanteFilter !== "todas" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Cabeçalho */}
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Agenda e catálogo</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Cadastre serviços com duração, capacidade e vínculo aos planos.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              A capacidade por slot nasce aqui: Pilates opera com até 4 pessoas por horário, enquanto
              Fisio pélvica permanece individual.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo serviço
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard
            label="Serviços ativos"
            value={stats.ativos}
            hint="serviços disponíveis na agenda"
            icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />}
          />
          <StatCard
            label="Capacidade por horário"
            value={stats.capacidadeTotal}
            hint="vagas somadas entre os serviços ativos"
            icon={<CalendarClock className="h-5 w-5" strokeWidth={1.5} />}
          />
          <StatCard
            label="Planos vinculados"
            value={stats.planosVinculados}
            hint="planos comerciais usando estes serviços"
            icon={<Link2 className="h-5 w-5" strokeWidth={1.5} />}
          />
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar serviço por nome"
          className="h-10 max-w-xs"
        />
        <Select
          value={pilar}
          onChange={(e) => setPilar(e.target.value as "" | Pilar)}
          className="h-10 w-44"
        >
          <option value="">Todas as áreas</option>
          {PILAR_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
        <Select
          value={gestanteFilter}
          onChange={(e) => setGestanteFilter(e.target.value as GestanteFilter)}
          className="h-10 w-44"
        >
          <option value="todas">Gestante e não-gestante</option>
          <option value="gestante">Só gestante</option>
          <option value="nao_gestante">Só não-gestante</option>
        </Select>
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {(["todos", "ativos", "inativos"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {filtersActive ? (
          <button
            type="button"
            onClick={() => { setBusca(""); setPilar(""); setGestanteFilter("todas"); setStatus("todos"); }}
            className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
          >
            Limpar filtros
          </button>
        ) : null}
        <span className="ml-auto text-xs text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "serviço" : "serviços"}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhum serviço encontrado</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}cadastre o primeiro serviço da clínica.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo serviço
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className={cn("relative flex flex-col overflow-hidden p-5 pt-6", !s.ativo && "opacity-70")}>
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={taxonomyAccentStyle(s.cor_token, PILAR_COR_PADRAO[s.pilar])}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-[var(--radius-pill)]"
                      style={{ background: colorVarForToken(s.cor_token, PILAR_COR_PADRAO[s.pilar]) }}
                    />
                    <PilarBadge pilar={s.pilar} />
                    {s.gestante ? <GestanteBadge /> : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium",
                      s.ativo ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]" : "bg-accent-soft text-text-secondary",
                    )}
                  >
                    {s.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-xl leading-tight text-text-primary">{s.nome}</h3>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Field label="Duração" value={`${s.duracao_min} min`} />
                  <Field label="Capacidade" value={`${s.capacidade_slot} / slot`} />
                  <div>
                    <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">Cor</p>
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-primary"
                    >
                      <span
                        className="h-3 w-3 rounded-[var(--radius-xs)]"
                        style={{ background: colorVarForToken(s.cor_token, PILAR_COR_PADRAO[s.pilar]) }}
                      />
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <button onClick={() => openEdit(s)} className="font-medium text-text-primary hover:text-primary">
                    Editar
                  </button>
                  <button onClick={() => handleToggle(s)} className="text-text-secondary hover:text-text-primary">
                    {s.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(s)} className="ml-auto text-text-secondary hover:text-error">
                    Excluir
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Cadastro"
        title={editing ? "Editar serviço" : "Novo serviço"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Salvando…" : "Salvar serviço"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? (
            <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p>
          ) : null}

          <FormField label="Nome do serviço">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Pilates em aparelhos"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Área">
              <Select
                value={form.pilar}
                onChange={(e) => {
                  const pilar = e.target.value as Pilar;
                  setForm({ ...form, pilar, cor_token: PILAR_COR_PADRAO[pilar] });
                }}
              >
                {PILAR_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Duração (min)">
              <Input
                type="number"
                min={10}
                max={240}
                value={form.duracao_min}
                onChange={(e) => setForm({ ...form, duracao_min: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <FormField label="Atendimento gestante">
            <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 hover:bg-accent-soft">
              <input
                type="checkbox"
                checked={form.gestante}
                onChange={(e) => setForm({ ...form, gestante: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-alaranjado)]"
              />
              <span className="text-sm text-text-primary">Serviço voltado a gestantes</span>
            </label>
            <p className="mt-1.5 text-xs text-text-secondary">
              Marque para Gestar em movimento, Fisio pélvica gestante e afins. Filtra de forma cruzada com a área.
            </p>
          </FormField>

          <FormField label="Capacidade por slot (pessoas)">
            <Input
              type="number"
              min={1}
              max={8}
              value={form.capacidade_slot}
              onChange={(e) => setForm({ ...form, capacidade_slot: Number(e.target.value) })}
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Pilates costuma operar com 4 por horário; Fisio pélvica permanece individual (1).
            </p>
          </FormField>

          <FormField label="Cor na agenda">
            <div className="flex flex-col gap-1.5">
              {COR_OPTIONS.map((c) => (
                <label
                  key={c.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
                    form.cor_token === c.value ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="cor_token"
                    className="sr-only"
                    checked={form.cor_token === c.value}
                    onChange={() => setForm({ ...form, cor_token: c.value })}
                  />
                  <span className="h-4 w-4 rounded-[var(--radius-pill)]" style={{ background: COR_VAR[c.value] }} />
                  <span className="text-sm text-text-primary">{c.label}</span>
                  <span className="ml-auto text-xs text-text-secondary">{c.hint}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
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
