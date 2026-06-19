"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, TrendingUp, UserMinus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/corporis/stat-card";
import { cn } from "@/lib/utils";
import {
  MATRICULA_STATUS_LABEL,
  PERIODICIDADE_LABEL,
  PLANO_TIPO_LABEL,
  formatBRL,
} from "@/lib/vendas-labels";
import type { MatriculaRow, MatriculaStats } from "@/lib/queries/matriculas";
import type { MatriculaStatus } from "@/types/database";

type StatusFilter = "todas" | MatriculaStatus;

const STATUS_STYLE: Record<MatriculaStatus, string> = {
  ativa: "bg-[var(--color-verde)]/15 text-[var(--color-verde)]",
  pausada: "bg-accent-soft text-text-secondary",
  cancelada: "bg-error/10 text-error",
  concluida: "bg-accent-soft text-text-primary",
};

function fmtDate(d: string | null) {
  return d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";
}
function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function termosMatricula(matricula: MatriculaRow) {
  if (matricula.periodicidade) return PERIODICIDADE_LABEL[matricula.periodicidade];
  if (matricula.tipo === "personalizado" && matricula.total_sessoes) {
    return `${matricula.total_sessoes} sessões`;
  }
  return PLANO_TIPO_LABEL[matricula.tipo];
}

export function VendasClient({ matriculas, stats }: { matriculas: MatriculaRow[]; stats: MatriculaStats }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todas");

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return matriculas.filter((m) => {
      if (status !== "todas" && m.status !== status) return false;
      if (q && !(m.pessoa?.nome ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [matriculas, busca, status]);

  const filtersActive = busca !== "" || status !== "todas";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Assinaturas e adesões</p>
            <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
              Acompanhe receita recorrente, cobranças e status dos planos.
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Assinaturas ativas, pausadas ou canceladas por aluna, com próxima cobrança e plano vinculado.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/vendas/nova">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nova venda
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Assinaturas ativas" value={stats.ativas} hint="matrículas em receita atual" icon={<Users className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="MRR" value={formatBRL(stats.mrr)} hint="receita recorrente mensal normalizada" icon={<TrendingUp className="h-5 w-5" strokeWidth={1.5} />} />
          <StatCard label="Cancelamentos no mês" value={stats.canceladasNoMes} hint="matrículas encerradas neste mês" icon={<UserMinus className="h-5 w-5" strokeWidth={1.5} />} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente" className="h-10 max-w-xs" />
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {(["todas", "ativa", "pausada", "concluida", "cancelada"] as StatusFilter[]).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={cn("rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary")}>
              {s === "todas" ? "Todas" : MATRICULA_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {filtersActive ? (
          <button type="button" onClick={() => { setBusca(""); setStatus("todas"); }}
            className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
            Limpar filtros
          </button>
        ) : null}
        <span className="ml-auto text-xs text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "assinatura" : "assinaturas"}
        </span>
      </div>

      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <p className="text-sm font-medium text-text-primary">Nenhuma assinatura encontrada</p>
            <p className="mt-1 text-xs text-text-secondary">
              {filtersActive ? "Ajuste os filtros ou " : ""}registre a primeira adesão de plano.
            </p>
            <Button size="sm" variant="secondary" className="mt-4" asChild>
              <Link href="/vendas/nova">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nova venda
              </Link>
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Cliente", "Plano", "Periodicidade", "Início", "Próxima cobrança", "Status"].map((h) => (
                    <th key={h} className="crm-label px-4 py-3 text-[10px] tracking-[1.2px] text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 transition-colors hover:bg-accent-soft/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-xs text-text-primary">
                          {m.pessoa ? initials(m.pessoa.nome) : "—"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{m.pessoa?.nome ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {m.plano?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {termosMatricula(m)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{fmtDate(m.inicio)}</td>
                    <td className="px-4 py-3 text-text-secondary">{fmtDate(m.proximaCobranca)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium", STATUS_STYLE[m.status])}>
                        {MATRICULA_STATUS_LABEL[m.status]}
                      </span>
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
