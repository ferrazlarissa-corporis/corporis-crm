"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Repeat, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/corporis/stat-card";
import {
  PilarBadge,
  ServicoBadge,
  colorTokenForPlano,
  colorTokenForServico,
  colorVarForToken,
  taxonomyAccentStyle,
  taxonomyBadgeStyle,
} from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { PILAR_OPTIONS } from "@/lib/cadastros-labels";
import {
  PERIODICIDADE_LABEL,
  PERIODICIDADE_OPTIONS,
  PLANO_TIPO_LABEL,
  PLANO_TIPO_OPTIONS,
  formatBRL,
} from "@/lib/vendas-labels";
import type { PlanoRow, PlanoStats, ServicoOption } from "@/lib/queries/planos";
import type { Pilar, Periodicidade, PlanoTipo } from "@/types/database";
import { createPlano, togglePlanoAtivo, updatePlano, type PlanoInput } from "../actions";

type StatusFilter = "todos" | "ativos" | "inativos";
type FormState = {
  nome: string;
  tipo: PlanoTipo;
  valor: string;
  periodicidade: Periodicidade;
  sessoes_semana: string;
  pilar: "" | Pilar;
  servicos: string[];
  ativo: boolean;
};

const EMPTY: FormState = {
  nome: "", tipo: "fixo", valor: "", periodicidade: "mensal",
  sessoes_semana: "", pilar: "", servicos: [], ativo: true,
};

// Periodicidades válidas para plano fixo (a matriz comercial não usa anual/avulso).
const PERIODICIDADE_FIXO = PERIODICIDADE_OPTIONS.filter(
  (o) => o.value !== "anual" && o.value !== "avulso",
);

function valorLabel(tipo: PlanoTipo): string {
  if (tipo === "avulso") return "Valor por sessão (R$)";
  if (tipo === "personalizado") return "Valor de referência (R$)";
  return "Valor mensal (R$)";
}

export function PlanosClient({
  planos,
  servicos,
  stats,
}: {
  planos: PlanoRow[];
  servicos: ServicoOption[];
  stats: PlanoStats;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const servicoById = useMemo(() => new Map(servicos.map((s) => [s.id, s])), [servicos]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return planos.filter((p) => {
      if (status === "ativos" && !p.ativo) return false;
      if (status === "inativos" && p.ativo) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [planos, busca, status]);

  function openCreate() { setEditing(null); setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(p: PlanoRow) {
    setEditing(p);
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      valor: String(p.valor),
      periodicidade: p.periodicidade,
      sessoes_semana: p.sessoes_semana != null ? String(p.sessoes_semana) : "",
      pilar: p.pilar ?? "",
      servicos: p.servicos,
      ativo: p.ativo,
    });
    setError(null); setOpen(true);
  }

  function toInput(f: FormState): PlanoInput {
    return {
      nome: f.nome,
      tipo: f.tipo,
      valor: Number(f.valor),
      periodicidade: f.periodicidade,
      sessoes_semana: f.sessoes_semana === "" ? null : Number(f.sessoes_semana),
      servicos: f.servicos,
      pilar: f.pilar === "" ? null : f.pilar,
      ativo: f.ativo,
    };
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const r = editing ? await updatePlano(editing.id, toInput(form)) : await createPlano(toInput(form));
      if (!r.success) { setError(r.error); return; }
      setOpen(false); router.refresh();
    });
  }
  function handleToggle(p: PlanoRow) {
    startTransition(async () => { await togglePlanoAtivo(p.id, !p.ativo); router.refresh(); });
  }
  function toggleServico(id: string) {
    setForm((f) => ({ ...f, servicos: f.servicos.includes(id) ? f.servicos.filter((x) => x !== id) : [...f.servicos, id] }));
  }
  function setTipo(t: PlanoTipo) {
    setForm((f) => ({
      ...f,
      tipo: t,
      // Avulso fixa periodicidade; fixo não aceita "avulso"; sessões só fazem sentido no fixo.
      periodicidade: t === "avulso" ? "avulso" : t === "fixo" && f.periodicidade === "avulso" ? "mensal" : f.periodicidade,
      sessoes_semana: t === "fixo" ? f.sessoes_semana : "",
    }));
  }

  const filtersActive = busca !== "" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Catálogo comercial</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Planos claros para vender com cuidado e operar sem retrabalho.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              O catálogo organiza recorrência, pacotes personalizados e serviços inclusos. A equipe
              comercial escolhe o plano certo sem improvisar valor.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo plano
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Planos no catálogo" value={stats.total} hint="incluindo inativos" icon={<Package className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Planos fixos ativos" value={stats.fixosAtivos} hint="planos de mensalidade vigentes" icon={<Repeat className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Ticket médio" value={formatBRL(stats.ticketMedio)} hint="média mensal normalizada" icon={<Wallet className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar plano por nome" className="h-10 max-w-xs" />
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
          {filtered.length} {filtered.length === 1 ? "plano" : "planos"}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhum plano encontrado</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}cadastre o primeiro plano comercial.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo plano
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const planoToken = colorTokenForPlano(p);
              const planoServicos = p.servicos.map((id) => p.servicosMeta.find((s) => s.id === id) ?? servicoById.get(id) ?? null);
              return (
                <Card key={p.id} className={cn("relative flex flex-col overflow-hidden p-5 pt-6", !p.ativo && "opacity-70")}>
                  <span className="absolute inset-x-0 top-0 h-1.5" style={taxonomyAccentStyle(planoToken)} />
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl leading-tight text-text-primary">{p.nome}</h3>
                    <span
                      className="shrink-0 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-primary"
                      style={taxonomyBadgeStyle(planoToken)}
                    >
                      {PLANO_TIPO_LABEL[p.tipo]}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-[28px] leading-none text-text-primary">{formatBRL(p.valor)}</span>
                    <span className="text-xs text-text-secondary">
                      {p.tipo === "fixo"
                        ? PERIODICIDADE_LABEL[p.periodicidade].toLowerCase()
                        : p.tipo === "avulso"
                          ? "por sessão"
                          : "referência"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Field label="Sessões" value={p.sessoes_semana != null ? `${p.sessoes_semana} por semana` : "—"} />
                    <Field label="Pilar" value={p.pilar ? <PilarBadge pilar={p.pilar} /> : "—"} />
                  </div>

                  {p.servicos.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {planoServicos.map((servico, index) => (
                        servico ? (
                          <ServicoBadge
                            key={servico.id}
                            nome={servico.nome}
                            corToken={servico.cor_token}
                            pilar={servico.pilar}
                          />
                        ) : (
                          <ServicoBadge key={`${p.id}-servico-${index}`} nome="Serviço" pilar={p.pilar} />
                        )
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-4 border-t border-border pt-3 text-xs">
                    <span className={cn("font-medium", p.ativo ? "text-[var(--color-verde)]" : "text-text-secondary")}>
                      {p.ativo ? "Ativo" : "Pausado"}
                    </span>
                    <button onClick={() => handleToggle(p)} className="text-text-secondary hover:text-text-primary">
                      {p.ativo ? "Pausar" : "Ativar"}
                    </button>
                    <button onClick={() => openEdit(p)} className="ml-auto font-medium text-text-primary hover:text-primary">Editar</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Catálogo"
        title={editing ? "Editar plano" : "Novo plano"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending}>{pending ? "Salvando…" : "Salvar plano"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

          <FormField label="Nome do plano">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Pilates Essencial" autoFocus />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo">
              <Select value={form.tipo} onChange={(e) => setTipo(e.target.value as PlanoTipo)}>
                {PLANO_TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
            {form.tipo === "fixo" ? (
              <FormField label="Periodicidade">
                <Select value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value as Periodicidade })}>
                  {PERIODICIDADE_FIXO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
            ) : <div />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={valorLabel(form.tipo)}>
              <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="420,00" />
            </FormField>
            {form.tipo === "fixo" ? (
              <FormField label="Sessões por semana">
                <Input type="number" min={0} max={14} value={form.sessoes_semana} onChange={(e) => setForm({ ...form, sessoes_semana: e.target.value })} placeholder="2" />
              </FormField>
            ) : <div />}
          </div>
          {form.tipo === "personalizado" ? (
            <p className="-mt-2 text-xs text-text-secondary">
              Plano personalizado: o número de sessões e o valor final são definidos por cliente na adesão.
            </p>
          ) : null}

          <FormField label="Pilar principal">
            <Select value={form.pilar} onChange={(e) => setForm({ ...form, pilar: e.target.value as "" | Pilar })}>
              <option value="">Sem pilar definido</option>
              {PILAR_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>

          <FormField label="Serviços inclusos">
            {servicos.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum serviço ativo. Cadastre serviços primeiro.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servicos.map((s) => {
                  const selected = form.servicos.includes(s.id);
                  const token = colorTokenForServico(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleServico(s.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected ? "text-text-primary" : "border-border text-text-secondary hover:bg-accent-soft",
                      )}
                      style={selected ? taxonomyBadgeStyle(token) : undefined}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-[var(--radius-pill)]"
                        style={{ background: colorVarForToken(token) }}
                      />
                      {s.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>
        </div>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">{label}</p>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
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
