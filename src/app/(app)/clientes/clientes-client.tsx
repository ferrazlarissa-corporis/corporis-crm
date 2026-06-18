"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, UserCheck, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/corporis/stat-card";
import { PilarBadge } from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { PERIODICIDADE_LABEL } from "@/lib/vendas-labels";
import { PESSOA_STATUS_LABEL } from "@/lib/clientes-labels";
import type { ClienteListItem, ClienteStats } from "@/lib/queries/clientes";
import type { Pilar } from "@/types/database";

type StatusFilter = "todos" | "cliente_ativo" | "inativo";

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function tipoBadge(tipo: string, pilar: Pilar | null): string {
  if (tipo === "paciente" || pilar === "fisio_pelvica" || pilar === "acupuntura") return "Paciente";
  return "Aluna";
}

export function ClientesClient({ clientes, stats }: { clientes: ClienteListItem[]; stats: ClienteStats }) {
  const [busca, setBusca] = useState("");
  const [pilar, setPilar] = useState<"" | Pilar>("");
  const [status, setStatus] = useState<StatusFilter>("todos");

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (pilar && c.pilar_principal !== pilar) return false;
      if (status !== "todos" && c.status !== status) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clientes, busca, pilar, status]);

  const filtersActive = busca !== "" || pilar !== "" || status !== "todos";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Base de clientes</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Acompanhe alunas e pacientes, planos e situação financeira.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Cada cliente nasce da espinha de identidade da Corporis — plano ativo, próximo agendamento e
              cobrança num só lugar.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/clientes/novo">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo cliente
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Clientes ativos" value={stats.ativos} hint="em acompanhamento" icon={<UserCheck className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Inativos" value={stats.inativos} hint="sem plano vigente" icon={<Users className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Com pendência" value={stats.inadimplentes} hint="lançamentos em atraso" icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente por nome" className="h-10 max-w-xs" />
        <select value={pilar} onChange={(e) => setPilar(e.target.value as "" | Pilar)}
          className="h-10 rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-text-primary">
          <option value="">Todas as áreas</option>
          <option value="pilates">Pilates</option>
          <option value="fisio_pelvica">Fisio pélvica</option>
          <option value="acupuntura">Acupuntura</option>
        </select>
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {(["todos", "cliente_ativo", "inativo"] as StatusFilter[]).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={cn("rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium transition-colors",
                status === s ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary")}>
              {s === "todos" ? "Todos" : PESSOA_STATUS_LABEL[s]}
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
          {filtered.length} de {clientes.length}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhum cliente encontrado</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}cadastre o primeiro cliente.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" asChild>
              <Link href="/clientes/novo">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo cliente
              </Link>
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Cliente", "Plano ativo", "Status", "Próximo agendamento", "Financeiro"].map((h) => (
                    <th key={h} className="crm-label px-4 py-3 text-[10px] tracking-[1.2px] text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-accent-soft/40">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 !no-underline">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-xs text-text-primary">
                          {initials(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-text-primary">{c.nome}</p>
                            <span className="shrink-0 rounded-[var(--radius-pill)] bg-accent-soft px-2 py-0.5 text-[10px] text-text-secondary">
                              {tipoBadge(c.tipo, c.pilar_principal)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                            {c.pilar_principal ? <PilarBadge pilar={c.pilar_principal} /> : <span>—</span>}
                            <span>desde {format(new Date(c.created_at), "MMM/yyyy", { locale: ptBR })}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.planoNome ? (
                        <>
                          <p className="text-text-primary">{c.planoNome}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {c.planoPeriodicidade ? <span className="text-xs text-text-secondary">{PERIODICIDADE_LABEL[c.planoPeriodicidade]}</span> : null}
                            {c.planoPilar ? <PilarBadge pilar={c.planoPilar} /> : null}
                          </div>
                        </>
                      ) : <span className="text-text-secondary">Sem plano ativo</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium",
                        c.status === "cliente_ativo" ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]" : "bg-accent-soft text-text-secondary")}>
                        {PESSOA_STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {c.proximoAgendamento
                        ? format(new Date(c.proximoAgendamento.inicio), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : <span className="text-text-secondary">Sem agendamento</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.financeiroEmDia ? (
                        <span className="text-text-secondary">Em dia</span>
                      ) : (
                        <span className="font-medium text-error">
                          Atrasado · {c.lancamentosAtrasados} {c.lancamentosAtrasados === 1 ? "lanç." : "lanç."}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
