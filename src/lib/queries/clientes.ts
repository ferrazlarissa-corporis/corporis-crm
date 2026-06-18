import { createClient } from "@/lib/supabase/server";
import type { PessoaStatus, PessoaTipo, Pilar, Periodicidade } from "@/types/database";

export type ClienteListItem = {
  id: string;
  nome: string;
  tipo: PessoaTipo;
  status: PessoaStatus;
  pilar_principal: Pilar | null;
  created_at: string;
  planoNome: string | null;
  planoPeriodicidade: Periodicidade | null;
  planoPilar: Pilar | null;
  proximoAgendamento: { inicio: string } | null;
  financeiroEmDia: boolean;
  lancamentosAtrasados: number;
};

export type ClienteStats = {
  ativos: number;
  inativos: number;
  inadimplentes: number;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getClientes(): Promise<ClienteListItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const [pessoasRes, matriculasRes, agendaRes, lancamentosRes] = await Promise.all([
    supabase.schema("core").from("pessoa").select("id, nome, tipo, status, pilar_principal, created_at")
      .is("archived_at", null).neq("status", "lead").order("nome", { ascending: true }),
    supabase.schema("vendas").from("matricula").select("pessoa_id, plano:plano_id(nome, periodicidade, pilar)")
      .eq("status", "ativa"),
    supabase.schema("crm").from("appointments").select("pessoa_id, inicio")
      .in("status", ["agendado", "confirmado"]).gte("inicio", nowIso).order("inicio", { ascending: true }),
    supabase.schema("financeiro").from("lancamento").select("pessoa_id, status, vencimento")
      .neq("status", "recebido"),
  ]);

  const pessoas = pessoasRes.data ?? [];

  const planoByPessoa = new Map<string, { nome: string; periodicidade: Periodicidade; pilar: Pilar | null }>();
  for (const m of (matriculasRes.data ?? []) as { pessoa_id: string; plano: unknown }[]) {
    const plano = one(m.plano) as { nome: string; periodicidade: Periodicidade; pilar: Pilar | null } | null;
    if (plano && !planoByPessoa.has(m.pessoa_id)) planoByPessoa.set(m.pessoa_id, plano);
  }

  const proximoByPessoa = new Map<string, { inicio: string }>();
  for (const a of (agendaRes.data ?? []) as { pessoa_id: string | null; inicio: string }[]) {
    if (a.pessoa_id && !proximoByPessoa.has(a.pessoa_id)) proximoByPessoa.set(a.pessoa_id, { inicio: a.inicio });
  }

  const atrasadosByPessoa = new Map<string, number>();
  for (const l of (lancamentosRes.data ?? []) as { pessoa_id: string; status: string; vencimento: string }[]) {
    const atrasado = l.status === "atrasado" || l.vencimento < today;
    if (atrasado) atrasadosByPessoa.set(l.pessoa_id, (atrasadosByPessoa.get(l.pessoa_id) ?? 0) + 1);
  }

  return pessoas.map((p) => {
    const plano = planoByPessoa.get(p.id) ?? null;
    const atrasados = atrasadosByPessoa.get(p.id) ?? 0;
    return {
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      status: p.status,
      pilar_principal: p.pilar_principal,
      created_at: p.created_at,
      planoNome: plano?.nome ?? null,
      planoPeriodicidade: plano?.periodicidade ?? null,
      planoPilar: plano?.pilar ?? null,
      proximoAgendamento: proximoByPessoa.get(p.id) ?? null,
      financeiroEmDia: atrasados === 0,
      lancamentosAtrasados: atrasados,
    };
  });
}

export function getClienteStats(clientes: ClienteListItem[]): ClienteStats {
  return {
    ativos: clientes.filter((c) => c.status === "cliente_ativo").length,
    inativos: clientes.filter((c) => c.status === "inativo").length,
    inadimplentes: clientes.filter((c) => !c.financeiroEmDia).length,
  };
}
