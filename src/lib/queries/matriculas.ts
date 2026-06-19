import { createClient } from "@/lib/supabase/server";
import type { MatriculaStatus, Periodicidade, Pilar, PlanoTipo } from "@/types/database";

export type MatriculaRow = {
  id: string;
  inicio: string;
  dia_vencimento: number | null;
  status: MatriculaStatus;
  tipo: PlanoTipo;
  periodicidade: Periodicidade | null;
  valor: number;
  valor_total: number | null;
  sessoes_semana: number | null;
  total_sessoes: number | null;
  fim: string | null;
  updated_at: string;
  pessoa: { id: string; nome: string; pilar_principal: Pilar | null } | null;
  plano: { id: string; nome: string } | null;
  proximaCobranca: string | null;
};

export type MatriculaStats = {
  ativas: number;
  mrr: number;
  canceladasNoMes: number;
};

const MATRICULA_SELECT =
  "id, pessoa_id, plano_id, inicio, dia_vencimento, status, tipo, periodicidade, valor, valor_total, sessoes_semana, total_sessoes, fim, updated_at, created_at";

type MatriculaRaw = {
  id: string;
  pessoa_id: string;
  plano_id: string;
  inicio: string;
  dia_vencimento: number | null;
  status: MatriculaStatus;
  tipo: PlanoTipo;
  periodicidade: Periodicidade | null;
  valor: number | null;
  valor_total: number | null;
  sessoes_semana: number | null;
  total_sessoes: number | null;
  fim: string | null;
  updated_at: string;
};

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
    .select(MATRICULA_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const matriculas = data as MatriculaRaw[];
  const pessoaIds = [...new Set(matriculas.map((m) => m.pessoa_id))];
  const planoIds = [...new Set(matriculas.map((m) => m.plano_id))];

  const [{ data: pessoas }, { data: planos }] = await Promise.all([
    pessoaIds.length
      ? supabase
          .schema("core")
          .from("pessoa")
          .select("id, nome, pilar_principal")
          .in("id", pessoaIds)
      : Promise.resolve({ data: [] }),
    planoIds.length
      ? supabase
          .schema("vendas")
          .from("plano")
          .select("id, nome")
          .in("id", planoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pessoaById = new Map(
    ((pessoas ?? []) as NonNullable<MatriculaRow["pessoa"]>[]).map((pessoa) => [pessoa.id, pessoa]),
  );
  const planoById = new Map(
    ((planos ?? []) as NonNullable<MatriculaRow["plano"]>[]).map((plano) => [plano.id, plano]),
  );

  return matriculas.map((r) => {
    return {
      id: r.id,
      inicio: r.inicio,
      dia_vencimento: r.dia_vencimento,
      status: r.status,
      tipo: r.tipo,
      periodicidade: r.periodicidade,
      valor: r.valor ?? 0,
      valor_total: r.valor_total,
      sessoes_semana: r.sessoes_semana,
      total_sessoes: r.total_sessoes,
      fim: r.fim,
      updated_at: r.updated_at,
      pessoa: pessoaById.get(r.pessoa_id) ?? null,
      plano: planoById.get(r.plano_id) ?? null,
      proximaCobranca: r.tipo === "fixo" ? proximaCobranca(r.dia_vencimento) : null,
    };
  });
}

export function getMatriculaStats(matriculas: MatriculaRow[], now = new Date()): MatriculaStats {
  const ativas = matriculas.filter((m) => m.status === "ativa");
  const mrr = ativas.reduce((sum, m) => {
    if (m.tipo !== "fixo" || !m.periodicidade) return sum;
    return sum + m.valor;
  }, 0);
  const canceladasNoMes = matriculas.filter((m) => {
    if (m.status !== "cancelada") return false;
    const d = new Date(m.updated_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  return { ativas: ativas.length, mrr, canceladasNoMes };
}
