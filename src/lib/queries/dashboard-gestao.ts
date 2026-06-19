import { createClient } from "@/lib/supabase/server";

export type GestaoPendencia = {
  id: string;
  tipo: "financeiro" | "contrato";
  titulo: string;
  detalhe: string;
  pessoaId: string | null;
};

export type GestaoStats = {
  clientesAtivos: number;
  mrr: number;
  recebidoMes: number;
  emAberto: number;
  inadimplentes: number;
  pendencias: GestaoPendencia[];
};

export async function getGestaoStats(): Promise<GestaoStats> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [ativosRes, matriculasRes, lancamentosRes, contratosRes] = await Promise.all([
    supabase.schema("core").from("pessoa").select("id", { count: "exact", head: true }).eq("status", "cliente_ativo").is("archived_at", null),
    supabase.schema("vendas").from("matricula").select("tipo, valor").eq("status", "ativa"),
    supabase.schema("financeiro").from("lancamento").select("id, pessoa_id, descricao, valor, vencimento, status, competencia"),
    supabase.schema("vendas").from("contrato").select("id, pessoa_id, created_at").eq("status", "rascunho").order("created_at", { ascending: true }).limit(5),
  ]);

  // MRR
  const mrr = (matriculasRes.data ?? []).reduce((sum, m) => {
    const matricula = m as { tipo: string; valor: number | null };
    return matricula.tipo === "fixo" ? sum + (matricula.valor ?? 0) : sum;
  }, 0);

  // Lançamentos
  const lancamentos = (lancamentosRes.data ?? []) as {
    id: string; pessoa_id: string; descricao: string; valor: number; vencimento: string; status: string; competencia: string;
  }[];
  const recebidoMes = lancamentos
    .filter((l) => l.status === "recebido" && l.competencia >= mesInicio)
    .reduce((s, l) => s + l.valor, 0);
  const abertos = lancamentos.filter((l) => l.status !== "recebido");
  const emAberto = abertos.reduce((s, l) => s + l.valor, 0);
  const atrasados = abertos.filter((l) => l.status === "atrasado" || l.vencimento < today);
  const inadimplentes = new Set(atrasados.map((l) => l.pessoa_id)).size;

  const pendencias: GestaoPendencia[] = [
    ...atrasados.slice(0, 5).map((l) => ({
      id: `l-${l.id}`,
      tipo: "financeiro" as const,
      titulo: l.descricao,
      detalhe: `Vencido em ${new Date(l.vencimento).toLocaleDateString("pt-BR")}`,
      pessoaId: l.pessoa_id,
    })),
    ...((contratosRes.data ?? []) as { id: string; pessoa_id: string }[]).map((c) => ({
      id: `c-${c.id}`,
      tipo: "contrato" as const,
      titulo: "Contrato em rascunho",
      detalhe: "Aguardando envio e assinatura",
      pessoaId: c.pessoa_id,
    })),
  ].slice(0, 8);

  return {
    clientesAtivos: ativosRes.count ?? 0,
    mrr,
    recebidoMes,
    emAberto,
    inadimplentes,
    pendencias,
  };
}
