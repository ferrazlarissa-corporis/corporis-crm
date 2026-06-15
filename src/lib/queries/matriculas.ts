import { createClient } from "@/lib/supabase/server";
import type { MatriculaStatus, Periodicidade, Pilar } from "@/types/database";
import { PERIODICIDADE_MESES } from "@/lib/vendas-labels";

export type MatriculaRow = {
  id: string;
  inicio: string;
  dia_vencimento: number | null;
  status: MatriculaStatus;
  updated_at: string;
  pessoa: { id: string; nome: string; pilar_principal: Pilar | null } | null;
  plano: { nome: string; valor: number; periodicidade: Periodicidade; pilar: Pilar | null } | null;
  proximaCobranca: string | null;
};

export type MatriculaStats = {
  ativas: number;
  mrr: number;
  canceladasNoMes: number;
};

const SELECT =
  "id, inicio, dia_vencimento, status, updated_at, " +
  "pessoa:pessoa_id(id, nome, pilar_principal), " +
  "plano:plano_id(nome, valor, periodicidade, pilar)";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** Próxima data de cobrança a partir do dia de vencimento, >= hoje. */
function proximaCobranca(dia: number | null, now = new Date()): string | null {
  if (!dia) return null;
  const y = now.getFullYear();
  const m = now.getMonth();
  let target = new Date(y, m, Math.min(dia, 28));
  if (target < new Date(y, m, now.getDate())) target = new Date(y, m + 1, Math.min(dia, 28));
  return target.toISOString().slice(0, 10);
}

export async function getMatriculas(): Promise<MatriculaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("vendas")
    .from("matricula")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown[]).map((raw) => {
    const r = raw as {
      id: string; inicio: string; dia_vencimento: number | null;
      status: MatriculaStatus; updated_at: string;
      pessoa: MatriculaRow["pessoa"] | MatriculaRow["pessoa"][];
      plano: MatriculaRow["plano"] | MatriculaRow["plano"][];
    };
    return {
      id: r.id,
      inicio: r.inicio,
      dia_vencimento: r.dia_vencimento,
      status: r.status,
      updated_at: r.updated_at,
      pessoa: one(r.pessoa),
      plano: one(r.plano),
      proximaCobranca: proximaCobranca(r.dia_vencimento),
    };
  });
}

export function getMatriculaStats(matriculas: MatriculaRow[], now = new Date()): MatriculaStats {
  const ativas = matriculas.filter((m) => m.status === "ativa");
  const mrr = ativas.reduce((sum, m) => {
    if (!m.plano) return sum;
    return sum + m.plano.valor / PERIODICIDADE_MESES[m.plano.periodicidade];
  }, 0);
  const canceladasNoMes = matriculas.filter((m) => {
    if (m.status !== "cancelada") return false;
    const d = new Date(m.updated_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  return { ativas: ativas.length, mrr, canceladasNoMes };
}
